import { type ReactNode } from 'react'
import { fontFamilyOf, panelStyle } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'

// Live specimen for the **Surface / Action / Status** semantic categories — each
// fill token as a labeled swatch, grouped (surfaces · brand · action · status).
// Reads values live so edits in the table repaint the swatches.
export function BackgroundSpecimenPreview({ tokens }: { tokens: PreviewTokens }) {
  const sem = tokens.semanticMap ?? {}
  const v = (k: string, fb: string) => sem[k] || fb
  const fontFamily = fontFamilyOf(tokens)
  const border = tokens.border || '#eaecf0'
  const muted = tokens.fgMuted || '#717680'

  // Panel-background tokens (surface-1: cards, panels, sections) render on a
  // checkerboard when translucent, so the alpha is legible — same convention
  // as a color picker's alpha swatch.
  function Swatch({ token, fb, isPanel = false }: { token: string; fb: string; isPanel?: boolean }) {
    const hex = v(token, fb)
    const translucent = isPanel && tokens.panelBackground === 'translucent'
    return (
      <div className="flex flex-col gap-1.5" style={{ width: 92 }}>
        <div
          style={{
            height: 46, borderRadius: 10, border: `1px solid ${border}`, position: 'relative', overflow: 'hidden',
            backgroundImage: translucent
              ? 'conic-gradient(#00000018 25%, transparent 0 50%, #00000018 0 75%, transparent 0)'
              : undefined,
            backgroundSize: '10px 10px',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, ...(isPanel ? panelStyle(tokens, hex) : { background: hex }) }} />
        </div>
        <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted }} className="truncate" title={token}>
          {token}{translucent && ' · alpha'}
        </code>
      </div>
    )
  }

  function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
      <div className="flex flex-col gap-2">
        <span style={{ fontSize: 10, letterSpacing: '0.08em', color: muted }} className="uppercase">{title}</span>
        <div className="flex flex-wrap gap-2.5">{children}</div>
      </div>
    )
  }

  return (
    <div
      style={{ background: tokens.surface, border: `1px solid ${border}`, borderRadius: 14, fontFamily }}
      className="p-5 flex flex-col gap-5"
    >
      <Section title="Surfaces">
        <Swatch token="surface-0" fb="#ffffff" />
        <Swatch token="surface-1" fb="#fafafa" isPanel />
        <Swatch token="surface-2" fb="#f5f5f5" />
        <Swatch token="surface-3" fb="#e9eaeb" />
      </Section>
      <Section title="Brand">
        <Swatch token="surface-brand-subtle" fb="#f4f3ff" />
        <Swatch token="surface-brand-muted" fb="#ebe9fe" />
        <Swatch token="surface-brand-strong" fb={tokens.brandSolid} />
      </Section>
      <Section title="Action">
        <Swatch token="action-primary" fb={tokens.brandSolid} />
        <Swatch token="action-disabled" fb="#f5f5f5" />
      </Section>
      <Section title="Status">
        <Swatch token="status-error-subtle" fb="#fef3f2" />
        <Swatch token="status-error" fb="#d92d20" />
        <Swatch token="status-warning-subtle" fb="#fffaeb" />
        <Swatch token="status-success-subtle" fb="#ecfdf3" />
        <Swatch token="status-info-subtle" fb="#eff8ff" />
      </Section>
    </div>
  )
}
