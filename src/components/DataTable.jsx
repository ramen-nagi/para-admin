function DataTable({ caption, columns, rows, getRowKey, onRowClick, onRowKeyDown, footer }) {
  const interactiveRows = Boolean(onRowClick)

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
            {rows.map((row) => (
              <tr
                className={interactiveRows ? 'table-row-interactive' : undefined}
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
      {footer}
    </div>
  )
}

export default DataTable
