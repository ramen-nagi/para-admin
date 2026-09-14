import { useEffect, useRef, useState } from 'react'
import './App.css'
import { canLeaveEditor } from './hooks/useUnsavedChanges'
import AuthLayout from './layouts/AuthLayout'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './features/auth/LoginPage'
import PasswordPage from './features/auth/PasswordPage'
import MyAccountPage from './features/auth/MyAccountPage'
import OverviewPage from './features/overview/OverviewPage'
import ReportsPage from './features/reports/ReportsPage'
import FareMatrixPage from './features/fares/FareMatrixPage'
import TrainFarePage from './features/train-fares/TrainFarePage'
import RouteSuggestionsPage from './features/route-suggestions/RouteSuggestionsPage'
import AccountsPage from './features/accounts/AccountsPage'
import {
  getCurrentSession,
  getStaffRole,
  signOut,
  subscribeToAuthChanges,
} from './features/auth/authService'
import { canAccessTab, defaultTab } from './features/auth/permissions'
import { RoleContext } from './features/auth/RoleContext'

const pages = {
  overview: OverviewPage,
  reports: ReportsPage,
  fares: FareMatrixPage,
  'train-fares': TrainFarePage,
  'route-suggestions': RouteSuggestionsPage,
  accounts: AccountsPage,
  'my-account': MyAccountPage,
}

function StaffWorkspace({ session, onSignOut }) {
  const [access, setAccess] = useState({ loading: true, role: null, error: '' })
  const [activeTab, setActiveTab] = useState(() => window.location.hash.slice(1) || 'overview')
  const activeTabRef = useRef(activeTab)

  useEffect(() => {
    let mounted = true
    let version = 0
    async function verify() {
      const request = ++version
      try {
        const role = await getStaffRole()
        if (mounted && request === version) setAccess({ loading: false, role, error: '' })
      } catch {
        if (mounted && request === version)
          setAccess({
            loading: false,
            role: null,
            error: 'Unable to verify staff access. Check your connection and retry.',
          })
      }
    }
    void verify()
    const interval = window.setInterval(verify, 30000)
    window.addEventListener('focus', verify)
    return () => {
      mounted = false
      window.clearInterval(interval)
      window.removeEventListener('focus', verify)
    }
  }, [session])

  function changeTab(tab) {
    if (!canAccessTab(access.role, tab) || tab === activeTabRef.current || !canLeaveEditor()) return
    activeTabRef.current = tab
    setActiveTab(tab)
    window.location.hash = tab
  }

  useEffect(() => {
    function handleHashChange() {
      const next = window.location.hash.slice(1) || defaultTab(access.role)
      if (next === activeTabRef.current) return
      if (!canLeaveEditor()) {
        window.history.replaceState(null, '', '#' + activeTabRef.current)
        return
      }
      activeTabRef.current = next
      setActiveTab(next)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [access.role])

  if (access.loading)
    return (
      <AuthLayout>
        <p className="loading">Checking staff access...</p>
      </AuthLayout>
    )
  if (!access.role)
    return (
      <AuthLayout>
        <section className="auth-card">
          <h1>Staff access unavailable</h1>
          <p role="alert">
            {access.error || 'Your account has no active staff role. Contact an administrator.'}
          </p>
          <button className="secondary-button" onClick={() => window.location.reload()}>
            Retry
          </button>
          <button className="sign-out-button" onClick={onSignOut}>
            Sign out
          </button>
        </section>
      </AuthLayout>
    )

  const tab = canAccessTab(access.role, activeTab) ? activeTab : defaultTab(access.role)
  const props = {
    userEmail: session.user.email,
    userId: session.user.id,
    onSignOut,
    onTabChange: changeTab,
  }
  const Page = pages[tab]
  return (
    <RoleContext.Provider value={access.role}>
      {Page ? (
        <Page {...props} />
      ) : (
        <AdminLayout {...props} activeTab="gtfs">
          <header className="page-header">
            <div>
              <p className="eyebrow">Editor workspace</p>
              <h1>GTFS Editor</h1>
              <p className="page-subtitle">Manage routes, stops, trips, and schedules.</p>
            </div>
          </header>
          <a
            className="primary-button"
            href={import.meta.env.VITE_GTFS_EDITOR_URL || 'http://localhost:5174'}
          >
            Open GTFS Editor
          </a>
        </AdminLayout>
      )}
    </RoleContext.Provider>
  )
}

function App() {
  const [passwordFlow, setPasswordFlow] = useState(
    () =>
      new URLSearchParams(window.location.search).get('account') === 'password' ||
      ['recovery', 'invite'].includes(
        new URLSearchParams(window.location.hash.slice(1)).get('type'),
      ),
  )
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let mounted = true
    let authChanged = false
    const unsubscribe = subscribeToAuthChanges((currentSession, event) => {
      authChanged = true
      if (mounted) {
        if (event === 'PASSWORD_RECOVERY') setPasswordFlow(true)
        setSession(currentSession)
        setLoading(false)
      }
    })
    getCurrentSession()
      .then(({ session: currentSession, error: sessionError }) => {
        if (mounted && !authChanged) {
          setSession(currentSession)
          setError(sessionError ? 'Unable to restore your session. Please sign in again.' : '')
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Unable to restore your session. Please sign in again.')
          setLoading(false)
        }
      })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    if (!canLeaveEditor()) return
    const { error: signOutError } = await signOut()
    if (signOutError) {
      setError('Sign out failed. Please try again.')
      return
    }
    setError('')
    setSession(null)
  }
  if (loading)
    return (
      <AuthLayout>
        <p className="loading">Loading...</p>
      </AuthLayout>
    )
  if (passwordFlow)
    return (
      <PasswordPage
        authError={error}
        session={session}
        onSignOut={handleSignOut}
        onDone={() => {
          const next = new URL(window.location.href)
          next.searchParams.delete('account')
          next.hash = ''
          window.history.replaceState(null, '', next)
          setPasswordFlow(false)
        }}
      />
    )
  return (
    <>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {session ? (
        <StaffWorkspace key={session.user.id} session={session} onSignOut={handleSignOut} />
      ) : (
        <LoginPage onSignedIn={setSession} />
      )}
    </>
  )
}

export default App
