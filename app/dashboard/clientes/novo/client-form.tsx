'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient_, addClientType, createSeller } from './actions'
import Combobox from '@/components/combobox'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { useCityOptions } from '@/lib/use-city-options'

const getClientTypes = (lang: Lang) => [
  { value: 'wine_shop',    label: 'Loja de Vinho' },
  { value: 'bar',          label: 'Bar' },
  { value: 'wine_bar',     label: 'Wine Bar' },
  { value: 'restaurant',   label: 'Restaurante' },
  { value: 'supermarket',  label: 'Supermercado' },
  { value: 'emporio',      label: lang === 'pt' ? 'Empório' : 'Emporio' },
  { value: 'consumidor',   label: 'Consumidor' },
  { value: 'distributor',  label: 'Distribuidor' },
  { value: 'market_place', label: 'Market Place' },
]

type Member = { id: string; name: string }

export default function ClientForm({ lang, members: initialMembers, existingCities }: { lang: Lang; members: Member[]; existingCities: string[] }) {
  const router = useRouter()

  const { opts: cityOptions, addOption: addCity, deleteOption: deleteCity, editOption: editCityOpt } = useCityOptions(existingCities)

  // Dynamic option lists — grow/shrink as user creates or deletes entries
  const [typeOptions, setTypeOptions] = useState(() => getClientTypes(lang))

  async function handleCreateType(label: string): Promise<{ value: string; label: string } | void> {
    const res = await addClientType(label)
    if (res.value && res.label) {
      const opt = { value: res.value, label: res.label }
      setTypeOptions(prev => [...prev, opt])
      return opt
    }
  }

  function handleDeleteType(value: string) {
    setTypeOptions(prev => prev.filter(o => o.value !== value))
    if (clientType === value) setClientType('')
  }

  function handleEditType(value: string, newLabel: string) {
    setTypeOptions(prev => prev.map(o => o.value === value ? { value: o.value, label: newLabel } : o))
  }

  function handleEditCity(oldValue: string, newLabel: string) {
    const newValue = editCityOpt(oldValue, newLabel)
    if (city === oldValue && newValue) setCity(newValue)
  }

  // Form fields
  const [name,          setName]          = useState('')
  const [email,         setEmail]         = useState('')
  const [city,          setCity]          = useState('')
  const [phone,         setPhone]         = useState('')
  const [clientType,    setClientType]    = useState('')
  const [responsibleId, setResponsibleId] = useState('')
  const [isProspect,    setIsProspect]    = useState(false)
  const [notes,         setNotes]         = useState('')
  const [saving,        setSaving]        = useState(false)
  const [result,        setResult]        = useState<{ success?: boolean; error?: string } | null>(null)

  // Seller list — local copy so we can add/remove without a page reload
  const [localMembers,    setLocalMembers]    = useState<Member[]>(initialMembers)
  const [showAddSeller,   setShowAddSeller]   = useState(false)
  const [newSellerName,   setNewSellerName]   = useState('')
  const [addingSeller,    setAddingSeller]    = useState(false)
  const [sellerError,     setSellerError]     = useState('')

  const memberOptions = localMembers.map((m) => ({ value: m.id, label: m.name }))

  function handleDeleteSeller(id: string) {
    setLocalMembers(prev => prev.filter(m => m.id !== id))
    if (responsibleId === id) setResponsibleId('')
  }

  function handleEditSeller(id: string, newLabel: string) {
    setLocalMembers(prev => prev.map(m => m.id === id ? { id: m.id, name: newLabel } : m))
  }

  async function handleAddSeller() {
    if (!newSellerName.trim()) return
    setAddingSeller(true)
    setSellerError('')
    const res = await createSeller(newSellerName.trim())
    if (res.id) {
      const newMember = { id: res.id, name: newSellerName.trim() }
      setLocalMembers((prev) => [...prev, newMember])
      setResponsibleId(res.id)
      setNewSellerName('')
      setShowAddSeller(false)
    } else {
      setSellerError(res.error ?? 'Erro ao criar vendedor.')
    }
    setAddingSeller(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setResult(null)
    const res = await createClient_({
      name, email, city, phone,
      client_type: clientType,
      responsible_id: responsibleId,
      is_prospect: isProspect,
      notes,
    })
    setResult(res)
    if (res.success) {
      setTimeout(() => router.push('/dashboard/clientes'), 1200)
    }
    setSaving(false)
  }

  const inp = 'w-full px-3 py-2.5 rounded-xl border border-app-border bg-white text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-wine-500 placeholder:text-app-text3'
  const lbl = 'block text-xs font-semibold text-app-text2 mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white rounded-2xl border border-app-border p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>{t('cl_name', lang)} *</label>
            <input
              type="text" required className={inp}
              placeholder={lang === 'pt' ? 'Nome do estabelecimento' : 'Nombre del establecimiento'}
              value={name} onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input
              type="email" className={inp}
              placeholder="contato@estabelecimento.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className={lbl}>{t('cl_phone', lang)}</label>
            <input
              type="tel" className={inp}
              placeholder="+55 11 9 9999-9999"
              value={phone} onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Cidade' : 'Ciudad'} <span className="font-normal text-app-text3">{lang === 'pt' ? '— digita para criar nova' : '— escribe para crear nueva'}</span></label>
            <Combobox
              options={cityOptions}
              value={city}
              onChange={setCity}
              placeholder={lang === 'pt' ? 'Selecionar ou criar…' : 'Seleccionar o crear…'}
              createLabel={lang === 'pt' ? 'Nova cidade' : 'Nueva ciudad'}
              onCreateOption={addCity}
              onDeleteOption={deleteCity}
              onEditOption={handleEditCity}
            />
          </div>

          <div>
            <label className={lbl}>{t('cl_type', lang)} <span className="font-normal text-app-text3">{lang === 'pt' ? '— digita para criar novo' : '— escribe para crear nuevo'}</span></label>
            <Combobox
              options={typeOptions}
              value={clientType}
              onChange={setClientType}
              placeholder={lang === 'pt' ? 'Selecionar ou criar…' : 'Seleccionar o crear…'}
              createLabel={lang === 'pt' ? 'Novo tipo' : 'Nuevo tipo'}
              onCreateOption={handleCreateType}
              onDeleteOption={handleDeleteType}
              onEditOption={handleEditType}
            />
          </div>

          {/* Vendedor — con botón "+" para crear inline */}
          <div>
            <label className={lbl}>{t('cl_salesperson', lang)}</label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Combobox
                  options={memberOptions}
                  value={responsibleId}
                  onChange={setResponsibleId}
                  placeholder={t('sale_select', lang)}
                />
              </div>
              <button
                type="button"
                onClick={() => { setShowAddSeller(!showAddSeller); setSellerError('') }}
                title={lang === 'pt' ? 'Criar vendedor' : 'Crear vendedor'}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-app-border text-wine-600 hover:bg-wine-50 text-lg font-bold flex-shrink-0 transition-colors"
              >
                {showAddSeller ? '✕' : '+'}
              </button>
            </div>

            {showAddSeller && (
              <div className="mt-2 p-3 bg-app-bg rounded-xl border border-app-border space-y-2">
                <p className="text-xs font-semibold text-app-text2">
                  {lang === 'pt' ? 'Novo vendedor' : 'Nuevo vendedor'}
                </p>
                <input
                  type="text" className={inp}
                  placeholder={lang === 'pt' ? 'Nome completo' : 'Nombre completo'}
                  value={newSellerName} onChange={(e) => setNewSellerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSeller())}
                />
                {sellerError && <p className="text-xs text-red-500">{sellerError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddSeller}
                    disabled={addingSeller || !newSellerName.trim()}
                    className="flex-1 bg-wine-600 hover:bg-wine-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                  >
                    {addingSeller
                      ? (lang === 'pt' ? 'Criando…' : 'Creando…')
                      : (lang === 'pt' ? 'Criar vendedor' : 'Crear vendedor')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddSeller(false); setNewSellerName(''); setSellerError('') }}
                    className="px-3 py-2 text-xs text-app-text3 hover:text-app-text rounded-lg border border-app-border transition-colors"
                  >
                    {lang === 'pt' ? 'Cancelar' : 'Cancelar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className={lbl}>{t('cl_notes', lang)}</label>
          <textarea
            className={`${inp} resize-none`} rows={2}
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={lang === 'pt' ? 'Horário de contato, preferências…' : 'Horario de contacto, preferencias…'}
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setIsProspect(!isProspect)}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${isProspect ? 'bg-gold-600' : 'bg-app-border'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isProspect ? 'translate-x-6' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm text-app-text2">{t('cl_is_prospect', lang)}</span>
        </label>
      </div>

      {result?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{result.error}</div>
      )}
      {result?.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">{t('cl_saved', lang)}</div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl border border-app-border text-sm text-app-text2 hover:bg-white transition-colors"
        >
          {t('back', lang)}
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 bg-wine-600 hover:bg-wine-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? t('cl_saving', lang) : t('cl_save', lang)}
        </button>
      </div>
    </form>
  )
}
