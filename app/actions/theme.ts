'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Theme } from '@/lib/theme'

export async function setThemeAction(theme: Theme) {
  const store = await cookies()
  store.set('theme', theme, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  revalidatePath('/', 'layout')
}
