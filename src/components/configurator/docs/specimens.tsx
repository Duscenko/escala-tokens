// ─── Playground specimens ─────────────────────────────────────────────────────
// One live, token-driven render per catalogue component. Each specimen honors
// the variant axes exactly as the Figma plugin builds them (componentCatalogue
// `axes` — the plugin is the source of truth), so what the designer toggles
// here is what lands in Figma. All colors/radius/type resolve from PreviewTokens
// — inline styles by design (see CLAUDE.md conventions).

import type { CSSProperties, ReactNode } from 'react'
import chroma from 'chroma-js'
import type { PreviewTokens } from '../../preview/ButtonPreview'
import { radiusOf, fontFamilyOf, weightOf } from '../../../lib/previewTokens'
import type { ComponentDef } from '../../../lib/componentCatalogue'

export type AxisValues = Record<string, string>

// ── Shared helpers ────────────────────────────────────────────────────────────

const darken = (c: string, amt: number) => {
  try { return chroma(c).darken(amt).hex() } catch { return c }
}
/** ~10% tint of a hex color (soft fills). */
const soft = (hex: string) => hex + '1a'
const softer = (hex: string) => hex + '0d'

function statusColor(t: PreviewTokens, name: string): string {
  switch (name) {
    case 'Brand': return t.brandSolid
    case 'Success': return t.successColor ?? '#17b26a'
    case 'Warning': return t.warningColor ?? '#f79009'
    case 'Error': case 'Danger': return t.errorColor
    case 'Info': return t.infoColor ?? '#2e90fa'
    default: return t.neutralText // Neutral
  }
}

const focusRing = (t: PreviewTokens, accent: string): string =>
  `0 0 0 2px ${t.surface}, 0 0 0 4px ${accent}66`

function baseFont(t: PreviewTokens): CSSProperties {
  return { fontFamily: fontFamilyOf(t), color: t.neutralText }
}

function SpecimenSpinner({ size, color, track }: { size: number; color: string; track: string }) {
  return (
    <span
      className="inline-block animate-spin rounded-full"
      style={{
        width: size, height: size,
        border: `${Math.max(2, Math.round(size / 8))}px solid ${track}`,
        borderTopColor: color,
      }}
      aria-hidden
    />
  )
}

// ── Icons — wired to the Foundations icon library ─────────────────────────────
// A live glyph from the chosen library, via the Iconify API + CSS mask so it
// takes any color. Concept names are resolved per library (names differ across
// sets — verified against api.iconify.design), so toggling the library in
// Foundations re-renders these with that set's real glyph.

const ICONIFY = 'https://api.iconify.design'

export type IconConcept = 'star' | 'arrow' | 'search' | 'eye'

// concept → per-library icon name (`_` = the name shared by most libraries).
const ICON_NAMES: Record<IconConcept, Record<string, string>> = {
  star:   { _: 'star' },
  arrow:  { _: 'arrow-right' },
  search: { _: 'magnifying-glass', lucide: 'search', 'material-symbols': 'search' },
  eye:    { _: 'eye', 'radix-icons': 'eye-open', 'material-symbols': 'visibility' },
}

export function iconName(prefix: string, concept: IconConcept): string {
  const m = ICON_NAMES[concept]
  return m[prefix] ?? m._
}

// PascalCase component name for the copy snippet (leadingIcon={<Star />}).
export const ICON_COMPONENT: Record<IconConcept, string> = {
  star: 'Star', arrow: 'ArrowRight', search: 'Search', eye: 'Eye',
}

/** Which components expose leading/trailing icon slots, and their default glyphs. */
export const ICON_SLOTS: Record<string, { leading: IconConcept; trailing: IconConcept }> = {
  Button: { leading: 'star', trailing: 'arrow' },
  Input: { leading: 'search', trailing: 'eye' },
}

export interface IconOpts { prefix: string; leading: boolean; trailing: boolean }

function PreviewIcon({ prefix, concept, size = 16, color }: { prefix: string; concept: IconConcept; size?: number; color: string }) {
  const url = `${ICONIFY}/${prefix}/${iconName(prefix, concept)}.svg`
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, display: 'inline-block', flexShrink: 0,
        backgroundColor: color,
        maskImage: `url("${url}")`, WebkitMaskImage: `url("${url}")`,
        maskSize: 'contain', WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center', WebkitMaskPosition: 'center',
      }}
    />
  )
}

