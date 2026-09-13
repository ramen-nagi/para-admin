import { useCallback, useEffect, useState } from 'react'
import { canLeaveEditor } from '../../hooks/useUnsavedChanges'
import SuggestionForm from './SuggestionForm'
import DataTable from '../../components/DataTable'
import { SUGGESTION_VEHICLE_LABELS } from '../../constants/vehicleTypes'
import PageHeader from '../../components/PageHeader'
import SidePanel from '../../components/SidePanel'
import StatusSummary from '../../components/StatusSummary'
import TableFilters from '../../components/TableFilters'
import useTableFilters from '../../hooks/useTableFilters'
import AdminLayout from '../../layouts/AdminLayout'
import {
  getRouteSuggestions,
  SUGGESTION_STATUSES,
} from './routeSuggestionsService'

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—'
}

function RouteSuggestionsPage({ userEmail, onSignOut, onTabChange }) {
  const [suggestions, setSuggestions] = useState([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const {
    search,
    setSearch,
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

  function handleUpdated(saved) {
    setSuggestions((current) => current.some((item) => item.id === saved.id)
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [saved, ...current])
    setSelectedSuggestion(null)
    setCreating(false)
    setNotice('Suggestion saved successfully.')
  }

  const suggestionColumns = [
    {
      key: 'route_name',
      label: 'Route name',
      render: (suggestion) => <strong>{suggestion.route_name}</strong>,
    },
    {
      key: 'vehicle_type',
      label: 'Vehicle',
      render: (suggestion) =>
        SUGGESTION_VEHICLE_LABELS[suggestion.vehicle_type] ?? suggestion.vehicle_type,
    },
    {
      key: 'start',
      label: 'Start',
      render: (suggestion) => `${suggestion.start_latitude}, ${suggestion.start_longitude}`,
    },
    {
      key: 'end',
      label: 'End',
      render: (suggestion) => `${suggestion.end_latitude}, ${suggestion.end_longitude}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (suggestion) => (
        <span className={`status-badge ${suggestion.status}`}>
          {SUGGESTION_STATUSES[suggestion.status]}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Submitted',
      render: (suggestion) => formatDate(suggestion.created_at),
    },
  ]

  return (
    <AdminLayout
      userEmail={userEmail}
      onSignOut={onSignOut}
      activeTab="route-suggestions"
      onTabChange={onTabChange}
      editorPanel={
        <SidePanel
          title="Route suggestion"
          isEmpty={!selectedSuggestion && !creating}
          emptyMessage="Select a route suggestion to view and update its status."
        >
          {(selectedSuggestion || creating) && (
            <SuggestionForm
              key={selectedSuggestion?.id ?? 'new'}
              suggestion={selectedSuggestion}
              onClose={() => { setSelectedSuggestion(null); setCreating(false) }}
              onSaved={handleUpdated}
              onDeleted={() => {
                setSuggestions((current) => current.filter((item) => item.id !== selectedSuggestion.id))
                setSelectedSuggestion(null)
                setNotice('Suggestion deleted successfully.')
              }}
            />
          )}
        </SidePanel>
      }
    >
      <PageHeader title="Route Suggestions" subtitle="Review routes suggested by commuters.">
        <button className="primary-button compact" type="button" onClick={() => { if (canLeaveEditor()) { setSelectedSuggestion(null); setCreating(true) } }}>Add suggestion</button>
        <StatusSummary
          rows={filteredSuggestions}
          statuses={[
            { status: 'pending', label: 'Pending' },
            { status: 'under_review', label: 'Under review' },
          ]}
        />
      </PageHeader>
      {notice && <p className="success-message page-notice" role="status">{notice}</p>}
      <TableFilters
        search={search}
        onSearchChange={setSearch}
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
          <p>Try changing the search, status, or date range.</p>
        </div>
      )}
      {!loading && !error && filteredSuggestions.length > 0 && (
        <DataTable
          selectedKey={selectedSuggestion?.id}
          caption={`Showing ${filteredSuggestions.length} of ${suggestions.length} route suggestions`}
          columns={suggestionColumns}
          rows={filteredSuggestions}
          getRowKey={(suggestion) => suggestion.id}
          onRowClick={(suggestion) => { if (canLeaveEditor()) { setCreating(false); setSelectedSuggestion(suggestion) } }}
        />
      )}
    </AdminLayout>
  )
}

export default RouteSuggestionsPage
