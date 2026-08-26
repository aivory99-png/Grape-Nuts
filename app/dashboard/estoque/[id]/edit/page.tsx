import { getLang } from '@/lib/lang'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StockForm from '../../novo/stock-form'

function uniq<T>(rows: { [k: string]: T | null }[] | null, key: string): T[] {
  return [...new Set((rows ?? []).map(r => r[key]).filter(Boolean) as T[])]
}

export default async function EditEstoquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [lang, entryRes, countryRes, grapeRes, regionRes, wineryRes] = await Promise.all([
    getLang(),
    supabase
      .from('stock_entries')
      .select('*, wines(*, wineries(id, name))')
      .eq('id', id)
      .single(),
    supabase.from('wines').select('country').not('country', 'is', null).order('country'),
    supabase.from('wines').select('grape').not('grape', 'is', null).order('grape'),
    supabase.from('wines').select('region').not('region', 'is', null).order('region'),
    supabase.from('wineries').select('id, name').order('name'),
  ])

  const entry = entryRes.data
  if (!entry) redirect('/dashboard/estoque')

  const wine = entry.wines as {
    id: string; name: string; vintage: number | null; type: string; sku: string | null
    grape: string | null; country: string | null; region: string | null
    volume_ml: number | null; bottles_per_case: number | null; consumer_price: number | null
    characteristics: string | null; min_stock: number | null; image_url: string | null
    wineries: { id: string; name: string } | null
  } | null

  const existingCountries = uniq<string>(countryRes.data, 'country')
  const existingGrapes    = uniq<string>(grapeRes.data,   'grape')
  const existingRegions   = uniq<string>(regionRes.data,  'region')
  const wineries = (wineryRes.data ?? []) as { id: string; name: string }[]

  const initialValues = {
    entryId:        id,
    wineId:         wine?.id ?? '',
    wineName:       wine?.name ?? '',
    vintage:        wine?.vintage ? String(wine.vintage) : '',
    wineType:       wine?.type ?? '',
    sku:            wine?.sku ?? '',
    wineryId:       wine?.wineries?.id ?? '',
    grape:          wine?.grape ?? '',
    country:        wine?.country ?? '',
    region:         wine?.region ?? '',
    volumeMl:       wine?.volume_ml ? String(wine.volume_ml) : '750',
    bottlesPerCase: wine?.bottles_per_case ? String(wine.bottles_per_case) : '6',
    consumerPrice:  wine?.consumer_price ? String(wine.consumer_price) : '',
    characteristics: wine?.characteristics ?? '',
    imageUrl:       wine?.image_url ?? null,
    qtyRemaining:   String(entry.qty_remaining),
    purchasePrice:  String(entry.purchase_price),
    listPrice:      entry.list_price ? String(entry.list_price) : '',
    storage:        entry.storage_location ?? '',
    purchaseDate:   entry.purchase_date ?? '',
    notes:          entry.notes ?? '',
    minStock:       wine?.min_stock ? String(wine.min_stock) : '',
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-app-text">
          {lang === 'pt' ? 'Editar Vinho' : 'Editar Vino'}
        </h1>
        <p className="text-sm text-app-text2 mt-1">{wine?.name}</p>
      </div>
      <StockForm
        lang={lang}
        existingCountries={existingCountries}
        existingGrapes={existingGrapes}
        existingRegions={existingRegions}
        wineries={wineries}
        initialValues={initialValues}
      />
    </div>
  )
}
