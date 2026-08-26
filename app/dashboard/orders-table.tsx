'use client'

import React, { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderValues, updatePaymentDue, updateOrderStatus } from './cobrancas/actions'
import { deleteOrder } from './vendas/actions'
import type { Lang } from '@/lib/i18n'

export type OrderRow = {
  id: string
  status: 'open' | 'shipped' | 'paid'
  clientName: string
  clientType: string | null
  sellerName: string | null
  orderDate: string | null
  shippedDate: string | null
  paidDate: string | null
  costValue: number
  chargedValue: number
  items: { name: string; qty: number }[]
  paymentType: string | null
  paymentTerm: string | null
  paymentCategory: string | null
  dueDate: string | null
  paymentId: string | null
}

const CLIENT_TYPE_LABEL: Record<string, { es: string; pt: string }> = {
  wine_shop:   { pt: 'Wine Shop',    es: 'Wine Shop' },
  bar:         { pt: 'Bar',          es: 'Bar' },
  wine_bar:    { pt: 'Wine Bar',     es: 'Wine Bar' },
  restaurant:  { pt: 'Restaurante',  es: 'Restaurante' },
  supermarket: { pt: 'Supermercado', es: 'Supermercado' },
  emporio:     { pt: 'Empório',      es: 'Emporio' },
  consumidor:  { pt: 'Consumidor',   es: 'Consumidor' },
  distributor: { pt: 'Distribuidor', es: 'Distribuidor' },
  market_place:{ pt: 'Market Place', es: 'Market Place' },
}

const STATUS_CFG = {
  open:    { label: { pt: 'Aberto',      es: 'Abierto'     }, color: 'bg-amber-400 text-white border-amber-500' },
  shipped: { label: { pt: 'Pend. pagto', es: 'Pend. pago' }, color: 'bg-red-500 text-white border-red-600' },
  paid:    { label: { pt: 'Cobrado',     es: 'Cobrado'     }, color: 'bg-emerald-500 text-white border-emerald-600' },
}

