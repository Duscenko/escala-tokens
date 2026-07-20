// Dashboard preview frame — a full application mock (hero · KPI tiles · chart ·
// invoices table · settings · subscribe + status cards · palette chips) rendered
// entirely from the resolved design tokens, so editing any foundation in the
// right panel updates it live. Mirrors the Figma "dashboard preview" spec; one
// instance renders per theme (light / dark) so "Both" shows them side by side.

import type { CSSProperties, ReactNode } from 'react'
import chroma from 'chroma-js'
import { withAlpha } from '../../lib/colorUtils'
import { radiusOf, fontFamilyOf, weightOf, shadowOf } from '../../lib/previewTokens'
import type { PreviewTokens } from './ButtonPreview'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, "Roboto Mono", monospace'

function safe(hex: string, fallback = '#808080'): string {
  try { chroma(hex); return hex } catch { return fallback }
}
function isDarkSurface(hex: string): boolean {
  try { return chroma(safe(hex)).luminance() < 0.4 } catch { return false }
}
// One elevation step above the page — lighter cards on a light page, lifted
// cards on a dark page (works in both directions from a single rule).
function elevate(hex: string, dark: boolean): string {
  try { return chroma.mix(safe(hex), dark ? '#ffffff' : '#000000', dark ? 0.06 : 0.02, 'rgb').hex() } catch { return hex }
}
// Readable ink for a soft status/brand tint — dark text on light, light on dark.
function ink(hex: string, dark: boolean): string {
  try { return dark ? chroma(safe(hex)).brighten(1.3).hex() : chroma(safe(hex)).darken(1.7).hex() } catch { return hex }
}

interface Ctx {
  t: PreviewTokens
  dark: boolean
  card: string       // elevated card surface
  page: string       // frame page background
  heading: string    // heading font family
  body: string       // body font family
  // Resolved copies of PreviewTokens' optional fields (typed possibly-undefined
  // upstream for backward compat) — always populated by resolvePreviewTokens at
  // runtime, but every call site here needs the guaranteed `string`.
  muted: string
  line: string
  placeholder: string
  success: string
  warning: string
  info: string
}

function makeCtx(t: PreviewTokens): Ctx {
  const page = safe(t.surface, '#ffffff')
  const dark = isDarkSurface(page)
  return {
    t, dark, page,
    card: elevate(page, dark),
    heading: t.typography?.headingFontFamily || fontFamilyOf(t),
    body: fontFamilyOf(t),
    muted: t.fgMuted ?? '#717680',
    line: t.borderDefault ?? '#e0e1e6',
    placeholder: t.placeholderText ?? '#a4a7ae',
    success: t.successColor ?? '#17b26a',
    warning: t.warningColor ?? '#f79009',
    info: t.infoColor ?? '#2e90fa',
  }
}

// A soft tint chip/badge palette derived from a base color.
function tint(base: string, c: Ctx) {
  const b = safe(base)
  return {
    bg: withAlpha(b, c.dark ? 0.16 : 0.12),
    border: withAlpha(b, c.dark ? 0.32 : 0.22),
    fg: ink(b, c.dark),
  }
}

