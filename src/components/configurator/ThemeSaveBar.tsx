import { useEffect, useRef, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { useLibraryStatus } from '../../lib/libraryStatus'
import { undoEdit, useEditHistory } from '../../lib/editHistory'
import { goToLogin, useAccess } from '../../lib/access'
import { useI18n } from '../../lib/i18n'
import { WORKSPACE_CHROME } from './themeWorkspaceLayout'
import { resolveThemeFoundations } from '../../lib/themeFoundations'
import { SETUP_SAVE_LABEL, SETUP_STEPS, advanceThemeSetup, finishThemeSetup, useSetupStep, useStepChanged } from '../../lib/themeSetup'
import { showToast } from '../ui/Toast'
import { burstConfetti } from '../../lib/celebrate'
import { resolvePreviewTokens } from '../../lib/previewTokens'

/** Color edition and the Random-explore footer share this mark. */
export function RandomThemeButton({
  onClick,
  label,
  variant = 'tweak',
}: {
  onClick: () => void
  /** Color edition says "Random tweak"; the explore footer says "Random". */
  label?: string
  variant?: 'tweak' | 'bar'
}) {
  const { t } = useI18n()
  const text = label ?? t('Random tweak')
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={text}
      title={text}
      className={`relative flex h-8 items-center justify-center gap-1.5 rounded-lg bg-line text-fg-muted transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-elevated hover:text-fg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
        variant === 'bar'
          ? 'min-w-0 flex-1 text-caption font-semibold'
          : 'w-full text-mini font-normal'
      }`}
    >
      <span
        aria-hidden
        className="relative z-[1] block size-[14px] flex-shrink-0 bg-current"
        style={{
          WebkitMask: "url('/icons/settings/random.svg') center / contain no-repeat",
          mask: "url('/icons/settings/random.svg') center / contain no-repeat",
        }}
      />
      <span className="relative z-[1] truncate">{text}</span>
      <span aria-hidden className="random-theme-border pointer-events-none absolute inset-0 rounded-lg" />
    </button>
  )
}

/**
 * The inspector's pinned footer on every EDITING tab (Theme and Variables):
 * Undo beside Save / Update theme. Persistence and the way back are not a
 * property of one edition, so they sit under whichever panel is open. Undo
 * walks the same edit history as the canvas header's Undo and ⌘Z, so the
 * doors can't disagree about where you are.
 *
 * Home → Random lands here in explore mode: Random is the primary action
 * (spin another look on this theme) and Save theme is how you keep one.
 */
