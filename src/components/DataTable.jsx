import { useState } from 'react'

function DataTable({ caption, columns, rows, getRowKey, onRowClick, onRowKeyDown, footer, selectedKey, pageSize = 25 }) {
  const interactiveRows = Boolean(onRowClick)
  const [page, setPage] = useState(0)
  const totalPages = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1
  const currentPage = Math.min(page, totalPages - 1)
  const visibleRows = pageSize ? rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : rows

  function handleRowKeyDown(event, row) {
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    if (onRowKeyDown) onRowKeyDown(event, row)
    else onRowClick(row)
  }

  return (
    <div className="table-card">
      {caption && <div className="results-caption">{caption}</div>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th className={column.headerClassName} key={column.key}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                className={`${interactiveRows ? 'table-row-interactive' : ''} ${selectedKey != null && getRowKey(row) === selectedKey ? 'is-selected' : ''}`}
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={interactiveRows ? (event) => handleRowKeyDown(event, row) : undefined}
                tabIndex={interactiveRows ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td className={column.className} key={column.key}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && <nav className="table-pagination" aria-label="Table pages">
        <span>Page {currentPage + 1} of {totalPages} · {rows.length} records</span>
        <div className="row-actions">
          <button className="secondary-button compact" type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
          <button className="secondary-button compact" type="button" disabled={currentPage === totalPages - 1} onClick={() => setPage(currentPage + 1)}>Next</button>
        </div>
      </nav>}
      {footer}
    </div>
  )
}

export default DataTable
