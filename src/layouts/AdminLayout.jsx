import { useEffect, useRef, useState } from 'react'
import { canLeaveEditor } from '../hooks/useUnsavedChanges'
import { VEHICLE_TYPE_LABELS } from '../constants/vehicleTypes'
import { useStaffRole } from '../features/auth/RoleContext'
import { canAccessTab } from '../features/auth/permissions'
import NavigationIcon from '../components/NavigationIcon'
import BrandLogo from '../components/BrandLogo'
import './sidebar.css'

const mobileQuery = '(max-width: 1024px)'
const navItems = [
  ['overview', 'Overview'],
  ['reports', 'Reports'],
  ['fares', 'Fare Matrix'],
  ['train-fares', 'Train Fare'],
  ['route-suggestions', 'Route Suggestions'],
]

const userTabs = [
  ['passengers', 'Passengers'],
  ['staff', 'Staff'],
]

function readCollapsed() {
  try {
    return window.localStorage.getItem('para-sidebar-collapsed') === 'true'
  } catch {
    return false
  }
}

function AdminLayout({ userEmail, onSignOut, activeTab, onTabChange, children, editorPanel }) {
  const role = useStaffRole()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(mobileQuery).matches)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [usersOpen, setUsersOpen] = useState(() =>
    ['accounts', ...userTabs.map(([tab]) => tab)].includes(activeTab),
  )
  const sidebarRef = useRef(null)
  const menuRef = useRef(null)
  const closeRef = useRef(null)
  const compact = collapsed && !isMobile
  const drawerOpen = isMobile && mobileOpen
  const gtfsEditorUrl = import.meta.env.VITE_GTFS_EDITOR_URL || 'http://localhost:5174'

  useEffect(() => {
    const media = window.matchMedia(mobileQuery)
    function resize() {
      setIsMobile(media.matches)
      setMobileOpen(false)
    }
    media.addEventListener('change', resize)
    return () => media.removeEventListener('change', resize)
  }, [])

  useEffect(() => {
    if (!drawerOpen) return
    const previousOverflow = document.body.style.overflow
    const menuButton = menuRef.current
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    function handleKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMobileOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const elements = [
        ...sidebarRef.current.querySelectorAll('button:not(:disabled), a[href]'),
      ].filter((element) => element.getClientRects().length)
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === first || !sidebarRef.current.contains(document.activeElement))
      ) {
        event.preventDefault()
        last?.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !sidebarRef.current.contains(document.activeElement))
      ) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
      if (menuButton?.isConnected && menuButton.getClientRects().length) menuButton.focus()
    }
  }, [drawerOpen])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    try {
      window.localStorage.setItem('para-sidebar-collapsed', String(next))
    } catch {
      /* Preference persistence is optional. */
    }
  }

  function navigate(tab) {
    onTabChange?.(tab)
    setMobileOpen(false)
  }

  function toggleUsers() {
    if (compact) {
      setCollapsed(false)
      setUsersOpen(true)
      try {
        window.localStorage.setItem('para-sidebar-collapsed', 'false')
      } catch {
        /* Preference persistence is optional. */
      }
      return
    }
    setUsersOpen((current) => !current)
  }

  return (
    <div
      className={`admin-shell ${editorPanel ? 'has-editor-panel' : ''} ${compact ? 'sidebar-is-collapsed' : ''} ${drawerOpen ? 'sidebar-drawer-open' : ''}`}
    >
      <header className="mobile-navigation-bar" inert={drawerOpen}>
        <BrandLogo />
        <button
          ref={menuRef}
          className="sidebar-toggle"
          type="button"
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          aria-controls="main-sidebar"
          onClick={() => setMobileOpen(true)}
        >
          <NavigationIcon name="menu" />
        </button>
      </header>
      {drawerOpen && (
        <div className="sidebar-backdrop" aria-hidden="true" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        id="main-sidebar"
        ref={sidebarRef}
        className="sidebar"
        role={isMobile ? 'dialog' : undefined}
        aria-label="Main navigation"
        aria-modal={drawerOpen ? true : undefined}
        aria-hidden={isMobile && !mobileOpen ? true : undefined}
        inert={isMobile && !mobileOpen}
      >
        <div className="sidebar-brand">
          <BrandLogo compact={compact} />
          {isMobile ? (
            <button
              ref={closeRef}
              className="sidebar-toggle"
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <NavigationIcon name="close" />
            </button>
          ) : (
            <button
              className="sidebar-toggle desktop-sidebar-toggle"
              type="button"
              aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
              title={compact ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!compact}
              aria-controls="sidebar-navigation"
              onClick={toggleCollapsed}
            >
              <NavigationIcon name={compact ? 'expand' : 'collapse'} />
            </button>
          )}
        </div>
        <nav id="sidebar-navigation" aria-label="Main navigation">
          {navItems
            .filter(([tab]) => canAccessTab(role, tab))
            .map(([tab, label]) => (
              <button
                key={tab}
                className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                type="button"
                aria-label={label}
                aria-current={activeTab === tab ? 'page' : undefined}
                title={compact ? label : undefined}
                onClick={() => navigate(tab)}
              >
                <NavigationIcon name={tab} />
                <span className="nav-label">{label}</span>
              </button>
            ))}
          {canAccessTab(role, 'passengers') && (
            <div className="nav-group">
              <button
                className={`nav-item nav-group-toggle ${userTabs.some(([tab]) => activeTab === tab) ? 'section-active' : ''}`}
                type="button"
                aria-label="User Management"
                aria-expanded={!compact && usersOpen}
                aria-controls="user-management-navigation"
                title={compact ? 'User Management' : undefined}
                onClick={toggleUsers}
              >
                <NavigationIcon name="accounts" />
                <span className="nav-label">User Management</span>
                <span className={`nav-group-chevron ${usersOpen ? 'open' : ''}`}>
                  <NavigationIcon name="chevron" />
                </span>
              </button>
              {!compact && usersOpen && (
                <div
                  id="user-management-navigation"
                  className="nav-submenu"
                  aria-label="User Management"
                >
                  {userTabs.map(([tab, label]) => (
                    <button
                      key={tab}
                      className={`nav-item nav-subitem ${activeTab === tab || (activeTab === 'accounts' && tab === 'passengers') ? 'active' : ''}`}
                      type="button"
                      aria-label={label}
                      aria-current={
                        activeTab === tab || (activeTab === 'accounts' && tab === 'passengers')
                          ? 'page'
                          : undefined
                      }
                      onClick={() => navigate(tab)}
                    >
                      <NavigationIcon name={tab} />
                      <span className="nav-label">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {canAccessTab(role, 'gtfs') && (
            <a
              className={`nav-item ${activeTab === 'gtfs' ? 'active' : ''}`}
              href={gtfsEditorUrl}
              aria-label="GTFS Editor"
              title={compact ? 'GTFS Editor' : undefined}
              onClick={(event) => {
                if (!canLeaveEditor()) event.preventDefault()
                else setMobileOpen(false)
              }}
            >
              <NavigationIcon name="gtfs" />
              <span className="nav-label">GTFS Editor</span>
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
          <div className="sidebar-user-details">
            <span className="staff-role">{role}</span>
            <span className="user-email" title={userEmail}>
              {userEmail}
            </span>
          </div>
          <button
            className={`nav-item account-nav-item ${activeTab === 'my-account' ? 'active' : ''}`}
            type="button"
            aria-label="My Account"
            aria-current={activeTab === 'my-account' ? 'page' : undefined}
            title={compact ? 'My Account' : undefined}
            onClick={() => navigate('my-account')}
          >
            <NavigationIcon name="my-account" />
            <span className="nav-label">My Account</span>
          </button>
          <button
            className="sign-out-button"
            type="button"
            aria-label="Sign out"
            title={compact ? 'Sign out' : undefined}
            onClick={onSignOut}
          >
            <NavigationIcon name="logout" />
            <span className="nav-label">Sign out</span>
          </button>
        </div>
      </aside>
      <main className="admin-content" inert={drawerOpen}>
        {children}
      </main>
      {editorPanel && (
        <div className="editor-panel-column" inert={drawerOpen}>
          {editorPanel}
        </div>
      )}
    </div>
  )
}

export default AdminLayout
