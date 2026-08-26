'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrder } from './actions'
import Combobox from '@/components/combobox'
import { useLocalOptions } from '@/lib/use-local-options'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

type Client = { id: string; name: string; city: string | null; responsible_id: string | null }
type Wine   = { id: string; name: string; vintage: number | null; type: string; stock: number; list_price: number | null; bottles_per_case: number | null }
type Member = { id: string; name: string }
type OrderItem = { wine_id: string; quantity: number; sale_price: number; unit: 'botella' | 'caja' }

function getDefaultCarriers(lang: Lang) {
  return [
    { value: 'Azul Cargo',     label: 'Azul Cargo' },
    { value: 'Correios',       label: 'Correios' },
    { value: 'Jadlog',         label: 'Jadlog' },
    { value: 'Loggi',          label: 'Loggi' },
    { value: 'Mercado Envios', label: 'Mercado Envios' },
    { value: 'Retirada',       label: lang === 'pt' ? 'Retirada na loja' : 'Retiro en tienda' },
  ]
}

function getDefaultPaymentCategories(lang: Lang) {
  return [
    { value: 'faturado',    label: lang === 'pt' ? 'Faturado'    : 'Facturado' },
    { value: 'sem_faturar', label: lang === 'pt' ? 'Sem Faturar' : 'Sin Facturar' },
    { value: 'consignado',  label: 'Consignado' },
  ]
}

