'use client'

import { useState, useMemo } from 'react'
import RevenueChart, { type ChartWine } from './revenue-chart'
import OrdersTable, { type OrderRow } from './orders-table'
import type { Lang } from '@/lib/i18n'

type Props = {
  months: string[]
  monthKeys: string[]
  wines: ChartWine[]
  totals: number[]
  lang: Lang
  clientSeries: ChartWine[]
  avgRevenue: number
  yearTotal: number
  orders: OrderRow[]
  currentMonthKey: string
  nextMonthKey: string
  currentYear: string
  totalStock: number
  totalClients: number
}

export default function DashboardView({
  months, monthKeys, wines, totals, lang, clientSeries,
  avgRevenue, yearTotal, orders,
  currentMonthKey, nextMonthKey, currentYear,
  totalStock, totalClients,
}: Props) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [filterChartClient, setFilterChartClient] = useState('')
  const [filterChartWine, setFilterChartWine] = useState('')
  const [filterChartStatus, setFilterChartStatus] = useState('')

  const sel = 'px-2 py-1 rounded-lg border border-app-border bg-app-bg text-app-text text-[11px] focus:outline-none focus:ring-1 focus:ring-wine-400'

  function setPreset(name: string, keys: string[]) {
    if (activePreset === name) {
      setSelectedKeys([])
      setActivePreset(null)
    } else {
      setSelectedKeys(keys)
      setActivePreset(name)
    }
  }

  const todayKey = new Date().toISOString().split('T')[0]

  const presets = [
    { id: 'today', label: lang === 'pt' ? 'Hoje' : 'Hoy',          keys: [todayKey] },
    { id: 'month', label: lang === 'pt' ? 'Este mês' : 'Este mes', keys: [currentMonthKey] },
    { id: 'next',  label: lang === 'pt' ? 'Próximo mês' : 'Próximo mes', keys: [nextMonthKey] },
    { id: 'year',  label: lang === 'pt' ? 'Este ano' : 'Este año', keys: monthKeys.filter(k => k.startsWith(currentYear)) },
  ]

  const isTodayPreset = activePreset === 'today'

  const selectedIndices = useMemo(() => {
    if (isTodayPreset) {
      // Chart bars are monthly — highlight today's month bar
      const idx = monthKeys.indexOf(todayKey.slice(0, 7))
      return idx >= 0 ? [idx] : []
    }
    return selectedKeys.map(k => monthKeys.indexOf(k)).filter(i => i >= 0)
  }, [selectedKeys, monthKeys, isTodayPreset, todayKey])

  function handleBarClick(idx: number) {
    const key = monthKeys[idx]
    if (!key) return
    setActivePreset(null)
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // Unique clients and wines from orders for chart filter dropdowns
  const chartClientList = useMemo(
    () => [...new Set(orders.map(o => o.clientName).filter(Boolean))].sort(),
    [orders]
  )
  const chartWineList = useMemo(
    () => [...new Set(orders.flatMap(o => o.items.map(i => i.name)).filter(Boolean))].sort(),
    [orders]
  )

  const hasChartFilter = !!filterChartClient || !!filterChartWine || !!filterChartStatus

  // Chart-level filtered totals (recomputed client-side when filter active)
  const effectiveTotals = useMemo(() => {
    if (!hasChartFilter) return totals
    return monthKeys.map(key =>
      orders
        .filter(o => {
          if (filterChartStatus && o.status !== filterChartStatus) return false
          if (filterChartClient && o.clientName !== filterChartClient) return false
          if (filterChartWine && !o.items.some(i => i.name === filterChartWine)) return false
          return o.orderDate?.slice(0, 7) === key
        })
        .reduce((s, o) => s + o.chargedValue, 0)
    )
  }, [totals, monthKeys, orders, filterChartClient, filterChartWine, filterChartStatus, hasChartFilter])

  const selTotals = useMemo(() => {
    if (selectedIndices.length === 0) return effectiveTotals
    return effectiveTotals.map((t, i) => (selectedIndices.includes(i) ? t : 0))
  }, [effectiveTotals, selectedIndices])

  const selYearTotal = selTotals.reduce((s, t) => s + t, 0)
  const selNonZero = selTotals.filter(t => t > 0)
  const selAvg = selNonZero.length > 0 ? selNonZero.reduce((s, t) => s + t, 0) / selNonZero.length : 0

  const hasSelection = selectedKeys.length > 0

  // When wine/client filter active, show only the matching series so bars stay colored
  const chartDisplayWines = filterChartWine
    ? wines.filter(w => w.name === filterChartWine)
    : wines
  const chartDisplayClients = filterChartClient
    ? clientSeries.filter(s => s.name === filterChartClient)
    : clientSeries

  // Orders visible in table: apply chart filters + date selection
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filterChartStatus && o.status !== filterChartStatus) return false
      if (filterChartClient && o.clientName !== filterChartClient) return false
      if (filterChartWine && !o.items.some(i => i.name === filterChartWine)) return false
      if (selectedKeys.length > 0) {
        if (isTodayPreset) {
          if (!selectedKeys.includes(o.orderDate ?? '')) return false
        } else {
          if (!selectedKeys.includes(o.orderDate?.slice(0, 7) ?? '')) return false
        }
      }
      return true
    })
  }, [orders, selectedKeys, filterChartClient, filterChartWine, filterChartStatus, isTodayPreset])

  return (
    <div className="mb-6">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-wider text-app-text3 flex-shrink-0">
          {lang === 'pt' ? 'Receita por Mês' : 'Ingresos por Mes'}
        </h2>
        <span className="text-[10px] text-app-text3 flex-shrink-0">
          · {totalStock} un. · {totalClients} {lang === 'pt' ? 'clientes' : 'clientes'}
        </span>
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id, p.keys)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                activePreset === p.id
                  ? 'bg-wine-600 text-white border-wine-600'
                  : 'text-app-text3 border-app-border hover:text-app-text hover:border-app-text3'
              }`}
            >
              {p.label}
            </button>
          ))}
          {hasSelection && (
            <button
              onClick={() => { setSelectedKeys([]); setActivePreset(null) }}
              className="text-[10px] text-app-text3 hover:text-app-text px-2 py-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter row: status + client + wine */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <select value={filterChartStatus} onChange={e => setFilterChartStatus(e.target.value)} className={sel}>
          <option value="">{lang === 'pt' ? 'Todos status' : 'Todos estados'}</option>
          <option value="open">{lang === 'pt' ? 'Aberto' : 'Abierto'}</option>
          <option value="shipped">{lang === 'pt' ? 'Pend. pagto' : 'Pend. pago'}</option>
          <option value="paid">{lang === 'pt' ? 'Cobrado' : 'Cobrado'}</option>
          <option value="overdue">{lang === 'pt' ? 'Vencido' : 'Vencido'}</option>
        </select>
        <select value={filterChartClient} onChange={e => setFilterChartClient(e.target.value)} className={sel}>
          <option value="">{lang === 'pt' ? 'Todos clientes' : 'Todos clientes'}</option>
          {chartClientList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterChartWine} onChange={e => setFilterChartWine(e.target.value)} className={sel}>
          <option value="">{lang === 'pt' ? 'Todos vinhos' : 'Todos vinos'}</option>
          {chartWineList.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        {hasChartFilter && (
          <button
            onClick={() => { setFilterChartClient(''); setFilterChartWine(''); setFilterChartStatus('') }}
            className="text-[10px] text-app-text3 hover:text-app-text px-2 py-1 rounded-lg border border-app-border bg-white transition-colors"
          >
            ✕ {lang === 'pt' ? 'Limpar filtro' : 'Limpiar filtro'}
          </button>
        )}
      </div>

      {/* Chart */}
      <div data-tour="revenue-chart">
      <RevenueChart
        months={months}
        wines={chartDisplayWines}
        totals={selTotals}
        lang={lang}
        clientSeries={chartDisplayClients}
        avgRevenue={hasSelection ? selAvg : (hasChartFilter ? (selNonZero.length > 0 ? selAvg : avgRevenue) : avgRevenue)}
        yearTotal={hasSelection || hasChartFilter ? selYearTotal : yearTotal}
        selectedIndices={selectedIndices}
        allTotals={effectiveTotals}
        onBarClick={handleBarClick}
      />
      </div>

      {/* Orders count indicator */}
      {(hasSelection || hasChartFilter) && (
        <div className="mt-3 text-[11px] text-app-text3">
          {filteredOrders.length} {lang === 'pt' ? 'pedido(s) no período/filtro' : 'pedido(s) en el período/filtro'}
        </div>
      )}

      {/* Orders table */}
      <div data-tour="orders-table" className="mt-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-app-card rounded-2xl border border-app-border p-8 text-center text-app-text3 text-sm">
            {lang === 'pt' ? 'Nenhum pedido no período selecionado.' : 'Sin pedidos en el período seleccionado.'}
          </div>
        ) : (
          <OrdersTable rows={filteredOrders} lang={lang} />
        )}
      </div>
    </div>
  )
}
