import { useEffect } from 'react'

export function canLeaveEditor() {
  return window.dispatchEvent(new Event('admin:before-navigate', { cancelable: true }))
}

export default function useUnsavedChanges(dirty, busy = false) {
  useEffect(() => {
    function beforeUnload(event) {
      if (!dirty && !busy) return
      event.preventDefault()
      event.returnValue = ''
    }
    function beforeNavigate(event) {
      if (busy || (dirty && !window.confirm('Discard your unsaved changes?'))) event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('admin:before-navigate', beforeNavigate)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('admin:before-navigate', beforeNavigate)
    }
  }, [dirty, busy])
}
