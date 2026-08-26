'use server'

import { getAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const getAdmin = getAdminClient

export async function inviteTeamMember(data: {
  name: string
  email: string
  role: string
  permissions: Record<string, Record<string, boolean>>
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  // Fetch caller's role and organization_id together
  const { data: profile } = await supabase
    .from('user_profiles').select('role, organization_id').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Solo el admin puede invitar.' }

  const orgId = profile?.organization_id
  if (!orgId) return { error: 'Organização não encontrada.' }

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
    console.error('[team] invite:', inviteError?.code)
    return { error: 'Erro ao convidar membro.' }
  }

  if (invited.user) {
    await admin.from('user_profiles').upsert({
      id: invited.user.id,
      name: data.name,
      email: data.email,
      role: data.role,
      permissions: data.permissions,
      organization_id: orgId,  // CN-008: assign invited member to caller's org
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

  // Fetch caller's role and organization_id together
  const { data: profile } = await supabase
    .from('user_profiles').select('role, organization_id').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Solo el admin puede editar permisos.' }

  const orgId = profile?.organization_id
  if (!orgId) return { error: 'Organização não encontrada.' }

  // Verify target user belongs to same organization (CN-007)
  const admin = getAdmin()
  const { data: targetProfile } = await admin
    .from('user_profiles').select('organization_id').eq('id', data.userId).single()
  if (targetProfile?.organization_id !== orgId) return { error: 'Acesso negado.' }

  const { error } = await admin.from('user_profiles').update({
    role: data.role,
    permissions: data.permissions,
  }).eq('id', data.userId)

  if (error) { console.error('[team] permissions update:', error?.code); return { error: 'Erro ao atualizar permissões.' } }
  revalidatePath('/dashboard/configuracoes')
  return { success: true }
}

export async function removeMember(userId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  if (user.id === userId) return { error: 'No puedes eliminarte a ti mismo.' }

  // Fetch caller's role and organization_id together
  const { data: profile } = await supabase
    .from('user_profiles').select('role, organization_id').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Solo el admin puede eliminar usuarios.' }

  const orgId = profile?.organization_id
  if (!orgId) return { error: 'Organização não encontrada.' }

  // Verify target user belongs to same organization (CN-007)
  const admin = getAdmin()
  const { data: targetProfile } = await admin
    .from('user_profiles').select('organization_id').eq('id', userId).single()
  if (targetProfile?.organization_id !== orgId) return { error: 'Acesso negado.' }

  await admin.auth.admin.deleteUser(userId)
  revalidatePath('/dashboard/configuracoes')
  return { success: true }
}
