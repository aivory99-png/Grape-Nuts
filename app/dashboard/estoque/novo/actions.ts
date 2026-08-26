'use server'

import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const adminClient = getAdminClient

async function getUserAndOrg(): Promise<{ userId: string; orgId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!data?.organization_id) return null
  return { userId: user.id, orgId: data.organization_id }
}

export async function createWinery(name: string): Promise<{ id: string; name: string } | null> {
  const ctx = await getUserAndOrg()
  if (!ctx) { console.error('createWinery: no orgId'); return null }
  const admin = adminClient()
  const { data, error } = await admin.from('wineries').insert({ name, organization_id: ctx.orgId }).select('id, name').single()
  if (error) { console.error('[estoque/novo] createWinery:', error?.code); return null }
  return data
}

export async function addStockEntry(data: {
  wine_name: string
  vintage: string
  wine_type: string
  sku: string
  winery_id?: string
  grape: string
  country: string
  region: string
  volume_ml: string
  bottles_per_case: string
  characteristics: string
  qty: string
  purchase_price: string
  list_price: string
  storage_location: string
  purchase_date: string
  notes: string
  min_stock: string
  image_url?: string
}): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getUserAndOrg()
  if (!ctx) return { error: 'Organização não encontrada.' }

  const admin = adminClient()
  const { orgId } = ctx

  // Resolve winery in parallel with nothing (fast path: winery_id already provided)
  let wineryId = data.winery_id
  if (!wineryId) {
    const { data: winery } = await admin
      .from('wineries')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1)
      .maybeSingle()

    if (winery) {
      wineryId = winery.id
    } else {
      const { data: newWinery } = await admin.from('wineries').insert({
        name: 'Mi Bodega',
        organization_id: orgId,
      }).select('id').single()
      if (!newWinery) return { error: 'Error al obtener la bodega.' }
      wineryId = newWinery.id
    }
  }

  const wineInsert: Record<string, unknown> = {
    winery_id:       wineryId,
    organization_id: orgId,
    name:            data.wine_name,
    vintage:         data.vintage ? parseInt(data.vintage) : null,
    type:            data.wine_type || 'tinto',
    sku:             data.sku || null,
    grape:           data.grape || null,
    country:         data.country || null,
    region:          data.region || null,
    characteristics: data.characteristics || null,
    volume_ml:       data.volume_ml ? parseInt(data.volume_ml) : null,
    bottles_per_case: data.bottles_per_case ? parseInt(data.bottles_per_case) : null,
    min_stock:       data.min_stock ? parseInt(data.min_stock) : null,
    image_url:       data.image_url || null,
  }

  const { data: wine, error: wineErr } = await admin.from('wines').insert(wineInsert).select('id').single()
  if (wineErr || !wine) {
    console.error('[estoque/novo] wine insert:', wineErr?.code)
    return { error: 'Erro ao criar vinho.' }
  }

  const qty = parseInt(data.qty) || 0
  const { error: stockErr } = await admin.from('stock_entries').insert({
    wine_id:          wine.id,
    winery_id:        wineryId,
    organization_id:  orgId,
    qty_purchased:    qty,
    qty_remaining:    qty,
    purchase_price:   parseFloat(data.purchase_price) || 0,
    list_price:       data.list_price ? parseFloat(data.list_price) : null,
    storage_location: data.storage_location || 'casa_paulo',
    purchase_date:    data.purchase_date || new Date().toISOString().split('T')[0],
    notes:            data.notes || null,
  })

  if (stockErr) {
    console.error('[estoque/novo] stock insert:', stockErr?.code)
    await admin.from('wines').delete().eq('id', wine.id)
    return { error: 'Erro ao criar entrada de estoque.' }
  }

  revalidatePath('/dashboard/estoque')
  return { success: true }
}

export async function updateFullEntry(
  entryId: string,
  wineId: string,
  data: {
    wine_name: string
    vintage: string
    wine_type: string
    sku: string
    winery_id?: string
    grape: string
    country: string
    region: string
    volume_ml: string
    bottles_per_case: string
    characteristics: string
    qty_purchased?: string
    qty_remaining: string
    purchase_price: string
    list_price: string
    storage_location: string
    purchase_date: string
    notes: string
    min_stock: string
    image_url?: string
  }
): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getUserAndOrg()
  if (!ctx) return { error: 'Organização não encontrada.' }

  const admin = adminClient()

  // Verify the stock entry belongs to the caller's organization before mutating (CN-004)
  const { data: entryOwnerCheck } = await admin
    .from('stock_entries')
    .select('organization_id, wine_id')
    .eq('id', entryId)
    .single()
  if (!entryOwnerCheck || entryOwnerCheck.organization_id !== ctx.orgId) {
    return { error: 'Acesso negado.' }
  }

  const newQty = data.qty_remaining ? parseInt(data.qty_remaining) : 0
  const newQtyPurchased = data.qty_purchased ? parseInt(data.qty_purchased) : undefined

  const wineUpdate: Record<string, unknown> = {
    name:             data.wine_name,
    vintage:          data.vintage ? parseInt(data.vintage) : null,
    type:             data.wine_type || 'tinto',
    sku:              data.sku || null,
    grape:            data.grape || null,
    country:          data.country || null,
    region:           data.region || null,
    characteristics:  data.characteristics || null,
    volume_ml:        data.volume_ml ? parseInt(data.volume_ml) : null,
    bottles_per_case: data.bottles_per_case ? parseInt(data.bottles_per_case) : null,
    min_stock:        data.min_stock ? parseInt(data.min_stock) : null,
  }
  if (data.winery_id) wineUpdate.winery_id = data.winery_id
  if (data.image_url !== undefined) wineUpdate.image_url = data.image_url

  // Run both updates in parallel
  const [wineResult, entryResult] = await Promise.all([
    admin.from('wines').update(wineUpdate).eq('id', entryOwnerCheck.wine_id),
    admin.from('stock_entries').update({
      ...(newQtyPurchased !== undefined ? { qty_purchased: newQtyPurchased } : {}),
      qty_remaining:    newQty,
      purchase_price:   parseFloat(data.purchase_price) || 0,
      list_price:       data.list_price ? parseFloat(data.list_price) : null,
      storage_location: data.storage_location || 'casa_paulo',
      purchase_date:    data.purchase_date,
      notes:            data.notes || null,
    }).eq('id', entryId),
  ])

  if (wineResult.error) { console.error('[estoque/novo] updateFullEntry wine:', wineResult.error?.code); return { error: 'Erro ao atualizar vinho.' } }
  if (entryResult.error) { console.error('[estoque/novo] updateFullEntry entry:', entryResult.error?.code); return { error: 'Erro ao atualizar entrada.' } }

  revalidatePath('/dashboard/estoque', 'page')
  revalidatePath('/dashboard/estoque', 'layout')
  return { success: true }
}
