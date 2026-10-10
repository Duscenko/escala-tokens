// Home + theme doors in TopNav. The house is an icon. The theme door is a
// named chip (avatar · name · subtitle · chevron) that opens the system menu.
// Empty reads "No system yet / Set one up". With a theme, the name is the
// theme's; the subtitle is its appearance, or "System style" while trying one
// on. The words stay visible at the preview's real width (the shell is already
// desktop-only). A long name truncates inside the chip. Light/dark lives in TopNav's ☰.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { themeBrandRamp, themeDisplayName } from '../../lib/themeSources'
import { myThemeKeys } from '../../lib/themeLibrary'
import type { StylePreview } from '../../lib/stylePreviewOverlay'
import { useI18n } from '../../lib/i18n'
import { CHROME_CONTROL_ACTIVE, CHROME_CONTROL_HOVER, CHROME_CONTROL_SHELL } from './themeWorkspaceLayout'
import { ThemeAvatar } from './ThemeLibraryRail'
import { PRESET_AVATAR_RAMPS } from './StyleOverview'
import { ChromeAnchoredDropdown, FigmaGlyph } from './TopNav'

const ICON = `grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-fg-muted transition-[color,box-shadow] ${CHROME_CONTROL_SHELL} ${CHROME_CONTROL_HOVER} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app`

const MENU_ITEM = 'flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50'

function EmptySystemAvatar({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      className="text-fg-muted"
      aria-hidden
    >
      <rect width="18" height="18" rx="4.5" fill="currentColor" opacity="0.16" />
      <g fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6.15" cy="7.1" r="0.85" fill="currentColor" stroke="none" />
        <circle cx="11.85" cy="7.1" r="0.85" fill="currentColor" stroke="none" />
        <path d="M6.2 12.15c.85-1.15 1.9-1.7 2.8-1.7s1.95.55 2.8 1.7" />
      </g>
    </svg>
  )
}

function PlusGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function OverviewGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </svg>
  )
}

function ComponentsGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16" />
      <path d="M9 10v9" />
    </svg>
  )
}

function CodeGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5.5 4.5-3.5 3.5 3.5 3.5" />
      <path d="m10.5 4.5 3.5 3.5-3.5 3.5" />
    </svg>
  )
}

function SwapChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.25 4.75 6 2.25 8.75 4.75" />
      <path d="M3.25 7.25 6 9.75 8.75 7.25" />
    </svg>
  )
}

function BlankGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="3" />
    </svg>
  )
}

function SparkGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5" />
    </svg>
  )
}

function MaskGlyph({ src }: { src: string }) {
  return (
    <span
      aria-hidden
      className="block h-3.5 w-3.5 bg-current"
      style={{
        WebkitMask: `url('${src}') center / contain no-repeat`,
        mask: `url('${src}') center / contain no-repeat`,
      }}
    />
  )
}

