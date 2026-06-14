import { type ReactNode } from 'react'
import { fontFamilyOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'

// Live specimen for the **Background** semantic category — each `bg-*` token as a
// labeled fill swatch, grouped (surfaces · brand · feedback · disabled). Reads
// values live so edits in the table repaint the swatches.
export function BackgroundSpecimenPreview({ tokens }: { tokens: PreviewTokens }) {
  const sem = tokens.semanticMap ?? {}
  const v = (k: string, fb: string) => sem[k] || fb
  const fontFamily = fontFamilyOf(tokens)
  const border = tokens.border || '#eaecf0'
  const muted = tokens.fgMuted || '#717680'

  function Swatch({ token, fb }: { token: string; fb: string }) {
    return (
      <div className="flex flex-col gap-1.5" style={{ width: 92 }}>
        <div style={{ height: 46, borderRadius: 10, background: v(token, fb), border: `1px solid ${border}` }} />
        <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted }} className="truncate" title={token}>
          {token}
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
        <Swatch token="bg-primary" fb="#ffffff" />
        <Swatch token="bg-secondary" fb="#fafafa" />
        <Swatch token="bg-tertiary" fb="#f5f5f5" />
        <Swatch token="bg-quaternary" fb="#e9eaeb" />
      </Section>
      <Section title="Brand">
        <Swatch token="bg-brand-primary" fb="#f4f3ff" />
        <Swatch token="bg-brand-secondary" fb="#ebe9fe" />
        <Swatch token="bg-brand-solid" fb={tokens.brandSolid} />
      </Section>
      <Section title="Feedback">
        <Swatch token="bg-error-primary" fb="#fef3f2" />
        <Swatch token="bg-error-solid" fb="#d92d20" />
        <Swatch token="bg-warning-primary" fb="#fffaeb" />
        <Swatch token="bg-success-primary" fb="#ecfdf3" />
        <Swatch token="bg-info-primary" fb="#eff8ff" />
      </Section>
      <Section title="Disabled">
        <Swatch token="bg-disabled" fb="#f5f5f5" />
      </Section>
    </div>
  )
}
