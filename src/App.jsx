import { useEffect, useState } from 'react'
import './App.css'
import AuthLayout from './layouts/AuthLayout'
import LoginPage from './features/auth/LoginPage'
import ReportsPage from './features/reports/ReportsPage'
import { getCurrentSession, signOut, subscribeToAuthChanges } from './features/auth/authService'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getCurrentSession().then(({ session: currentSession }) => {
      if (mounted) { setSession(currentSession); setLoading(false) }
    })
    const unsubscribe = subscribeToAuthChanges(setSession)
    return () => { mounted = false; unsubscribe() }
  }, [])

  async function handleSignOut() {
    await signOut()
    setSession(null)
  }

  if (loading) return <AuthLayout><p className="loading">Loading…</p></AuthLayout>
  if (!session) return <LoginPage onSignedIn={setSession} />
  return <ReportsPage userEmail={session.user.email} onSignOut={handleSignOut} />
}

export default App
