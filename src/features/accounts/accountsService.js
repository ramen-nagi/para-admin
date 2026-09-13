import { supabase } from '../../lib/supabase'

export async function listManagedUsers({ search = '', kind = 'all', status = 'all', page = 0 }) {
  const { data, error } = await supabase.rpc('list_managed_users', {
    p_search: search,
    p_kind: kind,
    p_status: status,
    p_offset: page * 25,
    p_limit: 25,
  })
  if (error) throw error
  return data ?? { users: [], total: 0 }
}

export async function setManagedUserAccess(userId, role, isActive) {
  const { error } = await supabase.rpc('set_managed_user_access', {
    p_user_id: userId,
    p_role: role,
    p_is_active: isActive,
  })
  if (error) throw error
}

export async function sendAccountEmail(action, email, role) {
  return invokeAccountAction({ action, email, role })
}

export async function createManagedUser(email, password, role) {
  return invokeAccountAction({ action: 'create_user', email, password, role })
}

async function invokeAccountAction(body) {
  const { data, error } = await supabase.functions.invoke('manage-staff', {
    body,
  })
  if (error) {
    let message = 'Account service unavailable. Check your connection and try again.'
    try {
      const body = await error.context?.json()
      if (body?.error) message = body.error
    } catch {
      /* Network errors may have no JSON response. */
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}
