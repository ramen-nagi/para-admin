import { useState } from 'react'
import useUnsavedChanges, { canLeaveEditor } from '../../hooks/useUnsavedChanges'
import DeleteButton from '../../components/DeleteButton'
import { SUGGESTION_VEHICLE_LABELS } from '../../constants/vehicleTypes'
import { mutationError } from '../../lib/crud'
import { createRouteSuggestion, updateRouteSuggestion, deleteRouteSuggestion, SUGGESTION_STATUSES } from './routeSuggestionsService'

const emptyForm = { route_name: '', vehicle_type: 'jeep', start_latitude: '', start_longitude: '', end_latitude: '', end_longitude: '', roads_traversed: '', notes: '', admin_notes: '', status: 'pending' }
// These are the values accepted by route_suggestions_vehicle_type_check.
const vehicleTypes = ['bus', 'jeep', 'train', 'tricycle', 'uv_express', 'modern_jeep', 'unknown']
const coordinates = [ ['start_latitude', 'Start latitude', 90], ['start_longitude', 'Start longitude', 180], ['end_latitude', 'End latitude', 90], ['end_longitude', 'End longitude', 180] ]

export default function SuggestionForm({ suggestion, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState(() => Object.fromEntries(Object.keys(emptyForm).map((key) => [key, suggestion?.[key] ?? emptyForm[key]])))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dirty = Object.keys(emptyForm).some((key) => String(form[key]) !== String(suggestion?.[key] ?? emptyForm[key]))
  useUnsavedChanges(dirty, saving)
  const close = () => { if (canLeaveEditor()) onClose() }
  function change(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })) }

  async function save(event) {
    event.preventDefault()
    setError('')
    if (!form.route_name.trim() || form.route_name.trim().length > 200) return setError('Enter a route name of 1–200 characters.')
    if (coordinates.some(([key, , limit]) => String(form[key]).trim() === '' || !Number.isFinite(Number(form[key])) || Math.abs(Number(form[key])) > limit)) return setError('Enter valid coordinates: latitude between −90 and 90, longitude between −180 and 180.')
    if (!vehicleTypes.includes(form.vehicle_type) || !Object.hasOwn(SUGGESTION_STATUSES, form.status)) return setError('Choose a valid vehicle and status.')
    if (form.roads_traversed.trim().length > 5000) return setError('Roads traversed must be 5,000 characters or fewer.')
    const payload = {
      ...form, route_name: form.route_name.trim(),
      ...Object.fromEntries(coordinates.map(([key]) => [key, Number(form[key])])),
      roads_traversed: form.roads_traversed.trim() || null,
      notes: form.notes.trim() || null, admin_notes: form.admin_notes.trim() || null,
    }
    setSaving(true)
    try {
      const result = suggestion ? await updateRouteSuggestion(suggestion.id, payload) : await createRouteSuggestion(payload)
      if (result.error) setError(mutationError(result.error))
      else onSaved(result.suggestion)
    } catch { setError('The suggestion could not be saved. Check your connection and try again.') }
    finally { setSaving(false) }
  }

  return <section className="side-panel-content" aria-labelledby="suggestion-title">
    <div className="detail-header">
      <div><p className="eyebrow">Route suggestion</p><h2 id="suggestion-title">{suggestion ? 'Edit suggestion' : 'Add suggestion'}</h2></div>
      <button className="close-button" type="button" aria-label="Close suggestion" disabled={saving} onClick={close}>×</button>
    </div>
    {suggestion && <p className="record-meta">Submitted {new Date(suggestion.created_at).toLocaleDateString('en-PH')} · {suggestion.reporter_id ? `Reporter ${suggestion.reporter_id}` : 'Guest / manual submission'}</p>}
    <form onSubmit={save}>
      <fieldset className="form-fields" disabled={saving}>
        <div className="edit-field"><label htmlFor="route_name">Route name</label><input id="route_name" name="route_name" value={form.route_name} maxLength={200} required onChange={change} /></div>
        <div className="edit-field"><label htmlFor="vehicle_type">Vehicle</label><select id="vehicle_type" name="vehicle_type" value={form.vehicle_type} onChange={change}>{vehicleTypes.map((type) => <option key={type} value={type}>{SUGGESTION_VEHICLE_LABELS[type]}</option>)}</select></div>
        <div className="form-grid">{coordinates.map(([key, label, limit]) => <div className="edit-field" key={key}><label htmlFor={key}>{label}</label><input id={key} name={key} type="number" step="any" min={-limit} max={limit} required value={form[key]} onChange={change} /></div>)}</div>
        {[['roads_traversed', 'Roads traversed'], ['notes', 'Submission notes'], ['admin_notes', 'Internal review notes']].map(([key, label]) => <div className="edit-field" key={key}><label htmlFor={key}>{label}</label><textarea id={key} name={key} rows={3} maxLength={5000} value={form[key]} onChange={change} /></div>)}
        <div className="edit-field"><label htmlFor="suggestion-status">Status</label><select id="suggestion-status" name="status" value={form.status} onChange={change}>{Object.entries(SUGGESTION_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="form-actions"><button className="secondary-button compact" type="button" onClick={close}>Cancel</button><button className="primary-button compact" type="submit">{saving ? 'Saving…' : suggestion ? 'Save changes' : 'Create suggestion'}</button></div>
      </fieldset>
    </form>
    {suggestion && <div className="delete-section"><h3>Remove suggestion</h3><p>Keep reviewed suggestions for reference. Delete spam or invalid entries.</p><DeleteButton label={`${suggestion.route_name} · Suggestion ${suggestion.id}`} disabled={saving} onDelete={() => deleteRouteSuggestion(suggestion.id)} onDeleted={onDeleted} /></div>}
  </section>
}
