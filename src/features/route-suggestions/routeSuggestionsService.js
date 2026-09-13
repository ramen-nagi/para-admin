import { supabase } from '../../lib/supabase'
import { deleteRecord } from '../../lib/crud'

export const deleteRouteSuggestion = (id) => deleteRecord(supabase, 'route_suggestions', 'id', id)

export async function createRouteSuggestion(suggestion) {
  const { data, error } = await supabase.from('route_suggestions').insert(suggestion).select().single()
  return { suggestion: data, error }
}

export async function updateRouteSuggestion(id, suggestion) {
  const { data, error } = await supabase.from('route_suggestions').update(suggestion).eq('id', id).select().single()
  return { suggestion: data, error }
}

export const SUGGESTION_STATUSES = {
  pending: 'Pending',
  under_review: 'Under review',
  added: 'Added',
  rejected: 'Rejected',
}

export async function getRouteSuggestions() {
  const { data, error } = await supabase
    .from('route_suggestions')
    .select('*')
    .order('created_at', { ascending: false })
  return { suggestions: data ?? [], error }
}

export async function updateRouteSuggestionStatus(id, status) {
  const { data, error } = await supabase
    .from('route_suggestions')
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  return { suggestion: data, error }
}
