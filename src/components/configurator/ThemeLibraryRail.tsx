import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { useTheme } from '../../lib/theme'
import { themeBrandRamp } from '../../lib/themeSources'
import { generateColorScale } from '../../lib/colorUtils'
import type { ColorScale } from '../../types/tokens'
import ThemePanel from './ThemePanel'
import { THEME_STYLE_PRESETS, type ThemeStylePreset } from '../../lib/themePresets'
import { adoptPreset } from '../../lib/adoptPreset'
import type { StylePreview } from '../../lib/stylePreviewOverlay'
import { loadGoogleFont } from '../../lib/fonts'
import { THEME_LIBRARY_WIDTH } from './themeWorkspaceLayout'
import { useI18n } from '../../lib/i18n'

export { THEME_LIBRARY_WIDTH } from './themeWorkspaceLayout'

function labelForTheme(key: string, labels: Record<string, string>): string {
  if (labels[key]?.trim()) return labels[key]
  if (key === 'light') return 'Light'
  if (key === 'dark') return 'Dark'
  return key.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

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

function TuneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" aria-hidden>
      <path d="M2.5 4h6M11.5 4h2M2.5 8h2M7.5 8h6M2.5 12h7M12.5 12h1" />
      <circle cx="10" cy="4" r="1.4" /><circle cx="6" cy="8" r="1.4" /><circle cx="11" cy="12" r="1.4" />
    </svg>
  )
}

function LibraryOptionsIcon() {
  return (
    <span
      aria-hidden
      className="h-5 w-5 bg-current"
      style={{
        WebkitMask: "url('/icons/settings/sub-menu-context.svg') center / contain no-repeat",
        mask: "url('/icons/settings/sub-menu-context.svg') center / contain no-repeat",
      }}
    />
  )
}

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
            className="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50"
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

