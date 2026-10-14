// The design system's name, edited in place. The saved copy is filed under
// that name, so it commits on blur / Enter through `renameActiveSystem` — the
// rule Home's rename uses — never per keystroke: typing another saved
// system's name on the way would have filed this one over it.

import { useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { useI18n } from '../../lib/i18n'

export default function SystemNameInput({
  className,
  placeholder,
  id,
  ariaLabel,
}: {
  className: string
  placeholder?: string
  id?: string
  ariaLabel?: string
}) {
  const { t } = useI18n()
  const projectName = useDesignStore((s) => s.projectName)
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const commit = () => {
    if (draft === null) return
    const live = useDesignStore.getState()
    const result = live.renameActiveSystem(draft)
    if (result.ok) {
      live.reconcileSavedSystems()
      setDraft(null)
      setError(null)
    } else {
      setError(result.error ?? 'Could not rename')
    }
  }

  return (
    <>
      <input
        id={id}
        value={draft ?? projectName}
        onChange={(e) => { setDraft(e.target.value); setError(null) }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { setDraft(null); setError(null) }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        className={className}
      />
      {error && <p role="alert" className="text-caption text-status-danger">{t(error)}</p>}
    </>
  )
}
