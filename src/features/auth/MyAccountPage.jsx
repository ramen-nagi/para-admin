import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import PageHeader from '../../components/PageHeader'
import useUnsavedChanges from '../../hooks/useUnsavedChanges'
import { useStaffRole } from './RoleContext'
import { changePassword } from './authService'
import { PASSWORD_REQUIREMENTS, passwordValidationError } from './passwordPolicy'
import './my-account.css'

function PasswordField({ id, label, value, onChange, autoComplete, disabled, ...inputProps }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <div className="password-input-wrap">
        <input
          {...inputProps}
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          disabled={disabled}
          value={value}
          onChange={onChange}
        />
        <button
          className="password-visibility-button"
          type="button"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          title={visible ? 'Hide password' : 'Show password'}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            {visible ? (
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
  )
}

export default function MyAccountPage({ userEmail, ...layoutProps }) {
  const role = useStaffRole()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const requirements = [
    ['length', '8 or more characters', newPassword.length >= 8],
    ['letter', 'At least one letter', /[A-Za-z]/.test(newPassword)],
    ['number', 'At least one number', /[0-9]/.test(newPassword)],
    [
      'special',
      'At least one special character',
      /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/.test(newPassword),
    ],
  ]
  const metRequirements = requirements.filter(([, , met]) => met).length
  useUnsavedChanges(Boolean(currentPassword || newPassword || confirmation), saving)

  async function submit(event) {
    event.preventDefault()
    if (saving) return
    setError('')
    setNotice('')

    if (!currentPassword) return setError('Enter your current password.')
    const validationError = passwordValidationError(newPassword)
    if (validationError) return setError(validationError)
    if (newPassword !== confirmation) return setError('The new passwords do not match.')
    if (newPassword === currentPassword)
      return setError('Choose a new password that is different from your current password.')

    setSaving(true)
    try {
      const { error: updateError } = await changePassword(currentPassword, newPassword)
      if (updateError) {
        setError(
          ['reauthentication_needed', 'invalid_credentials'].includes(updateError.code)
            ? 'Your current password is incorrect.'
            : updateError.message || 'Your password could not be changed.',
        )
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setNotice('Your password has been changed.')
    } catch {
      setError('Your password could not be changed. Check your connection and retry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout {...layoutProps} userEmail={userEmail} activeTab="my-account">
      <PageHeader title="My Account" subtitle="View your staff account and update its security." />
      <div className="my-account-grid">
        <section className="my-account-card" aria-labelledby="account-details-title">
          <h2 id="account-details-title">Account details</h2>
          <dl>
            <div>
              <dt>Email address</dt>
              <dd>{userEmail}</dd>
            </div>
            <div>
              <dt>Staff role</dt>
              <dd className="staff-role">{role}</dd>
            </div>
          </dl>
        </section>
        <section className="my-account-card" aria-labelledby="change-password-title">
          <h2 id="change-password-title">Change password</h2>
          <p className="my-account-help">{PASSWORD_REQUIREMENTS}</p>
          <form onSubmit={submit} noValidate>
            <PasswordField
              id="current-password"
              label="Current password"
              autoComplete="current-password"
              required
              disabled={saving}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <PasswordField
              id="account-new-password"
              label="New password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              disabled={saving}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <div
              className="password-requirements"
              aria-label={`${metRequirements} of 4 password requirements met`}
            >
              <div className="password-requirements-heading">
                <strong>Password requirements</strong>
                <span>{metRequirements}/4 met</span>
              </div>
              <div className="requirement-progress" aria-hidden="true">
                {requirements.map(([key, , met]) => (
                  <span key={key} className={met ? 'met' : ''} />
                ))}
              </div>
              <ul>
                {requirements.map(([key, label, met]) => (
                  <li key={key} className={met ? 'met' : ''}>
                    <span aria-hidden="true">{met ? '✓' : '○'}</span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <PasswordField
              id="account-confirm-password"
              label="Confirm new password"
              autoComplete="new-password"
              required
              disabled={saving}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            {confirmation && (
              <p
                className={`password-match ${newPassword === confirmation ? 'matched' : 'unmatched'}`}
                role="status"
              >
                {newPassword === confirmation ? '✓ Passwords match' : 'Passwords do not match yet'}
              </p>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="success-message" role="status">
                {notice}
              </p>
            )}
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? 'Changing password...' : 'Change password'}
            </button>
          </form>
        </section>
      </div>
    </AdminLayout>
  )
}
