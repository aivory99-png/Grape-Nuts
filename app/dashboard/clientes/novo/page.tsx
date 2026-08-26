import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'
import ClientForm from './client-form'

export default async function NovoClientePage() {
  const supabase = await createClient()
  const [{ data: members }, { data: cityRows }, lang] = await Promise.all([
    supabase.from('user_profiles').select('id, name').eq('active', true).order('name'),
    supabase.from('clients').select('city').not('city', 'is', null).order('city'),
    getLang(),
  ])
  const existingCities = [...new Set((cityRows ?? []).map((r: { city: string | null }) => r.city).filter(Boolean) as string[])]

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-app-text">{t('cl_new_title', lang)}</h1>
        <p className="text-sm text-app-text3">
          {lang === 'pt' ? 'Preencha os dados do novo cliente' : 'Completa los datos del nuevo cliente'}
        </p>
      </div>
      <ClientForm lang={lang} members={members ?? []} existingCities={existingCities} />
    </div>
  )
}
