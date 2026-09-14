import { useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import PageHeader from '../../components/PageHeader'
import PasswordInput from '../../components/PasswordInput'
import useUnsavedChanges from '../../hooks/useUnsavedChanges'
import { useStaffRole } from './RoleContext'
import { changePassword } from './authService'
import { PASSWORD_REQUIREMENTS, passwordValidationError } from './passwordPolicy'
import './my-account.css'

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
            <PasswordInput
              id="current-password"
              label="Current password"
              autoComplete="current-password"
              required
              disabled={saving}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <PasswordInput
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
            <PasswordInput
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
