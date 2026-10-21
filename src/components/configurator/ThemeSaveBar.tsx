import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { useLibraryStatus, useUnsavedBrands } from '../../lib/libraryStatus'
import { undoEdit, useEditHistory } from '../../lib/editHistory'
import { goToLogin, useAccess } from '../../lib/access'
import { useI18n } from '../../lib/i18n'
import { WORKSPACE_CHROME } from './themeWorkspaceLayout'
import { SETUP_STEPS, advanceThemeSetup, finishThemeSetup, forgetUnsavedBrand, retreatThemeSetup, useSetupStep } from '../../lib/themeSetup'
import { showToast } from '../ui/Toast'
import { burstConfetti } from '../../lib/celebrate'
import { resolvePreviewTokens } from '../../lib/previewTokens'
import { requestOpenGithub } from '../../lib/guestSave'
import { AccountCloudStatus } from './AccountCloudStatus'
import { FigmaGlyph } from '../ui/icons'

/**
 * The three places a system ships to — the whole product's promise, in the
 * footer of every editing inspector (design-plans/entry-flow-set-see-ship.md).
 * One vocabulary everywhere: CSS · Figma · Agent. "Get code" is no longer a
 * label: it opened the Code tab on Agent context, which is not the file most
 * people came for.
 */
export interface ShipActions {
  /** The Code tab on CSS (variables.css, shadcn beside it). */
  css: () => void
  /** The Figma page: copy the context, paste it in the plugin. */
  figma: () => void
  /** The Code tab on Agent context. */
  agent: () => void
}

const SHIP_BUTTON = 'flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-caption font-semibold text-fg transition-colors hover:border-line-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

function CodeGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <path d="m5.5 4.5-3.5 3.5 3.5 3.5" />
      <path d="m10.5 4.5 3.5 3.5-3.5 3.5" />
    </svg>
  )
}

function AgentGlyph() {
  // Same asset `FormatGlyph` paints on the Code rail (a mask, so it follows
  // the button's ink). Not imported from there: that rail imports this file.
  const mask = "url('/icons/settings/mcp.svg') center / contain no-repeat"
  return <span aria-hidden className="h-3.5 w-3.5 flex-shrink-0 bg-current" style={{ WebkitMask: mask, mask }} />
}

/** Three equal doors. Each opens ONE page; none is the primary, because which
 *  one you came for is yours to say. */
export function ShipRow({ ship, leading }: {
  ship: ShipActions
  /** Controls that share the footer (Undo, the die, Cancel). They take a row
   *  of their own above the doors, with the "Ship to" eyebrow at its end:
   *  three labelled buttons beside two 36px squares do not fit a 288px rail. */
  leading?: ReactNode
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-2">
      {leading !== undefined && (
        <div className="flex items-center gap-2">
          {leading}
          <span className="ml-auto text-mini font-semibold uppercase tracking-widest text-fg-faint">{t('Ship to')}</span>
        </div>
      )}
      <div role="group" aria-label={t('Ship to')} className="flex items-center gap-1.5">
        <button type="button" onClick={ship.css} className={SHIP_BUTTON} title={t('Copy or download variables.css')}>
          <CodeGlyph /><span className="truncate">{t('CSS')}</span>
        </button>
        <button type="button" onClick={ship.figma} className={SHIP_BUTTON} title={t('Copy the context and paste it in the plugin.')}>
          <FigmaGlyph size={13} /><span className="truncate">{t('Figma')}</span>
        </button>
        <button type="button" onClick={ship.agent} className={SHIP_BUTTON} title={t('One message your AI agent reads as the source of truth.')}>
          <AgentGlyph /><span className="truncate">{t('Agent')}</span>
        </button>
      </div>
    </div>
  )
}

/** Two crossing arrows — the shuffle mark every "surprise me" control uses. */
function ShuffleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="relative z-[1] flex-shrink-0">
      <path d="M2 4.5h2.3a3 3 0 0 1 2.5 1.3l2.4 3.4a3 3 0 0 0 2.5 1.3H14" />
      <path d="M12.2 8.4 14 10.5l-1.8 2.1" />
      <path d="M2 11.5h2.3a3 3 0 0 0 2.2-1" />
      <path d="M9.5 5.7a3 3 0 0 1 2.5-.7H14" />
      <path d="M12.2 2.9 14 5l-1.8 2.1" />
    </svg>
  )
}

