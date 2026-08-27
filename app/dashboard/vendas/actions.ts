'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getOrgId } from '@/lib/get-org-id'

type OrderItem = { wine_id: string; quantity: number; sale_price: number; unit?: 'botella' | 'caja'; bottles_per_case?: number | null }

const VALID_PAYMENT_TERMS = new Set(['avista', '30_dias', '60_dias'])

export async function createOrder(data: {
  clientId: string
  sellerId: string
  paymentType: string
  paymentTerm: string
  paymentCategory?: string
  carrier?: string
  items: OrderItem[]
  notes: string
  orderDate?: string
}): Promise<{ success?: boolean; error?: string; orderId?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado.' }

    const orgId = await getOrgId()
    if (!orgId) return { error: 'Organização não encontrada.' }

    const wineIds = data.items.map((i) => i.wine_id)

    // Get latest stock entry per wine for price + decrement
    const { data: stockEntries } = await supabase
      .from('stock_entries')
      .select('id, wine_id, purchase_price, qty_remaining')
      .in('wine_id', wineIds)
      .order('purchase_date', { ascending: false })

    const stockMap: Record<string, { id: string; purchase_price: number; qty_remaining: number }> = {}
    for (const entry of stockEntries ?? []) {
      if (!stockMap[entry.wine_id] && entry.qty_remaining > 0) {
        stockMap[entry.wine_id] = {
          id: entry.id,
          purchase_price: entry.purchase_price ?? 0,
          qty_remaining: entry.qty_remaining,
        }
      }
    }

    // Normalize quantities to bottles (stock is always stored in bottles)
    const normalizedItems = data.items.map(i => {
      const bpc = i.bottles_per_case ?? 1
      const qtyBottles = i.unit === 'caja' ? i.quantity * bpc : i.quantity
      // sale_price is per unit selected — normalize to per-bottle for storage
      const pricePerBottle = i.unit === 'caja' ? i.sale_price / bpc : i.sale_price
      return { ...i, qtyBottles, pricePerBottle }
    })

    const totalRevenue = normalizedItems.reduce((s, i) => s + i.qtyBottles * i.pricePerBottle, 0)

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_id:       data.clientId,
        seller_id:       data.sellerId || null,
        payment_type:     data.paymentType,
        payment_term:     VALID_PAYMENT_TERMS.has(data.paymentTerm) ? data.paymentTerm : 'avista',
        payment_category: data.paymentCategory || null,
        total_revenue:    totalRevenue,
        status:           'open',
        notes:            data.notes || null,
        order_date:       data.orderDate || new Date().toISOString().split('T')[0],
        organization_id:  orgId,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('[vendas] order insert:', orderError?.code)
      return { error: 'Erro ao criar pedido.' }
    }

    // Create order items (quantities and prices stored in bottles)
    const { error: itemsError } = await supabase.from('order_items').insert(
      normalizedItems.map((i) => ({
        order_id:       order.id,
        wine_id:        i.wine_id,
        stock_entry_id: stockMap[i.wine_id]?.id ?? null,
        quantity:       i.qtyBottles,
        sale_price:     i.pricePerBottle,
        purchase_price: stockMap[i.wine_id]?.purchase_price ?? 0,
      }))
    )

    if (itemsError) {
      console.error('[vendas] order_items insert:', itemsError?.code)
      return { error: 'Erro ao salvar itens.' }
    }

    // Decrement stock in bottles
    for (const item of normalizedItems) {
      const entry = stockMap[item.wine_id]
      if (entry) {
        const { error: stockErr } = await supabase
          .from('stock_entries')
          .update({ qty_remaining: Math.max(0, entry.qty_remaining - item.qtyBottles) })
          .eq('id', entry.id)
        if (stockErr) console.error('[vendas] stock decrement:', stockErr?.code)
      }
    }

    // Payment record — skip for prospect
    if (data.paymentType !== 'prospect') {
      const daysOffset = data.paymentTerm === '30_dias' ? 30 : data.paymentTerm === '60_dias' ? 60 : data.paymentTerm === '90_dias' ? 90 : 0
      const dueDate = new Date((data.orderDate || new Date().toISOString().split('T')[0]) + 'T12:00:00')
      dueDate.setDate(dueDate.getDate() + daysOffset)

      const { error: payErr } = await supabase.from('payments').insert({
        order_id: order.id,
        amount:   totalRevenue,
        due_date: dueDate.toISOString().split('T')[0],
        status:   'pending',
      })
      if (payErr) console.error('[vendas] payments insert:', payErr?.code)
    }

    // Delivery record — only if carrier provided
    if (data.carrier) {
      const { error: deliveryErr } = await supabase.from('deliveries').insert({
        order_id:     order.id,
        company_name: data.carrier,
        price:        0,
        paid:         false,
      })
      if (deliveryErr) console.error('[vendas] deliveries insert:', deliveryErr?.code)
    }

    revalidatePath('/dashboard/vendas')
    revalidatePath('/dashboard')
    return { success: true, orderId: order.id }
  } catch (err) {
    console.error('[vendas] createOrder:', err instanceof Error ? err.name : String(err))
    return { error: 'Erro inesperado ao processar pedido.' }
  }
}

