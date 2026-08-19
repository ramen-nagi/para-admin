import { supabase } from '../../lib/supabase'

export async function getReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  return { reports: data ?? [], error }
}

export async function updateReport(reportId, { status, adminNotes, resolvedAt }) {
  const { data, error } = await supabase
    .from('reports')
    .update({
      status,
      admin_notes: adminNotes || null,
      resolved_at: resolvedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single()

  return { report: data, error }
}
