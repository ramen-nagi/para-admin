import { useState } from 'react'
import AuthLayout from '../../layouts/AuthLayout'
import { supabase } from '../../lib/supabase'
import useUnsavedChanges from '../../hooks/useUnsavedChanges'

export default function PasswordPage({ session, onDone, onSignOut, authError }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  useUnsavedChanges(Boolean(password || confirmation), saving)

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (password.length < 12) {
      setError('Use at least 12 characters.')
      return
    }
    if (password !== confirmation) {
      setError('The passwords do not match.')
      return
    }
    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message || 'Your password could not be updated.')
        return
      }
      setPassword('')
      setConfirmation('')
      setSaved(true)
    } catch {
      setError('Your password could not be updated. Check your connection and retry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthLayout>
      <section className="auth-card">
        <p className="eyebrow">Para account</p>
        <h1>{saved ? 'Password saved' : 'Set your password'}</h1>
        {authError && (
          <p className="error-message" role="alert">
            {authError}
          </p>
        )}
        {!session ? (
          <>
            <p role="alert">
              This link is invalid or has expired. Ask an administrator to send a new invitation or
              password-reset email.
            </p>
            <button className="secondary-button" onClick={onDone}>
              Back to sign in
            </button>
          </>
        ) : saved ? (
          <>
            <p role="status">Your password has been updated.</p>
            <button className="primary-button" onClick={onDone}>
              Continue to workspace
            </button>
          </>
        ) : (
          <>
            <p>Choose a password for {session.user.email}.</p>
            <form onSubmit={submit}>
              <div className="field-group">
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                  disabled={saving}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="field-group">
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  disabled={saving}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
              <p>Use at least 12 characters.</p>
              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
              <button className="primary-button" disabled={saving}>
                {saving ? 'Saving...' : 'Save password'}
              </button>
            </form>
            <button className="sign-out-button" disabled={saving} onClick={onSignOut}>
              Sign out
            </button>
          </>
        )}
      </section>
    </AuthLayout>
  )
}
