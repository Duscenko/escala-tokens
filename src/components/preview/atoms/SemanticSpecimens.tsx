// Per-category specimens for Color · Alias/Semantics. Selecting a group in the
// table's left nav points the right panel at the matching specimen here, so the
// preview shows the ROLES being edited rather than one static component dump.
//
// Two rules keep these honest:
//  · Every colour comes from the resolved `PreviewTokens` (architecture-aware —
//    `resolvePreviewTokens` overlays Categorical/Vibrancy/Tonal and applies
//    `architectureOverrides`), never from a hardcoded hex. Editing a token
//    repaints the specimen, in every architecture.
//  · Every element is CAPTIONED with the token driving it, named in the active
//    architecture's own vocabulary (`action.primary` in Categorical,
//    `background-brand-solid` in Flat) — a preview that shows a colour without
//    saying which token produced it doesn't help you edit tokens.

import { type ReactNode } from 'react'
import { fontFamilyOf, radiusOf, weightOf } from '../../../lib/previewTokens'
import { TokenIcon, type IconConcept } from '../../configurator/docs/specimens'
import type { PreviewTokens } from '../ButtonPreview'

export type SemanticFocusKey = 'content' | 'icon' | 'action' | 'surface' | 'status' | 'border'

type Slot = { css: string; label: string }

/**
 * Resolves one role to its live colour + the name it goes by in the ACTIVE
 * architecture. `archId` is the Categorical-style `category.token` id; when the
 * current architecture publishes it, that wins for both value and label,
 * otherwise the flat role key does. `fallback` is the already-resolved
 * `PreviewTokens` field, so a role that no architecture names still paints.
 */
function slotOf(t: PreviewTokens, flatKey: string, archId: string, fallback: string): Slot {
  const arch = t.archTokens
  if (arch && arch[archId]) return { css: arch[archId], label: archId }
  const flat = t.semanticMap ?? {}
  return { css: flat[flatKey] || fallback, label: flatKey }
}

// ── Shared chrome ───────────────────────────────────────────────────────────
function Caption({ children, color }: { children: ReactNode; color: string }) {
  return (
    <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color }} className="truncate">
      {children}
    </code>
  )
}

