import { getAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import SetupForm from './setup-form'

export default async function SetupPage() {
  // If setup is already complete, redirect to login (CN-R09)
  const admin = getAdminClient()
  const { data } = await admin.from('global_settings').select('key').eq('key', 'setup_complete').maybeSingle()
  if (data) redirect('/login')

  return <SetupForm />
}
