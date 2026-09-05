import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { useTheme } from '../../lib/theme'
import { themeBrandRamp, themeDisplayName } from '../../lib/themeSources'
import { generateColorScale } from '../../lib/colorUtils'
import type { ColorScale } from '../../types/tokens'
import ThemePanel from './ThemePanel'
import { THEME_STYLE_PRESETS, type ThemeStylePreset } from '../../lib/themePresets'
import type { StylePreview } from '../../lib/stylePreviewOverlay'
import { loadGoogleFont } from '../../lib/fonts'
import { SHELL_CHROME, THEME_LIBRARY_WIDTH } from './themeWorkspaceLayout'
import { usePopoverPlacement } from './colorControls'
import { useI18n } from '../../lib/i18n'
import {
  MY_THEME_FULL_ERROR,
  MY_THEME_HARD_CAP,
  MY_THEME_RAIL_LIMIT,
  canAddMyTheme,
  myThemeKeys,
  myThemeRoom,
  visibleMyThemes,
} from '../../lib/themeLibrary'

export { THEME_LIBRARY_WIDTH } from './themeWorkspaceLayout'
export { myThemeKeys } from '../../lib/themeLibrary'

/** Shared with the hub and the Export wizard — see `themeDisplayName`. */
const labelForTheme = themeDisplayName

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M7 2.25v9.5M2.25 7h9.5" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 4h9M5 4V2.5h4V4m1.5 0-.5 7.5H4L3.5 4M5.75 6.25v3M8.25 6.25v3" />
    </svg>
  )
}

export function LibraryOptionsIcon() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 bg-current"
      style={{
        WebkitMask: "url('/icons/settings/sub-menu-context.svg') center / contain no-repeat",
        mask: "url('/icons/settings/sub-menu-context.svg') center / contain no-repeat",
      }}
    />
  )
}

/** 28×28 target — shared footprint; fill only on hover (or active). */
const THEME_RAIL_CHIP =
  'grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-fg-faint transition-[color,background-color]'

/** Wash on hover — `--elevated` reads on both `--app` and `--tab-bar`. */
const THEME_RAIL_GLASS_HOVER = 'hover:bg-elevated'

/** Icon control inside a chip — menu, add, delete. */
const THEME_RAIL_ICON_BTN =
  `${THEME_RAIL_CHIP} ${THEME_RAIL_GLASS_HOVER} hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`

const THEME_RAIL_ICON_BTN_ACTIVE = 'bg-elevated text-fg'

/** Numeric count — same footprint as icon chips (System styles tally). */
const THEME_RAIL_COUNT_BADGE =
  `${THEME_RAIL_CHIP} text-micro font-medium tabular-nums leading-none`

/** Inactive list row — transparent at rest, glass on hover. */
const THEME_RAIL_ROW_IDLE = `border-transparent ${THEME_RAIL_GLASS_HOVER}`

function ResetStyleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.75 8a5.25 5.25 0 1 0 1.6-3.77" />
      <path d="M2.4 2.9v2.6H5" />
    </svg>
  )
}

function ThemeLibraryOptionsPopover({
  hasOwnThemes,
  onResetSuggestedStyles,
  onDeleteMyThemes,
}: {
  hasOwnThemes: boolean
  onResetSuggestedStyles: () => void
  onDeleteMyThemes: () => void
}) {
  const { t } = useI18n()
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: -4 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-x-0 top-full z-[60] mt-1.5 origin-top overflow-hidden rounded-lg border border-line-strong bg-app p-1.5 shadow-xl"
      role="menu" aria-label={t('Theme library options')}
    >
          <button
            type="button"
            role="menuitem"
            onClick={onResetSuggestedStyles}
            className="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-fg-muted transition-colors hover:text-fg hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50"
          >
            <ResetStyleIcon />
            <span className="text-caption font-medium">{t('Reset system style')}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!hasOwnThemes}
            onClick={onDeleteMyThemes}
            className="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-status-danger transition-colors hover:bg-status-danger/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-status-danger/50"
          >
            <TrashIcon />
            <span className="text-caption font-medium">{t('Delete my themes')}</span>
          </button>
    </motion.div>
  )
}

