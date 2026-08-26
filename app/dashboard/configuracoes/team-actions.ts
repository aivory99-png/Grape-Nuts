'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function inviteTeamMember(data: {
  name: string
  email: string
  role: string
  permissions: Record<string, Record<string, boolean>>
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Check caller is admin
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Solo el admin puede invitar.' }

  const admin = getAdmin()

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback`,
      data: { name: data.name },
    }
  )

  if (inviteError) {
    if (inviteError.message.includes('already')) {
      return { error: 'Este email ya está registrado.' }
    }
    return { error: `Error: ${inviteError.message}` }
  }

  if (invited.user) {
    await admin.from('user_profiles').upsert({
      id: invited.user.id,
      name: data.name,
      email: data.email,
      role: data.role,
      permissions: data.permissions,
    }, { onConflict: 'id' })
  }

  revalidatePath('/dashboard/configuracoes')
  return { success: true }
}

export async function updateMemberPermissions(data: {
  userId: string
  role: string
  permissions: Record<string, Record<string, boolean>>
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Solo el admin puede editar permisos.' }

  const admin = getAdmin()
  const { error } = await admin.from('user_profiles').update({
    role: data.role,
    permissions: data.permissions,
  }).eq('id', data.userId)

  if (error) return { error: 'Error al actualizar permisos.' }
  revalidatePath('/dashboard/configuracoes')
  return { success: true }
}

export async function removeMember(userId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  if (user.id === userId) return { error: 'No puedes eliminarte a ti mismo.' }

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Solo el admin puede eliminar usuarios.' }

  const admin = getAdmin()
  await admin.auth.admin.deleteUser(userId)
  revalidatePath('/dashboard/configuracoes')
  return { success: true }
}
