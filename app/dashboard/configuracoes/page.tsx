import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getLang } from '@/lib/lang'
import { t } from '@/lib/i18n'
import ProfileForm from './profile-form'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [{ data: profile }, { data: sellerRows }, { data: authData }, lang] = await Promise.all([
    supabase.from('user_profiles').select('name, role, email, preferred_seller_id').eq('id', user.id).single(),
    supabase.from('user_profiles').select('id, name').eq('role', 'seller').eq('active', true).order('name'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    getLang(),
  ])

  const metaById = new Map(
    (authData?.users ?? []).map(u => [u.id, (u.user_metadata ?? {}) as { phone?: string; notes?: string }])
  )

  const sellers = (sellerRows ?? []).map(s => ({
    ...s,
    phone: metaById.get(s.id)?.phone ?? null,
    notes: metaById.get(s.id)?.notes ?? null,
  }))

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto space-y-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-app-text">{t('cfg_title', lang)}</h1>
        <p className="text-sm text-app-text3">{t('cfg_sub', lang)}</p>
      </div>

      <ProfileForm
        name={profile?.name ?? ''}
        email={profile?.email ?? user.email ?? ''}
        sellers={sellers as { id: string; name: string; phone?: string | null; notes?: string | null }[]}
        lang={lang}
      />
    </div>
  )
}