function DeleteMyThemesConfirmation({ count, onCancel, onConfirm }: { count: number; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useI18n()
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKeyDown)
    cancelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="w-full rounded-xl border border-status-danger/25 bg-status-danger/[0.045] p-2.5"
      role="alertdialog" aria-modal="false" aria-label={t('Delete my themes')}
    >
      <h2 className="text-caption font-semibold text-fg">{t(count === 1 ? 'Delete {count} custom theme?' : 'Delete {count} custom themes?', { count })}</h2>
      <p className="mt-1 text-mini leading-relaxed text-fg-muted">{t('Their semantic values and theme-specific foundations will be removed. This cannot be undone.')}</p>
      <div className="mt-2 flex flex-col gap-1.5">
        <button ref={cancelRef} type="button" onClick={onCancel} className="h-7 w-full rounded-md border border-line bg-app px-2.5 text-mini font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50">{t('Cancel')}</button>
        <button type="button" onClick={onConfirm} className="h-7 w-full rounded-md bg-status-danger-solid px-2.5 text-mini font-semibold text-white transition-colors hover:bg-status-danger-solid/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/50">{t('Delete themes')}</button>
      </div>
    </motion.div>
  )
}

export function DeleteThemeConfirmation({
  name, isPreviewed, isLast, onCancel, onConfirm,
}: {
  name: string
  isPreviewed: boolean
  isLast?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useI18n()
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKeyDown)
    cancelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="w-full rounded-xl border border-status-danger/25 bg-status-danger/[0.045] p-2.5"
      role="alertdialog" aria-modal="false" aria-label={t('Delete {name}', { name })}
    >
      <h2 className="text-caption font-semibold text-fg">{t('Delete {name}?', { name })}</h2>
      <p className="mt-1 text-mini leading-relaxed text-fg-muted">
        {t('Every semantic value mapped to this theme will be deleted too. This cannot be undone.')}
        {isLast
          ? ` ${t('My themes will be empty until you create one or add a System style.')}`
          : isPreviewed
            ? ` ${t('The preview will switch to another theme.')}`
            : ''}
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        <button ref={cancelRef} type="button" onClick={onCancel} className="h-7 w-full rounded-md border border-line bg-app px-2.5 text-mini font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50">{t('Cancel')}</button>
        <button type="button" onClick={onConfirm} className="h-7 w-full rounded-md bg-status-danger-solid px-2.5 text-mini font-semibold text-white transition-colors hover:bg-status-danger-solid/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/50">{t('Delete theme')}</button>
      </div>
    </motion.div>
  )
}

/**
 * A system style wears the SAME avatar as a saved theme (`ThemeAvatar`
 * below), built from the preset's accent ramp — so both sections of the library
 * read as one system. Keyed by `id:appearance` because a preset is previewable
 * in EITHER appearance (see `AppearanceToggle`) and the chip has to show the one
 * you'd actually get. Presets are static, so both ramps are derived once.
 */
const PRESET_AVATAR_RAMPS: Record<string, ColorScale> = Object.fromEntries(
  THEME_STYLE_PRESETS.flatMap((preset) =>
    (['light', 'dark'] as const).map((appearance) => [
      `${preset.id}:${appearance}`,
      generateColorScale(preset.accent, 'radix', 0, undefined, appearance),
    ]),
  ),
)

/**
 * A theme avatar is a compact rendering of the theme's resolved brand ramp,
 * rather than a baked light/dark asset. This keeps the library honest when a
 * theme points at a custom family or its primitives are retinted.
 */
function ThemeAvatar({ ramp, appearance, fallback }: { ramp?: ColorScale; appearance: 'light' | 'dark'; fallback: string }) {
  const base = ramp?.[5] ?? fallback
  const middle = ramp?.[7] ?? base
  const highlight = ramp?.[9] ?? middle
  const border = appearance === 'dark' ? '#FFFFFF' : '#0A0D12'

  return (
    <svg viewBox="0 0 31 31" className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-md" aria-hidden>
      <rect width="31" height="31" rx="8" fill={base} />
      <circle cx="5.5" cy="4.8" r="14.5" fill={middle} />
      <circle cx="3.22" cy="2.73" r="8.29" fill={highlight} />
      <rect x="0.5" y="0.5" width="30" height="30" rx="7.5" fill="none" stroke={border} strokeOpacity="0.1" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7.25 2.5 3.75 6l3.5 3.5" />
    </svg>
  )
}