export interface SpecimenProps { t: PreviewTokens; v: AxisValues; icons?: IconOpts }

// ── Button (Color × Style × State) ────────────────────────────────────────────

function ButtonSpecimen({ t, v, icons }: SpecimenProps) {
  const color = statusColor(t, v.Color === 'Danger' ? 'Error' : (v.Color ?? 'Brand'))
  const style = v.Style ?? 'Solid'
  const state = v.State ?? 'Default'
  const disabled = state === 'Disabled'
  const loading = state === 'Loading'
  const slots = ICON_SLOTS.Button

  let bg = 'transparent'
  let fg = color
  let border = 'transparent'
  if (style === 'Solid') { bg = color; fg = t.onBrand }
  else if (style === 'Outline') { border = color + '99' }
  else if (style === 'Soft') { bg = soft(color) }

  if (state === 'Hover') {
    if (style === 'Solid') bg = darken(color, 0.4)
    else bg = style === 'Soft' ? color + '2b' : soft(color)
  } else if (state === 'Pressed') {
    if (style === 'Solid') bg = darken(color, 0.8)
    else bg = color + '33'
  }
  if (disabled) { bg = style === 'Ghost' ? 'transparent' : t.disabledBg; fg = t.disabledText; border = style === 'Outline' ? t.disabledBg : 'transparent' }

  return (
    <button
      type="button"
      aria-disabled={disabled}
      style={{
        ...baseFont(t),
        display: 'inline-flex', alignItems: 'center', gap: 8,
        height: 40, padding: '0 18px',
        borderRadius: radiusOf(t, 'md', '8px'),
        background: bg, color: fg,
        border: `1px solid ${border}`,
        fontSize: 14, fontWeight: weightOf(t, 'semibold', 600),
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: state === 'Focused' ? focusRing(t, color) : undefined,
      }}
    >
      {loading && <SpecimenSpinner size={14} color={fg} track={fg + '33'} />}
      {!loading && icons?.leading && <PreviewIcon prefix={icons.prefix} concept={slots.leading} size={16} color={fg} />}
      Button
      {icons?.trailing && <PreviewIcon prefix={icons.prefix} concept={slots.trailing} size={16} color={fg} />}
    </button>
  )
}

// ── Input (Size × State × Type) ───────────────────────────────────────────────

const INPUT_HEIGHTS: Record<string, number> = { MD: 40, SM: 34, XS: 28 }
const INPUT_META: Record<string, { label: string; placeholder: string; prefix?: string; lead?: ReactNode }> = {
  'Default':      { label: 'Name', placeholder: 'Jane Doe' },
  'E-Mail':       { label: 'Email', placeholder: 'you@company.com', lead: '@' },
  'Password':     { label: 'Password', placeholder: '••••••••' },
  'Search':       { label: 'Search', placeholder: 'Search…', lead: '⌕' },
  'Phone Number': { label: 'Phone', placeholder: '(555) 000-0000', prefix: 'US' },
  'Website':      { label: 'Website', placeholder: 'yoursite.com', prefix: 'https://' },
}

function InputSpecimen({ t, v, icons }: SpecimenProps) {
  const state = v.State ?? 'Default'
  const meta = INPUT_META[v.Type ?? 'Default'] ?? INPUT_META.Default
  const h = INPUT_HEIGHTS[v.Size ?? 'MD'] ?? 40
  const disabled = state === 'Disabled'
  const error = state === 'Error'
  const slots = ICON_SLOTS.Input
  const iconColor = disabled ? t.disabledText : (t.fgMuted ?? '#717680')
  const accent = error ? t.errorColor : t.brandSolid
  const border =
    error ? t.errorColor
    : state === 'Focused' ? t.brandSolid
    : state === 'Hover' ? (t.fgMuted ?? '#717680')
    : (t.border ?? '#d0d5dd')

  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', gap: 6, width: 260 }}>
      <span style={{ fontSize: 12, fontWeight: weightOf(t, 'medium', 500), color: disabled ? t.disabledText : t.neutralText }}>
        {meta.label}
      </span>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, height: h, padding: '0 12px',
          borderRadius: radiusOf(t, 'md', '8px'),
          border: `1px solid ${border}`,
          background: disabled ? t.disabledBg : t.surface,
          boxShadow: state === 'Focused' ? `0 0 0 3px ${accent}26` : undefined,
        }}
      >
        {icons?.leading && <PreviewIcon prefix={icons.prefix} concept={slots.leading} size={16} color={iconColor} />}
        {meta.prefix && <span style={{ fontSize: 13, color: t.fgMuted, borderRight: `1px solid ${t.border}`, paddingRight: 8 }}>{meta.prefix}</span>}
        {!icons?.leading && meta.lead && <span style={{ fontSize: 14, color: t.placeholderText }}>{meta.lead}</span>}
        <span style={{ fontSize: 13, flex: 1, color: state === 'Filled' ? t.neutralText : (disabled ? t.disabledText : t.placeholderText) }}>
          {state === 'Filled' ? (v.Type === 'E-Mail' ? 'maya@scala.ds' : 'Maya Duscenko') : meta.placeholder}
        </span>
        {icons?.trailing && <PreviewIcon prefix={icons.prefix} concept={slots.trailing} size={16} color={iconColor} />}
        {state === 'Loading' && <SpecimenSpinner size={13} color={t.brandSolid} track={t.brandSolid + '33'} />}
      </div>
      <span style={{ fontSize: 11, color: error ? t.errorColor : t.fgMuted }}>
        {error ? 'This field is required.' : 'This is a hint text.'}
      </span>
    </div>
  )
}

