// ─── Playground specimens ─────────────────────────────────────────────────────
// One live, token-driven render per catalogue component. Each specimen honors
// the variant axes exactly as the Figma plugin builds them (componentCatalogue
// `axes` — the plugin is the source of truth), so what the designer toggles
// here is what lands in Figma. All colors/radius/type resolve from PreviewTokens
// — inline styles by design (see CLAUDE.md conventions).

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import chroma from 'chroma-js'
import type { PreviewTokens } from '../../preview/ButtonPreview'
import { radiusOf, fontFamilyOf, weightOf, shadowOf, alphaOf, tintOf, paddingOf, panelStyle, sizeOf, inputSurfaceOf, focusBorderOf, statusSoftFillOf } from '../../../lib/previewTokens'
import { withAlpha } from '../../../lib/colorUtils'
import { COMPONENTS, type ComponentDef } from '../../../lib/componentCatalogue'
import { UNTITLED_CORE } from '../../../lib/iconLibraries'
import { findUntitledIcon, untitledIconMaskUrl } from '../../../lib/untitledIcons'

export type AxisValues = Record<string, string>

// ── Shared helpers ────────────────────────────────────────────────────────────

const darken = (c: string, amt: number) => {
  try { return chroma(c).darken(amt).hex() } catch { return c }
}
/** Soft tint of a hex — reads the Opacity foundation's 10 / 5 steps, so soft
 *  fills track the user's transparency scale. */
const soft = (t: PreviewTokens, hex: string) => tintOf(t, hex, '10', 0.1)
const softer = (t: PreviewTokens, hex: string) => tintOf(t, hex, '5', 0.05)

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
  `0 0 0 2px ${t.surface}, 0 0 0 4px ${withAlpha(accent, alphaOf(t, '40', 0.4))}`

/** Eases every property a State variant can change. 140ms sits in the
 *  micro-feedback band — long enough to read as a transition, short enough that
 *  the control still feels immediate under the cursor. */
const STATE_TRANSITION =
  'background 0.14s ease-out, border-color 0.14s ease-out, color 0.14s ease-out, box-shadow 0.14s ease-out'

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

// ── Icons — Untitled UI, bundled locally ─────────────────────────────────────
// Specimens render Untitled glyphs from the pre-built catalog. Concept names
// map through UNTITLED_CORE so Button/Input slots stay stable.

export type IconConcept =
  | 'star' | 'arrow' | 'search' | 'eye'
  | 'plus' | 'upload' | 'info' | 'success' | 'warning' | 'error'
  | 'home' | 'box' | 'grid' | 'image' | 'text' | 'settings' | 'palette'
  | 'bookmark' | 'heart' | 'share' | 'user' | 'users' | 'zap' | 'check'

export function iconName(_prefix: string, concept: IconConcept): string {
  return UNTITLED_CORE[concept] ?? concept
}

// PascalCase export name for copy snippets (`import SearchLg from "@untitledui/icons/SearchLg"`).
export const ICON_COMPONENT: Record<IconConcept, string> = {
  star: 'Star01', arrow: 'ArrowRight', search: 'SearchLg', eye: 'Eye',
  plus: 'Plus', upload: 'Upload01', info: 'InfoCircle', success: 'CheckCircle',
  warning: 'AlertTriangle', error: 'XCircle', home: 'Home01', box: 'Cube01',
  grid: 'Grid01', image: 'Image01', text: 'Type01', settings: 'Settings01',
  palette: 'Palette', bookmark: 'Bookmark', heart: 'Heart', share: 'Share01',
  user: 'User01', users: 'Users01', zap: 'Zap', check: 'Check',
}

/** Which components expose leading/trailing icon slots, and their default glyphs. */
export const ICON_SLOTS: Record<string, { leading: IconConcept; trailing: IconConcept }> = {
  Button: { leading: 'star', trailing: 'arrow' },
  Input: { leading: 'search', trailing: 'eye' },
}

export interface IconOpts { prefix: string; leading: boolean; trailing: boolean }

function PreviewIcon({ concept, size = 16, color }: { prefix?: string; concept: IconConcept; size?: number; color: string }) {
  const icon = findUntitledIcon(UNTITLED_CORE[concept] ?? '')
  const mask = icon ? untitledIconMaskUrl(icon) : undefined
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, display: 'inline-block', flexShrink: 0,
        backgroundColor: color,
        maskImage: mask,
        WebkitMaskImage: mask,
        maskSize: 'contain', WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center', WebkitMaskPosition: 'center',
      }}
    />
  )
}

/** A glyph resolved from the bundled Untitled UI catalog. */
export function TokenIcon({ t, concept, size = 16, color }: { t: PreviewTokens; concept: IconConcept; size?: number; color: string }) {
  return <PreviewIcon concept={concept} size={size} color={color} />
}

export interface SpecimenProps { t: PreviewTokens; v: AxisValues; icons?: IconOpts }

// ── Button (Color × Style × State) ────────────────────────────────────────────

// Button size scale — heights resolve from the Sizes foundation (sm–xl), so
// editing Foundations · Sizes retunes every button size live.
const BUTTON_SIZE_SPECS: Record<string, { sizeKey: string; h: number; f: number; padX: number; icon: number; gap: number }> = {
  SM: { sizeKey: 'sm', h: 32, f: 13, padX: 14, icon: 14, gap: 6 },
  MD: { sizeKey: 'md', h: 40, f: 14, padX: 18, icon: 16, gap: 8 },
  LG: { sizeKey: 'lg', h: 48, f: 15, padX: 22, icon: 18, gap: 8 },
  XL: { sizeKey: 'xl', h: 56, f: 16, padX: 26, icon: 20, gap: 10 },
}

function ButtonSpecimen({ t, v, icons }: SpecimenProps) {
  const color = statusColor(t, v.Color === 'Danger' ? 'Error' : (v.Color ?? 'Brand'))
  const style = v.Style ?? 'Solid'
  const state = v.State ?? 'Default'
  const sz = BUTTON_SIZE_SPECS[v.Size ?? 'MD'] ?? BUTTON_SIZE_SPECS.MD
  const disabled = state === 'Disabled'
  const loading = state === 'Loading'
  const slots = ICON_SLOTS.Button

  let bg = 'transparent'
  let fg = color
  let border = 'transparent'
  if (style === 'Solid') { bg = color; fg = t.onBrand }
  else if (style === 'Outline') { border = color + '99' }
  else if (style === 'Soft') { bg = soft(t, color) }

  if (state === 'Hover') {
    if (style === 'Solid') bg = darken(color, 0.4)
    else bg = style === 'Soft' ? color + '2b' : soft(t, color)
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
        display: 'inline-flex', alignItems: 'center', gap: sz.gap,
        height: sizeOf(t, sz.sizeKey, sz.h), padding: `0 ${sz.padX}px`,
        borderRadius: radiusOf(t, 'md', '8px'),
        background: bg, color: fg,
        border: `1px solid ${border}`,
        fontSize: sz.f, fontWeight: weightOf(t, 'semibold', 600),
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: state === 'Focused' ? focusRing(t, color) : undefined,
        // Eases the state change instead of snapping. Matters in two places at
        // once: the collage, where `Live` drives State from a real hover, and
        // the docs playground, where flipping the State dropdown now shows the
        // delta between two variants rather than a hard cut.
        transition: STATE_TRANSITION,
      }}
    >
      {loading && <SpecimenSpinner size={sz.icon - 2} color={fg} track={fg + '33'} />}
      {!loading && icons?.leading && <PreviewIcon prefix={icons.prefix} concept={slots.leading} size={sz.icon} color={fg} />}
      Button
      {icons?.trailing && <PreviewIcon prefix={icons.prefix} concept={slots.trailing} size={sz.icon} color={fg} />}
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
  const accent = error ? t.errorColor : focusBorderOf(t)
  const border =
    error ? t.errorColor
    : state === 'Focused' ? focusBorderOf(t)
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
          background: disabled ? t.disabledBg : inputSurfaceOf(t),
          boxShadow: state === 'Focused' ? `0 0 0 3px ${accent}26` : undefined,
        }}
      >
        {icons?.leading && <PreviewIcon prefix={icons.prefix} concept={slots.leading} size={16} color={iconColor} />}
        {meta.prefix && <span style={{ fontSize: 13, color: t.fgMuted, borderRight: `1px solid ${t.border}`, paddingRight: 8 }}>{meta.prefix}</span>}
        {!icons?.leading && meta.lead && <span style={{ fontSize: 14, color: t.placeholderText }}>{meta.lead}</span>}
        <span style={{ fontSize: 13, flex: 1, color: state === 'Filled' ? t.neutralText : (disabled ? t.disabledText : t.placeholderText) }}>
          {state === 'Filled' ? (v.Type === 'E-Mail' ? 'maya@escala.ds' : 'Maya Duscenko') : meta.placeholder}
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

const SELECT_SIZE_SPECS: Record<string, { sizeKey: string; h: number; f: number }> = {
  SM: { sizeKey: 'sm', h: 32, f: 12.5 },
  MD: { sizeKey: 'md', h: 40, f: 13 },
  LG: { sizeKey: 'lg', h: 48, f: 14 },
}

function SelectSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  const state = v.State ?? 'Default'
  const disabled = state === 'Disabled'
  const error = state === 'Error'
  const sz = SELECT_SIZE_SPECS[v.Size ?? 'MD'] ?? SELECT_SIZE_SPECS.MD
  const accent = error ? t.errorColor : focusBorderOf(t)
  const border =
    error ? t.errorColor
    : state === 'Focused' ? focusBorderOf(t)
    : state === 'Hover' ? (t.fgMuted ?? '#717680')
    : (t.border ?? '#d0d5dd')
  return (
    <div
      style={{
        ...baseFont(t),
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: 240, height: sizeOf(t, sz.sizeKey, sz.h), padding: '0 12px',
        borderRadius: radiusOf(t, 'md', '8px'),
        border: `1px solid ${border}`,
        background: disabled ? t.disabledBg : inputSurfaceOf(t),
        boxShadow: state === 'Focused' ? `0 0 0 3px ${accent}26` : undefined,
        fontSize: sz.f, color: disabled ? t.disabledText : t.placeholderText,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: STATE_TRANSITION,
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
  const small = (v.Size ?? 'MD') === 'SM'
  const box = small ? 15 : 18
  const fill = disabled ? t.disabledBg : checked ? t.brandSolid : t.surface
  const line = disabled ? t.disabledBg : checked ? t.brandSolid : state === 'Hover' ? t.brandSolid : (t.border ?? '#d0d5dd')
  return (
    <label style={{ ...baseFont(t), display: 'inline-flex', alignItems: 'center', gap: small ? 8 : 10, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <span
        style={{
          width: box, height: box, borderRadius: radiusOf(t, 'sm', '4px'),
          background: fill, border: `1.5px solid ${line}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: state === 'Focused' ? focusRing(t, t.brandSolid) : undefined,
          transition: STATE_TRANSITION,
        }}
      >
        {checked && (
          <svg width={small ? 9 : 11} height={small ? 9 : 11} viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.7 9.5 3.4" stroke={disabled ? t.disabledText : t.onBrand} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </span>
      <span style={{ fontSize: small ? 13 : 14, color: disabled ? t.disabledText : t.neutralText }}>Remember me</span>
    </label>
  )
}

// ── Toggle (On × State) ───────────────────────────────────────────────────────

function ToggleSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  const on = (v.On ?? 'True') === 'True'
  const state = v.State ?? 'Default'
  const disabled = state === 'Disabled'
  const small = (v.Size ?? 'MD') === 'SM'
  const trackW = small ? 32 : 40
  const trackH = small ? 18 : 22
  const knob = trackH - 4
  const track = disabled ? t.disabledBg : on ? (state === 'Hover' ? darken(t.brandSolid, 0.4) : t.brandSolid) : (state === 'Hover' ? darken(t.neutralFill, 0.3) : t.neutralFill)
  return (
    <label style={{ ...baseFont(t), display: 'inline-flex', alignItems: 'center', gap: small ? 8 : 10, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <span
        role="switch"
        aria-checked={on}
        style={{
          width: trackW, height: trackH, borderRadius: 999, background: track, position: 'relative',
          transition: STATE_TRANSITION,
          boxShadow: state === 'Focused' ? focusRing(t, t.brandSolid) : undefined,
          display: 'inline-block',
        }}
      >
        <span
          style={{
            position: 'absolute', top: 2, left: on ? trackW - knob - 2 : 2, width: knob, height: knob,
            borderRadius: 999, background: '#ffffff',
            boxShadow: '0 1px 2px rgba(10,13,18,0.2)', transition: 'left 0.15s',
          }}
        />
      </span>
      <span style={{ fontSize: small ? 13 : 14, color: disabled ? t.disabledText : t.neutralText }}>Notifications</span>
    </label>
  )
}

// ── Badge (Style × Color) ─────────────────────────────────────────────────────

const BADGE_SIZE_SPECS: Record<string, { pad: string; f: number; dot: number; gap: number }> = {
  SM: { pad: '2px 8px', f: 11, dot: 5, gap: 5 },
  MD: { pad: '3px 10px', f: 12, dot: 6, gap: 6 },
  LG: { pad: '4px 12px', f: 13, dot: 7, gap: 7 },
}

function BadgeSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  const c = statusColor(t, v.Color ?? 'Brand')
  const style = v.Style ?? 'Soft'
  const isNeutral = (v.Color ?? 'Brand') === 'Neutral'
  const sz = BADGE_SIZE_SPECS[v.Size ?? 'MD'] ?? BADGE_SIZE_SPECS.MD
  let bg = 'transparent'; let fg = c; let line = 'transparent'
  if (style === 'Solid') { bg = c; fg = t.onBrand }
  else if (style === 'Soft') { bg = isNeutral ? t.neutralFill : statusSoftFillOf(t, v.Color ?? 'Brand', c); fg = isNeutral ? (t.fgMuted ?? c) : c }
  else { line = c + '99' }
  return (
    <span
      style={{
        ...baseFont(t),
        display: 'inline-flex', alignItems: 'center', gap: sz.gap, padding: sz.pad,
        borderRadius: 999, background: bg, color: fg, border: `1px solid ${line}`,
        fontSize: sz.f, fontWeight: weightOf(t, 'medium', 500),
      }}
    >
      <span style={{ width: sz.dot, height: sz.dot, borderRadius: 999, background: style === 'Solid' ? t.onBrand : c }} />
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
        background: soft(t, t.brandSolid), color: t.brandText,
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
  // An "inverse" chip wants a background that's ALWAYS legible against
  // `color: t.surface` (the page colour, used as ink below) — which is
  // exactly what `neutralText` already guarantees in every theme, since it's
  // the tone the system solved specifically to read on the page. Reusing that
  // pairing (invert it: text colour becomes the chip's fill) is self-
  // consistent by construction in both directions.
  //
  // This used to reach for `background-overlay` — a MODAL SCRIM role (see
  // semanticRoles.ts), not a card surface. It happens to look right in light
  // mode (scrim = near-black, same as neutralText there) but breaks in dark:
  // `recDarkTone` deliberately INVERTS the scrim so it stays near-black in
  // both themes (a scrim has to darken the backdrop either way) — which means
  // in dark mode it lands within a few tones of `darkBackground`, i.e. nearly
  // the page's own colour. Paired with `color: t.surface` (dark mode's near-
  // black page), the toast became a near-black chip with near-black text on a
  // near-black page — unreadable, and barely visible as its own surface.
  const inverse = t.neutralText
  return (
    <div
      style={{
        ...baseFont(t),
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
        borderRadius: radiusOf(t, 'lg', '12px'), background: inverse, color: t.surface,
        boxShadow: shadowOf(t, 'xl', '0 8px 24px rgba(10,13,18,0.25)'), minWidth: 280,
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
    ? <hr style={{ width: 220, border: 'none', borderTop: `1px solid ${t.borderDefault ?? '#e9eaeb'}` }} />
    : <span style={{ display: 'inline-block', height: 64, width: 1, background: t.borderDefault ?? '#e9eaeb' }} />
}

// ── Single-variant specimens ──────────────────────────────────────────────────

function CardSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div
      style={{
        ...baseFont(t), width: 280, padding: paddingOf(t),
        borderRadius: radiusOf(t, 'lg', '12px'),
        ...panelStyle(t, t.neutralFill || t.surface),
        border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`,
        boxShadow: shadowOf(t, 'sm', '0 1px 2px rgba(10,13,18,0.05)'),
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
        background: t.surface, border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`,
        boxShadow: shadowOf(t, '2xl', '0 20px 48px rgba(10,13,18,0.25)'), overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: weightOf(t, 'semibold', 600) }}>Delete project?</span>
        <span style={{ color: t.fgMuted, cursor: 'pointer' }}>✕</span>
      </div>
      <p style={{ padding: '4px 20px 16px', margin: 0, fontSize: 12.5, color: t.fgMuted, lineHeight: 1.5 }}>
        This action can't be undone. All tokens in this project will be removed.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: `1px solid ${t.borderDefault ?? '#e9eaeb'}` }}>
        <span style={{ fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.border ?? '#d0d5dd'}`, cursor: 'pointer' }}>Cancel</span>
        <span style={{ fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: radiusOf(t, 'md', '8px'), background: t.errorColor, color: t.onBrand, cursor: 'pointer' }}>Delete</span>
      </div>
    </div>
  )
}

function TooltipSpecimen({ t }: { t: PreviewTokens }) {
  // See ToastSpecimen's note — same inverse-chip pairing, same dark-mode fix
  // (was `background-overlay`, a modal scrim that goes near-black in BOTH
  // themes and nearly matched the dark page, making this unreadable there).
  const inverse = t.neutralText
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
    <div style={{ ...baseFont(t), display: 'flex', gap: 4, borderBottom: `1px solid ${t.borderDefault ?? '#e9eaeb'}` }}>
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

// ── Button & Actions — attached / icon-only / floating / provider buttons ─────

const BUTTON_GROUP_SIZE_SPECS: Record<string, { sizeKey: string; h: number; padX: number; f: number }> = {
  SM: { sizeKey: 'sm', h: 32, padX: 12, f: 12.5 },
  MD: { sizeKey: 'md', h: 40, padX: 16, f: 13 },
  LG: { sizeKey: 'lg', h: 48, padX: 20, f: 14 },
}

function ButtonGroupSpecimen({ t, v }: SpecimenProps) {
  const items = ['Day', 'Week', 'Month']
  const sz = BUTTON_GROUP_SIZE_SPECS[v.Size ?? 'MD'] ?? BUTTON_GROUP_SIZE_SPECS.MD
  return (
    <div role="group" style={{ ...baseFont(t), display: 'inline-flex', border: `1px solid ${t.border ?? '#d0d5dd'}`, borderRadius: radiusOf(t, 'md', '8px'), overflow: 'hidden' }}>
      {items.map((label, i) => (
        <span
          key={label}
          style={{
            display: 'inline-flex', alignItems: 'center', height: sizeOf(t, sz.sizeKey, sz.h) - 2,
            padding: `0 ${sz.padX}px`, fontSize: sz.f, fontWeight: weightOf(t, 'medium', 500), cursor: 'pointer',
            background: i === 1 ? t.neutralFill : t.surface,
            color: t.neutralText,
            borderLeft: i === 0 ? 'none' : `1px solid ${t.border ?? '#d0d5dd'}`,
          }}
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function CloseButtonSpecimen({ t, v }: SpecimenProps) {
  const d = (v.Size ?? 'MD') === 'SM' ? 24 : 32
  const state = v.State ?? 'Default'
  return (
    <button
      type="button"
      aria-label="Close"
      style={{
        width: d, height: d, borderRadius: radiusOf(t, 'md', '8px'), border: 'none', cursor: 'pointer',
        background: state === 'Hover' ? t.neutralFill : 'transparent',
        color: t.fgMuted, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: state === 'Focused' ? focusRing(t, t.brandSolid) : undefined,
      }}
    >
      <svg width={d * 0.44} height={d * 0.44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
    </button>
  )
}

function FABButtonSpecimen({ t, v }: SpecimenProps) {
  const d = (v.Size ?? 'MD') === 'LG' ? 56 : 48
  return (
    <button
      type="button"
      aria-label="New item"
      style={{
        width: d, height: d, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: t.brandSolid, color: t.onBrand,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: shadowOf(t, 'lg', '0 8px 20px rgba(10,13,18,0.22)'),
      }}
    >
      <svg width={d * 0.42} height={d * 0.42} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
    </button>
  )
}

const PROVIDER_MARKS: Record<string, { glyph: string; color: string }> = {
  Google: { glyph: 'G', color: '#4285f4' },
  Apple: { glyph: '', color: '#111111' },
  GitHub: { glyph: '', color: '#111111' },
  Figma: { glyph: 'F', color: '#a259ff' },
}

function SocialLoginButtonSpecimen({ t, v }: SpecimenProps) {
  const provider = v.Provider ?? 'Google'
  const mark = PROVIDER_MARKS[provider] ?? PROVIDER_MARKS.Google
  const large = (v.Size ?? 'MD') === 'LG'
  return (
    <button
      type="button"
      style={{
        ...baseFont(t),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: large ? 320 : 280, height: large ? sizeOf(t, 'lg', 48) : sizeOf(t, 'md', 40) + 2,
        borderRadius: radiusOf(t, 'md', '8px'),
        background: t.surface, border: `1px solid ${t.border ?? '#d0d5dd'}`, cursor: 'pointer',
        fontSize: large ? 15 : 14, fontWeight: weightOf(t, 'semibold', 600),
      }}
    >
      {provider === 'GitHub' ? (
        <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>
      ) : provider === 'Apple' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.47 7.82 1.31 10.38.87 1.25 1.9 2.66 3.26 2.61 1.31-.05 1.8-.85 3.38-.85 1.58 0 2.02.85 3.4.82 1.41-.02 2.3-1.27 3.16-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.73-1.05-2.76-4.17ZM14.44 4.9c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.29.69-3.03 1.56-.67.77-1.25 2-1.09 3.19 1.15.09 2.33-.59 3.05-1.46Z" /></svg>
      ) : (
        <span style={{ color: mark.color, fontWeight: 700, fontSize: 15, lineHeight: 1 }}>{mark.glyph}</span>
      )}
      Continue with {provider}
    </button>
  )
}

function TextLinkSpecimen({ t, v }: SpecimenProps) {
  const state = v.State ?? 'Default'
  const disabled = state === 'Disabled'
  return (
    <span style={{ ...baseFont(t), fontSize: 14 }}>
      Read the{' '}
      <a
        href="#docs"
        aria-disabled={disabled}
        onClick={(e) => e.preventDefault()}
        style={{
          color: disabled ? t.disabledText : t.brandText,
          fontWeight: weightOf(t, 'medium', 500),
          textDecoration: state === 'Hover' ? 'underline' : 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        design tokens guide ↗
      </a>
    </span>
  )
}

function AppStoreBadgeSpecimen({ t, v }: SpecimenProps) {
  const play = (v.Store ?? 'App Store') === 'Google Play'
  return (
    <a
      href="#store"
      onClick={(e) => e.preventDefault()}
      aria-label={play ? 'Get it on Google Play' : 'Download on the App Store'}
      style={{
        ...baseFont(t),
        display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px',
        borderRadius: radiusOf(t, 'md', '8px'), background: '#111111', color: '#ffffff',
        textDecoration: 'none', border: '1px solid #2a2a2a',
      }}
    >
      {play ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M4 3.5v17c0 .3.34.5.6.33l13.9-8.16a.4.4 0 0 0 0-.7L4.6 3.17a.4.4 0 0 0-.6.33Z" /></svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.47 7.82 1.31 10.38.87 1.25 1.9 2.66 3.26 2.61 1.31-.05 1.8-.85 3.38-.85 1.58 0 2.02.85 3.4.82 1.41-.02 2.3-1.27 3.16-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.73-1.05-2.76-4.17ZM14.44 4.9c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.29.69-3.03 1.56-.67.77-1.25 2-1.09 3.19 1.15.09 2.33-.59 3.05-1.46Z" /></svg>
      )}
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ fontSize: 9, opacity: 0.8 }}>{play ? 'GET IT ON' : 'Download on the'}</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{play ? 'Google Play' : 'App Store'}</span>
      </span>
    </a>
  )
}

// ── Form Controls — grouped inputs, choices and upload targets ────────────────

function InputGroupSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div style={{ ...baseFont(t), display: 'flex', width: 300, height: 40, borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.border ?? '#d0d5dd'}`, overflow: 'hidden' }}>
      <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 13, color: t.fgMuted, background: t.neutralFill, borderRight: `1px solid ${t.border ?? '#d0d5dd'}` }}>https://</span>
      <span style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 13, background: inputSurfaceOf(t), color: t.neutralText }}>escala.design</span>
      <span style={{ display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 13, fontWeight: weightOf(t, 'semibold', 600), background: inputSurfaceOf(t), color: t.brandText, borderLeft: `1px solid ${t.border ?? '#d0d5dd'}`, cursor: 'pointer' }}>Copy</span>
    </div>
  )
}

function TextareaSpecimen({ t, v }: SpecimenProps) {
  const state = v.State ?? 'Default'
  const disabled = state === 'Disabled'
  const error = state === 'Error'
  const focus = error ? t.errorColor : focusBorderOf(t)
  const border = error ? t.errorColor : state === 'Focused' ? focusBorderOf(t) : (t.border ?? '#d0d5dd')
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', gap: 6, width: 280 }}>
      <span style={{ fontSize: 12, fontWeight: weightOf(t, 'medium', 500), color: disabled ? t.disabledText : t.neutralText }}>Description</span>
      <div
        style={{
          minHeight: 88, padding: '10px 12px', borderRadius: radiusOf(t, 'md', '8px'),
          border: `1px solid ${border}`, background: disabled ? t.disabledBg : inputSurfaceOf(t),
          fontSize: 13, lineHeight: 1.5, color: disabled ? t.disabledText : t.placeholderText,
          boxShadow: state === 'Focused' ? `0 0 0 3px ${focus}26` : undefined,
        }}
      >
        Tell us about your design system…
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: error ? t.errorColor : t.fgMuted }}>
        <span>{error ? 'Description is required.' : 'Max 200 characters.'}</span>
        <span>0/200</span>
      </div>
    </div>
  )
}

const OTP_SIZE_SPECS: Record<string, { w: number; h: number; f: number; gap: number }> = {
  SM: { w: 34, h: 40, f: 16, gap: 6 },
  MD: { w: 40, h: 48, f: 18, gap: 8 },
  LG: { w: 46, h: 56, f: 20, gap: 10 },
}

function InputOTPSpecimen({ t, v }: SpecimenProps) {
  const state = v.State ?? 'Default'
  const filled = state === 'Filled'
  const error = state === 'Error'
  const sz = OTP_SIZE_SPECS[v.Size ?? 'MD'] ?? OTP_SIZE_SPECS.MD
  const code = '824913'
  return (
    <div style={{ display: 'flex', gap: sz.gap }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          style={{
            ...baseFont(t),
            width: sz.w, height: sz.h, borderRadius: radiusOf(t, 'md', '8px'),
            border: `1.5px solid ${error ? t.errorColor : filled || i > 0 ? (t.border ?? '#d0d5dd') : t.brandSolid}`,
            background: t.surface, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: sz.f, fontWeight: weightOf(t, 'semibold', 600),
            boxShadow: !filled && !error && i === 0 ? `0 0 0 3px ${t.brandSolid}26` : undefined,
          }}
        >
          {filled || error ? code[i] : i === 0 ? '' : ''}
        </span>
      ))}
    </div>
  )
}

function InputStepperSpecimen({ t }: { t: PreviewTokens }) {
  const btn: CSSProperties = {
    width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, color: t.fgMuted, cursor: 'pointer', background: t.surface,
  }
  return (
    <div style={{ ...baseFont(t), display: 'flex', height: 40, borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.border ?? '#d0d5dd'}`, overflow: 'hidden' }}>
      <span role="button" aria-label="Decrease" style={{ ...btn, borderRight: `1px solid ${t.border ?? '#d0d5dd'}` }}>−</span>
      <span style={{ width: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: weightOf(t, 'medium', 500), background: t.surface }}>12</span>
      <span role="button" aria-label="Increase" style={{ ...btn, borderLeft: `1px solid ${t.border ?? '#d0d5dd'}` }}>+</span>
    </div>
  )
}

function InputTagSpecimen({ t }: { t: PreviewTokens }) {
  const tags = ['tokens', 'figma']
  return (
    <div style={{ ...baseFont(t), display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, width: 300, minHeight: 40, padding: '6px 10px', borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.border ?? '#d0d5dd'}`, background: t.surface }}>
      {tags.map((tag) => (
        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 999, background: soft(t, t.brandSolid), color: t.brandText, fontSize: 12, fontWeight: weightOf(t, 'medium', 500) }}>
          {tag}
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ cursor: 'pointer' }} aria-label={`Remove ${tag}`}><path d="M18 6 6 18M6 6l12 12" /></svg>
        </span>
      ))}
      <span style={{ fontSize: 13, color: t.placeholderText }}>Add a tag…</span>
    </div>
  )
}

function ComboboxSpecimen({ t, v }: SpecimenProps) {
  const open = (v.State ?? 'Default') === 'Open'
  const options = ['Inter', 'Poppins', 'Sora']
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', width: 240 }}>
      <div
        role="combobox"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px',
          borderRadius: radiusOf(t, 'md', '8px'),
          border: `1px solid ${open ? t.brandSolid : (t.border ?? '#d0d5dd')}`, background: t.surface,
          boxShadow: open ? `0 0 0 3px ${t.brandSolid}26` : undefined,
        }}
      >
        <span style={{ flex: 1, fontSize: 13, color: open ? t.neutralText : t.placeholderText }}>{open ? 'Po' : 'Search fonts…'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.fgMuted} strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
      </div>
      {open && (
        <div style={{ marginTop: 4, borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, boxShadow: shadowOf(t, 'lg', '0 8px 24px rgba(10,13,18,0.12)'), padding: 4 }}>
          {options.map((o, i) => (
            <span key={o} style={{ display: 'block', padding: '7px 10px', borderRadius: radiusOf(t, 'sm', '4px'), fontSize: 13, background: i === 1 ? soft(t, t.brandSolid) : 'transparent', color: i === 1 ? t.brandText : t.neutralText, fontWeight: i === 1 ? weightOf(t, 'medium', 500) : 400, cursor: 'pointer' }}>
              {o}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function CheckRow({ t, checked, children }: { t: PreviewTokens; checked?: boolean; children: ReactNode }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <span style={{ width: 18, height: 18, borderRadius: radiusOf(t, 'sm', '4px'), background: checked ? t.brandSolid : t.surface, border: `1.5px solid ${checked ? t.brandSolid : (t.border ?? '#d0d5dd')}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {checked && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.7 9.5 3.4" stroke={t.onBrand} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      <span style={{ fontSize: 14, color: t.neutralText }}>{children}</span>
    </label>
  )
}

function CheckboxGroupSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <fieldset style={{ ...baseFont(t), border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <legend style={{ fontSize: 12, fontWeight: weightOf(t, 'medium', 500), color: t.fgMuted, marginBottom: 8, padding: 0 }}>Notify me about</legend>
      <CheckRow t={t} checked>Comments on my files</CheckRow>
      <CheckRow t={t} checked>New team members</CheckRow>
      <CheckRow t={t}>Weekly digest</CheckRow>
    </fieldset>
  )
}

function RadioDot({ t, checked, disabled, focused, d = 18 }: { t: PreviewTokens; checked: boolean; disabled?: boolean; focused?: boolean; d?: number }) {
  return (
    <span
      style={{
        width: d, height: d, borderRadius: 999, flexShrink: 0,
        border: `1.5px solid ${disabled ? t.disabledBg : checked ? t.brandSolid : (t.border ?? '#d0d5dd')}`,
        background: disabled ? t.disabledBg : t.surface,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: focused ? focusRing(t, t.brandSolid) : undefined,
      }}
    >
      {checked && <span style={{ width: Math.round(d / 2), height: Math.round(d / 2), borderRadius: 999, background: disabled ? t.disabledText : t.brandSolid }} />}
    </span>
  )
}

function RadioSpecimen({ t, v }: SpecimenProps) {
  const checked = (v.Checked ?? 'True') === 'True'
  const state = v.State ?? 'Default'
  const disabled = state === 'Disabled'
  const small = (v.Size ?? 'MD') === 'SM'
  return (
    <label style={{ ...baseFont(t), display: 'inline-flex', alignItems: 'center', gap: small ? 8 : 10, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <RadioDot t={t} checked={checked} disabled={disabled} focused={state === 'Focused'} d={small ? 15 : 18} />
      <span style={{ fontSize: small ? 13 : 14, color: disabled ? t.disabledText : t.neutralText }}>Monthly billing</span>
    </label>
  )
}

function RadioGroupSpecimen({ t }: { t: PreviewTokens }) {
  const options = [
    { label: 'Monthly billing', checked: true },
    { label: 'Yearly billing — save 20%', checked: false },
    { label: 'Lifetime', checked: false },
  ]
  return (
    <fieldset role="radiogroup" style={{ ...baseFont(t), border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <legend style={{ fontSize: 12, fontWeight: weightOf(t, 'medium', 500), color: t.fgMuted, marginBottom: 8, padding: 0 }}>Billing period</legend>
      {options.map((o) => (
        <label key={o.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <RadioDot t={t} checked={o.checked} />
          <span style={{ fontSize: 14, color: t.neutralText }}>{o.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

function MiniSwitch({ t, on }: { t: PreviewTokens; on: boolean }) {
  return (
    <span role="switch" aria-checked={on} style={{ width: 36, height: 20, borderRadius: 999, background: on ? t.brandSolid : t.neutralFill, position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: 999, background: '#ffffff', boxShadow: '0 1px 2px rgba(10,13,18,0.2)' }} />
    </span>
  )
}

function SwitchGroupSpecimen({ t }: { t: PreviewTokens }) {
  const rows = [
    { label: 'Email notifications', on: true },
    { label: 'Push notifications', on: true },
    { label: 'Marketing emails', on: false },
  ]
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', gap: 12, width: 260 }}>
      <span style={{ fontSize: 12, fontWeight: weightOf(t, 'medium', 500), color: t.fgMuted }}>Notifications</span>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 14, color: t.neutralText }}>{r.label}</span>
          <MiniSwitch t={t} on={r.on} />
        </div>
      ))}
    </div>
  )
}

// Really draggable. Its value is LOCAL and drives nothing outside the specimen
// — same contract as the Checkbox labelled "Remember me", which remembers
// nothing: the label is sample copy, the component is the subject. Dragging is
// what proves the track/fill/thumb tokens hold at every value rather than only
// at the one hardcoded percentage, and the readout is the slider's own number,
// so it can't lie.
const SLIDER_DEFAULT = 60

function SliderSpecimen({ t }: { t: PreviewTokens }) {
  // Starts at 0 and animates up to SLIDER_DEFAULT on mount — "step entry"
  // motion (see CLAUDE.md's design principles), not decoration: it's what
  // tells you this IS a live control the instant the panel opens, before
  // anyone has touched it. `entered` gates a SEPARATE, slower transition for
  // that one reveal; every interaction after it (drag, keyboard, click-to-
  // jump) keeps the fast 0.12s the rest of the specimen already used, so the
  // reveal doesn't leave the control feeling sluggish to actually use.
  const [value, setValue] = useState(0)
  const [entered, setEntered] = useState(false)
  const [drag, setDrag] = useState(false)
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion() ?? false

  useEffect(() => {
    if (reduce) { setValue(SLIDER_DEFAULT); setEntered(true); return }
    // Double rAF: committing the 0% frame and the SLIDER_DEFAULT frame in the
    // same tick (a plain `useEffect` can run before the browser has painted
    // the initial 0%) gives the CSS transition nothing to interpolate FROM —
    // it just snaps. Two frames guarantee the 0% frame is actually on screen
    // before the target value is set. Both ids are cancelled on unmount so a
    // fast tab-switch away mid-reveal can't call setState on an unmounted
    // specimen.
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setValue(SLIDER_DEFAULT))
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [reduce])

  const setFromX = (clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setValue(Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100))))
  }

  // Pointer capture on the TRACK, with move/up on the window: a drag that
  // leaves the 6px-tall track (which is most of them) has to keep tracking, or
  // the thumb drops the moment your finger strays vertically.
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    setDrag(true)
    setFromX(e.clientX)
    const move = (ev: PointerEvent) => setFromX(ev.clientX)
    const up = () => {
      setDrag(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const active = drag || hover || focus
  return (
    <div style={{ ...baseFont(t), width: 260, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: t.fgMuted }}>Border radius</span>
        {/* Tabular so the number doesn't jitter the row width as it changes. */}
        <span style={{ fontWeight: weightOf(t, 'medium', 500), fontVariantNumeric: 'tabular-nums' }}>{value}%</span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        aria-label="Border radius"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 1
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setValue((n) => Math.min(100, n + step)) }
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setValue((n) => Math.max(0, n - step)) }
          else if (e.key === 'Home') { e.preventDefault(); setValue(0) }
          else if (e.key === 'End') { e.preventDefault(); setValue(100) }
        }}
        style={{
          position: 'relative', height: 6, borderRadius: 999, background: t.neutralFill,
          // Padding-free hit area: 6px is under every touch-target guideline, so
          // the row above and below the track is claimed with a transparent
          // border-box rather than by making the visible track fatter.
          boxSizing: 'content-box', borderTop: '9px solid transparent', borderBottom: '9px solid transparent',
          backgroundClip: 'content-box',
          cursor: drag ? 'grabbing' : 'grab', outline: 'none', touchAction: 'none',
        }}
      >
        <span
          onTransitionEnd={(e) => { if (e.propertyName === 'width' && !entered) setEntered(true) }}
          style={{
            position: 'absolute', left: 0, width: `${value}%`, height: '100%', borderRadius: 999, background: t.brandSolid,
            // No transition while dragging — a fill that eases behind the cursor
            // reads as lag, not polish. Keyboard steps and click-to-jump ease at
            // the fast 0.12s; the ONE reveal on mount gets 0.5s instead, slow
            // enough to actually read as a fill sweeping in rather than a snap
            // — `entered` flips true (via onTransitionEnd, above) the moment
            // that sweep completes, so it can never fire again on a later drag.
            // `reduce` always wins: prefers-reduced-motion means the mount
            // jumps straight to SLIDER_DEFAULT with no animation at all, not a
            // shorter one.
            transition: drag || reduce ? 'none' : !entered ? 'width 0.5s ease-out' : 'width 0.12s ease-out',
          }}
        />
        <span style={{
          position: 'absolute', left: `${value}%`, top: '50%',
          // Scale lives in the same transform as the centering translate, so the
          // thumb grows from its middle instead of drifting right as it grows.
          transform: `translate(-50%, -50%) scale(${drag ? 1.15 : active ? 1.08 : 1})`,
          width: 18, height: 18, borderRadius: 999, background: '#ffffff',
          border: `2px solid ${t.brandSolid}`,
          boxShadow: focus ? focusRing(t, t.brandSolid) : '0 1px 3px rgba(10,13,18,0.25)',
          // Travels WITH the fill during the reveal (same 0.5s), so the thumb
          // doesn't teleport to 60% while the bar is still sweeping toward it.
          // Scale/shadow keep their own fast transition even here — those are
          // hover/focus/press cues, unrelated to the mount reveal.
          transition: drag
            ? 'transform 0.12s ease-out, box-shadow 0.12s ease-out'
            : reduce
            ? 'transform 0.12s ease-out, box-shadow 0.12s ease-out'
            : !entered
            ? 'left 0.5s ease-out, transform 0.12s ease-out, box-shadow 0.12s ease-out'
            : 'left 0.12s ease-out, transform 0.12s ease-out, box-shadow 0.12s ease-out',
        }} />
      </div>
    </div>
  )
}

function FileUploadSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', gap: 10, width: 300 }}>
      <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.border ?? '#d0d5dd'}`, background: t.surface, fontSize: 13, fontWeight: weightOf(t, 'semibold', 600), cursor: 'pointer' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" x2="12" y1="2" y2="15" /></svg>
        Upload file
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.brandText, background: soft(t, t.brandSolid), padding: '3px 6px', borderRadius: radiusOf(t, 'sm', '4px') }}>PDF</span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: t.neutralText, fontWeight: weightOf(t, 'medium', 500) }}>brand-guide.pdf</span>
            <span style={{ color: t.fgMuted }}>80%</span>
          </div>
          <div style={{ height: 5, borderRadius: 999, background: t.neutralFill }}>
            <div style={{ width: '80%', height: '100%', borderRadius: 999, background: t.brandSolid }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function DropzoneSpecimen({ t, v }: SpecimenProps) {
  const state = v.State ?? 'Default'
  const active = state === 'Dragging'
  const error = state === 'Error'
  const line = error ? t.errorColor : active ? t.brandSolid : (t.border ?? '#d0d5dd')
  return (
    <div
      style={{
        ...baseFont(t),
        width: 300, padding: '28px 20px', borderRadius: radiusOf(t, 'lg', '12px'),
        border: `1.5px dashed ${line}`,
        background: active ? softer(t, t.brandSolid) : error ? softer(t, t.errorColor) : t.surface,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
        transition: STATE_TRANSITION,
      }}
    >
      <span style={{ width: 40, height: 40, borderRadius: 999, background: error ? soft(t, t.errorColor) : soft(t, t.brandSolid), color: error ? t.errorColor : t.brandText, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" x2="12" y1="2" y2="15" /></svg>
      </span>
      <span style={{ fontSize: 13 }}>
        <span style={{ fontWeight: weightOf(t, 'semibold', 600), color: t.brandText }}>Click to upload</span> or drag and drop
      </span>
      <span style={{ fontSize: 11.5, color: error ? t.errorColor : t.fgMuted }}>
        {error ? 'File exceeds the 10MB limit.' : 'SVG, PNG or PDF (max. 10MB)'}
      </span>
    </div>
  )
}

function FieldSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', gap: 6, width: 260 }}>
      <span style={{ fontSize: 12, fontWeight: weightOf(t, 'medium', 500) }}>
        Workspace name <span style={{ color: t.errorColor }}>*</span>
      </span>
      <div style={{ display: 'flex', alignItems: 'center', height: 40, padding: '0 12px', borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.border ?? '#d0d5dd'}`, background: t.surface, fontSize: 13, color: t.placeholderText }}>
        Acme Inc.
      </div>
      <span style={{ fontSize: 11, color: t.fgMuted }}>Shown to your teammates.</span>
    </div>
  )
}

function LabelSpecimen({ t, v }: SpecimenProps) {
  const required = (v.Required ?? 'False') === 'True'
  return (
    <span style={{ ...baseFont(t), fontSize: 13, fontWeight: weightOf(t, 'medium', 500) }}>
      Email address {required && <span style={{ color: t.errorColor }}>*</span>}
    </span>
  )
}

const STRENGTH_META: Record<string, { level: number; caption: string }> = {
  Weak: { level: 1, caption: 'Weak — add more characters.' },
  Fair: { level: 2, caption: 'Fair — mix in numbers and symbols.' },
  Strong: { level: 4, caption: 'Strong password.' },
}

function PasswordStrengthSpecimen({ t, v }: SpecimenProps) {
  const meta = STRENGTH_META[v.Strength ?? 'Fair'] ?? STRENGTH_META.Fair
  const color = meta.level <= 1 ? t.errorColor : meta.level <= 2 ? (t.warningColor ?? '#f79009') : (t.successColor ?? '#17b26a')
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', gap: 8, width: 260 }}>
      <div style={{ display: 'flex', alignItems: 'center', height: 40, padding: '0 12px', borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.border ?? '#d0d5dd'}`, background: inputSurfaceOf(t), fontSize: 14, letterSpacing: 2, color: t.neutralText }}>
        ••••••••
      </div>
      <div style={{ display: 'flex', gap: 4 }} aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < meta.level ? color : t.neutralFill }} />
        ))}
      </div>
      <span style={{ fontSize: 11.5, color: t.fgMuted }} aria-live="polite">{meta.caption}</span>
    </div>
  )
}

// ── Indicators — presence, chips, rating, file plates ─────────────────────────

const PRESENCE: Record<string, (t: PreviewTokens) => string> = {
  Online: (t) => t.successColor ?? '#17b26a',
  Away: (t) => t.warningColor ?? '#f79009',
  Busy: (t) => t.errorColor,
  Offline: () => '#98a2b3',
}

function StatusBadgeSpecimen({ t, v }: SpecimenProps) {
  const status = v.Status ?? 'Online'
  const c = (PRESENCE[status] ?? PRESENCE.Online)(t)
  return (
    <span style={{ ...baseFont(t), display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 999, border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, fontSize: 12.5, fontWeight: weightOf(t, 'medium', 500) }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: c }} aria-hidden />
      {status}
    </span>
  )
}

function ChipSpecimen({ t, v }: SpecimenProps) {
  const selected = (v.Selected ?? 'False') === 'True'
  const dismissible = (v.Dismissible ?? 'False') === 'True'
  const small = (v.Size ?? 'MD') === 'SM'
  return (
    <span
      aria-pressed={selected}
      style={{
        ...baseFont(t),
        display: 'inline-flex', alignItems: 'center', gap: small ? 5 : 6, padding: small ? '3px 10px' : '5px 12px', borderRadius: 999,
        background: selected ? soft(t, t.brandSolid) : t.surface,
        border: `1px solid ${selected ? t.brandSolid + '66' : (t.border ?? '#d0d5dd')}`,
        color: selected ? t.brandText : t.neutralText,
        fontSize: small ? 12 : 13, fontWeight: weightOf(t, 'medium', 500), cursor: 'pointer',
      }}
    >
      Design tokens
      {dismissible && (
        <svg width={small ? 9 : 10} height={small ? 9 : 10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-label="Remove"><path d="M18 6 6 18M6 6l12 12" /></svg>
      )}
    </span>
  )
}

function RatingSpecimen({ t, v }: SpecimenProps) {
  const interactive = (v.Interactive ?? 'False') === 'True'
  return (
    <div style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: 8 }} aria-label="4 of 5 stars">
      <span style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill={i < 4 ? (t.warningColor ?? '#f79009') : t.neutralFill} style={{ cursor: interactive ? 'pointer' : 'default' }} aria-hidden>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </span>
      <span style={{ fontSize: 12.5, color: t.fgMuted }}>4.0 · 128 reviews</span>
    </div>
  )
}

const FORMAT_COLORS: Record<string, string> = { PDF: '#d92d20', PNG: '#2e90fa', SVG: '#7a5af8', ZIP: '#f79009' }

function FileFormatSpecimen({ t, v }: SpecimenProps) {
  const format = v.Format ?? 'PDF'
  const c = FORMAT_COLORS[format] ?? '#d92d20'
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 40, height: 48 }} aria-label={`${format} file`}>
      <svg width="40" height="48" viewBox="0 0 40 48" fill="none" aria-hidden>
        <path d="M4 4a3 3 0 0 1 3-3h18l11 11v32a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V4Z" fill={t.surface} stroke={t.border ?? '#d0d5dd'} strokeWidth="1.5" />
        <path d="M25 1v8a3 3 0 0 0 3 3h8" stroke={t.border ?? '#d0d5dd'} strokeWidth="1.5" />
      </svg>
      <span style={{ position: 'absolute', left: -4, bottom: 8, padding: '2px 6px', borderRadius: 4, background: c, color: '#ffffff', fontSize: 9, fontWeight: 700, letterSpacing: 0.5, fontFamily: fontFamilyOf(t) }}>
        {format}
      </span>
    </span>
  )
}

// ── Content & Surfaces — disclosure, media, floating panels ───────────────────

function AccordionSpecimen({ t }: { t: PreviewTokens }) {
  const rows = ['What are design tokens?', 'How does Figma sync work?', 'Can I export CSS?']
  return (
    <div style={{ ...baseFont(t), width: 320, borderRadius: radiusOf(t, 'lg', '12px'), border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, overflow: 'hidden' }}>
      {rows.map((q, i) => (
        <div key={q} style={{ borderTop: i === 0 ? 'none' : `1px solid ${t.borderDefault ?? '#e9eaeb'}` }}>
          <button type="button" aria-expanded={i === 0} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '13px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: fontFamilyOf(t), fontSize: 13.5, fontWeight: weightOf(t, 'medium', 500), color: t.neutralText, textAlign: 'left' }}>
            {q}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.fgMuted} strokeWidth="2" strokeLinecap="round" style={{ transform: i === 0 ? 'rotate(180deg)' : 'none', flexShrink: 0 }} aria-hidden><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {i === 0 && (
            <p style={{ margin: 0, padding: '0 16px 14px', fontSize: 12.5, lineHeight: 1.55, color: t.fgMuted }}>
              Named values for color, type and spacing that keep every surface consistent.
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

const RATIO_SIZES: Record<string, { w: number; h: number }> = {
  '16:9': { w: 256, h: 144 }, '4:3': { w: 224, h: 168 }, '1:1': { w: 176, h: 176 },
}

function AspectRatioSpecimen({ t, v }: SpecimenProps) {
  const ratio = v.Ratio ?? '16:9'
  const s = RATIO_SIZES[ratio] ?? RATIO_SIZES['16:9']
  return (
    <div
      style={{
        ...baseFont(t),
        width: s.w, height: s.h, borderRadius: radiusOf(t, 'md', '8px'),
        background: `linear-gradient(135deg, ${soft(t, t.brandSolid)}, ${t.brandSolid}44)`,
        border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: weightOf(t, 'semibold', 600), color: t.brandText,
      }}
    >
      {ratio}
    </div>
  )
}

function PopoverSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 260, borderRadius: radiusOf(t, 'lg', '12px'), border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, boxShadow: shadowOf(t, 'xl', '0 12px 32px rgba(10,13,18,0.14)'), padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 13.5, fontWeight: weightOf(t, 'semibold', 600) }}>Share this system</span>
        <span style={{ fontSize: 12.5, color: t.fgMuted, lineHeight: 1.5 }}>Anyone with the link can view tokens and docs.</span>
        <span style={{ alignSelf: 'flex-start', marginTop: 4, fontSize: 12.5, fontWeight: weightOf(t, 'semibold', 600), padding: '6px 12px', borderRadius: radiusOf(t, 'md', '8px'), background: t.brandSolid, color: t.onBrand, cursor: 'pointer' }}>Copy link</span>
      </div>
      <span style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `6px solid ${t.surface}`, filter: 'drop-shadow(0 1px 0 rgba(10,13,18,0.08))' }} aria-hidden />
      <span style={{ fontSize: 13, fontWeight: weightOf(t, 'medium', 500), padding: '7px 14px', borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.border ?? '#d0d5dd'}`, background: t.surface, cursor: 'pointer' }}>Share</span>
    </div>
  )
}

function InfoTooltipSpecimen({ t }: { t: PreviewTokens }) {
  // See ToastSpecimen's note — same fix, same reason.
  const inverse = t.neutralText
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 12, padding: '6px 10px', borderRadius: radiusOf(t, 'md', '8px'), background: inverse, color: t.surface }}>
        Applies to new projects only.
      </span>
      <span style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${inverse}` }} aria-hidden />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: weightOf(t, 'medium', 500) }}>
        Default visibility
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.fgMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="More information"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
      </span>
    </div>
  )
}

function ScrollAreaSpecimen({ t }: { t: PreviewTokens }) {
  const rows = ['Accent / 500', 'Accent / 600', 'Neutral / 100', 'Neutral / 200', 'Success / 500']
  return (
    <div style={{ ...baseFont(t), position: 'relative', width: 240, height: 150, borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, overflow: 'hidden', padding: '6px 14px 6px 6px' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((r) => (
          <span key={r} style={{ padding: '8px 10px', fontSize: 13, color: t.neutralText, borderRadius: radiusOf(t, 'sm', '4px') }}>{r}</span>
        ))}
      </div>
      <span style={{ position: 'absolute', top: 8, right: 4, width: 5, height: 56, borderRadius: 999, background: t.neutralFill }} aria-hidden />
    </div>
  )
}

// ── Feedback — banners and callouts ───────────────────────────────────────────

function StatusIcon({ c, status }: { c: string; status: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden>
      {status === 'Success' ? <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />
        : status === 'Warning' ? <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3ZM12 9v4M12 17h.01" />
        : status === 'Error' ? <><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></>
        : <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>}
    </svg>
  )
}

function AlertBannerSpecimen({ t, v }: SpecimenProps) {
  const status = v.Status ?? 'Info'
  const c = statusColor(t, status)
  return (
    <div role="status" style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: 10, width: 380, padding: '10px 14px', borderRadius: radiusOf(t, 'md', '8px'), background: soft(t, c), border: `1px solid ${c}33` }}>
      <StatusIcon c={c} status={status} />
      <span style={{ flex: 1, fontSize: 13 }}>
        {status === 'Error' ? 'Sync failed — tokens were not published.' : status === 'Warning' ? 'Your trial ends in 3 days.' : status === 'Success' ? 'All tokens are synced to Figma.' : 'Scheduled maintenance on Sunday 02:00 UTC.'}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: weightOf(t, 'semibold', 600), color: c, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {status === 'Warning' ? 'Upgrade' : 'View'}
      </span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.fgMuted} strokeWidth="2" strokeLinecap="round" style={{ cursor: 'pointer', flexShrink: 0 }} aria-label="Dismiss"><path d="M18 6 6 18M6 6l12 12" /></svg>
    </div>
  )
}

function InlineAlertSpecimen({ t, v }: SpecimenProps) {
  const status = v.Status ?? 'Info'
  const c = statusColor(t, status)
  return (
    <div role="status" style={{ ...baseFont(t), display: 'flex', gap: 10, width: 320, padding: 14, borderRadius: radiusOf(t, 'md', '8px'), background: soft(t, c), border: `1px solid ${c}33` }}>
      <StatusIcon c={c} status={status} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 13, fontWeight: weightOf(t, 'semibold', 600) }}>
          {status === 'Error' ? 'Export failed' : status === 'Warning' ? 'Contrast warning' : status === 'Success' ? 'System saved' : 'Heads up'}
        </span>
        <span style={{ fontSize: 12.5, color: t.fgMuted, lineHeight: 1.5 }}>
          {status === 'Warning' ? 'Accent 400 on white is below AA for body text.' : 'Semantic tokens re-derive when the accent changes.'}
        </span>
      </div>
    </div>
  )
}

// ── Navigation — menus, pagination, steps and shells ──────────────────────────

function MenuPanel({ t, items, shortcuts }: { t: PreviewTokens; items: { label: string; danger?: boolean; hover?: boolean; sep?: boolean }[]; shortcuts?: Record<string, string> }) {
  return (
    <div role="menu" style={{ ...baseFont(t), width: 210, borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, boxShadow: shadowOf(t, 'lg', '0 12px 32px rgba(10,13,18,0.14)'), padding: 4 }}>
      {items.map((item, i) =>
        item.sep ? (
          <span key={i} style={{ display: 'block', height: 1, background: t.borderDefault ?? '#e9eaeb', margin: '4px 6px' }} aria-hidden />
        ) : (
          <span
            key={item.label}
            role="menuitem"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              padding: '7px 10px', borderRadius: radiusOf(t, 'sm', '4px'), fontSize: 13, cursor: 'pointer',
              background: item.hover ? t.neutralFill : 'transparent',
              color: item.danger ? t.errorColor : t.neutralText,
            }}
          >
            {item.label}
            {shortcuts?.[item.label] && <span style={{ fontSize: 11, color: t.placeholderText }}>{shortcuts[item.label]}</span>}
          </span>
        ),
      )}
    </div>
  )
}

function DropdownMenuSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
      <span style={{ ...baseFont(t), display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: weightOf(t, 'medium', 500), padding: '7px 12px', borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.border ?? '#d0d5dd'}`, background: t.surface, cursor: 'pointer' }}>
        Options
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={t.fgMuted} strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
      </span>
      <MenuPanel
        t={t}
        items={[
          { label: 'Duplicate', hover: true },
          { label: 'Rename' },
          { label: 'Export tokens' },
          { sep: true, label: '' },
          { label: 'Delete', danger: true },
        ]}
      />
    </div>
  )
}

function ContextMenuSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <MenuPanel
      t={t}
      items={[
        { label: 'Copy', hover: true },
        { label: 'Paste' },
        { label: 'Select all' },
        { sep: true, label: '' },
        { label: 'Inspect tokens' },
      ]}
      shortcuts={{ Copy: '⌘C', Paste: '⌘V', 'Select all': '⌘A' }}
    />
  )
}

function CommandSpecimen({ t }: { t: PreviewTokens }) {
  const results = [
    { label: 'Open Color foundation', hover: true },
    { label: 'Publish tokens to Figma' },
    { label: 'Export variables.css' },
  ]
  return (
    <div style={{ ...baseFont(t), width: 320, borderRadius: radiusOf(t, 'lg', '12px'), border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, boxShadow: shadowOf(t, '2xl', '0 20px 48px rgba(10,13,18,0.18)'), overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: `1px solid ${t.borderDefault ?? '#e9eaeb'}` }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.fgMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <span style={{ flex: 1, fontSize: 13, color: t.placeholderText }}>Type a command…</span>
        <span style={{ fontSize: 10.5, color: t.placeholderText, border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`, borderRadius: 5, padding: '2px 5px' }}>⌘K</span>
      </div>
      <div style={{ padding: 6 }}>
        <span style={{ display: 'block', padding: '4px 10px', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: t.placeholderText }}>Actions</span>
        {results.map((r) => (
          <span key={r.label} style={{ display: 'block', padding: '7px 10px', borderRadius: radiusOf(t, 'sm', '4px'), fontSize: 13, color: t.neutralText, background: r.hover ? t.neutralFill : 'transparent', cursor: 'pointer' }}>
            {r.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function NavbarSpecimen({ t }: { t: PreviewTokens }) {
  const links = ['Home', 'Tokens', 'Components', 'Docs']
  return (
    <header style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: 20, width: 420, padding: '10px 16px', borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface }}>
      <span style={{ width: 24, height: 24, borderRadius: radiusOf(t, 'sm', '6px'), background: t.brandSolid, flexShrink: 0 }} aria-hidden />
      <nav aria-label="Main" style={{ display: 'flex', gap: 14, flex: 1 }}>
        {links.map((l, i) => (
          <span key={l} style={{ fontSize: 13, cursor: 'pointer', fontWeight: i === 0 ? weightOf(t, 'semibold', 600) : 400, color: i === 0 ? t.neutralText : t.fgMuted }}>{l}</span>
        ))}
      </nav>
      <span style={{ width: 28, height: 28, borderRadius: 999, background: soft(t, t.brandSolid), color: t.brandText, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: weightOf(t, 'semibold', 600), flexShrink: 0 }}>MD</span>
    </header>
  )
}

const SIDEBAR_ICONS: Record<string, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V20h4.5v-5.5h5V20H19V9.5" />,
  color: <path d="M12 22a7 7 0 0 0 7-7c0-3-7-12-7-12S5 12 5 15a7 7 0 0 0 7 7Z" />,
  box: <path d="M21 8 12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>,
}

function SidebarSpecimen({ t }: { t: PreviewTokens }) {
  const items = [
    { icon: 'home', label: 'Overview' },
    { icon: 'color', label: 'Tokens', active: true },
    { icon: 'box', label: 'Components' },
    { icon: 'gear', label: 'Settings' },
  ]
  return (
    <nav aria-label="Sidebar" style={{ ...baseFont(t), width: 200, padding: 8, borderRadius: radiusOf(t, 'md', '8px'), border: `1px solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((item) => (
        <span
          key={item.label}
          aria-current={item.active ? 'page' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: radiusOf(t, 'sm', '6px'), fontSize: 13, cursor: 'pointer',
            background: item.active ? soft(t, t.brandSolid) : 'transparent',
            color: item.active ? t.brandText : t.neutralText,
            fontWeight: item.active ? weightOf(t, 'medium', 500) : 400,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{SIDEBAR_ICONS[item.icon]}</svg>
          {item.label}
        </span>
      ))}
    </nav>
  )
}

function PaginationSpecimen({ t }: { t: PreviewTokens }) {
  const cell = (label: string, current = false, muted = false): ReactNode => (
    <span
      key={label + (current ? '-c' : '')}
      aria-current={current ? 'page' : undefined}
      style={{
        minWidth: 32, height: 32, padding: '0 6px', borderRadius: radiusOf(t, 'md', '8px'),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, cursor: muted ? 'default' : 'pointer',
        background: current ? t.brandSolid : 'transparent',
        color: current ? t.onBrand : muted ? t.placeholderText : t.neutralText,
        fontWeight: current ? weightOf(t, 'semibold', 600) : 400,
      }}
    >
      {label}
    </span>
  )
  return (
    <nav aria-label="Pagination" style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: 2 }}>
      {cell('‹')}{cell('1')}{cell('2', true)}{cell('3')}{cell('…', false, true)}{cell('8')}{cell('›')}
    </nav>
  )
}

function StepperSpecimen({ t }: { t: PreviewTokens }) {
  const steps = [
    { label: 'Account', state: 'done' },
    { label: 'Tokens', state: 'current' },
    { label: 'Publish', state: 'todo' },
  ]
  return (
    <ol style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: 0, listStyle: 'none', margin: 0, padding: 0 }}>
      {steps.map((s, i) => (
        <li key={s.label} style={{ display: 'flex', alignItems: 'center' }} aria-current={s.state === 'current' ? 'step' : undefined}>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 84 }}>
            <span
              style={{
                width: 28, height: 28, borderRadius: 999,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: weightOf(t, 'semibold', 600),
                background: s.state === 'done' ? t.brandSolid : s.state === 'current' ? soft(t, t.brandSolid) : t.neutralFill,
                color: s.state === 'done' ? t.onBrand : s.state === 'current' ? t.brandText : t.fgMuted,
                border: s.state === 'current' ? `1.5px solid ${t.brandSolid}` : '1.5px solid transparent',
              }}
            >
              {s.state === 'done' ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.7 9.5 3.4" stroke={t.onBrand} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                i + 1
              )}
            </span>
            <span style={{ fontSize: 11.5, color: s.state === 'todo' ? t.fgMuted : t.neutralText, fontWeight: s.state === 'current' ? weightOf(t, 'medium', 500) : 400 }}>{s.label}</span>
          </span>
          {i < steps.length - 1 && <span style={{ width: 40, height: 2, marginBottom: 20, borderRadius: 999, background: s.state === 'done' ? t.brandSolid : t.neutralFill }} aria-hidden />}
        </li>
      ))}
    </ol>
  )
}

