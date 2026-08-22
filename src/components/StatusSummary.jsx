import { useMemo } from 'react'

function StatusSummary({ rows, statuses, statusField = 'status' }) {
  const counts = useMemo(
    () =>
      statuses.map(({ status, label }) => ({
        status,
        label,
        count: rows.filter((row) => row[statusField] === status).length,
      })),
    [rows, statusField, statuses],
  )

  return (
    <div className="status-summary" aria-label="Status summary">
      {counts.map(({ status, label, count }) => (
        <div className="summary-card" key={status}>
          <strong>{count}</strong>
          <p>{label}</p>
        </div>
      ))}
    </div>
  )
}

export default StatusSummary
