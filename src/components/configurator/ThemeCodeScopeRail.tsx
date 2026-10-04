import { useDesignStore } from '../../store/useDesignStore'
import { themeBrandRamp, themeDisplayName } from '../../lib/themeSources'
import { useI18n } from '../../lib/i18n'
import { COLOR_RAIL_WIDTH } from './colorControls'
import { WORKSPACE_CHROME } from './themeWorkspaceLayout'
import { ThemeAvatar, myThemeKeys } from './ThemeLibraryRail'

export type CodeThemeScope = string

/** One My-theme key, or '' when the library is empty. Get code never
 *  ships an All-themes file — foundations and behaviour stay exact. */
export function resolveCodeTheme(listed: string[], scope: string, previewTheme: string): string {
  if (listed.includes(scope)) return scope
  if (listed.includes(previewTheme)) return previewTheme
  return listed[0] ?? ''
}

/**
 * Get code's left column — which ONE theme the CSS / Markdown / Agent
 * context file is scoped to. Radio only, no All themes: a mixed file
 * would blur foundations and behaviour. Lists My themes (`themeOrder`
 * minus the built-in light/dark scaffolding), the same identity as the
 * Themes library. Width is the workspace's 240px groups column
 * (`COLOR_RAIL_WIDTH`), not a fourth number.
 */
export default function ThemeCodeScopeRail({
  scope,
  previewTheme,
  onScopeChange,
  onPreviewThemeChange,
}: {
  scope: CodeThemeScope
  previewTheme: string
  onScopeChange: (scope: CodeThemeScope) => void
  onPreviewThemeChange: (theme: string) => void
  /** Kept for callers; the rail no longer draws a Back link — the workspace
   *  tabs above it are the way out. */
  onBack?: () => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const { themeOrder, themes, themeKinds, themeLabels, themeSources } = store
  const listed = myThemeKeys(themeOrder, themes)
  const selected = resolveCodeTheme(listed, scope, previewTheme)

  const selectTheme = (key: string) => {
    onScopeChange(key)
    if (key !== previewTheme) onPreviewThemeChange(key)
  }

  return (
    <aside
      className={`flex h-full min-h-0 flex-shrink-0 flex-col overflow-y-auto border-r border-line ${WORKSPACE_CHROME}`}
      style={{ width: COLOR_RAIL_WIDTH }}
      aria-label={t('Themes')}
    >
      {/* Same header band, section heading and row treatment as the
          Variables rail (`FoundationWorkbench` + `VariableCollectionRail` +
          `RailGroupNav`), so this column reads as the same kind of column. */}
      <div className={`sticky top-0 z-20 flex h-[52px] flex-shrink-0 items-center border-b border-line pl-3 pr-2 ${WORKSPACE_CHROME}`}>
        <span className="min-w-0 truncate text-ui font-semibold text-fg">{t('Get code')}</span>
      </div>

      <div className="px-3 py-3">
        <section aria-labelledby="code-themes-heading">
          <h2 id="code-themes-heading" className="flex items-baseline justify-between px-1 pb-2 text-ui font-semibold text-fg">
            <span>{t('Themes')}</span>
            <span className="text-caption font-mono font-normal tabular-nums text-fg-faint">{listed.length}</span>
          </h2>
          {listed.length === 0 ? (
            <p className="px-1 py-2 text-caption text-fg-faint">{t('Add a theme to get its code.')}</p>
          ) : (
            <div className="flex flex-col gap-0.5" role="radiogroup" aria-labelledby="code-themes-heading">
              {listed.map((key) => {
                const isSelected = selected === key
                const name = themeDisplayName(key, themeLabels)
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => selectTheme(key)}
                    className={`flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                      isSelected ? 'bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                    }`}
                  >
                    <ThemeAvatar
                      ramp={themeBrandRamp(key, themeSources, themeKinds, store)}
                      appearance={themeKinds[key] ?? 'light'}
                      fallback={store.primaryColor}
                    />
                    <span className={`min-w-0 flex-1 truncate text-ui ${isSelected ? 'font-semibold' : ''}`}>{name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </aside>
  )
}