// ── Card shell ───────────────────────────────────────────────────────────────
function Card({ c, children, style }: { c: Ctx; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: c.card,
        border: `1px solid ${c.line}`,
        borderRadius: radiusOf(c.t, 'md', '6px'),
        boxShadow: shadowOf(c.t, 'xs', '0 1px 1px rgba(10,13,18,0.06)'),
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ c }: { c: Ctx }) {
  const { t } = c
  const badge = tint(t.brandSolid, c)
  return (
    <div
      style={{
        width: '100%', boxSizing: 'border-box',
        background: withAlpha(t.brandSolid, c.dark ? 0.24 : 0.06),
        border: `1px solid ${withAlpha(t.brandSolid, c.dark ? 0.5 : 0.2)}`,
        borderRadius: radiusOf(t, 'md', '6px'), padding: 21,
        display: 'flex', flexDirection: 'column', gap: 20,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', width: '100%' }}>
        <span style={{ background: badge.bg, color: badge.fg, fontFamily: c.body, fontSize: 12, fontWeight: weightOf(t, 'semibold', 600), padding: '2px 8px', borderRadius: radiusOf(t, 'sm', '2px') }}>
          New release
        </span>
        <h3 style={{ margin: 0, fontFamily: c.heading, fontWeight: weightOf(t, 'bold', 700), fontSize: 23, lineHeight: '26.5px', letterSpacing: '-0.46px', color: t.neutralText }}>
          Ship a consistent<br />UI faster
        </h3>
        <p style={{ margin: 0, fontFamily: c.body, fontSize: 13, lineHeight: '20px', color: c.muted }}>
          A single token source for color, type, spacing, and shape, everywhere.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
        <span style={{ background: t.brandSolid, color: t.onBrand, fontFamily: c.body, fontSize: 13, fontWeight: weightOf(t, 'semibold', 600), padding: '8px 16px', borderRadius: radiusOf(t, 'sm', '4px'), cursor: 'pointer' }}>
          Get started
        </span>
        <span style={{ color: t.brandText, fontFamily: c.body, fontSize: 13, fontWeight: weightOf(t, 'semibold', 600), padding: '8px 16px', borderRadius: radiusOf(t, 'sm', '4px'), border: `1px solid ${withAlpha(t.brandSolid, 0.4)}`, cursor: 'pointer' }}>
          Docs
        </span>
      </div>
    </div>
  )
}

// ── KPI tiles ────────────────────────────────────────────────────────────────
function Stat({ c, label, value, delta, tone }: { c: Ctx; label: string; value: string; delta: string; tone: string }) {
  const { t } = c
  return (
    <Card c={c} style={{ flex: 1, minWidth: 0, padding: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: c.body, fontSize: 10.5, fontWeight: weightOf(t, 'semibold', 600), letterSpacing: '0.6px', textTransform: 'uppercase', color: c.muted }}>{label}</span>
      <span style={{ fontFamily: c.heading, fontSize: 26, fontWeight: weightOf(t, 'bold', 700), letterSpacing: '-0.3px', color: t.neutralText, lineHeight: 1.15 }}>{value}</span>
      <span style={{ fontFamily: c.body, fontSize: 10.5, fontWeight: weightOf(t, 'semibold', 600), color: ink(tone, c.dark) }}>{delta}</span>
    </Card>
  )
}

// ── Chart card ───────────────────────────────────────────────────────────────
function ChartCard({ c }: { c: Ctx }) {
  const { t } = c
  const tab = (label: string, active: boolean) => (
    <div style={{ position: 'relative', padding: '8px 12px' }}>
      <span style={{ fontFamily: c.body, fontSize: 13, fontWeight: weightOf(t, 'semibold', 600), color: active ? t.neutralText : c.muted }}>{label}</span>
      {active && <span style={{ position: 'absolute', left: 12, right: 12, bottom: -1, height: 2, background: t.brandSolid }} />}
    </div>
  )
  // A simple upward trend, drawn in the brand color with a soft area fill.
  const pts = [4, 10, 8, 16, 13, 22, 19, 30, 26, 38, 34, 48]
  const max = 52, w = 220, h = 56
  const path = pts.map((p, i) => `${(i / (pts.length - 1)) * w},${h - (p / max) * h}`).join(' ')
  return (
    <Card c={c} style={{ width: '100%', boxSizing: 'border-box' }}>
      <div style={{ borderBottom: `1px solid ${c.line}`, display: 'flex', gap: 4, padding: '8px 16px 0' }}>
        {tab('Overview', true)}{tab('Performance', false)}{tab('Errors', false)}
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: c.body, fontSize: 10.5, fontWeight: weightOf(t, 'semibold', 600), letterSpacing: '0.6px', textTransform: 'uppercase', color: c.muted }}>Overview · Last 12 weeks</span>
            <span style={{ fontFamily: c.heading, fontSize: 32, fontWeight: weightOf(t, 'bold', 700), letterSpacing: '-0.3px', color: t.neutralText, lineHeight: 1.1 }}>1,284</span>
          </div>
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: '55%', flexShrink: 1 }} preserveAspectRatio="none" aria-hidden>
            <polyline points={`0,${h} ${path} ${w},${h}`} fill={withAlpha(t.brandSolid, 0.12)} stroke="none" />
            <polyline points={path} fill="none" stroke={t.brandSolid} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p style={{ margin: 0, fontFamily: c.body, fontSize: 13, lineHeight: '20px', color: c.muted }}>
          Sustained week-over-week growth, accelerating in the last sprint.
        </p>
      </div>
    </Card>
  )
}

