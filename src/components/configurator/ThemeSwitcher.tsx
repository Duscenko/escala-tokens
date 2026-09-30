import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { useTheme } from '../../lib/theme'
import { themeBrandRamp, themeDisplayName } from '../../lib/themeSources'
import { generateColorScale } from '../../lib/colorUtils'
import { THEME_STYLE_PRESETS, type ThemeStylePreset } from '../../lib/themePresets'
import type { StylePreview } from '../../lib/stylePreviewOverlay'
import { loadGoogleFont } from '../../lib/fonts'
import { MY_THEME_FULL_ERROR, MY_THEME_HARD_CAP, canAddMyTheme, myThemeKeys } from '../../lib/themeLibrary'
import { useI18n } from '../../lib/i18n'
import { CHROME_CONTROL_HOVER, CHROME_CONTROL_SHELL, THEME_SWITCHER_WIDTH_CLASS } from './themeWorkspaceLayout'
import { usePopoverPlacement } from './colorControls'
import { ThemeAvatar } from './ThemeLibraryRail'
import { FOUNDATION_ICON_RAIL_WIDTH } from './FoundationIconRail'
import { FolderIcon } from './VariableCollectionRail'

const MENU_W = 260

const PRESET_AVATAR_RAMPS = Object.fromEntries(
  THEME_STYLE_PRESETS.flatMap((preset) =>
    (['light', 'dark'] as const).map((appearance) => [
      `${preset.id}:${appearance}`,
      generateColorScale(preset.accent, 'radix', 0, undefined, appearance),
    ]),
  ),
)

const ITEM =
  'flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50'

/** Same 64px as the Variables icon column under the tab bar. Opens My themes
 *  in the column after that rail — the list is scannable past the 5-row
 *  dropdown cap (`MY_THEME_RAIL_LIMIT`). */
