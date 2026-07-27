import { type ReactNode } from 'react'
import { fontFamilyOf, radiusOf, weightOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'

// Live specimen for the **Border** semantic category — real bordered elements
// (inputs, a card, a divider) each stroked by its `border-*` token, captioned.
//
// The fields mirror the catalogue's InputSpecimen (Size MD) exactly — same 40px
// height, `radius-md`, 1px stroke, `accent`26 focus glow, disabled fill and
// 12/13/11px type — so a token previewed here reads identical to the Input page
// in Components/Documentation. Only the caption column is extra.
export function BorderSpecimenPreview({ tokens }: { tokens: PreviewTokens }) {
  const sem = tokens.semanticMap ?? {}
  const v = (k: string, fb: string) => sem[k] || fb
  const fontFamily = fontFamilyOf(tokens)
  // The card/container shell uses border-secondary — the general-purpose surface
  // stroke — not the stronger input border.
  const surfaceBorder = v('border-secondary', tokens.border || '#eaecf0')
  const muted = tokens.fgMuted || '#717680'
  const placeholder = tokens.placeholderText || '#a4a7ae'
  const label = tokens.neutralText || '#414651'

  function Caption({ token }: { token: string }) {
    return <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted }}>{token}</code>
  }

  function Field({
    token, fb, placeholderText, note, noteColor, glow = false, disabled = false,
  }: {
    token: string
    fb: string
    placeholderText: string
    note?: string
    noteColor?: string
    /** Focus ring, as the Input specimen paints its Focused state. */
    glow?: boolean
    disabled?: boolean
  }) {
    const stroke = v(token, fb)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="flex items-center justify-between gap-3">
          <span style={{ fontSize: 12, fontWeight: weightOf(tokens, 'medium', 500), color: disabled ? tokens.disabledText : label }}>
            Email
          </span>
          <Caption token={token} />
        </div>
        <div
          style={{
            height: 40, display: 'flex', alignItems: 'center', padding: '0 12px',
            borderRadius: radiusOf(tokens, 'md', '8px'),
            background: disabled ? tokens.disabledBg : tokens.surface,
            border: `1px solid ${stroke}`,
            boxShadow: glow ? `0 0 0 3px ${stroke}26` : undefined,
          }}
        >
          <span style={{ fontSize: 13, color: disabled ? tokens.disabledText : placeholder }}>{placeholderText}</span>
        </div>
        {note && <span style={{ fontSize: 11, color: noteColor || muted }}>{note}</span>}
      </div>
    )
  }

  function Row({ children, token }: { children: ReactNode; token: string }) {
    return (
      <div className="flex items-center justify-between gap-3">
        {children}
        <Caption token={token} />
      </div>
    )
  }

  return (
    <div
      style={{ background: tokens.surface, border: `1px solid ${surfaceBorder}`, borderRadius: 14, fontFamily }}
      className="p-5 flex flex-col gap-4"
    >
      <Field token="border-primary" fb="#d5d7da" placeholderText="you@company.com" />

      {/* Card — border-secondary; radius + title match the catalogue's Card */}
      <Row token="border-secondary">
        <div
          style={{
            flex: 1, borderRadius: radiusOf(tokens, 'lg', '12px'), padding: 12,
            background: tokens.surface, border: `1px solid ${v('border-secondary', '#e9eaeb')}`,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: weightOf(tokens, 'semibold', 600), color: tokens.neutralText }}>Card surface</span>
        </div>
      </Row>

      {/* Divider — border-tertiary */}
      <Row token="border-tertiary">
        <div style={{ flex: 1, height: 1, background: v('border-tertiary', '#f5f5f5') }} />
      </Row>

      <Field token="border-brand" fb={tokens.brandSolid} placeholderText="Focused field" glow />
      <Field
        token="border-error"
        fb="#fd6f6f"
        placeholderText="bad-email"
        note="This field is required."
        noteColor={sem['content-error'] || tokens.errorColor}
      />
      <Field token="border-disabled" fb="#d5d7da" placeholderText="Disabled field" disabled />
    </div>
  )
}
