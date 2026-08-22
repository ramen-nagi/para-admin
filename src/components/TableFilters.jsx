function TableFilters({
  ariaLabel,
  statusOptions,
  statusValue,
  onStatusChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  onClear,
  hasActiveFilters,
}) {
  const idPrefix = ariaLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  return (
    <section className="filters-card" aria-label={ariaLabel}>
      <div className="filter-field">
        <label htmlFor={`${idPrefix}-status`}>Status</label>
        <select
          id={`${idPrefix}-status`}
          value={statusValue}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-field">
        <label htmlFor={`${idPrefix}-from-date`}>From date</label>
        <input
          id={`${idPrefix}-from-date`}
          type="date"
          value={fromDate}
          max={toDate || undefined}
          onChange={(event) => onFromDateChange(event.target.value)}
        />
      </div>
      <div className="filter-field">
        <label htmlFor={`${idPrefix}-to-date`}>To date</label>
        <input
          id={`${idPrefix}-to-date`}
          type="date"
          value={toDate}
          min={fromDate || undefined}
          onChange={(event) => onToDateChange(event.target.value)}
        />
      </div>
      <button
        className="clear-filters-button"
        type="button"
        onClick={onClear}
        disabled={!hasActiveFilters}
      >
        Clear filters
      </button>
    </section>
  )
}

export default TableFilters
