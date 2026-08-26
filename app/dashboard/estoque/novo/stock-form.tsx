'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { addStockEntry, createWinery, updateFullEntry } from './actions'
import Combobox from '@/components/combobox'
import { useLocalOptions } from '@/lib/use-local-options'
import { useStringOptions } from '@/lib/use-city-options'
import { createClient } from '@/lib/supabase/client'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'

const DEFAULT_WINE_TYPES = [
  { value: 'tinto',     label: 'Tinto' },
  { value: 'branco',    label: 'Branco' },
  { value: 'rose',      label: 'Rosé' },
  { value: 'espumante', label: 'Espumante' },
  { value: 'laranja',   label: 'Laranja' },
  { value: 'outro',     label: 'Outro' },
]

const DEFAULT_STORAGE = [
  { value: 'casa_paulo', label: 'Casa Paulo' },
  { value: 'casa_otto',  label: 'Casa Otto' },
]

const DEFAULT_COUNTRIES = ['África do Sul', 'Alemanha', 'Argentina', 'Austrália', 'Brasil', 'Chile', 'Espanha', 'Estados Unidos', 'França', 'Itália', 'Nova Zelândia', 'Portugal', 'Uruguai']

type InitialValues = {
  entryId: string; wineId: string; wineName: string; vintage: string; wineType: string
  sku: string; wineryId: string; grape: string; country: string; region: string
  volumeMl: string; bottlesPerCase: string; consumerPrice: string; characteristics: string
  imageUrl: string | null; qtyRemaining: string; purchasePrice: string; listPrice: string
  storage: string; purchaseDate: string; notes: string; minStock: string
}

