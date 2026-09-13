import { useState } from 'react'
import { createReport } from './reportsService'
import { mutationError } from '../../lib/crud'
import useUnsavedChanges, { canLeaveEditor } from '../../hooks/useUnsavedChanges'

export default function ReportCreateForm({ categories, onSaved, onClose }) {
  const [category, setCategory] = useState('others')
  const [description, setDescription] = useState('')
  const [routeId, setRouteId] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useUnsavedChanges(Boolean(description || routeId || adminNotes || category !== 'others'), saving)
  const close = () => { if (canLeaveEditor()) onClose() }
  async function save(event) {
    event.preventDefault()
    if (!description.trim()) return setError('Enter a description.')
    setSaving(true); setError('')
    try {
      const result = await createReport({ category, description: description.trim(), route_id: routeId.trim() || null, admin_notes: adminNotes.trim() || null })
      if (result.error) setError(mutationError(result.error))
      else onSaved(result.report)
    } catch { setError('The report could not be created. Check your connection and try again.') }
    finally { setSaving(false) }
  }
  return <section className="side-panel-content" aria-labelledby="new-report-title">
    <div className="detail-header"><div><p className="eyebrow">Manual submission</p><h2 id="new-report-title">Add report</h2></div><button className="close-button" type="button" disabled={saving} aria-label="Close new report" onClick={close}>×</button></div>
    <form onSubmit={save}><fieldset className="form-fields" disabled={saving}>
      <div className="edit-field"><label htmlFor="new-category">Category</label><select id="new-category" value={category} onChange={(event) => setCategory(event.target.value)}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <div className="edit-field"><label htmlFor="new-description">Description</label><textarea id="new-description" value={description} required maxLength={5000} rows={5} onChange={(event) => setDescription(event.target.value)} /></div>
      <div className="edit-field"><label htmlFor="new-route">Route ID (optional)</label><input id="new-route" value={routeId} onChange={(event) => setRouteId(event.target.value)} /></div>
      <div className="edit-field"><label htmlFor="new-notes">Internal notes</label><textarea id="new-notes" value={adminNotes} rows={3} onChange={(event) => setAdminNotes(event.target.value)} /></div>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="form-actions"><button className="secondary-button compact" type="button" onClick={close}>Cancel</button><button className="primary-button compact" type="submit">{saving ? 'Creating…' : 'Create report'}</button></div>
    </fieldset></form>
  </section>
}
