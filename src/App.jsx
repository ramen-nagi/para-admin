import { useEffect, useState } from 'react'
import './App.css'
import AuthLayout from './layouts/AuthLayout'
import LoginPage from './features/auth/LoginPage'
import ReportsPage from './features/reports/ReportsPage'
import FareMatrixPage from './features/fares/FareMatrixPage'
import TrainFarePage from './features/train-fares/TrainFarePage'
import { getCurrentSession, signOut, subscribeToAuthChanges } from './features/auth/authService'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(() => window.location.hash.slice(1) || 'reports')

  useEffect(() => {
    let mounted = true
    getCurrentSession().then(({ session: currentSession }) => {
      if (mounted) {
        setSession(currentSession)
        setLoading(false)
      }
    })
    const unsubscribe = subscribeToAuthChanges(setSession)
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    function handleHashChange() {
      setActiveTab(window.location.hash.slice(1) || 'reports')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  async function handleSignOut() {
    await signOut()
    setSession(null)
  }

  if (loading)
    return (
      <AuthLayout>
        <p className="loading">Loading…</p>
      </AuthLayout>
    )
  if (!session) return <LoginPage onSignedIn={setSession} />
  if (activeTab === 'fares')
    return (
      <FareMatrixPage
        userEmail={session.user.email}
        onSignOut={handleSignOut}
        onTabChange={setActiveTab}
      />
    )
  if (activeTab === 'train-fares')
    return (
      <TrainFarePage
        userEmail={session.user.email}
        onSignOut={handleSignOut}
        onTabChange={setActiveTab}
      />
    )
  return (
    <ReportsPage
      userEmail={session.user.email}
      onSignOut={handleSignOut}
      onTabChange={setActiveTab}
    />
  )
}

export default App
