import { createContext, useContext, type ReactNode } from 'react'
import type { GridFrameAlias, GridViewport } from '../../lib/layoutTokens'
import { useI18n } from '../../lib/i18n'
import { CHROME_CONTROL_HOVER, CHROME_CONTROL_SHELL } from './themeWorkspaceLayout'

export type PreviewPlatformContextValue = {
  previewPlatform: GridViewport
  previewTheme: string
  setPreviewPlatform: (platform: GridViewport) => void
  onOpenTypeRole: (key: string) => void
  onOpenGridField: (key: keyof GridFrameAlias) => void
}

const PreviewPlatformContext = createContext<PreviewPlatformContextValue | null>(null)

export function PreviewPlatformProvider({
  value,
  children,
}: {
  value: PreviewPlatformContextValue
  children: ReactNode
}) {
  return <PreviewPlatformContext.Provider value={value}>{children}</PreviewPlatformContext.Provider>
}

export function usePreviewPlatform() {
  return useContext(PreviewPlatformContext)
}

function DesktopGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="1.75" y="2.5" width="12.5" height="8.5" rx="1.4" />
      <path d="M5 13.25h6M8 11v2.25" />
    </svg>
  )
}

function MobileGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4.25" y="1.75" width="7.5" height="12.5" rx="1.5" />
      <path d="M7.25 12.25h1.5" />
    </svg>
  )
}

function TabletGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="1.75" width="10" height="12.5" rx="1.5" />
      <path d="M7.25 12.25h1.5" />
    </svg>
  )
}

/** Workspace platform — desktop / tablet / mobile. Session-only, same job as Light/Dark
 *  for appearance: Type, Grid and the live preview resolve against this cut. */
export function PlatformSwitch({
  value,
  onChange,
  layout = 'compact',
}: {
  value: GridViewport
  onChange: (platform: GridViewport) => void
  layout?: 'compact' | 'fill'
}) {
  const { t } = useI18n()
  const options: { id: GridViewport; label: string; Icon: typeof DesktopGlyph }[] = [
    { id: 'desktop', label: t('Desktop'), Icon: DesktopGlyph },
    { id: 'tablet', label: t('Tablet'), Icon: TabletGlyph },
    { id: 'mobile', label: t('Mobile'), Icon: MobileGlyph },
  ]
  const fill = layout === 'fill'
  return (
    <div
      className={`flex h-8 items-center rounded-lg p-0.5 ${CHROME_CONTROL_SHELL} ${fill ? 'w-full' : 'flex-shrink-0'}`}
      role="group"
      aria-label={t('Platform')}
      title={t('Choose which platform Type, Grid and the preview resolve against.')}
    >
      {options.map(({ id, label, Icon }) => {
        const on = value === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            aria-label={label}
            title={label}
            onClick={() => onChange(id)}
            className={`flex h-7 items-center justify-center rounded-md transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
              fill ? 'min-w-0 flex-1' : 'w-7'
            } ${
              on
                ? 'bg-app text-fg shadow-[0_1px_3px_rgba(0,0,0,0.22)] ring-1 ring-line-strong'
                : `text-fg-faint ${CHROME_CONTROL_HOVER}`
            }`}
          >
            <Icon />
            {/* Icon only, the name rides in `title` / `aria-label`. At the
                rail's width "Desktop" truncated to "Deskt…" beside two
                full words, which read as broken rather than compact. */}
          </button>
        )
      })}
    </div>
  )
}

/** Platform cut only — the table and preview already show that recipe's values. */
export function PlatformRail({
  collapsed,
}: {
  collapsed: boolean
  /** @deprecated Ignored — guides were noise beside the live table. */
  guide?: 'type' | 'grid' | 'spacing'
}) {
  const ctx = usePreviewPlatform()
  const { t } = useI18n()
  if (!ctx) return null

  const { previewPlatform, setPreviewPlatform } = ctx

  return (
    <section
      aria-labelledby={collapsed ? undefined : 'variable-platform-heading'}
      className={collapsed ? 'pb-2' : 'pb-3'}
    >
      {!collapsed && (
        <h2 id="variable-platform-heading" className="px-1 pb-2 text-ui font-semibold text-fg">
          {t('Platform')}
        </h2>
      )}
      <div className={collapsed ? 'flex justify-center' : undefined}>
        <PlatformSwitch
          value={previewPlatform}
          onChange={setPreviewPlatform}
          layout={collapsed ? 'compact' : 'fill'}
        />
      </div>
    </section>
  )
}
