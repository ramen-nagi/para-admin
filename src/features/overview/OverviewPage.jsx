import { useCallback, useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import AdminLayout from '../../layouts/AdminLayout'
import {
  EXPECTED_DISTANCE_FARES,
  EXPECTED_TRAIN_FARES,
  getOverviewMetrics,
} from './overviewService'

const categoryLabels = {
  route_nonexistent: 'Route does not exist',
  incorrect_route_path: 'Incorrect route path',
  wrong_plotted_stop: 'Wrong plotted stop',
  fare_discrepancy: 'Fare discrepancy',
  app_bug_report: 'App bug report',
  others: 'Others',
}

const reportStatusLabels = {
  open: 'Open',
  under_review: 'Under review',
}

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

function AttentionTable({ title, rows, columns, emptyMessage, onRowClick }) {
  return (
    <section className="overview-attention-section">
      <h2>{title}</h2>
      {rows.length > 0 ? (
        <DataTable
          caption={`${rows.length} item${rows.length === 1 ? '' : 's'} need attention`}
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          onRowClick={onRowClick}
        />
      ) : (
        <div className="overview-empty">
          <p>{emptyMessage}</p>
        </div>
      )}
    </section>
  )
}

function MetricCard({ title, value, subtitle, details, href, onClick }) {
  const content = (
    <>
      <p className="overview-card-title">{title}</p>
      <strong className="overview-card-value">{value}</strong>
      <p className="overview-card-subtitle">{subtitle}</p>
      {details && <div className="overview-card-details">{details}</div>}
    </>
  )

  if (href)
    return (
      <a className="overview-card overview-card-link" href={href}>
        {content}
      </a>
    )

  return (
    <button className="overview-card" type="button" onClick={onClick}>
      {content}
    </button>
  )
}

function StatusDetails({ items }) {
  return (
    <div className="overview-status-details">
      {items.map(({ label, value }) => (
        <span key={label}>
          <strong>{value}</strong> {label}
        </span>
      ))}
    </div>
  )
}

function CompletionDetails({ configured, expected }) {
  const percentage = expected ? Math.round((configured / expected) * 100) : 0

  return (
    <>
      <div className="overview-progress" aria-label={`${percentage}% complete`}>
        <span style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
      <span>
        {configured} of {expected} configured ({percentage}%)
      </span>
    </>
  )
}

function OverviewPage({ userEmail, onSignOut, onTabChange }) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadMetrics = useCallback(async () => {
    setLoading(true)
    setError(false)
    const result = await getOverviewMetrics()
    setMetrics(result.metrics)
    setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(loadMetrics, 0)
    return () => clearTimeout(timer)
  }, [loadMetrics])

  function goToTab(tab) {
    onTabChange(tab)
    window.location.hash = tab
  }

  const data = metrics ?? {
    reports: { open: 0, underReview: 0, rows: [] },
    routeSuggestions: { pending: 0, underReview: 0, rows: [] },
    distanceFares: { configured: 0, expected: EXPECTED_DISTANCE_FARES },
    trainFares: { configured: 0, expected: EXPECTED_TRAIN_FARES },
  }

  const reportColumns = [
    {
      key: 'category',
      label: 'Category',
      render: (report) => categoryLabels[report.category] ?? report.category,
    },
    { key: 'description', label: 'Description', className: 'description-cell' },
    {
      key: 'route',
      label: 'Route / trip',
      render: (report) => report.route_id || report.trip_id || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (report) => (
        <span className={`status-badge ${report.status}`}>
          {reportStatusLabels[report.status] ?? report.status}
        </span>
      ),
    },
    { key: 'created_at', label: 'Submitted', render: (report) => formatDate(report.created_at) },
  ]

  const suggestionColumns = [
    { key: 'route_name', label: 'Route name' },
    {
      key: 'vehicle_type',
      label: 'Vehicle',
      render: (suggestion) => vehicleLabels[suggestion.vehicle_type] ?? suggestion.vehicle_type,
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
          {suggestion.status === 'pending' ? 'Pending' : 'Under review'}
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
      activeTab="overview"
      onTabChange={onTabChange}
    >
      <PageHeader
        title="Overview"
        subtitle="See what needs attention across the Para admin workspace."
      />
      {loading && (
        <div className="state-card">
          <p>Loading overview…</p>
        </div>
      )}
      {!loading && error && (
        <div className="state-card error-state">
          <p>Some overview metrics could not be loaded.</p>
          <button className="secondary-button compact" type="button" onClick={loadMetrics}>
            Try again
          </button>
        </div>
      )}
      {!loading && (
        <>
          <section className="overview-grid" aria-label="Workspace overview">
            <MetricCard
              title="Reports"
              value={data.reports.open + data.reports.underReview}
              subtitle="Need attention"
              details={
                <StatusDetails
                  items={[
                    { label: 'Open', value: data.reports.open },
                    { label: 'Under review', value: data.reports.underReview },
                  ]}
                />
              }
              onClick={() => goToTab('reports')}
            />
            <MetricCard
              title="Route Suggestions"
              value={data.routeSuggestions.pending + data.routeSuggestions.underReview}
              subtitle="Need review"
              details={
                <StatusDetails
                  items={[
                    { label: 'Pending', value: data.routeSuggestions.pending },
                    { label: 'Under review', value: data.routeSuggestions.underReview },
                  ]}
                />
              }
              onClick={() => goToTab('route-suggestions')}
            />
            <MetricCard
              title="Fare Matrix"
              value={`${data.distanceFares.configured}/${data.distanceFares.expected}`}
              subtitle="Configurations complete"
              details={
                <CompletionDetails
                  configured={data.distanceFares.configured}
                  expected={data.distanceFares.expected}
                />
              }
              onClick={() => goToTab('fares')}
            />
            <MetricCard
              title="Train Fare"
              value={`${data.trainFares.configured}/${data.trainFares.expected}`}
              subtitle="Combinations complete"
              details={
                <CompletionDetails
                  configured={data.trainFares.configured}
                  expected={data.trainFares.expected}
                />
              }
              onClick={() => goToTab('train-fares')}
            />
          </section>
          <div className="overview-attention-grid">
            <AttentionTable
              title="Reports"
              rows={data.reports.rows}
              columns={reportColumns}
              emptyMessage="There are no unresolved reports."
              onRowClick={() => goToTab('reports')}
            />
            <AttentionTable
              title="Route Suggestions"
              rows={data.routeSuggestions.rows}
              columns={suggestionColumns}
              emptyMessage="There are no route suggestions needing review."
              onRowClick={() => goToTab('route-suggestions')}
            />
          </div>
        </>
      )}
    </AdminLayout>
  )
}

export default OverviewPage
