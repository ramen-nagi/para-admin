import { supabase } from '../../lib/supabase'
import { STAFF_ROLES } from './permissions'

export async function getStaffRole() {
  const { data, error } = await supabase.rpc('current_staff_role')
  if (error) throw error
  return STAFF_ROLES.includes(data) ? data : null
}

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

export async function signIn(email, password) {
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    return { session: null, error: signInError }
  }

  return { session: data.session, error: null }
}

export async function signOut() {
  return supabase.auth.signOut()
}
