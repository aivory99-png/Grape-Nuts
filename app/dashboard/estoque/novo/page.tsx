import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StockForm from './stock-form'

export default async function NovoEstoquePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [lang, { data: countryRows }, { data: grapeRows }, { data: regionRows }, { data: wineryRows }] = await Promise.all([
    getLang(),
    supabase.from('wines').select('country').not('country', 'is', null).order('country'),
    supabase.from('wines').select('grape').not('grape', 'is', null).order('grape'),
    supabase.from('wines').select('region').not('region', 'is', null).order('region'),
    supabase.from('wineries').select('id, name').order('name'),
  ])

  const uniq = <T,>(rows: { [k: string]: T | null }[] | null, key: string) =>
    [...new Set((rows ?? []).map(r => r[key]).filter(Boolean) as T[])]

  const existingCountries = uniq<string>(countryRows, 'country')
  const existingGrapes    = uniq<string>(grapeRows,   'grape')
  const existingRegions   = uniq<string>(regionRows,  'region')
  const wineries = (wineryRows ?? []) as { id: string; name: string }[]

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-app-text">{t('st_new_title', lang)}</h1>
      </div>
      <StockForm
        lang={lang}
        existingCountries={existingCountries}
        existingGrapes={existingGrapes}
        existingRegions={existingRegions}
        wineries={wineries}
      />
    </div>
  )
}
