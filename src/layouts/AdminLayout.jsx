function AdminLayout({
  userEmail,
  onSignOut,
  activeTab,
  onTabChange,
  children,
}) {
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark small">P</span>
          <span>Para Admin</span>
        </div>
        <nav aria-label="Main navigation">
          <button
            className={`nav-item ${activeTab === "reports" ? "active" : ""}`}
            type="button"
            onClick={() => {
              onTabChange?.("reports");
              window.location.hash = "reports";
            }}
          >
            Reports
          </button>
          <button
            className={`nav-item ${activeTab === "fares" ? "active" : ""}`}
            type="button"
            onClick={() => {
              onTabChange?.("fares");
              window.location.hash = "fares";
            }}
          >
            Fare Matrix
          </button>
        </nav>
        <div className="vehicle-legend" aria-label="Vehicle type legend">
          <span>
            <strong>1</strong> Tricycle
          </span>
          <span>
            <strong>2</strong> Train
          </span>
          <span>
            <strong>3</strong> Jeep
          </span>
          <span>
            <strong>4</strong> Bus
          </span>
          <span>
            <strong>5</strong> UVE
          </span>
        </div>
        <div className="sidebar-footer">
          <span className="user-email" title={userEmail}>
            {userEmail}
          </span>
          <button className="sign-out-button" type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  );
}

export default AdminLayout;
