import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'
import SalesForm from './sales-form'

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { client: defaultClientId } = await searchParams

  const [{ data: clients }, { data: wines }, { data: stock }, { data: members }, lang] = await Promise.all([
    supabase.from('clients').select('id, name, city, type, responsible_id').neq('type', 'prospect').order('name'),
    supabase.from('wines').select('id, name, vintage, type, bottles_per_case').order('name'),
    supabase.from('stock_entries').select('wine_id, qty_remaining, list_price').order('purchase_date', { ascending: false }),
    supabase.from('user_profiles').select('id, name').eq('active', true).order('name'),
    getLang(),
  ])

  // Aggregate stock and grab latest list_price per wine
  const stockByWine: Record<string, { qty: number; list_price: number | null }> = {}
  for (const entry of stock ?? []) {
    const existing = stockByWine[entry.wine_id]
    if (existing) {
      existing.qty += entry.qty_remaining ?? 0
      if (existing.list_price == null && entry.list_price != null) existing.list_price = entry.list_price
    } else {
      stockByWine[entry.wine_id] = { qty: entry.qty_remaining ?? 0, list_price: entry.list_price ?? null }
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-app-text">{t('sale_title', lang)}</h1>
        <p className="text-sm text-app-text3">{t('sale_sub', lang)}</p>
      </div>

      <SalesForm
          clients={clients ?? []}
          wines={(wines ?? []).filter(w => stockByWine[w.id] !== undefined).map((w) => ({
            ...w,
            stock: stockByWine[w.id]?.qty ?? 0,
            list_price: stockByWine[w.id]?.list_price ?? null,
          }))}
          members={members ?? []}
          lang={lang}
          defaultClientId={defaultClientId}
        />
    </div>
  )
}
