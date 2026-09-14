import { useEffect, useState } from 'react'
import AdminLayout from '../../layouts/AdminLayout'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import useUnsavedChanges from '../../hooks/useUnsavedChanges'
import { STAFF_ROLES } from '../auth/permissions'
import { PASSWORD_REQUIREMENTS, passwordValidationError } from '../auth/passwordPolicy'
import {
  createManagedUser,
  listManagedUsers,
  sendAccountEmail,
  setManagedUserAccess,
} from './accountsService'
import './accounts.css'

const emptyForm = { email: '', password: '', role: 'passenger', staffActive: true }
const statusLabels = {
  active: 'Active',
  pending: 'Awaiting confirmation',
  disabled: 'Staff access disabled',
  suspended: 'Account suspended',
}
const dateLabel = (value) => (value ? new Date(value).toLocaleString() : 'Never')

export default function AccountsPage({ userId, accountKind = 'passenger', ...layoutProps }) {
  const isStaffView = accountKind === 'staff'
  const defaultRole = isStaffView ? 'operator' : 'passenger'
  const [directory, setDirectory] = useState({ users: [], total: 0 })
  const [query, setQuery] = useState({
    search: '',
    kind: accountKind,
    status: 'all',
    page: 0,
    revision: 0,
  })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mode, setMode] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const original = selected
    ? {
        ...emptyForm,
        email: selected.email || '',
        role: selected.role,
        staffActive: selected.staff_active ?? true,
      }
    : { ...emptyForm, role: mode === 'invite' ? 'operator' : defaultRole }
  const dirty = mode !== null && JSON.stringify(form) !== JSON.stringify(original)
  useUnsavedChanges(dirty, saving)

  useEffect(() => {
    let mounted = true
    listManagedUsers(query)
      .then((result) => {
        if (!mounted) return
        if (query.page > 0 && query.page * 25 >= result.total) {
          setQuery((current) => ({
            ...current,
            page: Math.max(0, Math.ceil(result.total / 25) - 1),
          }))
          return
        }
        setDirectory(result)
        setLoading(false)
      })
      .catch(() => {
        if (mounted) {
          setDirectory({ users: [], total: 0 })
          setError('Users could not be loaded. Check your administrator access and connection.')
          setLoading(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [query])

  function refresh(changes = {}) {
    setLoading(true)
    setQuery((current) => ({ ...current, revision: current.revision + 1, ...changes }))
  }

  function openForm(nextMode, account = null) {
    if (saving || (dirty && !window.confirm('Discard your unsaved user changes?'))) return
    setMode(nextMode)
    setSelected(account)
    setForm(
      account
        ? {
            ...emptyForm,
            email: account.email || '',
            role: account.role,
            staffActive: account.staff_active ?? true,
          }
        : { ...emptyForm, role: nextMode === 'invite' ? 'operator' : defaultRole },
    )
    setError('')
    setNotice('')
  }

  async function save(event) {
    event.preventDefault()
    if (saving) return
    if (mode === 'create') {
      const validationError = passwordValidationError(form.password)
      if (validationError) return setError(validationError)
    }
    if (
      mode === 'edit' &&
      selected.role !== 'passenger' &&
      form.role === 'passenger' &&
      !window.confirm(
        'Remove all staff access for ' +
          selected.email +
          '? Their passenger account and data will remain.',
      )
    )
      return
    if (
      mode === 'edit' &&
      form.role !== 'passenger' &&
      !form.staffActive &&
      !window.confirm('Disable staff access for ' + selected.email + '?')
    )
      return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      let result
      if (mode === 'create')
        result = await createManagedUser(form.email.trim(), form.password, form.role)
      else if (mode === 'invite') result = await sendAccountEmail('invite', form.email, form.role)
      else {
        await setManagedUserAccess(selected.user_id, form.role, form.staffActive)
        result = {
          message:
            form.role === 'passenger'
              ? 'Passenger access saved. Staff permissions removed.'
              : 'Staff access saved.',
        }
      }
      setForm(emptyForm)
      setSelected(null)
      setMode(null)
      if (result.warning) setError(result.warning)
      else setNotice(result.message)
      refresh()
    } catch (saveError) {
      setError(
        mode === 'edit' && !['22023', '42501'].includes(saveError.code)
          ? 'User access could not be saved. Check your connection and retry.'
          : saveError.message,
      )
    } finally {
      setSaving(false)
    }
  }

  async function emailAccount(account) {
    const action = account.email_confirmed_at ? 'reset_password' : 'resend_invite'
    if (
      !window.confirm(
        (action === 'reset_password'
          ? 'Send a password-reset email to '
          : 'Resend the invitation to ') +
          account.email +
          '?',
      )
    )
      return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await sendAccountEmail(action, account.email)
      setNotice(result.message)
      refresh()
    } catch (emailError) {
      setError(emailError.message)
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(directory.total / 25))
  const columns = [
    {
      key: 'email',
      label: 'User',
      render: (account) => (
        <div className="managed-user-identity">
          <strong>
            {account.display_name || account.email || account.phone || 'Anonymous passenger'}
            {account.user_id === userId && ' (you)'}
          </strong>
          {account.display_name && <span>{account.email || account.phone}</span>}
          <span className="managed-user-id">{account.user_id}</span>
        </div>
      ),
    },
    ...(isStaffView ? [{ key: 'role', label: 'Role', className: 'staff-role' }] : []),
    {
      key: 'status',
      label: 'Status',
      render: (account) => (
        <span className={'account-status ' + account.status}>
          {statusLabels[account.status] || account.status}
        </span>
      ),
    },
    { key: 'created_at', label: 'Created', render: (account) => dateLabel(account.created_at) },
    {
      key: 'last_sign_in_at',
      label: 'Last sign-in',
      render: (account) => dateLabel(account.last_sign_in_at),
    },
    ...(isStaffView
      ? [
          {
            key: 'actions',
            label: 'Actions',
            render: (account) => (
              <div className="account-row-actions">
                <button
                  className="secondary-button compact"
                  type="button"
                  disabled={saving || account.user_id === userId}
                  aria-label={'Manage access for ' + (account.email || account.user_id)}
                  onClick={() => openForm('edit', account)}
                >
                  Manage access
                </button>
                {account.email && (
                  <button
                    className="secondary-button compact"
                    type="button"
                    disabled={
                      saving || account.status === 'suspended' || account.staff_active === false
                    }
                    onClick={() => emailAccount(account)}
                  >
                    {account.email_confirmed_at ? 'Send reset link' : 'Resend invitation'}
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <AdminLayout {...layoutProps} activeTab={accountKind}>
      <PageHeader
        title={isStaffView ? 'Staff Management' : 'Passenger Management'}
        subtitle={
          isStaffView
            ? 'Manage staff roles and access to PARA Admin.'
            : 'Manage accounts used in the passenger app.'
        }
      >
        {isStaffView && (
          <button
            className="primary-button compact"
            type="button"
            disabled={saving}
            onClick={() => openForm('invite')}
          >
            Invite staff
          </button>
        )}
      </PageHeader>
      <p className="user-management-help">
        {isStaffView
          ? 'Staff roles control access to PARA Admin and the GTFS editor.'
          : ''}
      </p>
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
      {mode && (
        <section className="account-access-form" aria-labelledby="user-form-title">
          <h2 id="user-form-title">
            {mode === 'create'
              ? isStaffView
                ? 'Create staff account'
                : 'Create passenger account'
              : mode === 'invite'
                ? 'Invite staff'
                : 'Manage user access'}
          </h2>
          {mode === 'edit' ? (
            <p>{selected.email || selected.phone || selected.user_id}</p>
          ) : (
            <p>
              {mode === 'create'
                ? 'Creates an email-confirmed account with the password you enter. No email is sent.'
                : 'Send an invitation so your team member can set their own password.'}
            </p>
          )}
          <form onSubmit={save}>
            <div className="account-form-fields">
              {mode !== 'edit' && (
                <div className="field-group">
                  <label htmlFor="user-email">Email address</label>
                  <input
                    id="user-email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="off"
                    disabled={saving}
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                  />
                </div>
              )}
              {mode === 'create' && (
                <div className="field-group">
                  <label htmlFor="user-password">Initial password</label>
                  <input
                    id="user-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    disabled={saving}
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                  />
                  <small>{PASSWORD_REQUIREMENTS}</small>
                </div>
              )}
              {isStaffView && (
                <div className="field-group">
                  <label htmlFor="user-role">Role</label>
                  <select
                    id="user-role"
                    value={form.role}
                    disabled={saving}
                    onChange={(event) => setForm({ ...form, role: event.target.value })}
                  >
                    {mode === 'edit' && <option value="passenger">Passenger</option>}
                    {STAFF_ROLES.map((role) => (
                      <option
                        key={role}
                        value={role}
                        disabled={mode === 'edit' && (selected.is_anonymous || !selected.email)}
                      >
                        {role[0].toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {mode === 'edit' && form.role !== 'passenger' && (
                <div className="field-group">
                  <label htmlFor="staff-active">Staff access</label>
                  <select
                    id="staff-active"
                    value={String(form.staffActive)}
                    disabled={saving}
                    onChange={(event) =>
                      setForm({ ...form, staffActive: event.target.value === 'true' })
                    }
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              )}
            </div>
            {mode === 'edit' && (
              <p>
                Choosing Passenger removes staff permissions and preserves passenger data. Disabling
                staff access does not suspend the passenger account.
              </p>
            )}
            <div className="form-actions">
              <button
                className="primary-button compact"
                disabled={saving || (mode === 'edit' && !dirty)}
              >
                {saving
                  ? 'Saving...'
                  : mode === 'create'
                    ? isStaffView
                      ? 'Create staff'
                      : 'Create passenger'
                    : mode === 'invite'
                      ? 'Send invitation'
                      : 'Save access'}
              </button>
              <button
                className="secondary-button compact"
                type="button"
                disabled={saving}
                onClick={() => openForm(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      <form
        className="account-search"
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          refresh({ search: search.trim(), page: 0 })
        }}
      >
        <label htmlFor="account-search">Search users</label>
        <input
          id="account-search"
          type="search"
          maxLength={200}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Email, name, phone, or user ID"
        />
        <button className="secondary-button compact" disabled={saving}>
          Search
        </button>
        {isStaffView && (
          <select
            aria-label="Filter by staff role"
            value={query.kind}
            disabled={saving}
            onChange={(event) => refresh({ kind: event.target.value, page: 0 })}
          >
            <option value="staff">All staff</option>
            {STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {role[0].toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Filter by account status"
          value={query.status}
          disabled={saving}
          onChange={(event) => refresh({ status: event.target.value, page: 0 })}
        >
          <option value="all">All statuses</option>
          {Object.entries(statusLabels).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
        <button
          className="secondary-button compact"
          type="button"
          disabled={loading || saving}
          onClick={() => {
            setError('')
            refresh()
          }}
        >
          Refresh
        </button>
      </form>
      {loading ? (
        <p className="loading" role="status">
          Loading users...
        </p>
      ) : (
        <DataTable
          pageSize={0}
          columns={columns}
          rows={directory.users}
          getRowKey={(account) => account.user_id}
          caption={directory.total ? directory.total + ' matching users' : 'No matching users.'}
          footer={
            <nav className="table-pagination" aria-label="User directory pages">
              <span>
                Page {query.page + 1} of {totalPages}
              </span>
              <div className="row-actions">
                <button
                  className="secondary-button compact"
                  disabled={query.page === 0 || saving}
                  onClick={() => refresh({ page: query.page - 1 })}
                >
                  Previous
                </button>
                <button
                  className="secondary-button compact"
                  disabled={query.page + 1 >= totalPages || saving}
                  onClick={() => refresh({ page: query.page + 1 })}
                >
                  Next
                </button>
              </div>
            </nav>
          }
        />
      )}
    </AdminLayout>
  )
}
