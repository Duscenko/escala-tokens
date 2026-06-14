import { type ReactNode } from 'react'
import { fontFamilyOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'

// Live specimen for the **Border** semantic category — real bordered elements
// (inputs, a card, a divider) each stroked by its `border-*` token, captioned.
export function BorderSpecimenPreview({ tokens }: { tokens: PreviewTokens }) {
  const sem = tokens.semanticMap ?? {}
  const v = (k: string, fb: string) => sem[k] || fb
  const fontFamily = fontFamilyOf(tokens)
  const surfaceBorder = tokens.border || '#eaecf0'
  const muted = tokens.fgMuted || '#717680'
  const placeholder = tokens.placeholderText || '#a4a7ae'
  const label = tokens.neutralText || '#414651'

  function Caption({ token }: { token: string }) {
    return <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted }}>{token}</code>
  }

  function Field({
    token, fb, width = 2, placeholderText, note, noteColor,
  }: { token: string; fb: string; width?: number; placeholderText: string; note?: string; noteColor?: string }) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <span style={{ fontSize: 12, fontWeight: 500, color: label }}>Email</span>
          <Caption token={token} />
        </div>
        <div
          style={{
            height: 40, borderRadius: 9, display: 'flex', alignItems: 'center', padding: '0 12px',
            background: tokens.surface, border: `${width}px solid ${v(token, fb)}`,
          }}
        >
          <span style={{ fontSize: 13, color: placeholder }}>{placeholderText}</span>
        </div>
        {note && <span style={{ fontSize: 11, color: noteColor || muted }}>{note}</span>}
      </div>
    )
  }

  function Row({ children, token }: { children: ReactNode; token: string }) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          {children}
          <Caption token={token} />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ background: tokens.surface, border: `1px solid ${surfaceBorder}`, borderRadius: 14, fontFamily }}
      className="p-5 flex flex-col gap-4"
    >
      <Field token="border-primary" fb="#d5d7da" width={1} placeholderText="you@company.com" />

      {/* Card — border-secondary */}
      <Row token="border-secondary">
        <div
          style={{ flex: 1, borderRadius: 10, padding: 12, background: tokens.surface, border: `1px solid ${v('border-secondary', '#e9eaeb')}` }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: tokens.neutralText }}>Card surface</span>
        </div>
      </Row>

      {/* Divider — border-tertiary */}
      <Row token="border-tertiary">
        <div style={{ flex: 1, height: 1, background: v('border-tertiary', '#f5f5f5') }} />
      </Row>

      <Field token="border-brand" fb={tokens.brandSolid} width={2} placeholderText="Focused field" />
      <Field token="border-error" fb="#fd6f6f" width={2} placeholderText="bad-email" note="Enter a valid email address" noteColor={sem['text-error-primary'] || '#d92d20'} />
      <Field token="border-disabled" fb="#d5d7da" width={1} placeholderText="Disabled field" />
    </div>
  )
}
