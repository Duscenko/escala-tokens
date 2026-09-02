// ─── Playground specimens ─────────────────────────────────────────────────────
// One live, token-driven render per catalogue component. Each specimen honors
// the variant axes exactly as the Figma plugin builds them (componentCatalogue
// `axes` — the plugin is the source of truth), so what the designer toggles
// here is what lands in Figma. Colors, radius, and type all resolve from
// PreviewTokens. Type is bound to semantic text roles (`label`, `placeholder`,
// `button`, `heading-*`, `body-*`, …) via `typeStyleOf`, so a Semantics edit
// retunes Docs, Components, and Preview together — inline styles by design
// (see CLAUDE.md conventions).

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import chroma from 'chroma-js'
import type { PreviewTokens } from '../../preview/ButtonPreview'
import { radiusRoleOf, weightOf, shadowOf, alphaOf, tintOf, paddingOf, cardSurfaceStyle, sizeOf, sizeRoleOf, selectorOf, inputSurfaceOf, focusBorderOf, statusSoftFillOf, typeStyleOf, strokeRoleOf, spacingRoleOf } from '../../../lib/previewTokens'
import { withAlpha } from '../../../lib/colorUtils'
import { COMPONENTS, type ComponentDef } from '../../../lib/componentCatalogue'
import { PHOSPHOR_CORE, PHOSPHOR_CORE_COMPONENT } from '../../../lib/iconLibraries'
import { phosphorCoreBody, phosphorIconMaskUrl } from '../../../lib/phosphorIcons'
import { useI18n } from '../../../lib/i18n'
import { FigmaGlyph, GitHubGlyph } from '../../ui/icons'

export type AxisValues = Record<string, string>

// ── Shared helpers ────────────────────────────────────────────────────────────

const darken = (c: string, amt: number) => {
  try { return chroma(c).darken(amt).hex() } catch { return c }
}
/** Soft tint of a hex — reads the Opacity foundation's 10 / 5 / 20 steps, so
 *  soft fills track the user's transparency scale. */
const soft = (t: PreviewTokens, hex: string) => tintOf(t, hex, '10', 0.1)
const softer = (t: PreviewTokens, hex: string) => tintOf(t, hex, '5', 0.05)
/** One step deeper than `soft` — a pressed wash, not a hover one. Used to be
 *  `color + '33'` in ButtonSpecimen: a raw hex-alpha-suffix hack that (a) only
 *  works when `color` is already a clean 6-digit hex, and (b) went through
 *  neither `tintOf` nor any other named step, so it couldn't be told apart
 *  from a typo at the call site. `withAlpha` handles any chroma-parseable
 *  color, and routing through `tintOf` keeps every soft-fill in this file on
 *  ONE mechanism instead of two. */
const pressed = (t: PreviewTokens, hex: string) => tintOf(t, hex, '20', 0.2)

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

/** The stroke of a status surface — `status.<severity>.border`, an alpha token.
 *
 *  This used to be `` `${c}33` `` inline: the status SOLID at a hardcoded 20%.
 *  The Figma plugin drew the same edge at 40% (`fillP(k.solid, 0.4)`) and its
 *  AlertBanner at 45%, so one component had three different answers depending
 *  on which renderer you asked — the exact drift the "every specimen is a
 *  catalogue renderer" rule exists to stop, invisible because none of the three
 *  read a token. The flat catalogue has no equivalent role, so a flat system
 *  keeps the old expression rather than being handed a value it can't resolve. */
function statusBorder(t: PreviewTokens, status: string, c: string): string {
  const sev = status === 'Error' || status === 'Danger' ? 'critical'
    : status === 'Warning' ? 'warning'
    : status === 'Success' ? 'success'
    : status === 'Info' ? 'info'
    : null
  return (sev && t.archTokens?.[`status.${sev}.border`]) || `${c}33`
}

const focusRing = (t: PreviewTokens, accent: string): string => {
  const ring = strokeRoleOf(t, 'focus', '2px')
  return `0 0 0 ${ring} ${t.surface}, 0 0 0 calc(${ring} + ${ring}) ${withAlpha(accent, alphaOf(t, '40', 0.4))}`
}

const strokeControl = (t: PreviewTokens) => strokeRoleOf(t, 'control', '1px')
const strokeFocus = (t: PreviewTokens) => strokeRoleOf(t, 'focus', '2px')

/** The drawn edge of a checkbox / radio / switch knob, from the Selector ramp.
 *  Fallbacks are the values these specimens hardcoded before the ramp existed,
 *  so a token-less caller renders exactly as it used to. */
const selectorGlyph = (t: PreviewTokens, small: boolean) =>
  selectorOf(t, small ? 'sm' : 'md', small ? 15 : 18)

/**
 * WCAG 2.2 target size (2.5.8): the POINTER target must be at least 24×24,
 * which an 18px checkbox is not. The fix is a transparent hit area around the
 * glyph, never a bigger glyph — growing the box would change the design to
 * satisfy a rule about the touch target. Reuses the `size` role `hit`, which
 * already means exactly this ("Close button and icon-only hit area").
 */
function HitArea({ t, box, children }: { t: PreviewTokens; box: number; children: ReactNode }) {
  const min = sizeRoleOf(t, 'hit', '24px')
  return (
    <span style={{ minWidth: min, minHeight: min, display: 'inline-grid', placeItems: 'center', flexShrink: 0 }}>
      {children}
    </span>
  )
}

/** Pull the label back by however much the hit area overhangs the glyph, so the
 *  target grows without the optical gap changing. */
const hitGap = (t: PreviewTokens, box: number, gap: number) => {
  const min = parseFloat(sizeRoleOf(t, 'hit', '24px')) || 24
  return Math.max(2, gap - Math.max(0, (min - box) / 2))
}

/** Eases every property a State variant can change. 140ms sits in the
 *  micro-feedback band — long enough to read as a transition, short enough that
 *  the control still feels immediate under the cursor. */
const STATE_TRANSITION =
  'background 0.14s ease-out, border-color 0.14s ease-out, color 0.14s ease-out, box-shadow 0.14s ease-out'

function baseFont(t: PreviewTokens): CSSProperties {
  return { ...typeStyleOf(t, 'body-md', { leading: false }), color: t.neutralText }
}