function StartMark({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md ${
        accent ? 'bg-accent-ui/15 text-accent-ui' : 'bg-fg/[0.06] text-fg-muted'
      }`}
    >
      {children}
    </span>
  )
}

const START_ITEM = 'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-body font-medium text-fg transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50'

/** The "How do you want to start?" choices. Home's New design system button
 *  and the theme chip's Add new theme both render this, so the four doors
 *  cannot drift. */
export function StartDesignChoices({
  onBlank,
  onRandom,
  onFromCode,
  onSystemStyles,
}: {
  onBlank: () => void
  onRandom: () => void
  onFromCode: () => void
  onSystemStyles: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-0.5">
      <button type="button" onClick={onBlank} className={START_ITEM}>
        <StartMark><BlankGlyph /></StartMark>
        {t('Blank')}
      </button>
      <button type="button" onClick={onRandom} className={START_ITEM}>
        <StartMark accent><MaskGlyph src="/icons/settings/random.svg" /></StartMark>
        {t('Random')}
      </button>
      <button type="button" onClick={onFromCode} className={START_ITEM}>
        <StartMark><MaskGlyph src="/icons/theme-hub-icons/Icon/code.svg" /></StartMark>
        {t('From code')}
      </button>
      <button type="button" onClick={onSystemStyles} className={START_ITEM}>
        <StartMark><SparkGlyph /></StartMark>
        {t('System styles')}
      </button>
    </div>
  )
}

export function StartDesignModal({
  open,
  onClose,
  onBlank,
  onRandom,
  onFromCode,
  onSystemStyles,
}: {
  open: boolean
  onClose: () => void
  onBlank: () => void
  onRandom: () => void
  onFromCode: () => void
  onSystemStyles: () => void
}) {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    // Keyboard users land inside the dialog, Tab stays in it, and closing hands
    // focus back to whatever opened it (a modal with none of that leaves the
    // page behind it reachable).
    const opener = document.activeElement as HTMLElement | null
    const focusables = () => Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [],
    )
    focusables()[0]?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && active === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  const pick = (fn: () => void) => () => {
    onClose()
    fn()
  }
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-design-title"
        className="w-full max-w-sm rounded-2xl border border-line bg-app p-5 shadow-2xl"
        initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="start-design-title" className="px-1 pb-3 text-title font-semibold text-fg">
          {t('How do you want to start?')}
        </h2>
        <StartDesignChoices
          onBlank={pick(onBlank)}
          onRandom={pick(onRandom)}
          onFromCode={pick(onFromCode)}
          onSystemStyles={pick(onSystemStyles)}
        />
        {/* A filled secondary — the same surface/border pair "Skip setup" uses —
            so Cancel reads as a button and not as loose text under the list. */}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-10 w-full rounded-xl border border-line bg-surface text-body font-medium text-fg transition-colors hover:bg-elevated hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          {t('Cancel')}
        </button>
      </motion.div>
    </div>,
    document.body,
  )
}

export function ThemeAppearanceControl({
  previewTheme,
  stylePreview,
  homeOpen,
  themeOpen,
  onOpenLibrary,
  onOpenTheme,
  onCreateTheme,
  onStartRandom,
  onImport,
  onOpenStyles,
  onOpenComponents,
  onSyncFigma,
  onGetCode,
  onSelectTheme,
}: {
  previewTheme: string
  stylePreview: StylePreview | null
  homeOpen: boolean
  /** Theme preview workspace is on screen — the avatar reads as pressed. */
  themeOpen: boolean
  onOpenLibrary: () => void
  onOpenTheme: () => void
  /** Blank — the create studio. */
  onCreateTheme: () => void
  /** Random — mint (or, on Free, open the one theme). */
  onStartRandom: () => void
  /** From code — the Import JSON modal. */
  onImport: () => void
  /** System styles — Home's styles section. */
  onOpenStyles: () => void
  onOpenComponents: () => void
  onSyncFigma: () => void
  onGetCode: () => void
  onSelectTheme: (key: string) => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [startOpen, setStartOpen] = useState(false)

  const tryOn = stylePreview
  const ownKeys = myThemeKeys(store.themeOrder, store.themes)
  const empty = ownKeys.length === 0 && !tryOn
  const name = empty
    ? t('No system yet')
    : tryOn
      ? tryOn.preset.shortLabel
      : themeDisplayName(previewTheme, store.themeLabels)
  const kind = tryOn ? tryOn.appearance : (store.themeKinds[previewTheme] ?? 'light')
  const ramp = tryOn
    ? PRESET_AVATAR_RAMPS[`${tryOn.preset.id}:${tryOn.appearance}`]
    : themeBrandRamp(previewTheme, store.themeSources, store.themeKinds, store)
  const homeLabel = t('Home')
  const themeLabel = empty ? t('No system yet') : t('Theme preview — {name}', { name })
  const menuSubtitle = empty
    ? t('Nothing set up here')
    : tryOn
      ? t('System style')
      : t('In this folder')
  const chipSubtitle = empty
    ? t('Set one up')
    : tryOn
      ? t('System style')
      : t(kind === 'dark' ? 'Dark' : 'Light')
  const canSwitch = ownKeys.length > 1
  const hasShipActions = ownKeys.length > 0

  const closeMenu = () => {
    setMenuOpen(false)
    setStartOpen(false)
  }
  const go = (action: () => void) => {
    closeMenu()
    action()
  }

  return (
    <>
      <button
        type="button"
        onClick={onOpenLibrary}
        aria-pressed={homeOpen}
        aria-label={homeLabel}
        title={homeLabel}
        className={`${ICON} ${homeOpen ? `${CHROME_CONTROL_ACTIVE} text-fg` : ''}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      </button>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-pressed={themeOpen || menuOpen}
        aria-label={themeLabel}
        title={themeLabel}
        className={`${themeOpen || menuOpen ? `${CHROME_CONTROL_ACTIVE} text-fg` : ''} flex h-8 max-w-[13.5rem] flex-shrink-0 items-center gap-1.5 rounded-lg pl-1 pr-2 text-fg-muted transition-[color,box-shadow] ${CHROME_CONTROL_SHELL} ${CHROME_CONTROL_HOVER} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app`}
      >
        {/* The same tile as the account avatar beside it: `h-6 w-6` is 1.5rem,
            which is 27px at this app's 18px root. The cover was drawn at 18px
            inside that box, so it read as a smaller sibling of "D". */}
        <span className="grid h-6 w-6 flex-shrink-0 place-items-center">
          {empty
            ? <EmptySystemAvatar size={27} />
            : <ThemeAvatar size={27} ramp={ramp} appearance={kind} fallback={tryOn?.preset.accent ?? store.primaryColor} />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col items-start leading-none">
          <span className="w-full truncate text-left text-caption font-semibold text-fg">{name}</span>
          <span className="mt-0.5 w-full truncate text-left text-micro font-medium text-fg-muted">{chipSubtitle}</span>
        </span>
        <span className="grid flex-shrink-0 text-fg-faint">
          <SwapChevron />
        </span>
      </button>
      <ChromeAnchoredDropdown
        open={menuOpen}
        onClose={closeMenu}
        anchorRef={triggerRef}
        align="right"
        gap={8}
        menuAriaLabel={themeLabel}
        className="w-64 rounded-xl border border-line-strong bg-app p-1.5 shadow-xl"
      >
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          {empty
            ? <EmptySystemAvatar size={22} />
            : <ThemeAvatar size={22} ramp={ramp} appearance={kind} fallback={tryOn?.preset.accent ?? store.primaryColor} />}
          <div className="min-w-0">
            <p className="truncate text-caption font-semibold text-fg">{name}</p>
            <p className="truncate text-micro text-fg-muted">{menuSubtitle}</p>
          </div>
        </div>
        <div className="my-1 border-t border-line" role="separator" />
        {empty ? (
          <>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setStartOpen(true) }} className={MENU_ITEM}>
              <span className="grid h-4 w-4 flex-shrink-0 place-items-center text-fg-muted"><PlusGlyph /></span>
              {t('Set up a system')}
            </button>
            <button type="button" role="menuitem" onClick={() => go(onOpenComponents)} className={MENU_ITEM}>
              <span className="grid h-4 w-4 flex-shrink-0 place-items-center text-fg-muted"><ComponentsGlyph /></span>
              {t('View components')}
            </button>
          </>
        ) : (
          <>
            <button type="button" role="menuitem" onClick={() => go(onOpenTheme)} className={MENU_ITEM}>
              <span className="grid h-4 w-4 flex-shrink-0 place-items-center text-fg-muted"><OverviewGlyph /></span>
              {t('Overview')}
            </button>
            <button type="button" role="menuitem" onClick={() => go(onOpenComponents)} className={MENU_ITEM}>
              <span className="grid h-4 w-4 flex-shrink-0 place-items-center text-fg-muted"><ComponentsGlyph /></span>
              {t('View components')}
            </button>
            {hasShipActions && (
              <>
                <button type="button" role="menuitem" onClick={() => go(onSyncFigma)} className={MENU_ITEM}>
                  <span className="grid h-4 w-4 flex-shrink-0 place-items-center text-fg-muted">
                    <FigmaGlyph className="h-3.5 w-auto" />
                  </span>
                  {t('Sync with Figma')}
                </button>
                <button type="button" role="menuitem" onClick={() => go(onGetCode)} className={MENU_ITEM}>
                  <span className="grid h-4 w-4 flex-shrink-0 place-items-center text-fg-muted"><CodeGlyph /></span>
                  {t('Get code')}
                </button>
              </>
            )}
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setStartOpen(true) }} className={MENU_ITEM}>
              <span className="grid h-4 w-4 flex-shrink-0 place-items-center text-fg-muted"><PlusGlyph /></span>
              {t('Add new theme')}
            </button>
          </>
        )}
        {canSwitch && (
          <>
            <div className="my-1 border-t border-line" role="separator" />
            <p className="px-2.5 pb-1 pt-1 text-micro font-semibold uppercase tracking-widest text-fg-faint">{t('Switch theme')}</p>
            {ownKeys.map((key) => {
              const selected = !tryOn && key === previewTheme
              const rowKind = store.themeKinds[key] ?? 'light'
              const rowRamp = themeBrandRamp(key, store.themeSources, store.themeKinds, store)
              const rowName = themeDisplayName(key, store.themeLabels)
              return (
                <button
                  key={key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => go(() => onSelectTheme(key))}
                  className={`${MENU_ITEM} ${selected ? 'text-fg' : ''}`}
                >
                  <ThemeAvatar size={16} ramp={rowRamp} appearance={rowKind} fallback={store.primaryColor} />
                  <span className="min-w-0 flex-1 truncate">{rowName}</span>
                </button>
              )
            })}
          </>
        )}
      </ChromeAnchoredDropdown>
      <StartDesignModal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        onBlank={onCreateTheme}
        onRandom={onStartRandom}
        onFromCode={onImport}
        onSystemStyles={onOpenStyles}
      />
    </>
  )
}
