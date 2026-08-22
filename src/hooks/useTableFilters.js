import { useMemo, useState } from 'react'

export default function useTableFilters(
  rows,
  { statusField = 'status', dateField = 'created_at' } = {},
) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const rowDate = new Date(row[dateField])
        const matchesStatus = statusFilter === 'all' || row[statusField] === statusFilter
        const matchesFrom = !fromDate || rowDate >= new Date(`${fromDate}T00:00:00`)
        const matchesTo = !toDate || rowDate <= new Date(`${toDate}T23:59:59.999`)

        return matchesStatus && matchesFrom && matchesTo
      }),
    [dateField, fromDate, rows, statusField, statusFilter, toDate],
  )

  function clearFilters() {
    setStatusFilter('all')
    setFromDate('')
    setToDate('')
  }

  return {
    statusFilter,
    setStatusFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    filteredRows,
    clearFilters,
    hasActiveFilters: statusFilter !== 'all' || Boolean(fromDate) || Boolean(toDate),
  }
}
