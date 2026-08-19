function AdminLayout({ userEmail, onSignOut, children }) {
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-mark small">P</span><span>Para Admin</span></div>
        <nav aria-label="Main navigation">
          <a className="nav-item active" href="#reports">Reports</a>
        </nav>
        <div className="sidebar-footer">
          <span className="user-email" title={userEmail}>{userEmail}</span>
          <button className="sign-out-button" type="button" onClick={onSignOut}>Sign out</button>
        </div>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  )
}

export default AdminLayout
