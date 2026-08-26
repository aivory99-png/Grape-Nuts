'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/get-org-id'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateClient(id: string, data: {
  name: string
  city: string
  phone: string
  website: string
  email: string
  contact_name: string
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

  const { error } = await supabase.from('clients').update({
    name: data.name,
    city: data.city || null,
    phone: data.phone || null,
    website: data.website || null,
    email: data.email || null,
    contact_name: data.contact_name || null,
    type: dbType,
    responsible_id: data.responsible_id || null,
    notes: data.notes || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('organization_id', orgId)

  if (error) {
    console.error(error)
    return { error: 'Erro ao atualizar cliente.' }
  }

  revalidatePath('/dashboard/clientes')
  revalidatePath(`/dashboard/clientes/${id}`)
  return { success: true }
}

export async function deleteClient(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const orgId = await getOrgId()
  if (!orgId) return

  await supabase.from('clients').update({ active: false }).eq('id', id).eq('organization_id', orgId)
  revalidatePath('/dashboard/clientes')
  redirect('/dashboard/clientes')
}
