'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Lang } from '@/lib/i18n'

export type OrderSummary = {
  id: string
  order_date: string | null
  total_revenue: number
  status: string
  payment_type: string | null
}

export type ClientRow = {
  id: string
  name: string
  city: string | null
  phone: string | null
  email: string | null
  website: string | null
  contact_name: string | null
  type: string | null
  responsible_name: string | null
  notes: string | null
  active: boolean
  created_at: string
  total_orders: number
  total_revenue: number
  total_bottles: number
  total_cases: number
  last_order_date: string | null
  orders: OrderSummary[]
}

const TYPE_LABEL: Record<string, { pt: string; es: string }> = {
  wine_shop:    { pt: 'Wine Shop',    es: 'Wine Shop' },
  bar:          { pt: 'Bar',          es: 'Bar' },
  wine_bar:     { pt: 'Wine Bar',     es: 'Wine Bar' },
  restaurant:   { pt: 'Restaurante',  es: 'Restaurante' },
  supermarket:  { pt: 'Supermercado', es: 'Supermercado' },
  emporio:      { pt: 'Empório',      es: 'Emporio' },
  consumidor:   { pt: 'Consumidor',   es: 'Consumidor' },
  distributor:  { pt: 'Distribuidor', es: 'Distribuidor' },
  market_place: { pt: 'Market Place', es: 'Market Place' },
  prospect:     { pt: 'Prospect',     es: 'Prospecto' },
}
function typeLabel(type: string, lang: Lang): string {
  return TYPE_LABEL[type]?.[lang] ?? type
}
const TYPE_COLOR: Record<string, string> = {
  wine_shop:    'bg-purple-100 text-purple-700',
  bar:          'bg-orange-100 text-orange-700',
  wine_bar:     'bg-rose-100 text-rose-700',
  restaurant:   'bg-blue-100 text-blue-700',
  supermarket:  'bg-emerald-100 text-emerald-700',
  emporio:      'bg-teal-100 text-teal-700',
  consumidor:   'bg-sky-100 text-sky-700',
  distributor:  'bg-gray-100 text-gray-700',
  market_place: 'bg-indigo-100 text-indigo-700',
  prospect:     'bg-yellow-100 text-yellow-700',
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(d: string | null, lang: Lang) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'es-CL', { day: '2-digit', month: 'short' })
}

/* ── Podium sparkline ── */
function PodiumSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  const W = 130, H = 38
  if (data.every(v => v === 0)) {
    return <div style={{ width: W, height: H }} className="flex items-end pb-1"><div className="w-full h-px" style={{ background: `${color}30` }} /></div>
  }
  const pts = data.map((v, i) => [
    (i / Math.max(data.length - 1, 1)) * W,
    H - 4 - Math.max((v / max) * (H - 8), 2),
  ])
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  )
}

const RANK_CFG = [
  { color: '#F59E0B', borderCls: 'border-yellow-500/40',  textCls: 'text-yellow-400',  numeral: '①', labelEs: 'LÍDER',    labelPt: 'LÍDER' },
  { color: '#94A3B8', borderCls: 'border-slate-400/30',   textCls: 'text-slate-300',   numeral: '②', labelEs: '2° LUGAR', labelPt: '2° LUGAR' },
  { color: '#CD7C2F', borderCls: 'border-orange-500/30',  textCls: 'text-orange-400',  numeral: '③', labelEs: '3° LUGAR', labelPt: '3° LUGAR' },
]

