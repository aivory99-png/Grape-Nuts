import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getLang } from '@/lib/lang'
import EditOrderForm from './edit-form'

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const lang = await getLang()

  const [
    orderRes, itemsRes, paymentRes, deliveryRes,
    clientsRes, winesRes, stockRes, membersRes,
  ] = await Promise.all([
    supabase.from('orders').select('id, client_id, seller_id, order_date, payment_type, payment_term, notes, status').eq('id', id).single(),
    supabase.from('order_items').select('wine_id, quantity, sale_price').eq('order_id', id),
    supabase.from('payments').select('due_date, amount, status').eq('order_id', id).maybeSingle(),
    supabase.from('deliveries').select('company_name').eq('order_id', id).maybeSingle(),
    supabase.from('clients').select('id, name, city, responsible_id').neq('type', 'prospect').order('name'),
    supabase.from('wines').select('id, name, vintage, type').order('name'),
    supabase.from('stock_entries').select('wine_id, qty_remaining, list_price').order('purchase_date', { ascending: false }),
    supabase.from('user_profiles').select('id, name').eq('active', true).order('name'),
  ])

  const order = orderRes.data
  if (!order) notFound()

  // Aggregate stock per wine
  const stockByWine: Record<string, { qty: number; list_price: number | null }> = {}
  for (const entry of stockRes.data ?? []) {
    const existing = stockByWine[entry.wine_id]
    if (existing) {
      existing.qty += entry.qty_remaining ?? 0
      if (existing.list_price == null && entry.list_price != null) existing.list_price = entry.list_price
    } else {
      stockByWine[entry.wine_id] = { qty: entry.qty_remaining ?? 0, list_price: entry.list_price ?? null }
    }
  }

  // Add back current order items' qty to stock for this order (so user can re-enter same qty)
  for (const item of itemsRes.data ?? []) {
    if (stockByWine[item.wine_id]) {
      stockByWine[item.wine_id].qty += item.quantity
    } else {
      stockByWine[item.wine_id] = { qty: item.quantity, list_price: item.sale_price }
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5 flex items-center gap-3">
        <a href="/dashboard" className="text-sm text-app-text3 hover:text-app-text transition-colors">← Financeiro</a>
      </div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-app-text">
          {lang === 'pt' ? 'Editar Pedido' : 'Editar Pedido'}
        </h1>
        <p className="text-sm text-app-text3 font-mono">{id.slice(0, 8)}…</p>
      </div>

      <EditOrderForm
        orderId={id}
        initialValues={{
          clientId:    order.client_id ?? '',
          sellerId:    order.seller_id ?? '',
          orderDate:   order.order_date ?? new Date().toISOString().split('T')[0],
          paymentType: order.payment_type ?? 'boleto',
          paymentTerm: order.payment_term ?? 'avista',
          notes:       order.notes ?? '',
          carrier:     deliveryRes.data?.company_name ?? '',
          items:       (itemsRes.data ?? []).map(i => ({
            wine_id:    i.wine_id,
            quantity:   i.quantity,
            sale_price: i.sale_price,
          })),
        }}
        clients={(clientsRes.data ?? []).map(c => ({ id: c.id, name: c.name, city: c.city, responsible_id: c.responsible_id }))}
        wines={(winesRes.data ?? []).map(w => ({
          id: w.id, name: w.name, vintage: w.vintage, type: w.type,
          stock: stockByWine[w.id]?.qty ?? 0,
          list_price: stockByWine[w.id]?.list_price ?? null,
        }))}
        members={(membersRes.data ?? []).map(m => ({ id: m.id, name: m.name }))}
        lang={lang}
      />
    </div>
  )
}
