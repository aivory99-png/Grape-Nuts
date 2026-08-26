'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function register(_state: unknown, formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!name || !email || !password) {
    return { error: 'Preencha todos os campos. / Completa todos los campos.' }
  }

  if (password.length < 6) {
    return { error: 'A senha precisa ter ao menos 6 caracteres.' }
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (createError) {
    if (
      createError.message.toLowerCase().includes('already') ||
      createError.message.toLowerCase().includes('exists')
    ) {
      return { error: 'Este email já está cadastrado. / Este email ya está registrado.' }
    }
    return { error: `Erro ao criar conta: ${createError.message}` }
  }

  if (!created.user) {
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  // Upsert profile — admin owns their own org
  await admin.from('user_profiles').upsert({
    id: created.user.id,
    name,
    email,
    role: 'admin',
    organization_id: created.user.id,
  }, { onConflict: 'id' })

  // Create default winery for this org
  await admin.from('wineries').insert({
    name:            name + ' Wines',
    organization_id: created.user.id,
  })

  // Sign in
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

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

  if (signInError) {
    redirect('/login?created=1')
  }

  redirect('/dashboard')
}
