import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavShell from './nav-shell'
import { getLang } from '@/lib/lang'
import { getTheme } from '@/lib/theme'
import type { UserProfile } from '@/lib/types'

export default async function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, lang, theme] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('id', user.id).single(),
    getLang(),
    getTheme(),
  ])

  return (
    <NavShell user={profile as UserProfile | null} lang={lang} theme={theme}>
      {children}
    </NavShell>
  )
}
