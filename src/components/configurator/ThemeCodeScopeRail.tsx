import type { ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Chevron, EditionBody } from './ThemeQuickSettingsRail'
import { useDesignStore } from '../../store/useDesignStore'
import { themeDisplayName } from '../../lib/themeSources'
import { useI18n } from '../../lib/i18n'
import { COLOR_RAIL_WIDTH } from './colorControls'
import { WORKSPACE_CHROME } from './themeWorkspaceLayout'
import { myThemeKeys } from './ThemeLibraryRail'
import { InspectorPortal } from './WorkspaceInspector'
import { UnsavedNotice } from './ThemeSaveBar'
import { useAccess } from '../../lib/access'
import { CodeHowToButton } from './CodeHowTo'

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
  settings,
  summaries,
}: {
  /** The open format's settings (scope, theme, brands / detail), unfolded
   *  under its row — so the file header above the code holds only the file
   *  and Copy. */
  settings?: ReactNode
  /** What each closed row carries now ("Radius · Dark"), like a Board row. */
  summaries?: Partial<Record<CodeFormatKey, ReactNode>>
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

  return (
    <InspectorPortal>
    <aside
      className={`flex h-full min-h-0 flex-shrink-0 flex-col overflow-y-auto border-r border-line ${WORKSPACE_CHROME}`}
      style={{ width: COLOR_RAIL_WIDTH }}
      aria-label={t('Get code')}
    >
      <div className={`sticky top-0 z-20 flex h-[52px] flex-shrink-0 items-center border-b border-line px-[var(--inspector-inset)] ${WORKSPACE_CHROME}`}>
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

      {/* The Board's edition accordion, one row per file: name · what it
          carries now · chevron. The open row IS the format on screen, and its
          settings unfold under it — never under the other row. */}
      <div role="group" aria-label="Code format">
        {formats.map((item) => {
          const open = item.key === format
          const panelId = `code-format-${item.key}`
          return (
            <section key={item.key} aria-label={item.label} className="min-w-0 overflow-visible border-b border-line">
              {/* Each format's title carries a ? that opens how to use that
                  file. It sits beside the title, outside the row's own button
                  (a button can't hold another), so a closed row is two parts:
                  the title, then the rest of the row; both open the format. */}
              {open ? (
                <div className="flex h-12 w-full items-center gap-1.5 px-[var(--inspector-inset)]" aria-expanded aria-controls={panelId}>
                  <span className="min-w-0 truncate text-left text-strong font-medium text-fg">{item.label}</span>
                  {selected ? <CodeHowToButton kind={item.key} iconOnly /> : null}
                  <span className="flex-1" />
                  <Chevron open />
                </div>
              ) : (
                <div className="group/row flex h-12 w-full items-center gap-1.5 px-[var(--inspector-inset)]">
                  <button
                    type="button"
                    aria-expanded={false}
                    aria-controls={panelId}
                    onClick={() => onFormat(item.key)}
                    className="min-w-0 truncate text-left text-ui text-fg-muted transition-colors group-hover/row:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 rounded-sm"
                  >
                    {item.label}
                  </button>
                  {selected ? <CodeHowToButton kind={item.key} iconOnly /> : null}
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden
                    onClick={() => onFormat(item.key)}
                    className="flex h-full min-w-0 flex-1 items-center justify-end gap-3"
                  >
                    {summaries?.[item.key] != null && (
                      <span className="min-w-0 max-w-[80%] truncate text-caption text-fg-faint">{summaries[item.key]}</span>
                    )}
                    <Chevron open={false} />
                  </button>
                </div>
              )}
              <AnimatePresence initial={false}>
                {open && settings ? (
                  <EditionBody id={panelId} key="body">
                    <div className="flex flex-col gap-2 px-[var(--inspector-inset)] pb-[var(--inspector-inset)]">
                      {settings}
                    </div>
                  </EditionBody>
                ) : null}
              </AnimatePresence>
            </section>
          )
        })}
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
