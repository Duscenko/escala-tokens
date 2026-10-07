import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { useTheme } from '../../lib/theme'
import { themeBrandRamp, themeDisplayName } from '../../lib/themeSources'
import { THEME_STYLE_PRESETS, type ThemeStylePreset } from '../../lib/themePresets'
import type { StylePreview } from '../../lib/stylePreviewOverlay'
import { loadGoogleFont } from '../../lib/fonts'
import { MY_THEME_FULL_ERROR, MY_THEME_HARD_CAP, canAddMyTheme, myThemeKeys } from '../../lib/themeLibrary'
import { useI18n } from '../../lib/i18n'
import { CHROME_CONTROL_HOVER, CHROME_CONTROL_SHELL } from './themeWorkspaceLayout'
import { COLOR_RAIL_WIDTH, usePopoverPlacement } from './colorControls'
import { DeleteThemeConfirmation, LibraryOptionsIcon, ThemeAvatar } from './ThemeLibraryRail'
import { PRESET_AVATAR_RAMPS } from './StyleOverview'
import { FOUNDATION_ICON_RAIL_WIDTH, RailTile } from './FoundationIconRail'

const MENU_W = 260

/** Selected row — the same neutral edge the Themes library rail gives its
 *  active row (`border-line-strong`), on the menu's hover fill. One selection
 *  language for both lists, so My themes and System styles read alike. */
const ROW_SELECTED = 'bg-elevated text-fg ring-1 ring-inset ring-line-strong'

const ITEM =
  'flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50'

/** House, same 18px box the rail's old folder used, painted with currentColor
 *  so the active tile's accent ink reaches it. */
function HouseGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  )
}

/** Same 64px as the Variables icon column. Opens Home — the file browser.
 *  The section id stays `themes-library` so existing controls keep working. */
export function ThemesLibraryToggle({
  open,
  onToggle,
  placement = 'tab-bar',
}: {
  open: boolean
  onToggle: () => void
  placement?: 'tab-bar' | 'icon-rail'
}) {
  const { t } = useI18n()
  const label = t('Home')
  const iconRail = placement === 'icon-rail'
  const tile = (
    <RailTile
      on={open}
      label={label}
      compact={!iconRail}
      onClick={onToggle}
      aria-pressed={open}
      aria-expanded={open}
      aria-controls="themes-library"
      aria-label={label}
      title={label}
    >
      <HouseGlyph />
    </RailTile>
  )
  if (iconRail) return tile
  // Tab-bar placement: the cell is exactly the icon rail's width and keeps its
  // border-r, so the rail's divider runs up through this row.
  return (
    <div
      className="flex h-full flex-shrink-0 items-center justify-center border-r border-line"
      style={{ width: FOUNDATION_ICON_RAIL_WIDTH }}
    >
      {tile}
    </div>
  )
}

/** Same width as the rail's Name field right below it (the rail's width minus the
 *  field's own `px-3` on each side) — the switcher is the first thing in the tab
 *  strip and that field the first thing in the column under it, so the two read
 *  as one aligned stack. Derived, not a magic number: if the rail resizes, this
 *  follows. Fixed (not content-sized) so the strip doesn't shift per label. */
export const THEME_SWITCHER_WIDTH = COLOR_RAIL_WIDTH - 24