// ── Select (State) ────────────────────────────────────────────────────────────

function SelectSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  const state = v.State ?? 'Default'
  const disabled = state === 'Disabled'
  const error = state === 'Error'
  const accent = error ? t.errorColor : t.brandSolid
  const border =
    error ? t.errorColor
    : state === 'Focused' ? t.brandSolid
    : state === 'Hover' ? (t.fgMuted ?? '#717680')
    : (t.border ?? '#d0d5dd')
  return (
    <div
      style={{
        ...baseFont(t),
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: 240, height: 40, padding: '0 12px',
        borderRadius: radiusOf(t, 'md', '8px'),
        border: `1px solid ${border}`,
        background: disabled ? t.disabledBg : t.surface,
        boxShadow: state === 'Focused' ? `0 0 0 3px ${accent}26` : undefined,
        fontSize: 13, color: disabled ? t.disabledText : t.placeholderText,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      Select an option
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={disabled ? t.disabledText : t.fgMuted} strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
    </div>
  )
}

// ── Checkbox (Checked × State) ────────────────────────────────────────────────

function CheckboxSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  const checked = (v.Checked ?? 'True') === 'True'
  const state = v.State ?? 'Default'
  const disabled = state === 'Disabled'
  const fill = disabled ? t.disabledBg : checked ? t.brandSolid : t.surface
  const line = disabled ? t.disabledBg : checked ? t.brandSolid : state === 'Hover' ? t.brandSolid : (t.border ?? '#d0d5dd')
  return (
    <label style={{ ...baseFont(t), display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <span
        style={{
          width: 18, height: 18, borderRadius: radiusOf(t, 'sm', '4px'),
          background: fill, border: `1.5px solid ${line}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: state === 'Focused' ? focusRing(t, t.brandSolid) : undefined,
        }}
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.7 9.5 3.4" stroke={disabled ? t.disabledText : t.onBrand} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </span>
      <span style={{ fontSize: 14, color: disabled ? t.disabledText : t.neutralText }}>Remember me</span>
    </label>
  )
}

// ── Toggle (On × State) ───────────────────────────────────────────────────────

function ToggleSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  const on = (v.On ?? 'True') === 'True'
  const state = v.State ?? 'Default'
  const disabled = state === 'Disabled'
  const track = disabled ? t.disabledBg : on ? (state === 'Hover' ? darken(t.brandSolid, 0.4) : t.brandSolid) : (state === 'Hover' ? darken(t.neutralFill, 0.3) : t.neutralFill)
  return (
    <label style={{ ...baseFont(t), display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <span
        role="switch"
        aria-checked={on}
        style={{
          width: 40, height: 22, borderRadius: 999, background: track, position: 'relative',
          transition: 'background 0.15s',
          boxShadow: state === 'Focused' ? focusRing(t, t.brandSolid) : undefined,
          display: 'inline-block',
        }}
      >
        <span
          style={{
            position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18,
            borderRadius: 999, background: '#ffffff',
            boxShadow: '0 1px 2px rgba(10,13,18,0.2)', transition: 'left 0.15s',
          }}
        />
      </span>
      <span style={{ fontSize: 14, color: disabled ? t.disabledText : t.neutralText }}>Notifications</span>
    </label>
  )
}

// ── Badge (Style × Color) ─────────────────────────────────────────────────────

function BadgeSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  const c = statusColor(t, v.Color ?? 'Brand')
  const style = v.Style ?? 'Soft'
  const isNeutral = (v.Color ?? 'Brand') === 'Neutral'
  let bg = 'transparent'; let fg = c; let line = 'transparent'
  if (style === 'Solid') { bg = c; fg = t.onBrand }
  else if (style === 'Soft') { bg = isNeutral ? t.neutralFill : soft(c); fg = isNeutral ? (t.fgMuted ?? c) : c }
  else { line = c + '99' }
  return (
    <span
      style={{
        ...baseFont(t),
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px',
        borderRadius: 999, background: bg, color: fg, border: `1px solid ${line}`,
        fontSize: 12, fontWeight: weightOf(t, 'medium', 500),
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: style === 'Solid' ? t.onBrand : c }} />
      {v.Color ?? 'Brand'}
    </span>
  )
}

// ── Avatar (Size) ─────────────────────────────────────────────────────────────

const AVATAR_SIZES: Record<string, { d: number; f: number }> = {
  XS: { d: 24, f: 10 }, SM: { d: 32, f: 12 }, MD: { d: 40, f: 14 }, LG: { d: 48, f: 16 }, XL: { d: 56, f: 18 },
}

function AvatarSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  const s = AVATAR_SIZES[v.Size ?? 'MD'] ?? AVATAR_SIZES.MD
  return (
    <span
      style={{
        ...baseFont(t),
        width: s.d, height: s.d, borderRadius: 999,
        background: soft(t.brandSolid), color: t.brandText,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: s.f, fontWeight: weightOf(t, 'semibold', 600),
      }}
    >
      MD
    </span>
  )
}

// ── Toast (Status) ────────────────────────────────────────────────────────────

function ToastSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  const c = statusColor(t, v.Status ?? 'Success')
  const inverse = t.semanticMap?.['surface-inverse'] || t.neutralText
  return (
    <div
      style={{
        ...baseFont(t),
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
        borderRadius: radiusOf(t, 'lg', '12px'), background: inverse, color: t.surface,
        boxShadow: '0 8px 24px rgba(10,13,18,0.25)', minWidth: 280,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: c, flexShrink: 0 }} />
      <span style={{ fontSize: 13, flex: 1 }}>
        {v.Status === 'Error' ? 'Something went wrong.' : v.Status === 'Warning' ? 'Storage almost full.' : v.Status === 'Info' ? 'A new version is available.' : 'Changes saved.'}
      </span>
      <span style={{ fontSize: 12, fontWeight: weightOf(t, 'semibold', 600), textDecoration: 'underline', cursor: 'pointer' }}>Undo</span>
      <span style={{ fontSize: 14, opacity: 0.6, cursor: 'pointer' }}>✕</span>
    </div>
  )
}

// ── Spinner (Size) ────────────────────────────────────────────────────────────

const SPINNER_SIZES: Record<string, number> = { SM: 16, MD: 24, LG: 32 }

function SpinnerSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  return <SpecimenSpinner size={SPINNER_SIZES[v.Size ?? 'MD'] ?? 24} color={t.brandSolid} track={t.neutralFill} />
}

// ── Divider (Orientation) ─────────────────────────────────────────────────────

function DividerSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  const horizontal = (v.Orientation ?? 'Horizontal') === 'Horizontal'
  return horizontal
    ? <hr style={{ width: 220, border: 'none', borderTop: `1px solid ${t.border ?? '#d0d5dd'}` }} />
    : <span style={{ display: 'inline-block', height: 64, width: 1, background: t.border ?? '#d0d5dd' }} />
}

// ── Single-variant specimens ──────────────────────────────────────────────────

function CardSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div
      style={{
        ...baseFont(t), width: 280, padding: 20,
        borderRadius: radiusOf(t, 'lg', '12px'),
        background: t.semanticMap?.['surface-1'] || t.surface,
        border: `1px solid ${t.border ?? '#d0d5dd'}`,
        boxShadow: '0 1px 2px rgba(10,13,18,0.05)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: weightOf(t, 'semibold', 600) }}>Card title</span>
      <span style={{ fontSize: 12.5, color: t.fgMuted, lineHeight: 1.5 }}>
        Supporting copy that explains the grouped content inside this surface.
      </span>
      <span style={{ fontSize: 12.5, fontWeight: weightOf(t, 'semibold', 600), color: t.brandText, cursor: 'pointer' }}>Learn more →</span>
    </div>
  )
}

function ModalSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div
      style={{
        ...baseFont(t), width: 320, borderRadius: radiusOf(t, 'lg', '12px'),
        background: t.surface, border: `1px solid ${t.border ?? '#d0d5dd'}`,
        boxShadow: '0 20px 48px rgba(10,13,18,0.25)', overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: weightOf(t, 'semibold', 600) }}>Delete project?</span>
        <span style={{ color: t.fgMuted, cursor: 'pointer' }}>✕</span>
      </div>
      <p style={{ padding: '4px 20px 16px', margin: 0, fontSize: 12.5, color: t.fgMuted, lineHeight: 1.5 }}>
        This action can't be undone. All tokens in this project will be removed.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: `1px solid ${t.border ?? '#e9eaeb'}` }}>
        <span style={{ fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.border ?? '#d0d5dd'}`, cursor: 'pointer' }}>Cancel</span>
        <span style={{ fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: radiusOf(t, 'md', '8px'), background: t.errorColor, color: t.onBrand, cursor: 'pointer' }}>Delete</span>
      </div>
    </div>
  )
}

function TooltipSpecimen({ t }: { t: PreviewTokens }) {
  const inverse = t.semanticMap?.['surface-inverse'] || t.neutralText
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ fontSize: 12, padding: '6px 10px', borderRadius: radiusOf(t, 'md', '8px'), background: inverse, color: t.surface }}>
        Copy to clipboard
      </span>
      <span style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${inverse}` }} />
    </div>
  )
}

function TabsSpecimen({ t }: { t: PreviewTokens }) {
  const tabs = ['Overview', 'Tokens', 'Usage']
  return (
    <div style={{ ...baseFont(t), display: 'flex', gap: 4, borderBottom: `1px solid ${t.border ?? '#e9eaeb'}` }}>
      {tabs.map((tab, i) => (
        <span
          key={tab}
          style={{
            fontSize: 13, padding: '8px 14px', cursor: 'pointer',
            fontWeight: i === 0 ? weightOf(t, 'semibold', 600) : 400,
            color: i === 0 ? t.brandText : t.fgMuted,
            borderBottom: i === 0 ? `2px solid ${t.brandSolid}` : '2px solid transparent',
            marginBottom: -1,
          }}
        >
          {tab}
        </span>
      ))}
    </div>
  )
}

function BreadcrumbSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <nav aria-label="Breadcrumb" style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ color: t.fgMuted, cursor: 'pointer' }}>Home</span>
      <span style={{ color: t.placeholderText }}>/</span>
      <span style={{ color: t.fgMuted, cursor: 'pointer' }}>Library</span>
      <span style={{ color: t.placeholderText }}>/</span>
      <span style={{ fontWeight: weightOf(t, 'medium', 500) }}>Design tokens</span>
    </nav>
  )
}

function ProgressSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div style={{ ...baseFont(t), width: 240, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: t.fgMuted }}>Uploading…</span>
        <span style={{ fontWeight: weightOf(t, 'medium', 500) }}>60%</span>
      </div>
      <div role="progressbar" aria-valuenow={60} aria-valuemin={0} aria-valuemax={100} style={{ height: 8, borderRadius: 999, background: t.neutralFill, overflow: 'hidden' }}>
        <div style={{ width: '60%', height: '100%', borderRadius: 999, background: t.brandSolid }} />
      </div>
    </div>
  )
}

// ── Registry + snippet builder ────────────────────────────────────────────────

export const SPECIMENS: Record<string, (p: SpecimenProps) => ReactNode> = {
  Button: ButtonSpecimen,
  Input: InputSpecimen,
  Select: SelectSpecimen,
  Checkbox: CheckboxSpecimen,
  Toggle: ToggleSpecimen,
  Badge: BadgeSpecimen,
  Avatar: AvatarSpecimen,
  Toast: ToastSpecimen,
  Spinner: SpinnerSpecimen,
  Divider: DividerSpecimen,
  Card: CardSpecimen,
  Modal: ModalSpecimen,
  Tooltip: TooltipSpecimen,
  Tabs: TabsSpecimen,
  Breadcrumb: BreadcrumbSpecimen,
  Progress: ProgressSpecimen,
}

/** Usage snippet reflecting the current axis values — interaction-only states
 *  (Hover/Pressed/Focused) map to real props only when they are (disabled/loading). */
export function snippetFor(def: ComponentDef, v: AxisValues, icons?: IconOpts): string {
  const low = (s?: string) => (s ?? '').toLowerCase().replace(/\s+/g, '-')
  // leadingIcon/trailingIcon props reflecting the icon toggles + chosen library.
  const iconProps = (key: string) => {
    const slots = ICON_SLOTS[key]
    if (!slots || !icons) return ''
    let out = ''
    if (icons.leading) out += ` leadingIcon={<${ICON_COMPONENT[slots.leading]} />}`
    if (icons.trailing) out += ` trailingIcon={<${ICON_COMPONENT[slots.trailing]} />}`
    return out
  }
  switch (def.key) {
    case 'Button': {
      const flags = `${v.State === 'Disabled' ? ' disabled' : ''}${v.State === 'Loading' ? ' loading' : ''}`
      return `<Button color="${low(v.Color) || 'brand'}" style="${low(v.Style) || 'solid'}"${flags}${iconProps('Button')}>\n  Button\n</Button>`
    }
    case 'Input': {
      const type = ({ 'default': 'text', 'e-mail': 'email', 'password': 'password', 'search': 'search', 'phone-number': 'tel', 'website': 'url' } as Record<string, string>)[low(v.Type)] ?? 'text'
      const err = v.State === 'Error' ? `\n  error="This field is required."` : ''
      return `<Input\n  type="${type}"\n  size="${low(v.Size) || 'md'}"\n  label="${INPUT_META[v.Type ?? 'Default']?.label ?? 'Label'}"${err}${v.State === 'Disabled' ? '\n  disabled' : ''}${iconProps('Input').replace(/ (\w+Icon)=/g, '\n  $1=')}\n/>`
    }
    case 'Select':
      return `<Select\n  placeholder="Select an option"\n  options={options}${v.State === 'Error' ? '\n  error="Pick one option."' : ''}${v.State === 'Disabled' ? '\n  disabled' : ''}\n/>`
    case 'Checkbox':
      return `<Checkbox${v.Checked === 'True' ? ' checked' : ''}${v.State === 'Disabled' ? ' disabled' : ''} label="Remember me" />`
    case 'Toggle':
      return `<Toggle${v.On === 'True' ? ' checked' : ''}${v.State === 'Disabled' ? ' disabled' : ''} label="Notifications" />`
    case 'Badge':
      return `<Badge color="${low(v.Color) || 'brand'}" style="${low(v.Style) || 'soft'}">\n  ${v.Color ?? 'Brand'}\n</Badge>`
    case 'Avatar':
      return `<Avatar name="Maya Duscenko" size="${low(v.Size) || 'md'}" />`
    case 'Toast':
      return `<Toast\n  status="${low(v.Status) || 'success'}"\n  message="Changes saved."\n  action={{ label: 'Undo', onClick: undo }}\n/>`
    case 'Spinner':
      return `<Spinner size="${low(v.Size) || 'md'}" label="Loading…" />`
    case 'Divider':
      return `<Divider orientation="${low(v.Orientation) || 'horizontal'}" />`
    case 'Card':
      return `<Card padding="md" shadow="sm">\n  <CardTitle>Card title</CardTitle>\n  <CardBody>…</CardBody>\n</Card>`
    case 'Modal':
      return `<Modal open title="Delete project?" onClose={close}>\n  …\n</Modal>`
    case 'Tooltip':
      return `<Tooltip content="Copy to clipboard" side="top">\n  <IconButton icon={copy} />\n</Tooltip>`
    case 'Tabs':
      return `<Tabs defaultValue="overview" items={[\n  { label: 'Overview', value: 'overview' },\n  { label: 'Tokens', value: 'tokens' },\n]} />`
    case 'Breadcrumb':
      return `<Breadcrumb items={[\n  { label: 'Home', href: '/' },\n  { label: 'Library', href: '/library' },\n  { label: 'Design tokens' },\n]} />`
    case 'Progress':
      return `<Progress value={60} label="Uploading…" showValue />`
    default:
      return `<${def.key} />`
  }
}