/** Pip positions per face, on the 16-unit glyph grid. */
const L = 5.5, C = 8, R = 10.5
const DIE_FACES: [number, number][][] = [
  [[C, C]],
  [[L, L], [R, R]],
  [[L, L], [C, C], [R, R]],
  [[L, L], [R, L], [L, R], [R, R]],
  [[L, L], [R, L], [C, C], [L, R], [R, R]],
  [[L, L], [R, L], [L, C], [R, C], [L, R], [R, R]],
]

/** A die — "a whole new theme", distinct from Shuffle (colours only). */
function DiceGlyph({ face }: { face: number }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" />
      {DIE_FACES[face - 1].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r=".9" fill="currentColor" stroke="none" />
      ))}
    </svg>
  )
}

/** The save bar's Random: a whole new theme. Plain like Undo beside it and
 *  drawn as a die, so it never reads as the colour Shuffle (gradient border,
 *  crossing arrows) in the Color section above. Hover tips the die; a click
 *  ROLLS it — a hop and a turn, landing on a new face mid-air — so the action
 *  reads as chance before the board repaints. */
export function RandomWholeThemeButton({ onClick, label, compact = false }: {
  onClick: () => void
  label: string
  /** 32px, for footers whose buttons are `h-8` (the create studio). */
  compact?: boolean
}) {
  const reduce = useReducedMotion()
  const [face, setFace] = useState(5)
  const [rolls, setRolls] = useState(0)
  const swap = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(swap.current), [])

  const roll = () => {
    onClick()
    const next = (current: number) => {
      const n = 1 + Math.floor(Math.random() * 5)
      return n >= current ? n + 1 : n
    }
    window.clearTimeout(swap.current)
    if (reduce) { setFace(next); return }
    setRolls((r) => r + 1)
    // Change faces at the top of the hop, while the die is mid-turn.
    swap.current = window.setTimeout(() => setFace(next), 170)
  }

  return (
    <button
      type="button"
      onClick={roll}
      aria-label={label}
      title={label}
      className={`group flex ${compact ? 'h-8 w-8' : 'h-9 w-9'} flex-shrink-0 items-center justify-center rounded-lg border border-line text-fg-muted transition-[color,border-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:border-line-strong hover:text-fg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
    >
      <span className="flex transition-transform duration-200 ease-[var(--ease-out-quint)] motion-safe:group-hover:-translate-y-px motion-safe:group-hover:-rotate-12">
        <motion.span
          className="flex"
          initial={false}
          animate={reduce ? undefined : { rotate: rolls * 360, y: rolls ? [0, -5, 0] : 0, scale: rolls ? [1, 0.88, 1] : 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], y: { duration: 0.42, times: [0, 0.4, 1] }, scale: { duration: 0.42, times: [0, 0.4, 1] } }}
        >
          <DiceGlyph face={face} />
        </motion.span>
      </span>
    </button>
  )
}

/** Random, in one shape everywhere: the shuffle mark inside the animated
 *  conic border. `icon` is the icon-only square (next to a Style select or in
 *  the save bar); `tweak` keeps its label for the guest previewer card. */
export function RandomThemeButton({
  onClick,
  label,
  variant = 'tweak',
  className = '',
}: {
  onClick: () => void
  /** Accessible name; also the visible text in the `tweak` variant. */
  label?: string
  variant?: 'tweak' | 'icon'
  /** Size override for the `icon` variant (default 32px square). */
  className?: string
}) {
  const { t } = useI18n()
  const text = label ?? t('Random tweak')
  const icon = variant === 'icon'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={text}
      title={text}
      className={`relative flex items-center justify-center gap-1.5 rounded-lg bg-line text-fg-muted transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-elevated hover:text-fg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
        icon ? `h-8 w-8 flex-shrink-0 ${className}` : 'h-8 w-full text-mini font-normal'
      }`}
    >
      <ShuffleGlyph />
      {!icon && <span className="relative z-[1] truncate">{text}</span>}
      <span aria-hidden className="random-theme-border pointer-events-none absolute inset-0 rounded-lg" />
    </button>
  )
}

/**
 * The inspector's pinned footer on every EDITING tab (Theme and Variables):
 * Undo beside Save brand (a draft) or Get code (a kept brand, whose edits
 * save on their own). Persistence and the way back are not a property of one
 * edition, so they sit under whichever panel is open. Undo
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
  onDiscard,
  onGetCode,
  ship,
  themeKey,
}: {
  /** The three doors out (CSS · Figma · Agent). When given they replace the
   *  Get code primary: a kept brand (or a guest's) ships from here. */
  ship?: ShipActions
  /** Variables: greyed out, both controls. Theme keeps Save live — it is also
   *  the door that leads a guest to create an account. */
  inactive?: boolean
  /** A theme minted from Home → Random, not yet saved. */
  exploringRandom?: boolean
  onRandom?: () => void
  /** After a successful save while exploring — the shell leaves this mode. */
  onSaved?: () => void
  /** While exploring: throw the draft away and go back to Home to start from
   *  Blank, code or a style. */
  onDiscard?: () => void
  /** Opens Code on this brand. Once the brand is kept this IS the primary
   *  action; without it the kept state shows a quiet "Saved". */
  onGetCode?: () => void
  /** The brand on screen, so a draft inside an already-saved system still
   *  says Save brand. */
  themeKey?: string
}) {
  const { t } = useI18n()
  const access = useAccess()
  const status = useLibraryStatus()
  const unsavedBrands = useUnsavedBrands()
  const lastUndo = useEditHistory((h) => h.past[h.past.length - 1]?.label)
  const canUndo = useEditHistory((h) => h.past.length > 0)
  const [justSaved, setJustSaved] = useState(false)
  const saveRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!justSaved) return
    const id = window.setTimeout(() => setJustSaved(false), 2000)
    return () => window.clearTimeout(id)
  }, [justSaved])

  // A guest gets everything without an account; what it does NOT get is the
  // work kept on Escala. The primary action is the value (Get code), and the
  // notice above offers the two ways to keep it — never a wall.
  const guestPrimary = access.guest && !exploringRandom
  const guestGetCode = guestPrimary && Boolean(onGetCode) && !inactive
  // Two states, not five. A DRAFT (never saved, or a brand the saved system
  // does not hold yet) says Save brand: joining the system is a real decision.
  // Once kept, every edit is filed on its own (`useAutosaveLibrary`), so the
  // primary action is the way out — Get code, the header's own door.
  const draft = status === 'none' || unsavedBrands.has(themeKey ?? '') || exploringRandom
  const kept = !draft && !access.guest
  const use = (kept && Boolean(onGetCode) && !inactive && !justSaved) || guestGetCode
  // The Ship row stands in for the Get code primary wherever that primary
  // would have shown: the brand is kept (or a guest's), so the next move is
  // the way out, and there are three of them, not one.
  const shipOut = Boolean(ship) && use
  const label = use
    ? t('Get code')
    : justSaved || kept
    ? t('Saved')
    : guestPrimary
      ? t('Save with an account')
      : t('Save brand')
  const undoLabel = lastUndo ? `${t('Undo')} — ${lastUndo}` : t('Undo')
  // Random rewrites the theme in place. Once it is in the library — saved, or
  // saved and edited since — that would overwrite the kept design system, so
  // the door closes. It exists only on a draft (never saved: `none`).
  const showRandom = Boolean(onRandom) && !inactive && status === 'none' && (exploringRandom || guestPrimary)
  const undoButton = (
    <button
      type="button"
      onClick={() => undoEdit()}
      disabled={inactive || !canUndo}
      aria-label={undoLabel}
      title={`${undoLabel} (⌘Z)`}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-line text-fg-muted transition-[color,border-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:border-line-strong hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5.5 3.5 2.5 6.5l3 3" />
        <path d="M2.5 6.5h7a4 4 0 0 1 0 8H7" />
      </svg>
    </button>
  )
  const randomButton = showRandom && onRandom ? (
    <RandomWholeThemeButton onClick={onRandom} label={t('Random theme')} />
  ) : null

  return (
    // `[&&]:!flex-none` beats the inspector slot's `[&>*]:!flex-1` (which
    // stretches a portaled panel): as a direct slot child (Variables) the bar
    // must stay its own height, pinned under the scrolling nav.
    <div className={`flex flex-shrink-0 [&&]:!flex-none flex-col gap-2.5 border-t border-line px-3 py-3 ${WORKSPACE_CHROME}`}>
      {exploringRandom && onDiscard && (
        // The way out of a draft: Random mints a real theme the moment it is
        // pressed, and Save is the only other door. Discard removes it and
        // returns to Home, where Blank and From code live.
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-caption text-fg-muted">{t('Random draft · not saved')}</p>
          <button
            type="button"
            onClick={onDiscard}
            className="h-7 flex-shrink-0 rounded-lg px-2.5 text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          >
            {t('Discard')}
          </button>
        </div>
      )}
      {guestPrimary && <UnsavedNotice />}
      {/* Signed in: where the work lives, in words — "Saved to your account"
          while the cloud engine has it, or why it is only in this browser. */}
      {!access.guest && <AccountCloudStatus />}
      {/* Variables greys the row out; a guest there already has the notice's
          two actions, so a dead grey "Save with an account" would only repeat it. */}
      {!(guestPrimary && inactive) && (shipOut && ship ? (
        <ShipRow ship={ship} leading={<>{undoButton}{randomButton}</>} />
      ) : (
      <div className="flex items-center gap-2">
      {undoButton}
      {randomButton}
      <button
        ref={saveRef}
        type="button"
        onClick={() => {
          // Already kept (or a guest, for whom code needs no account):
          // straight to Code.
          if (use) { onGetCode?.(); return }
          // A guest signs up first; the shell finishes the save on return.
          if (access.guest) { goToLogin('save-library'); return }
          if (kept) return
          const s = useDesignStore.getState()
          s.saveCurrentSystem()
          if (themeKey) forgetUnsavedBrand(themeKey)
          setJustSaved(true)
          // The kept theme throws its OWN colours: accent first, then states.
          const accent = saveRef.current
            ? getComputedStyle(saveRef.current).getPropertyValue('--accent-solid').trim()
            : ''
          burstConfetti(saveRef.current, [
            accent || s.primaryColor, accent || s.primaryColor,
            s.successColor, s.warningColor, s.infoColor, s.errorColor,
          ])
          showToast(t('Brand saved'))
          if (exploringRandom) onSaved?.()
        }}
        disabled={inactive || (kept && !use && !justSaved)}
        className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg text-caption font-semibold transition-[opacity,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
          justSaved ? 'shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent-solid)_35%,transparent)]' : ''
        } ${
          inactive ? 'cursor-not-allowed bg-chip-rest text-fg-faint' : 'bg-accent-solid text-accent-ink disabled:opacity-50'
        }`}
      >
        {/* Saved → a check beside the label, so the dimmed button reads as
            "done", not "unavailable". */}
        {!use && (kept || justSaved) && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2.5 6.5 5 9l4.5-5.5" />
          </svg>
        )}
        {/* Same <> glyph as GetCodeButton elsewhere — one mark for "open Code". */}
        {use && (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
            <path d="m5.5 4.5-3.5 3.5 3.5 3.5" />
            <path d="m10.5 4.5 3.5 3.5-3.5 3.5" />
          </svg>
        )}
        <span className="truncate">{label}</span>
      </button>
      </div>
      ))}
    </div>
  )
}

