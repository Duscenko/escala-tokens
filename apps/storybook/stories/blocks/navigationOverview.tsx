// The Overview of a navigation block, laid out like its Figma prototype page: "Desktop · Light", "Desktop · Dark" and
// "Mobile" rows, each mockup painted in its OWN Color Semantics mode (and the phone in Dimension Semantics Mobile), so
// the page shows Light and Dark side by side whatever the toolbar says. A 1440 window scales down to its column.
import type { ReactNode } from 'react'
import { RecipeScope } from '../../../../src/components/configurator/docs/skeleton/scope'
import { MockupFit, DESKTOP_FRAME, PHONE_FRAME } from '../../../../src/components/escala-ui/blocks/frames'
import { resolvePreviewTokens } from '../../../../src/lib/previewTokens'
import type { GridViewport } from '../../../../src/lib/layoutTokens'
import { useDesignStore } from '../../../../src/store/useDesignStore'
import { BRAND } from '../../.storybook/escalaSystem'

type Appearance = 'light' | 'dark'

/** One mode's tokens around a mockup, with no paint of its own (the frame paints itself). */
export function Themed({ appearance, viewport, children }: { appearance: Appearance; viewport: GridViewport; children: ReactNode }) {
  const t = resolvePreviewTokens(useDesignStore.getState(), BRAND, appearance, viewport)
  return <div className={appearance}><RecipeScope t={t}>{children}</RecipeScope></div>
}

const rowTitle = { margin: '0 0 16px', font: '600 18px/1.3 Inter, system-ui, sans-serif', color: 'var(--color-content-secondary)' } as const

function Row({ title, columns, children }: { title: string; columns: number; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column' }}>
      <h3 style={rowTitle}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 40, alignItems: 'start' }}>{children}</div>
    </section>
  )
}

/** `desktop(appearance)` returns the desktop mockups of one mode (one or two: the sidebar shows expanded + collapsed,
 *  the floating header link + icon nav); `mobile` the phone, drawn once per mode. */
export function NavigationOverview({ desktop, mobile }: { desktop: () => ReactNode[]; mobile: () => ReactNode }) {
  const desk = (a: Appearance) => desktop().map((m, i) => (
    <Themed key={i} appearance={a} viewport="desktop"><MockupFit width={DESKTOP_FRAME.width}>{m}</MockupFit></Themed>
  ))
  const columns = desktop().length
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 56, maxWidth: 1600 }}>
      <Row title="Desktop · Light" columns={columns}>{desk('light')}</Row>
      <Row title="Desktop · Dark" columns={columns}>{desk('dark')}</Row>
      <section>
        <h3 style={rowTitle}>Mobile</h3>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          {(['light', 'dark'] as const).map((a) => (
            <Themed key={a} appearance={a} viewport="mobile"><div style={{ width: PHONE_FRAME.width + 3 }}>{mobile()}</div></Themed>
          ))}
        </div>
      </section>
    </div>
  )
}

/** A Playground mockup: the window (scaled to fit) or the phone, in the toolbar's modes (the phone always Mobile). */
export function PlaygroundMockup({ layout, children }: { layout: 'desktop' | 'mobile'; children: ReactNode }) {
  return layout === 'desktop'
    ? <MockupFit width={DESKTOP_FRAME.width}>{children}</MockupFit>
    : <div style={{ width: PHONE_FRAME.width + 3 }}>{children}</div>
}