function Frame({ t, children }: { t: PreviewTokens; children: ReactNode }) {
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.borderDefault || t.border || '#eaecf0'}`,
        borderRadius: 14,
        fontFamily: fontFamilyOf(t),
      }}
      className="p-5 flex flex-col gap-5"
    >
      {children}
    </div>
  )
}

function Section({ t, title, children }: { t: PreviewTokens; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span
        style={{ fontSize: 10, letterSpacing: '0.08em', color: t.fgMuted || '#717680' }}
        className="uppercase"
      >
        {title}
      </span>
      {children}
    </div>
  )
}

/** A specimen element beside the token name that drives it. */
function Row({ t, label, children }: { t: PreviewTokens; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex items-center gap-2 flex-wrap">{children}</div>
      <Caption color={t.fgMuted || '#717680'}>{label}</Caption>
    </div>
  )
}

// ── Content — the text hierarchy, each line painted by its own ink ──────────
export function ContentSpecimen({ tokens: t }: { tokens: PreviewTokens }) {
  const s = (flat: string, arch: string, fb: string) => slotOf(t, flat, arch, fb)
  const primary = s('content-primary', 'content.primary', t.neutralText)
  const secondary = s('content-secondary', 'content.secondary', t.fgMuted || t.neutralText)
  const tertiary = s('content-tertiary', 'content.subtle', t.fgMuted || t.neutralText)
  const brandInk = s('content-brand', 'content.accent', t.brandText)
  const disabled = s('content-disabled', 'action.disabled', t.disabledText)
  const onFill = s('content-inverse', 'content.on-action', t.onBrand)
  const fill = s('background-brand-solid', 'action.primary', t.brandSolid)

  const Line = ({ slot, size, weight, children }: { slot: Slot; size: number; weight: number; children: ReactNode }) => (
    <Row t={t} label={slot.label}>
      <span style={{ color: slot.css, fontSize: size, fontWeight: weight, lineHeight: 1.35 }} className="truncate">
        {children}
      </span>
    </Row>
  )

  return (
    <Frame t={t}>
      <Section t={t} title="Hierarchy">
        <div className="flex flex-col gap-2.5">
          <Line slot={primary} size={22} weight={weightOf(t, 'bold', 700)}>Build your design system</Line>
          <Line slot={secondary} size={15} weight={weightOf(t, 'semibold', 600)}>Foundations that scale</Line>
          <Line slot={tertiary} size={13} weight={400}>
            Tokens keep colour, type and spacing consistent across every surface.
          </Line>
          <Line slot={brandInk} size={13} weight={weightOf(t, 'semibold', 600)}>Read the documentation →</Line>
          <Line slot={disabled} size={13} weight={400}>Unavailable option</Line>
        </div>
      </Section>

      {/* Content ink paints GLYPHS as well as type — Categorical says so
          outright ("text & icon ink"), and a hierarchy judged only on text
          hides that the same tone reads differently at icon weight. Glyphs
          come from the system's own icon library (see IconSpecimen). */}
      <Section t={t} title="The same ink on glyphs">
        <div className="flex items-center gap-4 flex-wrap">
          {([
            { slot: primary, concept: 'home' as IconConcept },
            { slot: secondary, concept: 'search' as IconConcept },
            { slot: tertiary, concept: 'settings' as IconConcept },
            { slot: brandInk, concept: 'star' as IconConcept },
            { slot: disabled, concept: 'zap' as IconConcept },
          ]).map((g, i) => (
            <span key={i} className="flex flex-col items-center gap-1.5 min-w-0">
              <TokenIcon t={t} concept={g.concept} size={20} color={g.slot.css} />
              <Caption color={t.fgMuted || '#717680'}>{g.slot.label.split('.').pop()}</Caption>
            </span>
          ))}
        </div>
      </Section>

      {/* Ink on a filled surface — the one content role that is judged against
          a fill rather than the page, so it's shown on that fill. */}
      <Section t={t} title="On a filled surface">
        <div
          className="flex items-center justify-between gap-3"
          style={{ background: fill.css, borderRadius: radiusOf(t, 'md', '8px'), padding: '10px 12px' }}
        >
          <span
            className="flex items-center gap-2"
            style={{ color: onFill.css, fontSize: 13, fontWeight: weightOf(t, 'semibold', 600) }}
          >
            <TokenIcon t={t} concept="check" size={15} color={onFill.css} />
            Text on a brand fill
          </span>
          <Caption color={onFill.css}>{onFill.label}</Caption>
        </div>
      </Section>
    </Frame>
  )
}

// ── Icon — the glyph hierarchy, in the contexts icons are actually judged ────
// Astryx ships `icon.*` as its OWN parallel hierarchy to `text.*` (icons read
// lighter than type at the same tone, so they get their own ramp steps), which
// had no preview at all — picking "Icon" in the nav showed the text specimen.
// Architectures without a dedicated icon group (Categorical, flat) fall back
// to their content inks, which is exactly what those roles mean there.
//
// Every glyph comes from `TokenIcon` → `t.iconPrefix`, i.e. the library chosen
// in Foundations · Icons — never a hand-drawn SVG — so switching the library
// re-renders this with that set's real glyphs, same as the Color collage and
// the component docs.
export function IconSpecimen({ tokens: t }: { tokens: PreviewTokens }) {
  const s = (flat: string, arch: string, fb: string) => slotOf(t, flat, arch, fb)
  const primary = s('content-primary', 'icon.primary', t.neutralText)
  const secondary = s('content-secondary', 'icon.secondary', t.fgMuted || t.neutralText)
  const disabled = s('content-disabled', 'icon.disabled', t.disabledText)
  const accent = s('content-brand', 'icon.accent', t.brandText)
  const onFill = s('content-inverse', 'content.on-action', t.onBrand)
  const fill = s('background-brand-solid', 'action.primary', t.brandSolid)
  const surface = s('background-secondary', 'action.neutral', t.neutralFill)
  const r = radiusOf(t, 'md', '8px')

  const hierarchy: { slot: Slot; concept: IconConcept }[] = [
    { slot: primary, concept: 'home' },
    { slot: secondary, concept: 'search' },
    { slot: accent, concept: 'star' },
    { slot: disabled, concept: 'settings' },
  ]

  return (
    <Frame t={t}>
      <Section t={t} title="Hierarchy">
        <div className="flex flex-col gap-2.5">
          {hierarchy.map((g) => (
            <Row key={g.slot.label} t={t} label={g.slot.label}>
              <TokenIcon t={t} concept={g.concept} size={20} color={g.slot.css} />
              <span style={{ color: g.slot.css, fontSize: 13 }} className="truncate">
                {g.slot.label.split('.').pop()}
              </span>
            </Row>
          ))}
        </div>
      </Section>

      {/* Icon-only buttons are the strictest test: no label to fall back on,
          so the glyph ink has to carry the whole affordance on each fill. */}
      <Section t={t} title="On fills">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className="inline-flex items-center justify-center"
            style={{ background: fill.css, borderRadius: r, width: 34, height: 34 }}
            title={onFill.label}
          >
            <TokenIcon t={t} concept="plus" size={17} color={onFill.css} />
          </span>
          <span
            className="inline-flex items-center justify-center"
            style={{ background: surface.css, borderRadius: r, width: 34, height: 34 }}
            title={primary.label}
          >
            <TokenIcon t={t} concept="share" size={17} color={primary.css} />
          </span>
          <span
            className="inline-flex items-center gap-2"
            style={{
              background: surface.css, borderRadius: r, padding: '0 12px', height: 34,
              color: primary.css, fontSize: 13, fontWeight: weightOf(t, 'semibold', 600),
            }}
          >
            <TokenIcon t={t} concept="upload" size={15} color={primary.css} />
            Upload
          </span>
        </div>
      </Section>

      <Section t={t} title="Inline with text">
        <div className="flex flex-col gap-2">
          {([
            { slot: accent, concept: 'info' as IconConcept, copy: 'Learn how tokens resolve' },
            { slot: secondary, concept: 'user' as IconConcept, copy: 'Signed in as designer' },
          ]).map((line) => (
            <span key={line.copy} className="flex items-center gap-2 min-w-0">
              <TokenIcon t={t} concept={line.concept} size={15} color={line.slot.css} />
              <span style={{ color: line.slot.css, fontSize: 13 }} className="truncate">{line.copy}</span>
            </span>
          ))}
        </div>
      </Section>
    </Frame>
  )
}

// ── Action — interactive fills: buttons, badges, inputs, controls ───────────
export function ActionSpecimen({ tokens: t }: { tokens: PreviewTokens }) {
  const s = (flat: string, arch: string, fb: string) => slotOf(t, flat, arch, fb)
  const primary = s('background-brand-solid', 'action.primary', t.brandSolid)
  const neutral = s('background-secondary', 'action.neutral', t.neutralFill)
  const secondary = s('background-brand-primary', 'action.secondary', t.neutralFill)
  const disabled = s('action-disabled', 'action.disabled', t.disabledBg)
  const onAction = s('content-inverse', 'content.on-action', t.onBrand)
  const brandInk = s('content-brand', 'content.accent', t.brandText)
  const stroke = s('border-primary', 'border.default', t.border || '#d0d5dd')
  const r = radiusOf(t, 'md', '8px')
  const semi = weightOf(t, 'semibold', 600)

  const Btn = ({ bg, fg, bd, children }: { bg: string; fg: string; bd?: string; children: ReactNode }) => (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 14px',
        borderRadius: r, background: bg, color: fg,
        border: `1px solid ${bd ?? 'transparent'}`, fontSize: 13, fontWeight: semi,
      }}
    >
      {children}
    </span>
  )

  return (
    <Frame t={t}>
      <Section t={t} title="Buttons">
        <div className="flex flex-col gap-2">
          <Row t={t} label={primary.label}>
            <Btn bg={primary.css} fg={onAction.css}>Primary</Btn>
          </Row>
          <Row t={t} label={secondary.label}>
            <Btn bg={secondary.css} fg={brandInk.css}>Secondary</Btn>
          </Row>
          <Row t={t} label={neutral.label}>
            <Btn bg={neutral.css} fg={t.neutralText}>Neutral</Btn>
          </Row>
          <Row t={t} label={stroke.label}>
            <Btn bg="transparent" fg={t.neutralText} bd={stroke.css}>Outline</Btn>
          </Row>
          <Row t={t} label={disabled.label}>
            <Btn bg={disabled.css} fg={t.disabledText}>Disabled</Btn>
          </Row>
        </div>
      </Section>

      <Section t={t} title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          <span style={{ background: primary.css, color: onAction.css, borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: semi }}>Solid</span>
          <span style={{ background: secondary.css, color: brandInk.css, borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: semi }}>Soft</span>
          <span style={{ background: 'transparent', color: t.neutralText, border: `1px solid ${stroke.css}`, borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: semi }}>Outline</span>
        </div>
      </Section>

      {/* Controls read the same action fill as the buttons — the point is that
          one token moves every interactive surface at once. */}
      <Section t={t} title="Controls">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2" style={{ fontSize: 13, color: t.neutralText }}>
            <span style={{ width: 16, height: 16, borderRadius: radiusOf(t, 'sm', '4px'), background: primary.css, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: onAction.css, fontSize: 11, fontWeight: 700 }}>✓</span>
            Checkbox
          </span>
          <span className="inline-flex items-center gap-2" style={{ fontSize: 13, color: t.neutralText }}>
            <span style={{ width: 32, height: 18, borderRadius: 999, background: primary.css, position: 'relative', display: 'inline-block' }}>
              <span style={{ position: 'absolute', top: 2, left: 16, width: 14, height: 14, borderRadius: 999, background: onAction.css }} />
            </span>
            Switch
          </span>
        </div>
        <div
          style={{
            height: 36, borderRadius: r, border: `1px solid ${stroke.css}`,
            display: 'flex', alignItems: 'center', padding: '0 12px',
            fontSize: 13, color: t.placeholderText || t.fgMuted,
          }}
        >
          Input field
        </div>
      </Section>
    </Frame>
  )
}

// ── Surface — the elevation stack, page → layers → overlay ──────────────────
export function SurfaceSpecimen({ tokens: t }: { tokens: PreviewTokens }) {
  const s = (flat: string, arch: string, fb: string) => slotOf(t, flat, arch, fb)
  const page = s('background-primary', 'surface.page', t.surface)
  const layer1 = s('background-secondary', 'surface.layer-1', t.neutralFill)
  const layer2 = s('background-tertiary', 'surface.layer-2', t.neutralFill)
  const accent = s('background-brand-primary', 'surface.accent', t.neutralFill)
  const inverse = s('surface-inverse', 'surface.inverse', t.neutralText)
  const stroke = s('border-secondary', 'border.subtle', t.borderDefault || t.border || '#e9eaeb')
  const r = radiusOf(t, 'lg', '12px')

  return (
    <Frame t={t}>
      {/* Nested, not side-by-side: elevation only reads as elevation when the
          layers actually sit on each other. */}
      <Section t={t} title="Elevation">
        <div style={{ background: page.css, border: `1px solid ${stroke.css}`, borderRadius: r, padding: 12 }}>
          <Caption color={t.fgMuted || '#717680'}>{page.label}</Caption>
          <div style={{ background: layer1.css, border: `1px solid ${stroke.css}`, borderRadius: radiusOf(t, 'md', '8px'), padding: 12, marginTop: 8 }}>
            <Caption color={t.fgMuted || '#717680'}>{layer1.label}</Caption>
            <div style={{ background: layer2.css, borderRadius: radiusOf(t, 'sm', '6px'), padding: 12, marginTop: 8 }}>
              <Caption color={t.fgMuted || '#717680'}>{layer2.label}</Caption>
            </div>
          </div>
        </div>
      </Section>

      <Section t={t} title="Accent & inverse">
        <div className="flex gap-2.5">
          <div style={{ flex: 1, minWidth: 0, background: accent.css, borderRadius: radiusOf(t, 'md', '8px'), padding: '14px 12px' }}>
            <Caption color={t.brandText}>{accent.label}</Caption>
          </div>
          <div style={{ flex: 1, minWidth: 0, background: inverse.css, borderRadius: radiusOf(t, 'md', '8px'), padding: '14px 12px' }}>
            <Caption color={t.surface}>{inverse.label}</Caption>
          </div>
        </div>
      </Section>

      {/* A scrim only makes sense over content, so the modal renders on top of
          a dimmed layer rather than as another flat swatch. */}
      <Section t={t} title="Overlay">
        <div style={{ position: 'relative', borderRadius: radiusOf(t, 'md', '8px'), overflow: 'hidden', background: layer1.css, height: 108 }}>
          <div style={{ position: 'absolute', inset: 0, background: s('background-overlay', 'surface.overlay', t.neutralText).css, opacity: 0.55 }} />
          <div
            style={{
              position: 'absolute', left: 14, right: 14, top: 20,
              background: page.css, border: `1px solid ${stroke.css}`,
              borderRadius: radiusOf(t, 'md', '8px'), padding: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: weightOf(t, 'semibold', 600), color: t.neutralText }}>Dialog</div>
            <div style={{ fontSize: 12, color: t.fgMuted, marginTop: 2 }}>Sits above the scrim</div>
          </div>
        </div>
      </Section>
    </Frame>
  )
}

// ── Status — feedback, one alert per severity ───────────────────────────────
export function StatusSpecimen({ tokens: t }: { tokens: PreviewTokens }) {
  const s = (flat: string, arch: string, fb: string) => slotOf(t, flat, arch, fb)
  const r = radiusOf(t, 'md', '8px')
  const semi = weightOf(t, 'semibold', 600)

  const severities: { label: string; bg: Slot; fg: Slot; copy: string }[] = [
    {
      label: 'Critical',
      bg: s('background-error-primary', 'status.critical-bg', t.neutralFill),
      fg: s('content-error', 'status.critical-fg', t.errorColor),
      copy: 'Could not save your changes',
    },
    {
      label: 'Warning',
      bg: s('background-warning-primary', 'status.warning-bg', t.neutralFill),
      fg: s('content-warning', 'status.warning-fg', t.warningColor || t.errorColor),
      copy: 'Your free trial ends soon',
    },
    {
      label: 'Success',
      bg: s('background-success-primary', 'status.success-bg', t.neutralFill),
      fg: s('content-success', 'status.success-fg', t.successColor || t.brandText),
      copy: 'Payment confirmed',
    },
  ]

  return (
    <Frame t={t}>
      {/* fg/bg ship as a PAIR per severity, so they're shown as a pair — the
          only way to judge whether the ink actually reads on its own tint. */}
      <Section t={t} title="Alerts">
        <div className="flex flex-col gap-2">
          {severities.map((sev) => (
            <div key={sev.label} style={{ background: sev.bg.css, borderRadius: r, padding: '10px 12px' }}>
              <div className="flex items-center justify-between gap-3">
                <span style={{ color: sev.fg.css, fontSize: 13, fontWeight: semi }}>{sev.copy}</span>
                <Caption color={sev.fg.css}>{sev.fg.label}</Caption>
              </div>
              <Caption color={sev.fg.css}>{sev.bg.label}</Caption>
            </div>
          ))}
        </div>
      </Section>

      <Section t={t} title="Status chips">
        <div className="flex flex-wrap items-center gap-2">
          {severities.map((sev) => (
            <span
              key={sev.label}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: sev.bg.css, color: sev.fg.css,
                borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: semi,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: sev.fg.css }} />
              {sev.label}
            </span>
          ))}
        </div>
      </Section>

      {/* A toast is the highest-contrast use of a status pair — inverse surface
          with the severity dot, so a low-contrast fg shows up immediately. */}
      <Section t={t} title="Toast">
        <div
          style={{
            background: slotOf(t, 'surface-inverse', 'surface.inverse', t.neutralText).css,
            borderRadius: r, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, background: severities[2].fg.css }} />
          <span style={{ color: t.surface, fontSize: 13, flex: 1 }}>Changes saved.</span>
          <span style={{ color: t.surface, fontSize: 12, fontWeight: semi, textDecoration: 'underline' }}>Undo</span>
        </div>
      </Section>
    </Frame>
  )
}

// ── Border — strokes in the contexts where they're actually judged ──────────
export function BorderSpecimen({ tokens: t }: { tokens: PreviewTokens }) {
  const s = (flat: string, arch: string, fb: string) => slotOf(t, flat, arch, fb)
  const def = s('border-primary', 'border.default', t.border || '#d0d5dd')
  const subtle = s('border-secondary', 'border.subtle', t.borderDefault || '#e9eaeb')
  const accent = s('border-brand', 'border.accent', t.brandSolid)
  const active = s('border-brand', 'border.active', t.brandSolid)
  const critical = s('border-error', 'border.critical', t.errorColor)
  const r = radiusOf(t, 'md', '8px')

  const Field = ({ slot, text, ring }: { slot: Slot; text: string; ring?: boolean }) => (
    <Row t={t} label={slot.label}>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', height: 34, minWidth: 150, padding: '0 12px',
          borderRadius: r, border: `1px solid ${slot.css}`,
          boxShadow: ring ? `0 0 0 3px ${slot.css}33` : undefined,
          fontSize: 13, color: t.placeholderText || t.fgMuted,
        }}
      >
        {text}
      </span>
    </Row>
  )

  return (
    <Frame t={t}>
      {/* Borders are only judgeable on the thing they outline — a swatch of a
          1px stroke tells you nothing about whether an input reads. */}
      <Section t={t} title="Inputs">
        <div className="flex flex-col gap-2">
          <Field slot={def} text="Default" />
          <Field slot={active} text="Focused" ring />
          <Field slot={critical} text="Invalid" />
        </div>
      </Section>

      <Section t={t} title="Separators">
        <div className="flex flex-col gap-2">
          <Row t={t} label={subtle.label}>
            <span style={{ display: 'block', width: 180, height: 1, background: subtle.css }} />
          </Row>
          <Row t={t} label={def.label}>
            <span style={{ display: 'block', width: 180, height: 1, background: def.css }} />
          </Row>
        </div>
      </Section>

      <Section t={t} title="Containers">
        <div className="flex gap-2.5">
          <div style={{ flex: 1, minWidth: 0, border: `1px solid ${subtle.css}`, borderRadius: r, padding: 12 }}>
            <Caption color={t.fgMuted || '#717680'}>{subtle.label}</Caption>
          </div>
          <div style={{ flex: 1, minWidth: 0, border: `1px solid ${accent.css}`, borderRadius: r, padding: 12 }}>
            <Caption color={t.brandText}>{accent.label}</Caption>
          </div>
        </div>
      </Section>
    </Frame>
  )
}

export const SEMANTIC_SPECIMENS: Record<SemanticFocusKey, (p: { tokens: PreviewTokens }) => ReactNode> = {
  content: ContentSpecimen,
  icon: IconSpecimen,
  action: ActionSpecimen,
  surface: SurfaceSpecimen,
  status: StatusSpecimen,
  border: BorderSpecimen,
}

export const SEMANTIC_SPECIMEN_TITLE: Record<SemanticFocusKey, string> = {
  content: 'Content preview',
  icon: 'Icon preview',
  action: 'Action preview',
  surface: 'Surface preview',
  status: 'Status preview',
  border: 'Border preview',
}
