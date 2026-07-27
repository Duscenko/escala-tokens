import { type ReactNode } from 'react'
import { fontFamilyOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'

// Live specimen for the **Text** semantic category. Every line is painted by its
// own `text-*` token (read live from the active preview theme) with a faint mono
// caption naming it, so editing a tone in the table updates the line immediately.
export function TextSpecimenPreview({ tokens }: { tokens: PreviewTokens }) {
  const sem = tokens.semanticMap ?? {}
  const v = (k: string, fb: string) => sem[k] || fb
  const fontFamily = fontFamilyOf(tokens)
  const border = tokens.border || '#eaecf0'
  const muted = tokens.fgMuted || '#717680'

  function Line({
    token, size, weight, color, italic, children,
  }: { token: string; size: number; weight: number; color: string; italic?: boolean; children: ReactNode }) {
    return (
      <div className="flex items-baseline justify-between gap-3">
        <span style={{ color, fontSize: size, fontWeight: weight, fontStyle: italic ? 'italic' : undefined, lineHeight: 1.3, minWidth: 0 }} className="truncate">
          {children}
        </span>
        <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: muted, flexShrink: 0 }}>{token}</code>
      </div>
    )
  }

  const rule = <div style={{ height: 1, background: border }} />

  const states: [string, string][] = [
    ['content-error', 'Could not save your changes'],
    ['content-warning', 'Your free trial ends soon'],
    ['content-success', 'Payment confirmed'],
  ]

  return (
    <div
      style={{ background: tokens.surface, border: `1px solid ${border}`, borderRadius: 14, fontFamily }}
      className="p-5 flex flex-col gap-3.5"
    >
      <Line token="content-primary" size={23} weight={700} color={v('content-primary', '#101828')}>Build your design system</Line>
      <Line token="content-secondary" size={15} weight={600} color={v('content-secondary', '#414651')}>Foundations that scale</Line>
      <Line token="content-tertiary" size={14} weight={400} color={v('content-tertiary', '#535862')}>Tokens keep color, type and spacing consistent.</Line>
      <Line token="content-quaternary" size={12} weight={400} color={v('content-quaternary', '#717680')}>Last updated a few seconds ago</Line>
      <Line token="content-brand" size={14} weight={600} color={v('content-brand', tokens.brandText)}>Learn more →</Line>

      {rule}
      {states.map(([token, label]) => (
        <Line key={token} token={token} size={13} weight={500} color={v(token, '#717680')}>{label}</Line>
      ))}

      {rule}
      <Line token="content-disabled" size={14} weight={400} color={v('content-disabled', '#a4a7ae')}>Unavailable option</Line>

      <div
        className="flex items-center justify-between gap-3"
        style={{ marginTop: 2, padding: '9px 12px', borderRadius: 10, background: v('background-brand-solid', tokens.brandSolid) }}
      >
        <span style={{ color: v('content-inverse', '#ffffff'), fontSize: 13, fontWeight: 600 }}>Text on a brand fill</span>
        <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: v('content-inverse', '#ffffff'), opacity: 0.85 }}>content-inverse</code>
      </div>
    </div>
  )
}