export default function StockForm({
  lang,
  existingCountries = [],
  existingGrapes    = [],
  existingRegions   = [],
  wineries = [],
  initialValues,
}: {
  lang: Lang
  existingCountries?: string[]
  existingGrapes?:    string[]
  existingRegions?:   string[]
  wineries?: { id: string; name: string }[]
  initialValues?: InitialValues
}) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const imgRef = useRef<HTMLInputElement>(null)

  const { opts: wineTypes,    addOption: addWineType,    deleteOption: delWineType,    editOption: editWineType   } = useLocalOptions('wine_type',        DEFAULT_WINE_TYPES)
  const { opts: storageOpts,  addOption: addStorage,     deleteOption: delStorage,     editOption: editStorage    } = useLocalOptions('storage_location',  DEFAULT_STORAGE)
  const { opts: countryOpts,  addOption: addCountry,     deleteOption: delCountry,     editOption: editCountryOpt } = useStringOptions(
    [
      ...DEFAULT_COUNTRIES,
      ...existingCountries.filter(c => !DEFAULT_COUNTRIES.some(d => d.toLowerCase() === c.toLowerCase())),
    ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  )
  const { opts: grapeOpts,    addOption: addGrape,       deleteOption: delGrape,       editOption: editGrapeOpt   } = useStringOptions(existingGrapes)
  const { opts: regionOpts,   addOption: addRegion,      deleteOption: delRegion,      editOption: editRegionOpt  } = useStringOptions(existingRegions)

  const isEdit = !!initialValues

  const [wineryOpts, setWineryOpts] = useState(() => wineries.map(w => ({ value: w.id, label: w.name })))

  // Wine metadata
  const [wineName,        setWineName]        = useState(initialValues?.wineName ?? '')
  const [vintage,         setVintage]         = useState(initialValues?.vintage ?? '')
  const [wineType,        setWineType]        = useState(initialValues?.wineType ?? '')
  const [sku,             setSku]             = useState(initialValues?.sku ?? '')
  const [wineryId,        setWineryId]        = useState(initialValues?.wineryId ?? '')
  const [grape,           setGrape]           = useState(initialValues?.grape ?? '')
  const [country,         setCountry]         = useState(initialValues?.country ?? '')
  const [region,          setRegion]          = useState(initialValues?.region ?? '')
  const [volumeMl,        setVolumeMl]        = useState(initialValues?.volumeMl ?? '')
  const [bottlesPerCase,  setBottlesPerCase]  = useState(initialValues?.bottlesPerCase ?? '')
  const [consumerPrice,   setConsumerPrice]   = useState(initialValues?.consumerPrice ?? '')
  const [characteristics, setCharacteristics] = useState(initialValues?.characteristics ?? '')

  // Image upload
  const [imageUrl,   setImageUrl]   = useState<string | null>(initialValues?.imageUrl ?? null)
  const [imgPreview, setImgPreview] = useState<string | null>(initialValues?.imageUrl ?? null)
  const [uploading,  setUploading]  = useState(false)
  const [uploadErr,  setUploadErr]  = useState('')

  // Stock entry — qty stored as CAJAS (converted to bottles on submit)
  const [qty,           setQty]           = useState(() => {
    if (!initialValues) return ''
    const bpc = parseInt(initialValues.bottlesPerCase) || 1
    return String(Math.floor(parseInt(initialValues.qtyRemaining) / bpc))
  })
  const [purchasePrice, setPurchasePrice] = useState(initialValues?.purchasePrice ?? '')
  const [listPrice,     setListPrice]     = useState(initialValues?.listPrice ?? '')
  const [minStock,      setMinStock]      = useState(initialValues?.minStock ?? '')
  const [storage,       setStorage]       = useState(initialValues?.storage ?? '')
  const [purchaseDate,  setPurchaseDate]  = useState(initialValues?.purchaseDate ?? today)
  const [notes,         setNotes]         = useState(initialValues?.notes ?? '')
  const [saving,        setSaving]        = useState(false)
  const [result,        setResult]        = useState<{ success?: boolean; error?: string } | null>(null)

  async function handleImage(file: File) {
    setUploading(true)
    setUploadErr('')
    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = (e) => setImgPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { data, error } = await supabase.storage.from('wine-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error || !data) {
      setUploadErr(lang === 'pt' ? 'Erro ao enviar imagem.' : 'Error al subir imagen.')
    } else {
      const { data: { publicUrl } } = supabase.storage.from('wine-images').getPublicUrl(data.path)
      setImageUrl(publicUrl)
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!wineName.trim() || !qty || !purchasePrice) return
    setSaving(true)
    setResult(null)
    const qtyNum = parseInt(qty) || 0
    const bpcNum = parseInt(bottlesPerCase) || 0
    const totalBottles = String(bpcNum > 0 ? qtyNum * bpcNum : qtyNum)
    let res: { success?: boolean; error?: string }
    if (isEdit && initialValues) {
      res = await updateFullEntry(initialValues.entryId, initialValues.wineId, {
        wine_name: wineName, vintage, wine_type: wineType || 'tinto', sku,
        winery_id: wineryId || undefined, grape, country, region,
        volume_ml: volumeMl, bottles_per_case: bottlesPerCase,
        characteristics,
        qty_remaining: totalBottles, purchase_price: purchasePrice, list_price: listPrice,
        storage_location: storage || 'casa_paulo', purchase_date: purchaseDate,
        notes, min_stock: minStock, image_url: imageUrl ?? undefined,
      })
    } else {
      res = await addStockEntry({
        wine_name: wineName, vintage, wine_type: wineType || 'tinto', sku,
        winery_id: wineryId || undefined, grape, country, region,
        volume_ml: volumeMl, bottles_per_case: bottlesPerCase,
        characteristics,
        qty: totalBottles, purchase_price: purchasePrice, list_price: listPrice,
        storage_location: storage || 'casa_paulo', purchase_date: purchaseDate,
        notes, min_stock: minStock, image_url: imageUrl || undefined,
      })
    }
    setResult(res)
    if (res.success) setTimeout(() => router.push('/dashboard/estoque'), 1200)
    setSaving(false)
  }

  const inp = 'w-full px-3 py-2.5 rounded-xl border border-app-border bg-white text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-wine-500 placeholder:text-app-text3'
  const lbl = 'block text-xs font-semibold text-app-text2 mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Wine section */}
      <div className="bg-white rounded-2xl border border-app-border p-5 space-y-4">
        <h2 className="text-sm font-bold text-app-text">{t('st_wine_section', lang)}</h2>

        {/* Image upload */}
        <div>
          <label className={lbl}>{lang === 'pt' ? 'Foto do vinho' : 'Foto del vino'}</label>
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => imgRef.current?.click()}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-app-border hover:border-wine-400 bg-app-bg hover:bg-wine-50 flex flex-col items-center justify-center gap-1.5 transition-colors flex-shrink-0 relative overflow-hidden"
            >
              {imgPreview ? (
                <img src={imgPreview} className="absolute inset-0 w-full h-full object-cover rounded-xl" alt="" />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-app-text3">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="text-[11px] text-app-text3 text-center leading-tight">
                    {lang === 'pt' ? 'Criar\nfoto' : 'Crear\nfoto'}
                  </span>
                </>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                  <svg className="animate-spin text-white" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                </div>
              )}
            </button>
            <div className="flex flex-col gap-2 pt-1">
              {imageUrl && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {lang === 'pt' ? 'Imagem enviada' : 'Imagen subida'}
                </span>
              )}
              {uploadErr && <span className="text-xs text-red-500">{uploadErr}</span>}
              {imgPreview && (
                <button type="button" onClick={() => { setImageUrl(null); setImgPreview(null) }}
                  className="text-xs text-app-text3 hover:text-red-500 transition-colors text-left">
                  {lang === 'pt' ? 'Remover foto' : 'Quitar foto'}
                </button>
              )}
              <span className="text-[11px] text-app-text3">JPG, PNG, WebP · máx. 5 MB</span>
            </div>
          </div>
          <input
            ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f); e.target.value = '' }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={lbl}>{t('st_wine_name', lang)} *</label>
            <input
              type="text" required className={inp}
              placeholder={lang === 'pt' ? 'Ex: Piedras de Auque Malbec' : 'Ej: Piedras de Auque Malbec'}
              value={wineName} onChange={(e) => setWineName(e.target.value)}
            />
          </div>
          <div>
            <label className={lbl}>SKU</label>
            <input type="text" className={inp} placeholder="10.005" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Produtor / Bodega' : 'Productor / Bodega'}</label>
            <Combobox
              options={wineryOpts}
              value={wineryId}
              onChange={setWineryId}
              placeholder={lang === 'pt' ? 'Selecionar ou criar produtor…' : 'Seleccionar o crear productor…'}
              createLabel={lang === 'pt' ? 'Novo Produtor' : 'Nuevo Productor'}
              emptyLabel={lang === 'pt' ? 'Nenhum produtor ainda' : 'Sin productores aún'}
              onCreateOption={async (label) => {
                const created = await createWinery(label)
                if (!created) return
                const newOpt = { value: created.id, label: created.name }
                setWineryOpts(prev => [...prev, newOpt])
                return newOpt
              }}
            />
          </div>
          <div>
            <label className={lbl}>{t('st_vintage', lang)}</label>
            <input type="number" className={inp} placeholder="2022" min="1900" max="2099" value={vintage} onChange={(e) => setVintage(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>{t('st_wine_type', lang)}</label>
            <Combobox
              options={wineTypes}
              value={wineType}
              onChange={setWineType}
              placeholder={lang === 'pt' ? 'Selecionar ou criar…' : 'Seleccionar o crear…'}
              onCreateOption={addWineType}
              onDeleteOption={delWineType}
              onEditOption={editWineType}
            />
          </div>
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Uva' : 'Uva'}</label>
            <Combobox
              options={grapeOpts}
              value={grape}
              onChange={setGrape}
              placeholder={lang === 'pt' ? 'Selecionar ou criar uva…' : 'Seleccionar o crear uva…'}
              createLabel={lang === 'pt' ? 'Nova uva' : 'Nueva uva'}
              onCreateOption={addGrape}
              onDeleteOption={delGrape}
              onEditOption={(oldVal, newLabel) => {
                const newVal = editGrapeOpt(oldVal, newLabel)
                if (grape === oldVal && newVal) setGrape(newVal)
              }}
            />
          </div>
          <div>
            <label className={lbl}>{lang === 'pt' ? 'País' : 'País'}</label>
            <Combobox
              options={countryOpts}
              value={country}
              onChange={setCountry}
              placeholder={lang === 'pt' ? 'Selecionar ou digitar país…' : 'Seleccionar o escribir país…'}
              createLabel={lang === 'pt' ? 'Novo país' : 'Nuevo país'}
              onCreateOption={addCountry}
              onDeleteOption={delCountry}
              onEditOption={(oldVal, newLabel) => {
                const newVal = editCountryOpt(oldVal, newLabel)
                if (country === oldVal && newVal) setCountry(newVal)
              }}
            />
          </div>
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Região' : 'Región'}</label>
            <Combobox
              options={regionOpts}
              value={region}
              onChange={setRegion}
              placeholder={lang === 'pt' ? 'Selecionar ou criar região…' : 'Seleccionar o crear región…'}
              createLabel={lang === 'pt' ? 'Nova região' : 'Nueva región'}
              onCreateOption={addRegion}
              onDeleteOption={delRegion}
              onEditOption={(oldVal, newLabel) => {
                const newVal = editRegionOpt(oldVal, newLabel)
                if (region === oldVal && newVal) setRegion(newVal)
              }}
            />
          </div>
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Volume (ml)' : 'Volumen (ml)'}</label>
            <input type="number" className={inp} placeholder="750" min="1" value={volumeMl} onChange={(e) => setVolumeMl(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className={lbl}>{lang === 'pt' ? 'Características / Barrica' : 'Características / Barrica'}</label>
            <input type="text" className={inp}
              placeholder={lang === 'pt' ? 'Ex: 12 meses em barrica de carvalho francês…' : 'Ej: 12 meses en barrica de roble francés…'}
              value={characteristics} onChange={(e) => setCharacteristics(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stock entry section */}
      <div className="bg-white rounded-2xl border border-app-border p-5 space-y-4">
        <h2 className="text-sm font-bold text-app-text">{t('st_stock_section', lang)}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Row 1: Caixas | Bot./caja | Total botellas */}
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Caixas *' : 'Cajas *'}</label>
            <input type="number" required className={inp} placeholder="7" min="0"
              value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Garrafas/caixa' : 'Botellas/caja'}</label>
            <input type="number" className={inp} placeholder="6" min="1"
              value={bottlesPerCase} onChange={(e) => setBottlesPerCase(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Total garrafas' : 'Total botellas'}</label>
            <input type="number" readOnly className={`${inp} bg-app-bg cursor-not-allowed opacity-60`}
              value={(() => { const q = parseInt(qty) || 0; const b = parseInt(bottlesPerCase) || 0; return b > 0 ? q * b : q })()} />
          </div>
          {/* Row 2: P. Compra | P. Venda | P. Consumidor */}
          <div>
            <label className={lbl}>{t('st_purchase_price', lang)} *</label>
            <input type="number" required className={inp} placeholder="45.00" min="0" step="0.01"
              value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>{t('st_list_price', lang)}</label>
            <input type="number" className={inp} placeholder="85.00" min="0" step="0.01"
              value={listPrice} onChange={(e) => setListPrice(e.target.value)} />
          </div>
          <div />
          {/* Row 3: Estoque | Data | Alerta mínimo */}
          <div>
            <label className={lbl}>{t('st_storage', lang)}</label>
            <Combobox
              options={storageOpts}
              value={storage}
              onChange={setStorage}
              placeholder={lang === 'pt' ? 'Selecionar…' : 'Seleccionar…'}
              onCreateOption={addStorage}
              onDeleteOption={delStorage}
              onEditOption={editStorage}
            />
          </div>
          <div>
            <label className={lbl}>{t('st_purchase_date', lang)}</label>
            <input type="date" className={inp} value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>{lang === 'pt' ? 'Alerta mínimo (cx.)' : 'Alerta mínimo (cj.)'}</label>
            <input type="number" className={inp} placeholder="2" min="0"
              value={minStock} onChange={(e) => setMinStock(e.target.value)} />
          </div>
          {/* Row 4: Notas */}
          <div className="md:col-span-3">
            <label className={lbl}>{lang === 'pt' ? 'Observações' : 'Observaciones'}</label>
            <input type="text" className={inp}
              placeholder={lang === 'pt' ? 'Notas da entrada…' : 'Notas de la entrada…'}
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      {result?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{result.error}</div>
      )}
      {result?.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3">{t('st_saved', lang)}</div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 rounded-xl border border-app-border text-sm text-app-text2 hover:bg-white transition-colors">
          {t('back', lang)}
        </button>
        <button
          type="submit"
          disabled={saving || !wineName.trim() || !qty || !purchasePrice || uploading}
          className="flex-1 bg-wine-600 hover:bg-wine-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? t('st_saving', lang) : uploading ? (lang === 'pt' ? 'Enviando imagem…' : 'Subiendo imagen…') : isEdit ? (lang === 'pt' ? 'Salvar alterações' : 'Guardar cambios') : t('st_save', lang)}
        </button>
      </div>
    </form>
  )
}