export function ThemesLibraryToggle({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  const { t } = useI18n()
  const label = open ? t('Hide themes library') : t('Show themes library')
  return (
    <button
      type="button"
      aria-pressed={open}
      aria-expanded={open}
      aria-controls="themes-library"
      aria-label={label}
      title={label}
      onClick={onToggle}
      className={`flex h-full flex-shrink-0 items-center justify-center border-r border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50 ${
        open ? 'bg-app text-fg' : `text-fg-muted ${CHROME_CONTROL_HOVER}`
      }`}
      style={{ width: FOUNDATION_ICON_RAIL_WIDTH }}
    >
      <FolderIcon size={16} />
    </button>
  )
}

export function ThemeSwitcher({
  previewTheme,
  onPreviewThemeChange,
  onStylePreview,
  activeStylePreview,
  onCreateTheme,
  onDuplicateTheme,
  onOpenReset,
}: {
  previewTheme: string
  onPreviewThemeChange: (theme: string) => void
  onStylePreview?: (preview: StylePreview | null) => void
  activeStylePreview?: StylePreview | null
  onCreateTheme: () => void
  onDuplicateTheme: () => void
  onOpenReset: () => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const chromeTheme = useTheme()
  const reduceMotion = useReducedMotion()
  const { themeOrder, themes, themeKinds, themeLabels, themeSources } = store
  const listed = myThemeKeys(themeOrder, themes)
  const canAdd = canAddMyTheme(listed.length)
  const canDuplicate = canAdd && listed.includes(previewTheme)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const place = usePopoverPlacement(triggerRef, open, { prefer: 280, min: 180, max: 420 })
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  const tryOn = activeStylePreview
  const chipName = tryOn
    ? tryOn.preset.shortLabel
    : themeDisplayName(previewTheme, themeLabels)
  const chipKind = tryOn
    ? tryOn.appearance
    : (themeKinds[previewTheme] ?? 'light')
  const chipRamp = tryOn
    ? PRESET_AVATAR_RAMPS[`${tryOn.preset.id}:${tryOn.appearance}`]
    : themeBrandRamp(previewTheme, themeSources, themeKinds, store)
  const chipFallback = tryOn ? tryOn.preset.accent : store.primaryColor

  useEffect(() => {
    if (!open) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const left = Math.max(8, Math.min(window.innerWidth - MENU_W - 8, rect.left))
      setPos({
        left,
        top: place.up ? rect.top - 8 : rect.bottom + 6,
      })
    }
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, place.up])

  const previewPreset = (preset: ThemeStylePreset) => {
    loadGoogleFont(preset.foundations.typography?.fontFamily ?? '')
    loadGoogleFont(preset.foundations.typography?.headingFontFamily ?? '')
    onStylePreview?.({ preset, appearance: chromeTheme })
    setOpen(false)
  }

  const selectTheme = (key: string) => {
    onStylePreview?.(null)
    onPreviewThemeChange(key)
    setOpen(false)
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('Switch theme')}
        title={chipName}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-8 ${THEME_SWITCHER_WIDTH_CLASS} min-w-0 items-center gap-1.5 rounded-lg px-1.5 text-caption font-medium text-fg ${CHROME_CONTROL_SHELL} ${CHROME_CONTROL_HOVER} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
      >
        <ThemeAvatar ramp={chipRamp} appearance={chipKind} fallback={chipFallback} />
        <span className="min-w-0 flex-1 truncate text-left">{chipName}</span>
        <ChevronDown />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={menuRef}
              role="menu"
              aria-label={t('Switch theme')}
              initial={reduceMotion ? false : { opacity: 0, y: place.up ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: place.up ? 4 : -4 }}
              transition={{ duration: 0.14 }}
              style={{
                position: 'fixed',
                left: pos.left,
                width: MENU_W,
                maxHeight: place.max,
                ...(place.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
              }}
              className="z-[70] flex flex-col overflow-hidden rounded-lg border border-line-strong bg-app p-1.5 shadow-xl"
              onKeyDown={(event) => {
                if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return
                const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"], [role="menuitem"]'))
                  .filter((el) => !el.disabled)
                if (!items.length) return
                const i = items.findIndex((el) => el === document.activeElement)
                event.preventDefault()
                let next = 0
                if (event.key === 'Home') next = 0
                else if (event.key === 'End') next = items.length - 1
                else if (event.key === 'ArrowDown') next = i < 0 ? 0 : (i + 1) % items.length
                else next = i < 0 ? items.length - 1 : (i - 1 + items.length) % items.length
                items[next]?.focus()
              }}
            >
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div role="group" aria-label={t('My themes')}>
                  <p className="px-2.5 pb-1 pt-1 text-micro font-semibold uppercase tracking-widest text-fg-faint">{t('My themes')}</p>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!canAdd}
                    title={!canAdd ? t(MY_THEME_FULL_ERROR, { count: MY_THEME_HARD_CAP }) : undefined}
                    onClick={() => { setOpen(false); onCreateTheme() }}
                    className={`${ITEM} disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    <span
                      aria-hidden
                      className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md border border-line-strong text-fg-muted"
                    >
                      <PlusIcon />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-fg">{t('Create your theme')}</span>
                  </button>
                  {listed.map((key) => {
                    const selected = !tryOn && key === previewTheme
                    return (
                      <button
                        key={key}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        onClick={() => selectTheme(key)}
                        className={ITEM}
                      >
                        <ThemeAvatar
                          ramp={themeBrandRamp(key, themeSources, themeKinds, store)}
                          appearance={themeKinds[key] ?? 'light'}
                          fallback={store.primaryColor}
                        />
                        <span className="min-w-0 flex-1 truncate">{themeDisplayName(key, themeLabels)}</span>
                        {selected ? <CheckMark /> : null}
                      </button>
                    )
                  })}
                </div>
                <div role="group" aria-label={t('System styles')} className="mt-1 border-t border-line pt-1">
                  <p className="px-2.5 pb-1 pt-1 text-micro font-semibold uppercase tracking-widest text-fg-faint">{t('System styles')}</p>
                  {THEME_STYLE_PRESETS.map((preset) => {
                    const selected = tryOn?.preset.id === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        onClick={() => previewPreset(preset)}
                        className={ITEM}
                      >
                        <ThemeAvatar
                          ramp={PRESET_AVATAR_RAMPS[`${preset.id}:${chromeTheme}`]}
                          appearance={chromeTheme}
                          fallback={preset.accent}
                        />
                        <span className="min-w-0 flex-1 truncate">{preset.shortLabel}</span>
                        {selected ? <CheckMark /> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="mt-1 flex-shrink-0 border-t border-line pt-1">
                <button
                  type="button"
                  role="menuitem"
                  disabled={!canDuplicate}
                  onClick={() => { setOpen(false); onDuplicateTheme() }}
                  className={`${ITEM} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {t('Duplicate current theme')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpen(false); onOpenReset() }}
                  className={ITEM}
                >
                  {t('Reset')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M7 2.25v9.5M2.25 7h9.5" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden className="flex-shrink-0 opacity-60">
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  )
}

function CheckMark() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0 text-accent-ui">
      <path d="m2.25 6.25 2.5 2.5 5-5" />
    </svg>
  )
}
