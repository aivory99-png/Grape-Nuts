import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'
import StockListClient from './stock-list-client'

const wineTypeLabel: Record<string, string> = {
  tinto:     'Tinto',
  branco:    'Branco',
  rose:      'Rosé',
  rosé:      'Rosé',
  espumante: 'Espumante',
  laranja:   'Laranja',
  outro:     'Outro',
}

export default async function EstoquePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: entries }, { data: orderItems }, lang, { data: wineriesData }] = await Promise.all([
    supabase
      .from('stock_entries')
      .select('id, qty_purchased, qty_remaining, purchase_price, list_price, storage_location, purchase_date, notes, wines(id, winery_id, name, vintage, type, sku, grape, country, region, volume_ml, bottles_per_case, characteristics, consumer_price, min_stock, image_url, wineries(name))')
      .order('purchase_date', { ascending: false }),
    supabase
      .from('order_items')
      .select('wine_id, quantity, wines(id, name, vintage, type), orders(order_date)'),
    getLang(),
    supabase.from('wineries').select('id, name').order('name'),
  ])

  const rows = ((entries ?? []) as unknown) as {
    id: string
    qty_purchased: number
    qty_remaining: number
    purchase_price: number
    list_price: number | null
    storage_location: string
    purchase_date: string
    notes: string | null
    wines: {
      id: string; winery_id: string | null; name: string; vintage: number | null; type: string; sku: string | null
      grape: string | null; country: string | null; region: string | null
      volume_ml: number | null; bottles_per_case: number | null; characteristics: string | null
      consumer_price: number | null; min_stock: number | null; image_url: string | null
      wineries: { name: string } | null
    } | null
  }[]

  const wineries = (wineriesData ?? []) as { id: string; name: string }[]

  // Build last-6-months labels
  const now = new Date()
  const months6: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months6.push(d.toISOString().slice(0, 7))
  }

  // Aggregate top sellers from order_items
  type OItem = { wine_id: string; quantity: number; wines: { id: string; name: string; vintage: number | null; type: string } | null; orders: { order_date: string | null } | null }
  const orderItemsTyped = ((orderItems ?? []) as unknown as OItem[])
  const salesMap = new Map<string, { wine_name: string; vintage: number | null; wine_type: string; total_sold: number }>()
  const monthlyMap = new Map<string, Record<string, number>>()
  for (const item of orderItemsTyped) {
    if (!item.wine_id || !item.wines) continue
    const existing = salesMap.get(item.wine_id)
    if (existing) {
      existing.total_sold += item.quantity
    } else {
      salesMap.set(item.wine_id, {
        wine_name: item.wines.name,
        vintage: item.wines.vintage,
        wine_type: item.wines.type,
        total_sold: item.quantity,
      })
    }
    const month = item.orders?.order_date?.slice(0, 7)
    if (month && months6.includes(month)) {
      if (!monthlyMap.has(item.wine_id)) monthlyMap.set(item.wine_id, {})
      const wm = monthlyMap.get(item.wine_id)!
      wm[month] = (wm[month] ?? 0) + item.quantity
    }
  }
  const topSellers = [...salesMap.entries()]
    .map(([wine_id, v]) => ({
      wine_id, ...v,
      monthly_sales: months6.map(m => monthlyMap.get(wine_id)?.[m] ?? 0),
    }))
    .sort((a, b) => b.total_sold - a.total_sold)
    .slice(0, 5)

  // Build storage label map from actual data (so custom locations display correctly)
  const storageLabel: Record<string, string> = {
    casa_paulo: 'Casa Paulo',
    casa_otto:  'Casa Otto',
  }
  rows.forEach(r => {
    if (r.storage_location && !storageLabel[r.storage_location]) {
      storageLabel[r.storage_location] = r.storage_location.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }
  })

  const totalBottles = rows.reduce((s, r) => s + r.qty_remaining, 0)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-app-text">{t('st_title', lang)}</h1>
        <p className="text-sm text-app-text3">
          {new Date().toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'es-CL', { weekday: 'long', day: '2-digit', month: 'long' })}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-app-border px-5 py-12 text-center">
          <div className="mb-4 flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="text-app-border">
              <path d="M8 22h8M12 11v11M5 3h14l-1.68 8.39A4 4 0 0 1 13.4 15h-2.8a4 4 0 0 1-3.92-3.61Z"/>
            </svg>
          </div>
          <p className="text-app-text3 text-sm mb-4">{t('st_none', lang)}</p>
          <Link
            href="/dashboard/estoque/novo"
            className="inline-block bg-wine-600 hover:bg-wine-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            {t('st_new', lang)}
          </Link>
        </div>
      ) : (
        <StockListClient
          rows={rows}
          topSellers={topSellers}
          lang={lang}
          storageLabel={storageLabel}
          wineTypeLabel={wineTypeLabel}
          wineries={wineries}
        />
      )}
    </div>
  )
}
