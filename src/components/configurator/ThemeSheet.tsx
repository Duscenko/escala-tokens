// The theme control in TopNav — one grouped pill, `[theme ⌄ | ☀]`, and the
// right-hand sheet it opens. Transversal: mounted on every top-nav section, not
// only the Generator, because which theme you are looking at is a property of
// the whole workspace, like the light/dark appearance beside it.
//
// It replaces the tab-bar ThemeSwitcher AND the rail's "Add to system" button.
// Clicking an EscalaUI style only SELECTS it in the sheet and shows its
// overview (what it is, its palette, its foundations) — nothing is written.
// "Edit theme" is the one commit: it adds the style to My themes and opens it
// in the editor. A style already in My themes is re-opened, never minted twice.

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { themeBrandRamp, themeDisplayName } from '../../lib/themeSources'
import { THEME_STYLE_PRESETS, type ThemeStylePreset } from '../../lib/themePresets'
import type { StylePreview } from '../../lib/stylePreviewOverlay'
import { openStyleForEditing } from '../../lib/adoptPreset'
import { MY_THEME_FULL_ERROR, MY_THEME_HARD_CAP, canAddMyTheme, myThemeKeys } from '../../lib/themeLibrary'
import { useI18n } from '../../lib/i18n'
import { goToLogin, useAccess } from '../../lib/access'
import { CHROME_CONTROL_HOVER, CHROME_CONTROL_SHELL } from './themeWorkspaceLayout'
import { AVATAR_RADIUS, ThemeAvatar } from './ThemeLibraryRail'
import { PRESET_AVATAR_RAMPS, StyleOverview } from './StyleOverview'
import { ThemeForm } from './ThemePanel'
import { MoonIcon, SunIcon } from './TopNav'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
const SHEET_W = 420
const STYLE_AVATAR = 40

type Appearance = 'light' | 'dark'

