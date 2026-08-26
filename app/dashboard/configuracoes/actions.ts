'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

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
    console.error(error)
    return { error: error.message }
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

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [profileRes, metaRes] = await Promise.all([
    admin.from('user_profiles').update({ name: name.trim() }).eq('id', sellerId),
    admin.auth.admin.updateUserById(sellerId, {
      user_metadata: { name: name.trim(), phone: opts?.phone ?? '', notes: opts?.notes ?? '' },
    }),
  ])

  if (profileRes.error) {
    console.error(profileRes.error)
    return { error: profileRes.error.message }
  }
  if (metaRes.error) {
    console.error(metaRes.error)
  }

  revalidatePath('/dashboard/configuracoes')
  revalidatePath('/dashboard/vendas')
  return { success: true }
}

export async function deleteSeller(sellerId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error } = await admin
    .from('user_profiles')
    .update({ active: false })
    .eq('id', sellerId)

  if (error) {
    console.error(error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/configuracoes')
  revalidatePath('/dashboard/vendas')
  return { success: true }
}
