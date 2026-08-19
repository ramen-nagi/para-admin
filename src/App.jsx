import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (mounted) {
        if (currentSession) {
          console.info('[Para Admin] Signed in already:', currentSession.user.email)
        }
        setSession(currentSession)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (currentSession) {
          console.info('[Para Admin] Signed in:', currentSession.user.email)
        }
        setSession(currentSession)
      },
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.')
      return
    }

    setSubmitting(true)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError('Unable to sign in with those credentials.')
      setSubmitting(false)
      return
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (adminError || !adminUser) {
      await supabase.auth.signOut()
      setError('This account does not have administrator access.')
    }

    setSubmitting(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null)
  }

  if (loading) {
    return <main className="auth-page"><p className="loading">Loading…</p></main>
  }

  if (session) {
    return (
      <main className="auth-page">
        <section className="welcome-card" aria-labelledby="welcome-title">
          <p className="eyebrow">Para Admin</p>
          <h1 id="welcome-title">You’re signed in.</h1>
          <p className="welcome-copy">Your administrator account is ready for the dashboard.</p>
          <button className="secondary-button" type="button" onClick={handleSignOut}>Sign out</button>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="signin-title">
        <div className="brand-mark" aria-hidden="true">P</div>
        <p className="eyebrow">Para Admin</p>
        <h1 id="signin-title">Welcome back</h1>
        <p className="subtitle">Sign in to manage your administrator workspace.</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default App
