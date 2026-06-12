import { type ReactNode } from 'react'
import { useDesignStore } from '../../../store/useDesignStore'
import { fontFamilyOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'

// Live specimen for the **Foreground** semantic category — the same star glyph
// repeated, each tinted by an `fg-*` token, so the colour (the thing the token
// controls) is what visibly changes. fg-white sits on a dark tile to stay visible.
export function ForegroundSpecimenPreview({ tokens }: { tokens: PreviewTokens }) {
  const sem = useDesignStore((s) => s.themes.light)
  const v = (k: string, fb: string) => sem[k] || fb
  const fontFamily = fontFamilyOf(tokens)
  const border = tokens.border || '#eaecf0'
  const muted = tokens.fgMuted || '#717680'

  function Glyph({ color }: { color: string }) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={color} aria-hidden>
        <path d="M12 2.5l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 17.3 6.2 20.8l1.6-6.6L2.6 9.8l6.8-.5z" />
      </svg>
    )
  }

  function Cell({ token, fb, dark }: { token: string; fb: string; dark?: boolean }) {
    return (
      <div className="flex flex-col items-center gap-1.5" style={{ width: 84 }}>
        <div
          className="flex items-center justify-center w-full"
          style={{
            height: 50, borderRadius: 10,
            background: dark ? v('bg-primary-solid', '#0a0a0a') : 'transparent',
            border: dark ? 'none' : `1px solid ${border}`,
          }}
        >
          <Glyph color={v(token, fb)} />
        </div>
        <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9.5, color: muted }} className="truncate w-full text-center" title={token}>
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
      <Section title="Neutral">
        <Cell token="fg-primary" fb="#181d27" />
        <Cell token="fg-secondary" fb="#414651" />
        <Cell token="fg-tertiary" fb="#535862" />
        <Cell token="fg-quaternary" fb="#a4a7ae" />
      </Section>
      <Section title="Brand & feedback">
        <Cell token="fg-brand-primary" fb={tokens.brandSolid} />
        <Cell token="fg-error-primary" fb="#d92d20" />
        <Cell token="fg-warning-primary" fb="#dc6803" />
        <Cell token="fg-success-primary" fb="#079455" />
        <Cell token="fg-info-primary" fb="#1570ef" />
      </Section>
      <Section title="States">
        <Cell token="fg-disabled" fb="#a4a7ae" />
        <Cell token="fg-white" fb="#ffffff" dark />
      </Section>
    </div>
  )
}
