import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Lang } from './i18n'

export async function getLang(): Promise<Lang> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('user_profiles')
        .select('lang')
        .eq('id', user.id)
        .single()
      if (data?.lang === 'es' || data?.lang === 'pt') return data.lang
    }
  } catch {
    // fall through to cookie
  }
  const store = await cookies()
  const val = store.get('lang')?.value
  return val === 'es' ? 'es' : 'pt'
}