/** Text role, no line-height — the default for controls (buttons, labels, tabs). */
function typeOf(t: PreviewTokens, role: string): CSSProperties {
  return typeStyleOf(t, role, { leading: false })
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

// ── Icons — Phosphor, bundled locally ───────────────────────────────────────
// Specimens render Phosphor glyphs (regular weight) from the committed catalog.
// Concept names map through PHOSPHOR_CORE so Button/Input slots stay stable.

export type IconConcept =
  | 'star' | 'arrow' | 'search' | 'eye'
  | 'plus' | 'upload' | 'info' | 'success' | 'warning' | 'error'
  | 'home' | 'box' | 'grid' | 'image' | 'text' | 'settings' | 'palette'
  | 'bookmark' | 'heart' | 'share' | 'user' | 'users' | 'zap' | 'check'
  | 'chevron' | 'close'

export function iconName(_prefix: string, concept: IconConcept): string {
  return PHOSPHOR_CORE[concept] ?? concept
}

// PascalCase component name for copy snippets
// (`import { MagnifyingGlass } from "@phosphor-icons/react"`).
export const ICON_COMPONENT: Record<IconConcept, string> = PHOSPHOR_CORE_COMPONENT as Record<IconConcept, string>

/** Which components expose leading/trailing icon slots, and their default glyphs. */
export const ICON_SLOTS: Record<string, { leading: IconConcept; trailing: IconConcept }> = {
  Button: { leading: 'star', trailing: 'arrow' },
  Input: { leading: 'search', trailing: 'eye' },
}

export interface IconOpts { prefix: string; leading: boolean; trailing: boolean }

function PreviewIcon({ concept, size = 16, color = 'currentColor' }: { prefix?: string; concept: IconConcept; size?: number; color?: string }) {
  const body = phosphorCoreBody(PHOSPHOR_CORE[concept] ?? '')
  const mask = body ? phosphorIconMaskUrl(body) : undefined
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

/** A glyph resolved from the bundled Phosphor catalog (regular weight). */
export function TokenIcon({ t: _t, concept, size = 16, color }: { t: PreviewTokens; concept: IconConcept; size?: number; color?: string }) {
  return <PreviewIcon concept={concept} size={size} color={color} />
}

/**
 * `w` overrides a specimen's own width.
 *
 * Every renderer here carries a hardcoded px width tuned for the Components
 * playground canvas (Input 260, SocialLoginButton 280, Divider 220…), which is
 * correct there and wrong inside an artefact: a login screen in a ~328px mobile
 * frame needs its fields to fill the column, or it reads as a broken form
 * rather than a screen.
 *
 * It is OPT-IN and therefore provably inert — every pre-existing call site omits
 * it, so the playground and the Color collage render byte-identically. And it is
 * deliberately NOT a fork: one renderer at two widths, the same call
 * `PrimitiveRamp`'s container query already makes ("one renderer, two densities,
 * no fork — a fork is what drifts once someone edits one copy"). Anything that
 * decides how a component LOOKS — colour, radius, height, type, state — stays
 * inside the specimen, so an artefact can never disagree with what the plugin
 * ships to Figma.
 */
/**
 * `children` overrides a specimen's own hardcoded COPY, on the same terms `w`
 * overrides its width: opt-in, so every existing call site (the playground,
 * the Color collage) that omits it renders byte-identical to before. It exists
 * because a few specimens echo fixed prose that made sense as a category demo
 * — `Badge` prints its `Color` axis value verbatim ("Brand", "Success"),
 * `TextLink` is one fixed sentence, `Card` is one fixed title/body/link — and
 * an artefact composing a real screen (a "Most popular" plan badge, a "Resend
 * code" link, a pricing card's own features) needs to say something the demo
 * never anticipated. The specimen still owns every visual: colour, radius,
 * padding, type role. Only the words move.
 */
export interface SpecimenProps {
  t: PreviewTokens; v: AxisValues; icons?: IconOpts; w?: number | string; children?: ReactNode
  /**
   * Which step of the SHADOW ramp this specimen sits on. Honoured by `Card`
   * only, and opt-in exactly like `w` and `children` — every pre-existing call
   * site omits it and keeps rendering `sm`, byte for byte.
   *
   * It exists because a Card is the only page-level SURFACE in the catalogue,
   * and the artefacts are the only place a page-level surface appears. `sm` is
   * right for a 280px demo card in the Components playground and far too quiet
   * for a full-width sheet on a phone screen — which is why the System Styles
   * differed by elevation on paper and looked identical in the preview.
   * Measured before this landed: across all five artefacts, THREE screens
   * (Login, Verify code, Profile) rendered zero box-shadows at all, so
   * switching Core (Subtle ramp) to Material (Strong ramp) repainted nothing.
   *
   * It is a token REFERENCE, never a value — `shadowOf` resolves it against the
   * system's own ramp, so an artefact still cannot invent an elevation.
   */
  elev?: string
}

// ── Button (Color × Style × State) ────────────────────────────────────────────

// Button size scale — heights resolve from the Sizes foundation (sm–xl), so
// editing Foundations · Sizes retunes every button size live.
const BUTTON_SIZE_SPECS: Record<string, { sizeKey: string; h: number; f: number; padX: number; icon: number; gap: number }> = {
  SM: { sizeKey: 'sm', h: 32, f: 13, padX: 14, icon: 14, gap: 6 },
  MD: { sizeKey: 'md', h: 40, f: 14, padX: 18, icon: 16, gap: 8 },
  LG: { sizeKey: 'lg', h: 48, f: 15, padX: 22, icon: 18, gap: 8 },
  XL: { sizeKey: 'xl', h: 56, f: 16, padX: 26, icon: 20, gap: 10 },
}

function ButtonSpecimen({ t, v, icons, w, children }: SpecimenProps) {
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
    else bg = pressed(t, color)
  }
  if (disabled) { bg = style === 'Ghost' ? 'transparent' : t.disabledBg; fg = t.disabledText; border = style === 'Outline' ? t.disabledBg : 'transparent' }

  return (
    <button
      type="button"
      aria-disabled={disabled}
      style={{
        ...baseFont(t),
        display: 'inline-flex', alignItems: 'center', gap: sz.gap,
        // A width only arrives from an artefact (see `SpecimenProps.w`). Centring
        // rides with it: the playground's button hugs its label, so left-aligned
        // content is right there and wrong the moment the button spans a column.
        width: w, justifyContent: w == null ? undefined : 'center',
        height: sizeOf(t, sz.sizeKey, sz.h), padding: `0 ${sz.padX}px`,
        borderRadius: radiusRoleOf(t, 'action'),
        background: bg, color: fg,
        border: `${strokeControl(t)} solid ${border}`,
        ...typeOf(t, 'button'),
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
      {children ?? 'Button'}
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

function InputSpecimen({ t, v, icons, w }: SpecimenProps) {
  const { t: translate } = useI18n()
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
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', gap: 6, width: w ?? 260 }}>
      <span style={{ ...typeOf(t, 'label'), color: disabled ? t.disabledText : t.neutralText }}>
        {translate(meta.label)}
      </span>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, height: h, padding: '0 12px',
          borderRadius: radiusRoleOf(t, 'action'),
          border: `${strokeControl(t)} solid ${border}`,
          background: disabled ? t.disabledBg : inputSurfaceOf(t),
          boxShadow: state === 'Focused' ? `0 0 0 ${strokeFocus(t)} ${accent}26` : undefined,
        }}
      >
        {icons?.leading && <PreviewIcon prefix={icons.prefix} concept={slots.leading} size={16} color={iconColor} />}
        {meta.prefix && <span style={{ ...typeOf(t, 'placeholder'), color: t.fgMuted, borderRight: `${strokeControl(t)} solid ${t.border}`, paddingRight: 8 }}>{meta.prefix}</span>}
        {!icons?.leading && meta.lead && <span style={{ ...typeOf(t, 'placeholder'), color: t.placeholderText }}>{meta.lead}</span>}
        <span style={{ ...typeOf(t, 'placeholder'), flex: 1, color: state === 'Filled' ? t.neutralText : (disabled ? t.disabledText : t.placeholderText) }}>
          {state === 'Filled' ? (v.Type === 'E-Mail' ? 'maya@escala.ds' : 'Maya Duscenko') : meta.placeholder}
        </span>
        {icons?.trailing && <PreviewIcon prefix={icons.prefix} concept={slots.trailing} size={16} color={iconColor} />}
        {state === 'Loading' && <SpecimenSpinner size={13} color={t.brandSolid} track={t.brandSolid + '33'} />}
      </div>
      <span style={{ ...typeOf(t, 'helper'), color: error ? t.errorColor : t.fgMuted }}>
        {translate(error ? 'This field is required.' : 'This is a hint text.')}
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

function SelectSpecimen({ t, v, w }: SpecimenProps) {
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
        width: w ?? 240, height: sizeOf(t, sz.sizeKey, sz.h), padding: '0 12px',
        borderRadius: radiusRoleOf(t, 'action'),
        border: `${strokeControl(t)} solid ${border}`,
        background: disabled ? t.disabledBg : inputSurfaceOf(t),
        boxShadow: state === 'Focused' ? `0 0 0 ${strokeFocus(t)} ${accent}26` : undefined,
        ...typeOf(t, 'placeholder'), color: disabled ? t.disabledText : t.placeholderText,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: STATE_TRANSITION,
      }}
    >
      Select an option
      <PreviewIcon concept="chevron" size={12} color={disabled ? t.disabledText : t.fgMuted} />
    </div>
  )
}

// ── Checkbox (Checked × State) ────────────────────────────────────────────────

function CheckboxSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  const { t: translate } = useI18n()
  const checked = (v.Checked ?? 'True') === 'True'
  const state = v.State ?? 'Default'
  const disabled = state === 'Disabled'
  const small = (v.Size ?? 'MD') === 'SM'
  const box = selectorGlyph(t, small)
  const fill = disabled ? t.disabledBg : checked ? t.brandSolid : t.surface
  const line = disabled ? t.disabledBg : checked ? t.brandSolid : state === 'Hover' ? t.brandSolid : (t.border ?? '#d0d5dd')
  return (
    <label style={{ ...baseFont(t), display: 'inline-flex', alignItems: 'center', gap: hitGap(t, box, small ? 8 : 10), cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <HitArea t={t} box={box}>
        <span
          style={{
            width: box, height: box, borderRadius: radiusRoleOf(t, 'control'),
            background: fill, border: `${strokeControl(t)} solid ${line}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: state === 'Focused' ? focusRing(t, t.brandSolid) : undefined,
            transition: STATE_TRANSITION,
          }}
        >
          {checked && (
            <PreviewIcon concept="check" size={Math.round(box * 0.61)} color={disabled ? t.disabledText : t.onBrand} />
          )}
        </span>
      </HitArea>
      <span style={{ ...typeOf(t, 'label'), color: disabled ? t.disabledText : t.neutralText }}>{translate('Remember me')}</span>
    </label>
  )
}

// ── Toggle (On × State) ───────────────────────────────────────────────────────

function ToggleSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  const on = (v.On ?? 'True') === 'True'
  const state = v.State ?? 'Default'
  const disabled = state === 'Disabled'
  const small = (v.Size ?? 'MD') === 'SM'
  // The KNOB is the selector glyph — the same square a checkbox is drawn in.
  // Track height is knob + the 2px inset either side; width keeps the shipped
  // MD proportion (knob 18 → track 40). At the default ramp MD is unchanged;
  // SM normalizes from a knob of 14 (which matched no scale) to the ramp's 15.
  const knob = selectorGlyph(t, small)
  const trackH = knob + 4
  const trackW = knob + (small ? 18 : 22)
  const track = disabled ? t.disabledBg : on ? (state === 'Hover' ? darken(t.brandSolid, 0.4) : t.brandSolid) : (state === 'Hover' ? darken(t.neutralFill, 0.3) : t.neutralFill)
  return (
    <label style={{ ...baseFont(t), display: 'inline-flex', alignItems: 'center', gap: hitGap(t, trackH, small ? 8 : 10), cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <HitArea t={t} box={trackH}>
        <span
          role="switch"
          aria-checked={on}
          style={{
            width: trackW, height: trackH, borderRadius: radiusRoleOf(t, 'pill'), background: track, position: 'relative',
            transition: STATE_TRANSITION,
            boxShadow: state === 'Focused' ? focusRing(t, t.brandSolid) : undefined,
            display: 'inline-block',
          }}
        >
          <span
            style={{
              position: 'absolute', top: 2, left: on ? trackW - knob - 2 : 2, width: knob, height: knob,
              // ON: the knob sits on `brandSolid`, so it takes the ink solved
              // against that fill — the same `content.on-action` the Checkbox's
              // tick and the Button's label already use. It was literal white,
              // which is right for a dark accent and invisible for a pale one:
              // `solidInkPair` flips a pale brand's ink to near-black precisely
              // because white fails on it, and the knob was ignoring that.
              // OFF the track is `neutralFill`, where the page's own surface is
              // the conventional knob and stays correct in both appearances.
              borderRadius: 999, background: on ? t.onBrand : t.surface,
              boxShadow: '0 1px 2px rgba(10,13,18,0.2)', transition: 'left 0.15s',
            }}
          />
        </span>
      </HitArea>
      <span style={{ ...typeOf(t, 'label'), color: disabled ? t.disabledText : t.neutralText }}>Notifications</span>
    </label>
  )
}

// ── Badge (Style × Color) ─────────────────────────────────────────────────────

const BADGE_SIZE_SPECS: Record<string, { pad: string; f: number; dot: number; gap: number }> = {
  SM: { pad: '2px 8px', f: 11, dot: 5, gap: 5 },
  MD: { pad: '3px 10px', f: 12, dot: 6, gap: 6 },
  LG: { pad: '4px 12px', f: 13, dot: 7, gap: 7 },
}

function BadgeSpecimen({ t, v, children }: SpecimenProps) {
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
        borderRadius: radiusRoleOf(t, 'pill'), background: bg, color: fg, border: `${strokeControl(t)} solid ${line}`,
        ...typeOf(t, 'caption'),
      }}
    >
      <span style={{ width: sz.dot, height: sz.dot, borderRadius: 999, background: style === 'Solid' ? t.onBrand : c }} />
      {children ?? (v.Color ?? 'Brand')}
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
        width: s.d, height: s.d, borderRadius: radiusRoleOf(t, 'pill'),
        background: soft(t, t.brandSolid), color: t.brandText,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        ...typeOf(t, 'caption'),
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
        borderRadius: radiusRoleOf(t, 'container'), background: inverse, color: t.surface,
        boxShadow: shadowOf(t, 'xl', '0 8px 24px rgba(10,13,18,0.25)'), minWidth: 280,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: c, flexShrink: 0 }} />
      <span style={{ ...typeOf(t, 'body-sm'), flex: 1 }}>
        {v.Status === 'Error' ? 'Something went wrong.' : v.Status === 'Warning' ? 'Storage almost full.' : v.Status === 'Info' ? 'A new version is available.' : 'Changes saved.'}
      </span>
      <span style={{ ...typeOf(t, 'button'), textDecoration: 'underline', cursor: 'pointer' }}>Undo</span>
      <span style={{ ...typeOf(t, 'button'), opacity: 0.6, cursor: 'pointer' }}>✕</span>
    </div>
  )
}

// ── Spinner (Size) ────────────────────────────────────────────────────────────

const SPINNER_SIZES: Record<string, number> = { SM: 16, MD: 24, LG: 32 }

function SpinnerSpecimen({ t, v }: { t: PreviewTokens; v: AxisValues }) {
  return <SpecimenSpinner size={SPINNER_SIZES[v.Size ?? 'MD'] ?? 24} color={t.brandSolid} track={t.neutralFill} />
}

// ── Divider (Orientation) ─────────────────────────────────────────────────────

function DividerSpecimen({ t, v, w }: SpecimenProps) {
  const horizontal = (v.Orientation ?? 'Horizontal') === 'Horizontal'
  return horizontal
    ? <hr style={{ width: w ?? 220, border: 'none', borderTop: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}` }} />
    : <span style={{ display: 'inline-block', height: 64, width: 1, background: t.borderDefault ?? '#e9eaeb' }} />
}

// ── Single-variant specimens ──────────────────────────────────────────────────

function CardSpecimen({ t, w, children, elev }: SpecimenProps) {
  return (
    <div
      style={{
        ...baseFont(t), width: w ?? 280, padding: paddingOf(t),
        borderRadius: radiusRoleOf(t, 'container'),
        ...cardSurfaceStyle(t),
        border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`,
        boxShadow: shadowOf(t, elev ?? 'sm', '0 1px 2px rgba(10,13,18,0.05)'),
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      {children ?? (
        <>
          <span style={{ ...typeOf(t, 'heading-sm') }}>Card title</span>
          <span style={{ ...typeStyleOf(t, 'body-sm', { leading: true }), color: t.fgMuted }}>
            Supporting copy that explains the grouped content inside this surface.
          </span>
          <span style={{ ...typeOf(t, 'button'), color: t.brandText, cursor: 'pointer' }}>Learn more →</span>
        </>
      )}
    </div>
  )
}

function ModalSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div
      style={{
        ...baseFont(t), width: 320, borderRadius: radiusRoleOf(t, 'overlay'),
        background: t.surface, border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`,
        boxShadow: shadowOf(t, '2xl', '0 20px 48px rgba(10,13,18,0.25)'), overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 20px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...typeOf(t, 'heading-sm') }}>Delete project?</span>
        <span style={{ color: t.fgMuted, cursor: 'pointer' }}>✕</span>
      </div>
      <p style={{ padding: '4px 20px 16px', margin: 0, ...typeStyleOf(t, 'body-sm', { leading: true }), color: t.fgMuted }}>
        This action can't be undone. All tokens in this project will be removed.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}` }}>
        <span style={{ ...typeOf(t, 'button'), padding: '7px 14px', borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, cursor: 'pointer' }}>Cancel</span>
        <span style={{ ...typeOf(t, 'button'), padding: '7px 14px', borderRadius: radiusRoleOf(t, 'action'), background: t.errorColor, color: t.onBrand, cursor: 'pointer' }}>Delete</span>
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
      <span style={{ ...typeOf(t, 'caption'), padding: '6px 10px', borderRadius: radiusRoleOf(t, 'action'), background: inverse, color: t.surface }}>
        Copy to clipboard
      </span>
      <span style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${inverse}` }} />
    </div>
  )
}

function TabsSpecimen({ t }: { t: PreviewTokens }) {
  const tabs = ['Overview', 'Tokens', 'Usage']
  return (
    <div style={{ ...baseFont(t), display: 'flex', gap: 4, borderBottom: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}` }}>
      {tabs.map((tab, i) => (
        <span
          key={tab}
          style={{
            ...typeOf(t, 'button'), padding: '8px 14px', cursor: 'pointer',
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
    <nav aria-label="Breadcrumb" style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: 8 }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', ...typeOf(t, 'caption') }}>
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
    <div role="group" style={{ ...baseFont(t), display: 'inline-flex', border: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, borderRadius: radiusRoleOf(t, 'action'), overflow: 'hidden' }}>
      {items.map((label, i) => (
        <span
          key={label}
          style={{
            display: 'inline-flex', alignItems: 'center', height: sizeOf(t, sz.sizeKey, sz.h) - 2,
            padding: `0 ${sz.padX}px`, ...typeOf(t, 'label'), cursor: 'pointer',
            background: i === 1 ? t.neutralFill : t.surface,
            color: t.neutralText,
            borderLeft: i === 0 ? 'none' : `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`,
          }}
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function CloseButtonSpecimen({ t, v }: SpecimenProps) {
  const d = Math.round(parseFloat(sizeRoleOf(t, 'hit', '24px')) || 24)
  const state = v.State ?? 'Default'
  return (
    <button
      type="button"
      aria-label="Close"
      style={{
        width: d, height: d, borderRadius: radiusRoleOf(t, 'action'), border: 'none', cursor: 'pointer',
        background: state === 'Hover' ? t.neutralFill : 'transparent',
        color: t.fgMuted, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: state === 'Focused' ? focusRing(t, t.brandSolid) : undefined,
      }}
    >
      <PreviewIcon concept="close" size={Math.round(d * 0.44)} color={t.fgMuted} />
    </button>
  )
}

function FABButtonSpecimen({ t, v }: SpecimenProps) {
  const d = Math.round(parseFloat(sizeRoleOf(t, 'fab', '56px')) || 56)
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
      <PreviewIcon concept="plus" size={Math.round(d * 0.42)} color={t.onBrand} />
    </button>
  )
}

const PROVIDER_MARKS: Record<string, { glyph: string; color: string }> = {
  // THIRD-PARTY BRAND MARKS — deliberately literal, never tokens. A vendor's
  // logo does not retint with the user's accent; Google blue is Google blue in
  // every system. Same rule as `public/ide-logos/*` in AgentInstallPanel. Any
  // sweep for hardcoded colour should skip this table and the App Store button.
  Google: { glyph: 'G', color: '#4285f4' },
  Apple: { glyph: '', color: '#111111' },
  GitHub: { glyph: '', color: '#111111' },
  Figma: { glyph: '', color: '#111111' },
}

function ProviderMark({ provider, color }: { provider: string; color: string }) {
  if (provider === 'GitHub') return <GitHubGlyph size={17} />
  if (provider === 'Figma') return <FigmaGlyph size={17} />
  if (provider === 'Apple') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.47 7.82 1.31 10.38.87 1.25 1.9 2.66 3.26 2.61 1.31-.05 1.8-.85 3.38-.85 1.58 0 2.02.85 3.4.82 1.41-.02 2.3-1.27 3.16-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.73-1.05-2.76-4.17ZM14.44 4.9c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.29.69-3.03 1.56-.67.77-1.25 2-1.09 3.19 1.15.09 2.33-.59 3.05-1.46Z" />
      </svg>
    )
  }
  return <span style={{ color, lineHeight: 1, fontWeight: 600 }}>{PROVIDER_MARKS[provider]?.glyph ?? 'G'}</span>
}

function SocialLoginButtonSpecimen({ t, v, w }: SpecimenProps) {
  const { t: translate } = useI18n()
  const provider = v.Provider ?? 'Google'
  const mark = PROVIDER_MARKS[provider] ?? PROVIDER_MARKS.Google
  const large = (v.Size ?? 'MD') === 'LG'
  return (
    <button
      type="button"
      style={{
        ...baseFont(t),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: w ?? (large ? 320 : 280),
        height: large ? sizeOf(t, 'lg', 48) : sizeOf(t, 'md', 40) + 2,
        borderRadius: radiusRoleOf(t, 'action'),
        background: t.surface, border: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, cursor: 'pointer',
        color: t.neutralText,
        ...typeOf(t, 'button'),
      }}
    >
      <ProviderMark provider={provider} color={mark.color} />
      {translate('Continue with {provider}', { provider })}
    </button>
  )
}

function TextLinkSpecimen({ t, v, children }: SpecimenProps) {
  const state = v.State ?? 'Default'
  const disabled = state === 'Disabled'
  const anchor = (
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
      {children ?? 'design tokens guide ↗'}
    </a>
  )
  // With `children`, the caller supplies the WHOLE sentence around the link
  // (e.g. "Didn't get a code? <TextLink>Resend</TextLink>") — wrapping it in
  // "Read the …" too would double the prose. Without it, this is the demo
  // sentence, unchanged.
  return children ? anchor : <span style={{ ...typeOf(t, 'body-md') }}>Read the{' '}{anchor}</span>
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
        borderRadius: radiusRoleOf(t, 'action'), background: '#111111', color: '#ffffff',
        textDecoration: 'none', border: '1px solid #2a2a2a',
      }}
    >
      {play ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M4 3.5v17c0 .3.34.5.6.33l13.9-8.16a.4.4 0 0 0 0-.7L4.6 3.17a.4.4 0 0 0-.6.33Z" /></svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.47 7.82 1.31 10.38.87 1.25 1.9 2.66 3.26 2.61 1.31-.05 1.8-.85 3.38-.85 1.58 0 2.02.85 3.4.82 1.41-.02 2.3-1.27 3.16-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.73-1.05-2.76-4.17ZM14.44 4.9c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.29.69-3.03 1.56-.67.77-1.25 2-1.09 3.19 1.15.09 2.33-.59 3.05-1.46Z" /></svg>
      )}
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ ...typeOf(t, 'caption'), opacity: 0.8 }}>{play ? 'GET IT ON' : 'Download on the'}</span>
        <span style={{ ...typeOf(t, 'button') }}>{play ? 'Google Play' : 'App Store'}</span>
      </span>
    </a>
  )
}

// ── Form Controls — grouped inputs, choices and upload targets ────────────────

function InputGroupSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div style={{ ...baseFont(t), display: 'flex', width: 300, height: 40, borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, overflow: 'hidden' }}>
      <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', ...typeOf(t, 'placeholder'), color: t.fgMuted, background: t.neutralFill, borderRight: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}` }}>https://</span>
      <span style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 12px', ...typeOf(t, 'placeholder'), background: inputSurfaceOf(t), color: t.neutralText }}>escala.design</span>
      <span style={{ display: 'flex', alignItems: 'center', padding: '0 14px', ...typeOf(t, 'button'), background: inputSurfaceOf(t), color: t.brandText, borderLeft: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, cursor: 'pointer' }}>Copy</span>
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
      <span style={{ ...typeOf(t, 'label'), color: disabled ? t.disabledText : t.neutralText }}>Description</span>
      <div
        style={{
          minHeight: 88, padding: '10px 12px', borderRadius: radiusRoleOf(t, 'action'),
          border: `${strokeControl(t)} solid ${border}`, background: disabled ? t.disabledBg : inputSurfaceOf(t),
          ...typeStyleOf(t, 'placeholder', { leading: true }), color: disabled ? t.disabledText : t.placeholderText,
          boxShadow: state === 'Focused' ? `0 0 0 ${strokeFocus(t)} ${focus}26` : undefined,
        }}
      >
        Tell us about your design system…
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...typeOf(t, 'helper'), color: error ? t.errorColor : t.fgMuted }}>
        <span>{error ? 'Description is required.' : 'Max 200 characters.'}</span>
        <span>0/200</span>
      </div>
    </div>
  )
}

