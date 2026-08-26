import { cookies } from 'next/headers'

export type Theme = 'dark' | 'light'

export async function getTheme(): Promise<Theme> {
  const store = await cookies()
  const val = store.get('theme')?.value
  return val === 'light' ? 'light' : 'dark'
}