// Genuinely selectable — a tab strip that can't be clicked isn't a tab strip,
// it's a picture of one. Interactive by DEFAULT (unlike `Live`, which is opt-in):
// TabMenu declares no axes, so there's no variant dropdown for a click to
// contradict, and the docs playground wants the real behaviour too.
//
// The active pill is ONE element that slides between tabs (`layoutId`) rather
// than a background that blinks on and off per tab. That's what makes the
// selection read as a single object moving, which is the whole point of a
// segmented control — and while it slides you can see the brand tint travel
// across the neutral text, so the two tokens are judged against each other.
// Tween, not spring: this is a tool, and bounce reads as toy here.
function TabMenuSpecimen({ t }: { t: PreviewTokens }) {
  const items = ['All', 'Drafts', 'Published']
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const reduce = useReducedMotion() ?? false
  // Scopes the sliding pill to THIS instance — two TabMenus on one screen would
  // otherwise share a layoutId and animate the pill between each other.
  const pillId = `tabmenu-pill-${useId()}`

  return (
    <div role="tablist" style={{ ...baseFont(t), display: 'inline-flex', gap: 4 }}>
      {items.map((item, i) => {
        const on = i === active
        return (
          <span
            key={item}
            role="tab"
            aria-selected={on}
            // Roving tabindex: the strip is ONE tab stop and the arrows move
            // within it, which is what a tablist is supposed to do — three
            // separate stops would make a 3-item control cost 3 tabs.
            tabIndex={on ? 0 : -1}
            onClick={() => setActive(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault()
                const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
                setActive(next)
                // Focus follows selection — the ARIA pattern for an
                // automatic-activation tablist, and the only way the arrows
                // stay usable past the first press.
                const el = e.currentTarget.parentElement?.children[next] as HTMLElement | undefined
                el?.focus()
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setActive(i)
              }
            }}
            style={{
              position: 'relative', padding: '7px 14px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
              // An inactive tab warms toward the brand ink on hover instead of
              // gaining a fill — a second filled pill would compete with the
              // real selection for "which one is active".
              color: on ? t.brandText : hover === i ? t.neutralText : t.fgMuted,
              fontWeight: on ? weightOf(t, 'semibold', 600) : 400,
              transition: STATE_TRANSITION,
              outline: 'none',
            }}
          >
            {on && (
              <motion.span
                layoutId={pillId}
                aria-hidden
                style={{
                  position: 'absolute', inset: 0, borderRadius: 999,
                  background: soft(t, t.brandSolid),
                }}
                transition={reduce ? { duration: 0 } : { duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            {/* Above the pill, which is absolutely positioned over the cell. */}
            <span style={{ position: 'relative' }}>{item}</span>
          </span>
        )
      })}
    </div>
  )
}

function SegmentedControlSpecimen({ t, v }: SpecimenProps) {
  const items = ['List', 'Board', 'Timeline']
  const small = (v.Size ?? 'MD') === 'SM'
  return (
    <div role="radiogroup" style={{ ...baseFont(t), display: 'inline-flex', padding: 3, gap: 2, borderRadius: radiusOf(t, 'md', '8px'), background: t.neutralFill }}>
      {items.map((item, i) => (
        <span
          key={item}
          role="radio"
          aria-checked={i === 0}
          style={{
            padding: small ? '4px 10px' : '6px 14px', borderRadius: radiusOf(t, 'sm', '6px'), fontSize: small ? 12 : 13, cursor: 'pointer',
            background: i === 0 ? t.surface : 'transparent',
            color: i === 0 ? t.neutralText : t.fgMuted,
            fontWeight: i === 0 ? weightOf(t, 'semibold', 600) : 400,
            boxShadow: i === 0 ? shadowOf(t, 'xs', '0 1px 2px rgba(10,13,18,0.1)') : 'none',
          }}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

// ── Registry + snippet builder ────────────────────────────────────────────────

export const SPECIMENS: Record<string, (p: SpecimenProps) => ReactNode> = {
  // Button & Actions
  Button: ButtonSpecimen,
  ButtonGroup: ButtonGroupSpecimen,
  CloseButton: CloseButtonSpecimen,
  FABButton: FABButtonSpecimen,
  SocialLoginButton: SocialLoginButtonSpecimen,
  TextLink: TextLinkSpecimen,
  AppStoreBadge: AppStoreBadgeSpecimen,
  // Form Controls
  Input: InputSpecimen,
  InputGroup: InputGroupSpecimen,
  Textarea: TextareaSpecimen,
  InputOTP: InputOTPSpecimen,
  InputStepper: InputStepperSpecimen,
  InputTag: InputTagSpecimen,
  Select: SelectSpecimen,
  Combobox: ComboboxSpecimen,
  Checkbox: CheckboxSpecimen,
  CheckboxGroup: CheckboxGroupSpecimen,
  Radio: RadioSpecimen,
  RadioGroup: RadioGroupSpecimen,
  Toggle: ToggleSpecimen,
  SwitchGroup: SwitchGroupSpecimen,
  Slider: SliderSpecimen,
  FileUpload: FileUploadSpecimen,
  Dropzone: DropzoneSpecimen,
  Field: FieldSpecimen,
  Label: LabelSpecimen,
  PasswordStrength: PasswordStrengthSpecimen,
  // Indicators
  Badge: BadgeSpecimen,
  StatusBadge: StatusBadgeSpecimen,
  Chip: ChipSpecimen,
  Progress: ProgressSpecimen,
  Spinner: SpinnerSpecimen,
  Rating: RatingSpecimen,
  FileFormat: FileFormatSpecimen,
  // Content & Surfaces
  Avatar: AvatarSpecimen,
  Card: CardSpecimen,
  Divider: DividerSpecimen,
  Accordion: AccordionSpecimen,
  AspectRatio: AspectRatioSpecimen,
  Modal: ModalSpecimen,
  Popover: PopoverSpecimen,
  Tooltip: TooltipSpecimen,
  InfoTooltip: InfoTooltipSpecimen,
  ScrollArea: ScrollAreaSpecimen,
  // Feedback
  Toast: ToastSpecimen,
  AlertBanner: AlertBannerSpecimen,
  InlineAlert: InlineAlertSpecimen,
  // Navigation
  Tabs: TabsSpecimen,
  TabMenu: TabMenuSpecimen,
  SegmentedControl: SegmentedControlSpecimen,
  Breadcrumb: BreadcrumbSpecimen,
  Pagination: PaginationSpecimen,
  Stepper: StepperSpecimen,
  DropdownMenu: DropdownMenuSpecimen,
  ContextMenu: ContextMenuSpecimen,
  Command: CommandSpecimen,
  Navbar: NavbarSpecimen,
  Sidebar: SidebarSpecimen,
}

// Components whose specimen renders on the "panel" role (surface-1) — the
// canvas behind these gets a patterned backdrop so translucent mode is visible.
export const PANEL_COMPONENTS = new Set(['Card'])

// ── Live — real interaction, painted with the SHIPPED state variants ─────────
// The preview collage renders the same specimens the docs playground does, and
// those already implement Hover / Pressed / Focused because the Figma plugin
// ships them as variants (`componentCatalogue` axes — the plugin is the source
// of truth). So making the preview interactive is NOT a matter of inventing
// hover colours: it feeds real pointer/focus events into the axis that already
// exists, which means what you feel on hover is byte-for-byte the variant that
// lands in Figma, and it retints with the accent like everything else.
//
// Three rules that keep it honest, all load-bearing:
//  · **A component with no `State` axis gets NO colour change.** Badge, Avatar,
//    StatusBadge and friends ship no hover variant, so previewing one would
//    advertise a state the design system doesn't contain. They can still carry
//    the tap/hover MOTION below — motion is a property of this surface, not a
//    token the plugin has to mirror.
//  · **Which states exist is READ from the catalogue, never listed here**, so a
//    plugin change can't leave this out of sync. Toggle has no 'Pressed', so a
//    press there resolves to 'Hover' rather than falling back to Default (which
//    would read as the press *un*-highlighting the control).
//  · **Opt-in.** The docs playground drives `State` from its own dropdown; if
//    this wrapper were on by default there, hovering would silently override the
//    variant the user explicitly selected to inspect.
function axisValues(component: string, axis: string): string[] {
  return COMPONENTS.find((c) => c.key === component)?.axes.find((a) => a.name === axis)?.values ?? []
}

export function Live({
  c,
  t,
  v = {},
  icons,
  toggle,
  lift = false,
  hoverState,
}: {
  /** Catalogue key — indexes both SPECIMENS and the axes read above. */
  c: string
  t: PreviewTokens
  v?: AxisValues
  icons?: IconOpts
  /** Boolean axis ('On' / 'Checked') a click flips, so switches and checkboxes
   *  actually switch instead of being a still life. Ignored when the catalogue
   *  says the axis has no True/False pair. */
  toggle?: string
  /** Adds a 2px hover lift. For elements with no State axis this is the ONLY
   *  hover cue, so it's opt-in per call site rather than blanket — a Badge that
   *  rises on hover implies a click target that isn't there. */
  lift?: boolean
  /** State a hover resolves to when the component names it something other than
   *  'Hover'. Dropzone is the case this exists for: its shipped variants are
   *  Default / Dragging / Error, and hovering an uploader previewing 'Dragging'
   *  is exactly the state a real drag would put it in. Still has to name a state
   *  the catalogue offers — the `pick` below drops it otherwise. */
  hoverState?: string
}) {
  const render = SPECIMENS[c]
  const states = axisValues(c, 'State')
  const reduce = useReducedMotion() ?? false
  const [hover, setHover] = useState(false)
  const [press, setPress] = useState(false)
  const [focus, setFocus] = useState(false)

  const toggleValues = toggle ? axisValues(c, toggle) : []
  const canToggle = !!toggle && toggleValues.includes('True') && toggleValues.includes('False')
  const [on, setOn] = useState((v[toggle ?? ''] ?? 'True') === 'True')

  if (!render) return null

  // First state in the chain the catalogue actually offers. Focus sits last:
  // it's the weakest signal of the three and only shows when nothing else does.
  const pick = (...want: (string | undefined)[]) =>
    want.find((s): s is string => !!s && states.includes(s))
  const state =
    (press ? pick('Pressed', hoverState, 'Hover') : undefined) ??
    (hover ? pick(hoverState, 'Hover') : undefined) ??
    (focus ? pick('Focused') : undefined)

  const merged: AxisValues = { ...v }
  if (state) merged.State = state
  if (canToggle) merged[toggle] = on ? 'True' : 'False'

  const flip = canToggle ? () => setOn((o) => !o) : undefined

  return (
    <motion.span
      style={{ display: 'inline-flex', cursor: flip ? 'pointer' : undefined }}
      // Motion, not colour — safe on every component, State axis or not.
      animate={reduce ? undefined : { y: lift && hover ? -2 : 0 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => { setHover(false); setPress(false) }}
      onPointerDown={() => setPress(true)}
      onPointerUp={() => setPress(false)}
      onPointerCancel={() => setPress(false)}
      // Bubbled from the specimen's own <button> where it has one, so a real
      // keyboard focus lights the real Focused variant.
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onClick={flip}
      // Only togglables become focusable here. No `role`: the specimen's own
      // inner element already carries role="switch"/the real <button>, and a
      // second role on the wrapper would announce the control twice.
      tabIndex={flip ? 0 : undefined}
      onKeyDown={flip ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip() } } : undefined}
    >
      {render({ t, v: merged, icons })}
    </motion.span>
  )
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
  // ` size="…"` only when the non-default size is selected — keeps snippets lean.
  const sizeProp = v.Size && low(v.Size) !== 'md' ? ` size="${low(v.Size)}"` : ''
  switch (def.key) {
    case 'Button': {
      const flags = `${v.State === 'Disabled' ? ' disabled' : ''}${v.State === 'Loading' ? ' loading' : ''}`
      return `<Button color="${low(v.Color) || 'brand'}" style="${low(v.Style) || 'solid'}"${sizeProp}${flags}${iconProps('Button')}>\n  Button\n</Button>`
    }
    case 'Input': {
      const type = ({ 'default': 'text', 'e-mail': 'email', 'password': 'password', 'search': 'search', 'phone-number': 'tel', 'website': 'url' } as Record<string, string>)[low(v.Type)] ?? 'text'
      const err = v.State === 'Error' ? `\n  error="This field is required."` : ''
      return `<Input\n  type="${type}"\n  size="${low(v.Size) || 'md'}"\n  label="${INPUT_META[v.Type ?? 'Default']?.label ?? 'Label'}"${err}${v.State === 'Disabled' ? '\n  disabled' : ''}${iconProps('Input').replace(/ (\w+Icon)=/g, '\n  $1=')}\n/>`
    }
    case 'Select':
      return `<Select\n  placeholder="Select an option"\n  options={options}${sizeProp ? `\n ${sizeProp}` : ''}${v.State === 'Error' ? '\n  error="Pick one option."' : ''}${v.State === 'Disabled' ? '\n  disabled' : ''}\n/>`
    case 'Checkbox':
      return `<Checkbox${v.Checked === 'True' ? ' checked' : ''}${sizeProp}${v.State === 'Disabled' ? ' disabled' : ''} label="Remember me" />`
    case 'Toggle':
      return `<Toggle${v.On === 'True' ? ' checked' : ''}${sizeProp}${v.State === 'Disabled' ? ' disabled' : ''} label="Notifications" />`
    case 'Badge':
      return `<Badge color="${low(v.Color) || 'brand'}" style="${low(v.Style) || 'soft'}"${sizeProp}>\n  ${v.Color ?? 'Brand'}\n</Badge>`
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
    // Button & Actions
    case 'ButtonGroup':
      return `<ButtonGroup${sizeProp} items={[\n  { label: 'Day' },\n  { label: 'Week' },\n  { label: 'Month' },\n]} />`
    case 'CloseButton':
      return `<CloseButton size="${low(v.Size) || 'md'}" onClick={dismiss} />`
    case 'FABButton':
      return `<FABButton size="${low(v.Size) || 'md'}" icon={<Plus />} label="New item" />`
    case 'SocialLoginButton':
      return `<SocialLoginButton provider="${low(v.Provider) || 'google'}"${sizeProp} onClick={signIn} />`
    case 'TextLink':
      return `<TextLink href="/docs/tokens" external${v.State === 'Disabled' ? ' disabled' : ''}>\n  design tokens guide\n</TextLink>`
    case 'AppStoreBadge':
      return `<AppStoreBadge store="${low(v.Store) || 'app-store'}" href={storeUrl} />`
    // Form Controls
    case 'InputGroup':
      return `<InputGroup prefix="https://" suffix={<Button>Copy</Button>}>\n  <Input value="escala.design" />\n</InputGroup>`
    case 'Textarea':
      return `<Textarea\n  label="Description"\n  rows={4}\n  maxLength={200}${v.State === 'Error' ? '\n  error="Description is required."' : ''}${v.State === 'Disabled' ? '\n  disabled' : ''}\n/>`
    case 'InputOTP':
      return `<InputOTP length={6}${sizeProp} onComplete={verify} />`
    case 'InputStepper':
      return `<InputStepper value={12} min={0} max={99} step={1} />`
    case 'InputTag':
      return `<InputTag value={['tokens', 'figma']} onAdd={add} onRemove={remove} />`
    case 'Combobox':
      return `<Combobox\n  options={fonts}\n  placeholder="Search fonts…"\n  onSearch={filter}\n/>`
    case 'CheckboxGroup':
      return `<CheckboxGroup\n  label="Notify me about"\n  options={options}\n  value={['comments', 'members']}\n/>`
    case 'Radio':
      return `<Radio${v.Checked === 'True' ? ' checked' : ''}${sizeProp}${v.State === 'Disabled' ? ' disabled' : ''} label="Monthly billing" />`
    case 'RadioGroup':
      return `<RadioGroup\n  label="Billing period"\n  options={options}\n  value="monthly"\n/>`
    case 'SwitchGroup':
      return `<SwitchGroup label="Notifications" items={[\n  { label: 'Email notifications', checked: true },\n  { label: 'Push notifications', checked: true },\n]} />`
    case 'Slider':
      return `<Slider value={60} min={0} max={100} step={5} />`
    case 'FileUpload':
      return `<FileUpload accept=".pdf,.png,.svg" multiple onFiles={upload} />`
    case 'Dropzone':
      return `<Dropzone\n  accept=".svg,.png,.pdf"\n  maxSize={10 * 1024 * 1024}\n  onDrop={upload}\n/>`
    case 'Field':
      return `<Field label="Workspace name" hint="Shown to your teammates." required>\n  <Input placeholder="Acme Inc." />\n</Field>`
    case 'Label':
      return `<Label htmlFor="email"${v.Required === 'True' ? ' required' : ''}>Email address</Label>`
    case 'PasswordStrength':
      return `<PasswordStrength value={password} rules={defaultRules} />`
    // Indicators
    case 'StatusBadge':
      return `<StatusBadge status="${low(v.Status) || 'online'}" showLabel />`
    case 'Chip':
      return `<Chip label="Design tokens"${sizeProp}${v.Selected === 'True' ? ' selected' : ''}${v.Dismissible === 'True' ? ' onDismiss={remove}' : ''} />`
    case 'Rating':
      return `<Rating value={4}${v.Interactive === 'True' ? ' onChange={setScore}' : ''} count={128} />`
    case 'FileFormat':
      return `<FileFormat format="${v.Format ?? 'PDF'}" size="md" />`
    // Content & Surfaces
    case 'Accordion':
      return `<Accordion type="single" defaultValue="tokens" items={[\n  { title: 'What are design tokens?', content: … },\n  { title: 'How does Figma sync work?', content: … },\n]} />`
    case 'AspectRatio':
      return `<AspectRatio ratio={${(v.Ratio ?? '16:9').replace(':', ' / ')}}>\n  <img src={cover} alt="…" />\n</AspectRatio>`
    case 'Popover':
      return `<Popover trigger={<Button style="outline">Share</Button>} side="top">\n  …\n</Popover>`
    case 'InfoTooltip':
      return `<InfoTooltip content="Applies to new projects only." side="top" />`
    case 'ScrollArea':
      return `<ScrollArea maxHeight={240} orientation="vertical">\n  {tokenRows}\n</ScrollArea>`
    // Feedback
    case 'AlertBanner':
      return `<AlertBanner\n  status="${low(v.Status) || 'info'}"\n  message="Scheduled maintenance on Sunday."\n  action={{ label: 'View', onClick: open }}\n  dismissible\n/>`
    case 'InlineAlert':
      return `<InlineAlert status="${low(v.Status) || 'info'}" title="Heads up">\n  Semantic tokens re-derive when the accent changes.\n</InlineAlert>`
    // Navigation
    case 'TabMenu':
      return `<TabMenu value="all" items={[\n  { label: 'All', value: 'all' },\n  { label: 'Drafts', value: 'drafts' },\n]} />`
    case 'SegmentedControl':
      return `<SegmentedControl value="list"${sizeProp} options={[\n  { label: 'List', value: 'list' },\n  { label: 'Board', value: 'board' },\n]} />`
    case 'Pagination':
      return `<Pagination page={2} pageCount={8} onPageChange={goTo} />`
    case 'Stepper':
      return `<Stepper current={1} steps={[\n  { label: 'Account' },\n  { label: 'Tokens' },\n  { label: 'Publish' },\n]} />`
    case 'DropdownMenu':
      return `<DropdownMenu trigger={<Button style="outline">Options</Button>} items={menuItems} align="end" />`
    case 'ContextMenu':
      return `<ContextMenu items={menuItems}>\n  <Canvas />\n</ContextMenu>`
    case 'Command':
      return `<Command open items={commands} onSelect={run} />`
    case 'Navbar':
      return `<Navbar logo={<Logo />} items={navItems} actions={<Avatar name="MD" size="sm" />} />`
    case 'Sidebar':
      return `<Sidebar items={navItems} value="tokens" collapsible />`
    default:
      return `<${def.key} />`
  }
}
