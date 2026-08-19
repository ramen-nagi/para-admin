import { useCallback, useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import { createFare, FARE_TYPES, getFareMatrix, updateFare, VEHICLE_TYPES } from './faresService'

const emptyForm = {
  vehicle_type: '1',
  fare_type: 'STANDARD',
  minimum_distance_meters: '0',
  minimum_fare: '',
  increment_distance_meters: '',
  increment_fare: '',
  currency: 'PHP',
}

function FareForm({ fare, onClose, onSaved }) {
  const [form, setForm] = useState(
    fare
      ? {
          ...fare,
          vehicle_type: String(fare.vehicle_type),
          minimum_distance_meters: String(fare.minimum_distance_meters),
          minimum_fare: String(fare.minimum_fare),
          increment_distance_meters: String(fare.increment_distance_meters),
          increment_fare: String(fare.increment_fare),
        }
      : emptyForm,
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const isEditing = Boolean(fare)

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const numericFields = [
      'minimum_distance_meters',
      'minimum_fare',
      'increment_distance_meters',
      'increment_fare',
    ]
    const values = Object.fromEntries(numericFields.map((field) => [field, Number(form[field])]))
    if (
      !VEHICLE_TYPES.includes(Number(form.vehicle_type)) ||
      !FARE_TYPES.includes(form.fare_type) ||
      !form.currency.trim() ||
      numericFields.some((field) => form[field] === '' || !Number.isFinite(values[field]))
    )
      return setError('Complete all fields with valid values.')
    if (
      values.minimum_distance_meters < 0 ||
      values.increment_distance_meters <= 0 ||
      values.minimum_fare < 0 ||
      values.increment_fare < 0
    )
      return setError('Distances and fares must meet the minimum allowed values.')
    setSaving(true)
    const payload = {
      vehicle_type: Number(form.vehicle_type),
      fare_type: form.fare_type,
      minimum_distance_meters: values.minimum_distance_meters,
      minimum_fare: values.minimum_fare,
      increment_distance_meters: values.increment_distance_meters,
      increment_fare: values.increment_fare,
      currency: form.currency.trim(),
    }
    const result = isEditing ? await updateFare(fare.fare_id, payload) : await createFare(payload)
    if (result.error)
      setError(
        result.error.code === '23505'
          ? 'A fare for this vehicle and fare type already exists.'
          : 'The fare could not be saved. Check your permissions and try again.',
      )
    else onSaved(result.fare)
    setSaving(false)
  }

  return (
    <div className="detail-overlay" role="presentation" onClick={onClose}>
      <section
        className="detail-panel fare-form-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fare-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="detail-header">
          <div>
            <p className="eyebrow">Fare matrix</p>
            <h2 id="fare-form-title">{isEditing ? 'Edit fare' : 'Add fare'}</h2>
          </div>
          <button className="close-button" type="button" aria-label="Close form" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="fare-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="edit-field">
              <label htmlFor="vehicle_type">Vehicle type</label>
              <select
                id="vehicle_type"
                name="vehicle_type"
                value={form.vehicle_type}
                onChange={updateField}
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="edit-field">
              <label htmlFor="fare_type">Fare type</label>
              <select id="fare_type" name="fare_type" value={form.fare_type} onChange={updateField}>
                {FARE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="edit-field">
              <label htmlFor="minimum_distance_meters">Minimum distance (m)</label>
              <input
                id="minimum_distance_meters"
                name="minimum_distance_meters"
                type="number"
                min="0"
                step="1"
                value={form.minimum_distance_meters}
                onChange={updateField}
              />
            </div>
            <div className="edit-field">
              <label htmlFor="minimum_fare">Minimum fare</label>
              <input
                id="minimum_fare"
                name="minimum_fare"
                type="number"
                min="0"
                step="0.01"
                value={form.minimum_fare}
                onChange={updateField}
              />
            </div>
            <div className="edit-field">
              <label htmlFor="increment_distance_meters">Increment distance (m)</label>
              <input
                id="increment_distance_meters"
                name="increment_distance_meters"
                type="number"
                min="1"
                step="1"
                value={form.increment_distance_meters}
                onChange={updateField}
              />
            </div>
            <div className="edit-field">
              <label htmlFor="increment_fare">Increment fare</label>
              <input
                id="increment_fare"
                name="increment_fare"
                type="number"
                min="0"
                step="0.01"
                value={form.increment_fare}
                onChange={updateField}
              />
            </div>
            <div className="edit-field">
              <label htmlFor="currency">Currency</label>
              <input
                id="currency"
                name="currency"
                type="text"
                value={form.currency}
                onChange={updateField}
              />
            </div>
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="secondary-button compact" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button compact" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save fare'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function FareMatrixPage({ userEmail, onSignOut, onTabChange }) {
  const [fares, setFares] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingFare, setEditingFare] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  void onTabChange

  const loadFares = useCallback(async () => {
    setLoading(true)
    setError('')
    const result = await getFareMatrix()
    if (result.error)
      setError('Fare information could not be loaded. Check your connection and permissions.')
    else setFares(result.fares)
    setLoading(false)
  }, [])
  useEffect(() => {
    const timer = setTimeout(loadFares, 0)
    return () => clearTimeout(timer)
  }, [loadFares])
  function handleSaved(fare) {
    setFares((current) => {
      const exists = current.some((item) => item.fare_id === fare.fare_id)
      return exists
        ? current.map((item) => (item.fare_id === fare.fare_id ? fare : item))
        : [...current, fare].sort(
            (a, b) => a.vehicle_type - b.vehicle_type || a.fare_type.localeCompare(b.fare_type),
          )
    })
    setFormOpen(false)
    setEditingFare(null)
  }

  return (
    <AdminLayout userEmail={userEmail} onSignOut={onSignOut} activeTab="fares">
      <header className="page-header">
        <div>
          <p className="eyebrow">Para Admin</p>
          <h1>Fare Matrix</h1>
          <p className="page-subtitle">Manage fare information used by the Para app.</p>
        </div>
        <button
          className="primary-button add-button"
          type="button"
          onClick={() => {
            setEditingFare(null)
            setFormOpen(true)
          }}
        >
          Add fare
        </button>
      </header>
      {loading && (
        <div className="state-card">
          <p>Loading fares…</p>
        </div>
      )}
      {!loading && error && (
        <div className="state-card error-state">
          <p>{error}</p>
          <button className="secondary-button compact" type="button" onClick={loadFares}>
            Try again
          </button>
        </div>
      )}
      {!loading && !error && fares.length === 0 && (
        <div className="state-card">
          <h2>No fare records yet</h2>
          <p>Add the first fare configuration for the Flutter app.</p>
        </div>
      )}
      {!loading && !error && fares.length > 0 && (
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Minimum distance</th>
                  <th>Minimum fare</th>
                  <th>Increment distance</th>
                  <th>Increment fare</th>
                  <th>Currency</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {fares.map((fare) => (
                  <tr key={fare.fare_id}>
                    <td>
                      <strong>{fare.vehicle_type}</strong>
                    </td>
                    <td>{fare.fare_type}</td>
                    <td>{fare.minimum_distance_meters.toLocaleString()} m</td>
                    <td>
                      {fare.currency} {Number(fare.minimum_fare).toFixed(2)}
                    </td>
                    <td>{fare.increment_distance_meters.toLocaleString()} m</td>
                    <td>
                      {fare.currency} {Number(fare.increment_fare).toFixed(2)}
                    </td>
                    <td>{fare.currency}</td>
                    <td>
                      <button
                        className="table-action"
                        type="button"
                        onClick={() => {
                          setEditingFare(fare)
                          setFormOpen(true)
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {formOpen && (
        <FareForm
          fare={editingFare}
          onClose={() => {
            setFormOpen(false)
            setEditingFare(null)
          }}
          onSaved={handleSaved}
        />
      )}
    </AdminLayout>
  )
}

export default FareMatrixPage
