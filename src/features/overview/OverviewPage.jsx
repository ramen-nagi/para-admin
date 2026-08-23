import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import AdminLayout from '../../layouts/AdminLayout'
import {
  EXPECTED_DISTANCE_FARES,
  EXPECTED_TRAIN_FARES,
  getOverviewMetrics,
} from './overviewService'

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
    reports: { open: 0, underReview: 0 },
    routeSuggestions: { pending: 0, underReview: 0 },
    distanceFares: { configured: 0, expected: EXPECTED_DISTANCE_FARES },
    trainFares: { configured: 0, expected: EXPECTED_TRAIN_FARES },
  }

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
      )}
    </AdminLayout>
  )
}

export default OverviewPage
