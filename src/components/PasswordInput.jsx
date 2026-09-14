import { useState } from 'react'
import './password-input.css'

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  ...inputProps
}) {
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
