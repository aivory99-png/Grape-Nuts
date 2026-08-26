'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrder } from '../../actions'
import Combobox from '@/components/combobox'
import { useLocalOptions } from '@/lib/use-local-options'
import type { Lang } from '@/lib/i18n'

type Client  = { id: string; name: string; city: string | null; responsible_id: string | null }
type Wine    = { id: string; name: string; vintage: number | null; type: string; stock: number; list_price: number | null }
type Member  = { id: string; name: string }
type OrderItem = { wine_id: string; quantity: number; sale_price: number }

const DEFAULT_CARRIERS = [
  { value: 'Azul Cargo',     label: 'Azul Cargo' },
  { value: 'Correios',       label: 'Correios' },
  { value: 'Jadlog',         label: 'Jadlog' },
  { value: 'Loggi',          label: 'Loggi' },
  { value: 'Mercado Envios', label: 'Mercado Envios' },
  { value: 'Retirada',       label: 'Retirada na loja' },
]

const DEFAULT_PAYMENT_TYPES = [
  { value: 'boleto',         label: 'Boleto' },
  { value: 'pix',            label: 'PIX' },
  { value: 'cash',           label: 'CASH' },
  { value: 'consignado',     label: 'Consignado' },
  { value: 'cartao_credito', label: 'Cartão Crédito' },
  { value: 'prospect',       label: 'Prospect (brinde)' },
]
const DEFAULT_PAYMENT_TERMS = [
  { value: 'avista',   label: 'À vista' },
  { value: '30_dias',  label: '30 dias' },
  { value: '60_dias',  label: '60 dias' },
]

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

type InitialValues = {
  clientId: string
  sellerId: string
  orderDate: string
  paymentType: string
  paymentTerm: string
  notes: string
  carrier: string
  items: OrderItem[]
}

