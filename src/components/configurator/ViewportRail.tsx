import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react'
import type { GridFrameAlias, GridViewport } from '../../lib/layoutTokens'
import { useI18n } from '../../lib/i18n'
import { useNonProPlan } from '../../lib/access'
import { LockGlyph } from '../ui/icons'
import { UpgradeToProDialog } from './UpgradeToProNotice'
import { CHROME_CONTROL_SHELL, SEGMENT_ACTIVE_INK, SEGMENT_INACTIVE } from './themeWorkspaceLayout'
import { SegmentHighlight } from '../ui/SegmentHighlight'
import { useDesignStore } from '../../store/useDesignStore'
import { PLATFORM_LABELS, shipsNative, type Platform } from '../../lib/platformAxis'

export type PreviewViewportContextValue = {
  previewViewport: GridViewport
  previewTheme: string
  setPreviewViewport: (viewport: GridViewport) => void
  /** The second axis — web · ios · android. Only meaningful when the system
   *  ships a native target; everything resolves as `web` otherwise. */
  previewPlatform: Platform
  setPreviewPlatform: (platform: Platform) => void
  onOpenTypeRole: (key: string) => void
  onOpenGridField: (key: keyof GridFrameAlias) => void
}

const PreviewViewportContext = createContext<PreviewViewportContextValue | null>(null)

export function PreviewViewportProvider({
  value,
  children,
}: {
  value: PreviewViewportContextValue
  children: ReactNode
}) {
  return <PreviewViewportContext.Provider value={value}>{children}</PreviewViewportContext.Provider>
}

export function usePreviewViewport() {
  return useContext(PreviewViewportContext)
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
/** Every viewport is open on every plan: Free ships Desktop, Tablet and Mobile
 *  too. The lock props stay on `ViewportSwitch` for a plan that ever limits one. */
export function usePlanViewportLock(
  _value: GridViewport,
  _onChange: (platform: GridViewport) => void,
) {
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  return {
    lockedIds: [] as readonly GridViewport[],
    onLocked: () => setUpgradeOpen(true),
    dialog: <UpgradeToProDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />,
  }
}

export function ViewportSwitch({
  value,
  onChange,
  layout = 'compact',
  lockedIds = [],
  onLocked,
}: {
  value: GridViewport
  onChange: (platform: GridViewport) => void
  layout?: 'compact' | 'fill'
  lockedIds?: readonly GridViewport[]
  onLocked?: (id: GridViewport) => void
}) {
  const { t } = useI18n()
  const group = useId()
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
      aria-label={t('Viewport')}
      title={t('Choose which platform Type, Grid and the preview resolve against.')}
    >
      {options.map(({ id, label, Icon }) => {
        const on = value === id
        const locked = lockedIds.includes(id)
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            aria-label={locked ? `${label} — ${t('Upgrade to Pro')}` : label}
            title={locked ? t('Upgrade to Pro') : label}
            onClick={() => (locked ? onLocked?.(id) : onChange(id))}
            className={`relative flex h-7 items-center justify-center rounded-md transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
              fill ? 'min-w-0 flex-1' : 'w-7'
            } ${
              locked ? 'text-fg-faint' : on ? SEGMENT_ACTIVE_INK : SEGMENT_INACTIVE
            }`}
          >
            {!locked && on && <SegmentHighlight group={group} />}
            <span className="relative flex">{locked ? <LockGlyph size={12} /> : <Icon />}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Web · iOS · Android. Text segments, not glyphs: three OS names read
 *  faster than three logos. Rendered only when the system ships a native
 *  target (File & modes → Platforms), so a web system never sees it. */
export function PlatformSwitch({
  value,
  onChange,
  shipped,
  layout = 'compact',
}: {
  value: Platform
  onChange: (platform: Platform) => void
  shipped: readonly Platform[]
  layout?: 'compact' | 'fill'
}) {
  const { t } = useI18n()
  const group = useId()
  const fill = layout === 'fill'
  return (
    <div
      className={`flex h-8 items-center rounded-lg p-0.5 ${CHROME_CONTROL_SHELL} ${fill ? 'w-full' : 'flex-shrink-0'}`}
      role="group"
      aria-label={t('Platform')}
      title={t('Choose which platform body type, touch target and control radii resolve against.')}
    >
      {shipped.map((id) => {
        const on = value === id
        const label = PLATFORM_LABELS[id]
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            aria-label={label}
            title={label}
            onClick={() => onChange(id)}
            className={`relative flex h-7 items-center justify-center rounded-md px-1.5 text-caption font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
              fill ? 'min-w-0 flex-1' : 'min-w-7'
            } ${on ? SEGMENT_ACTIVE_INK : SEGMENT_INACTIVE}`}
          >
            {on && <SegmentHighlight group={group} />}
            <span className="relative">{fill ? label : label.slice(0, 1)}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Viewport cut, plus the platform cut when the system ships one — the
 *  table and preview already show that recipe's values. */
export function ViewportRail({
  collapsed,
}: {
  collapsed: boolean
  /** @deprecated Ignored — guides were noise beside the live table. */
  guide?: 'type' | 'grid' | 'spacing'
}) {
  const ctx = usePreviewViewport()
  const { t } = useI18n()
  if (!ctx) return null

  const { previewViewport, setPreviewViewport, previewPlatform, setPreviewPlatform } = ctx
  const { lockedIds, onLocked, dialog } = usePlanViewportLock(previewViewport, setPreviewViewport)
  const platformAxis = useDesignStore((st) => st.platformAxis)
  const native = shipsNative(platformAxis)

  return (
    <section
      aria-labelledby={collapsed ? undefined : 'variable-platform-heading'}
      className={collapsed ? 'pb-2' : 'pb-3'}
    >
      {!collapsed && (
        <h2 id="variable-platform-heading" className="px-1 pb-2 text-ui font-semibold text-fg">
          {t('Viewport')}
        </h2>
      )}
      <div className={collapsed ? 'flex justify-center' : undefined}>
        <ViewportSwitch
          value={previewViewport}
          onChange={setPreviewViewport}
          layout={collapsed ? 'compact' : 'fill'}
          lockedIds={lockedIds}
          onLocked={onLocked}
        />
      </div>
      {native && (
        <>
          {!collapsed && (
            <h2 className="px-1 pb-2 pt-3 text-ui font-semibold text-fg">{t('Platform')}</h2>
          )}
          <div className={collapsed ? 'flex justify-center pt-2' : undefined}>
            <PlatformSwitch
              value={previewPlatform}
              onChange={setPreviewPlatform}
              shipped={platformAxis.shipped}
              layout={collapsed ? 'compact' : 'fill'}
            />
          </div>
        </>
      )}
      {dialog}
    </section>
  )
}