function DeleteThemeConfirmation({
  name, isPreviewed, onCancel, onConfirm,
}: {
  name: string
  isPreviewed: boolean
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
        {isPreviewed && ` ${t('The preview will switch to another theme.')}`}
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

// Sun / moon. The assets ship a hardcoded `stroke="white"`, so they're painted
// as a CSS mask with `currentColor` (the `ViewIcon` / `FolderIcon` pattern) —
// the glyph then follows the button's own ink in both chromes, and the
// unselected side dims with OPACITY, never colour.
const APPEARANCE_ICON: Record<'light' | 'dark', string> = {
  light: '/icons/settings/light-mode.svg',
  dark: '/icons/settings/dark-mode.svg',
}

function AppearanceGlyph({ kind }: { kind: 'light' | 'dark' }) {
  const mask = `url('${APPEARANCE_ICON[kind]}') center / contain no-repeat`
  return <span aria-hidden className="h-3.5 w-3.5 bg-current" style={{ WebkitMask: mask, mask }} />
}

/**
 * Sun / moon appearance toggle for a System Style row.
 *
 * DELIBERATELY not shown at rest — it only renders once a row is EXPANDED (the
 * user has clicked the style and the try-on is live). At that point choosing an
 * appearance is a meaningful decision; before it, it's chrome competing with the
 * six style names.
 *
 * The resting selection tracks the WORKSPACE chrome (`kindOf` → `chromeTheme`),
 * not the preset's authored `preferredAppearance` — a dark session previews
 * dark styles, a light one previews light. Every ramp a preset derives carries
 * a dark twin (Radix two-scale model), so both readings are real. This drives
 * the live try-on AND what "Add to system" mints: you cannot preview one
 * appearance and commit the other.
 */
function AppearanceToggle({
  value, label, onChange,
}: {
  value: 'light' | 'dark'
  label: string
  onChange: (appearance: 'light' | 'dark') => void
}) {
  const { t } = useI18n()
  return (
    <span className="flex flex-shrink-0 items-center gap-px rounded-md border border-line bg-app/60 p-px">
      {(['light', 'dark'] as const).map((appearance) => (
        <button
          key={appearance}
          type="button"
          onClick={() => onChange(appearance)}
          aria-pressed={value === appearance}
          aria-label={t('Preview {name} in {appearance}', { name: label, appearance: t(appearance) })}
          title={t('Preview {name} in {appearance}', { name: label, appearance: t(appearance) })}
          // 24px target (WCAG 2.2 2.5.8) around a 14px glyph — the hit area
          // grows, the mark does not, the same rule `HitArea` follows.
          className={`grid h-6 w-6 place-items-center rounded transition-[background-color,opacity] ${
            value === appearance ? 'bg-elevated text-fg opacity-100' : 'text-fg-muted opacity-40 hover:opacity-75'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
        >
          <AppearanceGlyph kind={appearance} />
        </button>
      ))}
    </span>
  )
}

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

export default function ThemeLibraryRail({
  previewTheme,
  onPreviewThemeChange,
  onStylePreview,
  activeStylePreview,
  firstRun = false,
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
  /** This browser opened the workspace for the very first time (captured once
   *  by the shell — see its `firstRun`). Until the user commits a theme of
   *  their own, MY THEMES collapses to just the "Create your theme" invitation:
   *  the two built-ins (Light / Dark) are still in the store and still drive the
   *  preview, they're simply not offered as a choice on a screen whose whole
   *  job right now is "start from a System Style". */
  firstRun?: boolean
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const { themeOrder, themeKinds, themeLabels, themeSources, themes, removeTheme } = store
  const chromeTheme = useTheme()
  const [editor, setEditor] = useState<false | 'new' | string>(false)
  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const optionsRootRef = useRef<HTMLDivElement>(null)
  const [confirmDeleteOwnThemes, setConfirmDeleteOwnThemes] = useState(false)
  const [presetError, setPresetError] = useState<string | null>(null)
  // Per-preset appearance choice. Sparse on purpose — an entry only exists once
  // the user has explicitly picked a side; until then a preset previews in
  // whichever appearance the WORKSPACE is in (`chromeTheme`), so a dark session
  // shows dark styles and a light one shows light. `preferredAppearance` is
  // authored metadata, not a default — it never overrides the current chrome.
  const [presetKind, setPresetKind] = useState<Record<string, 'light' | 'dark'>>({})
  const availableThemes = themeOrder.filter((key) => themes[key])
  const reduceMotion = useReducedMotion()
  // "Has the user made a theme of their own yet?" — anything beyond the two
  // built-ins the store ships. Renaming Light/Dark doesn't count as creating
  // one, and shouldn't: the keys are what identify them.
  const hasOwnTheme = availableThemes.some((key) => key !== 'light' && key !== 'dark')
  const ownThemeKeys = availableThemes.filter((key) => key !== 'light' && key !== 'dark')
  // On a first-run browser MY THEMES shows only the "Create your theme" door —
  // until the user actually makes one (adopting a System Style counts, it mints
  // a real theme), at which point the built-ins rejoin the list beside it.
  const showBuiltInThemes = !firstRun || hasOwnTheme
  const listedThemes = showBuiltInThemes ? availableThemes : []
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
    setPresetError(null)
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
  // Gated on `hasOwnTheme` alone, NOT on `firstRun`. Tying it to the first
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

  const addPreset = (preset: ThemeStylePreset, customize: boolean) => {
    setPresetError(null)
    // `adoptPreset` is shared with the quick rail's auto-adopt, so an explicit
    // "Add to system" and an edit-triggered adopt mint byte-identical themes.
    const result = adoptPreset(preset, kindOf(preset))
    if ('error' in result) { setPresetError(result.error); return }
    clearStylePreview()
    onPreviewThemeChange(result.key)
    if (customize) setEditor(result.key)
  }

  const deleteTheme = (key: string) => {
    clearStylePreview()
    if (previewTheme === key) {
      const next = availableThemes.find((theme) => theme !== key)
      if (next) onPreviewThemeChange(next)
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
  }

  return (
    <aside
      className="flex-shrink-0 flex flex-col min-h-0"
      style={{ width: THEME_LIBRARY_WIDTH }}
      aria-label={t('Themes library')}
    >
      <div ref={optionsRootRef} className="relative h-[52px] flex-shrink-0 flex items-center justify-between gap-2 pl-4 pr-3 border-b border-line">
        <div className="min-w-0">
          <h2 className="text-ui font-semibold text-fg truncate">{t('Themes library')}</h2>
          <p className="text-mini text-fg-muted tabular-nums">{t('{count} in this system', { count: availableThemes.length })}</p>
        </div>
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={() => setOptionsOpen((open) => !open)}
            aria-label={t('Theme library options')}
            title={t('Theme library options')}
            aria-haspopup="menu"
            aria-expanded={optionsOpen}
            className={`grid h-8 w-8 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${optionsOpen ? 'bg-surface text-fg' : 'text-fg-faint hover:bg-surface hover:text-fg'}`}
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
                setPresetError(null)
                if (corePreset) previewPreset(corePreset, chromeTheme)
                setOptionsOpen(false)
              }}
              onDeleteMyThemes={() => { setOptionsOpen(false); setConfirmDeleteOwnThemes(true) }}
            />
          )}
        </AnimatePresence>
      </div>

      <nav aria-label="Themes" className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
        <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
          <span className="text-caption font-semibold text-fg-muted">{t('My themes')}</span>
          {hasOwnTheme && (
            <button
              type="button"
              onClick={() => { clearStylePreview(); setEditor('new') }}
              aria-label={t('Create theme')}
              title={t('Create theme')}
              className="w-6 h-6 grid place-items-center rounded-md text-fg-faint hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 transition-colors"
            >
              <PlusIcon />
            </button>
          )}
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
        <div className="flex flex-col gap-1">
          {listedThemes.map((key) => {
            const active = key === previewTheme
            const kind = themeKinds[key] ?? 'light'
            const ramp = themeBrandRamp(key, themeSources, themeKinds, store)
            return (
              <div key={key} className="flex flex-col gap-1">
              <div
                // Uniform `p-1.5` on the card, nothing on the children: the
                // avatar sits 6px from the card's top / bottom / left edges, so
                // its `rounded-md` (0.375rem) is concentric with the card's
                // `rounded-xl` (0.75rem − 0.375rem inset). `gap-2` is the only
                // horizontal spacing.
                className={`group relative flex items-center gap-2 p-1.5 rounded-xl border transition-colors ${
                  active
                    ? 'border-accent-ui/30 bg-app shadow-[0_2px_12px_-6px_rgba(0,0,0,0.24)]'
                    : 'border-transparent hover:border-line hover:bg-white/45 dark:hover:bg-white/[0.06]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => { clearStylePreview(); onPreviewThemeChange(key); setEditor(key) }}
                  aria-label={t('Edit {name} theme', { name: labelForTheme(key, themeLabels) })}
                  title={t('Edit {name} theme', { name: labelForTheme(key, themeLabels) })}
                  className="flex-shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
                >
                  <ThemeAvatar ramp={ramp} appearance={kind} fallback={store.primaryColor} />
                </button>
                <button
                  type="button"
                  onClick={() => { clearStylePreview(); onPreviewThemeChange(key) }}
                  aria-current={active ? 'true' : undefined}
                  // No padding of its own — the card owns it. Right room for the
                  // trash is only claimed WHEN the trash is actually shown
                  // (active, or hover), so a resting inactive row is symmetric.
                  className={`flex-1 min-w-0 flex items-center text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50 ${
                    availableThemes.length > 1 ? (active ? 'pr-6' : 'group-hover:pr-6 group-focus-within:pr-6') : ''
                  }`}
                >
                  {/* No "{kind} appearance" subline: the name IS "Light" / "Dark",
                      and the kind is already shown by the avatar's border and the
                      workspace's own Light/Dark appearance toggle. */}
                  <span className={`min-w-0 flex-1 truncate text-body text-fg ${active ? 'font-semibold' : 'font-medium'}`}>
                    {labelForTheme(key, themeLabels)}
                  </span>
                </button>
                {availableThemes.length > 1 && (
                  <div className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'} transition-opacity`}>
                    <button
                      type="button"
                      onClick={() => setDeleteKey(key)}
                      aria-label={t('Delete {name}', { name: labelForTheme(key, themeLabels) })}
                      title={t('Delete {name}', { name: labelForTheme(key, themeLabels) })}
                      className="w-6 h-6 grid place-items-center rounded-md bg-app/90 text-fg-faint hover:text-status-danger transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                )}
              </div>
              <AnimatePresence initial={false}>
                {deleteKey === key && (
                  <DeleteThemeConfirmation
                    name={labelForTheme(key, themeLabels)}
                    isPreviewed={previewTheme === key}
                    onCancel={() => setDeleteKey(null)}
                    onConfirm={() => deleteTheme(key)}
                  />
                )}
              </AnimatePresence>
              </div>
            )
          })}
          {/* The door OUT of the two built-ins.
              `themeOrder` can't actually start empty — the store keeps at least
              one theme because an empty matrix has nothing to edit or export
              (`removeTheme`) — so instead of faking an empty list, the invitation
              sits AS a row, in the row's own shape, at the end of the list. It's
              the same target size and rhythm as a theme, so it reads as "the
              next one", not as chrome; the dashed border and the accent tint are
              what say it isn't a theme yet.
              It disappears once the user HAS their own theme (more than the two
              built-ins): the header's `+` is the durable entry point, and a
              permanent CTA in a list you've already used is nagging. */}
          {!hasOwnTheme && (
            <motion.button
              type="button"
              onClick={() => { clearStylePreview(); setEditor('new') }}
              initial={reduceMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
              whileHover={reduceMotion ? undefined : { scale: 1.015 }}
              whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              className="group/cta relative flex items-center gap-2 rounded-xl border border-dashed border-line-strong p-1.5 text-left transition-colors hover:border-accent-ui/60 hover:bg-accent-ui/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            >
              <span
                aria-hidden
                className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md border border-dashed border-line-strong text-fg-faint transition-colors group-hover/cta:border-accent-ui/60 group-hover/cta:text-accent-ui"
              >
                <PlusIcon />
              </span>
              <span className="min-w-0 flex-1 truncate text-body font-medium text-fg-muted transition-colors group-hover/cta:text-fg">
                {t('Create your theme')}
              </span>
            </motion.button>
          )}
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <div className="flex items-center justify-between gap-2 px-2 pb-1.5">
            <span className="text-caption font-semibold text-fg-muted">{t('System styles')}</span>
            <span className="text-micro tabular-nums text-fg-faint">{THEME_STYLE_PRESETS.length}</span>
          </div>
          <div className="flex flex-col gap-1">
            {THEME_STYLE_PRESETS.map((preset) => {
              const expanded = selectedPreset === preset.id
              const kind = kindOf(preset)
              return (
                <div key={preset.id} className={`rounded-xl border transition-colors ${expanded ? 'border-line bg-surface' : 'border-transparent hover:border-line hover:bg-surface/60'}`}>
                  <div className="flex items-center gap-1.5 p-1.5">
                    <button
                      type="button"
                      onClick={() => (expanded ? clearStylePreview() : previewPreset(preset, kind))}
                      aria-expanded={expanded}
                      // The description moved here when the info icon gave up
                      // its slot to the appearance toggle — same words, on the
                      // row they describe, one fewer control to aim at.
                      title={`${preset.label} — ${preset.description} ${preset.detail}${preset.accessibilityNote ? ` ${preset.accessibilityNote}` : ''}`}
                      className="flex flex-1 min-w-0 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                    >
                      <ThemeAvatar ramp={PRESET_AVATAR_RAMPS[`${preset.id}:${kind}`]} appearance={kind} fallback={preset.accent} />
                      <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">{preset.shortLabel}</span>
                    </button>
                    {/* Only once the style is open and the try-on is live —
                        never at rest, where it would just be chrome next to the
                        six names. Switching it re-previews in that appearance
                        and is what "Add to system" will mint. */}
                    {expanded && (
                      <AppearanceToggle
                        value={kind}
                        label={preset.shortLabel}
                        onChange={(appearance) => {
                          setPresetKind((current) => ({ ...current, [preset.id]: appearance }))
                          previewPreset(preset, appearance)
                        }}
                      />
                    )}
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
                      {presetError && <p role="alert" className="mt-2 text-mini text-status-danger">{presetError}</p>}
                      <div className="mt-2 grid grid-cols-[1fr_auto] gap-1.5">
                        {/* `bg-fg text-app` — the CHROME's primary action (the
                            same pill TopNav's Export uses), deliberately not
                            `bg-accent-ui`. This button belongs to Escala, not to
                            the style being tried on: painting it with the
                            previewed theme's accent made the one control that
                            commits a theme change colour with the thing it was
                            about to commit. Theme-independent by construction —
                            white on black ink in dark chrome, and the inverse in
                            light — with no ink to solve for. */}
                        <button
                          type="button"
                          onClick={() => addPreset(preset, false)}
                          className="h-7 rounded-lg bg-fg px-2 text-mini font-semibold text-app transition-opacity hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                        >
                          {t('Add to system')}
                        </button>
                        <button
                          type="button"
                          onClick={() => addPreset(preset, true)}
                          title={t('Add and edit colors')}
                          aria-label={t('Add and customize {name}', { name: preset.label })}
                          className="h-7 w-7 grid place-items-center rounded-lg border border-line text-fg-muted hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                        >
                          <TuneIcon />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </nav>

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
        dockTopOverride={72}
      />

    </aside>
  )
}
