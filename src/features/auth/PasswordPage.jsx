import { useState } from 'react'
import AuthLayout from '../../layouts/AuthLayout'
import PasswordInput from '../../components/PasswordInput'
import { supabase } from '../../lib/supabase'
import useUnsavedChanges from '../../hooks/useUnsavedChanges'
import { PASSWORD_REQUIREMENTS, passwordValidationError } from './passwordPolicy'

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
    const validationError = passwordValidationError(password)
    if (validationError) return setError(validationError)
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
              <PasswordInput
                id="new-password"
                label="New password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                disabled={saving}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <PasswordInput
                id="confirm-password"
                label="Confirm new password"
                autoComplete="new-password"
                required
                disabled={saving}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
              <p>{PASSWORD_REQUIREMENTS}</p>
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