function termLabel(term: string | null, lang: Lang): string {
  if (!term) return '—'
  const map: Record<string, { pt: string; es: string }> = {
    avista:            { pt: 'À vista',               es: 'Al contado' },
    '30_dias':         { pt: '30 dias',               es: '30 días' },
    '60_dias':         { pt: '60 dias',               es: '60 días' },
    '90_dias':         { pt: '90 dias',               es: '90 días' },
    ate_acabar_estoque:{ pt: 'Até acabar o estoque',  es: 'Hasta agotar stock' },
  }
  return map[term]?.[lang] ?? term
}

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string | null; sortDir: 'asc' | 'desc' }) {
  const active = sortCol === col
  return (
    <span className={`inline-block ml-0.5 text-[9px] ${active ? 'text-wine-500' : 'text-app-border'}`}>
      {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )
}

function fmtCurr(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}
function fmtDate(d: string | null, lang: Lang) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function toInputDate(d: string | null) {
  return d ? d.slice(0, 10) : ''
}

type EditCell = { rowId: string; field: 'chargedValue' | 'paymentType' | 'dueDate' | 'chargedAmount' | 'orderDate' } | null

const COL_COUNT = 14

export default function OrdersTable({ rows: initialRows, lang }: { rows: OrderRow[]; lang: Lang }) {
  const router = useRouter()
  const [rows, setRows] = useState<OrderRow[]>(initialRows)
  const [editing, setEditing] = useState<EditCell>(null)
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sorting
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSortClick(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  async function handleDelete(orderId: string) {
    setDeletingId(orderId)
    setDeleteError(null)
    const result = await deleteOrder(orderId)
    setDeletingId(null)
    if (result.error) {
      setDeleteError(result.error)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(null)
      setRows(rows.filter(r => r.id !== orderId))
      router.refresh()
    }
  }

  // Filters
  const [filterStatus,     setFilterStatus]     = useState<string>('all')
  const [filterClient,     setFilterClient]     = useState('')
  const [filterClientType, setFilterClientType] = useState('')
  const [filterSeller,     setFilterSeller]     = useState('')
  const [filterProduct,    setFilterProduct]    = useState('')
  const [filterDateFrom,   setFilterDateFrom]   = useState('')
  const [filterDateTo,     setFilterDateTo]     = useState('')

  const clientNames = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => { if (r.clientName) s.add(r.clientName) })
    return [...s].sort()
  }, [rows])

  const clientTypes = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => { if (r.clientType) s.add(r.clientType) })
    return [...s].sort()
  }, [rows])

  const sellers = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => { if (r.sellerName) s.add(r.sellerName) })
    return [...s].sort()
  }, [rows])

  const productNames = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => r.items.forEach(i => { if (i.name) s.add(i.name) }))
    return [...s].sort()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterClient && r.clientName !== filterClient) return false
      if (filterClientType && r.clientType !== filterClientType) return false
      if (filterSeller && r.sellerName !== filterSeller) return false
      if (filterProduct && !r.items.some(i => i.name === filterProduct)) return false
      if (filterDateFrom && r.orderDate && r.orderDate < filterDateFrom) return false
      if (filterDateTo   && r.orderDate && r.orderDate > filterDateTo)   return false
      return true
    })
  }, [rows, filterStatus, filterClient, filterClientType, filterSeller, filterProduct, filterDateFrom, filterDateTo])

  const hasFilters = filterStatus !== 'all' || filterClient || filterClientType || filterSeller || filterProduct || filterDateFrom || filterDateTo

  const sorted = useMemo(() => {
    if (!sortCol) return filtered
    return [...filtered].sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      switch (sortCol) {
        case 'status':       av = a.status;           bv = b.status;           break
        case 'clientName':   av = a.clientName;       bv = b.clientName;       break
        case 'clientType':   av = a.clientType ?? ''; bv = b.clientType ?? ''; break
        case 'sellerName':   av = a.sellerName ?? ''; bv = b.sellerName ?? ''; break
        case 'orderDate':    av = a.orderDate ?? '';  bv = b.orderDate ?? '';  break
        case 'dueDate':      av = a.dueDate ?? '';    bv = b.dueDate ?? '';    break
        case 'paymentType':  av = a.paymentType ?? '';bv = b.paymentType ?? '';break
        case 'paidDate':     av = a.paidDate ?? '';   bv = b.paidDate ?? '';   break
        case 'costValue':    av = a.costValue;        bv = b.costValue;        break
        case 'chargedValue': av = a.chargedValue;     bv = b.chargedValue;     break
        case 'lucro':        av = a.chargedValue - a.costValue; bv = b.chargedValue - b.costValue; break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortCol, sortDir])

  const totalCost    = sorted.reduce((s, r) => s + r.costValue, 0)
  const totalCharged = sorted.reduce((s, r) => s + r.chargedValue, 0)
  const totalLucro   = totalCharged - totalCost
  const totalLucroPct = totalCost > 0 ? Math.round((totalLucro / totalCost) * 100) : null

  function startEdit(rowId: string, field: NonNullable<EditCell>['field'], current: string) {
    setEditing({ rowId, field })
    setEditVal(current)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  async function commitEdit() {
    if (!editing) return
    const row = rows.find(r => r.id === editing.rowId)
    if (!row) { setEditing(null); return }
    setSaving(true)
    if (editing.field === 'chargedValue') {
      const val = parseFloat(editVal)
      if (!isNaN(val)) {
        setRows(prev => prev.map(r => r.id === editing.rowId ? { ...r, chargedValue: val } : r))
        await updateOrderValues(editing.rowId, { total_revenue: val })
      }
    } else if (editing.field === 'paymentType') {
      setRows(prev => prev.map(r => r.id === editing.rowId ? { ...r, paymentType: editVal } : r))
      await updateOrderValues(editing.rowId, { payment_type: editVal })
    } else if (editing.field === 'dueDate' && row.paymentId) {
      setRows(prev => prev.map(r => r.id === editing.rowId ? { ...r, dueDate: editVal || null } : r))
      await updatePaymentDue(row.paymentId, { due_date: editVal })
    } else if (editing.field === 'chargedAmount' && row.paymentId) {
      const val = parseFloat(editVal)
      if (!isNaN(val)) {
        setRows(prev => prev.map(r => r.id === editing.rowId ? { ...r, chargedValue: val } : r))
        await updatePaymentDue(row.paymentId, { amount: val })
      }
    } else if (editing.field === 'orderDate' && editVal) {
      setRows(prev => prev.map(r => r.id === editing.rowId ? { ...r, orderDate: editVal } : r))
      await updateOrderValues(editing.rowId, { order_date: editVal })
    }
    setSaving(false)
    setEditing(null)
  }

  async function handleStatusChange(rowId: string, newStatus: string, paymentId: string | null) {
    if (saving) return
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r
      const mapped = newStatus as OrderRow['status']
      return {
        ...r,
        status: mapped,
        paidDate: newStatus === 'paid' ? today : (newStatus === 'open' || newStatus === 'shipped') ? null : r.paidDate,
      }
    }))
    await updateOrderStatus(rowId, newStatus, paymentId)
    setSaving(false)
  }

  const th = 'px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-app-text3 whitespace-nowrap'
  const thWrap = 'px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-app-text3'
  const thSort = `${th} cursor-pointer select-none hover:text-app-text transition-colors`
  const thSortWrap = `${thWrap} cursor-pointer select-none hover:text-app-text transition-colors`

  const td ='px-3 py-3 text-xs text-app-text align-top'
  const editInp = 'w-full bg-wine-50 border border-wine-300 rounded px-1.5 py-0.5 text-xs text-app-text focus:outline-none focus:ring-1 focus:ring-wine-500'
  const sel = 'px-2.5 py-1.5 rounded-lg border border-app-border bg-app-bg text-app-text text-xs focus:outline-none focus:ring-2 focus:ring-wine-500'

  const statusKeys = ['all', 'open', 'shipped', 'paid'] as const
  const statusCount = (s: string) => s === 'all' ? rows.length : rows.filter(r => r.status === s).length

  return (
    <div className="bg-white rounded-2xl border border-app-border overflow-hidden">

      {deleteError && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200 text-xs text-red-600 flex items-center justify-between">
          {deleteError}
          <button onClick={() => setDeleteError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-app-border bg-app-bg/30 space-y-2">
        {/* Status pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-app-text3">Estado:</span>
          {statusKeys.map(s => {
            const cfg = s === 'all' ? null : STATUS_CFG[s]
            const count = statusCount(s)
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                  filterStatus === s
                    ? (cfg ? cfg.color : 'bg-app-text text-app-bg border-app-text')
                    : 'bg-white text-app-text3 border-app-border hover:border-app-text2'
                }`}
              >
                {s === 'all' ? `Todos (${count})` : `${cfg!.label[lang === 'pt' ? 'pt' : 'es']} (${count})`}
              </button>
            )
          })}
        </div>

        {/* Dropdown filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Client dropdown */}
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className={sel}>
            <option value="">{lang === 'pt' ? 'Todos clientes' : 'Todos clientes'}</option>
            {clientNames.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Client type dropdown */}
          <select value={filterClientType} onChange={e => setFilterClientType(e.target.value)} className={sel}>
            <option value="">{lang === 'pt' ? 'Todos os tipos' : 'Todos los tipos'}</option>
            {clientTypes.map(ct => (
              <option key={ct} value={ct}>{CLIENT_TYPE_LABEL[ct]?.[lang === 'pt' ? 'pt' : 'es'] ?? ct}</option>
            ))}
          </select>

          {/* Seller dropdown */}
          <select value={filterSeller} onChange={e => setFilterSeller(e.target.value)} className={sel}>
            <option value="">{lang === 'pt' ? 'Todos vendedores' : 'Todos los vendedores'}</option>
            {sellers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Product dropdown */}
          <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className={sel}>
            <option value="">{lang === 'pt' ? 'Todos produtos' : 'Todos productos'}</option>
            {productNames.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-app-text3 whitespace-nowrap">Pedido:</span>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className={sel} />
            <span className="text-[10px] text-app-text3">–</span>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className={sel} />
          </div>

          {hasFilters && (
            <button
              onClick={() => { setFilterStatus('all'); setFilterClient(''); setFilterClientType(''); setFilterSeller(''); setFilterProduct(''); setFilterDateFrom(''); setFilterDateTo('') }}
              className="text-xs text-app-text3 hover:text-app-text px-2 py-1.5 rounded-lg border border-app-border bg-white transition-colors"
            >
              {lang === 'pt' ? '✕ Limpar' : '✕ Limpiar'}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse" style={{ minWidth: 1200 }}>
          <thead>
            <tr className="border-b border-app-border bg-app-bg/50">
              <th className={thSort} style={{ width: 110 }} onClick={() => handleSortClick('status')}>Status<SortIcon sortCol={sortCol} sortDir={sortDir} col="status" /></th>
              <th className={thSort} style={{ width: 140 }} onClick={() => handleSortClick('clientName')}>Cliente<SortIcon sortCol={sortCol} sortDir={sortDir} col="clientName" /></th>
              <th className={thSort} style={{ width: 100 }} onClick={() => handleSortClick('clientType')}>Tipo cliente<SortIcon sortCol={sortCol} sortDir={sortDir} col="clientType" /></th>
              <th className={thSort} style={{ width: 100 }} onClick={() => handleSortClick('sellerName')}>Vendedor<SortIcon sortCol={sortCol} sortDir={sortDir} col="sellerName" /></th>
              <th className={th} style={{ width: 180 }}>{lang === 'pt' ? 'Produto(s)' : 'Producto(s)'}</th>
              <th className={thSortWrap} style={{ width: 80 }} onClick={() => handleSortClick('orderDate')}>
                Pedido<br/>confirmado<SortIcon sortCol={sortCol} sortDir={sortDir} col="orderDate" />
              </th>
              <th className={thSort} style={{ width: 140 }} onClick={() => handleSortClick('paymentType')}>
                {lang === 'pt' ? 'Método / Prazo' : 'Método / Plazo'}<SortIcon sortCol={sortCol} sortDir={sortDir} col="paymentType" />
              </th>
              <th className={thSort} style={{ width: 110 }}>
                {lang === 'pt' ? 'Categoria' : 'Categoría'}
              </th>
              <th className={thSortWrap} style={{ width: 80 }} onClick={() => handleSortClick('dueDate')}>
                {lang === 'pt' ? 'Vencimento' : 'Vencimiento'}<br/>{lang === 'pt' ? 'fatura' : 'factura'}<SortIcon sortCol={sortCol} sortDir={sortDir} col="dueDate" />
              </th>
              <th className={thSort} style={{ width: 80 }} onClick={() => handleSortClick('paidDate')}>{lang === 'pt' ? 'Pago em' : 'Pago el'}<SortIcon sortCol={sortCol} sortDir={sortDir} col="paidDate" /></th>
              <th className={`${thSort} text-right`} style={{ width: 100 }} onClick={() => handleSortClick('costValue')}>{lang === 'pt' ? 'Custo' : 'Costo'}<SortIcon sortCol={sortCol} sortDir={sortDir} col="costValue" /></th>
              <th className={`${thSort} text-right`} style={{ width: 110 }} onClick={() => handleSortClick('chargedValue')}>Val. Cobrado<SortIcon sortCol={sortCol} sortDir={sortDir} col="chargedValue" /></th>
              <th className={`${thSort} text-right`} style={{ width: 100 }} onClick={() => handleSortClick('lucro')}>Lucro<SortIcon sortCol={sortCol} sortDir={sortDir} col="lucro" /></th>
              <th className={th} style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COL_COUNT} className="px-5 py-10 text-center text-app-text3 text-sm">
                  {lang === 'pt' ? 'Nenhum pedido encontrado.' : 'Sin pedidos encontrados.'}
                </td>
              </tr>
            )}
            {sorted.map((row) => {
              const isEditingRow = editing?.rowId === row.id
              const lucro = row.chargedValue - row.costValue
              const lucroPct = row.costValue > 0 ? Math.round((lucro / row.costValue) * 100) : null

              return (
                <React.Fragment key={row.id}>
                  <tr className="group hover:bg-app-bg/30 transition-colors">

                    {/* Status dropdown */}
                    <td className={td}>
                      <div className="flex flex-col gap-0.5">
                        <div className="relative inline-block">
                          <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full border pointer-events-none select-none ${STATUS_CFG[row.status].color}`}>
                            {STATUS_CFG[row.status].label[lang === 'pt' ? 'pt' : 'es']}
                          </div>
                          <select
                            value={row.status}
                            onChange={e => handleStatusChange(row.id, e.target.value, row.paymentId)}
                            disabled={saving}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full disabled:cursor-not-allowed"
                          >
                            <option value="open">{lang === 'pt' ? 'Aberto' : 'Abierto'}</option>
                            <option value="shipped">{lang === 'pt' ? 'Pend. pagto' : 'Pend. pago'}</option>
                            <option value="paid">{lang === 'pt' ? 'Cobrado' : 'Cobrado'}</option>
                          </select>
                        </div>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className={td}>
                      <span className="font-semibold text-app-text">{row.clientName}</span>
                    </td>

                    {/* Tipo cliente */}
                    <td className={td}>
                      {row.clientType
                        ? <span className="text-[10px] font-semibold text-app-text2">{CLIENT_TYPE_LABEL[row.clientType]?.[lang === 'pt' ? 'pt' : 'es'] ?? row.clientType}</span>
                        : <span className="text-app-text3">—</span>}
                    </td>

                    {/* Vendedor */}
                    <td className={td}>
                      <span className="text-app-text2">{row.sellerName ?? '—'}</span>
                    </td>

                    {/* Productos */}
                    <td className={td}>
                      {row.items.length === 0
                        ? <span className="text-app-text3">—</span>
                        : <div className="space-y-0.5">
                            {row.items.map((item, i) => (
                              <div key={i} className="flex items-baseline gap-1.5">
                                <span className="text-[10px] font-bold text-wine-600 tabular-nums">{item.qty}×</span>
                                <span className="text-[11px] text-app-text leading-tight">{item.name}</span>
                              </div>
                            ))}
                          </div>
                      }
                    </td>

                    {/* Pedido confirmado — editable */}
                    <td className={td}>
                      {isEditingRow && editing?.field === 'orderDate' ? (
                        <input
                          ref={inputRef}
                          type="date"
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null) }}
                          className="bg-wine-50 border border-wine-300 rounded px-1.5 py-0.5 text-xs text-app-text focus:outline-none focus:ring-1 focus:ring-wine-500 w-28"
                        />
                      ) : (
                        <span
                          className="font-mono text-[11px] text-app-text2 cursor-pointer hover:text-wine-600 hover:underline"
                          onClick={() => startEdit(row.id, 'orderDate', row.orderDate ?? '')}
                        >
                          {fmtDate(row.orderDate, lang)}
                        </span>
                      )}
                    </td>

                    {/* Forma de pago + plazo — editable */}
                    <td className={td}>
                      {isEditingRow && editing?.field === 'paymentType' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null) }}
                          className={editInp}
                          style={{ width: 100 }}
                        />
                      ) : (
                        <div>
                          <button
                            type="button"
                            onClick={() => startEdit(row.id, 'paymentType', row.paymentType ?? '')}
                            className="text-[11px] text-app-text2 hover:text-wine-600 hover:underline cursor-text text-left"
                          >
                            {row.paymentType || <span className="text-app-text3 italic">—</span>}
                          </button>
                          {row.paymentTerm && (
                            <div className="text-[10px] text-app-text3 mt-0.5">
                              {termLabel(row.paymentTerm, lang)}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Categoria de Pagamento */}
                    <td className={td}>
                      {row.paymentCategory
                        ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-app-bg text-app-text2 border border-app-border whitespace-nowrap">{row.paymentCategory}</span>
                        : <span className="text-app-text3 italic text-[11px]">—</span>}
                    </td>

                    {/* Vencimento fatura — editable */}
                    <td className={td}>
                      {isEditingRow && editing?.field === 'dueDate' ? (
                        <input
                          ref={inputRef}
                          type="date"
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null) }}
                          className={editInp}
                          style={{ width: 110 }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => row.paymentId && startEdit(row.id, 'dueDate', toInputDate(row.dueDate))}
                          className="font-mono text-[11px] hover:text-wine-600 hover:underline cursor-text text-left w-full text-app-text2"
                        >
                          {fmtDate(row.dueDate, lang)}
                        </button>
                      )}
                    </td>

                    {/* Pago el */}
                    <td className={td}>
                      <span className="font-mono text-[11px] text-app-text2">{fmtDate(row.paidDate, lang)}</span>
                    </td>

                    {/* Costo */}
                    <td className={`${td} text-right`}>
                      <span className="font-mono text-[11px] text-app-text3 tabular-nums">
                        {row.costValue > 0 ? fmtCurr(row.costValue) : '—'}
                      </span>
                    </td>

                    {/* Val. Cobrado — editable */}
                    <td className={`${td} text-right`}>
                      {isEditingRow && editing?.field === 'chargedValue' ? (
                        <input
                          ref={inputRef}
                          type="number" step="0.01" min="0"
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null) }}
                          className={editInp}
                          style={{ width: 90, textAlign: 'right' }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(row.id, 'chargedValue', String(row.chargedValue))}
                          className="font-mono text-[11px] font-semibold tabular-nums text-app-text hover:text-wine-600 hover:underline cursor-text w-full text-right"
                        >
                          {fmtCurr(row.chargedValue)}
                        </button>
                      )}
                    </td>

                    {/* Lucro */}
                    <td className={`${td} text-right`}>
                      {row.costValue > 0 && row.chargedValue > 0 ? (
                        <div>
                          <div className={`font-mono text-[11px] font-semibold tabular-nums ${lucro >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {fmtCurr(lucro)}
                          </div>
                          {lucroPct !== null && (
                            <div className={`text-[10px] font-bold tabular-nums ${lucro >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                              {lucro >= 0 ? '+' : ''}{lucroPct}%
                            </div>
                          )}
                        </div>
                      ) : <span className="text-app-text3">—</span>}
                    </td>

                    {/* Edit + Delete — at end */}
                    <td className={td} style={{ padding: '12px 8px' }}>
                      <div className="flex gap-1 items-center justify-end">
                        <a
                          href={`/dashboard/vendas/${row.id}/edit`}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-app-text3 hover:text-wine-600 hover:bg-wine-50 transition-colors"
                          title={lang === 'pt' ? 'Editar pedido' : 'Editar pedido'}
                        >
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.586 3.586a2 2 0 112.828 2.828l-8.793 8.793a1 1 0 01-.416.247l-3 .75a.5.5 0 01-.601-.601l.75-3a1 1 0 01.247-.416l8.985-8.601z" />
                          </svg>
                        </a>
                        {confirmDeleteId === row.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(row.id)}
                              disabled={deletingId === row.id}
                              className="w-6 h-6 flex items-center justify-center text-xs bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded transition-colors"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => { setConfirmDeleteId(null); setDeleteError(null) }}
                              className="w-6 h-6 flex items-center justify-center text-xs text-app-text3 hover:text-app-text rounded transition-colors"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(row.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-app-text3 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title={lang === 'pt' ? 'Eliminar pedido' : 'Eliminar pedido'}
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path fillRule="evenodd" d="M8.75 1a.75.75 0 00-.75.75V4H4a.75.75 0 000 1.5h.393l1.472 13.297A2.25 2.25 0 007.879 20h4.242a2.25 2.25 0 002.014-1.203L17.607 5.5H18a.75.75 0 000-1.5h-4V1.75a.75.75 0 00-.75-.75h-4.5zM7.5 7a.75.75 0 00-.75.75v8.5a.75.75 0 001.5 0v-8.5a.75.75 0 00-.75-.75zm4 0a.75.75 0 00-.75.75v8.5a.75.75 0 001.5 0v-8.5a.75.75 0 00-.75-.75z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              )
            })}
          </tbody>

          {/* Totals */}
          {sorted.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-app-border bg-app-bg/50">
                <td colSpan={9} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-app-text3">
                  Total — {sorted.length} pedidos
                  {hasFilters && <span className="ml-1 text-wine-500">(filtrado)</span>}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-xs font-bold font-mono tabular-nums text-app-text3">
                    {totalCost > 0 ? fmtCurr(totalCost) : '—'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className="text-sm font-bold font-mono tabular-nums text-app-text">
                    {fmtCurr(totalCharged)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  {totalCost > 0 ? (
                    <div>
                      <div className={`text-sm font-bold font-mono tabular-nums ${totalLucro >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmtCurr(totalLucro)}
                      </div>
                      {totalLucroPct !== null && (
                        <div className={`text-[10px] font-bold ${totalLucro >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                          {totalLucro >= 0 ? '+' : ''}{totalLucroPct}%
                        </div>
                      )}
                    </div>
                  ) : <span className="text-app-text3">—</span>}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {saving && (
        <div className="px-4 py-2 text-xs text-wine-600 border-t border-app-border bg-wine-50/30">
          {lang === 'pt' ? 'Salvando…' : 'Guardando…'}
        </div>
      )}
    </div>
  )
}
