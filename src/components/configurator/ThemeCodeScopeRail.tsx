import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { themeBrandRamp, themeDisplayName } from '../../lib/themeSources'
import { BASE_TONE } from '../../lib/colorUtils'
import { useI18n } from '../../lib/i18n'
import { COLOR_RAIL_WIDTH } from './colorControls'
import { myThemeKeys, DeleteThemeConfirmation, LibraryOptionsIcon } from './ThemeLibraryRail'

export const CODE_SCOPE_ALL = 'all'
export type CodeThemeScope = typeof CODE_SCOPE_ALL | string

function RadioMark({ selected }: { selected: boolean }) {
  return (
    <span
      className={`grid h-4 w-4 flex-shrink-0 place-items-center rounded-full border-2 ${
        selected ? 'border-accent-ui' : 'border-line-strong'
      }`}
      aria-hidden
    >
      {selected ? <span className="h-1.5 w-1.5 rounded-full bg-accent-ui" /> : null}
    </span>
  )
}

function ThemeSwatch({ hex }: { hex: string }) {
  return (
    <span
      className="h-3.5 w-3.5 flex-shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15"
      style={{ background: hex }}
      aria-hidden
    />
  )
}

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 2.5 8 6l-3.5 3.5" />
    </svg>
  )
}

function ThemeRowMenu({
  onOpenInCode,
  onDelete,
}: {
  onOpenInCode: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -4 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-0 top-full z-[60] mt-1 w-44 origin-top-right overflow-hidden rounded-lg border border-line-strong bg-app p-1.5 shadow-xl"
      role="menu"
      aria-label={t('Theme options')}
    >
      <button
        type="button"
        role="menuitem"
        onClick={onOpenInCode}
        className="flex h-8 w-full items-center rounded-md px-2.5 text-left text-caption font-medium text-fg-muted transition-colors hover:bg-white/45 hover:text-fg dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50"
      >
        {t('Open in code')}
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={onDelete}
        className="flex h-8 w-full items-center rounded-md px-2.5 text-left text-caption font-medium text-status-danger transition-colors hover:bg-status-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-status-danger/50"
      >
        {t('Delete')}
      </button>
    </motion.div>
  )
}

/**
 * Get code's left column — which theme the CSS / Markdown / Agent context
 * file is scoped to. Radio + All themes, not checkboxes: the header already
 * carries one scope string, and a multi-theme subset would be ambiguous.
 * Lists My themes (`themeOrder` minus the built-in light/dark scaffolding),
 * the same identity as the Themes library. Width is the workspace's 240px
 * groups column (`COLOR_RAIL_WIDTH`), not a fourth number.
 */
export default function ThemeCodeScopeRail({
  scope,
  previewTheme,
  onScopeChange,
  onPreviewThemeChange,
  onOpenThemeLibrary,
}: {
  scope: CodeThemeScope
  previewTheme: string
  onScopeChange: (scope: CodeThemeScope) => void
  onPreviewThemeChange: (theme: string) => void
  onOpenThemeLibrary: () => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const { themeOrder, themes, themeKinds, themeLabels, themeSources, removeTheme } = store
  const listed = myThemeKeys(themeOrder, themes)
  const [menuKey, setMenuKey] = useState<string | null>(null)
  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const menuRootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuKey) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRootRef.current?.contains(event.target as Node)) setMenuKey(null)
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuKey(null) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuKey])

  const selectTheme = (key: string) => {
    onScopeChange(key)
    if (key !== previewTheme) onPreviewThemeChange(key)
  }

  const deleteTheme = (key: string) => {
    const available = themeOrder.filter((theme) => themes[theme])
    const nextPreview = available.find((theme) => theme !== key)
    const nextOwn = listed.find((theme) => theme !== key)
    if (previewTheme === key && nextPreview) onPreviewThemeChange(nextPreview)
    if (scope === key) onScopeChange(nextOwn ?? CODE_SCOPE_ALL)
    removeTheme(key)
    setDeleteKey(null)
    setMenuKey(null)
  }

  const allSelected = scope === CODE_SCOPE_ALL || (scope !== CODE_SCOPE_ALL && !listed.includes(scope))

  return (
    <aside
      className="flex h-full min-h-0 flex-shrink-0 flex-col border-r border-line bg-nav"
      style={{ width: COLOR_RAIL_WIDTH }}
      aria-label={t('Themes')}
    >
      <div className="flex h-[52px] flex-shrink-0 items-center justify-between gap-2 border-b border-line pl-4 pr-3">
        <h2 className="min-w-0 truncate text-caption font-semibold text-fg-muted">{t('Themes')}</h2>
        <button
          type="button"
          onClick={onOpenThemeLibrary}
          aria-label={t('Themes library')}
          title={t('Themes library')}
          className="inline-flex flex-shrink-0 items-center gap-0.5 text-mini font-medium text-fg-faint transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          {t('All themes')}
          <ArrowIcon />
        </button>
      </div>

      <div ref={menuRootRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-2" role="radiogroup" aria-label={t('Themes')}>
        <button
          type="button"
          role="radio"
          aria-checked={allSelected}
          onClick={() => onScopeChange(CODE_SCOPE_ALL)}
          className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
            allSelected ? 'bg-app text-fg shadow-sm' : 'text-fg-muted hover:bg-white/45 hover:text-fg dark:hover:bg-white/[0.06]'
          }`}
        >
          <RadioMark selected={allSelected} />
          <span className={`min-w-0 flex-1 truncate text-body ${allSelected ? 'font-semibold text-fg' : 'font-medium'}`}>
            {t('All themes')}
          </span>
        </button>

        {listed.map((key) => {
          const selected = !allSelected && scope === key
          const ramp = themeBrandRamp(key, themeSources, themeKinds, store)
          const swatch = ramp?.[BASE_TONE] ?? store.primaryColor
          const name = themeDisplayName(key, themeLabels)
          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="group relative flex items-center gap-0.5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectTheme(key)}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                    selected ? 'bg-app text-fg shadow-sm' : 'text-fg-muted hover:bg-white/45 hover:text-fg dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <RadioMark selected={selected} />
                  <ThemeSwatch hex={swatch} />
                  <span className={`min-w-0 flex-1 truncate text-body ${selected ? 'font-semibold text-fg' : 'font-medium'}`}>
                    {name}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMenuKey((open) => (open === key ? null : key))}
                  aria-label={t('Theme options')}
                  title={t('Theme options')}
                  aria-haspopup="menu"
                  aria-expanded={menuKey === key}
                  className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-fg-faint transition-[color,background-color,opacity] hover:bg-white/45 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 dark:hover:bg-white/[0.06] ${
                    menuKey === key || selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                  } ${menuKey === key ? 'bg-white/45 text-fg dark:bg-white/[0.06]' : ''}`}
                >
                  <LibraryOptionsIcon />
                </button>
                <AnimatePresence>
                  {menuKey === key && (
                    <ThemeRowMenu
                      onOpenInCode={() => {
                        setMenuKey(null)
                        selectTheme(key)
                      }}
                      onDelete={() => {
                        setMenuKey(null)
                        setDeleteKey(key)
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence initial={false}>
                {deleteKey === key && (
                  <DeleteThemeConfirmation
                    name={name}
                    isPreviewed={previewTheme === key}
                    isLast={listed.length <= 1}
                    onCancel={() => setDeleteKey(null)}
                    onConfirm={() => deleteTheme(key)}
                  />
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
