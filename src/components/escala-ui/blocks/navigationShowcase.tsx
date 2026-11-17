// The Figma prototypes of the navigation blocks, as code: what each `screen` of HeaderNavigation · Prototype (1063:2193)
// and SidebarNavigation · Prototype (1065:872) holds, inside the DesktopWindow (1440) or the PhoneFrame (iPhone 18 Pro).
// Storybook's Overview stories and the platform's Blocks stage both draw these, so the two show the same thing.
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
import { IconButton } from '../icon-button'
import { DesktopWindow, PhoneFrame } from './frames'
import { AppHeader, AppHeaderExtended, DualSidebar, FloatingHeader, type FloatingNav, type NavLayout } from './navigation'
import { boxedGlyph } from './shared'

const v = (ref: string) => `var(${cssVarOf(ref)})`

export const HEADER_SHOWCASES = ['AppHeader', 'AppHeaderExtended', 'FloatingHeader'] as const
export type HeaderShowcase = (typeof HEADER_SHOWCASES)[number]

/** One header prototype in its frame: Header 01 (AppHeader), 02 (AppHeaderExtended), 04 / 05 (FloatingHeader with the
 *  icon or the link nav). The page under it is Surface/layer-1; a floating header sits Spacing/inset-page from the top
 *  on desktop and Spacing/gap-control inside the phone. */
export function HeaderMockup({ block, layout, nav = 'links' }: { block: HeaderShowcase; layout: NavLayout; nav?: FloatingNav }) {
  const floating = block === 'FloatingHeader'
  const header = block === 'AppHeader' ? <AppHeader layout={layout} />
    : block === 'AppHeaderExtended' ? <AppHeaderExtended layout={layout} />
    : <FloatingHeader layout={layout} nav={nav} />
  const screen: React.CSSProperties = {
    flexDirection: 'column', alignItems: floating ? 'center' : 'stretch', background: v('color.surface.layer-1'),
    padding: floating ? (layout === 'desktop' ? `${v('spacing.inset-page')} 0 0` : v('spacing.gap-control')) : undefined,
  }
  const label = `${block}${floating ? ` (${nav === 'icons' ? 'icon nav' : 'link nav'})` : ''} in a ${layout === 'desktop' ? '1440 desktop window' : 'phone'}`
  return layout === 'desktop'
    ? <DesktopWindow label={label} screen={screen}>{header}</DesktopWindow>
    : <PhoneFrame label={label} screen={screen}>{header}</PhoneFrame>
}

/** The SidebarNavigation prototype: DualSidebar beside the main area (desktop) — the main area's SidebarSimple toggle
 *  shows and hides the panel (aria-expanded / aria-controls) — or the DualSidebar as a drawer over the Surface/overlay
 *  scrim (mobile). `expanded` is the starting state; the toggle owns it after that. */
export function SidebarMockup({ layout, expanded = true }: { layout: NavLayout; expanded?: boolean }) {
  const [open, setOpen] = React.useState(expanded)
  React.useEffect(() => setOpen(expanded), [expanded])
  if (layout === 'mobile') {
    return (
      <PhoneFrame label="DualSidebar as a drawer in a phone" scrim screen={{ flexDirection: 'row' }}>
        <DualSidebar style={{ height: 'calc(100% - var(--spacing-5))', minHeight: 0 }} />
      </PhoneFrame>
    )
  }
  return (
    <DesktopWindow label={`DualSidebar ${open ? 'expanded' : 'collapsed'} in a 1440 desktop window`} screen={{ background: v('color.surface.page') }}>
      <DualSidebar panelVisible={open} style={{ minHeight: 0 }} />
      <div data-part="main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: v('spacing.gap-control') }}>
        <div data-part="content" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: v('spacing.gap-control'), background: v('color.surface.layer-1'), border: `${v('stroke.divider')} solid ${v('color.border.subtle')}`, borderRadius: v('radius.container') }}>
          <IconButton
            size="sm" variant="secondary" appearance="outline" icon={boxedGlyph('sidebar-simple', 'icon.small')}
            aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'} aria-expanded={open} aria-controls="dual-sidebar-panel"
            onClick={() => setOpen((o) => !o)}
          />
        </div>
      </div>
    </DesktopWindow>
  )
}
