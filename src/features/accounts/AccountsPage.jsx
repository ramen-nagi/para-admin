import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import useUnsavedChanges from '../../hooks/useUnsavedChanges'
import { STAFF_ROLES } from '../auth/permissions'
import { listStaffAccounts, setStaffAccess } from './accountsService'
import './accounts.css'

const blankForm = { email: '', role: 'operator', isActive: true }

export default function AccountsPage({ userId, ...layoutProps }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(blankForm)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState(0)
  const original = selected
    ? { email: selected.email, role: selected.role, isActive: selected.is_active }
    : blankForm
  const dirty = JSON.stringify(form) !== JSON.stringify(original)
  useUnsavedChanges(dirty, saving)

  useEffect(() => {
    let mounted = true
    listStaffAccounts()
      .then((rows) => {
        if (mounted) {
          setAccounts(rows)
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Accounts could not be loaded. Check your access and connection.')
          setLoading(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [revision])

  function edit(account) {
    if (dirty && !window.confirm('Discard your unsaved account changes?')) return
    setSelected(account)
    setForm(
      account
        ? { email: account.email, role: account.role, isActive: account.is_active }
        : blankForm,
    )
    setError('')
    setNotice('')
  }

  async function save(event) {
    event.preventDefault()
    if (saving || !dirty) return
    if (!form.isActive && !window.confirm('Disable staff access for ' + form.email + '?')) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await setStaffAccess(form.email, form.role, form.isActive)
      setForm(blankForm)
      setSelected(null)
      setNotice('Staff access saved.')
      setLoading(true)
      setRevision((value) => value + 1)
    } catch (saveError) {
      setError(
        saveError.code === '22023' || saveError.code === '42501'
          ? saveError.message
          : 'Staff access could not be saved. Check your connection and retry.',
      )
    } finally {
      setSaving(false)
    }
  }

  const visible = accounts.filter((account) =>
    (account.email + ' ' + account.role).toLowerCase().includes(search.toLowerCase().trim()),
  )
  const columns = [
    {
      key: 'email',
      label: 'Email',
      render: (account) => (
        <>
          {account.email}
          {account.user_id === userId && ' (you)'}
        </>
      ),
    },
    { key: 'role', label: 'Role', className: 'staff-role' },
    {
      key: 'is_active',
      label: 'Staff access',
      render: (account) => (account.is_active ? 'Active' : 'Disabled'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (account) => (
        <button
          className="secondary-button compact"
          type="button"
          aria-label={'Edit access for ' + account.email}
          disabled={saving || account.user_id === userId}
          onClick={() => edit(account)}
        >
          Edit access
        </button>
      ),
    },
  ]

  return (
    <AdminLayout {...layoutProps} activeTab="accounts">
      <PageHeader
        title="Account Management"
        subtitle="Assign staff roles and manage workspace access."
      />
      <div className="account-role-guide">
        <p>
          <strong>Admin</strong>
          <span>Full access, including account management.</span>
        </p>
        <p>
          <strong>Editor</strong>
          <span>GTFS routes, stops, trips, and schedules.</span>
        </p>
        <p>
          <strong>Operator</strong>
          <span>Reports, route suggestions, and fares.</span>
        </p>
      </div>
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
      <section className="account-access-form" aria-labelledby="access-title">
        <h2 id="access-title">{selected ? 'Edit staff access' : 'Grant staff access'}</h2>
        <p>
          Enter the email of an existing Supabase account. New users must first be created or
          invited through Supabase Authentication.
        </p>
        <form onSubmit={save}>
          <div className="account-form-fields">
            <div className="field-group">
              <label htmlFor="staff-email">Email address</label>
              <input
                id="staff-email"
                type="email"
                required
                value={form.email}
                disabled={saving || Boolean(selected)}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            <div className="field-group">
              <label htmlFor="staff-role">Role</label>
              <select
                id="staff-role"
                value={form.role}
                disabled={saving}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              >
                {STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role[0].toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="staff-active">Staff access</label>
              <select
                id="staff-active"
                value={String(form.isActive)}
                disabled={saving}
                onChange={(event) => setForm({ ...form, isActive: event.target.value === 'true' })}
              >
                <option value="true">Active</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>
          <p>
            Disabling staff access removes workspace permissions. It does not delete the user's
            account or passenger data. You cannot change your own access.
          </p>
          <div className="form-actions">
            <button
              className="primary-button compact"
              disabled={saving || !dirty || !form.email.trim()}
            >
              {saving ? 'Saving...' : 'Save access'}
            </button>
            {(selected || dirty) && (
              <button
                className="secondary-button compact"
                type="button"
                disabled={saving}
                onClick={() => edit(null)}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
      <div className="account-search">
        <label htmlFor="account-search">Search staff accounts</label>
        <input
          id="account-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Email or role"
        />
        <button
          className="secondary-button compact"
          type="button"
          disabled={loading || saving}
          onClick={() => {
            setError('')
            setLoading(true)
            setRevision((value) => value + 1)
          }}
        >
          Refresh
        </button>
      </div>
      {loading ? (
        <p className="loading" role="status">
          Loading staff accounts...
        </p>
      ) : (
        <DataTable
          columns={columns}
          rows={visible}
          getRowKey={(account) => account.user_id}
          caption={
            visible.length ? visible.length + ' staff accounts' : 'No matching staff accounts.'
          }
        />
      )}
    </AdminLayout>
  )
}
