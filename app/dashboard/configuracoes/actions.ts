'use server'

import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getOrgId } from '@/lib/get-org-id'

const adminClient = getAdminClient

export async function updateProfile(data: {
  name: string
  preferred_seller_id?: string | null
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const update: Record<string, unknown> = { name: data.name.trim() }
  if (data.preferred_seller_id !== undefined) {
    update.preferred_seller_id = data.preferred_seller_id || null
  }

  const { error } = await supabase
    .from('user_profiles')
    .update(update)
    .eq('id', user.id)

  if (error) {
    console.error('[configuracoes] profile update:', error?.code)
    return { error: 'Erro ao atualizar perfil.' }
  }

  revalidatePath('/dashboard/configuracoes')
  return { success: true }
}

export async function updateSeller(
  sellerId: string,
  name: string,
  opts?: { phone?: string; notes?: string }
): Promise<{ success?: boolean; error?: string }> {
  if (!name.trim()) return { error: 'Nome obrigatório.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: callerProfile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'admin') return { error: 'Acesso negado.' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'Organização não encontrada.' }

  // Verify target seller belongs to caller's organization (CN-006)
  const admin = adminClient()
  const { data: sellerProfile } = await admin
    .from('user_profiles')
    .select('organization_id')
    .eq('id', sellerId)
    .single()
  if (sellerProfile?.organization_id !== orgId) return { error: 'Acesso negado.' }

  const [profileRes, metaRes] = await Promise.all([
    admin.from('user_profiles').update({ name: name.trim() }).eq('id', sellerId),
    admin.auth.admin.updateUserById(sellerId, {
      user_metadata: { name: name.trim(), phone: opts?.phone ?? '', notes: opts?.notes ?? '' },
    }),
  ])

  if (profileRes.error) {
    console.error('[configuracoes] seller profile update:', profileRes.error?.code)
    return { error: 'Erro ao atualizar vendedor.' }
  }
  if (metaRes.error) {
    console.error('[configuracoes] seller meta update:', metaRes.error?.code)
  }

  revalidatePath('/dashboard/configuracoes')
  revalidatePath('/dashboard/vendas')
  return { success: true }
}

export async function deleteSeller(sellerId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: callerProfile } = await supabase
    .from('user_profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'admin') return { error: 'Acesso negado.' }

  const orgId = await getOrgId()
  if (!orgId) return { error: 'Organização não encontrada.' }

  // Verify target seller belongs to caller's organization (CN-006)
  const admin = adminClient()
  const { data: sellerProfile } = await admin
    .from('user_profiles')
    .select('organization_id')
    .eq('id', sellerId)
    .single()
  if (sellerProfile?.organization_id !== orgId) return { error: 'Acesso negado.' }

  const { error } = await admin
    .from('user_profiles')
    .update({ active: false })
    .eq('id', sellerId)

  if (error) {
    console.error('[configuracoes] seller deactivate:', error?.code)
    return { error: 'Erro ao desativar vendedor.' }
  }

  revalidatePath('/dashboard/configuracoes')
  revalidatePath('/dashboard/vendas')
  return { success: true }
}