function InputOTPSpecimen({ t, v }: SpecimenProps) {
  const state = v.State ?? 'Default'
  const filled = state === 'Filled'
  const error = state === 'Error'
  const sizeKey = (v.Size ?? 'MD').toLowerCase()
  const dim = sizeOf(t, sizeKey, sizeKey === 'sm' ? 32 : sizeKey === 'lg' ? 48 : 40)
  const gap = parseFloat(
    v.Size === 'SM' ? spacingRoleOf(t, 'gap-tight', '4px') : spacingRoleOf(t, 'gap-control', '8px'),
  ) || 8
  const code = '824913'
  return (
    <div style={{ display: 'flex', gap }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          style={{
            ...baseFont(t),
            width: dim, height: dim, borderRadius: radiusRoleOf(t, 'action'),
            border: `${strokeControl(t)} solid ${error ? t.errorColor : filled || i > 0 ? (t.border ?? '#d0d5dd') : t.brandSolid}`,
            background: t.surface, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            ...typeOf(t, 'button'),
            boxShadow: !filled && !error && i === 0 ? `0 0 0 ${strokeFocus(t)} ${t.brandSolid}26` : undefined,
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
    ...typeOf(t, 'heading-xs'), color: t.fgMuted, cursor: 'pointer', background: t.surface,
  }
  return (
    <div style={{ ...baseFont(t), display: 'flex', height: 40, borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, overflow: 'hidden' }}>
      <span role="button" aria-label="Decrease" style={{ ...btn, borderRight: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}` }}>−</span>
      <span style={{ width: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', ...typeOf(t, 'body-md'), background: t.surface }}>12</span>
      <span role="button" aria-label="Increase" style={{ ...btn, borderLeft: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}` }}>+</span>
    </div>
  )
}

function InputTagSpecimen({ t }: { t: PreviewTokens }) {
  const tags = ['tokens', 'figma']
  return (
    <div style={{ ...baseFont(t), display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, width: 300, minHeight: 40, padding: '6px 10px', borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, background: t.surface }}>
      {tags.map((tag) => (
        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 999, background: soft(t, t.brandSolid), color: t.brandText, ...typeOf(t, 'label') }}>
          {tag}
          <PreviewIcon concept="close" size={9} color={t.brandText} />
        </span>
      ))}
      <span style={{ ...typeOf(t, 'placeholder'), color: t.placeholderText }}>Add a tag…</span>
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
          borderRadius: radiusRoleOf(t, 'action'),
          border: `${strokeControl(t)} solid ${open ? t.brandSolid : (t.border ?? '#d0d5dd')}`, background: t.surface,
          boxShadow: open ? `0 0 0 ${strokeFocus(t)} ${t.brandSolid}26` : undefined,
        }}
      >
        <span style={{ ...typeOf(t, 'placeholder'), flex: 1, color: open ? t.neutralText : t.placeholderText }}>{open ? 'Po' : 'Search fonts…'}</span>
        <PreviewIcon concept="chevron" size={12} color={t.fgMuted} />
      </div>
      {open && (
        <div style={{ marginTop: 4, borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, boxShadow: shadowOf(t, 'lg', '0 8px 24px rgba(10,13,18,0.12)'), padding: 4 }}>
          {options.map((o, i) => (
            <span key={o} style={{ display: 'block', padding: '7px 10px', borderRadius: radiusRoleOf(t, 'control'), ...typeOf(t, 'body-sm'), background: i === 1 ? soft(t, t.brandSolid) : 'transparent', color: i === 1 ? t.brandText : t.neutralText, fontWeight: i === 1 ? weightOf(t, 'medium', 500) : 400, cursor: 'pointer' }}>
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
      <span style={{ width: 18, height: 18, borderRadius: radiusRoleOf(t, 'control'), background: checked ? t.brandSolid : t.surface, border: `${strokeControl(t)} solid ${checked ? t.brandSolid : (t.border ?? '#d0d5dd')}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {checked && <PreviewIcon concept="check" size={11} color={t.onBrand} />}
      </span>
      <span style={{ ...typeOf(t, 'label'), color: t.neutralText }}>{children}</span>
    </label>
  )
}

function CheckboxGroupSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <fieldset style={{ ...baseFont(t), border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <legend style={{ ...typeOf(t, 'label'), color: t.fgMuted, marginBottom: 8, padding: 0 }}>Notify me about</legend>
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
        border: `${strokeControl(t)} solid ${disabled ? t.disabledBg : checked ? t.brandSolid : (t.border ?? '#d0d5dd')}`,
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
  const d = selectorGlyph(t, small)
  return (
    <label style={{ ...baseFont(t), display: 'inline-flex', alignItems: 'center', gap: hitGap(t, d, small ? 8 : 10), cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <HitArea t={t} box={d}>
        <RadioDot t={t} checked={checked} disabled={disabled} focused={state === 'Focused'} d={d} />
      </HitArea>
      <span style={{ ...typeOf(t, 'label'), color: disabled ? t.disabledText : t.neutralText }}>Monthly billing</span>
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
      <legend style={{ ...typeOf(t, 'label'), color: t.fgMuted, marginBottom: 8, padding: 0 }}>Billing period</legend>
      {options.map((o) => (
        <label key={o.label} style={{ display: 'inline-flex', alignItems: 'center', gap: hitGap(t, selectorGlyph(t, false), 10), cursor: 'pointer' }}>
          <HitArea t={t} box={selectorGlyph(t, false)}>
            <RadioDot t={t} checked={o.checked} d={selectorGlyph(t, false)} />
          </HitArea>
          <span style={{ ...typeOf(t, 'label'), color: t.neutralText }}>{o.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

function MiniSwitch({ t, on }: { t: PreviewTokens; on: boolean }) {
  return (
    <span role="switch" aria-checked={on} style={{ width: 36, height: 20, borderRadius: radiusRoleOf(t, 'pill'), background: on ? t.brandSolid : t.neutralFill, position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      {/* Same rule as SwitchSpecimen's knob — see the comment there. */}
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: 999, background: on ? t.onBrand : t.surface, boxShadow: '0 1px 2px rgba(10,13,18,0.2)' }} />
    </span>
  )
}

function SwitchGroupSpecimen({ t, w }: SpecimenProps) {
  const rows = [
    { label: 'Email notifications', on: true },
    { label: 'Push notifications', on: true },
    { label: 'Marketing emails', on: false },
  ]
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', gap: 12, width: w ?? 260 }}>
      <span style={{ ...typeOf(t, 'label'), color: t.fgMuted }}>Notifications</span>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ ...typeOf(t, 'label'), color: t.neutralText }}>{r.label}</span>
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

function SliderSpecimen({ t, w }: SpecimenProps) {
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
    <div style={{ ...baseFont(t), width: w ?? 260, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...typeOf(t, 'caption') }}>
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
          position: 'relative', height: 6, borderRadius: 999, backgroundColor: t.neutralFill,
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
      <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, background: t.surface, ...typeOf(t, 'button'), cursor: 'pointer' }}>
        <PreviewIcon concept="upload" size={14} color="currentColor" />
        Upload file
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface }}>
        <span style={{ ...typeOf(t, 'caption'), color: t.brandText, background: soft(t, t.brandSolid), padding: '3px 6px', borderRadius: radiusRoleOf(t, 'control') }}>PDF</span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', ...typeOf(t, 'caption') }}>
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
        width: 300, padding: '28px 20px', borderRadius: radiusRoleOf(t, 'container'),
        border: `1.5px dashed ${line}`,
        background: active ? softer(t, t.brandSolid) : error ? softer(t, t.errorColor) : t.surface,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
        transition: STATE_TRANSITION,
      }}
    >
      <span style={{ width: 40, height: 40, borderRadius: 999, background: error ? soft(t, t.errorColor) : soft(t, t.brandSolid), color: error ? t.errorColor : t.brandText, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <PreviewIcon concept="upload" size={17} color="currentColor" />
      </span>
      <span style={{ ...typeOf(t, 'body-sm') }}>
        <span style={{ fontWeight: weightOf(t, 'semibold', 600), color: t.brandText }}>Click to upload</span> or drag and drop
      </span>
      <span style={{ ...typeOf(t, 'helper'), color: error ? t.errorColor : t.fgMuted }}>
        {error ? 'File exceeds the 10MB limit.' : 'SVG, PNG or PDF (max. 10MB)'}
      </span>
    </div>
  )
}

function FieldSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', gap: spacingRoleOf(t, 'gap-control', '8px'), width: 260 }}>
      <span style={{ ...typeOf(t, 'label') }}>
        Workspace name <span style={{ color: t.errorColor }}>*</span>
      </span>
      <div style={{ display: 'flex', alignItems: 'center', height: 40, padding: '0 12px', borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, background: t.surface, ...typeOf(t, 'placeholder'), color: t.placeholderText }}>
        Acme Inc.
      </div>
      <span style={{ ...typeOf(t, 'helper'), color: t.fgMuted }}>Shown to your teammates.</span>
    </div>
  )
}

function LabelSpecimen({ t, v }: SpecimenProps) {
  const required = (v.Required ?? 'False') === 'True'
  return (
    <span style={{ ...baseFont(t), ...typeOf(t, 'label') }}>
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
      <div style={{ display: 'flex', alignItems: 'center', height: 40, padding: '0 12px', borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, background: inputSurfaceOf(t), ...typeOf(t, 'placeholder'), letterSpacing: 2, color: t.neutralText }}>
        ••••••••
      </div>
      <div style={{ display: 'flex', gap: 4 }} aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < meta.level ? color : t.neutralFill }} />
        ))}
      </div>
      <span style={{ ...typeOf(t, 'helper'), color: t.fgMuted }} aria-live="polite">{meta.caption}</span>
    </div>
  )
}

// ── Indicators — presence, chips, rating, file plates ─────────────────────────

const PRESENCE: Record<string, (t: PreviewTokens) => string> = {
  Online: (t) => t.successColor ?? '#17b26a',
  Away: (t) => t.warningColor ?? '#f79009',
  Busy: (t) => t.errorColor,
  // The other three presences resolve from the status ramps, so retinting
  // Success/Warning/Error moves them. Offline was a frozen grey, which meant a
  // tinted-neutral system showed three on-brand dots and one from a palette it
  // does not contain. It is the absence of a signal, so it reads as muted ink.
  Offline: (t) => t.fgMuted ?? '#717680',
}

function StatusBadgeSpecimen({ t, v }: SpecimenProps) {
  const status = v.Status ?? 'Online'
  const c = (PRESENCE[status] ?? PRESENCE.Online)(t)
  return (
    <span style={{ ...baseFont(t), display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 999, border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, ...typeOf(t, 'caption') }}>
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
        display: 'inline-flex', alignItems: 'center', gap: small ? 5 : 6, padding: small ? '3px 10px' : '5px 12px', borderRadius: radiusRoleOf(t, 'pill'),
        background: selected ? soft(t, t.brandSolid) : t.surface,
        border: `${strokeControl(t)} solid ${selected ? t.brandSolid + '66' : (t.border ?? '#d0d5dd')}`,
        color: selected ? t.brandText : t.neutralText,
        ...typeOf(t, 'label'), cursor: 'pointer',
      }}
    >
      Design tokens
      {dismissible && (
        <PreviewIcon concept="close" size={small ? 9 : 10} color={selected ? t.brandText : t.neutralText} />
      )}
    </span>
  )
}

function RatingSpecimen({ t, v }: SpecimenProps) {
  const interactive = (v.Interactive ?? 'False') === 'True'
  return (
    <div style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: 8 }} aria-label="4 of 5 stars">
      <span style={{ display: 'flex', gap: 3, cursor: interactive ? 'pointer' : 'default' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <PreviewIcon
            key={i}
            concept="star"
            size={18}
            color={i < 4 ? (t.warningColor ?? '#f79009') : (t.fgMuted || t.neutralFill)}
          />
        ))}
      </span>
      <span style={{ ...typeStyleOf(t, 'body-sm', { leading: true }), color: t.fgMuted }}>4.0 · 128 reviews</span>
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
      <span style={{ position: 'absolute', left: -4, bottom: 8, padding: '2px 6px', borderRadius: 4, background: c, color: '#ffffff', ...typeOf(t, 'caption'), letterSpacing: 0.5 }}>
        {format}
      </span>
    </span>
  )
}

// ── Content & Surfaces — disclosure, media, floating panels ───────────────────

function AccordionSpecimen({ t }: { t: PreviewTokens }) {
  const rows = ['What are design tokens?', 'How does Figma sync work?', 'Can I export CSS?']
  return (
    <div style={{ ...baseFont(t), width: 320, borderRadius: radiusRoleOf(t, 'container'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, overflow: 'hidden' }}>
      {rows.map((q, i) => (
        <div key={q} style={{ borderTop: i === 0 ? 'none' : `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}` }}>
          <button type="button" aria-expanded={i === 0} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '13px 16px', background: 'transparent', border: 'none', cursor: 'pointer', ...typeOf(t, 'heading-xs'), color: t.neutralText, textAlign: 'left' }}>
            {q}
            <span style={{ transform: i === 0 ? 'rotate(180deg)' : undefined, flexShrink: 0, display: 'inline-flex' }}>
              <PreviewIcon concept="chevron" size={13} color={t.fgMuted} />
            </span>
          </button>
          {i === 0 && (
            <p style={{ margin: 0, padding: '0 16px 14px', ...typeStyleOf(t, 'body-sm', { leading: true }), color: t.fgMuted }}>
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
        width: s.w, height: s.h, borderRadius: radiusRoleOf(t, 'action'),
        background: `linear-gradient(135deg, ${soft(t, t.brandSolid)}, ${t.brandSolid}44)`,
        border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...typeOf(t, 'button'), color: t.brandText,
      }}
    >
      {ratio}
    </div>
  )
}

function PopoverSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 260, borderRadius: radiusRoleOf(t, 'overlay'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, boxShadow: shadowOf(t, 'xl', '0 12px 32px rgba(10,13,18,0.14)'), padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ ...typeOf(t, 'heading-xs') }}>Share this system</span>
        <span style={{ ...typeStyleOf(t, 'body-sm', { leading: true }), color: t.fgMuted }}>Anyone with the link can view tokens and docs.</span>
        <span style={{ alignSelf: 'flex-start', marginTop: 4, ...typeOf(t, 'button'), padding: '6px 12px', borderRadius: radiusRoleOf(t, 'action'), background: t.brandSolid, color: t.onBrand, cursor: 'pointer' }}>Copy link</span>
      </div>
      <span style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `6px solid ${t.surface}`, filter: 'drop-shadow(0 1px 0 rgba(10,13,18,0.08))' }} aria-hidden />
      <span style={{ ...typeOf(t, 'label'), padding: '7px 14px', borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, background: t.surface, cursor: 'pointer' }}>Share</span>
    </div>
  )
}

function InfoTooltipSpecimen({ t }: { t: PreviewTokens }) {
  // See ToastSpecimen's note — same fix, same reason.
  const inverse = t.neutralText
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ ...typeOf(t, 'caption'), padding: '6px 10px', borderRadius: radiusRoleOf(t, 'action'), background: inverse, color: t.surface }}>
        Applies to new projects only.
      </span>
      <span style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${inverse}` }} aria-hidden />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...typeOf(t, 'label') }}>
        Default visibility
        <PreviewIcon concept="info" size={14} color={t.fgMuted} />
      </span>
    </div>
  )
}

