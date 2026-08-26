'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

async function makeClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function login(_state: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Preencha todos os campos. / Completa todos los campos.' }
  }

  const supabase = await makeClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email ou senha incorretos. / Email o contraseña incorrectos.' }
  }

  return { success: true }
}

export async function logout() {
  const supabase = await makeClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function register(_state: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!email || !password) return { error: 'Completa todos los campos.' }
  if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  if (password !== confirm) return { error: 'Las contraseñas no coinciden.' }

  const supabase = await makeClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }
  // Return success so the client can redirect (avoids stream conflict with redirect())
  return { success: true }
}

export async function resetPassword(_state: unknown, formData: FormData) {
  const email = formData.get('email') as string
  if (!email) return { error: 'Ingresa tu email.' }

  const hdrs = await headers()
  const origin = hdrs.get('origin') ?? hdrs.get('x-forwarded-host') ?? 'http://localhost:3000'
  const redirectTo = `${origin}/update-password`

  const supabase = await makeClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) return { error: error.message }
  return { success: true }
}

export async function updatePassword(_state: unknown, formData: FormData) {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!password) return { error: 'Ingresa una nueva contraseña.' }
  if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  if (password !== confirm) return { error: 'Las contraseñas no coinciden.' }

  const supabase = await makeClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }
  return { success: true }
}
