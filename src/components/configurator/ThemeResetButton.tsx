import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { captureSnapshot, type DesignSnapshot, useDesignStore } from '../../store/useDesignStore'
import { useApplyAccentColor } from '../../lib/colorActions'
import { resetThemeToOrigin, themeHasEdits } from '../../lib/adoptPreset'
import { themeStylePreset } from '../../lib/themePresets'
import { useI18n } from '../../lib/i18n'

const UNDO_MS = 9000

/**
 * Theme-wide Reset + 9s Undo. Same control Theme Preview's canvas header and
 * Variables Preview's title row share — one action, two doors, so they cannot
 * disagree about what "reset this theme" means.
 */
export function useThemeReset(previewTheme: string, enabled = true) {
  const store = useDesignStore()
  const applyAccent = useApplyAccentColor()
  const [undo, setUndo] = useState<DesignSnapshot | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const originPreset = themeStylePreset(store.themeOrigin?.[previewTheme] ?? '')
  const target = originPreset?.label ?? 'System defaults'
  const show = enabled && (Boolean(undo) || themeHasEdits(store, previewTheme))

  useEffect(() => {
    setUndo(null)
    if (timer.current) clearTimeout(timer.current)
  }, [previewTheme])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const onClick = () => {
    if (undo) {
      useDesignStore.setState(undo)
      setUndo(null)
      if (timer.current) clearTimeout(timer.current)
      return
    }
    const snapshot = captureSnapshot(useDesignStore.getState() as unknown as DesignSnapshot)
    resetThemeToOrigin(previewTheme, applyAccent)
    setUndo(snapshot)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setUndo(null), UNDO_MS)
  }

  return { show, mode: (undo ? 'undo' : 'reset') as 'undo' | 'reset', target, onClick }
}

export function ThemeResetButton({
  mode, target, onClick,
}: {
  mode: 'reset' | 'undo'
  target: string
  onClick: () => void
}) {
  const { t } = useI18n()
  const label = mode === 'undo' ? t('Undo reset') : t('Reset theme')
  const title = mode === 'undo' ? label : `${label} — ${t(target)}`
  return (
    <div className="flex h-8 items-center rounded-lg border border-line p-0.5">
      <button
        type="button"
        onClick={onClick}
        aria-label={title}
        title={title}
        className="flex h-7 items-center rounded-md px-2 text-caption font-normal tracking-[0.18px] text-fg-faint transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-surface hover:text-fg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        {label}
      </button>
    </div>
  )
}


/**
 * Themes-library footer Reset.
 *
 * Replaces the Sync · Push track that used to sit here. Both of those doors
 * survive elsewhere — Figma from the canvas header's Sync button and each
 * theme's own options menu, GitHub from the connection rail, SaveView, the
 * Export wizard and Docs — so nothing was orphaned by taking them out of a
 * footer that had become the least-looked-at corner of the workspace.
 *
 * The scope is a real QUESTION, not a default, which is why it opens a modal
 * rather than acting on click: "reset" can mean the theme you are editing or
 * the entire system, and those differ by everything. This is also the reason
 * the whole-system reset is allowed back into the UI at all — it was pulled
 * because it was "a rare, no-undo action given equal billing" as a bare pill.
 * Behind a modal it is neither: it has to be chosen by name, and it snapshots
 * for the same 9s Undo the theme reset already had.
 */
const RESET_UNDO_MS = 9000

type ResetScope = 'theme' | 'system'

export function ResetScopeControl({ previewTheme }: { previewTheme: string }) {
  const { t } = useI18n()
  const store = useDesignStore()
  const applyAccent = useApplyAccentColor()
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [undo, setUndo] = useState<{ snapshot: DesignSnapshot; scope: ResetScope } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstOptionRef = useRef<HTMLButtonElement>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    firstOptionRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const originPreset = themeStylePreset(store.themeOrigin?.[previewTheme] ?? '')
  const themeTarget = originPreset?.label ?? t('System defaults')
  const themeEdited = themeHasEdits(store, previewTheme)

  const run = (scope: ResetScope) => {
    const snapshot = captureSnapshot(useDesignStore.getState() as unknown as DesignSnapshot)
    if (scope === 'theme') resetThemeToOrigin(previewTheme, applyAccent)
    else useDesignStore.getState().resetToDefaults()
    setUndo({ snapshot, scope })
    setOpen(false)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setUndo(null), RESET_UNDO_MS)
  }

  const revert = () => {
    if (!undo) return
    useDesignStore.setState(undo.snapshot)
    setUndo(null)
    if (timer.current) clearTimeout(timer.current)
  }

  if (undo) {
    return (
      <div className="flex h-9 w-full items-center justify-between gap-2 rounded-xl bg-app px-2.5">
        <span className="min-w-0 truncate text-caption text-fg-muted">
          {undo.scope === 'theme' ? t('Theme reset') : t('System reset')}
        </span>
        <button
          type="button"
          onClick={revert}
          className="flex-shrink-0 rounded-md px-2 py-1 text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          {t('Undo')}
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-app text-caption tracking-[0.18px] text-fg-faint transition-colors hover:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        <ResetGlyph />
        {t('Reset')}
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
              onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="reset-scope-title"
                className="w-full max-w-[380px] rounded-xl border border-line-strong bg-app p-4 shadow-xl"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2 id="reset-scope-title" className="text-ui font-semibold text-fg">{t('Reset')}</h2>
                <p className="mt-1 text-caption text-fg-muted">{t('Both can be undone for 9 seconds.')}</p>

                <div className="mt-3 flex flex-col gap-1.5">
                  <button
                    ref={firstOptionRef}
                    type="button"
                    onClick={() => run('theme')}
                    disabled={!themeEdited}
                    className="flex flex-col items-start gap-0.5 rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:enabled:border-line-strong hover:enabled:bg-elevated disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                  >
                    <span className="text-caption font-medium text-fg">{t('This theme')}</span>
                    <span className="text-caption text-fg-muted">
                      {themeEdited
                        ? `${t('Back to')} ${themeTarget}. ${t('The rest of the system is untouched.')}`
                        : t('No edits to reset.')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => run('system')}
                    className="flex flex-col items-start gap-0.5 rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:border-status-danger/40 hover:bg-status-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/50"
                  >
                    <span className="text-caption font-medium text-status-danger">{t('Whole system')}</span>
                    <span className="text-caption text-fg-muted">
                      {t('Every theme and foundation back to defaults.')}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-3 h-8 w-full rounded-lg border border-line text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                >
                  {t('Cancel')}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

function ResetGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 8a5.5 5.5 0 1 0 1.7-3.97" />
      <path d="M2.2 3.2v3.1h3.1" />
    </svg>
  )
}
