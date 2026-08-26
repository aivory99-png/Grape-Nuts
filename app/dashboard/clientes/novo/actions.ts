'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getOrgId } from '@/lib/get-org-id'

export async function createClient_(data: {
  name: string
  email: string
  city: string
  phone: string
  client_type: string
  responsible_id: string
  is_prospect: boolean
  notes: string
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'Organização não encontrada.' }

  const dbType = data.is_prospect ? 'prospect' : (data.client_type || null)

  const { error } = await supabase.from('clients').insert({
    name: data.name,
    email: data.email || null,
    city: data.city || null,
    phone: data.phone || null,
    type: dbType,
    responsible_id: data.responsible_id || null,
    notes: data.notes || null,
    organization_id: orgId,
  })

  if (error) {
    console.error(error)
    return { error: 'Erro ao salvar cliente.' }
  }

  revalidatePath('/dashboard/clientes')
  return { success: true }
}

export async function addClientType(label: string): Promise<{ value?: string; label?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Acesso negado.' }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const slug = label.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 50)

  if (!slug) return { error: 'Nome inválido.' }

  const { error } = await admin.rpc('add_client_type_value', { new_value: slug })
  if (error) { console.error(error); return { error: 'Erro ao criar tipo.' } }

  return { value: slug, label: label.trim() }
}

export async function createSeller(
  name: string,
  opts?: { phone?: string; notes?: string }
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'Organização não encontrada.' }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Auto-generate a unique internal email (sellers don't need login access)
  const fakeEmail = `seller_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@noreply.internal`

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: fakeEmail,
    email_confirm: true,
    user_metadata: { name: name.trim(), phone: opts?.phone ?? '', notes: opts?.notes ?? '' },
  })

  if (authError) {
    console.error('auth createUser error:', authError)
    if (authError.message?.toLowerCase().includes('already')) {
      return { error: 'Este email ya está registrado.' }
    }
    return { error: authError.message ?? 'Error al crear usuario.' }
  }

  const newId = authData.user.id

  const { error: profileError } = await admin.from('user_profiles').upsert({
    id:              newId,
    name:            name.trim(),
    email:           fakeEmail,
    role:            'seller',
    organization_id: orgId,
  }, { onConflict: 'id' })

  if (profileError) {
    console.error('profile upsert error:', profileError)
    // Auth user was created, still return the id so the seller is selectable
  }

  revalidatePath('/dashboard/clientes')
  return { id: newId }
}
