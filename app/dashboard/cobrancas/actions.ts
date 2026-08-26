'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgId } from '@/lib/get-org-id'
import { revalidatePath } from 'next/cache'

export async function markOrderShipped(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const orgId = await getOrgId()
  if (!orgId) return

  const orderId   = formData.get('order_id') as string
  const company   = formData.get('company') as string
  const tracking  = formData.get('tracking') as string
  const priceStr  = formData.get('price') as string

  // Verify order belongs to caller's org before mutating (CN-R02)
  const { data: orderCheck } = await supabase
    .from('orders').select('id').eq('id', orderId).eq('organization_id', orgId).single()
  if (!orderCheck) return

  await supabase.from('deliveries').upsert({
    order_id:       orderId,
    company_name:   company || null,
    tracking_code:  tracking || null,
    price:          priceStr ? parseFloat(priceStr) : 0,
  }, { onConflict: 'order_id' })

  await supabase.from('orders').update({ status: 'shipped' }).eq('id', orderId).eq('organization_id', orgId)

  revalidatePath('/dashboard/cobrancas')
  revalidatePath('/dashboard')
}

export async function markPaymentPaid(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const orgId = await getOrgId()
  if (!orgId) return

  const paymentId = formData.get('payment_id') as string

  // Verify payment belongs to caller's org via its order (CN-R02)
  const { data: payment } = await supabase
    .from('payments').select('order_id').eq('id', paymentId).single()
  if (!payment?.order_id) return

  const { data: orderCheck } = await supabase
    .from('orders').select('id').eq('id', payment.order_id).eq('organization_id', orgId).single()
  if (!orderCheck) return

  await supabase.from('payments').update({
    status:  'paid',
    paid_at: new Date().toISOString().split('T')[0],
  }).eq('id', paymentId)

  // If all payments for the order are paid, mark order as paid
  const { data: remaining } = await supabase
    .from('payments').select('id').eq('order_id', payment.order_id).eq('status', 'pending')
  if (!remaining?.length) {
    await supabase.from('orders').update({ status: 'paid' }).eq('id', payment.order_id).eq('organization_id', orgId)
  }

  revalidatePath('/dashboard/cobrancas')
  revalidatePath('/dashboard')
}

export async function updateOrderValues(
  orderId: string,
  data: { total_revenue?: number; payment_type?: string; order_date?: string }
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const orgId = await getOrgId()
  if (!orgId) return
  const update: Record<string, unknown> = {}
  if (data.total_revenue !== undefined) update.total_revenue = data.total_revenue
  if (data.payment_type  !== undefined) update.payment_type  = data.payment_type
  if (data.order_date    !== undefined) update.order_date    = data.order_date
  if (Object.keys(update).length) {
    await supabase.from('orders').update(update).eq('id', orderId).eq('organization_id', orgId)
  }
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/cobrancas')
}

const VALID_ORDER_STATUSES = new Set(['open', 'shipped', 'paid', 'cancelled'])

export async function updateOrderStatus(
  orderId: string,
  status: string,
  paymentId: string | null,
): Promise<void> {
  if (!VALID_ORDER_STATUSES.has(status)) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const orgId = await getOrgId()
  if (!orgId) return

  // Pre-check ownership before any mutation (CN-001 IDOR fix)
  const { data: orderCheck } = await supabase
    .from('orders').select('id')
    .eq('id', orderId).eq('organization_id', orgId).single()
  if (!orderCheck) return

  await supabase.from('orders').update({ status }).eq('id', orderId).eq('organization_id', orgId)

  if (status === 'paid' && paymentId) {
    await supabase.from('payments').update({
      status:  'paid',
      paid_at: new Date().toISOString().split('T')[0],
    }).eq('id', paymentId).eq('order_id', orderId)
  } else if ((status === 'open' || status === 'shipped') && paymentId) {
    await supabase.from('payments').update({
      status:  'pending',
      paid_at: null,
    }).eq('id', paymentId).eq('order_id', orderId)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/cobrancas')
}

export async function updatePaymentDue(
  paymentId: string,
  data: { due_date?: string; amount?: number }
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const orgId = await getOrgId()
  if (!orgId) return

  // Verify payment belongs to caller's org via its order (CN-R02)
  const { data: payment } = await supabase
    .from('payments').select('order_id').eq('id', paymentId).single()
  if (!payment?.order_id) return
  const { data: orderCheck } = await supabase
    .from('orders').select('id').eq('id', payment.order_id).eq('organization_id', orgId).single()
  if (!orderCheck) return

  const update: Record<string, unknown> = {}
  if (data.due_date !== undefined) update.due_date = data.due_date || null
  if (data.amount   !== undefined) update.amount   = data.amount
  if (Object.keys(update).length) await supabase.from('payments').update(update).eq('id', paymentId)
  revalidatePath('/dashboard')
}
