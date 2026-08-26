'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function setupAdmin(_state: unknown, formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!name || !email || !password) {
    return { error: 'Completa todos los campos.' }
  }
  if (password.length < 6) {
    return { error: 'La contraseña necesita al menos 6 caracteres.' }
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Check if any admin already exists
  const { data: existing } = await admin.from('user_profiles').select('id').eq('role', 'admin').limit(1)
  if (existing && existing.length > 0) {
    return { error: 'El sistema ya tiene un administrador. Inicia sesión.' }
  }

  // Create user
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (createError) {
    return { error: `Error: ${createError.message}` }
  }
  if (!created.user) {
    return { error: 'Error al crear la cuenta. Inténtalo de nuevo.' }
  }

  // Upsert profile as admin — organization_id = own id
  await admin.from('user_profiles').upsert({
    id: created.user.id,
    name,
    email,
    role: 'admin',
    organization_id: created.user.id,
    permissions: {
      clientes:      { ver: true, crear: true, editar: true },
      estoque:       { ver: true, crear: true, editar: true },
      vendas:        { ver: true, crear: true },
      cobrancas:     { ver: true },
      configuracoes: { ver: true },
    },
  }, { onConflict: 'id' })

  // Create a default winery for this org so stock entry works from day one
  await admin.from('wineries').insert({
    name:            name + ' Wines',
    organization_id: created.user.id,
  })

  // Sign in immediately
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.signInWithPassword({ email, password })
  redirect('/dashboard')
}
