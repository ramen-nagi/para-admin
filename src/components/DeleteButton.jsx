import { useRef, useState } from 'react'
import { mutationError } from '../lib/crud'
import useUnsavedChanges from '../hooks/useUnsavedChanges'
import { useStaffRole } from '../features/auth/RoleContext'

export default function DeleteButton({ label, onDelete, onDeleted, disabled = false }) {
  const role = useStaffRole()
  const dialog = useRef(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  useUnsavedChanges(false, deleting)

  async function confirmDelete() {
    setDeleting(true)
    setError('')
    try {
      const result = await onDelete()
      if (result.error)
        setError(mutationError(result.error, 'The record could not be deleted. Please try again.'))
      else {
        dialog.current.close()
        onDeleted()
      }
    } catch {
      setError('The record could not be deleted. Check your connection and try again.')
    } finally {
      setDeleting(false)
    }
  }

  if (role !== 'admin') return null

  return (
    <>
      <button
        className="danger-button compact"
        type="button"
        disabled={disabled || deleting}
        onClick={() => {
          setError('')
          dialog.current.showModal()
        }}
      >
        Delete
      </button>
      <dialog
        ref={dialog}
        className="confirm-dialog"
        aria-label="Confirm deletion"
        onCancel={(event) => {
          if (deleting) event.preventDefault()
        }}
      >
        <p className="eyebrow">Delete record</p>
        <h2>Delete this record?</h2>
        <p className="delete-record-label">{label}</p>
        <p>This permanently removes the record. This action cannot be undone.</p>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            className="secondary-button compact"
            type="button"
            autoFocus
            disabled={deleting}
            onClick={() => dialog.current.close()}
          >
            Cancel
          </button>
          <button
            className="danger-button compact"
            type="button"
            disabled={deleting}
            onClick={confirmDelete}
          >
            {deleting ? 'Deleting…' : 'Delete record'}
          </button>
        </div>
      </dialog>
    </>
  )
}
