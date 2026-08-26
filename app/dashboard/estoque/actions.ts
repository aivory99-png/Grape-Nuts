'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getOrgId } from '@/lib/get-org-id'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function updateStockEntry(
  id: string,
  data: {
    qty_remaining: number
    purchase_price: number
    list_price: number | null
    storage_location: string
    wineId?: string
    minStock?: number | null
  }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { error } = await admin()
    .from('stock_entries')
    .update({
      qty_remaining:    data.qty_remaining,
      purchase_price:   data.purchase_price,
      list_price:       data.list_price,
      storage_location: data.storage_location,
    })
    .eq('id', id)

  if (error) { console.error(error); return { error: error.message } }

  if (data.wineId !== undefined) {
    await admin()
      .from('wines')
      .update({ min_stock: data.minStock ?? null })
      .eq('id', data.wineId)
  }

  revalidatePath('/dashboard/estoque')
  return { success: true }
}

export async function addRestockEntry(
  existingEntryId: string,
  data: {
    qty: number
    purchase_price: number
    list_price: number | null
    storage_location: string
    purchase_date: string
  }
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const orgId = await getOrgId()

  const { data: existing } = await admin()
    .from('stock_entries')
    .select('wine_id, winery_id, organization_id, purchase_price, list_price, storage_location, qty_purchased, qty_remaining')
    .eq('id', existingEntryId)
    .single()

  if (!existing) return { error: 'Entrada não encontrada.' }

  // If price hasn't changed, add to existing entry instead of creating a new row
  const priceMatches =
    existing.purchase_price === data.purchase_price &&
    (existing.list_price ?? null) === (data.list_price ?? null) &&
    existing.storage_location === data.storage_location

  if (priceMatches) {
    const { error } = await admin()
      .from('stock_entries')
      .update({
        qty_purchased: existing.qty_purchased + data.qty,
        qty_remaining: existing.qty_remaining + data.qty,
      })
      .eq('id', existingEntryId)
    if (error) { console.error(error); return { error: error.message } }
    revalidatePath('/dashboard/estoque')
    return { success: true }
  }

  const { error } = await admin().from('stock_entries').insert({
    wine_id:          existing.wine_id,
    winery_id:        existing.winery_id,
    organization_id:  existing.organization_id ?? orgId,
    qty_purchased:    data.qty,
    qty_remaining:    data.qty,
    purchase_price:   data.purchase_price,
    list_price:       data.list_price,
    storage_location: data.storage_location,
    purchase_date:    data.purchase_date,
  })

  if (error) { console.error(error); return { error: error.message } }
  revalidatePath('/dashboard/estoque')
  return { success: true }
}

export async function getStockEntryDependencies(
  id: string
): Promise<{ orderItemCount: number }> {
  const { count } = await admin()
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('stock_entry_id', id)
  return { orderItemCount: count ?? 0 }
}

export async function deleteStockEntry(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  // Fetch the wine_id before deleting so we can clean up the wine record too
  const { data: entry } = await admin()
    .from('stock_entries')
    .select('wine_id')
    .eq('id', id)
    .single()

  // Delete associated order_items first (cascade)
  await admin().from('order_items').delete().eq('stock_entry_id', id)

  const { error } = await admin().from('stock_entries').delete().eq('id', id)
  if (error) { console.error('deleteStockEntry error:', error); return { error: error.message } }

  // If no other stock entries reference this wine, delete the wine too
  if (entry?.wine_id) {
    const { count } = await admin()
      .from('stock_entries')
      .select('id', { count: 'exact', head: true })
      .eq('wine_id', entry.wine_id)
    if (count === 0) {
      await admin().from('wines').delete().eq('id', entry.wine_id)
    }
  }

  revalidatePath('/dashboard/estoque')
  return { success: true }
}