const DEFAULT_PAYMENT_TYPES = [
  { value: 'boleto',         label: 'Boleto' },
  { value: 'pix',            label: 'PIX' },
  { value: 'cash',           label: 'CASH' },
  { value: 'consignado',     label: 'Consignado' },
  { value: 'cartao_credito', label: 'Cartão Crédito' },
  { value: 'prospect',       label: 'Prospect (brinde)' },
]
function getDefaultPaymentTerms(lang: Lang) {
  return [
    { value: 'avista',             label: lang === 'pt' ? 'À vista'               : 'Al contado' },
    { value: '30_dias',            label: lang === 'pt' ? '30 dias'               : '30 días' },
    { value: '60_dias',            label: lang === 'pt' ? '60 dias'               : '60 días' },
    { value: '90_dias',            label: lang === 'pt' ? '90 dias'               : '90 días' },
    { value: 'ate_acabar_estoque', label: lang === 'pt' ? 'Até acabar o estoque'  : 'Hasta agotar stock' },
  ]
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

export default function SalesForm({
  clients, wines, members, lang, defaultClientId = '',
}: {
  clients: Client[]
  wines: Wine[]
  members: Member[]
  lang: Lang
  defaultClientId?: string
}) {
  const { opts: paymentTypeOpts, addOption: addPayType, deleteOption: delPayType, editOption: editPayType } = useLocalOptions('payment_type', DEFAULT_PAYMENT_TYPES)
  const { opts: paymentTermOpts, addOption: addPayTerm, deleteOption: delPayTerm, editOption: editPayTerm } = useLocalOptions('payment_term', getDefaultPaymentTerms(lang))
  const { opts: paymentCategoryOpts, addOption: addPayCat, deleteOption: delPayCat, editOption: editPayCat } = useLocalOptions('payment_category', getDefaultPaymentCategories(lang))
  const { opts: carrierOpts, addOption: addCarrier, deleteOption: delCarrier, editOption: editCarrier } = useLocalOptions('carriers', getDefaultCarriers(lang))

  const today = new Date().toISOString().split('T')[0]
  const [clientId, setClientId] = useState(defaultClientId)
  const defaultClient = defaultClientId ? clients.find(c => c.id === defaultClientId) : undefined
  const [sellerId, setSellerId] = useState(defaultClient?.responsible_id ?? '')
  const [orderDate, setOrderDate] = useState(today)
  const [paymentType,     setPaymentType]     = useState('boleto')
  const [paymentTerm,     setPaymentTerm]     = useState('avista')
  const [paymentCategory, setPaymentCategory] = useState('')
  const [items, setItems] = useState<OrderItem[]>([{ wine_id: '', quantity: 1, sale_price: 0, unit: 'botella' }])
  const [carrier, setCarrier] = useState('')
  const [notes, setNotes] = useState('')
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name + (c.city ? ` — ${c.city}` : '') }))
  const memberOptions = members.map((m) => ({ value: m.id, label: m.name }))

  function handleClientChange(id: string) {
    setClientId(id)
    const client = clients.find(c => c.id === id)
    if (client?.responsible_id) setSellerId(client.responsible_id)
  }

  const addItem = () => setItems((prev) => [...prev, { wine_id: '', quantity: 1, sale_price: 0, unit: 'botella' }])
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof OrderItem, value: string | number) =>
    setItems((prev) => prev.map((item, idx) => {
      if (idx !== i) return item
      if (field === 'wine_id') {
        const wine = wines.find((w) => w.id === value)
        const bpc = wine?.bottles_per_case ?? 1
        const pricePerCaja = wine?.list_price ?? 0
        // list_price stored is per caja — divide by bpc when selling per botella
        const sale_price = item.unit === 'caja' ? pricePerCaja : (pricePerCaja / bpc)
        return { ...item, wine_id: String(value), sale_price, quantity: 1 }
      }
      if (field === 'unit') {
        const wine = wines.find((w) => w.id === item.wine_id)
        const newUnit = value as 'botella' | 'caja'
        const bpc = wine?.bottles_per_case ?? 1

        // Convertir cantidad y precio cuando cambias unidad
        if (item.unit === 'botella' && newUnit === 'caja') {
          // De botellas a cajas
          return {
            ...item,
            unit: newUnit,
            quantity: Math.floor(item.quantity / bpc),
            sale_price: item.sale_price * bpc
          }
        } else if (item.unit === 'caja' && newUnit === 'botella') {
          // De cajas a botellas
          return {
            ...item,
            unit: newUnit,
            quantity: item.quantity * bpc,
            sale_price: item.sale_price / bpc
          }
        }
        return { ...item, unit: newUnit }
      }
      return { ...item, [field]: value }
    }))

  const total = items.reduce((s, item) => s + item.quantity * item.sale_price, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return
    const validItems = items.filter((i) => i.wine_id && i.quantity > 0)
    if (validItems.length === 0) { setResult({ error: t('sale_no_wine', lang) }); return }
    setSubmitting(true)
    setResult(null)
    try {
      const itemsWithBpc = validItems.map(i => ({
        ...i,
        bottles_per_case: wines.find(w => w.id === i.wine_id)?.bottles_per_case ?? null,
      }))
      const res = await createOrder({ clientId, sellerId, paymentType, paymentTerm, paymentCategory: paymentCategory || undefined, carrier: carrier || undefined, items: itemsWithBpc, notes, orderDate })
      setResult(res)
      if (res.success) {
        setClientId(''); setSellerId(''); setCarrier('')
        setItems([{ wine_id: '', quantity: 1, sale_price: 0, unit: 'botella' }])
        setNotes('')
        setTimeout(() => router.push('/dashboard/cobrancas'), 1500)
      }
    } catch (err) {
      console.error('[vendas] createOrder:', err instanceof Error ? err.message : String(err))
      setResult({ error: lang === 'pt' ? 'Erro inesperado ao criar pedido. Tente novamente.' : 'Error inesperado al crear pedido. Intente de nuevo.' })
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
        <h2 className="text-sm font-semibold text-app-text">{t('sale_client', lang)}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>{t('sale_client', lang)} *</label>
            <Combobox
              options={clientOptions}
              value={clientId}
              onChange={handleClientChange}
              placeholder={t('sale_select_cl', lang)}
            />
          </div>
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Data do pedido' : 'Fecha del pedido'}</label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value || today)}
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>{t('sale_seller', lang)}</label>
            <Combobox
              options={memberOptions}
              value={sellerId}
              onChange={setSellerId}
              placeholder={t('sale_select', lang)}
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-app-border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-app-text">{t('sale_wines', lang)}</h2>

        {items.map((item, i) => {
          const wine = wines.find((w) => w.id === item.wine_id)
          const lineTotal = item.quantity * item.sale_price
          return (
            <div key={i} className="space-y-2">
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end md:grid-cols-[1fr_100px_100px_140px_auto] md:gap-3">
                <div>
                  <label className={lbl}>{t('sale_wine', lang)} *</label>
                  <select
                    className={inp}
                    value={item.wine_id}
                    onChange={(e) => updateItem(i, 'wine_id', e.target.value)}
                  >
                    <option value="">{t('sale_select', lang)}</option>
                    {wines.map((w) => {
                      const cxDisp = w.bottles_per_case ? Math.floor(w.stock / w.bottles_per_case) : 0
                      return (
                        <option key={w.id} value={w.id} disabled={w.stock === 0}>
                          {w.name}{w.vintage ? ` ${w.vintage}` : ''} — {w.stock} {lang === 'pt' ? 'garr.' : 'bot.'} ({cxDisp} {lang === 'pt' ? 'cx' : 'cj'})
                        </option>
                      )
                    })}
                  </select>
                </div>
                {/* Remove button — mobile only, appears next to wine selector */}
                <div className="md:hidden pb-0.5">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-red-200 text-red-400 hover:bg-red-50 text-lg">
                      ×
                    </button>
                  )}
                </div>
                <div className="hidden md:block">
                  <label className={lbl}>{lang === 'pt' ? 'Unidade' : 'Unidad'}</label>
                  <select
                    className={inp}
                    value={item.unit}
                    onChange={(e) => updateItem(i, 'unit', e.target.value)}
                  >
                    <option value="botella">{lang === 'pt' ? 'Garrafa' : 'Botella'}</option>
                    <option value="caja">{lang === 'pt' ? 'Caixa' : 'Caja'}</option>
                  </select>
                </div>
                <div className="hidden md:block">
                  <label className={lbl}>{lang === 'pt' ? `Cant. (${item.unit === 'botella' ? 'bot.' : 'cx'})` : `Cant. (${item.unit === 'botella' ? 'bot.' : 'cj'})`} *</label>
                  <input
                    type="number" min={1} max={item.unit === 'botella' ? wine?.stock ?? 999 : (wine?.bottles_per_case ? Math.floor(wine.stock / wine.bottles_per_case) : 999)} className={inp}
                    value={item.quantity}
                    onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                  />
                </div>
                <div className="hidden md:block">
                  <label className={lbl}>{lang === 'pt' ? `Preço (/${item.unit === 'botella' ? 'bot.' : 'cx'})` : `Precio (/${item.unit === 'botella' ? 'bot.' : 'cj'})`}</label>
                  <input
                    type="number" min={0} step="0.01" className={inp}
                    value={item.sale_price || ''}
                    placeholder="0.00"
                    onChange={(e) => updateItem(i, 'sale_price', Number(e.target.value))}
                  />
                </div>
                {/* Remove button — desktop */}
                <div className="hidden md:flex pb-0.5">
                  {items.length > 1 ? (
                    <button type="button" onClick={() => removeItem(i)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-red-200 text-red-400 hover:bg-red-50 text-lg">
                      ×
                    </button>
                  ) : <div className="w-9" />}
                </div>
              </div>

              {/* Mobile: unit + qty + price */}
              <div className="grid grid-cols-3 gap-2 md:hidden">
                <div>
                  <label className={lbl + ' text-xs'}>{lang === 'pt' ? 'Unidade' : 'Unidad'}</label>
                  <select
                    className={inp}
                    value={item.unit}
                    onChange={(e) => updateItem(i, 'unit', e.target.value)}
                  >
                    <option value="botella">{lang === 'pt' ? 'Gar' : 'Bot'}</option>
                    <option value="caja">{lang === 'pt' ? 'Cai' : 'Caj'}</option>
                  </select>
                </div>
                <div>
                  <label className={lbl + ' text-xs'}>{lang === 'pt' ? `Qtd.${item.unit === 'botella' ? '(gar)' : '(cx)'}` : `Cant.${item.unit === 'botella' ? '(bot)' : '(cj)'}`} *</label>
                  <input
                    type="number" min={1} max={item.unit === 'botella' ? wine?.stock ?? 999 : (wine?.bottles_per_case ? Math.floor(wine.stock / wine.bottles_per_case) : 999)} className={inp}
                    value={item.quantity}
                    onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={lbl + ' text-xs'}>{lang === 'pt' ? `P(/${item.unit === 'botella' ? 'gar' : 'cx'})` : `P(/${item.unit === 'botella' ? 'bot' : 'cj'})`}</label>
                  <input
                    type="number" min={0} step="0.01" className={inp}
                    value={item.sale_price || ''}
                    placeholder="0.00"
                    onChange={(e) => updateItem(i, 'sale_price', Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Subtotal per line */}
              <div className="flex items-center justify-between bg-app-bg rounded-xl px-3 py-2">
                <span className="text-xs text-app-text3">
                  {item.quantity} {item.unit === 'botella' ? (lang === 'pt' ? 'garr.' : 'bot.') : (lang === 'pt' ? 'cx' : 'cj')} × {fmt(item.sale_price)}/{item.unit === 'botella' ? (lang === 'pt' ? 'garr.' : 'bot.') : (lang === 'pt' ? 'cx' : 'cj')}
                </span>
                <span className="text-sm font-mono font-bold text-app-text tabular-nums">
                  {fmt(lineTotal)}
                </span>
              </div>
            </div>
          )
        })}

        <button type="button" onClick={addItem}
          className="flex items-center gap-1.5 text-xs font-semibold text-wine-600 hover:text-wine-700 transition-colors">
          <span className="text-base leading-none">+</span>
          {lang === 'pt' ? 'Adicionar vinho' : 'Añadir vino'}
        </button>

        <div className="flex items-center justify-between border-t-2 border-app-border pt-3 mt-2">
          <span className="text-xs text-app-text3">
            {items.filter(i => i.wine_id).length} {lang === 'pt' ? 'produto(s)' : 'producto(s)'} · {items.reduce((s, i) => s + i.quantity, 0)} {lang === 'pt' ? 'garrafas' : 'botellas'}
          </span>
          <div className="text-right">
            <div className="text-xs text-app-text3 mb-0.5">{t('sale_total', lang)}</div>
            <div className="text-xl font-mono font-bold text-wine-600 tabular-nums">{fmt(total)}</div>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div data-tour="sales-form" className="bg-white rounded-2xl border border-app-border p-5 space-y-4">
        <h2 className="text-sm font-semibold text-app-text">{t('sale_payment', lang)}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>{t('sale_type', lang)}</label>
            <Combobox
              options={paymentTypeOpts}
              value={paymentType}
              onChange={setPaymentType}
              placeholder={t('sale_select', lang)}
              createLabel={lang === 'pt' ? 'Novo tipo' : 'Nuevo tipo'}
              onCreateOption={addPayType}
              onDeleteOption={delPayType}
              onEditOption={editPayType}
            />
          </div>
          <div>
            <label className={lbl}>{t('sale_term', lang)}</label>
            <Combobox
              options={paymentTermOpts}
              value={paymentTerm}
              onChange={setPaymentTerm}
              placeholder={t('sale_select', lang)}
              createLabel={lang === 'pt' ? 'Novo prazo' : 'Nuevo plazo'}
              onCreateOption={addPayTerm}
              onDeleteOption={delPayTerm}
              onEditOption={editPayTerm}
            />
          </div>
          <div>
            <label className={lbl}>{t('sale_category', lang)}</label>
            <Combobox
              options={paymentCategoryOpts}
              value={paymentCategory}
              onChange={setPaymentCategory}
              placeholder={lang === 'pt' ? 'Selecionar…' : 'Seleccionar…'}
              createLabel={lang === 'pt' ? 'Nova categoria' : 'Nueva categoría'}
              onCreateOption={addPayCat}
              onDeleteOption={delPayCat}
              onEditOption={editPayCat}
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className={lbl}>{lang === 'pt' ? 'Transportadora' : 'Transportista'} <span className="font-normal text-app-text3">{lang === 'pt' ? '— opcional' : '— opcional'}</span></label>
            <Combobox
              options={carrierOpts}
              value={carrier}
              onChange={setCarrier}
              placeholder={lang === 'pt' ? 'Selecionar ou criar…' : 'Seleccionar o crear…'}
              createLabel={lang === 'pt' ? 'Nova transportadora' : 'Nuevo transportista'}
              onCreateOption={addCarrier}
              onDeleteOption={delCarrier}
              onEditOption={editCarrier}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-app-border p-5">
        <label className={lbl}>{t('sale_notes', lang)}</label>
        <textarea
          className={`${inp} resize-none`} rows={2}
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder={t('sale_notes_ph', lang)}
        />
      </div>

      {result?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{result.error}</div>
      )}
      {result?.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">
          {t('sale_success', lang)}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !clientId}
        className="w-full bg-wine-600 hover:bg-wine-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
      >
        {submitting ? t('sale_submitting', lang) : t('sale_submit', lang)}
      </button>
    </form>
  )
}
