import { useState } from 'react'
import AuthLayout from '../../layouts/AuthLayout'
import BrandLogo from '../../components/BrandLogo'
import { requestPasswordReset, signIn, verifyPasswordResetOtp } from './authService'

function LoginPage({ onSignedIn, onPasswordRecovery }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [recoverySent, setRecoverySent] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [otp, setOtp] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) return setError('Enter your email and password to continue.')

    setSubmitting(true)
    const { session: authenticatedSession, error: signInError } = await signIn(
      email.trim(),
      password,
    )
    if (signInError) setError('Unable to sign in with those credentials.')
    else onSignedIn(authenticatedSession)
    setSubmitting(false)
  }

  async function handleRecovery(event) {
    event.preventDefault()
    setError('')
    if (!email.trim()) return setError('Enter your email address.')

    setSubmitting(true)
    try {
      const { error: resetError } = await requestPasswordReset(email.trim())
      if (resetError?.status === 429 || resetError?.code === 'over_email_send_rate_limit') {
        setError('Too many reset requests. Please wait before trying again.')
        return
      }
      if (resetError) {
        setError('The reset email could not be sent. Please try again.')
        return
      }
      setRecoverySent(true)
    } catch {
      setError('The request could not be completed. Check your connection and retry.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOtpVerification(event) {
    event.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(otp)) return setError('Enter the six-digit code from your email.')

    setSubmitting(true)
    try {
      const { data, error: verificationError } = await verifyPasswordResetOtp(email.trim(), otp)
      if (verificationError || !data.session) {
        setError('That code is invalid or has expired. Request a new code and try again.')
        return
      }
      onPasswordRecovery(data.session)
    } catch {
      setError('The code could not be verified. Check your connection and retry.')
    } finally {
      setSubmitting(false)
    }
  }

  function showSignIn() {
    setRecoveryMode(false)
    setRecoverySent(false)
    setOtp('')
    setError('')
  }

  return (
    <AuthLayout>
      <section className="auth-card login-card" aria-labelledby="signin-title">
        <div className="login-card-accent" aria-hidden="true" />
        <div className="login-brand">
          <BrandLogo />
          <span>Staff portal</span>
        </div>
        <h1 id="signin-title">
          {recoverySent
            ? 'Enter recovery code'
            : recoveryMode
              ? 'Reset your password'
              : 'Welcome back'}
        </h1>
        <p className="subtitle">
          {recoverySent
            ? `We sent a six-digit code to ${email.trim()}.`
            : recoveryMode
              ? 'Enter your staff email and we will send you a one-time recovery code.'
              : 'Sign in to your staff workspace.'}
        </p>
        {recoverySent ? (
          <div className="recovery-confirmation">
            <p className="recovery-email-note">
              If a staff account exists for this address, the code will arrive shortly.
            </p>
            <form onSubmit={handleOtpVerification} noValidate>
              <div className="field-group">
                <label htmlFor="recovery-code">Recovery code</label>
                <input
                  className="recovery-code-input"
                  id="recovery-code"
                  name="recovery-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  disabled={submitting}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting ? 'Verifying...' : 'Verify code'}
              </button>
              <div className="recovery-actions">
                <button
                  className="auth-text-button"
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setRecoverySent(false)
                    setOtp('')
                    setError('')
                  }}
                >
                  Request a new code
                </button>
                <button
                  className="auth-text-button"
                  type="button"
                  disabled={submitting}
                  onClick={showSignIn}
                >
                  Back to sign in
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={recoveryMode ? handleRecovery : handleSubmit} noValidate>
            <div className="field-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@gmail.com"
                required
                disabled={submitting}
              />
            </div>
            {!recoveryMode && (
              <div className="field-group">
                <div className="login-password-heading">
                  <label htmlFor="password">Password</label>
                  <button
                    className="login-forgot-button"
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setRecoveryMode(true)
                      setError('')
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="login-password-wrap">
                  <input
                    id="password"
                    name="password"
                    type={passwordVisible ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={submitting}
                  />
                  <button
                    className="login-password-toggle"
                    type="button"
                    aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                    aria-pressed={passwordVisible}
                    title={passwordVisible ? 'Hide password' : 'Show password'}
                    disabled={submitting}
                    onClick={() => setPasswordVisible((current) => !current)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      {passwordVisible ? (
                        <>
                          <path d="M3 3l18 18" />
                          <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.5 4.2 9.5 6a4 4 0 0 1 .4 1M6.6 6.6C4.5 8 3.1 10 2.5 11c1 1.8 4.5 6 9.5 6a10.5 10.5 0 0 0 4-.8" />
                        </>
                      ) : (
                        <>
                          <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                          <circle cx="12" cy="12" r="2.5" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting
                ? recoveryMode
                  ? 'Sending...'
                  : 'Signing in...'
                : recoveryMode
                  ? 'Send reset link'
                  : 'Sign in'}
            </button>
            {recoveryMode && (
              <button
                className="auth-text-button"
                type="button"
                disabled={submitting}
                onClick={showSignIn}
              >
                Back to sign in
              </button>
            )}
          </form>
        )}
        <p className="login-security-note">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5z" />
          </svg>
          Authorized PARA staff only
        </p>
      </section>
    </AuthLayout>
  )
}

export default LoginPage
