import { useCallback, useEffect, useState } from 'react'
import TableFilters from '../../components/TableFilters'
import useTableFilters from '../../hooks/useTableFilters'
import AdminLayout from '../../layouts/AdminLayout'
import {
  getRouteSuggestions,
  SUGGESTION_STATUSES,
  updateRouteSuggestionStatus,
} from './routeSuggestionsService'

const vehicleLabels = {
  bus: 'Bus',
  jeep: 'Jeep',
  train: 'Train',
  tricycle: 'Tricycle',
  uv_express: 'UV Express',
  modern_jeep: 'Modern Jeep',
  unknown: 'Unknown',
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—'
}

function SuggestionDetails({ suggestion, onClose, onUpdated }) {
  const [status, setStatus] = useState(suggestion.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    const result = await updateRouteSuggestionStatus(suggestion.id, status)
    if (result.error) setError('The route suggestion status could not be updated.')
    else {
      onUpdated(result.suggestion)
      setSaved(true)
    }
    setSaving(false)
  }

  return (
    <div className="detail-overlay" role="presentation" onClick={onClose}>
      <section
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggestion-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="detail-header">
          <div>
            <p className="eyebrow">Route suggestion</p>
            <h2 id="suggestion-title">{suggestion.route_name}</h2>
          </div>
          <button
            className="close-button"
            type="button"
            aria-label="Close details"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="detail-status">
          <span className={`status-badge ${suggestion.status}`}>
            {SUGGESTION_STATUSES[suggestion.status]}
          </span>
          <span>{formatDate(suggestion.created_at)}</span>
        </div>
        <div className="detail-grid">
          <div className="detail-field">
            <dt>Vehicle type</dt>
            <dd>{vehicleLabels[suggestion.vehicle_type] ?? suggestion.vehicle_type}</dd>
          </div>
          <div className="detail-field">
            <dt>Reporter ID</dt>
            <dd>{suggestion.reporter_id || '—'}</dd>
          </div>
          <div className="detail-field">
            <dt>Start coordinates</dt>
            <dd>
              {suggestion.start_latitude}, {suggestion.start_longitude}
            </dd>
          </div>
          <div className="detail-field">
            <dt>End coordinates</dt>
            <dd>
              {suggestion.end_latitude}, {suggestion.end_longitude}
            </dd>
          </div>
        </div>
        {suggestion.roads_traversed && (
          <div className="detail-section">
            <h3>Roads traversed</h3>
            <p className="report-description">{suggestion.roads_traversed}</p>
          </div>
        )}
        {suggestion.notes && (
          <div className="detail-section">
            <h3>Notes</h3>
            <p className="report-description">{suggestion.notes}</p>
          </div>
        )}
        <form className="edit-section" onSubmit={handleSave}>
          <div className="edit-field">
            <label htmlFor="suggestion-status">Status</label>
            <select
              id="suggestion-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {Object.entries(SUGGESTION_STATUSES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="success-message" role="status">
              Suggestion status updated successfully.
            </p>
          )}
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save status'}
          </button>
        </form>
      </section>
    </div>
  )
}

function RouteSuggestionsPage({ userEmail, onSignOut, onTabChange }) {
  const [suggestions, setSuggestions] = useState([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const {
    statusFilter,
    setStatusFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    filteredRows: filteredSuggestions,
    clearFilters,
    hasActiveFilters,
  } = useTableFilters(suggestions)

  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    ...Object.entries(SUGGESTION_STATUSES).map(([value, label]) => ({ value, label })),
  ]

  const loadSuggestions = useCallback(async () => {
    setLoading(true)
    setError('')
    const result = await getRouteSuggestions()
    if (result.error)
      setError('Route suggestions could not be loaded. Check your permissions and connection.')
    else setSuggestions(result.suggestions)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(loadSuggestions, 0)
    return () => clearTimeout(timer)
  }, [loadSuggestions])

  function handleUpdated(updatedSuggestion) {
    setSuggestions((current) =>
      current.map((suggestion) =>
        suggestion.id === updatedSuggestion.id ? updatedSuggestion : suggestion,
      ),
    )
    setSelectedSuggestion(updatedSuggestion)
  }

  return (
    <AdminLayout
      userEmail={userEmail}
      onSignOut={onSignOut}
      activeTab="route-suggestions"
      onTabChange={onTabChange}
    >
      <header className="page-header">
        <div>
          <p className="eyebrow">Para Admin</p>
          <h1>Route Suggestions</h1>
          <p className="page-subtitle">Review routes suggested by commuters.</p>
        </div>
      </header>
      <TableFilters
        ariaLabel="Route suggestion filters"
        statusOptions={statusOptions}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />
      {loading && (
        <div className="state-card">
          <p>Loading route suggestions…</p>
        </div>
      )}
      {!loading && error && (
        <div className="state-card error-state">
          <p>{error}</p>
          <button className="secondary-button compact" type="button" onClick={loadSuggestions}>
            Try again
          </button>
        </div>
      )}
      {!loading && !error && suggestions.length === 0 && (
        <div className="state-card">
          <h2>No route suggestions yet</h2>
          <p>Suggestions submitted through the Para app will appear here.</p>
        </div>
      )}
      {!loading && !error && suggestions.length > 0 && filteredSuggestions.length === 0 && (
        <div className="state-card">
          <h2>No matching route suggestions</h2>
          <p>Try changing the status or date range.</p>
        </div>
      )}
      {!loading && !error && filteredSuggestions.length > 0 && (
        <div className="table-card">
          <div className="results-caption">
            Showing {filteredSuggestions.length} of {suggestions.length} route suggestions
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Route name</th>
                  <th>Vehicle</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuggestions.map((suggestion) => (
                  <tr
                    key={suggestion.id}
                    tabIndex="0"
                    onClick={() => setSelectedSuggestion(suggestion)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') setSelectedSuggestion(suggestion)
                    }}
                  >
                    <td>
                      <strong>{suggestion.route_name}</strong>
                    </td>
                    <td>{vehicleLabels[suggestion.vehicle_type] ?? suggestion.vehicle_type}</td>
                    <td>
                      {suggestion.start_latitude}, {suggestion.start_longitude}
                    </td>
                    <td>
                      {suggestion.end_latitude}, {suggestion.end_longitude}
                    </td>
                    <td>
                      <span className={`status-badge ${suggestion.status}`}>
                        {SUGGESTION_STATUSES[suggestion.status]}
                      </span>
                    </td>
                    <td>{formatDate(suggestion.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selectedSuggestion && (
        <SuggestionDetails
          suggestion={selectedSuggestion}
          onClose={() => setSelectedSuggestion(null)}
          onUpdated={handleUpdated}
        />
      )}
    </AdminLayout>
  )
}

export default RouteSuggestionsPage