/** For a visitor with no account: the design system is NOT saved, and here
 *  are the two ways to keep it. Information, not a gate — everything else on
 *  the page works without an account. A system already pushed to GitHub says
 *  where it is, and only offers the account. */
export function UnsavedNotice() {
  const { t } = useI18n()
  const { guest } = useAccess()
  const githubRepo = useDesignStore((s) => s.githubRepo)
  const githubLastPushAt = useDesignStore((s) => s.githubLastPushAt)
  const onGithub = Boolean(githubRepo && githubLastPushAt)
  const link = 'rounded text-caption font-semibold text-fg underline-offset-2 transition-colors hover:text-accent-ui hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 rounded text-caption text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-status-warning-solid" />
        <span>{t('Not saved')}</span>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 7.25v3.5" />
          <circle cx="8" cy="5" r="0.5" fill="currentColor" />
        </svg>
      </button>
      {/* The warning carries its own way out, not only behind the ⓘ. */}
      {guest && (
        <button type="button" onClick={() => goToLogin('save-library')} className={`ml-auto ${link}`}>
          {t('Save with an account')}
        </button>
      )}
      {open && (
        <div role="dialog" aria-label={t('Not saved')} className="absolute bottom-full left-0 z-20 mb-2 flex w-full min-w-[220px] flex-col gap-2 rounded-lg border border-line-strong bg-elevated px-3 py-2.5 shadow-lg">
          <p className="m-0 text-caption leading-snug text-fg-muted">
            {onGithub
              ? t('On GitHub ({repo}), not saved on Escala. It stays in this browser.', { repo: githubRepo ?? '' })
              : t('Not saved. This design system lives only in this browser.')}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button type="button" onClick={() => { setOpen(false); goToLogin('save-library') }} className={link}>
              {t('Save with an account')}
            </button>
            {/* GitHub needs an account, so a visitor's only way to keep the
                system is saving with one. */}
            {!onGithub && !guest && (
              <button type="button" onClick={() => { setOpen(false); requestOpenGithub() }} className={link}>
                {t('Push to GitHub')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Previous step — an icon square so it never competes with the primary
 *  action for the footer's width. Named for assistive tech and hover. */
function BackButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('Back')}
      title={t('Back')}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-line text-fg-muted transition-[color,border-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:border-line-strong hover:text-fg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M13 8H3M7 4 3 8l4 4" />
      </svg>
    </button>
  )
}

/**
 * The footer while a theme is in GUIDED SETUP (`lib/themeSetup`): which step
 * this is, the step's action and the way out. The action names what really
 * happens: Continue on every step, Finish on the last. "Skip setup" ends the
 * guide at once, leaving every remaining edition at its default.
 */
export function ThemeSetupBar({ themeKey }: { themeKey: string }) {
  const { t } = useI18n()
  const step = useSetupStep(themeKey) ?? 0
  const last = step === SETUP_STEPS.length - 1
  // Same predictable CTA as the create studio: Continue, then Finish.
  const label = last ? t('Finish') : t('Continue')

  const finishRef = useRef<HTMLButtonElement>(null)
  const done = () => showToast(t('Your brand is ready — every edition is open now.'))
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
        {step > 0 && <BackButton onClick={() => retreatThemeSetup(themeKey)} />}
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

/**
 * Home's create studio footer. No step count, no Continue: the brand is minted
 * the moment the studio opens and every foundation is a row of the accordion
 * above, edited in any order. "Create brand" shows only when that mint failed
 * (the brand cap) and retries it. The ways out are the Ship row (a guest) or
 * Save + the Ship row (signed in).
 */
export function CreateStudioFooter({
  error, committed, guest, onCancel, onCreate, onSave, onGetCode, onRandom, ship,
}: {
  /** The three doors out once the brand exists. Replaces the Get code button. */
  ship?: ShipActions
  /** Roll a whole new theme on this brand (the save bar's die). Shown once
   *  the brand exists, beside the way out. */
  onRandom?: () => void
  error?: string | null
  /** The brand exists (its colours were set). */
  committed: boolean
  guest: boolean
  onCancel?: () => void
  onCreate: () => void
  onSave: () => void
  onGetCode: () => void
}) {
  const { t } = useI18n()
  const primary = 'flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
  const secondary = 'h-8 flex-shrink-0 rounded-lg border border-line bg-surface px-2.5 text-caption font-medium text-fg transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
  const codeGlyph = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <path d="m5.5 4.5-3.5 3.5 3.5 3.5" />
      <path d="m10.5 4.5 3.5 3.5-3.5 3.5" />
    </svg>
  )
  const cancelButton = onCancel ? (
    <button
      type="button"
      onClick={onCancel}
      className="h-8 flex-shrink-0 rounded-lg px-1 text-caption font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      {t('Cancel')}
    </button>
  ) : null
  const randomButton = committed && onRandom ? (
    <RandomWholeThemeButton compact onClick={onRandom} label={t('Random theme')} />
  ) : null
  return (
    <div className="flex flex-shrink-0 flex-col gap-2.5 border-t border-line bg-app px-3 py-3">
      {error && <p role="alert" className="text-caption text-status-danger">{error}</p>}
      {committed && guest && <UnsavedNotice />}
      {committed && !guest && <AccountCloudStatus />}
      {committed && ship ? (
        // The way out is three doors of equal weight (CSS · Figma · Agent),
        // the promise on the About hero made good here. Signed in, Save keeps
        // the brand on the row above them.
        guest ? (
          <ShipRow ship={ship} leading={<>{cancelButton}{randomButton}</>} />
        ) : (
          <>
            <div className="flex items-center gap-2">
              {cancelButton}
              {randomButton}
              <button type="button" onClick={onSave} className={primary}><span className="truncate">{t('Save')}</span></button>
            </div>
            <ShipRow ship={ship} />
          </>
        )
      ) : (
      <div className="flex items-center gap-2">
        {cancelButton}
        {randomButton}
        {!committed ? (
          <button type="button" onClick={onCreate} className={primary}>
            <span className="truncate">{t('Create brand')}</span>
          </button>
        ) : guest ? (
          // One way out: the code. "Open in editor" sat beside it and read as a
          // second editor, while the visitor is already in one.
          <button type="button" onClick={onGetCode} className={primary}>{codeGlyph}<span className="truncate">{t('Get code')}</span></button>
        ) : (
          <>
            <button type="button" onClick={onGetCode} className={`${secondary} flex items-center gap-1.5`}>{codeGlyph}{t('Get code')}</button>
            <button type="button" onClick={onSave} className={primary}><span className="truncate">{t('Save')}</span></button>
          </>
        )}
      </div>
      )}
    </div>
  )
}

/** Create-studio footer on the canvas card — same language as the plugin
 *  setup bar: which step this is, Cancel (discard the theme being made),
 *  Skip setup, and a Continue that names what it keeps ("Use Inter →"). */
export function CreateStudioBar({
  stepIndex,
  total,
  continueLabel,
  last,
  onCancel,
  onBack,
  onSkip,
  onContinue,
  error,
}: {
  /** Why the last action did nothing (a plan limit, a taken name). */
  error?: string | null
  stepIndex: number
  total: number
  continueLabel: string
  last: boolean
  /** Leave without keeping the theme. The caller deletes it if it was already
   *  minted. Omitted when there is nowhere to go back to (a first visit). */
  onCancel?: () => void
  /** Previous step. When given it replaces Cancel: past the first step the
   *  way out is Skip setup, and the way BACK is this — one door per intent. */
  onBack?: () => void
  onSkip: () => void
  onContinue: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-shrink-0 flex-col gap-2.5 border-t border-line bg-app px-3 py-3">
      {error && <p role="alert" className="text-caption text-status-danger">{error}</p>}
      <div className="flex items-center gap-2">
        <span className="text-caption font-semibold text-fg">{t('Step {n} of {total}', { n: stepIndex + 1, total })}</span>
        <span className="flex flex-1 gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-accent-solid' : 'bg-fg/10'}`} />
          ))}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {onBack ? (
          <BackButton onClick={onBack} />
        ) : onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-8 flex-shrink-0 rounded-lg px-1 text-caption font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          >
            {t('Cancel')}
          </button>
        )}
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
          className="flex h-8 min-w-[7rem] flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
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
