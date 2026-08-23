function SidePanel({ title, isEmpty = false, emptyMessage, children }) {
  return (
    <aside className="side-panel" aria-label={title}>
      {isEmpty ? (
        <div className="side-panel-empty">
          <h2>{title}</h2>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </aside>
  )
}

export default SidePanel
