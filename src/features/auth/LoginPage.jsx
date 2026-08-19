import { useEffect, useState } from 'react'
import AuthLayout from '../../layouts/AuthLayout'
import { getCurrentSession, signInAsAdmin, subscribeToAuthChanges } from './authService'

function LoginPage({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    getCurrentSession().then(() => {
      if (mounted) {
        setLoading(false)
      }
    })

    const unsubscribe = subscribeToAuthChanges((currentSession) => {
      if (currentSession) {
        console.info('[Para Admin] Signed in:', currentSession.user.email)
      }
      if (currentSession) onSignedIn(currentSession)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [onSignedIn])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.')
      return
    }

    setSubmitting(true)
    const {
      session: authenticatedSession,
      error: signInError,
      isAdmin,
    } = await signInAsAdmin(email.trim(), password)

    if (signInError) {
      setError('Unable to sign in with those credentials.')
    } else if (!isAdmin) {
      setError('This account does not have administrator access.')
    } else {
      onSignedIn(authenticatedSession)
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <AuthLayout>
        <p className="loading">Loading…</p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <section className="auth-card" aria-labelledby="signin-title">
        <div className="brand-mark" aria-hidden="true">
          P
        </div>
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
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </AuthLayout>
  )
}

export default LoginPage
