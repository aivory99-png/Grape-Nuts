import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLang } from '@/lib/lang'
import ClientList from './client-list'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: clients }, { data: orders }, lang] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, city, phone, email, website, contact_name, type, responsible_id, notes, active, created_at, user_profiles!clients_responsible_id_fkey(name)')
      .eq('active', true)
      .order('name'),
    supabase
      .from('orders')
      .select('id, client_id, total_revenue, order_date, status, payment_type, order_items(quantity, wines(bottles_per_case))')
      .neq('status', 'cancelled')
      .order('order_date', { ascending: false }),
    getLang(),
  ])

  // Aggregate + individual orders per client
  const statsMap: Record<string, { total: number; count: number; last_date: string | null; total_bottles: number; total_cases: number }> = {}
  const ordersMap: Record<string, { id: string; order_date: string | null; total_revenue: number; status: string; payment_type: string | null }[]> = {}
  for (const o of orders ?? []) {
    if (!o.client_id) continue
    type OItem = { quantity: number; wines: { bottles_per_case: number | null }[] | null }
    let bottles = 0, cases = 0
    for (const item of ((o.order_items as unknown as OItem[] | null) ?? [])) {
      bottles += item.quantity
      const winesArr = item.wines as { bottles_per_case: number | null }[] | null
      const bpc = winesArr?.[0]?.bottles_per_case
      if (bpc) cases += Math.floor(item.quantity / bpc)
    }
    const s = statsMap[o.client_id]
    if (s) {
      s.total += o.total_revenue ?? 0
      s.count++
      s.total_bottles += bottles
      s.total_cases += cases
      if (!s.last_date || (o.order_date && o.order_date > s.last_date)) s.last_date = o.order_date
    } else {
      statsMap[o.client_id] = { total: o.total_revenue ?? 0, count: 1, last_date: o.order_date, total_bottles: bottles, total_cases: cases }
    }
    if (!ordersMap[o.client_id]) ordersMap[o.client_id] = []
    ordersMap[o.client_id].push({
      id: o.id,
      order_date: o.order_date,
      total_revenue: o.total_revenue ?? 0,
      status: o.status,
      payment_type: (o as { payment_type?: string | null }).payment_type ?? null,
    })
  }

  const enriched = (clients ?? []).map((c) => {
    const s = statsMap[c.id] ?? { total: 0, count: 0, last_date: null, total_bottles: 0, total_cases: 0 }
    return {
      id: c.id,
      name: c.name,
      city: c.city as string | null,
      phone: c.phone as string | null,
      email: c.email as string | null,
      website: c.website as string | null,
      contact_name: c.contact_name as string | null,
      type: c.type as string | null,
      responsible_id: c.responsible_id as string | null,
      notes: c.notes as string | null,
      active: c.active as boolean,
      created_at: c.created_at as string,
      responsible_name: ((c.user_profiles as unknown) as { name: string } | null)?.name ?? null,
      total_orders: s.count,
      total_revenue: s.total,
      total_bottles: s.total_bottles,
      total_cases: s.total_cases,
      last_order_date: s.last_date,
      orders: ordersMap[c.id] ?? [],
    }
  })

  return <ClientList clients={enriched} lang={lang} />
}