/** `w-44` at this app's 18px root — used to clamp the portaled menu. */
const THEME_OPTIONS_MENU_REM = 11
const THEME_OPTIONS_MENU_GAP = 4
const THEME_OPTIONS_MENU_PAD = 8

/**
 * Portaled to `<body>` and positioned `fixed` off the ⋮ trigger. The Themes
 * library nav is `overflow-y-auto` (load-bearing — the list scrolls), and a
 * 196px rail cannot contain a `w-44` absolute panel: measured left ≈ −18.
 * Same class of fix as ColorPrimitives' ColumnExportMenu.
 */
/** Both non-destructive rows in the theme menu. Delete keeps its own danger
 *  styling; these two are one decision and must not drift apart. */
const THEME_MENU_ITEM =
  'flex h-8 w-full items-center rounded-md px-2.5 text-left text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg active:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50'

function ThemeOptionsMenu({
  open,
  anchorRef,
  onClose,
  onSyncFigma,
  onOpenInCode,
  onAskDelete,
}: {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
  /** Preview this theme and open the Figma page — the per-theme twin of the
   *  canvas header's Sync button, so the handoff is reachable from the row
   *  that names the theme it would publish. */
  onSyncFigma?: () => void
  onOpenInCode?: () => void
  onAskDelete: () => void
}) {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const place = usePopoverPlacement(anchorRef, open, { prefer: 96, min: 80, max: 200 })
  const [rect, setRect] = useState<DOMRect | null>(null)
  const lastRect = useRef<DOMRect | null>(null)

  useEffect(() => {
    if (!open) return
    const measure = () => {
      const r = anchorRef.current?.getBoundingClientRect()
      if (!r) return
      lastRect.current = r
      setRect(r)
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, anchorRef])

  const box = rect ?? lastRect.current
  if (typeof document === 'undefined') return null

  let left = THEME_OPTIONS_MENU_PAD
  if (box) {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const menuW = THEME_OPTIONS_MENU_REM * rem
    left = Math.min(
      Math.max(THEME_OPTIONS_MENU_PAD, box.right - menuW),
      window.innerWidth - menuW - THEME_OPTIONS_MENU_PAD,
    )
  }

  return createPortal(
    <AnimatePresence>
      {open && box && (
        <motion.div
          ref={panelRef}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.98, y: place.up ? 4 : -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98, y: place.up ? 4 : -4 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          role="menu"
          aria-label={t('Theme options')}
          className={`z-[60] w-44 overflow-hidden rounded-lg border border-line-strong bg-app p-1.5 shadow-xl ${
            place.up ? 'origin-bottom-right' : 'origin-top-right'
          }`}
          style={{
            position: 'fixed',
            left,
            ...(place.up
              ? { bottom: window.innerHeight - box.top + THEME_OPTIONS_MENU_GAP }
              : { top: box.bottom + THEME_OPTIONS_MENU_GAP }),
            maxHeight: place.max,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={onSyncFigma}
            className={THEME_MENU_ITEM}
          >
            {t('Sync with Figma')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={onOpenInCode}
            className={THEME_MENU_ITEM}
          >
            {t('Open in code')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={onAskDelete}
            className="flex h-8 w-full items-center rounded-md px-2.5 text-left text-caption font-medium text-status-danger transition-colors hover:bg-status-danger/10 active:bg-status-danger/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-status-danger/50"
          >
            {t('Delete')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function ThemeLibraryRow({
  label,
  active,
  kind,
  ramp,
  fallback,
  menuOpen,
  deleteOpen,
  isLast,
  onPreview,
  onEdit,
  onToggleMenu,
  onCloseMenu,
  onSyncFigma,
  onOpenInCode,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  label: string
  active: boolean
  kind: 'light' | 'dark'
  ramp?: ColorScale
  fallback: string
  menuOpen: boolean
  deleteOpen: boolean
  isLast: boolean
  onPreview: () => void
  onEdit: () => void
  onToggleMenu: () => void
  onCloseMenu: () => void
  onSyncFigma?: () => void
  onOpenInCode?: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}) {
  const { t } = useI18n()
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  return (
    <div className="flex flex-col gap-1">
      <div
        className={`group relative flex items-center gap-2 p-1.5 rounded-xl border transition-colors ${
          active
            ? 'border-line-strong bg-app shadow-[0_2px_12px_-6px_rgba(0,0,0,0.24)]'
            : THEME_RAIL_ROW_IDLE
        }`}
      >
        <button
          type="button"
          onClick={onEdit}
          aria-label={t('Edit {name} theme', { name: label })}
          title={t('Edit {name} theme', { name: label })}
          className="flex-shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
        >
          <ThemeAvatar ramp={ramp} appearance={kind} fallback={fallback} />
        </button>
        <button
          type="button"
          onClick={onPreview}
          aria-current={active ? 'true' : undefined}
          className={`flex-1 min-w-0 flex items-center text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50 ${
            active ? 'pr-6' : 'group-hover:pr-6 group-focus-within:pr-6'
          }`}
        >
          <span className={`min-w-0 flex-1 truncate text-body text-fg ${active ? 'font-semibold' : 'font-medium'}`}>
            {label}
          </span>
        </button>
        <div className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center ${active || menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'} transition-opacity`}>
          <button
            ref={menuBtnRef}
            type="button"
            onClick={onToggleMenu}
            aria-label={t('Theme options')}
            title={t('Theme options')}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`${THEME_RAIL_ICON_BTN} ${menuOpen ? THEME_RAIL_ICON_BTN_ACTIVE : ''}`}
          >
            <LibraryOptionsIcon />
          </button>
        </div>
        <ThemeOptionsMenu
          open={menuOpen}
          anchorRef={menuBtnRef}
          onClose={onCloseMenu}
          onSyncFigma={onSyncFigma}
          onOpenInCode={onOpenInCode}
          onAskDelete={onAskDelete}
        />
      </div>
      <AnimatePresence initial={false}>
        {deleteOpen && (
          <DeleteThemeConfirmation
            name={label}
            isPreviewed={active}
            isLast={isLast}
            onCancel={onCancelDelete}
            onConfirm={onConfirmDelete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CreateThemeButton({
  disabled,
  onClick,
}: {
  disabled: boolean
  onClick: () => void
}) {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  return (
    <motion.button
      type="button"
      disabled={disabled}
      title={disabled ? t(MY_THEME_FULL_ERROR, { count: MY_THEME_HARD_CAP }) : undefined}
      onClick={onClick}
      initial={reduceMotion ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
      whileHover={reduceMotion || disabled ? undefined : { scale: 1.015 }}
      whileTap={reduceMotion || disabled ? undefined : { scale: 0.985 }}
      className="group/cta relative flex items-center gap-2 rounded-xl border border-dashed border-line-strong bg-app p-1.5 text-left transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-app"
    >
      <span
        aria-hidden
        className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md border border-dashed border-line-strong text-fg-faint transition-colors group-hover/cta:border-accent-ui/60 group-hover/cta:text-accent-ui group-disabled/cta:group-hover/cta:border-line-strong group-disabled/cta:group-hover/cta:text-fg-faint"
      >
        <PlusIcon />
      </span>
      <span className="min-w-0 flex-1 truncate text-body font-medium text-fg-muted transition-colors group-hover/cta:text-fg group-disabled/cta:group-hover/cta:text-fg-muted">
        {t('Create your theme')}
      </span>
    </motion.button>
  )
}

export default function ThemeLibraryRail({
  previewTheme,
  onPreviewThemeChange,
  onStylePreview,
  activeStylePreview,
  onSyncFigma,
  onOpenInCode,
  syncFooter,
}: {
  previewTheme: string
  onPreviewThemeChange: (theme: string) => void
  /** Ephemeral try-on: fired with a preset + the appearance to read it in while
   *  its row is open, `null` when it closes or the rail unmounts. Never mutates
   *  the system. */
  onStylePreview?: (preview: StylePreview | null) => void
  /** The try-on currently live in the shell. The open preset row is DERIVED from
   *  this rather than held locally, so the row closes on its own the moment the
   *  shell drops the preview — which is exactly what an auto-adopt does. Left
   *  local, the row stayed expanded offering "Add to system" for a style that
   *  had just been added, which is the confusion this fixes. */
  activeStylePreview?: StylePreview | null
  /** Get code — select this theme and switch the workspace to that tab. */
  /** Preview a theme and open the Figma page with it. */
  onSyncFigma?: (theme: string) => void
  onOpenInCode?: (theme: string) => void
  /** GitHub · Figma sync destinations — pinned above the app footer. */
  syncFooter?: ReactNode
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const { themeOrder, themeKinds, themeLabels, themeSources, themes, removeTheme } = store
  const chromeTheme = useTheme()
  const [editor, setEditor] = useState<false | 'new' | string>(false)
  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const [rowMenuKey, setRowMenuKey] = useState<string | null>(null)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const optionsRootRef = useRef<HTMLDivElement>(null)
  const [confirmDeleteOwnThemes, setConfirmDeleteOwnThemes] = useState(false)
  const [allOpen, setAllOpen] = useState(false)
  const [themeQuery, setThemeQuery] = useState('')
  // Per-preset appearance choice. Sparse on purpose — an entry only exists once
  // the user has explicitly picked a side; until then a preset previews in
  // whichever appearance the WORKSPACE is in (`chromeTheme`), so a dark session
  // shows dark styles and a light one shows light. `preferredAppearance` is
  // authored metadata, not a default — it never overrides the current chrome.
  const [presetKind, setPresetKind] = useState<Record<string, 'light' | 'dark'>>({})
  const availableThemes = themeOrder.filter((key) => themes[key])
  // "Has the user made a theme of their own yet?" — anything beyond the two
  // built-ins the store ships. Renaming Light/Dark doesn't count as creating
  // one, and shouldn't: the keys are what identify them.
  const ownThemeKeys = myThemeKeys(themeOrder, themes)
  const hasOwnTheme = ownThemeKeys.length > 0
  // MY THEMES lists the user's OWN themes and nothing else, ever. The two
  // built-ins (`light` / `dark`) stay in the store and still drive the preview
  // — they are simply not a choice on a screen whose job is "start from a
  // System Style or make your own".
  //
  // This used to be gated on `firstRun`, and that gate could not hold: it comes
  // from `hasOnboarded()`, which is true as soon as the zustand persist key
  // exists, and zustand writes that key on the first persisted change. So the
  // very next RELOAD stopped counting as a first run and the two built-ins
  // reappeared as rows named "Light" and "Dark" — reported as previous themes
  // showing up by themselves. They also read as a duplicated pair, because
  // since the v60 semantic model EVERY theme owns both a Light and a Dark map
  // (`themeSemantics[key]`), so one theme per appearance is a distinction the
  // data no longer makes.
  const listedThemes = ownThemeKeys
  const railThemes = visibleMyThemes(listedThemes, previewTheme)
  const room = myThemeRoom(listedThemes.length)
  const canAdd = canAddMyTheme(listedThemes.length)
  const filteredAll = themeQuery.trim()
    ? listedThemes.filter((key) => labelForTheme(key, themeLabels).toLowerCase().includes(themeQuery.trim().toLowerCase()))
    : listedThemes
  const kindOf = (preset: ThemeStylePreset) => presetKind[preset.id] ?? chromeTheme
  const corePreset = THEME_STYLE_PRESETS.find((preset) => preset.id === 'core-minimal') ?? THEME_STYLE_PRESETS[0]

  // Any exit from the preset — picking a real theme, opening the editor, or the
  // rail unmounting on a tab switch — drops the try-on so the preview snaps back
  // to the live system.
  const selectedPreset = activeStylePreview?.preset.id ?? null
  const clearStylePreview = () => onStylePreview?.(null)
  useEffect(() => () => onStylePreview?.(null), [onStylePreview])
  useEffect(() => {
    if (!optionsOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!optionsRootRef.current?.contains(event.target as Node)) setOptionsOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOptionsOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [optionsOpen])
  const previewPreset = (preset: ThemeStylePreset, appearance: 'light' | 'dark') => {
    loadGoogleFont(preset.foundations.typography?.fontFamily ?? '')
    loadGoogleFont(preset.foundations.typography?.headingFontFamily ?? '')
    onStylePreview?.({ preset, appearance })
  }

  // With no theme of their own yet, the workspace lands with Core already tried
  // on — a real, opinionated system on screen instead of the bare violet
  // default, its row expanded and "Add to system" one click away. Nothing is
  // committed: the try-on is an overlay, so Core is SHOWN, not added to My
  // themes.
  //
  // Gated on `hasOwnTheme` alone, never on a first-visit flag. Tying it to the first
  // browser visit meant the default only ever appeared once: a reload landed
  // the same user, still without a theme, back on the bare default — which is
  // the state this seed exists to avoid, not a state worth returning to.
  // Mount-only (`[]`), so closing the try-on stays closed for the session; it
  // re-seeds on a rail remount (a tab round-trip) and stops for good the moment
  // a theme is committed.
  useEffect(() => {
    if (!hasOwnTheme) previewPreset(corePreset, chromeTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Adopting a style is the quick-settings rail's job now — `adoptPreset` is
  // called there, from the "Add to system" button under the Name field and from
  // the first-edit auto-adopt. This rail previews; it no longer commits.
  const deleteTheme = (key: string) => {
    clearStylePreview()
    const next = availableThemes.find((theme) => theme !== key)
    if (previewTheme === key) {
      if (next) onPreviewThemeChange(next)
      else if (corePreset) previewPreset(corePreset, chromeTheme)
    } else if (!next && corePreset) {
      previewPreset(corePreset, chromeTheme)
    }
    removeTheme(key)
    setDeleteKey(null)
  }

  const deleteOwnThemes = () => {
    const fallback = availableThemes.find((key) => key === 'light') ?? availableThemes.find((key) => key === 'dark') ?? availableThemes.find((key) => !ownThemeKeys.includes(key))
    if (ownThemeKeys.includes(previewTheme) && fallback) onPreviewThemeChange(fallback)
    ownThemeKeys.forEach((key) => removeTheme(key))
    if (corePreset) previewPreset(corePreset, chromeTheme)
    setEditor(false)
    setDeleteKey(null)
    setConfirmDeleteOwnThemes(false)
    setAllOpen(false)
    setThemeQuery('')
  }

  useEffect(() => {
    if (!allOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (rowMenuKey || deleteKey) return
      setAllOpen(false)
      setThemeQuery('')
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [allOpen, rowMenuKey, deleteKey])

  useEffect(() => {
    if (!allOpen || listedThemes.length > MY_THEME_RAIL_LIMIT) return
    setAllOpen(false)
    setThemeQuery('')
  }, [allOpen, listedThemes.length])

  return (
    <aside
      id="themes-library"
      tabIndex={-1}
      className={`flex-shrink-0 flex flex-col min-h-0 ${SHELL_CHROME} outline-none`}
      style={{ width: THEME_LIBRARY_WIDTH }}
      aria-label={t('Themes library')}
    >
      <div ref={optionsRootRef} className="relative h-[52px] flex-shrink-0 flex items-center justify-between gap-2 pl-4 pr-3.5 border-b border-line">
        <h2 className="min-w-0 text-ui font-semibold text-fg truncate">{t('Themes library')}</h2>
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={() => setOptionsOpen((open) => !open)}
            aria-label={t('Theme library options')}
            title={t('Theme library options')}
            aria-haspopup="menu"
            aria-expanded={optionsOpen}
            className={`${THEME_RAIL_ICON_BTN} ${optionsOpen ? THEME_RAIL_ICON_BTN_ACTIVE : ''}`}
          >
            <LibraryOptionsIcon />
          </button>
        </div>
        <AnimatePresence>
          {optionsOpen && (
            <ThemeLibraryOptionsPopover
              hasOwnThemes={hasOwnTheme}
              onResetSuggestedStyles={() => {
                setPresetKind({})
                if (corePreset) previewPreset(corePreset, chromeTheme)
                setOptionsOpen(false)
              }}
              onDeleteMyThemes={() => { setOptionsOpen(false); setConfirmDeleteOwnThemes(true) }}
            />
          )}
        </AnimatePresence>
      </div>

      <nav aria-label="Themes" className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
        <div className="flex items-center justify-between gap-2 pl-2 pr-1.5 pb-1.5">
          {allOpen ? (
            <button
              type="button"
              onClick={() => { setAllOpen(false); setThemeQuery('') }}
              aria-label={t('Back to My themes')}
              title={t('Back to My themes')}
              className="flex min-w-0 items-center gap-1.5 rounded-md text-caption font-semibold text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            >
              <BackIcon />
              <span className="truncate">{t('All themes')}</span>
            </button>
          ) : (
            <span className="text-caption font-semibold text-fg-muted">{t('My themes')}</span>
          )}
          {/* Counts every owned theme, not the 5 the rail shows. */}
          <span
            className={THEME_RAIL_COUNT_BADGE}
            title={t('{count} in this system', { count: listedThemes.length })}
          >
            {listedThemes.length}
          </span>
        </div>
        <AnimatePresence initial={false}>
          {confirmDeleteOwnThemes && (
            <DeleteMyThemesConfirmation
              count={ownThemeKeys.length}
              onCancel={() => setConfirmDeleteOwnThemes(false)}
              onConfirm={deleteOwnThemes}
            />
          )}
        </AnimatePresence>
        {room !== 'ok' && (
          <p className={`mb-2 px-2 text-mini leading-relaxed ${room === 'full' ? 'text-status-warning' : 'text-fg-faint'}`}>
            {room === 'full'
              ? t(MY_THEME_FULL_ERROR, { count: listedThemes.length })
              : t('A large theme list makes the editor and export heavier.')}
          </p>
        )}
        {allOpen && listedThemes.length > MY_THEME_RAIL_LIMIT && (
          <label className="mb-2 block px-0.5">
            <span className="sr-only">{t('Search themes')}</span>
            <input
              type="search"
              value={themeQuery}
              onChange={(event) => setThemeQuery(event.target.value)}
              placeholder={t('Search themes')}
              className="h-8 w-full rounded-lg border border-line-strong bg-app px-2.5 text-caption text-fg placeholder:text-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            />
          </label>
        )}
        <div className="flex flex-col gap-1">
          {(allOpen ? filteredAll : railThemes).map((key) => (
            <ThemeLibraryRow
              key={key}
              label={labelForTheme(key, themeLabels)}
              active={key === previewTheme}
              kind={themeKinds[key] ?? 'light'}
              ramp={themeBrandRamp(key, themeSources, themeKinds, store)}
              fallback={store.primaryColor}
              menuOpen={rowMenuKey === key}
              deleteOpen={deleteKey === key}
              isLast={availableThemes.length <= 1}
              onPreview={() => { clearStylePreview(); onPreviewThemeChange(key) }}
              onEdit={() => { clearStylePreview(); onPreviewThemeChange(key); setEditor(key) }}
              onToggleMenu={() => setRowMenuKey((open) => (open === key ? null : key))}
              onCloseMenu={() => setRowMenuKey(null)}
              onSyncFigma={() => { setRowMenuKey(null); onSyncFigma?.(key) }}
              onOpenInCode={() => { setRowMenuKey(null); onOpenInCode?.(key) }}
              onAskDelete={() => { setRowMenuKey(null); setDeleteKey(key) }}
              onCancelDelete={() => setDeleteKey(null)}
              onConfirmDelete={() => deleteTheme(key)}
            />
          ))}
          <CreateThemeButton
            disabled={!canAdd}
            onClick={() => { if (!canAdd) return; clearStylePreview(); setEditor('new') }}
          />
          {!allOpen && listedThemes.length > MY_THEME_RAIL_LIMIT && (
            <button
              type="button"
              onClick={() => { setRowMenuKey(null); setAllOpen(true) }}
              className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            >
              <span>{t('All themes')} ({listedThemes.length})</span>
              <span className="tabular-nums text-micro text-fg-faint">+{listedThemes.length - railThemes.length}</span>
            </button>
          )}
        </div>

        {!allOpen && <div className="mt-4 border-t border-line pt-3">
          <div className="flex items-center justify-between gap-2 pl-2 pr-1.5 pb-1.5">
            <span className="text-caption font-semibold text-fg-muted">{t('System styles')}</span>
            <span className={THEME_RAIL_COUNT_BADGE} title={t('{count} system styles', { count: THEME_STYLE_PRESETS.length })}>
              {THEME_STYLE_PRESETS.length}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {THEME_STYLE_PRESETS.map((preset) => {
              const expanded = selectedPreset === preset.id
              const kind = kindOf(preset)
              // An open row's avatar follows the LIVE try-on appearance (the
              // board's sun/moon now owns that choice); a resting row shows the
              // chrome's.
              const previewKind = expanded && activeStylePreview?.preset.id === preset.id
                ? activeStylePreview.appearance
                : kind
              return (
                <div key={preset.id} className={`rounded-xl border transition-colors ${expanded ? 'border-line bg-surface' : THEME_RAIL_ROW_IDLE}`}>
                  <div className="flex items-center gap-1.5 p-1.5">
                    <button
                      type="button"
                      onClick={() => (expanded ? clearStylePreview() : previewPreset(preset, kind))}
                      aria-expanded={expanded}
                      title={`${preset.label} — ${preset.description} ${preset.detail}${preset.accessibilityNote ? ` ${preset.accessibilityNote}` : ''}`}
                      className="flex flex-1 min-w-0 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                    >
                      <ThemeAvatar ramp={PRESET_AVATAR_RAMPS[`${preset.id}:${previewKind}`]} appearance={previewKind} fallback={preset.accent} />
                      <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">{preset.shortLabel}</span>
                    </button>
                    {/* The light/dark choice for an open try-on moved to the
                        board's own sun/moon icon (Theme Preview header) — one
                        appearance control per screen, and it's beside what it
                        actually repaints. */}
                  </div>
                  {expanded && (
                    <div className="px-2 pb-2">
                      <div className="grid grid-cols-2 gap-1 border-t border-line pt-2 text-micro text-fg-muted">
                        <span className="truncate">{preset.foundations.typography?.fontFamily}</span>
                        {/* Appearance is NOT listed here any more — the toggle
                            above states it, and a readout beside a control that
                            sets the same thing is one of them lying eventually. */}
                        <span className="text-right capitalize">{preset.neutralTint} tint</span>
                        <span>{preset.foundations.radius?.md} radius</span>
                        <span className="text-right">{preset.foundations.stroke?.sm} border</span>
                      </div>
                      {/* No "Add to system" / "Add and customize" pair here any
                          more. Both MOVED to the quick-settings rail, under the
                          Name field (see its own note): committing a style and
                          editing it are one intent, and splitting them across
                          two columns meant the button that unlocked the editor
                          lived nowhere near the editor it unlocked. An expanded
                          row now does one thing — try the style on — and the
                          canvas plus that rail carry the decision.

                          "Add and customize" is gone rather than relocated: with
                          the rail editable during a try-on, "add it and open the
                          editor" is what simply editing already does. */}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>}
      </nav>

      {syncFooter && (
        <div className="flex-shrink-0 border-t border-line px-[9px] pb-[11px] pt-[9px]">
          {syncFooter}
        </div>
      )}

      <ThemePanel
        open={editor !== false}
        editKey={editor && editor !== 'new' ? editor : null}
        appearance={themeKinds[previewTheme] ?? 'light'}
        onClose={() => setEditor(false)}
        onCreated={(key) => { onPreviewThemeChange(key); setEditor(key) }}
        onRenamed={(oldKey, newKey) => {
          if (previewTheme === oldKey) onPreviewThemeChange(newKey)
          setEditor(newKey)
        }}
        dockLeftOverride={THEME_LIBRARY_WIDTH}
        dockToSelector={'aside[aria-label="Themes library"]'}
      />

    </aside>
  )
}
