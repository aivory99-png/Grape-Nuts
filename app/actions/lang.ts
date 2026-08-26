'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import type { Lang } from '@/lib/i18n'

export async function setLangAction(lang: Lang) {
  // Save to cookie (fast, works for non-authenticated pages)
  const store = await cookies()
  store.set('lang', lang, { path: '/', maxAge: 60 * 60 * 24 * 365 })

  // Save to DB so the preference follows the user across devices/browsers
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const admin = getAdminClient()
      await admin.from('user_profiles').update({ lang }).eq('id', user.id)
    }
  } catch {
    // cookie fallback is enough
  }

  revalidatePath('/', 'layout')
}