export default function ThemeSaveBar({
  inactive = false,
  exploringRandom = false,
  onRandom,
  onSaved,
}: {
  /** Variables: greyed out, both controls. Theme keeps Save live — it is also
   *  the door that leads a guest to create an account. */
  inactive?: boolean
  /** A theme minted from Home → Random, not yet saved. */
  exploringRandom?: boolean
  onRandom?: () => void
  /** After a successful save while exploring — the shell leaves this mode. */
  onSaved?: () => void
}) {
  const { t } = useI18n()
  const access = useAccess()
  const status = useLibraryStatus()
  const lastUndo = useEditHistory((h) => h.past[h.past.length - 1]?.label)
  const canUndo = useEditHistory((h) => h.past.length > 0)
  const [justSaved, setJustSaved] = useState(false)
  useEffect(() => {
    if (!justSaved) return
    const id = window.setTimeout(() => setJustSaved(false), 2000)
    return () => window.clearTimeout(id)
  }, [justSaved])

  const saved = status === 'saved'
  const label = justSaved || saved ? t('Saved') : status === 'dirty' ? t('Update theme') : t('Save theme')
  const undoLabel = lastUndo ? `${t('Undo')} — ${lastUndo}` : t('Undo')

  return (
    // `[&&]:!flex-none` beats the inspector slot's `[&>*]:!flex-1` (which
    // stretches a portaled panel): as a direct slot child (Variables) the bar
    // must stay its own height, pinned under the scrolling nav.
    <div className={`flex flex-shrink-0 [&&]:!flex-none items-center gap-2 border-t border-line px-3 py-3 ${WORKSPACE_CHROME}`}>
      <button
        type="button"
        onClick={() => undoEdit()}
        disabled={inactive || !canUndo}
        aria-label={undoLabel}
        title={`${undoLabel} (⌘Z)`}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-line text-fg-muted transition-[color,border-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:border-line-strong hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5.5 3.5 2.5 6.5l3 3" />
          <path d="M2.5 6.5h7a4 4 0 0 1 0 8H7" />
        </svg>
      </button>
      {exploringRandom && onRandom && !inactive ? (
        <>
          <button
            type="button"
            onClick={() => {
              if (access.gated) { goToLogin('save-library'); return }
              useDesignStore.getState().saveCurrentSystem()
              setJustSaved(true)
              onSaved?.()
            }}
            className="flex h-8 flex-shrink-0 items-center rounded-lg border border-line px-2.5 text-caption font-semibold text-fg transition-colors hover:border-line-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          >
            {t('Save theme')}
          </button>
          <RandomThemeButton onClick={onRandom} label={t('Random')} variant="bar" />
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            // A guest signs up first; the shell finishes the save on return.
            if (access.gated) { goToLogin('save-library'); return }
            useDesignStore.getState().saveCurrentSystem()
            setJustSaved(true)
          }}
          disabled={inactive || (saved && !justSaved)}
          className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg text-caption font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
            inactive ? 'cursor-not-allowed bg-chip-rest text-fg-faint' : 'bg-accent-solid text-accent-ink disabled:opacity-50'
          }`}
        >
          {/* Saved → a check beside the label, so the dimmed button reads as
              "done", not "unavailable". */}
          {(saved || justSaved) && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2.5 6.5 5 9l4.5-5.5" />
            </svg>
          )}
          <span className="truncate">{label}</span>
        </button>
      )}
    </div>
  )
}

/**
 * The footer while a theme is in GUIDED SETUP (`lib/themeSetup`): which step
 * this is, the step's action and the way out. The action names what really
 * happens — "Use Inter" when the step was left as it came, "Save font" once
 * something changed — and the last step says Finish. "Skip setup" ends the
 * guide at once, leaving every remaining edition at its default.
 */
export function ThemeSetupBar({ themeKey }: { themeKey: string }) {
  const { t } = useI18n()
  const step = useSetupStep(themeKey) ?? 0
  const changed = useStepChanged(themeKey)
  const fontFamily = useDesignStore((s) => resolveThemeFoundations(s, themeKey).typography.fontFamily)
  const current = SETUP_STEPS[step]
  const last = step === SETUP_STEPS.length - 1
  const keep = current === 'typography' && fontFamily ? t('Use {name}', { name: fontFamily }) : t('Use default')
  const label = last
    ? (changed ? t('Save & finish') : t('Finish'))
    : changed ? t(SETUP_SAVE_LABEL[current]) : keep

  const finishRef = useRef<HTMLButtonElement>(null)
  const done = () => showToast(t('Your theme is ready — every edition is open now.'))
  // The finished theme throws its OWN colours: accent first, then the states.
  const celebrate = () => {
    const s = useDesignStore.getState()
    const tk = resolvePreviewTokens(s, themeKey, s.themeKinds[themeKey] ?? 'light')
    burstConfetti(finishRef.current, [tk.brandSolid, tk.brandSolid, tk.successColor ?? '', tk.warningColor ?? '', tk.infoColor ?? '', tk.errorColor])
  }
  return (
    <div className={`flex flex-shrink-0 flex-col gap-2.5 border-t border-line px-3 py-3 ${WORKSPACE_CHROME}`}>
      <div className="flex items-center gap-2">
        <span className="text-caption font-semibold text-fg">{t('Step {n} of {total}', { n: step + 1, total: SETUP_STEPS.length })}</span>
        <span className="flex flex-1 gap-1" aria-hidden>
          {SETUP_STEPS.map((s, i) => (
            <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent-solid' : 'bg-fg/10'}`} />
          ))}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { finishThemeSetup(themeKey); done() }}
          className="h-8 flex-shrink-0 rounded-lg px-2.5 text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          {t('Skip setup')}
        </button>
        <button
          ref={finishRef}
          type="button"
          onClick={() => { if (advanceThemeSetup(themeKey)) { celebrate(); done() } }}
          className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-solid text-caption font-semibold text-accent-ink transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          <span className="truncate">{label}</span>
          {!last && (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

/** Create-studio footer on the canvas card — same language as the plugin
 *  setup bar: which step this is, Skip setup, and a Continue that names
 *  what it keeps ("Use Inter →"). */
export function CreateStudioBar({
  stepIndex,
  total,
  continueLabel,
  last,
  onSkip,
  onContinue,
}: {
  stepIndex: number
  total: number
  continueLabel: string
  last: boolean
  onSkip: () => void
  onContinue: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-shrink-0 flex-col gap-2.5 border-t border-line bg-app px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-caption font-semibold text-fg">{t('Step {n} of {total}', { n: stepIndex + 1, total })}</span>
        <span className="flex flex-1 gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-accent-solid' : 'bg-fg/10'}`} />
          ))}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="h-8 flex-shrink-0 rounded-lg border border-line bg-surface px-2.5 text-caption font-medium text-fg transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          {t('Skip setup')}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          <span className="truncate">{continueLabel}</span>
          {!last && (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