// ── Invoices table ───────────────────────────────────────────────────────────
function StatusBadge({ c, label, tone }: { c: Ctx; label: string; tone: string }) {
  const s = tint(tone, c)
  return (
    <span style={{ background: s.bg, color: s.fg, fontFamily: c.body, fontSize: 10.5, fontWeight: weightOf(c.t, 'semibold', 600), letterSpacing: '0.4px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>{label}</span>
  )
}

function InvoicesCard({ c }: { c: Ctx }) {
  const { t } = c
  const rows = [
    { id: 'INV-1842', cust: 'Acme Robotics', amt: '$2,400.00', st: 'PAID', tone: c.success },
    { id: 'INV-1841', cust: 'Helix Labs', amt: '$840.00', st: 'PENDING', tone: c.warning },
    { id: 'INV-1840', cust: 'Northwind', amt: '$1,200.00', st: 'PAID', tone: c.success },
    { id: 'INV-1839', cust: 'Linear Stage', amt: '$320.00', st: 'OVERDUE', tone: t.errorColor },
  ]
  const th: CSSProperties = { fontFamily: c.body, fontSize: 10.5, fontWeight: weightOf(t, 'semibold', 600), letterSpacing: '0.6px', textTransform: 'uppercase', color: c.muted, padding: '8px 16px' }
  return (
    <Card c={c} style={{ width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ borderBottom: `1px solid ${c.line}`, padding: '12px 20px' }}>
        <span style={{ fontFamily: c.body, fontSize: 10.5, fontWeight: weightOf(t, 'semibold', 600), letterSpacing: '0.6px', textTransform: 'uppercase', color: c.muted }}>Recent invoices</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: withAlpha(c.muted, c.dark ? 0.12 : 0.06) }}>
            <th style={{ ...th, textAlign: 'left', width: '20%' }}>Invoice</th>
            <th style={{ ...th, textAlign: 'left', width: '28%' }}>Customer</th>
            <th style={{ ...th, textAlign: 'right', width: '24%' }}>Amount</th>
            <th style={{ ...th, textAlign: 'left', width: '28%' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={{ borderTop: i === 0 ? 'none' : `1px solid ${c.line}` }}>
              <td style={{ padding: '13px 16px', fontFamily: MONO, fontSize: 11, color: t.neutralText }}>{r.id}</td>
              <td style={{ padding: '13px 16px', fontFamily: c.body, fontSize: 13, fontWeight: weightOf(t, 'medium', 500), color: t.neutralText }}>{r.cust}</td>
              <td style={{ padding: '13px 16px', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: t.neutralText, textAlign: 'right' }}>{r.amt}</td>
              <td style={{ padding: '13px 16px' }}><StatusBadge c={c} label={r.st} tone={r.tone} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

// ── Workspace settings ───────────────────────────────────────────────────────
function Toggle({ c, on }: { c: Ctx; on: boolean }) {
  const { t } = c
  return (
    <span style={{ width: 44, height: 24, borderRadius: 999, background: on ? t.brandSolid : withAlpha(c.muted, 0.4), position: 'relative', flexShrink: 0, display: 'inline-block' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: 999, background: '#ffffff', boxShadow: '0 1px 2px rgba(10,13,18,0.2)' }} />
    </span>
  )
}
function CheckBox({ c, on }: { c: Ctx; on: boolean }) {
  const { t } = c
  return (
    <span style={{ width: 18, height: 18, flexShrink: 0, borderRadius: radiusOf(t, 'sm', '2px'), background: on ? t.brandSolid : 'transparent', border: `1px solid ${on ? t.brandSolid : withAlpha(c.muted, 0.5)}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {on && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={t.onBrand} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      )}
    </span>
  )
}
function SettingRow({ c, title, desc, on }: { c: Ctx; title: string; desc: string; on: boolean }) {
  const { t } = c
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: c.body, fontSize: 13, fontWeight: weightOf(t, 'semibold', 600), color: t.neutralText }}>{title}</span>
        <span style={{ fontFamily: c.body, fontSize: 11, color: c.muted }}>{desc}</span>
      </div>
      <Toggle c={c} on={on} />
    </div>
  )
}
function SettingsCard({ c }: { c: Ctx }) {
  const { t } = c
  const checks: [string, boolean][] = [['A deployment fails on main', true], ['A new error type appears', true], ['Latency exceeds 500ms', false]]
  return (
    <Card c={c} style={{ width: '100%', boxSizing: 'border-box', padding: 21, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontFamily: c.heading, fontSize: 19, fontWeight: weightOf(t, 'bold', 700), letterSpacing: '-0.3px', color: t.neutralText }}>Workspace settings</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
        <SettingRow c={c} title="Email digests" desc="Weekly summary every Monday." on />
        <SettingRow c={c} title="Slack notifications" desc="Real-time alerts for incidents above P2." on={false} />
      </div>
      <div style={{ height: 1, background: c.line, width: '100%' }} />
      <span style={{ fontFamily: c.body, fontSize: 13, fontWeight: weightOf(t, 'semibold', 600), color: t.neutralText, paddingTop: 4 }}>Notify me when</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {checks.map(([label, on]) => (
          <label key={label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <CheckBox c={c} on={on} />
            <span style={{ fontFamily: c.body, fontSize: 13, color: t.neutralText }}>{label}</span>
          </label>
        ))}
      </div>
      <span style={{ fontFamily: c.body, fontSize: 11, color: c.muted, paddingTop: 4 }}>Changes save automatically.</span>
    </Card>
  )
}

// ── Subscribe + status cards ─────────────────────────────────────────────────
function SubscribeCard({ c }: { c: Ctx }) {
  const { t } = c
  return (
    <Card c={c} style={{ flex: 1, minWidth: 0, padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontFamily: c.heading, fontSize: 19, fontWeight: weightOf(t, 'bold', 700), letterSpacing: '-0.3px', color: t.neutralText }}>Subscribe</span>
      <span style={{ fontFamily: c.body, fontSize: 13, fontWeight: weightOf(t, 'medium', 500), color: c.muted, marginTop: 8 }}>Email address</span>
      <span style={{ boxSizing: 'border-box', width: '100%', padding: '11px 13px', borderRadius: radiusOf(t, 'sm', '4px'), border: `1px solid ${withAlpha(c.muted, 0.5)}`, background: c.page, fontFamily: c.body, fontSize: 13, color: c.placeholder }}>
        you@company.com
      </span>
      <span style={{ boxSizing: 'border-box', width: '100%', textAlign: 'center', marginTop: 4, padding: '9px 16px', borderRadius: radiusOf(t, 'sm', '4px'), background: t.brandSolid, color: t.onBrand, fontFamily: c.body, fontSize: 13, fontWeight: weightOf(t, 'semibold', 600), cursor: 'pointer' }}>
        Notify me
      </span>
    </Card>
  )
}
function StatusCard({ c, title, body, tone }: { c: Ctx; title: string; body: ReactNode; tone: string }) {
  const s = tint(tone, c)
  return (
    <div style={{ width: '100%', boxSizing: 'border-box', background: s.bg, border: `1px solid ${s.border}`, borderRadius: radiusOf(c.t, 'sm', '4px'), padding: 17, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontFamily: c.body, fontSize: 13, fontWeight: weightOf(c.t, 'bold', 700), color: s.fg }}>{title}</span>
      <span style={{ fontFamily: c.body, fontSize: 13, lineHeight: '20px', color: ink(tone, c.dark) }}>{body}</span>
    </div>
  )
}

// ── Palette chips ────────────────────────────────────────────────────────────
function Chips({ c }: { c: Ctx }) {
  const { t } = c
  const chips: [string, string][] = [
    ['primary', t.brandSolid], ['accent', t.brandSolid], ['success', c.success],
    ['warning', c.warning], ['danger', t.errorColor], ['info', c.info], ['neutral', c.muted],
  ]
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: '100%' }}>
      {chips.map(([label, color]) => {
        const s = tint(color, c)
        return (
          <span key={label} style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.fg, fontFamily: c.body, fontSize: 10.5, fontWeight: weightOf(t, 'semibold', 600), padding: '5px 9px', borderRadius: 999 }}>{label}</span>
        )
      })}
    </div>
  )
}

// ── Sun / moon glyph for the frame header ────────────────────────────────────
function ThemeGlyph({ dark, color }: { dark: boolean; color: string }) {
  return dark ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  )
}

// ── Frame ────────────────────────────────────────────────────────────────────
export default function DashboardPreview({ tokens }: { tokens: PreviewTokens }) {
  const c = makeCtx(tokens)
  const { t } = c
  return (
    <div
      style={{
        flex: 1, minWidth: 0, background: c.page,
        border: `1px solid ${c.line}`,
        borderRadius: 18, overflow: 'hidden',
        fontFamily: c.body,
      }}
    >
      {/* Frame header — theme label + page→ink hex trail */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${c.line}` }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ThemeGlyph dark={c.dark} color={c.muted} />
          <span style={{ fontFamily: c.body, fontSize: 10, fontWeight: weightOf(t, 'semibold', 600), color: c.muted }}>{c.dark ? 'dark' : 'light'}</span>
        </span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: c.muted, textTransform: 'uppercase' }}>{safe(t.surface).toUpperCase()} → {safe(t.neutralText).toUpperCase()}</span>
      </div>

      {/* Body */}
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Hero c={c} />
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <Stat c={c} label="Active users" value="12,438" delta="+8.2% vs last week" tone={c.success} />
          <Stat c={c} label="Errors" value="23" delta="−12% vs last week" tone={t.errorColor} />
          <Stat c={c} label="Avg latency" value="184 ms" delta="−4ms vs last week" tone={c.info} />
        </div>
        <ChartCard c={c} />
        <InvoicesCard c={c} />
        <SettingsCard c={c} />
        <div style={{ display: 'flex', gap: 20, width: '100%', alignItems: 'stretch' }}>
          <SubscribeCard c={c} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StatusCard c={c} title="Saved" tone={c.success} body={<>Your changes are live across all channels.</>} />
            <StatusCard c={c} title="Heads up" tone={c.warning} body={<>Two tokens reference deprecated values.</>} />
            <StatusCard c={c} title="Build failed" tone={t.errorColor} body={<>Color contrast below AA on 3 surfaces.</>} />
          </div>
        </div>
        <Chips c={c} />
      </div>
    </div>
  )
}
