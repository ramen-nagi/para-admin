import { useEffect, useState } from 'react'
import './App.css'
import AuthLayout from './layouts/AuthLayout'
import LoginPage from './features/auth/LoginPage'
import ReportsPage from './features/reports/ReportsPage'
import FareMatrixPage from './features/fares/FareMatrixPage'
import { getCurrentSession, signOut, subscribeToAuthChanges } from './features/auth/authService'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(() => window.location.hash === '#fares' ? 'fares' : 'reports')

  useEffect(() => {
    let mounted = true
    getCurrentSession().then(({ session: currentSession }) => {
      if (mounted) { setSession(currentSession); setLoading(false) }
    })
    const unsubscribe = subscribeToAuthChanges(setSession)
    return () => { mounted = false; unsubscribe() }
  }, [])

  useEffect(() => {
    function handleHashChange() { setActiveTab(window.location.hash === '#fares' ? 'fares' : 'reports') }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  async function handleSignOut() {
    await signOut()
    setSession(null)
  }

  if (loading) return <AuthLayout><p className="loading">Loading…</p></AuthLayout>
  if (!session) return <LoginPage onSignedIn={setSession} />
  return activeTab === 'fares'
    ? <FareMatrixPage userEmail={session.user.email} onSignOut={handleSignOut} onTabChange={setActiveTab} />
    : <ReportsPage userEmail={session.user.email} onSignOut={handleSignOut} onTabChange={setActiveTab} />
}

export default App