export default function EditOrderForm({
  orderId, initialValues, clients, wines, members, lang,
}: {
  orderId: string
  initialValues: InitialValues
  clients: Client[]
  wines: Wine[]
  members: Member[]
  lang: Lang
}) {
  const { opts: paymentTypeOpts, addOption: addPayType, deleteOption: delPayType, editOption: editPayType } = useLocalOptions('payment_type', DEFAULT_PAYMENT_TYPES)
  const { opts: paymentTermOpts, addOption: addPayTerm, deleteOption: delPayTerm, editOption: editPayTerm } = useLocalOptions('payment_term', DEFAULT_PAYMENT_TERMS)
  const { opts: carrierOpts, addOption: addCarrier, deleteOption: delCarrier, editOption: editCarrier } = useLocalOptions('carriers', DEFAULT_CARRIERS)

  const today = new Date().toISOString().split('T')[0]
  const [clientId,    setClientId]    = useState(initialValues.clientId)
  const [sellerId,    setSellerId]    = useState(initialValues.sellerId)
  const [orderDate,   setOrderDate]   = useState(initialValues.orderDate)
  const [paymentType, setPaymentType] = useState(initialValues.paymentType)
  const [paymentTerm, setPaymentTerm] = useState(initialValues.paymentTerm)
  const [carrier,     setCarrier]     = useState(initialValues.carrier)
  const [notes,       setNotes]       = useState(initialValues.notes)
  const [items, setItems] = useState<OrderItem[]>(
    initialValues.items.length > 0
      ? initialValues.items
      : [{ wine_id: '', quantity: 1, sale_price: 0 }]
  )
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)
  const router = useRouter()

  const clientOptions = clients.map(c => ({ value: c.id, label: c.name + (c.city ? ` — ${c.city}` : '') }))
  const memberOptions = members.map(m => ({ value: m.id, label: m.name }))

  function handleClientChange(id: string) {
    setClientId(id)
    const client = clients.find(c => c.id === id)
    if (client?.responsible_id) setSellerId(client.responsible_id)
  }

  const addItem    = () => setItems(prev => [...prev, { wine_id: '', quantity: 1, sale_price: 0 }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof OrderItem, value: string | number) =>
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      if (field === 'wine_id') {
        const wine = wines.find(w => w.id === value)
        return { ...item, wine_id: String(value), sale_price: wine?.list_price ?? item.sale_price }
      }
      return { ...item, [field]: value }
    }))

  const total = items.reduce((s, item) => s + item.quantity * item.sale_price, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    const validItems = items.filter(i => i.wine_id && i.quantity > 0)
    if (validItems.length === 0) { setResult({ error: lang === 'pt' ? 'Adicione ao menos um vinho.' : 'Agrega al menos un vino.' }); return }
    setSubmitting(true)
    setResult(null)
    try {
      const res = await updateOrder({
        orderId, clientId, sellerId, paymentType, paymentTerm,
        carrier: carrier || undefined, items: validItems, notes, orderDate,
      })
      setResult(res)
      if (res.success) {
        setTimeout(() => router.push('/dashboard'), 1200)
      }
    } catch {
      setResult({ error: lang === 'pt' ? 'Erro inesperado. Tente novamente.' : 'Error inesperado. Intente de nuevo.' })
    } finally {
      setSubmitting(false)
    }
  }

  const inp = 'w-full px-3 py-2.5 rounded-xl border border-app-border bg-white text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-wine-500'
  const lbl = 'block text-xs font-semibold text-app-text2 mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Client + Seller + Date */}
      <div className="bg-white rounded-2xl border border-app-border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-app-text">{lang === 'pt' ? 'Cliente' : 'Cliente'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Cliente' : 'Cliente'} *</label>
            <Combobox options={clientOptions} value={clientId} onChange={handleClientChange}
              placeholder={lang === 'pt' ? 'Selecionar cliente…' : 'Seleccionar cliente…'} />
          </div>
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Data do pedido' : 'Fecha del pedido'}</label>
            <input type="date" value={orderDate} max={today}
              onChange={e => setOrderDate(e.target.value || today)} className={inp} />
          </div>
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Vendedor/a responsável' : 'Vendedor/a responsable'}</label>
            <Combobox options={memberOptions} value={sellerId} onChange={setSellerId}
              placeholder={lang === 'pt' ? 'Selecionar…' : 'Seleccionar…'} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-app-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-app-text">{lang === 'pt' ? 'Vinhos' : 'Vinos'}</h2>
          <button type="button" onClick={addItem} className="text-xs text-wine-600 font-semibold hover:underline">
            {lang === 'pt' ? '+ Adicionar vinho' : '+ Agregar vino'}
          </button>
        </div>

        {items.map((item, i) => {
          const wine = wines.find(w => w.id === item.wine_id)
          const lineTotal = item.quantity * item.sale_price
          return (
            <div key={i} className="space-y-2">
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end md:grid-cols-[1fr_88px_140px_auto] md:gap-3">
                <div>
                  <label className={lbl}>{lang === 'pt' ? 'Vinho' : 'Vino'} *</label>
                  <select className={inp} value={item.wine_id}
                    onChange={e => updateItem(i, 'wine_id', e.target.value)}>
                    <option value="">{lang === 'pt' ? 'Selecionar…' : 'Seleccionar…'}</option>
                    {wines.map(w => (
                      <option key={w.id} value={w.id} disabled={w.stock === 0}>
                        {w.name}{w.vintage ? ` ${w.vintage}` : ''} — {w.stock} {lang === 'pt' ? 'garr. disp.' : 'bot. disp.'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:hidden pb-0.5">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-red-200 text-red-400 hover:bg-red-50 text-lg">×</button>
                  )}
                </div>
                <div className="hidden md:block">
                  <label className={lbl}>{lang === 'pt' ? 'Garrafas' : 'Botellas'} *</label>
                  <input type="number" min={1} max={wine?.stock ?? 999} className={inp}
                    value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
                </div>
                <div className="hidden md:block">
                  <label className={lbl}>{lang === 'pt' ? 'P. Venda / garrafa' : 'P. Venta / botella'}</label>
                  <input type="number" min={0} step="0.01" className={inp}
                    value={item.sale_price || ''} placeholder="0.00"
                    onChange={e => updateItem(i, 'sale_price', Number(e.target.value))} />
                </div>
                <div className="hidden md:flex pb-0.5">
                  {items.length > 1 ? (
                    <button type="button" onClick={() => removeItem(i)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-red-200 text-red-400 hover:bg-red-50 text-lg">×</button>
                  ) : <div className="w-9" />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:hidden">
                <div>
                  <label className={lbl}>{lang === 'pt' ? 'Garrafas' : 'Botellas'} *</label>
                  <input type="number" min={1} max={wine?.stock ?? 999} className={inp}
                    value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
                </div>
                <div>
                  <label className={lbl}>{lang === 'pt' ? 'P. Venda / garrafa' : 'P. Venta / botella'}</label>
                  <input type="number" min={0} step="0.01" className={inp}
                    value={item.sale_price || ''} placeholder="0.00"
                    onChange={e => updateItem(i, 'sale_price', Number(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center justify-between bg-app-bg rounded-xl px-3 py-2">
                <span className="text-xs text-app-text3">
                  {item.quantity} {lang === 'pt' ? 'garr.' : 'bot.'} × {fmt(item.sale_price)}
                </span>
                <span className="text-sm font-mono font-bold text-app-text tabular-nums">{fmt(lineTotal)}</span>
              </div>
            </div>
          )
        })}

        <div className="flex items-center justify-between border-t-2 border-app-border pt-3 mt-2">
          <span className="text-xs text-app-text3">
            {items.filter(i => i.wine_id).length} {lang === 'pt' ? 'produto(s)' : 'producto(s)'} · {items.reduce((s, i) => s + i.quantity, 0)} {lang === 'pt' ? 'garrafas' : 'botellas'}
          </span>
          <div className="text-right">
            <div className="text-xs text-app-text3 mb-0.5">Total:</div>
            <div className="text-xl font-mono font-bold text-wine-600 tabular-nums">{fmt(total)}</div>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="bg-white rounded-2xl border border-app-border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-app-text">{lang === 'pt' ? 'Pagamento' : 'Pago'}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Tipo' : 'Tipo'}</label>
            <Combobox options={paymentTypeOpts} value={paymentType} onChange={setPaymentType}
              placeholder={lang === 'pt' ? 'Selecionar…' : 'Seleccionar…'}
              onCreateOption={addPayType} onDeleteOption={delPayType} onEditOption={editPayType} />
          </div>
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Prazo' : 'Plazo'}</label>
            <Combobox options={paymentTermOpts} value={paymentTerm} onChange={setPaymentTerm}
              placeholder={lang === 'pt' ? 'Selecionar…' : 'Seleccionar…'}
              onCreateOption={addPayTerm} onDeleteOption={delPayTerm} onEditOption={editPayTerm} />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className={lbl}>
              {lang === 'pt' ? 'Transportadora' : 'Transportista'}{' '}
              <span className="font-normal text-app-text3">— opcional</span>
            </label>
            <Combobox options={carrierOpts} value={carrier} onChange={setCarrier}
              placeholder={lang === 'pt' ? 'Selecionar ou criar…' : 'Seleccionar o crear…'}
              onCreateOption={addCarrier} onDeleteOption={delCarrier} onEditOption={editCarrier} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-app-border p-5">
        <label className={lbl}>{lang === 'pt' ? 'Observações' : 'Observaciones'}</label>
        <textarea className={`${inp} resize-none`} rows={2}
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder={lang === 'pt' ? 'Endereço de entrega, horário…' : 'Dirección de entrega, horario…'} />
      </div>

      {result?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{result.error}</div>
      )}
      {result?.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
          {lang === 'pt' ? 'Pedido atualizado! Voltando…' : '¡Pedido actualizado! Volviendo…'}
        </div>
      )}

      <div className="flex gap-3">
        <a
          href="/dashboard"
          className="flex-1 text-center bg-app-bg hover:bg-app-border text-app-text font-semibold py-3 rounded-xl text-sm transition-colors border border-app-border"
        >
          {lang === 'pt' ? '← Cancelar' : '← Cancelar'}
        </a>
        <button
          type="submit"
          disabled={submitting || !clientId}
          className="flex-1 bg-wine-600 hover:bg-wine-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          {submitting
            ? (lang === 'pt' ? 'Salvando…' : 'Guardando…')
            : (lang === 'pt' ? 'Salvar Alterações' : 'Guardar Cambios')}
        </button>
      </div>
    </form>
  )
}
