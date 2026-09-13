import { supabase } from '../../lib/supabase'
import { deleteRecord } from '../../lib/crud'

export const deleteReport = (id) => deleteRecord(supabase, 'reports', 'id', id)

export async function createReport(report) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return { report: null, error: authError ?? { code: '42501' } }
  const { data, error } = await supabase.from('reports').insert({ ...report, reporter_id: auth.user.id, platform: 'admin', status: 'open' }).select().single()
  return { report: data, error }
}

export async function getReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  return { reports: data ?? [], error }
}

export async function updateReport(reportId, { status, adminNotes, resolvedAt, category, description }) {
  const { data, error } = await supabase
    .from('reports')
    .update({
      status,
      category,
      description,
      admin_notes: adminNotes || null,
      resolved_at: resolvedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single()

  return { report: data, error }
}
