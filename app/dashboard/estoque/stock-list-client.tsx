'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Lang } from '@/lib/i18n'
import { getAllWinePhotos, setWinePhoto } from '@/lib/wine-photos'
import { deleteStockEntry, addRestockEntry, getStockEntryDependencies } from './actions'
import { updateFullEntry } from './novo/actions'

function useWinePhotos(): Record<string, string> {
  const [photos, setPhotos] = useState<Record<string, string>>({})
  useEffect(() => {
    function load() { setPhotos(getAllWinePhotos()) }
    load()
    window.addEventListener('wine:photos-changed', load)
    return () => window.removeEventListener('wine:photos-changed', load)
  }, [])
  return photos
}

const WineGlassIcon = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 22h8M12 11v11M5 3h14l-1.68 8.39A4 4 0 0 1 13.4 15h-2.8a4 4 0 0 1-3.92-3.61Z"/>
  </svg>
)

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

function WinePhotoButton({ wineId, photo, size = 'sm', fallback }: {
  wineId: string
  photo?: string
  size?: 'sm' | 'lg'
  fallback?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const dim = size === 'lg' ? 'w-14 h-14' : 'w-9 h-9'
  const iconSize = size === 'lg' ? 22 : 16

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result as string
      setWinePhoto(wineId, data)
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <button
        type="button"
        title={photo ? 'Cambiar foto' : 'Crear foto'}
        onClick={() => ref.current?.click()}
        className={`${dim} rounded-xl overflow-hidden flex-shrink-0 relative group transition-all`}
      >
        {photo
          ? <img src={photo} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full bg-app-bg text-app-text3 flex items-center justify-center">
              {fallback
                ? <span className="text-base leading-none">{fallback}</span>
                : <WineGlassIcon size={iconSize} />
              }
            </div>
        }
        <div className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
          <EditIcon />
        </div>
      </button>
      <input
        ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
    </>
  )
}

function WinePhotoCover({ wineId, photo, lang }: {
  wineId: string
  photo?: string
  lang: Lang
}) {
  const ref = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result as string
      setWinePhoto(wineId, data)
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="absolute inset-0 group/photo"
      >
        {photo
          ? <img src={photo} className="w-full h-full object-cover" alt="" />
          : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-app-text3">
              <WineGlassIcon size={44} />
              <span className="text-[11px]">{lang === 'pt' ? 'Adicionar foto' : 'Agregar foto'}</span>
            </div>
          )
        }
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity">
          <span className="text-white text-[11px] font-semibold bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg">
            {photo
              ? (lang === 'pt' ? 'Trocar foto' : 'Cambiar foto')
              : (lang === 'pt' ? 'Criar foto' : 'Crear foto')}
          </span>
        </div>
      </button>
      <input
        ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
    </>
  )
}

type WineRow = {
  id: string
  winery_id: string | null
  name: string
  vintage: number | null
  type: string
  sku: string | null
  grape: string | null
  country: string | null
  region: string | null
  volume_ml: number | null
  bottles_per_case: number | null
  characteristics: string | null
  consumer_price: number | null
  min_stock: number | null
  image_url: string | null
  wineries: { name: string } | null
} | null

type StockRow = {
  id: string
  qty_purchased: number
  qty_remaining: number
  purchase_price: number
  list_price: number | null
  storage_location: string
  purchase_date: string
  notes: string | null
  wines: WineRow
}

type TopSeller = {
  wine_id: string
  wine_name: string
  vintage: number | null
  wine_type: string
  total_sold: number
  monthly_sales: number[]
}

function PodiumSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  const W = 110, H = 32
  if (data.every(v => v === 0)) {
    return <div style={{ width: W, height: H }} className="flex items-end pb-1">
      <div className="w-full border-b border-dashed opacity-20" style={{ borderColor: color }} />
    </div>
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

const wineTypeColor: Record<string, string> = {
  tinto:     'bg-red-100 text-red-700',
  branco:    'bg-yellow-100 text-yellow-700',
  rose:      'bg-pink-100 text-pink-700',
  rosé:      'bg-pink-100 text-pink-700',
  espumante: 'bg-blue-100 text-blue-700',
  laranja:   'bg-orange-100 text-orange-700',
  outro:     'bg-gray-100 text-gray-600',
}

const MEDAL = ['🥇', '🥈', '🥉', '4', '5']

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

const inp = 'w-full px-2.5 py-2 rounded-lg border border-app-border bg-white text-app-text text-sm focus:outline-none focus:ring-2 focus:ring-wine-500'
const lbl = 'text-[11px] font-semibold text-app-text2 uppercase tracking-wider block mb-1.5'

export default function StockListClient({
  rows,
  topSellers,
  lang,
  storageLabel,
  wineTypeLabel,
  wineries,
}: {
  rows: StockRow[]
  topSellers: TopSeller[]
  lang: Lang
  storageLabel: Record<string, string>
  wineTypeLabel: Record<string, string>
  wineries: { id: string; name: string }[]
}) {
  const photos = useWinePhotos()
  const router = useRouter()

  // ── View mode ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'board' | 'list'>('list')
  useEffect(() => {
    const stored = localStorage.getItem('estoque-view') as 'board' | 'list' | null
    if (stored === 'list') setViewMode('list')
    // 'board' stored value no longer overrides the default
  }, [])
  function switchView(v: 'board' | 'list') {
    setViewMode(v)
    localStorage.setItem('estoque-view', v)
  }

  // ── Edit modal ─────────────────────────────────────────────────────────────
  const [editModalEntry, setEditModalEntry] = useState<StockRow | null>(null)
  const [mSaving,   setMSaving]   = useState(false)
  const [mError,    setMError]    = useState<string | null>(null)
  const [mSuccess,  setMSuccess]  = useState(false)

  const [mName,          setMName]          = useState('')
  const [mVintage,       setMVintage]       = useState('')
  const [mType,          setMType]          = useState('tinto')
  const [mSku,           setMSku]           = useState('')
  const [mWineryId,      setMWineryId]      = useState('')
  const [mGrape,         setMGrape]         = useState('')
  const [mCountry,       setMCountry]       = useState('')
  const [mRegion,        setMRegion]        = useState('')
  const [mVolumeMl,      setMVolumeMl]      = useState('')
  const [mBpc,           setMBpc]           = useState('')
  const [mTotalCaixas,   setMTotalCaixas]   = useState('')
  const [mCharacteristics, setMCharacteristics] = useState('')
  const [mQty,           setMQty]           = useState('')
  const [mPurchasePrice, setMPurchasePrice] = useState('')
  const [mListPrice,     setMListPrice]     = useState('')
  const [mStorage,       setMStorage]       = useState('')
  const [mPurchaseDate,  setMPurchaseDate]  = useState('')
  const [mNotes,         setMNotes]         = useState('')
  const [mMinStock,      setMMinStock]      = useState('')

  // Confirm delete inside modal
  const [mConfirmDelete,   setMConfirmDelete]   = useState(false)
  const [mDeleting,        setMDeleting]         = useState(false)
  const [mDeleteOrderCount, setMDeleteOrderCount] = useState(0)

  function openEditModal(entry: StockRow) {
    const wine = entry.wines
    setEditModalEntry(entry)
    setMName(wine?.name ?? '')
    setMVintage(wine?.vintage != null ? String(wine.vintage) : '')
    setMType(wine?.type ?? 'tinto')
    setMSku(wine?.sku ?? '')
    setMWineryId(wine?.winery_id ?? '')
    setMGrape(wine?.grape ?? '')
    setMCountry(wine?.country ?? '')
    setMRegion(wine?.region ?? '')
    setMVolumeMl(wine?.volume_ml != null ? String(wine.volume_ml) : '')
    setMBpc(wine?.bottles_per_case != null ? String(wine.bottles_per_case) : '')
    setMTotalCaixas(wine?.bottles_per_case ? String(Math.floor(entry.qty_purchased / wine.bottles_per_case)) : String(entry.qty_purchased))
    setMCharacteristics(wine?.characteristics ?? '')
    setMQty(String(entry.qty_remaining))
    setMPurchasePrice(String(entry.purchase_price))
    setMListPrice(entry.list_price != null ? String(entry.list_price) : '')
    setMStorage(entry.storage_location)
    setMPurchaseDate(entry.purchase_date)
    setMNotes(entry.notes ?? '')
    setMMinStock(wine?.min_stock != null ? String(wine.min_stock) : '')
    setMError(null)
    setMSuccess(false)
    setMConfirmDelete(false)
  }

  function closeEditModal() {
    setEditModalEntry(null)
    setMConfirmDelete(false)
  }

  async function handleModalSave() {
    if (!editModalEntry?.wines) return

    const qtyAvailable = parseInt(mQty) || 0
    if (qtyAvailable > editModalEntry.qty_purchased) {
      setMError(lang === 'pt' ? 'Garrafas disponíveis não podem ser maiores que garrafas compradas!' : '¡Botellas disponibles no pueden ser mayores que botellas compradas!')
      return
    }

    setMSaving(true)
    setMError(null)
    const result = await updateFullEntry(editModalEntry.id, editModalEntry.wines.id, {
      wine_name:        mName,
      vintage:          mVintage,
      wine_type:        mType,
      sku:              mSku,
      winery_id:        mWineryId || undefined,
      grape:            mGrape,
      country:          mCountry,
      region:           mRegion,
      volume_ml:        mVolumeMl,
      bottles_per_case: mBpc,
      characteristics:  mCharacteristics,
      qty_remaining:    mQty,
      purchase_price:   mPurchasePrice,
      list_price:       mListPrice,
      storage_location: mStorage,
      purchase_date:    mPurchaseDate,
      notes:            mNotes,
      min_stock:        mMinStock,
    })
    setMSaving(false)
    if (result.error) {
      setMError(result.error)
    } else {
      setMSuccess(true)
      router.refresh()
      setTimeout(() => closeEditModal(), 800)
    }
  }

  async function handleModalDelete() {
    if (!editModalEntry) return
    setMDeleting(true)
    setMError(null)
    const result = await deleteStockEntry(editModalEntry.id)
    setMDeleting(false)
    if (result.error) {
      setMError(result.error)
      setMConfirmDelete(false)
    } else {
      router.refresh()
      closeEditModal()
    }
  }

  // ── Restock state ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const [reponingId, setReponingId] = useState<string | null>(null)
  const [repoQty,    setRepoQty]    = useState('')
  const [repoCost,   setRepoCost]   = useState('')
  const [repoList,   setRepoList]   = useState('')
  const [repoLoc,    setRepoLoc]    = useState('')
  const [repoDate,   setRepoDate]   = useState(today)
  const [repoSaving, setRepoSaving] = useState(false)

  function startRestock(entry: StockRow) {
    setReponingId(entry.id)
    setRepoQty('')
    setRepoCost(String(entry.purchase_price))
    setRepoList(entry.list_price ? String(entry.list_price) : '')
    setRepoLoc(entry.storage_location)
    setRepoDate(today)
  }

  async function handleRestock(entryId: string) {
    if (!repoQty || !repoCost) return
    setRepoSaving(true)
    await addRestockEntry(entryId, {
      qty: parseInt(repoQty),
      purchase_price: parseFloat(repoCost),
      list_price: repoList ? parseFloat(repoList) : null,
      storage_location: repoLoc,
      purchase_date: repoDate,
    })
    setRepoSaving(false)
    setReponingId(null)
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,         setSearch]         = useState('')
  const [filterLoc,      setFilterLoc]      = useState('')
  const [filterSafra,    setFilterSafra]    = useState('')
  const [filterType,     setFilterType]     = useState('')
  const [filterProducer, setFilterProducer] = useState('')

  const vintages = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => { if (r.wines?.vintage) s.add(String(r.wines.vintage)) })
    return [...s].sort((a, b) => Number(b) - Number(a))
  }, [rows])

  const locations = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => { if (r.storage_location) s.add(r.storage_location) })
    return [...s].sort()
  }, [rows])

  const types = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => { if (r.wines?.type) s.add(r.wines.type) })
    return [...s].sort()
  }, [rows])

  const producers = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => { if (r.wines?.wineries?.name) s.add(r.wines.wineries.name) })
    return [...s].sort()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const name = `${r.wines?.name ?? ''} ${r.wines?.vintage ?? ''}`.toLowerCase()
      if (search && !name.includes(search.toLowerCase())) return false
      if (filterLoc && r.storage_location !== filterLoc) return false
      if (filterSafra && String(r.wines?.vintage ?? '') !== filterSafra) return false
      if (filterType && r.wines?.type !== filterType) return false
      if (filterProducer && r.wines?.wineries?.name !== filterProducer) return false
      return true
    })
  }, [rows, search, filterLoc, filterSafra, filterType, filterProducer])

  const hasFilters = search || filterLoc || filterSafra || filterType || filterProducer

  const selCls = 'px-3 py-2 rounded-xl border border-app-border bg-white text-app-text text-xs focus:outline-none focus:ring-2 focus:ring-wine-500'

  return (
    <div className="space-y-5">

      {/* Top sellers — podium cards */}
      {topSellers.length > 0 && (() => {
        const RANK_ST = [
          { color: '#F59E0B', borderCls: 'border-yellow-500/40', textCls: 'text-yellow-400', numeral: '①', labelEs: 'MÁS VENDIDO', labelPt: 'MAIS VENDIDO' },
          { color: '#94A3B8', borderCls: 'border-slate-400/30',  textCls: 'text-slate-300',  numeral: '②', labelEs: '2° LUGAR',    labelPt: '2° LUGAR' },
          { color: '#CD7C2F', borderCls: 'border-orange-500/30', textCls: 'text-orange-400', numeral: '③', labelEs: '3° LUGAR',    labelPt: '3° LUGAR' },
        ]
        const top3 = topSellers.slice(0, 3)

        // Join topSeller with stock rows by wine_id
        function getStockData(wineId: string) {
          const entry = rows.find(r => r.wines?.id === wineId)
          if (!entry) return null
          const bpc = entry.wines?.bottles_per_case
          const pbc = bpc ? entry.purchase_price / bpc : entry.purchase_price
          const pbv = entry.list_price ? (bpc ? entry.list_price / bpc : entry.list_price) : null
          const margin = pbv && pbc > 0 ? ((pbv - pbc) / pbc) * 100 : null
          const cxRemaining = bpc ? Math.floor(Math.min(entry.qty_remaining, entry.qty_purchased) / bpc) : null
          return {
            pbc, pbv, margin, cxRemaining,
            qtyRemaining: Math.min(entry.qty_remaining, entry.qty_purchased),
            storage: entry.storage_location,
            imageUrl: entry.wines?.image_url ?? null,
          }
        }

        const totalSold = topSellers.reduce((s, ts) => s + ts.total_sold, 0)

        return (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold tracking-widest uppercase text-app-text3">
                {lang === 'pt' ? 'Mais Vendidos' : 'Más Vendidos'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {top3.map((ts, i) => {
                const cfg = RANK_ST[i]
                const sd = getStockData(ts.wine_id)
                const pct = totalSold > 0 ? Math.round((ts.total_sold / totalSold) * 100) : 0
                const revenue = sd?.pbv ? ts.total_sold * sd.pbv : null
                const lucro   = revenue && sd?.pbc ? revenue - ts.total_sold * sd.pbc : null

                return (
                  <div
                    key={ts.wine_id}
                    className={`rounded-2xl border p-3 flex flex-col gap-2 ${cfg.borderCls}`}
                    style={{ background: '#18181b' }}
                  >
                    {/* Rank label */}
                    <div className={`text-[10px] font-bold tracking-widest flex items-center gap-1.5 ${cfg.textCls}`}>
                      <span style={{ color: cfg.color }} className="text-sm leading-none">{cfg.numeral}</span>
                      <span>{lang === 'pt' ? cfg.labelPt : cfg.labelEs}</span>
                      <span className="opacity-50 font-normal">· {wineTypeLabel[ts.wine_type] ?? ts.wine_type}</span>
                    </div>

                    {/* Name + photo */}
                    <div className="flex items-center gap-2.5">
                      {(sd?.imageUrl ?? photos[ts.wine_id])
                        ? <img src={sd?.imageUrl ?? photos[ts.wine_id]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-zinc-700" />
                        : <div className="w-10 h-10 rounded-lg flex-shrink-0 border border-zinc-700 flex items-center justify-center text-zinc-600" style={{ background: '#27272a' }}>
                            <WineGlassIcon size={16} />
                          </div>
                      }
                      <div>
                        <div className="font-bold text-white text-sm leading-tight">
                          {ts.wine_name}{ts.vintage ? ` ${ts.vintage}` : ''}
                        </div>
                        {sd?.storage && (
                          <div className="text-[11px] text-zinc-400 mt-0.5">{storageLabel[sd.storage] ?? sd.storage}</div>
                        )}
                      </div>
                    </div>

                    {/* Main metric */}
                    <div>
                      <div className="font-mono font-bold text-white text-lg leading-none tabular-nums">
                        {ts.total_sold} un.
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1">
                        {pct}% {lang === 'pt' ? 'do total vendido' : 'del total vendido'}
                      </div>
                    </div>

                    {/* Sparkline */}
                    <div>
                      <PodiumSparkline data={ts.monthly_sales} color={cfg.color} />
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t pt-2" style={{ borderColor: '#ffffff14' }}>
                      {revenue !== null && (
                        <div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-wide">{lang === 'pt' ? 'Receita' : 'Ingreso'}</div>
                          <div className="text-[11px] font-semibold text-zinc-200 tabular-nums">{fmt(revenue)}</div>
                        </div>
                      )}
                      {lucro !== null && (
                        <div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-wide">Lucro</div>
                          <div className={`text-[11px] font-semibold tabular-nums ${lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(lucro)}</div>
                        </div>
                      )}
                      {sd?.margin !== null && sd?.margin !== undefined && (
                        <div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-wide">{lang === 'pt' ? 'Margem' : 'Margen'}</div>
                          <div className={`text-[11px] font-semibold tabular-nums ${sd.margin >= 20 ? 'text-emerald-400' : sd.margin >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                            {sd.margin.toFixed(1)}%
                          </div>
                        </div>
                      )}
                      {sd && (
                        <div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-wide">{lang === 'pt' ? 'Restam' : 'Quedan'}</div>
                          <div className="text-[11px] font-semibold text-zinc-200 tabular-nums">
                            {sd.cxRemaining !== null ? `${sd.cxRemaining} cx` : `${sd.qtyRemaining} un.`}
                          </div>
                        </div>
                      )}
                      {sd?.pbv && (
                        <div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-wide">{lang === 'pt' ? 'P. Venda' : 'P. Venta'}</div>
                          <div className="text-[11px] font-semibold text-zinc-200 tabular-nums">{fmt(sd.pbv)}/bt</div>
                        </div>
                      )}
                      <div>
                        <div className="text-[9px] text-zinc-500 uppercase tracking-wide">{lang === 'pt' ? 'Vendidos' : 'Vendidos'}</div>
                        <div className="text-[11px] font-semibold text-zinc-200 tabular-nums">{ts.total_sold} un.</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* New product button */}
      <div data-tour="add-stock-btn" className="flex justify-end">
        <Link
          href="/dashboard/estoque/novo"
          className="bg-wine-600 hover:bg-wine-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          {lang === 'pt' ? '+ Novo Produto' : '+ Nuevo Producto'}
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* View toggle — al lado del buscador */}
        <div className="flex rounded-xl border border-app-border overflow-hidden flex-shrink-0">
          <button
            onClick={() => switchView('board')}
            title={lang === 'pt' ? 'Board' : 'Board'}
            className={`px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 ${viewMode === 'board' ? 'bg-wine-600 text-white' : 'bg-white text-app-text3 hover:text-app-text'}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
            {lang === 'pt' ? 'Board' : 'Board'}
          </button>
          <button
            onClick={() => switchView('list')}
            title="Lista"
            className={`px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 border-l border-app-border ${viewMode === 'list' ? 'bg-wine-600 text-white' : 'bg-white text-app-text3 hover:text-app-text'}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            Lista
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === 'pt' ? 'Buscar vinho…' : 'Buscar vino…'}
          className="px-3 py-2 rounded-xl border border-app-border bg-white text-app-text text-xs focus:outline-none focus:ring-2 focus:ring-wine-500 min-w-[180px] flex-1"
        />
        <select value={filterLoc} onChange={(e) => setFilterLoc(e.target.value)} className={selCls}>
          <option value="">{lang === 'pt' ? 'Todos os estoques' : 'Todos los almacenes'}</option>
          {locations.map(loc => (
            <option key={loc} value={loc}>{storageLabel[loc] ?? loc}</option>
          ))}
        </select>
        <select value={filterSafra} onChange={(e) => setFilterSafra(e.target.value)} className={selCls}>
          <option value="">{lang === 'pt' ? 'Todas safras' : 'Todas cosechas'}</option>
          {vintages.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selCls}>
          <option value="">{lang === 'pt' ? 'Todos tipos' : 'Todos tipos'}</option>
          {types.map(tp => (
            <option key={tp} value={tp}>{wineTypeLabel[tp] ?? tp}</option>
          ))}
        </select>
        {producers.length > 1 && (
          <select value={filterProducer} onChange={(e) => setFilterProducer(e.target.value)} className={selCls}>
            <option value="">{lang === 'pt' ? 'Todos produtores' : 'Todos productores'}</option>
            {producers.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setFilterLoc(''); setFilterSafra(''); setFilterType(''); setFilterProducer('') }}
            className="text-xs text-app-text3 hover:text-app-text px-2 py-2 rounded-xl border border-app-border bg-white transition-colors"
          >
            ✕ {lang === 'pt' ? 'Limpar' : 'Limpiar'}
          </button>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-app-border px-5 py-10 text-center text-app-text3 text-sm">
          {hasFilters
            ? (lang === 'pt' ? 'Nenhum resultado para os filtros aplicados.' : 'Sin resultados para los filtros aplicados.')
            : (lang === 'pt' ? 'Nenhuma entrada.' : 'Sin entradas.')}
        </div>
      ) : viewMode === 'board' ? (
        <BoardView
          filtered={filtered}
          topSellers={topSellers}
          photos={photos}
          lang={lang}
          wineTypeLabel={wineTypeLabel}
          wineTypeColor={wineTypeColor}
          storageLabel={storageLabel}
          reponingId={reponingId}
          repoQty={repoQty} setRepoQty={setRepoQty}
          repoCost={repoCost} setRepoCost={setRepoCost}
          repoList={repoList} setRepoList={setRepoList}
          repoLoc={repoLoc} setRepoLoc={setRepoLoc}
          repoDate={repoDate} setRepoDate={setRepoDate}
          repoSaving={repoSaving}
          onStartRestock={startRestock}
          onHandleRestock={handleRestock}
          onCancelRestock={() => setReponingId(null)}
          onOpenEdit={openEditModal}
        />
      ) : (
        <ListView
          filtered={filtered}
          topSellers={topSellers}
          photos={photos}
          lang={lang}
          wineTypeLabel={wineTypeLabel}
          wineTypeColor={wineTypeColor}
          storageLabel={storageLabel}
          reponingId={reponingId}
          repoQty={repoQty} setRepoQty={setRepoQty}
          repoCost={repoCost} setRepoCost={setRepoCost}
          repoList={repoList} setRepoList={setRepoList}
          repoLoc={repoLoc} setRepoLoc={setRepoLoc}
          repoDate={repoDate} setRepoDate={setRepoDate}
          repoSaving={repoSaving}
          onStartRestock={startRestock}
          onHandleRestock={handleRestock}
          onCancelRestock={() => setReponingId(null)}
          onOpenEdit={openEditModal}
        />
      )}

      {/* Stats footer */}
      {filtered.length > 0 && (() => {
        const totalCaixas = filtered.reduce((s, r) => { const b = r.wines?.bottles_per_case; return s + (b ? Math.floor(r.qty_purchased / b) : 0) }, 0)
        const totalVinos  = filtered.reduce((s, r) => s + r.qty_purchased, 0)
        const totalCxDisp = filtered.reduce((s, r) => { const b = r.wines?.bottles_per_case; const safe = Math.min(r.qty_remaining, r.qty_purchased); return s + (b ? Math.floor(safe / b) : 0) }, 0)
        const totalBtDisp = filtered.reduce((s, r) => s + Math.min(r.qty_remaining, r.qty_purchased), 0)
        const valorCompra = filtered.reduce((s, r) => {
          const bpc = r.wines?.bottles_per_case
          const pricePerBottle = bpc ? (r.purchase_price / bpc) : r.purchase_price
          return s + r.qty_purchased * pricePerBottle
        }, 0)
        const valorDisponible = filtered.reduce((s, r) => {
          const bpc = r.wines?.bottles_per_case
          const qty = Math.min(r.qty_remaining, r.qty_purchased)
          const price = r.list_price ?? 0
          const pricePerBottle = bpc ? (price / bpc) : price
          return s + qty * pricePerBottle
        }, 0)
        const withMargin  = filtered.filter(r => r.list_price && r.purchase_price > 0)
        const avgMargin   = withMargin.length > 0
          ? withMargin.reduce((s, r) => s + ((r.list_price! - r.purchase_price) / r.purchase_price) * 100, 0) / withMargin.length
          : null
        const stats = [
          { label: lang === 'pt' ? 'Entradas' : 'Entradas', value: String(filtered.length) + (hasFilters ? ` (filtrado)` : ''), cls: 'text-app-text' },
          { label: lang === 'pt' ? 'Caixas totais' : 'Cajas totales', value: String(totalCaixas), cls: 'text-app-text' },
          { label: lang === 'pt' ? 'Vinhos totais' : 'Vinos totales', value: String(totalVinos), cls: 'text-app-text' },
          { label: lang === 'pt' ? 'Cx. disponíveis' : 'Cj. disponibles', value: String(totalCxDisp), cls: 'text-emerald-600 font-bold' },
          { label: lang === 'pt' ? 'Bt. disponíveis' : 'Bt. disponibles', value: String(totalBtDisp), cls: 'text-emerald-600 font-bold' },
          { label: lang === 'pt' ? 'Valor compra' : 'Valor compra', value: fmt(valorCompra), cls: 'text-app-text' },
          { label: lang === 'pt' ? 'Valor disponível' : 'Valor disponible', value: fmt(valorDisponible), cls: 'text-app-text' },
          { label: lang === 'pt' ? 'Margem média' : 'Margen medio', value: avgMargin !== null ? `${avgMargin.toFixed(1)}%` : '—', cls: avgMargin === null ? 'text-app-text3' : avgMargin >= 20 ? 'text-emerald-600' : 'text-amber-500' },
        ]
        return (
          <div className="bg-white rounded-2xl border border-app-border px-5 py-4">
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {stats.map(s => (
                <div key={s.label}>
                  <div className="text-[10px] text-app-text3 uppercase tracking-wide mb-0.5">{s.label}</div>
                  <div className={`text-sm font-mono font-semibold tabular-nums ${s.cls}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── Edit modal ───────────────────────────────────────────────────── */}
      {editModalEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={e => { if (e.target === e.currentTarget) closeEditModal() }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-app-border px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
              <div>
                <h2 className="text-sm font-bold text-app-text">
                  {lang === 'pt' ? 'Editar produto' : 'Editar producto'}
                </h2>
                <p className="text-xs text-app-text3 mt-0.5">
                  {editModalEntry.wines?.name ?? '—'}{editModalEntry.wines?.vintage ? ` · ${editModalEntry.wines.vintage}` : ''}
                </p>
              </div>
              <button onClick={closeEditModal} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-app-bg text-app-text3 hover:text-app-text transition-colors text-lg">✕</button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Vino */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-text3 mb-2">{lang === 'pt' ? 'Dados do vinho' : 'Datos del vino'}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="text-[9px] font-semibold text-app-text2 block mb-0.5">{lang === 'pt' ? 'Nome' : 'Nombre'}</label>
                    <input type="text" value={mName} onChange={e => setMName(e.target.value)} placeholder={lang === 'pt' ? 'Nome' : 'Nombre'} className={inp} />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-app-text2 block mb-0.5">{lang === 'pt' ? 'Colheita' : 'Cosecha'}</label>
                    <input type="number" value={mVintage} onChange={e => setMVintage(e.target.value)} placeholder="2022" className={inp} />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-app-text2 block mb-0.5">Tipo</label>
                    <select value={mType} onChange={e => setMType(e.target.value)} className={inp}><option value="tinto">Tinto</option><option value="branco">Branco</option><option value="rose">Rosé</option><option value="espumante">Espumante</option></select>
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-app-text2 block mb-0.5">SKU</label>
                    <input type="text" value={mSku} onChange={e => setMSku(e.target.value)} placeholder="SKU" className={inp} />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-app-text2 block mb-0.5">{lang === 'pt' ? 'Produtor' : 'Bodega'}</label>
                    <select value={mWineryId} onChange={e => setMWineryId(e.target.value)} className={inp}><option value="">{lang === 'pt' ? 'Selecionar…' : 'Seleccionar…'}</option>{wineries.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
                  </div>
                </div>
              </section>

              {/* Origen & Especificaciones */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-text3 mb-2">{lang === 'pt' ? 'Origem' : 'Origen'}</h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <label className="text-[9px] font-semibold text-app-text2 block mb-0.5">{lang === 'pt' ? 'País' : 'País'}</label>
                    <input type="text" value={mCountry} onChange={e => setMCountry(e.target.value)} placeholder="Chile" className={inp} />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-app-text2 block mb-0.5">{lang === 'pt' ? 'Região' : 'Región'}</label>
                    <input type="text" value={mRegion} onChange={e => setMRegion(e.target.value)} placeholder={lang === 'pt' ? 'Região' : 'Región'} className={inp} />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-app-text2 block mb-0.5">Uva</label>
                    <input type="text" value={mGrape} onChange={e => setMGrape(e.target.value)} placeholder="Cabernet…" className={inp} />
                  </div>
                </div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-text3 mb-2">{lang === 'pt' ? 'Especificações' : 'Especificaciones'}</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-semibold text-app-text2 block mb-0.5">ml</label>
                    <input type="number" value={mVolumeMl} onChange={e => setMVolumeMl(e.target.value)} placeholder="750" className={inp} />
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-app-text2 block mb-0.5">{lang === 'pt' ? 'Bot/cx' : 'Bot/cj'}</label>
                    <input type="number" value={mBpc} onChange={e => setMBpc(e.target.value)} placeholder="6" className={inp} />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[9px] font-semibold text-app-text2 block mb-0.5">{lang === 'pt' ? 'Características' : 'Características'}</label>
                    <textarea value={mCharacteristics} onChange={e => setMCharacteristics(e.target.value)} rows={1} className={inp + ' resize-none'} placeholder={lang === 'pt' ? 'Características…' : 'Características…'} />
                  </div>
                </div>
              </section>

              {/* Stock - Gestión */}
              <section className="bg-app-bg/50 rounded-xl p-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-text3 mb-2">{lang === 'pt' ? 'Gestão de Stock' : 'Gestión de Stock'}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[9px] text-app-text3 block mb-0.5">{lang === 'pt' ? 'Total Cx' : 'Total Cj'}</label><input type="number" min={0} value={mTotalCaixas} onChange={e => {
                    setMTotalCaixas(e.target.value)
                    const totalCaixas = parseInt(e.target.value) || 0
                    const totalBotellas = mBpc ? (totalCaixas * parseInt(mBpc)).toString() : totalCaixas.toString()
                    setMQty(totalBotellas)
                  }} className={inp} /></div>
                  <div><label className="text-[9px] text-app-text3 block mb-0.5">{lang === 'pt' ? 'Total Gf' : 'Total Bt'}</label><input type="number" min={0} value={mQty} disabled className={inp} style={{ opacity: 0.7 }} /></div>
                  <div><label className="text-[9px] text-app-text3 block mb-0.5">{lang === 'pt' ? 'Disp Cx' : 'Disp Cj'}</label><input type="number" min={0} value={mBpc && parseInt(mQty) > 0 ? Math.floor(parseInt(mQty) / parseInt(mBpc)).toString() : '0'} onChange={e => {
                    const cxDisp = parseInt(e.target.value) || 0
                    const bottlesDisp = mBpc ? (cxDisp * parseInt(mBpc)).toString() : cxDisp.toString()
                    setMQty(bottlesDisp)
                  }} className={inp} /></div>
                  <div><label className="text-[9px] text-app-text3 block mb-0.5">{lang === 'pt' ? 'Alerta' : 'Alerta'}</label><input type="number" min={0} value={mMinStock} onChange={e => setMMinStock(e.target.value)} className={inp} /></div>
                </div>
              </section>

              {/* Precios */}
              <section className="bg-app-bg/50 rounded-xl p-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-text3 mb-2">{lang === 'pt' ? 'Preços' : 'Precios'}</h3>
                <div className="space-y-2">
                  <div><label className="text-[9px] font-semibold text-app-text2 block mb-1">{lang === 'pt' ? 'Compra' : 'Compra'}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min={0} step="0.01" value={mBpc ? (parseFloat(mPurchasePrice) / parseInt(mBpc)).toString() : mPurchasePrice} onChange={e => {
                        const botPrice = parseFloat(e.target.value) || 0
                        const caixaPrice = mBpc ? (botPrice * parseInt(mBpc)).toFixed(2) : '0'
                        setMPurchasePrice(caixaPrice)
                      }} placeholder={lang === 'pt' ? 'P/Bot' : 'P/Bot'} className={inp} />
                      <input type="number" min={0} step="0.01" value={mPurchasePrice} onChange={e => setMPurchasePrice(e.target.value)} placeholder={lang === 'pt' ? 'P/Cx' : 'P/Cj'} className={inp} />
                    </div>
                  </div>
                  <div><label className="text-[9px] font-semibold text-app-text2 block mb-1">{lang === 'pt' ? 'Venda' : 'Venta'}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min={0} step="0.01" value={mListPrice ? (mBpc ? (parseFloat(mListPrice) / parseInt(mBpc)).toString() : mListPrice) : ''} onChange={e => {
                        const botPrice = parseFloat(e.target.value) || 0
                        const caixaPrice = mBpc ? (botPrice * parseInt(mBpc)).toFixed(2) : '0'
                        setMListPrice(caixaPrice)
                      }} placeholder={lang === 'pt' ? 'P/Bot' : 'P/Bot'} className={inp} />
                      <input type="number" min={0} step="0.01" value={mListPrice} onChange={e => setMListPrice(e.target.value)} placeholder={lang === 'pt' ? 'P/Cx' : 'P/Cj'} className={inp} />
                    </div>
                  </div>
                </div>
              </section>

              {/* Logística */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-app-text3 mb-2">{lang === 'pt' ? 'Logística' : 'Logística'}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <select value={mStorage} onChange={e => setMStorage(e.target.value)} className={inp}>{Object.entries(storageLabel).map(([val, lbl2]) => <option key={val} value={val}>{lbl2}</option>)}</select>
                  <input type="date" value={mPurchaseDate} onChange={e => setMPurchaseDate(e.target.value)} className={inp} />
                  <textarea value={mNotes} onChange={e => setMNotes(e.target.value)} rows={2} className={inp + ' col-span-2 resize-none'} placeholder={lang === 'pt' ? 'Notas' : 'Notas'} />
                </div>
              </section>

              {/* Error / success */}
              {mError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{mError}</p>
              )}
              {mSuccess && (
                <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  {lang === 'pt' ? 'Guardado!' : '¡Guardado!'}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-app-border px-6 py-4 flex items-center gap-3 rounded-b-2xl">
              <button
                onClick={handleModalSave}
                disabled={mSaving || mSuccess}
                className="text-sm font-bold bg-wine-600 hover:bg-wine-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl transition-colors"
              >
                {mSaving ? (lang === 'pt' ? 'Salvando…' : 'Guardando…') : (lang === 'pt' ? 'Salvar' : 'Guardar')}
              </button>
              <button
                onClick={closeEditModal}
                className="text-sm text-app-text3 hover:text-app-text px-4 py-2 rounded-xl border border-app-border transition-colors"
              >
                {lang === 'pt' ? 'Cancelar' : 'Cancelar'}
              </button>
              <div className="flex-1" />
              {mConfirmDelete ? (
                <>
                  <span className="text-xs text-red-500">
                    {mDeleteOrderCount > 0
                      ? (lang === 'pt'
                          ? `⚠️ Eliminar este producto e ${mDeleteOrderCount} linha(s) de pedido?`
                          : `⚠️ ¿Eliminar este producto y ${mDeleteOrderCount} línea(s) de pedido?`)
                      : (lang === 'pt' ? 'Confirmar exclusão?' : '¿Confirmar eliminación?')
                    }
                  </span>
                  <button
                    onClick={handleModalDelete}
                    disabled={mDeleting}
                    className="text-xs font-bold bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-3 py-2 rounded-xl"
                  >
                    {mDeleting ? '…' : (lang === 'pt' ? 'Excluir' : 'Eliminar')}
                  </button>
                  <button onClick={() => setMConfirmDelete(false)} className="text-xs text-app-text3 px-2 py-2 rounded-xl border border-app-border">✕</button>
                </>
              ) : (
                <button
                  onClick={async () => {
                    if (!editModalEntry) return
                    const { orderItemCount } = await getStockEntryDependencies(editModalEntry.id)
                    setMDeleteOrderCount(orderItemCount)
                    setMConfirmDelete(true)
                  }}
                  className="text-xs text-red-400 hover:text-red-600 px-3 py-2 rounded-xl border border-red-200 hover:border-red-400 transition-colors"
                >
                  {lang === 'pt' ? 'Excluir entrada' : 'Eliminar entrada'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Board view
// ══════════════════════════════════════════════════════════════════════════════
function BoardView({
  filtered, topSellers, photos, lang, wineTypeLabel, wineTypeColor, storageLabel,
  reponingId, repoQty, setRepoQty, repoCost, setRepoCost, repoList, setRepoList,
  repoLoc, setRepoLoc, repoDate, setRepoDate, repoSaving,
  onStartRestock, onHandleRestock, onCancelRestock, onOpenEdit,
}: {
  filtered: StockRow[]
  topSellers: TopSeller[]
  photos: Record<string, string>
  lang: Lang
  wineTypeLabel: Record<string, string>
  wineTypeColor: Record<string, string>
  storageLabel: Record<string, string>
  reponingId: string | null
  repoQty: string; setRepoQty: (v: string) => void
  repoCost: string; setRepoCost: (v: string) => void
  repoList: string; setRepoList: (v: string) => void
  repoLoc: string; setRepoLoc: (v: string) => void
  repoDate: string; setRepoDate: (v: string) => void
  repoSaving: boolean
  onStartRestock: (entry: StockRow) => void
  onHandleRestock: (id: string) => void
  onCancelRestock: () => void
  onOpenEdit: (entry: StockRow) => void
}) {
  const inp2 = 'w-full px-2 py-1.5 rounded-lg border border-emerald-300 bg-app-bg text-app-text text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filtered.map((entry) => {
        const wine = entry.wines
        const photo = wine?.image_url ?? photos[wine?.id ?? '']
        const rank  = topSellers.findIndex(ts => ts.wine_id === wine?.id)
        const bpc   = wine?.bottles_per_case
        const cxDisp  = bpc ? Math.floor(entry.qty_remaining / bpc) : null
        const cxTotal = bpc ? Math.floor(entry.qty_purchased / bpc) : null
        const low   = bpc && wine?.min_stock != null && entry.qty_remaining < wine.min_stock
        const pct   = entry.qty_purchased > 0 ? Math.round((entry.qty_remaining / entry.qty_purchased) * 100) : 0
        const margin = entry.list_price && entry.purchase_price > 0
          ? ((entry.list_price - entry.purchase_price) / entry.purchase_price) * 100
          : null

        if (reponingId === entry.id) {
          return (
            <div key={entry.id} className="col-span-full bg-emerald-50/30 rounded-2xl border-2 border-emerald-300 p-5">
              <div className="text-sm font-semibold text-app-text mb-3">
                {lang === 'pt' ? 'Repor: ' : 'Reponer: '}
                <span className="text-emerald-600">{wine?.name ?? '—'}{wine?.vintage ? ` ${wine.vintage}` : ''}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="text-[10px] font-semibold text-app-text2 uppercase tracking-wider block mb-1.5">{lang === 'pt' ? 'Quantidade *' : 'Cantidad *'}</label>
                  <input type="number" min={1} value={repoQty} onChange={e => setRepoQty(e.target.value)} placeholder="120" className={inp2} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-app-text2 uppercase tracking-wider block mb-1.5">{lang === 'pt' ? 'P. Compra *' : 'P. Compra *'}</label>
                  <input type="number" min={0} step="0.01" value={repoCost} onChange={e => setRepoCost(e.target.value)} className={inp2} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-app-text2 uppercase tracking-wider block mb-1.5">{lang === 'pt' ? 'P. Venda' : 'P. Venta'}</label>
                  <input type="number" min={0} step="0.01" value={repoList} onChange={e => setRepoList(e.target.value)} placeholder="—" className={inp2} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-app-text2 uppercase tracking-wider block mb-1.5">{lang === 'pt' ? 'Estoque' : 'Almacén'}</label>
                  <select value={repoLoc} onChange={e => setRepoLoc(e.target.value)} className={inp2}>
                    {Object.entries(storageLabel).map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-app-text2 uppercase tracking-wider block mb-1.5">{lang === 'pt' ? 'Data de compra' : 'Fecha de compra'}</label>
                  <input type="date" value={repoDate} onChange={e => setRepoDate(e.target.value)} className={inp2} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onHandleRestock(entry.id)} disabled={repoSaving || !repoQty || !repoCost}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
                  {repoSaving ? '…' : (lang === 'pt' ? 'Guardar entrada' : 'Guardar entrada')}
                </button>
                <button onClick={onCancelRestock}
                  className="text-xs text-app-text3 hover:text-app-text px-3 py-1.5 rounded-lg border border-app-border transition-colors">
                  {lang === 'pt' ? 'Cancelar' : 'Cancelar'}
                </button>
              </div>
            </div>
          )
        }

        return (
          <div key={entry.id} className="bg-white rounded-2xl border border-app-border overflow-hidden flex flex-col">
            <div className="relative bg-app-bg overflow-hidden" style={{ height: 220 }}>
              <WinePhotoCover wineId={wine?.id ?? ''} photo={photo} lang={lang} />
              <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl px-2.5 py-1.5 shadow-sm">
                  <div className="text-[9px] uppercase tracking-wide text-app-text3 leading-none mb-0.5">
                    {lang === 'pt' ? 'Disponível' : 'Disponible'}
                  </div>
                  <div className={`text-sm font-bold tabular-nums leading-none ${
                    entry.qty_remaining === 0 ? 'text-red-500' : low ? 'text-amber-500' : 'text-emerald-600'
                  }`}>
                    {cxDisp !== null ? `${cxDisp} cx` : `${entry.qty_remaining} un`}
                  </div>
                </div>
              </div>
              {cxTotal !== null && (
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                    <div className="text-[9px] text-white/70 leading-none mb-0.5">Total</div>
                    <div className="text-xs font-bold text-white tabular-nums leading-none">{cxTotal} cx</div>
                  </div>
                </div>
              )}
            </div>

            {/* Card content — CSS grid con filas fijas para alineación perfecta */}
            <div className="flex-1" style={{
              display: 'grid',
              gridTemplateRows: '88px auto 1fr auto',
              gap: 12,
              padding: 16,
            }}>
              {/* Fila 1: nombre — exactamente 88px, no crece ni encoge */}
              <div className="flex items-start justify-between gap-2 overflow-hidden" style={{ overflow: 'hidden' }}>
                <div className="min-w-0 overflow-hidden">
                  <div className="font-bold text-app-text text-sm leading-tight truncate">{wine?.name ?? '—'}</div>
                  {wine?.vintage && <div className="text-xl font-mono font-bold text-app-text2 leading-tight">{wine.vintage}</div>}
                  {wine?.wineries?.name && <div className="text-xs text-app-text3 mt-0.5 truncate">{wine.wineries.name}</div>}
                </div>
                {wine?.type && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${wineTypeColor[wine.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {wineTypeLabel[wine.type] ?? wine.type}
                  </span>
                )}
              </div>

              {/* Fila 2: P. Compra / P. Venda / Margen — siempre justo debajo del nombre */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Compra', value: fmt(entry.purchase_price), cls: 'text-app-text' },
                  { label: 'Venda', value: entry.list_price ? fmt(entry.list_price) : '—', cls: 'text-app-text' },
                  {
                    label: lang === 'pt' ? 'Margem' : 'Margen',
                    value: margin !== null ? `${margin.toFixed(1)}%` : '—',
                    cls: margin === null ? 'text-app-text3' : margin < 0 ? 'text-red-500' : margin < 20 ? 'text-amber-500' : 'text-emerald-600',
                  },
                ].map(stat => (
                  <div key={stat.label} className="bg-app-bg rounded-xl text-center overflow-hidden min-w-0" style={{ padding: '6px 4px' }}>
                    <div className="text-[7px] text-app-text3 uppercase leading-none" style={{ height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stat.label}</div>
                    <div className={`text-[9px] font-mono font-bold tabular-nums overflow-hidden text-ellipsis whitespace-nowrap ${stat.cls}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Fila 3 (1fr): stock bar + badges — ocupa el espacio restante */}
              <div>
                <div className="flex justify-between text-[10px] text-app-text3 mb-1">
                  <span>{lang === 'pt' ? 'Estoque' : 'Stock'}</span>
                  <span className="tabular-nums">{entry.qty_remaining}/{entry.qty_purchased} un</span>
                </div>
                <div className="h-1.5 bg-app-bg rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct === 0 ? 'bg-red-400' : pct < 30 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Fila 4: botones — al final del grid */}
              <div className="flex gap-2">
                <button onClick={() => onStartRestock(entry)}
                  className="flex-1 text-xs font-semibold py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                  + {lang === 'pt' ? 'Repor' : 'Reponer'}
                </button>
                <button onClick={() => onOpenEdit(entry)} title={lang === 'pt' ? 'Editar produto' : 'Editar producto'}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-app-border text-app-text2 hover:text-wine-600 hover:border-wine-300 hover:bg-wine-50 transition-colors">
                  <EditIcon />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// List view
// ══════════════════════════════════════════════════════════════════════════════
function ListView({
  filtered, topSellers, photos, lang, wineTypeLabel, wineTypeColor, storageLabel,
  reponingId, repoQty, setRepoQty, repoCost, setRepoCost, repoList, setRepoList,
  repoLoc, setRepoLoc, repoDate, setRepoDate, repoSaving,
  onStartRestock, onHandleRestock, onCancelRestock, onOpenEdit,
}: {
  filtered: StockRow[]
  topSellers: TopSeller[]
  photos: Record<string, string>
  lang: Lang
  wineTypeLabel: Record<string, string>
  wineTypeColor: Record<string, string>
  storageLabel: Record<string, string>
  reponingId: string | null
  repoQty: string; setRepoQty: (v: string) => void
  repoCost: string; setRepoCost: (v: string) => void
  repoList: string; setRepoList: (v: string) => void
  repoLoc: string; setRepoLoc: (v: string) => void
  repoDate: string; setRepoDate: (v: string) => void
  repoSaving: boolean
  onStartRestock: (entry: StockRow) => void
  onHandleRestock: (id: string) => void
  onCancelRestock: () => void
  onOpenEdit: (entry: StockRow) => void
}) {
  const inp2 = 'w-full px-2 py-1 rounded-lg border border-emerald-300 bg-app-bg text-app-text text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500'

  // Sort state
  const [sortCol, setSortCol] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      const bpcA = a.wines?.bottles_per_case
      const bpcB = b.wines?.bottles_per_case
      switch (sortCol) {
        case 'name':     av = a.wines?.name ?? ''; bv = b.wines?.name ?? ''; break
        case 'vintage':  av = a.wines?.vintage ?? 0; bv = b.wines?.vintage ?? 0; break
        case 'type':     av = a.wines?.type ?? ''; bv = b.wines?.type ?? ''; break
        case 'producer': av = a.wines?.wineries?.name ?? ''; bv = b.wines?.wineries?.name ?? ''; break
        case 'country':  av = a.wines?.country ?? ''; bv = b.wines?.country ?? ''; break
        case 'total':    av = a.qty_purchased; bv = b.qty_purchased; break
        case 'disp':     av = Math.min(a.qty_remaining, a.qty_purchased); bv = Math.min(b.qty_remaining, b.qty_purchased); break
        case 'pBotCompra': av = bpcA ? a.purchase_price / bpcA : a.purchase_price; bv = bpcB ? b.purchase_price / bpcB : b.purchase_price; break
        case 'pBotVenta':  av = a.list_price ? (bpcA ? a.list_price / bpcA : a.list_price) : 0; bv = b.list_price ? (bpcB ? b.list_price / bpcB : b.list_price) : 0; break
        case 'pCjCompra':  av = a.purchase_price; bv = b.purchase_price; break
        case 'pCjVenta':   av = a.list_price ?? 0; bv = b.list_price ?? 0; break
        case 'vCompra':    av = a.qty_purchased * (bpcA ? a.purchase_price / bpcA : a.purchase_price); bv = b.qty_purchased * (bpcB ? b.purchase_price / bpcB : b.purchase_price); break
        case 'vVenta':     av = a.list_price ? a.qty_purchased * (bpcA ? a.list_price / bpcA : a.list_price) : 0; bv = b.list_price ? b.qty_purchased * (bpcB ? b.list_price / bpcB : b.list_price) : 0; break
        case 'margin': {
          const pBotCA = bpcA ? a.purchase_price / bpcA : a.purchase_price
          const pBotVA = a.list_price ? (bpcA ? a.list_price / bpcA : a.list_price) : null
          const pBotCB = bpcB ? b.purchase_price / bpcB : b.purchase_price
          const pBotVB = b.list_price ? (bpcB ? b.list_price / bpcB : b.list_price) : null
          av = pBotVA && a.purchase_price > 0 ? ((pBotVA - pBotCA) / pBotCA) * 100 : -999
          bv = pBotVB && b.purchase_price > 0 ? ((pBotVB - pBotCB) / pBotCB) * 100 : -999
          break
        }
        case 'location': av = a.storage_location; bv = b.storage_location; break
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortCol, sortDir])

  function SortIcon({ col }: { col: string }) {
    const active = sortCol === col
    return (
      <span className={`inline-block ml-0.5 text-[9px] ${active ? 'text-wine-500' : 'text-app-border'}`}>
        {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    )
  }

  const th = 'text-[10px] font-bold uppercase tracking-wider text-app-text3 px-3 py-2.5 text-left whitespace-nowrap'
  const thS = `${th} cursor-pointer select-none hover:text-app-text transition-colors`
  const td = 'px-3 py-2.5 text-xs text-app-text'

  // Totals for tfoot
  const totQtyPurchased = sorted.reduce((s, r) => s + r.qty_purchased, 0)
  const totQtyRemaining = sorted.reduce((s, r) => s + Math.min(r.qty_remaining, r.qty_purchased), 0)
  const totCxPurchased  = sorted.reduce((s, r) => { const b = r.wines?.bottles_per_case; return s + (b ? Math.floor(r.qty_purchased / b) : 0) }, 0)
  const totCxRemaining  = sorted.reduce((s, r) => { const b = r.wines?.bottles_per_case; const safe = Math.min(r.qty_remaining, r.qty_purchased); return s + (b ? Math.floor(safe / b) : 0) }, 0)
  const totVCompra = sorted.reduce((s, r) => { const b = r.wines?.bottles_per_case; return s + r.qty_purchased * (b ? r.purchase_price / b : r.purchase_price) }, 0)
  const totVVenta  = sorted.reduce((s, r) => { const b = r.wines?.bottles_per_case; return s + (r.list_price ? r.qty_purchased * (b ? r.list_price / b : r.list_price) : 0) }, 0)
  const totPBotCompra = sorted.reduce((s, r) => { const b = r.wines?.bottles_per_case; return s + (b ? r.purchase_price / b : r.purchase_price) }, 0)
  const withVenta     = sorted.filter(r => r.list_price)
  const totPBotVenta  = withVenta.reduce((s, r) => { const b = r.wines?.bottles_per_case; return s + (b ? r.list_price! / b : r.list_price!) }, 0)
  const totPCjCompra  = sorted.reduce((s, r) => s + r.purchase_price, 0)
  const totPCjVenta   = withVenta.reduce((s, r) => s + r.list_price!, 0)
  const withMarginRows = sorted.filter(r => r.list_price && r.purchase_price > 0)
  const avgMarginTot = withMarginRows.length > 0
    ? withMarginRows.reduce((s, r) => {
        const b = r.wines?.bottles_per_case
        const pbc = b ? r.purchase_price / b : r.purchase_price
        const pbv = b ? r.list_price! / b : r.list_price!
        return s + ((pbv - pbc) / pbc) * 100
      }, 0) / withMarginRows.length
    : null

  return (
    <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: 1100 }}>
          <thead className="border-b border-app-border bg-app-bg/60">
            {/* Group header row */}
            <tr className="border-b border-app-border/40">
              <th colSpan={10} className="px-3 py-1" />
              <th colSpan={2} className="py-1 text-center text-[9px] font-bold uppercase tracking-wider text-sky-500 border-l border-app-border/50">
                {lang === 'pt' ? 'Garrafa' : 'Botella'}
              </th>
              <th colSpan={2} className="py-1 text-center text-[9px] font-bold uppercase tracking-wider text-amber-500 border-l border-app-border/50">
                {lang === 'pt' ? 'Caixa' : 'Caja'}
              </th>
              <th colSpan={2} className="py-1 text-center text-[9px] font-bold uppercase tracking-wider text-emerald-500 border-l border-app-border/50">
                {lang === 'pt' ? 'Valor Total' : 'Valor Total'}
              </th>
              <th className="px-3 py-1" />
              <th className="px-3 py-1" />
            </tr>
            {/* Column header row */}
            <tr>
              <th className={thS} onClick={() => handleSort('name')}>{lang === 'pt' ? 'Vinho' : 'Vino'}<SortIcon col="name" /></th>
              <th className={thS} onClick={() => handleSort('type')}>Tipo<SortIcon col="type" /></th>
              <th className={thS} onClick={() => handleSort('producer')}>{lang === 'pt' ? 'Produtor' : 'Bodega'}<SortIcon col="producer" /></th>
              <th className={thS} onClick={() => handleSort('country')}>País<SortIcon col="country" /></th>
              <th className={th}>Uva</th>
              <th className={th}>SKU</th>
              <th className={th}>{lang === 'pt' ? 'Loc.' : 'Ubic.'}</th>
              <th className={thS + ' text-right'} onClick={() => handleSort('total')}>{lang === 'pt' ? 'Comprado' : 'Comprado'}<SortIcon col="total" /></th>
              <th className={thS + ' text-right'} onClick={() => handleSort('disp')}>{lang === 'pt' ? 'Disponível' : 'Disponible'}<SortIcon col="disp" /></th>
              <th className={th + ' text-right'}>Min</th>
              <th className={thS + ' text-right border-l border-app-border/50'} onClick={() => handleSort('pBotCompra')}>{lang === 'pt' ? 'Compra' : 'Compra'}<SortIcon col="pBotCompra" /></th>
              <th className={thS + ' text-right'} onClick={() => handleSort('pBotVenta')}>{lang === 'pt' ? 'Venda' : 'Venta'}<SortIcon col="pBotVenta" /></th>
              <th className={thS + ' text-right border-l border-app-border/50'} onClick={() => handleSort('pCjCompra')}>{lang === 'pt' ? 'Compra' : 'Compra'}<SortIcon col="pCjCompra" /></th>
              <th className={thS + ' text-right'} onClick={() => handleSort('pCjVenta')}>{lang === 'pt' ? 'Venda' : 'Venta'}<SortIcon col="pCjVenta" /></th>
              <th className={thS + ' text-right border-l border-app-border/50'} onClick={() => handleSort('vCompra')}>{lang === 'pt' ? 'Compra' : 'Compra'}<SortIcon col="vCompra" /></th>
              <th className={thS + ' text-right'} onClick={() => handleSort('vVenta')}>{lang === 'pt' ? 'Venda' : 'Venta'}<SortIcon col="vVenta" /></th>
              <th className={thS + ' text-right'} onClick={() => handleSort('margin')}>{lang === 'pt' ? 'Margem' : 'Margen'}<SortIcon col="margin" /></th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => {
              const wine  = entry.wines
              const photo = wine?.image_url ?? photos[wine?.id ?? '']
              const rank  = topSellers.findIndex(ts => ts.wine_id === wine?.id)
              const bpc   = wine?.bottles_per_case
              const safeQtyRemaining = Math.min(entry.qty_remaining, entry.qty_purchased)
              const cxDisp  = bpc ? Math.floor(safeQtyRemaining / bpc) : null
              const cxTotal = bpc ? Math.floor(entry.qty_purchased / bpc) : null
              const low   = bpc && wine?.min_stock != null && entry.qty_remaining < wine.min_stock
              const pricePerBottleCompra = bpc ? (entry.purchase_price / bpc) : entry.purchase_price
              const pricePerBottleVenda = entry.list_price ? (bpc ? (entry.list_price / bpc) : entry.list_price) : null
              const margin = entry.list_price && entry.purchase_price > 0 && pricePerBottleVenda
                ? ((pricePerBottleVenda - pricePerBottleCompra) / pricePerBottleCompra) * 100
                : null

              if (reponingId === entry.id) {
                return (
                  <tr key={entry.id} className="border-t border-emerald-200 bg-emerald-50/40">
                    <td colSpan={18} className="px-4 py-3">
                      <div className="text-xs font-semibold text-emerald-700 mb-2">
                        {lang === 'pt' ? 'Repor: ' : 'Reponer: '}{wine?.name}{wine?.vintage ? ` ${wine.vintage}` : ''}
                      </div>
                      <div className="flex flex-wrap gap-3 items-end">
                        <div>
                          <div className="text-[10px] text-app-text3 mb-1">{lang === 'pt' ? 'Qtd *' : 'Cant *'}</div>
                          <input type="number" min={1} value={repoQty} onChange={e => setRepoQty(e.target.value)} placeholder="120" className={inp2} style={{ width: 80 }} />
                        </div>
                        <div>
                          <div className="text-[10px] text-app-text3 mb-1">{lang === 'pt' ? 'P. Compra *' : 'P. Compra *'}</div>
                          <input type="number" min={0} step="0.01" value={repoCost} onChange={e => setRepoCost(e.target.value)} className={inp2} style={{ width: 90 }} />
                        </div>
                        <div>
                          <div className="text-[10px] text-app-text3 mb-1">{lang === 'pt' ? 'P. Venda' : 'P. Venta'}</div>
                          <input type="number" min={0} step="0.01" value={repoList} onChange={e => setRepoList(e.target.value)} placeholder="—" className={inp2} style={{ width: 90 }} />
                        </div>
                        <div>
                          <div className="text-[10px] text-app-text3 mb-1">{lang === 'pt' ? 'Estoque' : 'Almacén'}</div>
                          <select value={repoLoc} onChange={e => setRepoLoc(e.target.value)} className={inp2} style={{ width: 120 }}>
                            {Object.entries(storageLabel).map(([val, lbl]) => (
                              <option key={val} value={val}>{lbl}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="text-[10px] text-app-text3 mb-1">{lang === 'pt' ? 'Data compra' : 'Fecha compra'}</div>
                          <input type="date" value={repoDate} onChange={e => setRepoDate(e.target.value)} className={inp2} style={{ width: 130 }} />
                        </div>
                        <button onClick={() => onHandleRestock(entry.id)} disabled={repoSaving || !repoQty || !repoCost}
                          className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg">
                          {repoSaving ? '…' : (lang === 'pt' ? 'Guardar' : 'Guardar')}
                        </button>
                        <button onClick={onCancelRestock}
                          className="text-xs text-app-text3 hover:text-app-text px-3 py-1.5 rounded-lg border border-app-border">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }

              return (
                <tr key={entry.id} className="border-t border-app-border hover:bg-app-bg/40 transition-colors group">
                  {/* Wine */}
                  <td className={td}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-app-bg">
                        {photo
                          ? <img src={photo} className="w-full h-full object-cover" alt="" />
                          : <div className="w-full h-full flex items-center justify-center text-app-text3">
                              <WineGlassIcon size={14} />
                            </div>
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-app-text text-xs leading-tight truncate max-w-[160px]">
                          {wine?.name ?? '—'}
                        </div>
                        {wine?.vintage && <div className="text-[11px] text-app-text3">{wine.vintage}</div>}
                      </div>
                    </div>
                  </td>
                  {/* Tipo */}
                  <td className={td}>
                    {wine?.type && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${wineTypeColor[wine.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {wineTypeLabel[wine.type] ?? wine.type}
                      </span>
                    )}
                  </td>
                  {/* Bodega */}
                  <td className={td + ' text-app-text3 text-xs'}>{wine?.wineries?.name ?? '—'}</td>
                  {/* País */}
                  <td className={td + ' text-app-text3 text-xs'}>{wine?.country ?? '—'}</td>
                  {/* Uva */}
                  <td className={td + ' text-app-text3 text-xs'}>{wine?.grape ?? '—'}</td>
                  {/* SKU */}
                  <td className={td + ' text-app-text3 text-xs'}>{wine?.sku ?? '—'}</td>
                  {/* Estoque location — one line */}
                  <td className={td + ' text-app-text3 text-xs whitespace-nowrap'}>{storageLabel[entry.storage_location] ?? entry.storage_location}</td>
                  {/* Total Comprado: cx + bt */}
                  <td className={td + ' text-right tabular-nums'}>
                    {cxTotal !== null
                      ? <div><div className="text-xs font-semibold text-app-text">{cxTotal} cx</div><div className="text-[10px] text-app-text3">{entry.qty_purchased} bt</div></div>
                      : <span className="text-xs text-app-text">{entry.qty_purchased} bt</span>}
                  </td>
                  {/* Total Disponible: cx + bt */}
                  <td className={td + ' text-right tabular-nums'}>
                    {cxDisp !== null
                      ? <div>
                          <div className={`text-xs font-semibold ${safeQtyRemaining === 0 ? 'text-red-500' : low ? 'text-amber-500' : 'text-emerald-600'}`}>{cxDisp} cx</div>
                          <div className="text-[10px] text-app-text3">{safeQtyRemaining} bt</div>
                        </div>
                      : <span className={`text-xs font-semibold ${safeQtyRemaining === 0 ? 'text-red-500' : low ? 'text-amber-500' : 'text-emerald-600'}`}>{safeQtyRemaining} bt</span>}
                  </td>
                  {/* Min Stock */}
                  <td className={td + ' text-right tabular-nums text-app-text3 text-xs'}>
                    {wine?.min_stock != null
                      ? bpc
                        ? <div>
                            <div className="whitespace-nowrap">{Math.ceil(wine.min_stock / bpc)} cx</div>
                            <div className="text-[10px] whitespace-nowrap">{wine.min_stock} bt</div>
                          </div>
                        : <span className="whitespace-nowrap">{wine.min_stock} bt</span>
                      : '—'}
                  </td>
                  {/* Precio Bot. Compra */}
                  <td className={td + ' text-right tabular-nums text-xs border-l border-app-border/30'}>{fmt(pricePerBottleCompra)}</td>
                  {/* Precio Bot. Venta */}
                  <td className={td + ' text-right tabular-nums text-xs'}>{pricePerBottleVenda ? fmt(pricePerBottleVenda) : <span className="text-app-text3">—</span>}</td>
                  {/* Precio Cj. Compra */}
                  <td className={td + ' text-right tabular-nums text-xs font-semibold border-l border-app-border/30'}>{fmt(entry.purchase_price)}</td>
                  {/* Precio Cj. Venta */}
                  <td className={td + ' text-right tabular-nums text-xs font-semibold'}>{entry.list_price ? fmt(entry.list_price) : <span className="text-app-text3">—</span>}</td>
                  {/* Val. Total Compra */}
                  <td className={td + ' text-right tabular-nums font-bold text-xs border-l border-app-border/30'}>{fmt(entry.qty_purchased * pricePerBottleCompra)}</td>
                  {/* Val. Total Venta */}
                  <td className={td + ' text-right tabular-nums font-bold text-xs'}>{pricePerBottleVenda ? fmt(entry.qty_purchased * pricePerBottleVenda) : <span className="text-app-text3">—</span>}</td>
                  {/* Margen */}
                  <td className={td + ' text-right tabular-nums text-xs'}>
                    <span className={margin === null ? 'text-app-text3' : margin < 0 ? 'text-red-500' : margin < 20 ? 'text-amber-500' : 'text-emerald-600'}>
                      {margin !== null ? `${margin.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className={td}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button onClick={() => onStartRestock(entry)}
                        className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors whitespace-nowrap">
                        + {lang === 'pt' ? 'Repor' : 'Reponer'}
                      </button>
                      <button onClick={() => onOpenEdit(entry)} title={lang === 'pt' ? 'Editar' : 'Editar'}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-app-border text-app-text2 hover:text-wine-600 hover:border-wine-300 hover:bg-wine-50 transition-colors">
                        <EditIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {sorted.length > 1 && (
            <tfoot>
              <tr className="border-t-2 border-app-border bg-app-bg/60">
                {/* Vino */}
                <td className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-app-text3">
                  {sorted.length} {lang === 'pt' ? 'entradas' : 'entradas'}
                </td>
                {/* Tipo */}
                <td className="px-3 py-2.5" />
                {/* Bodega */}
                <td className="px-3 py-2.5" />
                {/* País */}
                <td className="px-3 py-2.5" />
                {/* Uva */}
                <td className="px-3 py-2.5" />
                {/* SKU */}
                <td className="px-3 py-2.5" />
                {/* Estoque */}
                <td className="px-3 py-2.5" />
                {/* Total Comprado */}
                <td className="px-3 py-2.5 text-right">
                  <div className="text-[10px] text-app-text3">total</div>
                  <div className="text-xs font-mono font-semibold text-app-text tabular-nums">{totCxPurchased} cx</div>
                  <div className="text-xs font-mono font-semibold text-app-text3 tabular-nums">{totQtyPurchased} bt</div>
                </td>
                {/* Total Disponible */}
                <td className="px-3 py-2.5 text-right">
                  <div className="text-[10px] text-app-text3">total</div>
                  <div className="text-xs font-mono font-semibold text-emerald-600 tabular-nums">{totCxRemaining} cx</div>
                  <div className="text-xs font-mono font-semibold text-app-text3 tabular-nums">{totQtyRemaining} bt</div>
                </td>
                {/* Min */}
                <td className="px-3 py-2.5" />
                {/* Precio Bot. Compra */}
                <td className="px-3 py-2.5 text-right border-l border-app-border/30">
                  <div className="text-[10px] text-app-text3">total</div>
                  <div className="text-xs font-mono font-semibold text-app-text tabular-nums">{fmt(totPBotCompra)}</div>
                </td>
                {/* Precio Bot. Venta */}
                <td className="px-3 py-2.5 text-right">
                  {withVenta.length > 0
                    ? <><div className="text-[10px] text-app-text3">total</div><div className="text-xs font-mono font-semibold text-app-text tabular-nums">{fmt(totPBotVenta)}</div></>
                    : <span className="text-app-text3 text-[10px]">—</span>}
                </td>
                {/* Precio Cj. Compra */}
                <td className="px-3 py-2.5 text-right border-l border-app-border/30">
                  <div className="text-[10px] text-app-text3">total</div>
                  <div className="text-xs font-mono font-semibold text-app-text tabular-nums">{fmt(totPCjCompra)}</div>
                </td>
                {/* Precio Cj. Venta */}
                <td className="px-3 py-2.5 text-right">
                  {withVenta.length > 0
                    ? <><div className="text-[10px] text-app-text3">total</div><div className="text-xs font-mono font-semibold text-app-text tabular-nums">{fmt(totPCjVenta)}</div></>
                    : <span className="text-app-text3 text-[10px]">—</span>}
                </td>
                {/* Val. Total Compra */}
                <td className="px-3 py-2.5 text-right border-l border-app-border/30">
                  <div className="text-[10px] text-app-text3">total</div>
                  <div className="text-sm font-bold font-mono tabular-nums text-app-text">{fmt(totVCompra)}</div>
                </td>
                {/* Val. Total Venta */}
                <td className="px-3 py-2.5 text-right">
                  <div className="text-[10px] text-app-text3">total</div>
                  <div className="text-sm font-bold font-mono tabular-nums text-app-text">{fmt(totVVenta)}</div>
                </td>
                {/* Margen */}
                <td className="px-3 py-2.5 text-right">
                  {avgMarginTot !== null
                    ? <>
                        <div className="text-[10px] text-app-text3">{lang === 'pt' ? 'méd.' : 'prom.'}</div>
                        <div className={`text-xs font-bold tabular-nums ${avgMarginTot < 0 ? 'text-red-500' : avgMarginTot < 20 ? 'text-amber-500' : 'text-emerald-600'}`}>
                          {avgMarginTot >= 0 ? '+' : ''}{avgMarginTot.toFixed(1)}%
                        </div>
                      </>
                    : <span className="text-app-text3 text-[10px]">—</span>}
                </td>
                {/* Actions */}
                <td className="px-3 py-2.5" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
