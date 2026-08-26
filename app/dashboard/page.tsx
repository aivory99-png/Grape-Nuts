import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLang } from '@/lib/lang'
import type { Lang } from '@/lib/i18n'
import { type ChartWine } from './revenue-chart'
import { type OrderRow } from './orders-table'
import DashboardView from './dashboard-view'

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}
function fmtDate(d: string | null, lang: Lang) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'es-CL')
}
function daysDiff(d: string) {
  const diff = new Date(d + 'T12:00:00').getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

const MONTH_NAMES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTH_NAMES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const lang = await getLang()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [ordersRes, allPaymentsRes, stockRes, clientsRes, alertWinesRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, client_id, order_date, total_revenue, status, payment_type, payment_term, notes, created_at')
      .neq('status', 'cancelled')
      .order('order_date', { ascending: false }),
    supabase
      .from('payments')
      .select('id, order_id, amount, status, due_date, paid_at')
      .order('due_date', { ascending: true }),
    supabase.from('stock_entries').select('wine_id, qty_remaining'),
    supabase.from('clients').select('id').neq('type', 'prospect').eq('active', true),
    supabase.from('wines').select('id, name, vintage, min_stock').not('min_stock', 'is', null),
  ])

  const orders = ordersRes.data ?? []
  const allPayments = allPaymentsRes.data ?? []

  const allClientIds = [...new Set(orders.map(o => o.client_id).filter(Boolean))]
  const paymentOrderIds = [...new Set(allPayments.map(p => p.order_id).filter(Boolean))]
  const allOrderIds = [...new Set([...orders.map(o => o.id), ...paymentOrderIds])]

  const orderIds = orders.map(o => o.id)

  const [clientsMapRes, deliveriesRes, , orderItemsRes] = await Promise.all([
    allClientIds.length
      ? supabase.from('clients').select('id, name, type, responsible_id, user_profiles!clients_responsible_id_fkey(name)').in('id', allClientIds)
      : Promise.resolve({ data: [] as { id: string; name: string; type: string | null; responsible_id: string | null; user_profiles: unknown }[] }),
    allOrderIds.length
      ? supabase.from('deliveries').select('order_id, company_name, tracking_code, price, created_at').in('order_id', allOrderIds)
      : Promise.resolve({ data: [] as { order_id: string; company_name: string | null; tracking_code: string | null; price: number; created_at: string }[] }),
    paymentOrderIds.length
      ? supabase.from('orders').select('id, client_id, clients(name)').in('id', paymentOrderIds)
      : Promise.resolve({ data: [] as { id: string; client_id: string; clients: unknown }[] }),
    orderIds.length
      ? supabase.from('order_items').select('order_id, wine_id, quantity, sale_price, stock_entry_id, stock_entries(list_price, purchase_price), wines(name, vintage, bottles_per_case)').in('order_id', orderIds)
      : Promise.resolve({ data: [] as { order_id: string; wine_id: string; quantity: number; sale_price: number; stock_entry_id: string; stock_entries: unknown; wines: unknown }[] }),
  ])

  type ClientDetail = { name: string; type: string | null; sellerName: string | null }
  const clientDetailMap: Record<string, ClientDetail> = {}
  for (const c of clientsMapRes.data ?? []) {
    const seller = (c.user_profiles as { name: string } | null)?.name ?? null
    clientDetailMap[c.id] = { name: c.name, type: (c as { type?: string | null }).type ?? null, sellerName: seller }
  }

  const deliveryMap: Record<string, { company_name: string | null; tracking_code: string | null; price: number; created_at: string }> = {}
  for (const d of deliveriesRes.data ?? []) deliveryMap[d.order_id] = d

  // Categorise
  const openOrders    = orders.filter(o => o.status === 'open' && !deliveryMap[o.id])
  const shippedOrders = orders.filter(o => o.status === 'shipped')
  const pending  = allPayments.filter(p => p.status === 'pending')
  const paid     = allPayments.filter(p => p.status === 'paid')
  const overdue  = pending.filter(p => p.due_date && new Date(p.due_date + 'T12:00:00') < today)

  // KPIs
  const monthRevenue   = orders
    .filter(o => o.created_at && o.created_at >= startOfMonth)
    .reduce((s, o) => s + ((o as { total_revenue?: number }).total_revenue ?? 0), 0)
  const totalOverdue   = overdue.reduce((s, p) => s + (p.amount ?? 0), 0)
  const paidMonthCount = paid.filter(p => p.paid_at && p.paid_at >= startOfMonth.split('T')[0]).length
  const totalPaidMonth = paid
    .filter(p => p.paid_at && p.paid_at >= startOfMonth.split('T')[0])
    .reduce((s, p) => s + (p.amount ?? 0), 0)
  const totalStock   = (stockRes.data ?? []).reduce((s, e) => s + ((e as { qty_remaining?: number }).qty_remaining ?? 0), 0)

  // Stock alerts
  const stockByWine: Record<string, number> = {}
  for (const e of stockRes.data ?? []) {
    const wid = (e as { wine_id?: string }).wine_id
    if (wid) stockByWine[wid] = (stockByWine[wid] ?? 0) + ((e as { qty_remaining?: number }).qty_remaining ?? 0)
  }
  type StockAlert = { id: string; name: string; vintage: number | null; minStock: number; currentQty: number; level: 'red' | 'yellow' }
  const stockAlerts: StockAlert[] = []
  for (const w of alertWinesRes.data ?? []) {
    const minStock = (w as { min_stock?: number | null }).min_stock
    if (!minStock) continue
    const currentQty = stockByWine[(w as { id: string }).id] ?? 0
    const isRed    = currentQty < minStock
    const isYellow = !isRed && currentQty <= Math.ceil(minStock * 1.2)
    if (isRed || isYellow) {
      stockAlerts.push({
        id: (w as { id: string }).id,
        name: (w as { name: string }).name,
        vintage: (w as { vintage?: number | null }).vintage ?? null,
        minStock,
        currentQty,
        level: isRed ? 'red' : 'yellow',
      })
    }
  }
  const redAlerts    = stockAlerts.filter(a => a.level === 'red')
  const yellowAlerts = stockAlerts.filter(a => a.level === 'yellow')
  const totalClients = clientsRes.data?.length ?? 0

  // Order lookup for date
  const orderDateMap: Record<string, string> = {}
  for (const o of orders) {
    if ((o as { order_date?: string }).order_date) orderDateMap[o.id] = (o as { order_date?: string }).order_date!
  }

  // Monthly chart — always Jan–Dec of current year
  const monthlyMap = new Map<string, number>()
  for (let mo = 0; mo < 12; mo++) {
    monthlyMap.set(`${now.getFullYear()}-${String(mo + 1).padStart(2, '0')}`, 0)
  }

  for (const order of orders) {
    const key = (order as { order_date?: string }).order_date?.slice(0, 7)
    if (key && monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + ((order as { total_revenue?: number }).total_revenue ?? 0))
    }
  }
  const monthPoints = Array.from(monthlyMap.entries()).map(([key, revenue]) => {
    const [, mo] = key.split('-')
    const idx = parseInt(mo) - 1
    return { key, label: (lang === 'pt' ? MONTH_NAMES_PT : MONTH_NAMES_ES)[idx], revenue }
  })
  // Wine breakdown for chart
  const CHART_COLORS = ['#a02890', '#d4607a', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6']
  const wineAccum: Record<string, { name: string; total: number; byMonth: Record<string, number> }> = {}
  for (const item of orderItemsRes.data ?? []) {
    const orderDate = orderDateMap[item.order_id]
    const monthKey  = orderDate?.slice(0, 7)
    if (!monthKey || !monthlyMap.has(monthKey)) continue
    const wine = (item.wines as { name: string; vintage: string | null } | null)
    const wineName = wine ? (wine.vintage ? `${wine.name} ${wine.vintage}` : wine.name) : 'Vinho'
    const rev = (item.quantity ?? 0) * (item.sale_price ?? 0)
    if (!wineAccum[item.wine_id]) wineAccum[item.wine_id] = { name: wineName, total: 0, byMonth: {} }
    wineAccum[item.wine_id].total += rev
    wineAccum[item.wine_id].byMonth[monthKey] = (wineAccum[item.wine_id].byMonth[monthKey] ?? 0) + rev
  }
  const monthKeys   = monthPoints.map(m => m.key)
  const topWineEntries = Object.entries(wineAccum).sort((a, b) => b[1].total - a[1].total).slice(0, 6)
  const chartWines: ChartWine[] = topWineEntries.map(([wineId, w], i) => ({
    wineId,
    name: w.name,
    color: CHART_COLORS[i] ?? '#ccc',
    monthRevenues: monthKeys.map(k => w.byMonth[k] ?? 0),
  }))
  const chartTotals = monthPoints.map(m => m.revenue)
  const chartMonths = monthPoints.map(m => m.label)

  // Client revenue series for chart
  const CLIENT_COLORS = ['#60a5fa', '#34d399', '#f472b6', '#fb923c', '#a78bfa', '#38bdf8']
  const clientAccum: Record<string, { name: string; total: number; byMonth: Record<string, number> }> = {}
  for (const o of orders) {
    const clientId = (o as { client_id?: string }).client_id
    if (!clientId) continue
    const client = clientDetailMap[clientId]
    if (!client) continue
    const monthKey = (o as { order_date?: string }).order_date?.slice(0, 7)
    if (!monthKey || !monthlyMap.has(monthKey)) continue
    const rev = (o as { total_revenue?: number }).total_revenue ?? 0
    if (!clientAccum[clientId]) clientAccum[clientId] = { name: client.name, total: 0, byMonth: {} }
    clientAccum[clientId].total += rev
    clientAccum[clientId].byMonth[monthKey] = (clientAccum[clientId].byMonth[monthKey] ?? 0) + rev
  }
  const clientSeries: ChartWine[] = Object.entries(clientAccum)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6)
    .map(([, c], i) => ({
      name: c.name,
      color: CLIENT_COLORS[i] ?? '#ccc',
      monthRevenues: monthKeys.map(k => c.byMonth[k] ?? 0),
    }))

  const yearTotal = chartTotals.reduce((s, t) => s + t, 0)
  const nonZeroMonths = chartTotals.filter(t => t > 0)
  const avgRevenue = nonZeroMonths.length > 0
    ? nonZeroMonths.reduce((s, t) => s + t, 0) / nonZeroMonths.length
    : 0

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`
  const currentYear = String(now.getFullYear())

  // Cost per order: qty (bottles) × (purchase_price_per_case / bottles_per_case)
  const costByOrder: Record<string, number> = {}
  const itemsByOrder: Record<string, { name: string; qty: number }[]> = {}
  for (const item of orderItemsRes.data ?? []) {
    const purchasePricePerCase = (item.stock_entries as { purchase_price?: number | null } | null)?.purchase_price ?? 0
    const wine = item.wines as { name: string; vintage?: number | null; bottles_per_case?: number | null } | null
    const bpc = wine?.bottles_per_case ?? 1
    const costPerBottle = bpc > 0 ? purchasePricePerCase / bpc : purchasePricePerCase
    costByOrder[item.order_id] = (costByOrder[item.order_id] ?? 0) + (item.quantity ?? 0) * costPerBottle
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
    const wineName = wine ? (wine.vintage ? `${wine.name} ${wine.vintage}` : wine.name) : '—'
    const existing = itemsByOrder[item.order_id].find(i => i.name === wineName)
    if (existing) existing.qty += item.quantity ?? 0
    else itemsByOrder[item.order_id].push({ name: wineName, qty: item.quantity ?? 0 })
  }

  // Payment lookup by order
  const paymentByOrder: Record<string, { id: string; amount: number; due_date: string | null; paid_at: string | null; status: string }> = {}
  for (const p of allPayments) {
    if (p.order_id && !paymentByOrder[p.order_id]) {
      paymentByOrder[p.order_id] = { id: p.id, amount: p.amount ?? 0, due_date: p.due_date, paid_at: p.paid_at, status: p.status }
    }
  }

  // Build unified orders table rows
  const ordersForTable: OrderRow[] = orders.map(o => {
    const client = clientDetailMap[(o as { client_id?: string }).client_id ?? '']
    const delivery = deliveryMap[o.id]
    const payment = paymentByOrder[o.id]
    const isPaid = payment?.status === 'paid'
    const isOverdue = !isPaid && payment?.due_date && new Date(payment.due_date + 'T12:00:00') < today
    let rowStatus: OrderRow['status'] = 'open'
    if (isPaid) rowStatus = 'paid'
    else if (isOverdue || delivery || (o as { status?: string }).status === 'shipped') rowStatus = 'shipped'
    return {
      id: o.id,
      status: rowStatus,
      clientName: client?.name ?? '—',
      clientType: client?.type ?? null,
      sellerName: client?.sellerName ?? null,
      orderDate: (o as { order_date?: string }).order_date ?? null,
      shippedDate: delivery?.created_at ?? null,
      paidDate: payment?.paid_at ?? null,
      costValue: costByOrder[o.id] ?? 0,
      items: itemsByOrder[o.id] ?? [],
      chargedValue: (o as { total_revenue?: number }).total_revenue ?? 0,
      paymentType: (o as { payment_type?: string }).payment_type ?? null,
      paymentTerm: (o as { payment_term?: string }).payment_term ?? null,
      dueDate: payment?.due_date ?? null,
      paymentId: payment?.id ?? null,
    }
  })

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-app-text">
            {lang === 'pt' ? 'Financeiro' : 'Finanzas'}
          </h1>
          <p className="text-sm text-app-text3">
            {now.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'es-CL', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        <a
          href="/dashboard/vendas"
          className="bg-wine-600 hover:bg-wine-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex-shrink-0"
        >
          + {lang === 'pt' ? 'Novo Pedido' : 'Nuevo Pedido'}
        </a>
      </div>


      {/* ── ALERTAS DE STOCK ───────────────────────────────────────────── */}
      {stockAlerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {redAlerts.length > 0 && (
            <details className="group bg-red-50 border border-red-200 rounded-2xl overflow-hidden">
              <summary className="flex items-center gap-2 px-5 py-3.5 cursor-pointer select-none list-none">
                <span className="text-red-500">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                </span>
                <span className="text-sm font-bold text-red-700 flex-1">
                  {lang === 'pt' ? 'Estoque crítico' : 'Stock crítico'} · {redAlerts.length} {lang === 'pt' ? 'produto(s)' : 'producto(s)'}
                </span>
                <svg className="w-4 h-4 text-red-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </summary>
              <div className="px-5 pb-4 space-y-2">
                {redAlerts.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-t border-red-100 first:border-0">
                    <span className="text-sm text-red-800 font-medium">{a.name}{a.vintage ? ` ${a.vintage}` : ''}</span>
                    <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                      <span className="text-red-500 font-bold">{a.currentQty} un.</span>
                      <span className="text-red-300">/</span>
                      <span className="text-red-400">{lang === 'pt' ? 'mín' : 'mín'} {a.minStock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {yellowAlerts.length > 0 && (
            <details className="group bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
              <summary className="flex items-center gap-2 px-5 py-3.5 cursor-pointer select-none list-none">
                <span className="text-amber-500">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                </span>
                <span className="text-sm font-bold text-amber-700 flex-1">
                  {lang === 'pt' ? 'Estoque baixo' : 'Stock bajo'} · {yellowAlerts.length} {lang === 'pt' ? 'produto(s)' : 'producto(s)'}
                </span>
                <svg className="w-4 h-4 text-amber-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </summary>
              <div className="px-5 pb-4 space-y-2">
                {yellowAlerts.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-t border-amber-100 first:border-0">
                    <span className="text-sm text-amber-800 font-medium">{a.name}{a.vintage ? ` ${a.vintage}` : ''}</span>
                    <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                      <span className="text-amber-600 font-bold">{a.currentQty} un.</span>
                      <span className="text-amber-300">/</span>
                      <span className="text-amber-500">{lang === 'pt' ? 'mín' : 'mín'} {a.minStock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div data-tour="kpi-cards" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-app-border rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-app-text3 mb-1">
            {lang === 'pt' ? 'Receita do mês' : 'Ingresos del mes'}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-500">{fmt(monthRevenue)}</div>
          <div className="text-[10px] text-app-text3 mt-0.5">
            {lang === 'pt' ? 'pedidos do mês' : 'pedidos del mes'}
          </div>
        </div>
        <div className="bg-white border border-app-border rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-app-text3 mb-1">
            {lang === 'pt' ? 'Em andamento' : 'En proceso'}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-400">
            {openOrders.length + shippedOrders.length}
          </div>
          <div className="text-[10px] text-app-text3 mt-0.5">
            {openOrders.length} {lang === 'pt' ? 'abertos' : 'abiertos'} · {shippedOrders.length} {lang === 'pt' ? 'enviados' : 'enviados'}
          </div>
        </div>
        <div className="bg-white border border-app-border rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-app-text3 mb-1">
            {lang === 'pt' ? 'Vencido' : 'Vencido'}
          </div>
          <div className={`text-xl font-bold font-mono tabular-nums ${overdue.length > 0 ? 'text-red-400' : 'text-app-text3'}`}>
            {overdue.length > 0 ? fmt(totalOverdue) : (lang === 'pt' ? 'Em dia ✓' : 'Al día ✓')}
          </div>
          <div className="text-[10px] text-app-text3 mt-0.5">
            {overdue.length > 0
              ? `${overdue.length} ${lang === 'pt' ? 'cobranças' : 'cobros'}`
              : (lang === 'pt' ? 'Sem atrasos' : 'Sin atrasos')}
          </div>
        </div>
        <div className="bg-white border border-app-border rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-app-text3 mb-1">
            {lang === 'pt' ? 'Recebido (mês)' : 'Cobrado (mes)'}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-500">{fmt(totalPaidMonth)}</div>
          <div className="text-[10px] text-app-text3 mt-0.5">
            {paidMonthCount} {lang === 'pt' ? 'pagamentos' : 'pagos'}
          </div>
        </div>
      </div>

      {/* Monthly chart + interactive orders */}
      <DashboardView
        months={chartMonths}
        monthKeys={monthKeys}
        wines={chartWines}
        totals={chartTotals}
        lang={lang}
        clientSeries={clientSeries}
        avgRevenue={avgRevenue}
        yearTotal={yearTotal}
        orders={ordersForTable}
        currentMonthKey={currentMonthKey}
        nextMonthKey={nextMonthKey}
        currentYear={currentYear}
        totalStock={totalStock}
        totalClients={totalClients}
      />
    </div>
  )
}