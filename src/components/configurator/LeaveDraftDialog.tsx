// "Leave without saving?" — shown when Home is pressed while a brand is still a
// draft (made here, never saved). Leaving throws the draft away, so the design
// system never holds a brand nobody kept.

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../lib/i18n'

export default function LeaveDraftDialog({
  open,
  names,
  onStay,
  onLeave,
}: {
  open: boolean
  /** Display names of the brands that would be discarded. */
  names: string[]
  onStay: () => void
  onLeave: () => void
}) {
  const { t } = useI18n()
  const stayRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    stayRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onStay() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onStay])
  if (!open) return null
  const what = names.length === 1 ? `“${names[0]}”` : t('these brands')
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm" onClick={onStay}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-draft-title"
        className="w-full max-w-sm rounded-2xl border border-line bg-app p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="leave-draft-title" className="text-title font-semibold text-fg">{t('Leave without saving?')}</h2>
        <p className="mt-2 text-caption text-fg-muted">
          {t('{what} is not saved yet. If you leave now you will lose it, and it will not be added to your design system.', { what })}
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onLeave}
            className="h-9 rounded-xl px-3 text-body font-medium text-status-danger transition-colors hover:bg-status-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/50"
          >
            {t('Leave and discard')}
          </button>
          <button
            ref={stayRef}
            type="button"
            onClick={onStay}
            className="h-9 rounded-xl bg-cta px-4 text-body font-semibold text-cta-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          >
            {t('Keep editing')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