export async function updateOrder(data: {
  orderId: string
  clientId: string
  sellerId: string
  paymentType: string
  paymentTerm: string
  paymentCategory?: string
  carrier?: string
  items: OrderItem[]
  notes: string
  orderDate: string
}): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado.' }

    const orgId = await getOrgId()
    if (!orgId) return { error: 'Organização não encontrada.' }

    // Pre-check ownership before any mutation (CN-003 TOCTOU fix)
    const { data: orderCheck } = await supabase
      .from('orders').select('id')
      .eq('id', data.orderId).eq('organization_id', orgId).single()
    if (!orderCheck) return { error: 'Pedido não encontrado ou acesso negado.' }

    // 1. Fetch current items to restore stock
    const { data: currentItems } = await supabase
      .from('order_items')
      .select('wine_id, quantity, stock_entry_id')
      .eq('order_id', data.orderId)

    // 2. Restore stock for old items
    for (const item of currentItems ?? []) {
      if (item.stock_entry_id) {
        const { data: entry } = await supabase
          .from('stock_entries').select('qty_remaining').eq('id', item.stock_entry_id).single()
        if (entry) {
          await supabase
            .from('stock_entries')
            .update({ qty_remaining: entry.qty_remaining + item.quantity })
            .eq('id', item.stock_entry_id)
        }
      }
    }

    // 3. Delete old items
    await supabase.from('order_items').delete().eq('order_id', data.orderId)

    // 4. Get stock map for new items
    const wineIds = data.items.map(i => i.wine_id)
    const { data: stockEntries } = await supabase
      .from('stock_entries')
      .select('id, wine_id, purchase_price, qty_remaining')
      .in('wine_id', wineIds)
      .order('purchase_date', { ascending: false })

    const stockMap: Record<string, { id: string; purchase_price: number; qty_remaining: number }> = {}
    for (const entry of stockEntries ?? []) {
      if (!stockMap[entry.wine_id] && entry.qty_remaining > 0) {
        stockMap[entry.wine_id] = {
          id: entry.id,
          purchase_price: entry.purchase_price ?? 0,
          qty_remaining: entry.qty_remaining,
        }
      }
    }

    const totalRevenue = data.items.reduce((s, i) => s + i.quantity * i.sale_price, 0)

    // 5. Insert new items
    if (data.items.length > 0) {
      await supabase.from('order_items').insert(
        data.items.map(i => ({
          order_id:       data.orderId,
          wine_id:        i.wine_id,
          stock_entry_id: stockMap[i.wine_id]?.id ?? null,
          quantity:       i.quantity,
          sale_price:     i.sale_price,
          purchase_price: stockMap[i.wine_id]?.purchase_price ?? 0,
        }))
      )
      // 6. Decrement stock
      for (const item of data.items) {
        const entry = stockMap[item.wine_id]
        if (entry) {
          await supabase
            .from('stock_entries')
            .update({ qty_remaining: Math.max(0, entry.qty_remaining - item.quantity) })
            .eq('id', entry.id)
        }
      }
    }

    // 7. Update order
    const validTerms = new Set(['avista', '30_dias', '60_dias'])
    const { error: orderErr } = await supabase.from('orders').update({
      client_id:        data.clientId,
      seller_id:        data.sellerId || null,
      payment_type:     data.paymentType,
      payment_term:     validTerms.has(data.paymentTerm) ? data.paymentTerm : 'avista',
      payment_category: data.paymentCategory || null,
      total_revenue:    totalRevenue,
      notes:            data.notes || null,
      order_date:       data.orderDate,
    }).eq('id', data.orderId).eq('organization_id', orgId)
    if (orderErr) return { error: 'Erro ao atualizar pedido.' }

    // 8. Update pending payment amount + due date
    const daysOffset = data.paymentTerm === '30_dias' ? 30 : data.paymentTerm === '60_dias' ? 60 : 0
    const dueDate = new Date(data.orderDate + 'T12:00:00')
    dueDate.setDate(dueDate.getDate() + daysOffset)
    await supabase.from('payments').update({
      amount:   totalRevenue,
      due_date: dueDate.toISOString().split('T')[0],
    }).eq('order_id', data.orderId).eq('status', 'pending')

    // 9. Upsert delivery if carrier provided
    if (data.carrier) {
      await supabase.from('deliveries').upsert({
        order_id:     data.orderId,
        company_name: data.carrier,
        price:        0,
        paid:         false,
      }, { onConflict: 'order_id' })
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/vendas')
    return { success: true }
  } catch (err) {
    console.error('[vendas] updateOrder:', err instanceof Error ? err.name : String(err))
    return { error: 'Erro inesperado ao atualizar pedido.' }
  }
}

