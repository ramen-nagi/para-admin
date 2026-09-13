import { canLeaveEditor } from '../hooks/useUnsavedChanges'
import { VEHICLE_TYPE_LABELS } from '../constants/vehicleTypes'
import { useStaffRole } from '../features/auth/RoleContext'

function AdminLayout({ userEmail, onSignOut, activeTab, onTabChange, children, editorPanel }) {
  const role = useStaffRole()
  const gtfsEditorUrl = import.meta.env.VITE_GTFS_EDITOR_URL || 'http://localhost:5174'

  return (
    <div className={`admin-shell ${editorPanel ? 'has-editor-panel' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark small">P</span>
          <span>Para Admin</span>
        </div>
        <nav aria-label="Main navigation">
          {(role === 'admin' || role === 'operator') && (
            <>
              <button
                className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  onTabChange?.('overview')
                }}
              >
                Overview
              </button>
              <button
                className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  onTabChange?.('reports')
                }}
              >
                Reports
              </button>
              <button
                className={`nav-item ${activeTab === 'fares' ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  onTabChange?.('fares')
                }}
              >
                Fare Matrix
              </button>
              <button
                className={`nav-item ${activeTab === 'train-fares' ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  onTabChange?.('train-fares')
                }}
              >
                Train Fare
              </button>
              <button
                className={`nav-item ${activeTab === 'route-suggestions' ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  onTabChange?.('route-suggestions')
                }}
              >
                Route Suggestions
              </button>
            </>
          )}
          {role === 'admin' && (
            <button
              className={`nav-item ${activeTab === 'accounts' ? 'active' : ''}`}
              type="button"
              onClick={() => onTabChange?.('accounts')}
            >
              Account Management
            </button>
          )}
          {(role === 'admin' || role === 'editor') && (
            <a
              className="nav-item"
              href={gtfsEditorUrl}
              onClick={(event) => {
                if (!canLeaveEditor()) event.preventDefault()
              }}
            >
              GTFS Editor
            </a>
          )}
        </nav>
        <div className="vehicle-legend" aria-label="Vehicle type legend">
          {Object.entries(VEHICLE_TYPE_LABELS).map(([type, label]) => (
            <span key={type}>
              <strong>{type}</strong> {label}
            </span>
          ))}
        </div>
        <div className="sidebar-footer">
          <span className="staff-role">{role}</span>
          <span className="user-email" title={userEmail}>
            {userEmail}
          </span>
          <button className="sign-out-button" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="admin-content">{children}</main>
      {editorPanel && <div className="editor-panel-column">{editorPanel}</div>}
    </div>
  )
}

export default AdminLayout