export function ThemeSwitcher({
  previewTheme,
  onPreviewThemeChange,
  onStylePreview,
  activeStylePreview,
  onCreateTheme,
  onDuplicateTheme,
  onOpenReset,
  onOpenTheme,
}: {
  previewTheme: string
  onPreviewThemeChange: (theme: string) => void
  onStylePreview?: (preview: StylePreview | null) => void
  activeStylePreview?: StylePreview | null
  onCreateTheme: () => void
  onDuplicateTheme: () => void
  onOpenReset: () => void
  /** "Open" in a row's options — select the theme and land on Theme preview. */
  onOpenTheme?: (theme: string) => void
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
  // Which row's options are expanded, and what that row is doing. One row at a
  // time: the actions open INLINE under the row they belong to, not in a second
  // floating menu stacked on this one.
  const [rowMenu, setRowMenu] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const resetRow = () => { setRowMenu(null); setRenaming(null); setConfirmDelete(null) }
  // Escape unwinds one level at a time: an open row first, then the menu.
  const rowBusy = useRef(false)
  rowBusy.current = rowMenu !== null || renaming !== null
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
      if (event.key !== 'Escape') return
      if (rowBusy.current) resetRow()
      else setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, place.up])

  useEffect(() => { if (!open) resetRow() }, [open])

  const previewPreset = (preset: ThemeStylePreset) => {
    loadGoogleFont(preset.foundations.typography?.fontFamily ?? '')
    loadGoogleFont(preset.foundations.typography?.headingFontFamily ?? '')
    onStylePreview?.({ preset, appearance: chromeTheme })
    setOpen(false)
  }

  const deleteTheme = (key: string) => {
    const other = listed.find((k) => k !== key)
    if (previewTheme === key) {
      if (other) onPreviewThemeChange(other)
      else {
        const core = THEME_STYLE_PRESETS.find((preset) => preset.id === 'core-minimal') ?? THEME_STYLE_PRESETS[0]
        if (core) previewPreset(core)
      }
    }
    store.removeTheme(key)
    resetRow()
  }

  // Selecting is instant, CLOSING waits one double-click interval, so a
  // double-click on a row's name can turn into a rename instead of closing the
  // menu out from under the second click.
  const closeTimer = useRef<number | null>(null)
  const cancelClose = () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
    closeTimer.current = null
  }
  useEffect(() => cancelClose, [])
  const selectTheme = (key: string) => {
    onStylePreview?.(null)
    onPreviewThemeChange(key)
    cancelClose()
    closeTimer.current = window.setTimeout(() => { closeTimer.current = null; setOpen(false) }, 220)
  }
  const startRename = (key: string) => {
    cancelClose()
    setConfirmDelete(null)
    setRowMenu(null)
    setRenaming(key)
  }

  // The chip itself is renameable too — double-click its name. Only for one of
  // My themes: a System style being tried on isn't the user's to rename yet.
  const [chipRenaming, setChipRenaming] = useState(false)
  const chipRenameable = !tryOn && listed.includes(previewTheme)

  return (
    <div className="relative flex-shrink-0">
      {chipRenaming ? (
        <div
          style={{ width: THEME_SWITCHER_WIDTH }}
          className={`flex h-8 min-w-0 flex-shrink-0 items-center gap-1.5 rounded-lg px-1.5 ${CHROME_CONTROL_SHELL}`}
        >
          <ThemeAvatar ramp={chipRamp} appearance={chipKind} fallback={chipFallback} />
          <RenameField
            initial={chipName}
            onCommit={(next) => {
              if (next && next !== chipName) store.setThemeLabel(previewTheme, next)
              setChipRenaming(false)
              requestAnimationFrame(() => triggerRef.current?.focus())
            }}
            onCancel={() => {
              setChipRenaming(false)
              requestAnimationFrame(() => triggerRef.current?.focus())
            }}
          />
        </div>
      ) : (
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('Switch theme')}
        title={chipRenameable ? `${chipName} — ${t('double-click to rename')}` : chipName}
        onClick={(event) => { if (event.detail < 2) setOpen((v) => !v) }}
        onDoubleClick={() => {
          if (!chipRenameable) return
          setOpen(false)
          setChipRenaming(true)
        }}
        style={{ width: THEME_SWITCHER_WIDTH }}
        className={`flex h-8 min-w-0 flex-shrink-0 items-center gap-1.5 rounded-lg px-1.5 text-caption font-medium text-fg ${CHROME_CONTROL_SHELL} ${CHROME_CONTROL_HOVER} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
      >
        <ThemeAvatar ramp={chipRamp} appearance={chipKind} fallback={chipFallback} />
        <span className="min-w-0 flex-1 truncate text-left">{chipName}</span>
        <ChevronDown />
      </button>
      )}
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
                    const name = themeDisplayName(key, themeLabels)
                    const expanded = rowMenu === key
                    const avatar = (
                      <ThemeAvatar
                        ramp={themeBrandRamp(key, themeSources, themeKinds, store)}
                        appearance={themeKinds[key] ?? 'light'}
                        fallback={store.primaryColor}
                      />
                    )
                    return (
                      <div key={key} className={`group/row relative rounded-md transition-colors ${expanded ? 'bg-elevated/50' : ''}`}>
                        {renaming === key ? (
                          <RenameRow
                            avatar={avatar}
                            initial={name}
                            onCommit={(next) => { if (next && next !== name) store.setThemeLabel(key, next); resetRow() }}
                            onCancel={resetRow}
                          />
                        ) : (
                          <>
                            <button
                              type="button"
                              role="menuitemradio"
                              aria-checked={selected}
                              onClick={(event) => { if (event.detail < 2) selectTheme(key) }}
                              onDoubleClick={() => startRename(key)}
                              title={t('Double-click to rename')}
                              className={`${ITEM} pr-9 ${selected ? ROW_SELECTED : ''}`}
                            >
                              {avatar}
                              <span className={`min-w-0 flex-1 truncate ${selected ? 'font-semibold' : ''}`}>{name}</span>
                            </button>
                            <button
                              type="button"
                              aria-label={t('Options for {name}', { name })}
                              title={t('Options for {name}', { name })}
                              aria-expanded={expanded}
                              aria-controls={`theme-row-options-${key}`}
                              onClick={() => { setConfirmDelete(null); setRowMenu(expanded ? null : key) }}
                              className={`absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md transition-[opacity,color,background-color] duration-150 hover:bg-chip-rest hover:text-fg focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                                expanded || selected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100'
                              } ${expanded ? 'bg-chip-rest text-fg' : 'text-fg-faint'}`}
                            >
                              <LibraryOptionsIcon />
                            </button>
                          </>
                        )}
                        <AnimatePresence initial={false}>
                          {expanded && renaming !== key && (
                            <motion.div
                              key="options"
                              id={`theme-row-options-${key}`}
                              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden"
                            >
                              {confirmDelete === key ? (
                                <div className="p-1 pt-0.5">
                                  <DeleteThemeConfirmation
                                    name={name}
                                    isPreviewed={key === previewTheme}
                                    isLast={listed.length <= 1}
                                    onCancel={() => setConfirmDelete(null)}
                                    onConfirm={() => deleteTheme(key)}
                                  />
                                </div>
                              ) : (
                                // Indented so each action's label starts where the
                                // theme's NAME starts (10px pad + 24px avatar + 8px gap):
                                // they read as that row's children, no tree rule needed.
                                <div role="group" aria-label={t('Options for {name}', { name })} className="flex flex-col pb-1 pl-8">
                                  {onOpenTheme && (
                                    <button type="button" role="menuitem" onClick={() => { setOpen(false); onOpenTheme(key) }} className={`${ITEM} h-7`}>{t('Open')}</button>
                                  )}
                                  <button type="button" role="menuitem" onClick={() => startRename(key)} className={`${ITEM} h-7`}>{t('Rename')}</button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => setConfirmDelete(key)}
                                    className={`${ITEM} h-7 text-status-danger hover:bg-status-danger/10 hover:text-status-danger focus-visible:ring-status-danger/50`}
                                  >
                                    {t('Delete')}
                                  </button>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
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
                        className={`${ITEM} ${selected ? ROW_SELECTED : ''}`}
                      >
                        <ThemeAvatar
                          ramp={PRESET_AVATAR_RAMPS[`${preset.id}:${chromeTheme}`]}
                          appearance={chromeTheme}
                          fallback={preset.accent}
                        />
                        <span className={`min-w-0 flex-1 truncate ${selected ? 'font-semibold' : ''}`}>{preset.shortLabel}</span>
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

/** A row mid-rename: the name turns into a field in place. Enter or leaving it
 *  commits, Escape cancels, an empty name keeps the old one. */
function RenameRow({
  avatar, initial, onCommit, onCancel,
}: {
  avatar: ReactNode
  initial: string
  onCommit: (next: string) => void
  onCancel: () => void
}) {
  return (
    <div className="flex h-8 w-full items-center gap-2 rounded-md px-2.5">
      {avatar}
      <RenameField initial={initial} onCommit={onCommit} onCancel={onCancel} />
    </div>
  )
}

/** The editable name itself — shared by a menu row and the trigger chip. */
function RenameField({
  initial, onCommit, onCancel,
}: {
  initial: string
  onCommit: (next: string) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(initial)
  const done = useRef(false)
  const commit = () => { if (done.current) return; done.current = true; onCommit(draft.trim()) }
  return (
      <input
        autoFocus
        value={draft}
        maxLength={40}
        aria-label={t('Theme name')}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') { e.stopPropagation(); done.current = true; onCancel() }
        }}
        className="h-7 min-w-0 flex-1 rounded-md border border-line-strong bg-app px-2 text-caption font-medium text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      />
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


export { PlatformSwitch } from './PlatformRail'
export { PRESET_AVATAR_RAMPS }