function Podium({ clients, lang, onSelectClient }: {
  clients: ClientRow[]
  lang: Lang
  onSelectClient: (name: string) => void
}) {
  const [metric, setMetric] = useState<'revenue' | 'orders' | 'bottles'>('revenue')

  const top3 = useMemo(() => {
    return [...clients]
      .sort((a, b) => {
        if (metric === 'orders')  return b.total_orders  - a.total_orders
        if (metric === 'bottles') return b.total_bottles - a.total_bottles
        return b.total_revenue - a.total_revenue
      })
      .slice(0, 3)
  }, [clients, metric])

  const totalRevenue = useMemo(() => clients.reduce((s, c) => s + c.total_revenue, 0), [clients])

  function getMonthlyRevenue(client: ClientRow) {
    const byMonth: Record<string, number> = {}
    client.orders.forEach(o => {
      if (!o.order_date) return
      const m = o.order_date.slice(0, 7)
      byMonth[m] = (byMonth[m] || 0) + o.total_revenue
    })
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      months.push(d.toISOString().slice(0, 7))
    }
    return months.map(m => byMonth[m] || 0)
  }

  function getTrend(client: ClientRow) {
    const now = new Date()
    const m3 = new Date(now); m3.setMonth(m3.getMonth() - 3)
    const m6 = new Date(now); m6.setMonth(m6.getMonth() - 6)
    const m3Key = m3.toISOString().slice(0, 7)
    const m6Key = m6.toISOString().slice(0, 7)
    const recent = client.orders.filter(o => o.order_date && o.order_date >= m3Key).reduce((s, o) => s + o.total_revenue, 0)
    const prev   = client.orders.filter(o => o.order_date && o.order_date >= m6Key && o.order_date < m3Key).reduce((s, o) => s + o.total_revenue, 0)
    if (prev === 0) return null
    return Math.round(((recent - prev) / prev) * 100)
  }

  if (top3.length === 0) return null

  const metricOpts = [
    { id: 'revenue', label: lang === 'pt' ? 'Receita' : 'Ingreso' },
    { id: 'orders',  label: lang === 'pt' ? 'Pedidos' : 'Pedidos' },
    { id: 'bottles', label: lang === 'pt' ? 'Unidades' : 'Unidades' },
  ]

  function getMetricDisplay(c: ClientRow) {
    if (metric === 'orders')  return `${c.total_orders} ped.`
    if (metric === 'bottles') {
      const cxPart = c.total_cases > 0 ? `${c.total_cases} cx` : null
      const btPart = `${c.total_bottles} bt`
      return cxPart ? `${cxPart} · ${btPart}` : btPart
    }
    return fmt(c.total_revenue)
  }

  return (
    <div className="px-4 md:px-6 pt-3 pb-3">
      {/* Toggle row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold tracking-widest uppercase text-app-text3 mr-1">
          {lang === 'pt' ? 'Pódio por' : 'Podio por'}
        </span>
        {metricOpts.map(opt => (
          <button key={opt.id} onClick={() => setMetric(opt.id as 'revenue' | 'orders' | 'bottles')}
            className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${metric === opt.id ? 'bg-wine-600 text-white border-wine-600' : 'text-app-text3 border-app-border hover:text-app-text'}`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {top3.map((c, i) => {
          const cfg = RANK_CFG[i]
          const sparkData = getMonthlyRevenue(c)
          const trend = getTrend(c)
          const pct = totalRevenue > 0 ? Math.round((c.total_revenue / totalRevenue) * 100) : 0

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectClient(c.name)}
              className={`text-left rounded-2xl border p-3 flex flex-col gap-2 transition-all hover:brightness-110 ${cfg.borderCls}`}
              style={{ background: '#18181b' }}
            >
              {/* Rank label */}
              <div className={`text-[10px] font-bold tracking-widest flex items-center gap-1.5 ${cfg.textCls}`}>
                <span style={{ color: cfg.color }} className="text-sm leading-none">{cfg.numeral}</span>
                <span>{lang === 'pt' ? cfg.labelPt : cfg.labelEs}</span>
                {c.type && <span className="opacity-60 font-normal">· {typeLabel(c.type, lang)}</span>}
              </div>

              {/* Name */}
              <div>
                <div className="font-bold text-white text-sm leading-tight">{c.name}</div>
                {c.city && <div className="text-[11px] text-zinc-400 mt-0.5">{c.city}</div>}
              </div>

              {/* Main metric */}
              <div>
                <div className="font-mono font-bold text-white text-lg leading-none tabular-nums">
                  {getMetricDisplay(c)}
                </div>
                <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span>{pct}{lang === 'pt' ? '% do total' : '% del total'}</span>
                  {trend !== null && (
                    <span className={trend >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs. ant.
                    </span>
                  )}
                </div>
              </div>

              {/* Sparkline */}
              <div>
                <PodiumSparkline data={sparkData} color={cfg.color} />
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t pt-2" style={{ borderColor: '#ffffff14' }}>
                {[
                  { label: lang === 'pt' ? 'Pedidos' : 'Pedidos', value: String(c.total_orders) },
                  { label: lang === 'pt' ? 'Receita' : 'Ingreso', value: fmt(c.total_revenue) },
                  {
                    label: lang === 'pt' ? 'Caixas / garrafas' : 'Cajas / botellas',
                    value: c.total_cases > 0
                      ? `${c.total_cases} cx · ${c.total_bottles} bt`
                      : `${c.total_bottles} bt`,
                  },
                  { label: lang === 'pt' ? 'Última compra' : 'Última compra', value: fmtDate(c.last_order_date, lang) },
                ].map(s => (
                  <div key={s.label}>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-wide">{s.label}</div>
                    <div className="text-[11px] font-semibold text-zinc-200 tabular-nums">{s.value}</div>
                  </div>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Sort icon ── */
function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string | null; sortDir: 'asc' | 'desc' }) {
  const active = sortCol === col
  return (
    <span className={`inline-block ml-0.5 text-[9px] ${active ? 'text-wine-500' : 'text-app-border'}`}>
      {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )
}

export default function ClientList({ clients, lang }: { clients: ClientRow[]; lang: Lang }) {
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sortCol,    setSortCol]    = useState<string | null>('name')
  const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('asc')

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0]
  const activeCount = clients.filter(c => c.type !== 'prospect' && c.last_order_date && c.last_order_date >= threeMonthsAgoStr).length

  const filtered = useMemo(() => {
    let list = [...clients]
    if (search) list = list.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.city?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (c.email?.toLowerCase() ?? '').includes(search.toLowerCase())
    )
    if (typeFilter) list = list.filter(c => c.type === typeFilter)
    list.sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      switch (sortCol) {
        case 'name':         av = a.name;              bv = b.name;              break
        case 'type':         av = a.type ?? '';        bv = b.type ?? '';        break
        case 'city':         av = a.city ?? '';        bv = b.city ?? '';        break
        case 'responsible':  av = a.responsible_name ?? ''; bv = b.responsible_name ?? ''; break
        case 'last_order':   av = a.last_order_date ?? ''; bv = b.last_order_date ?? ''; break
        case 'orders':       av = a.total_orders;     bv = b.total_orders;     break
        case 'cases':        av = a.total_cases;      bv = b.total_cases;      break
        case 'bottles':      av = a.total_bottles;    bv = b.total_bottles;    break
        case 'revenue':      av = a.total_revenue;    bv = b.total_revenue;    break
        default:             av = a.name;              bv = b.name
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [clients, search, typeFilter, sortCol, sortDir])

  const inp = 'px-3 py-2 rounded-xl border border-app-border bg-white text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-wine-500'
  const thBase = 'px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-app-text3'
  const thSort = `${thBase} cursor-pointer select-none hover:text-app-text transition-colors`

  return (
    <div className="max-w-6xl mx-auto">

      {/* Page header */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 mb-4 flex items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-app-text">{lang === 'pt' ? 'Clientes' : 'Clientes'}</h1>
          <p className="text-sm text-app-text3">
            {new Date().toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'es-CL', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        <Link href="/dashboard/clientes/novo"
          className="flex-shrink-0 bg-wine-600 hover:bg-wine-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          {lang === 'pt' ? '+ Novo Cliente' : '+ Nuevo Cliente'}
        </Link>
      </div>

      {/* Podium */}
      <Podium clients={clients} lang={lang} onSelectClient={(name) => { setSearch(name); setTypeFilter('') }} />

      {/* Filters */}
      <div className="p-4 md:p-6 pt-3">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="text-sm text-app-text3">
              <span className="font-semibold text-app-text">{clients.filter(c => c.type !== 'prospect').length}</span>
              {' '}{lang === 'pt' ? 'cadastrados' : 'registrados'}
            </span>
            <span className="text-sm">
              <span className="font-semibold text-emerald-600">{activeCount}</span>
              {' '}<span className="text-app-text3">{lang === 'pt' ? 'ativos (últ. 3 meses)' : 'activos (últ. 3 meses)'}</span>
            </span>
            {clients.filter(c => c.type === 'prospect').length > 0 && (
              <span className="text-sm text-app-text3">
                {clients.filter(c => c.type === 'prospect').length} {lang === 'pt' ? 'prospects' : 'prospectos'}
              </span>
            )}
          </div>
        </div>

        {/* Search + type filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'pt' ? '🔍 Nome, email ou cidade…' : '🔍 Nombre, email o ciudad…'}
            className={`${inp} flex-1 min-w-40`}
          />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={inp}>
            <option value="">{lang === 'pt' ? 'Todos os tipos' : 'Todos los tipos'}</option>
            {Object.keys(TYPE_LABEL).map(v => (
              <option key={v} value={v}>{typeLabel(v, lang)}</option>
            ))}
          </select>
          {(search || typeFilter) && (
            <button
              onClick={() => { setSearch(''); setTypeFilter('') }}
              className="px-3 py-2 rounded-xl border border-app-border text-xs text-app-text3 hover:text-app-text bg-white transition-colors"
            >
              ✕ {lang === 'pt' ? 'Limpar' : 'Limpiar'}
            </button>
          )}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-app-border px-5 py-10 text-center text-app-text3 text-sm">
            {search || typeFilter
              ? (lang === 'pt' ? 'Nenhum resultado.' : 'Sin resultados.')
              : <>{lang === 'pt' ? 'Nenhum cliente ainda. ' : 'Sin clientes aún. '}<Link href="/dashboard/clientes/novo" className="text-wine-600 hover:underline">{lang === 'pt' ? '+ Novo Cliente' : '+ Nuevo Cliente'}</Link></>}
          </div>
        ) : (
          <div data-tour="client-list" className="bg-white rounded-2xl border border-app-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-app-border bg-app-bg/60">
                    <th className={`${thSort} text-left px-4`} onClick={() => handleSort('name')}>
                      {lang === 'pt' ? 'Cliente' : 'Cliente'}<SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className={`${thSort} text-left hidden md:table-cell`} onClick={() => handleSort('type')}>
                      {lang === 'pt' ? 'Tipo' : 'Tipo'}<SortIcon col="type" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className={`${thSort} text-left hidden lg:table-cell`} onClick={() => handleSort('city')}>
                      {lang === 'pt' ? 'Cidade' : 'Ciudad'}<SortIcon col="city" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className={`${thBase} text-left hidden lg:table-cell`}>
                      {lang === 'pt' ? 'Contato' : 'Contacto'}
                    </th>
                    <th className={`${thSort} text-left hidden xl:table-cell`} onClick={() => handleSort('responsible')}>
                      {lang === 'pt' ? 'Vendedor' : 'Vendedor'}<SortIcon col="responsible" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className={`${thSort} text-right hidden sm:table-cell`} onClick={() => handleSort('last_order')}>
                      {lang === 'pt' ? 'Últ. Pedido' : 'Últ. Pedido'}<SortIcon col="last_order" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className={`${thSort} text-right`} onClick={() => handleSort('orders')}>
                      {lang === 'pt' ? 'Pedidos' : 'Pedidos'}<SortIcon col="orders" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className={`${thSort} text-right hidden sm:table-cell`} onClick={() => handleSort('cases')}>
                      {lang === 'pt' ? 'Cx.' : 'Cj.'}<SortIcon col="cases" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className={`${thSort} text-right hidden sm:table-cell`} onClick={() => handleSort('bottles')}>
                      Bt.<SortIcon col="bottles" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className={`${thSort} text-right`} onClick={() => handleSort('revenue')}>
                      {lang === 'pt' ? 'Receita' : 'Ingreso'}<SortIcon col="revenue" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className={`${thBase} text-center w-10`}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {filtered.map(c => {
                    const isProspect = c.type === 'prospect'
                    return (
                      <tr key={c.id} className="hover:bg-app-bg/30 transition-colors group">
                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-app-text leading-snug">{c.name}</div>
                          {c.city && <div className="text-[11px] text-app-text3 lg:hidden">{c.city}</div>}
                          {c.type && (
                            <div className="md:hidden mt-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_COLOR[c.type] ?? 'bg-gray-100 text-gray-600'}`}>
                                {typeLabel(c.type, lang)}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Type */}
                        <td className="px-3 py-3 hidden md:table-cell">
                          {c.type && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${TYPE_COLOR[c.type] ?? 'bg-gray-100 text-gray-600'}`}>
                              {typeLabel(c.type, lang)}
                            </span>
                          )}
                        </td>

                        {/* City */}
                        <td className="px-3 py-3 text-app-text2 text-xs hidden lg:table-cell">
                          {c.city ?? <span className="text-app-text3">—</span>}
                        </td>

                        {/* Contact */}
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <div className="text-xs text-app-text2 space-y-0.5">
                            {c.phone && <div><a href={`tel:${c.phone}`} className="hover:text-wine-600">{c.phone}</a></div>}
                            {c.email && <div><a href={`mailto:${c.email}`} className="hover:text-wine-600 truncate max-w-[160px] block">{c.email}</a></div>}
                            {!c.phone && !c.email && <span className="text-app-text3">—</span>}
                          </div>
                        </td>

                        {/* Vendedor */}
                        <td className="px-3 py-3 text-xs text-app-text2 hidden xl:table-cell">
                          {c.responsible_name ?? <span className="text-app-text3">—</span>}
                        </td>

                        {/* Último pedido */}
                        <td className="px-3 py-3 text-right text-xs text-app-text3 tabular-nums hidden sm:table-cell">
                          {fmtDate(c.last_order_date, lang)}
                        </td>

                        {/* Pedidos */}
                        <td className="px-3 py-3 text-right tabular-nums text-xs text-app-text2">
                          {c.total_orders > 0 ? c.total_orders : <span className="text-app-text3">0</span>}
                        </td>

                        {/* Cajas */}
                        <td className="px-3 py-3 text-right tabular-nums text-xs text-app-text2 hidden sm:table-cell">
                          {c.total_cases > 0 ? c.total_cases : <span className="text-app-text3">—</span>}
                        </td>

                        {/* Botellas */}
                        <td className="px-3 py-3 text-right tabular-nums text-xs text-app-text2 hidden sm:table-cell">
                          {c.total_bottles > 0 ? c.total_bottles : <span className="text-app-text3">—</span>}
                        </td>

                        {/* Ingreso */}
                        <td className="px-3 py-3 text-right">
                          {c.total_revenue > 0
                            ? <span className="font-bold font-mono tabular-nums text-app-text text-sm">{fmt(c.total_revenue)}</span>
                            : <span className="text-app-text3 text-xs">{isProspect ? (lang === 'pt' ? 'Prospect' : 'Prospecto') : '—'}</span>}
                        </td>

                        {/* Edit */}
                        <td className="px-3 py-3 text-center">
                          <Link
                            href={`/dashboard/clientes/${c.id}`}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-app-border text-app-text3 hover:text-app-text hover:bg-app-bg opacity-0 group-hover:opacity-100 transition-all"
                            title={lang === 'pt' ? 'Editar cliente' : 'Editar cliente'}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {filtered.length > 1 && (
                  <tfoot>
                    <tr className="border-t border-app-border bg-app-bg/60">
                      <td colSpan={6} className="px-4 py-2.5 text-xs text-app-text3">
                        {filtered.length} {lang === 'pt' ? 'clientes' : 'clientes'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums text-app-text2">
                        {filtered.reduce((s, c) => s + c.total_orders, 0)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums text-app-text2 hidden sm:table-cell">
                        {filtered.reduce((s, c) => s + c.total_cases, 0)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums text-app-text2 hidden sm:table-cell">
                        {filtered.reduce((s, c) => s + c.total_bottles, 0)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-bold tabular-nums text-app-text">
                        {fmt(filtered.reduce((s, c) => s + c.total_revenue, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
