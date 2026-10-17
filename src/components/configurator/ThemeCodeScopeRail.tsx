import type { KeyboardEvent } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { themeDisplayName } from '../../lib/themeSources'
import { useI18n } from '../../lib/i18n'
import { COLOR_RAIL_WIDTH } from './colorControls'
import { WORKSPACE_CHROME } from './themeWorkspaceLayout'
import { myThemeKeys } from './ThemeLibraryRail'
import { InspectorPortal } from './WorkspaceInspector'
import { UnsavedNotice } from './ThemeSaveBar'
import { useAccess } from '../../lib/access'

export type CodeFormatKey = 'agent' | 'css'

/** Existing product marks, masked so they follow the row's ink. */
const FORMAT_ICON: Record<CodeFormatKey, string> = {
  agent: '/icons/settings/mcp.svg',
  css: '/icons/theme-hub-icons/Icon/code.svg',
}

export function FormatGlyph({ format }: { format: CodeFormatKey }) {
  return (
    <span
      aria-hidden
      className="block h-3.5 w-3.5 flex-shrink-0 bg-current"
      style={{
        WebkitMask: `url('${FORMAT_ICON[format]}') center / contain no-repeat`,
        mask: `url('${FORMAT_ICON[format]}') center / contain no-repeat`,
      }}
    />
  )
}

export type CodeThemeScope = string

/** One My-theme key, or '' when the library is empty. Get code never
 *  ships an All-themes file — foundations and behaviour stay exact. */
export function resolveCodeTheme(listed: string[], scope: string, previewTheme: string): string {
  if (listed.includes(scope)) return scope
  if (listed.includes(previewTheme)) return previewTheme
  return listed[0] ?? ''
}

/**
 * Get code's inspector. The brand switcher already picks which brand is
 * open, so this column does not list the others — only the path of the
 * current one, then the file format under it.
 */
export default function ThemeCodeScopeRail({
  scope,
  previewTheme,
  formats,
  format,
  onFormat,
}: {
  scope: CodeThemeScope
  previewTheme: string
  formats: { key: CodeFormatKey; label: string }[]
  format: CodeFormatKey
  onFormat: (format: CodeFormatKey) => void
  /** Kept for callers; the workspace switcher owns which brand is open. */
  onScopeChange?: (scope: CodeThemeScope) => void
  onPreviewThemeChange?: (theme: string) => void
  onBack?: () => void
}) {
  const { t } = useI18n()
  const { guest } = useAccess()
  const store = useDesignStore()
  const listed = myThemeKeys(store.themeOrder, store.themes)
  const selected = resolveCodeTheme(listed, scope, previewTheme)
  const name = selected ? themeDisplayName(selected, store.themeLabels) : ''

  const onTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown'
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
    if (!vertical && !horizontal) return
    event.preventDefault()
    const current = Math.max(0, formats.findIndex((item) => item.key === format))
    const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight'
    const next = (current + (forward ? 1 : formats.length - 1)) % formats.length
    onFormat(formats[next].key)
    const tabs = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    requestAnimationFrame(() => tabs[next]?.focus())
  }

  return (
    <InspectorPortal>
    <aside
      className={`flex h-full min-h-0 flex-shrink-0 flex-col overflow-y-auto border-r border-line ${WORKSPACE_CHROME}`}
      style={{ width: COLOR_RAIL_WIDTH }}
      aria-label={t('Get code')}
    >
      <div className={`sticky top-0 z-20 flex h-[52px] flex-shrink-0 items-center border-b border-line px-3 ${WORKSPACE_CHROME}`}>
        {name ? (
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-caption">
            <span className="flex-shrink-0 text-fg-muted">{t('Brand')}</span>
            <span aria-hidden className="flex-shrink-0 text-fg-muted">/</span>
            <span className="min-w-0 truncate font-semibold text-fg">{name}</span>
          </nav>
        ) : (
          <span className="min-w-0 truncate text-caption text-fg-faint">{t('Add a brand to get its code.')}</span>
        )}
      </div>

      <div className="flex flex-col gap-3 px-3 py-3">
        <div
          className="flex flex-col gap-0.5"
          role="tablist"
          aria-orientation="vertical"
          aria-label="Code format"
          onKeyDown={onTabListKeyDown}
        >
          {formats.map((item) => {
            const selectedFormat = item.key === format
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={selectedFormat}
                tabIndex={selectedFormat ? 0 : -1}
                onClick={() => onFormat(item.key)}
                className={`flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                  selectedFormat ? 'bg-elevated font-semibold text-fg shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                }`}
              >
                <FormatGlyph format={item.key} />
                {item.label}
              </button>
            )
          })}
        </div>

      </div>
      {/* Code is where a guest takes the system away: say it is not saved,
          pinned at the foot like the save bar on the editing tabs. */}
      {guest && name ? (
        <div className="mt-auto flex-shrink-0 px-3 pb-3">
          <UnsavedNotice />
        </div>
      ) : null}
    </aside>
    </InspectorPortal>
  )
}