export async function deleteOrder(
  orderId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado.' }

    const orgId = await getOrgId()
    if (!orgId) return { error: 'Organização não encontrada.' }

    // Pre-check ownership before any mutation (CN-004 TOCTOU fix)
    const { data: deleteOrderCheck } = await supabase
      .from('orders').select('id')
      .eq('id', orderId).eq('organization_id', orgId).single()
    if (!deleteOrderCheck) return { error: 'Pedido não encontrado ou acesso negado.' }

    // 1. Fetch current items to restore stock
    const { data: currentItems } = await supabase
      .from('order_items')
      .select('wine_id, quantity, stock_entry_id')
      .eq('order_id', orderId)

    // 2. Restore stock for all items
    for (const item of currentItems ?? []) {
      if (item.stock_entry_id) {
        const { data: entry } = await supabase
          .from('stock_entries').select('qty_remaining').eq('id', item.stock_entry_id).single()
        if (entry) {
          await supabase
            .from('stock_entries')
            .update({ qty_remaining: entry.qty_remaining + item.quantity })
            .eq('id', item.stock_entry_id)
        }
      }
    }

    // 3. Delete order items
    await supabase.from('order_items').delete().eq('order_id', orderId)

    // 4. Delete associated payments
    await supabase.from('payments').delete().eq('order_id', orderId)

    // 5. Delete associated deliveries
    await supabase.from('deliveries').delete().eq('order_id', orderId)

    // 6. Delete order
    const { error: orderErr } = await supabase.from('orders').delete().eq('id', orderId).eq('organization_id', orgId)
    if (orderErr) return { error: 'Erro ao eliminar pedido.' }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/vendas')
    return { success: true }
  } catch (err) {
    console.error('[vendas] deleteOrder:', err instanceof Error ? err.name : String(err))
    return { error: 'Erro inesperado ao eliminar pedido.' }
  }
}