function ScrollAreaSpecimen({ t }: { t: PreviewTokens }) {
  const rows = ['Accent / 500', 'Accent / 600', 'Neutral / 100', 'Neutral / 200', 'Success / 500']
  return (
    <div style={{ ...baseFont(t), position: 'relative', width: 240, height: 150, borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, overflow: 'hidden', padding: '6px 14px 6px 6px' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((r) => (
          <span key={r} style={{ padding: '8px 10px', ...typeOf(t, 'body-sm'), color: t.neutralText, borderRadius: radiusRoleOf(t, 'control') }}>{r}</span>
        ))}
      </div>
      <span style={{ position: 'absolute', top: 8, right: 4, width: 5, height: 56, borderRadius: 999, background: t.neutralFill }} aria-hidden />
    </div>
  )
}

// ── Feedback — banners and callouts ───────────────────────────────────────────

function StatusIcon({ c, status }: { c: string; status: string }) {
  const concept: IconConcept =
    status === 'Success' ? 'success' : status === 'Warning' ? 'warning' : status === 'Error' ? 'error' : 'info'
  return <PreviewIcon concept={concept} size={15} color={c} />
}

function AlertBannerSpecimen({ t, v }: SpecimenProps) {
  const status = v.Status ?? 'Info'
  const c = statusColor(t, status)
  return (
    <div role="status" style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: 10, width: 380, padding: '10px 14px', borderRadius: radiusRoleOf(t, 'action'), background: soft(t, c), border: `${strokeControl(t)} solid ${statusBorder(t, status, c)}` }}>
      <StatusIcon c={c} status={status} />
      <span style={{ ...typeOf(t, 'body-sm'), flex: 1 }}>
        {status === 'Error' ? 'Sync failed — tokens were not published.' : status === 'Warning' ? 'Your trial ends in 3 days.' : status === 'Success' ? 'All tokens are synced to Figma.' : 'Scheduled maintenance on Sunday 02:00 UTC.'}
      </span>
      <span style={{ ...typeOf(t, 'button'), color: c, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {status === 'Warning' ? 'Upgrade' : 'View'}
      </span>
      <PreviewIcon concept="close" size={12} color={t.fgMuted} />
    </div>
  )
}

function InlineAlertSpecimen({ t, v, w, children }: SpecimenProps) {
  const status = v.Status ?? 'Info'
  const c = statusColor(t, status)
  return (
    <div role="status" style={{ ...baseFont(t), display: 'flex', gap: 10, width: w ?? 320, padding: 14, borderRadius: radiusRoleOf(t, 'action'), background: soft(t, c), border: `${strokeControl(t)} solid ${statusBorder(t, status, c)}` }}>
      <StatusIcon c={c} status={status} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
        {children ?? (
          <>
            <span style={{ ...typeOf(t, 'button') }}>
              {status === 'Error' ? 'Export failed' : status === 'Warning' ? 'Contrast warning' : status === 'Success' ? 'System saved' : 'Heads up'}
            </span>
            <span style={{ ...typeStyleOf(t, 'body-sm', { leading: true }), color: t.fgMuted }}>
              {status === 'Warning' ? 'Accent 400 on white is below AA for body text.' : 'Semantic tokens re-derive when the accent changes.'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

// ── Navigation — menus, pagination, steps and shells ──────────────────────────

function MenuPanel({
  t, items, shortcuts, w = 210, elev = 'lg',
}: {
  t: PreviewTokens
  items: { label: string; danger?: boolean; hover?: boolean; sep?: boolean }[]
  shortcuts?: Record<string, string>
  w?: number | string
  elev?: string
}) {
  return (
    <div role="menu" style={{ ...baseFont(t), width: w, maxWidth: '100%', borderRadius: radiusRoleOf(t, 'overlay'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, boxShadow: shadowOf(t, elev, '0 12px 32px rgba(10,13,18,0.14)'), padding: 4 }}>
      {items.map((item, i) =>
        item.sep ? (
          <span key={i} style={{ display: 'block', height: 1, background: t.borderDefault ?? '#e9eaeb', margin: '4px 6px' }} aria-hidden />
        ) : (
          <span
            key={item.label}
            role="menuitem"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              padding: '7px 10px', borderRadius: radiusRoleOf(t, 'control'), ...typeOf(t, 'body-sm'), cursor: 'pointer',
              background: item.hover ? t.neutralFill : 'transparent',
              color: item.danger ? t.errorColor : t.neutralText,
            }}
          >
            {item.label}
            {shortcuts?.[item.label] && <span style={{ ...typeOf(t, 'caption'), color: t.placeholderText }}>{shortcuts[item.label]}</span>}
          </span>
        ),
      )}
    </div>
  )
}

function DropdownMenuSpecimen({ t }: { t: PreviewTokens }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
      <span style={{ ...baseFont(t), display: 'inline-flex', alignItems: 'center', gap: 6, ...typeOf(t, 'label'), padding: '7px 12px', borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, background: t.surface, cursor: 'pointer' }}>
        Options
        <PreviewIcon concept="chevron" size={11} color={t.fgMuted} />
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

function ContextMenuSpecimen({ t, w, elev }: Pick<SpecimenProps, 't' | 'w' | 'elev'>) {
  return (
    <MenuPanel
      t={t}
      w={w}
      elev={elev}
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
    <div style={{ ...baseFont(t), width: 320, borderRadius: radiusRoleOf(t, 'container'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, boxShadow: shadowOf(t, '2xl', '0 20px 48px rgba(10,13,18,0.18)'), overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}` }}>
        <PreviewIcon concept="search" size={14} color={t.fgMuted} />
        <span style={{ flex: 1, ...typeOf(t, 'placeholder'), color: t.placeholderText }}>Type a command…</span>
        <span style={{ ...typeOf(t, 'caption'), color: t.placeholderText, border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, borderRadius: 5, padding: '2px 5px' }}>⌘K</span>
      </div>
      <div style={{ padding: 6 }}>
        <span style={{ display: 'block', padding: '4px 10px', ...typeOf(t, 'caption'), textTransform: 'uppercase', letterSpacing: 1, color: t.placeholderText }}>Actions</span>
        {results.map((r) => (
          <span key={r.label} style={{ display: 'block', padding: '7px 10px', borderRadius: radiusRoleOf(t, 'control'), ...typeOf(t, 'body-sm'), color: t.neutralText, background: r.hover ? t.neutralFill : 'transparent', cursor: 'pointer' }}>
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
    <header style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: 20, width: 420, padding: '10px 16px', borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface }}>
      <span style={{ width: 24, height: 24, borderRadius: radiusRoleOf(t, 'control'), background: t.brandSolid, flexShrink: 0 }} aria-hidden />
      <nav aria-label="Main" style={{ display: 'flex', gap: 14, flex: 1 }}>
        {links.map((l, i) => (
          <span key={l} style={{ ...typeOf(t, i === 0 ? 'button' : 'body-sm'), cursor: 'pointer', color: i === 0 ? t.neutralText : t.fgMuted }}>{l}</span>
        ))}
      </nav>
      <span style={{ width: 28, height: 28, borderRadius: 999, background: soft(t, t.brandSolid), color: t.brandText, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...typeOf(t, 'caption'), flexShrink: 0 }}>MD</span>
    </header>
  )
}

const SIDEBAR_ICONS: Record<string, IconConcept> = {
  home: 'home',
  color: 'palette',
  box: 'box',
  gear: 'settings',
}

function SidebarSpecimen({ t }: { t: PreviewTokens }) {
  const items = [
    { icon: 'home', label: 'Overview' },
    { icon: 'color', label: 'Tokens', active: true },
    { icon: 'box', label: 'Components' },
    { icon: 'gear', label: 'Settings' },
  ]
  return (
    <nav aria-label="Sidebar" style={{ ...baseFont(t), width: 200, padding: 8, borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: t.surface, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((item) => (
        <span
          key={item.label}
          aria-current={item.active ? 'page' : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: radiusRoleOf(t, 'control'), ...typeOf(t, 'body-sm'), cursor: 'pointer',
            background: item.active ? soft(t, t.brandSolid) : 'transparent',
            color: item.active ? t.brandText : t.neutralText,
            fontWeight: item.active ? weightOf(t, 'medium', 500) : 400,
          }}
        >
          <PreviewIcon concept={SIDEBAR_ICONS[item.icon]} size={15} color={item.active ? t.brandText : t.neutralText} />
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
        minWidth: 32, height: 32, padding: '0 6px', borderRadius: radiusRoleOf(t, 'action'),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        ...typeOf(t, 'body-sm'), cursor: muted ? 'default' : 'pointer',
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
                ...typeOf(t, 'button'),
                background: s.state === 'done' ? t.brandSolid : s.state === 'current' ? soft(t, t.brandSolid) : t.neutralFill,
                color: s.state === 'done' ? t.onBrand : s.state === 'current' ? t.brandText : t.fgMuted,
                border: s.state === 'current' ? `${strokeControl(t)} solid ${t.brandSolid}` : `${strokeControl(t)} solid transparent`,
              }}
            >
              {s.state === 'done' ? (
                <PreviewIcon concept="check" size={12} color={t.onBrand} />
              ) : (
                i + 1
              )}
            </span>
            <span style={{ ...typeOf(t, s.state === 'current' ? 'label' : 'helper'), color: s.state === 'todo' ? t.fgMuted : t.neutralText }}>{s.label}</span>
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
              position: 'relative', padding: '7px 14px', borderRadius: 999, ...typeOf(t, 'button'), cursor: 'pointer',
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
    <div role="radiogroup" style={{ ...baseFont(t), display: 'inline-flex', padding: 3, gap: 2, borderRadius: radiusRoleOf(t, 'action'), background: t.neutralFill }}>
      {items.map((item, i) => (
        <span
          key={item}
          role="radio"
          aria-checked={i === 0}
          style={{
            padding: small ? '4px 10px' : '6px 14px', borderRadius: radiusRoleOf(t, 'control'), ...typeOf(t, 'button'), cursor: 'pointer',
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
  w,
  children,
  elev,
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
  /** Forwards `SpecimenProps.w` / `children` / `elev`. Opt-in, same contract
   *  as calling the specimen directly — omitted call sites (Color collage)
   *  stay byte-identical. Needed so a labelled artefact button still paints
   *  the shipped Hover/Pressed variants. */
  w?: number | string
  children?: ReactNode
  elev?: string
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
      style={{
        display: w != null ? 'flex' : 'inline-flex',
        width: w,
        cursor: flip ? 'pointer' : undefined,
      }}
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
      {render({ t, v: merged, icons, w, children, elev })}
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
