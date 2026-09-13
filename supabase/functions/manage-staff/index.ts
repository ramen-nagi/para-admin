import { createClient } from 'npm:@supabase/supabase-js@2.112.3'
import { createHandler } from './handler.js'

const url = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}

Deno.serve(
  createHandler({
    appUrl: Deno.env.get('STAFF_APP_URL'),
    createUserClient: (authorization: string) =>
      createClient(url, anonKey, {
        ...options,
        global: { headers: { Authorization: authorization } },
      }),
    createAdminClient: () => createClient(url, serviceKey, options),
  }),
)
