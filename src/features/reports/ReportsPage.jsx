import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import StatusSummary from '../../components/StatusSummary'
import TableFilters from '../../components/TableFilters'
import useTableFilters from '../../hooks/useTableFilters'
import AdminLayout from '../../layouts/AdminLayout'
import { getReports, updateReport } from './reportsService'

const categoryLabels = {
  route_nonexistent: 'Route does not exist',
  incorrect_route_path: 'Incorrect route path',
  wrong_plotted_stop: 'Wrong plotted stop',
  fare_discrepancy: 'Fare discrepancy',
  app_bug_report: 'App bug report',
  others: 'Others',
}

const statusLabels = {
  open: 'Open',
  under_review: 'Under review',
  resolved: 'Resolved',
  rejected: 'Rejected',
  duplicate: 'Duplicate',
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatFare(value) {
  return value == null ? '—' : `₱${Number(value).toFixed(2)}`
}

function ReportDetails({ report, onClose, onUpdated }) {
  const [status, setStatus] = useState(report.status)
  const [adminNotes, setAdminNotes] = useState(report.admin_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaved(false)

    const resolvedAt =
      status === 'resolved'
        ? report.status === 'resolved' && report.resolved_at
          ? report.resolved_at
          : new Date().toISOString()
        : null
    const result = await updateReport(report.id, {
      status,
      adminNotes,
      resolvedAt,
    })

    if (result.error) {
      setSaveError('The report could not be updated. Please try again.')
    } else {
      onUpdated(result.report)
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
        aria-labelledby="report-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="detail-header">
          <div>
            <p className="eyebrow">Report details</p>
            <h2 id="report-detail-title">{categoryLabels[report.category] ?? report.category}</h2>
          </div>
          <button
            className="close-button"
            type="button"
            aria-label="Close report details"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="detail-status">
          <span className={`status-badge ${report.status}`}>
            {statusLabels[report.status] ?? report.status}
          </span>
          <span>{formatDate(report.created_at)}</span>
        </div>
        <div className="detail-section">
          <h3>Description</h3>
          <p className="report-description">{report.description}</p>
        </div>
        <div className="detail-grid">
          <DetailField label="Route ID" value={report.route_id} />
          <DetailField label="Trip ID" value={report.trip_id} />
          <DetailField label="From stop" value={report.from_stop_id} />
          <DetailField label="To stop" value={report.to_stop_id} />
          <DetailField label="Vehicle type" value={report.vehicle_type} />
          <DetailField label="Platform" value={report.platform} />
          <DetailField label="App version" value={report.app_version} />
          <DetailField label="Reporter ID" value={report.reporter_id} />
          <DetailField label="Expected fare" value={formatFare(report.expected_fare)} />
          <DetailField label="Observed fare" value={formatFare(report.observed_fare)} />
          <DetailField label="Last updated" value={formatDate(report.updated_at)} />
          <DetailField label="Resolved at" value={formatDate(report.resolved_at)} />
        </div>
        <form className="edit-section" onSubmit={handleSave}>
          <div className="edit-field">
            <label htmlFor="report-status">Status</label>
            <select
              id="report-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="edit-field">
            <label htmlFor="admin-notes">Admin notes</label>
            <textarea
              id="admin-notes"
              rows="5"
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              placeholder="Add internal notes about this report…"
            />
          </div>
          {saveError && (
            <p className="error-message" role="alert">
              {saveError}
            </p>
          )}
          {saved && (
            <p className="success-message" role="status">
              Report updated successfully.
            </p>
          )}
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>
    </div>
  )
}

function DetailField({ label, value }) {
  return (
    <div className="detail-field">
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

function ReportsPage({ userEmail, onSignOut, onTabChange }) {
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')
    const result = await getReports()
    if (result.error)
      setError('Reports could not be loaded. Check your connection and permissions.')
    else setReports(result.reports)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(loadReports, 0)
    return () => clearTimeout(timer)
  }, [loadReports])

  const {
    statusFilter,
    setStatusFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    filteredRows: filteredReports,
    clearFilters,
    hasActiveFilters,
  } = useTableFilters(reports)

  function handleReportUpdated(updatedReport) {
    setReports((currentReports) =>
      currentReports.map((report) => (report.id === updatedReport.id ? updatedReport : report)),
    )
    setSelectedReport(updatedReport)
  }

  return (
    <AdminLayout
      userEmail={userEmail}
      onSignOut={onSignOut}
      activeTab="reports"
      onTabChange={onTabChange}
    >
      <PageHeader
        title="Reports"
        subtitle="Review feedback submitted by commuters across Metro Manila."
      >
        <StatusSummary
          rows={filteredReports}
          statuses={[
            { status: 'open', label: 'Open' },
            { status: 'under_review', label: 'Under review' },
          ]}
        />
      </PageHeader>
      <TableFilters
        ariaLabel="Report filters"
        statusOptions={[
          { value: 'all', label: 'All statuses' },
          ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
        ]}
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
          <p>Loading reports…</p>
        </div>
      )}
      {!loading && error && (
        <div className="state-card error-state">
          <p>{error}</p>
          <button className="secondary-button compact" type="button" onClick={loadReports}>
            Try again
          </button>
        </div>
      )}
      {!loading && !error && reports.length === 0 && (
        <div className="state-card">
          <h2>No reports yet</h2>
          <p>Reports submitted through the Para app will appear here.</p>
        </div>
      )}
      {!loading && !error && reports.length > 0 && filteredReports.length === 0 && (
        <div className="state-card">
          <h2>No matching reports</h2>
          <p>Try changing the status or date range.</p>
        </div>
      )}
      {!loading && !error && filteredReports.length > 0 && (
        <div className="table-card">
          <div className="results-caption">
            Showing {filteredReports.length} of {reports.length} reports
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Route / trip</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    tabIndex="0"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') setSelectedReport(report)
                    }}
                  >
                    <td>
                      <strong>{categoryLabels[report.category] ?? report.category}</strong>
                    </td>
                    <td className="description-cell">{report.description}</td>
                    <td>{report.route_id || report.trip_id || '—'}</td>
                    <td>
                      <span className={`status-badge ${report.status}`}>
                        {statusLabels[report.status] ?? report.status}
                      </span>
                    </td>
                    <td>{formatDate(report.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selectedReport && (
        <ReportDetails
          key={`${selectedReport.id}-${selectedReport.updated_at}`}
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onUpdated={handleReportUpdated}
        />
      )}
    </AdminLayout>
  )
}

export default ReportsPage
