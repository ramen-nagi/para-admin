import { supabase } from '../../lib/supabase'

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  return { session: data.session, error }
}

export function subscribeToAuthChanges(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session))

  return () => subscription.unsubscribe()
}

export async function signInAsAdmin(email, password) {
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    return { session: null, error: signInError, isAdmin: false }
  }

  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (adminError || !adminUser) {
    await supabase.auth.signOut()
    return { session: null, error: adminError, isAdmin: false }
  }

  return { session: data.session, error: null, isAdmin: true }
}

export async function signOut() {
  return supabase.auth.signOut()
}
