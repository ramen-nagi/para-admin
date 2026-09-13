import { supabase } from '../../lib/supabase'

export async function listStaffAccounts() {
  const { data, error } = await supabase.rpc('list_staff_accounts')
  if (error) throw error
  return data ?? []
}

export async function setStaffAccess(email, role, isActive) {
  const { error } = await supabase.rpc('set_staff_access', {
    p_email: email.trim(),
    p_role: role,
    p_is_active: isActive,
  })
  if (error) throw error
}
