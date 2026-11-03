import { useContext, type ReactNode } from 'react'
import { FigmaGlyph } from '../ui/icons'
import { useDesignStore } from '../../store/useDesignStore'
import { themeDisplayName } from '../../lib/themeSources'
import { useI18n } from '../../lib/i18n'
import { COLOR_RAIL_WIDTH } from './colorControls'
import { WORKSPACE_CHROME } from './themeWorkspaceLayout'
import { myThemeKeys } from './ThemeLibraryRail'
import { InspectorPortal } from './WorkspaceInspector'
import ThemeSaveBar, { ShipRow, UnsavedNotice, WorkspaceFooterContext } from './ThemeSaveBar'
import { useAccess } from '../../lib/access'
import { CodeHowToButton } from './CodeHowTo'

export type CodeFormatKey = 'css' | 'figma' | 'agent'

/** Existing product marks, masked so they follow the row's ink. */
const FORMAT_ICON: Record<Exclude<CodeFormatKey, 'figma'>, string> = {
  agent: '/icons/settings/mcp.svg',
  css: '/icons/theme-hub-icons/Icon/code.svg',
}

export function FormatGlyph({ format }: { format: CodeFormatKey }) {
  if (format === 'figma') return <FigmaGlyph size={12} />
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
 * current one, then ONE switch for the file: the CSS · Figma · Agent doors
 * every inspector footer shows. Here they do not open a panel: the file is
 * already the centre of the page, so the door on screen stays pressed and
 * its filters sit right under it. (It used to be the doors AND an accordion
 * of the same formats AND a ship panel over both — three switches for one
 * choice.)
 */
export default function ThemeCodeScopeRail({
  scope,
  previewTheme,
  format,
  onFormat,
  settings,
}: {
  /** The open format's filters (scope, theme, brands / detail / modes). */
  settings?: ReactNode
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
  const shellFooter = useContext(WorkspaceFooterContext)
  const store = useDesignStore()
  const listed = myThemeKeys(store.themeOrder, store.themes)
  const selected = resolveCodeTheme(listed, scope, previewTheme)
  const name = selected ? themeDisplayName(selected, store.themeLabels) : ''
  // The footer's doors, re-pointed at this page's own switch. GitHub keeps its
  // own action: a push is a place, not a file to look at.
  const ship = shellFooter
    ? { ...shellFooter.ship, css: () => onFormat('css'), figma: () => onFormat('figma'), agent: () => onFormat('agent') }
    : null

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

      {selected ? (
        <section aria-label={t('Code format')} className="flex-shrink-0 border-b border-line p-[var(--inspector-inset)]">
          {ship ? (
            <ShipRow ship={ship} active={format} />
          ) : (
            // No shell footer (a standalone page): the same three doors,
            // without GitHub.
            <ShipRow
              ship={{ css: () => onFormat('css'), figma: () => onFormat('figma'), agent: () => onFormat('agent') }}
              active={format}
            />
          )}
          {/* What goes into the file on screen. Not the format's name again —
              the pressed door already says it; the ? opens how to use it. */}
          <div className="mt-4 flex h-6 items-center gap-1.5">
            <h3 className="min-w-0 truncate text-ui font-medium text-fg">{t('Filters')}</h3>
            <CodeHowToButton kind={format} iconOnly />
          </div>
          {settings ? <div className="mt-2.5 flex flex-col gap-2">{settings}</div> : null}
        </section>
      ) : null}

      {/* Where the work lives + Save, pinned at the foot like every Generator
          inspector (the doors sit at the top here). Without the shell's footer,
          the guest notice. */}
      {shellFooter ? (
        <div className="mt-auto flex-shrink-0">
          <ThemeSaveBar statusOnly />
        </div>
      ) : guest && name ? (
        <div className="mt-auto flex-shrink-0 px-3 pb-3">
          <UnsavedNotice />
        </div>
      ) : null}
    </aside>
    </InspectorPortal>
  )
}