export function ThemeAppearanceControl({
  previewTheme,
  onPreviewThemeChange,
  stylePreview,
  onStylePreview,
  appearance,
  onAppearanceChange,
  sheet,
  onSheetChange,
  onCreated,
  onOpenLibrary,
  onOpenTheme,
}: {
  previewTheme: string
  onPreviewThemeChange: (theme: string) => void
  stylePreview: StylePreview | null
  onStylePreview: (preview: StylePreview | null) => void
  appearance: Appearance
  onAppearanceChange: (appearance: Appearance) => void
  /** Which view the sheet is on, or `false` when closed — owned by the shell so
   *  every "create a theme" door can open it directly on `'create'`. */
  sheet: false | 'browse' | 'create'
  onSheetChange: (next: false | 'browse' | 'create') => void
  /** A theme was just created in the sheet — make it the one being edited. */
  onCreated: (key: string) => void
  onOpenLibrary: () => void
  /** Land on a theme to edit it — Generator · Theme preview, with its rail. */
  onOpenTheme: (theme: string) => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const open = sheet !== false
  const setOpen = (value: boolean) => onSheetChange(value ? 'browse' : false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const tryOn = stylePreview
  const name = tryOn ? tryOn.preset.shortLabel : themeDisplayName(previewTheme, store.themeLabels)
  const kind = tryOn ? tryOn.appearance : (store.themeKinds[previewTheme] ?? 'light')
  const ramp = tryOn
    ? PRESET_AVATAR_RAMPS[`${tryOn.preset.id}:${tryOn.appearance}`]
    : themeBrandRamp(previewTheme, store.themeSources, store.themeKinds, store)
  const isDark = appearance === 'dark'

  return (
    <>
      <div className={`flex h-8 flex-shrink-0 items-stretch overflow-hidden rounded-lg ${CHROME_CONTROL_SHELL}`}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={t('Theme: {name}', { name })}
          title={name}
          className={`flex min-w-0 items-center gap-1.5 pl-1 pr-2 text-caption font-medium text-fg ${CHROME_CONTROL_HOVER} ${FOCUS} focus-visible:ring-inset`}
        >
          <ThemeAvatar ramp={ramp} appearance={kind} fallback={tryOn?.preset.accent ?? store.primaryColor} />
          <span className="hidden max-w-[112px] truncate min-[1240px]:inline">{name}</span>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden className="flex-shrink-0 opacity-60">
            <path d="M2.5 4.5 6 8l3.5-3.5" />
          </svg>
        </button>
        <span aria-hidden className="w-px self-stretch bg-line" />
        <button
          type="button"
          onClick={() => onAppearanceChange(isDark ? 'light' : 'dark')}
          aria-label={t(isDark ? 'Light appearance' : 'Dark appearance')}
          title={t(isDark ? 'Light appearance' : 'Dark appearance')}
          className={`grid w-8 place-items-center text-fg-muted hover:text-fg ${CHROME_CONTROL_HOVER} ${FOCUS} focus-visible:ring-inset`}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
      <ThemeSheet
        open={open}
        view={sheet === 'create' ? 'create' : 'browse'}
        onViewChange={(view) => onSheetChange(view)}
        onClose={() => { setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()) }}
        previewTheme={previewTheme}
        onPreviewThemeChange={onPreviewThemeChange}
        stylePreview={stylePreview}
        onStylePreview={onStylePreview}
        appearance={appearance}
        onCreated={onCreated}
        onOpenLibrary={onOpenLibrary}
        onOpenTheme={onOpenTheme}
      />
    </>
  )
}

function ThemeSheet({
  open, view, onViewChange, onClose, previewTheme, onPreviewThemeChange, stylePreview, onStylePreview,
  appearance, onCreated, onOpenLibrary, onOpenTheme,
}: {
  open: boolean
  view: 'browse' | 'create'
  onViewChange: (view: 'browse' | 'create') => void
  onClose: () => void
  previewTheme: string
  onPreviewThemeChange: (theme: string) => void
  stylePreview: StylePreview | null
  onStylePreview: (preview: StylePreview | null) => void
  appearance: Appearance
  onCreated: (key: string) => void
  onOpenLibrary: () => void
  onOpenTheme: (theme: string) => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const reduceMotion = useReducedMotion()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  // The form calls onCreated THEN onClose; the second must not reopen the list.
  const createdRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  const listed = myThemeKeys(store.themeOrder, store.themes)
  const canAdd = canAddMyTheme(listed.length)
  const activeStyleId = stylePreview ? stylePreview.preset.id : store.themeOrigin?.[previewTheme]
  // Which style the overview describes. Local to the sheet: browsing writes
  // nothing. Re-seeded on every open from the theme you are actually on.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  useEffect(() => {
    if (open) setSelectedId(activeStyleId ?? THEME_STYLE_PRESETS[0]?.id ?? null)
    // Only on open — re-seeding while it is open would undo the user's pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const selected = THEME_STYLE_PRESETS.find((preset) => preset.id === selectedId) ?? null
  const ownedKey = (presetId: string) =>
    listed.filter((key) => store.themeOrigin?.[key] === presetId).at(-1) ?? null

  useEffect(() => {
    if (!open) return
    setError(null)
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus())
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // A picker popover inside the create form handles its own Escape first.
        if ((event.target as Element | null)?.closest?.('[role="dialog"]:not([aria-modal])')) return
        event.stopPropagation()
        if (view === 'create') onViewChange('browse'); else onClose()
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      // Keep Tab inside the sheet while it is open — it is modal.
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, view, onViewChange])

  // A guest can browse and preview every style; making one theirs (Edit theme,
  // Create) needs a free account — design-plans/login-funnel.md.
  const { gated } = useAccess()

  /** The one commit — see `openStyleForEditing`. */
  const editStyle = (preset: ThemeStylePreset) => {
    if (gated) { goToLogin(); return }
    const result = openStyleForEditing(preset, appearance)
    if ('error' in result) { setError(t(result.error, { count: MY_THEME_HARD_CAP })); return }
    setError(null)
    onStylePreview(null)
    onClose()
    onOpenTheme(result.key)
  }

  const pickTheme = (key: string) => {
    onStylePreview(null)
    onPreviewThemeChange(key)
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[55]">
          <motion.div
            aria-hidden
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[6px]"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? { opacity: 0 } : { x: SHEET_W + 24 }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: SHEET_W + 24 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            style={{ width: SHEET_W }}
            className="absolute bottom-2 right-2 top-2 flex max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-[24px] border border-line bg-surface text-fg shadow-2xl"
          >
            {view === 'create' ? (
              // The create flow lives IN the sheet: same panel, no second drawer
              // docked somewhere else on the canvas. The form is the one
              // `ThemePanel` uses for editing, so a theme is made and edited with
              // identical controls. Its ✕ steps back to the list; finishing
              // closes the sheet on the new theme.
              <ThemeForm
                key="create"
                appearance={appearance}
                onClose={() => { if (createdRef.current) { createdRef.current = false; return } onViewChange('browse') }}
                onCreated={(key) => { createdRef.current = true; onCreated(key); onClose() }}
              />
            ) : (
              <>
            <header className="flex h-[68px] flex-shrink-0 items-center justify-between border-b border-line px-6">
              <h2 id={titleId} className="text-title font-semibold">{t('Customize')}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('Close')}
                className={`grid h-9 w-9 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:bg-elevated hover:text-fg ${FOCUS}`}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 py-6">
              <section className="flex flex-col gap-3">
                <h3 className="text-ui font-medium text-fg">{t('EscalaUI themes')}</h3>
                <div className="flex flex-wrap gap-2.5">
                  <div role="radiogroup" aria-label={t('EscalaUI themes')} className="contents">
                    {THEME_STYLE_PRESETS.map((preset) => {
                      const on = preset.id === selectedId
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={preset.shortLabel}
                          title={preset.shortLabel}
                          data-autofocus={on ? '' : undefined}
                          onClick={() => { setSelectedId(preset.id); setError(null) }}
                          // The SAME avatar the theme pill, My themes and the library
                          // use, scaled up — a style reads as one object everywhere.
                          style={{ borderRadius: STYLE_AVATAR * AVATAR_RADIUS }}
                          className={`relative flex-shrink-0 transition-transform hover:scale-105 active:scale-95 ${FOCUS} focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                            on ? 'ring-2 ring-fg/80 ring-offset-2 ring-offset-surface' : ''
                          }`}
                        >
                          <ThemeAvatar
                            size={STYLE_AVATAR}
                            ramp={PRESET_AVATAR_RAMPS[`${preset.id}:${appearance}`]}
                            appearance={appearance}
                            fallback={preset.accent}
                          />
                          {preset.id === activeStyleId && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="absolute inset-0 m-auto" style={{ color: '#fff', filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,.5))' }}>
                              <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {/* Create sits in the grid as the last tile — the same footprint
                      as a style, so "start from scratch" reads as one more choice. */}
                  <button
                    type="button"
                    disabled={!canAdd}
                    aria-label={t('Create your theme')}
                    title={!canAdd ? t(MY_THEME_FULL_ERROR, { count: MY_THEME_HARD_CAP }) : t('Create your theme')}
                    onClick={() => { if (gated) { goToLogin(); return } onViewChange('create') }}
                    style={{ width: STYLE_AVATAR, height: STYLE_AVATAR, borderRadius: STYLE_AVATAR * AVATAR_RADIUS }}
                    className={`grid flex-shrink-0 place-items-center border border-dashed border-line-strong text-fg-muted transition-[color,background-color,transform] hover:scale-105 hover:bg-elevated hover:text-fg active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${FOCUS}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                  </button>
                </div>

                {selected && (
                  <StyleOverview
                    key={selected.id}
                    preset={selected}
                    appearance={appearance}
                    owned={Boolean(ownedKey(selected.id))}
                    onEdit={() => editStyle(selected)}
                  />
                )}
                {error && <p role="alert" className="text-body text-status-danger">{error}</p>}
              </section>

              {listed.length > 0 && !gated && (
                <section className="flex flex-col gap-2">
                  <h3 className="text-ui font-medium text-fg">{t('My themes')}</h3>
                  <div role="radiogroup" aria-label={t('My themes')} className="flex flex-col gap-1">
                    {listed.map((key) => {
                      const on = !stylePreview && key === previewTheme
                      return (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => pickTheme(key)}
                          className={`flex h-11 items-center gap-3 rounded-xl px-2.5 text-left text-ui transition-colors ${FOCUS} ${
                            on ? 'bg-elevated font-semibold text-fg' : 'text-fg-muted hover:bg-elevated/60 hover:text-fg'
                          }`}
                        >
                          <ThemeAvatar
                            ramp={themeBrandRamp(key, store.themeSources, store.themeKinds, store)}
                            appearance={store.themeKinds[key] ?? 'light'}
                            fallback={store.primaryColor}
                          />
                          <span className="min-w-0 flex-1 truncate">{themeDisplayName(key, store.themeLabels)}</span>
                          {on && (
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="flex-shrink-0">
                              <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>

            <footer className="flex flex-shrink-0 border-t border-line px-6 py-4">
              <button
                type="button"
                onClick={() => { onClose(); onOpenLibrary() }}
                className={`h-10 flex-1 rounded-full border border-line px-4 text-ui font-medium text-fg transition-colors hover:bg-elevated ${FOCUS}`}
              >
                {t('Show themes library')}
              </button>
            </footer>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
