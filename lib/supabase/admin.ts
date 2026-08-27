import { createClient } from '@supabase/supabase-js'

function _make() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

let _client: ReturnType<typeof _make> | null = null

export function getAdminClient() {
  if (!_client) _client = _make()
  return _client!
}
