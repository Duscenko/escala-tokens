// Per-category specimens for Color · Alias/Semantics. Selecting a group in the
// table's left nav points the right panel at the matching specimen here, so the
// preview shows the ROLES being edited rather than one static component dump.
//
// Two rules keep these honest:
//  · Every colour comes from the resolved `PreviewTokens` (architecture-aware —
//    `resolvePreviewTokens` overlays Categorical and applies
//    `architectureOverrides`), never from a hardcoded hex. Editing a token
//    repaints the specimen.
//  · Every element is CAPTIONED with the token driving it, named in the active
//    architecture's own vocabulary (`action.primary` in Categorical,
//    `background-brand-solid` in Flat) — a preview that shows a colour without
//    saying which token produced it doesn't help you edit tokens.

import { type ReactNode } from 'react'
import { radiusOf, typeStyleOf } from '../../../lib/previewTokens'
import { checkContrast, WCAG_AA } from '../../../lib/colorUtils'
import { TokenIcon, type IconConcept } from '../../configurator/docs/specimens'
import type { PreviewTokens } from '../ButtonPreview'
import { EditIcon } from './RoleEditCard'

export type SemanticFocusKey = 'content' | 'icon' | 'action' | 'surface' | 'status' | 'border'

export type SpecimenProps = {
  tokens: PreviewTokens
  /** Jump Color · Semantics to this token's table row (`slot.label`). */
  onEditToken?: (id: string) => void
}

type Slot = { css: string; label: string }

/**
 * Reports a fg/bg pair that reads under WCAG AA, INSTEAD of silently repairing
 * it. A preview's job here is to tell the truth about the tokens: this pair
 * really is that unreadable in production, and the row it's on is the row you'd
 * go fix. Repairing it in the preview is what made this specimen disagree with
 * the Color collage for the same token.
 */
function ContrastFlag({ fg, bg }: { fg: string; bg: string }) {
  let ratio: number
  try {
    ratio = checkContrast(fg, bg)
  } catch {
    return null
  }
  if (ratio >= WCAG_AA) return null
  return (
    <span
      title={`${ratio.toFixed(2)}:1 — under the WCAG AA minimum of ${WCAG_AA}:1 for this text on this fill. Re-point either token in the table to fix it.`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[9.5px] font-semibold tabular-nums flex-shrink-0 text-amber-700 dark:text-amber-400 bg-amber-500/15"
    >
      {ratio.toFixed(1)}:1
    </span>
  )
}

/**
 * Resolves one role to its live colour + the name it goes by in the ACTIVE
 * architecture.
 *
 * `archIds` is the id (or ids) this slot goes by in the curated architecture —
 * Categorical's `category.token`. It stays a LIST rather than a single string
 * because it was one when several architectures shipped side by side, and the
 * bug that shape exists to prevent is worth keeping cheap to re-fix: a slot
 * that matches nothing silently falls through to the flat catalogue, which is
 * a DIFFERENT scheme's answer. Measured when that happened, the Action preview
 * painted its Primary button from `themes['background-brand-solid']` while
 * every other accent surface painted from `t.brandSolid` — two different
 * greens on screen at once, from one accent.
 *
 * `fallback` is the already-arch-resolved `PreviewTokens` field, and for a
 * NON-FLAT architecture it beats the flat map for the same reason: when the
 * active scheme has no equivalent for a slot, the flat value is a different
 * scheme's answer and reintroduces exactly that mismatch. The flat map is only
 * consulted when the architecture IS flat, where it's the precise per-role
 * value and the coarser `t.*` field would lose detail.
 */
function slotOf(t: PreviewTokens, flatKey: string, archIds: string | string[], fallback: string): Slot {
  const arch = t.archTokens
  if (arch) {
    for (const id of Array.isArray(archIds) ? archIds : [archIds]) {
      if (arch[id]) return { css: arch[id], label: id }
    }
    return { css: fallback, label: flatKey }
  }
  const flat = t.semanticMap ?? {}
  return { css: flat[flatKey] || fallback, label: flatKey }
}

// ── Shared chrome ───────────────────────────────────────────────────────────
function Caption({ children, color }: { children: ReactNode; color: string }) {
  return (
    <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color }} className="truncate min-w-0">
      {children}
    </code>
  )
}

function typeOf(t: PreviewTokens, role: string, leading = false) {
  return typeStyleOf(t, role, { leading })
}

function Frame({ t, children }: { t: PreviewTokens; children: ReactNode }) {
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.borderDefault || t.border || '#eaecf0'}`,
        borderRadius: 14,
        ...typeOf(t, 'body-md'),
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
        style={{ ...typeOf(t, 'caption'), letterSpacing: '0.08em', color: t.fgMuted || '#717680' }}
        className="uppercase"
      >
        {title}
      </span>
      {children}
    </div>
  )
}

/** Token id + the live swatch. The square is the edit hit — same chip language
 *  as the Semantics table (rounded square, never a dot), so the preview and
 *  the matrix agree on what a colour token looks like. */
function TokenMark({
  slot,
  onEdit,
  color,
}: {
  slot: Slot
  onEdit?: (id: string) => void
  color: string
}) {
  const swatch = (
    <span
      aria-hidden
      className="block w-3.5 h-3.5 rounded-[3px] ring-1 ring-black/10 dark:ring-white/10"
      style={{ backgroundColor: slot.css }}
    />
  )
  const chipClass =
    'inline-flex items-center justify-center w-6 h-6 rounded-md bg-surface border border-line flex-shrink-0'
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
      <Caption color={color}>{slot.label}</Caption>
      {onEdit ? (
        <button
          type="button"
          onClick={() => onEdit(slot.label)}
          title={`Edit ${slot.label} in the table`}
          aria-label={`Edit ${slot.label} in the table`}
          className={`${chipClass} hover:border-line-strong hover:bg-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg active:scale-[0.97]`}
        >
          {swatch}
        </button>
      ) : (
        <span className={chipClass}>{swatch}</span>
      )}
    </span>
  )
}

/** Specimen left, token id + swatch right. The visual always keeps its width —
 *  long ids like `action.primary.pressed` truncate instead of crushing buttons.
 *  `shrinkVisual` flips that: for a specimen that's itself running text (the
 *  Content hierarchy's headline/body lines) it's the VISUAL that has to give,
 *  not the token id — a fixed-width wrapper around running text defeats its
 *  own `truncate` (a flex child can't shrink below its content size unless its
 *  parent allows it to), so the line ran past the card's edge instead of
 *  ellipsizing. */
function Row({
  t, slot, onEdit, children, shrinkVisual = false,
}: {
  t: PreviewTokens
  slot: Slot
  onEdit?: (id: string) => void
  children: ReactNode
  shrinkVisual?: boolean
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`flex items-center gap-2 min-w-0 ${shrinkVisual ? 'flex-1' : 'flex-shrink-0'}`}>{children}</div>
      <div className={`flex justify-end ${shrinkVisual ? 'flex-shrink-0' : 'min-w-0 flex-1'}`}>
        <TokenMark slot={slot} onEdit={onEdit} color={t.fgMuted || '#717680'} />
      </div>
    </div>
  )
}

// ── Content — the text hierarchy, each line painted by its own ink ──────────
export function ContentSpecimen({ tokens: t, onEditToken }: SpecimenProps) {
  const s = (flat: string, arch: string | string[], fb: string) => slotOf(t, flat, arch, fb)
  const primary = s('content-primary', ['content.primary', 'text.primary', 'base.foreground'], t.neutralText)
  const secondary = s('content-secondary', ['content.secondary', 'text.secondary', 'muted.foreground'], t.fgMuted || t.neutralText)
  const tertiary = s('content-tertiary', ['content.subtle', 'muted.foreground'], t.fgMuted || t.neutralText)
  const brandInk = s('content-brand', ['content.accent', 'text.accent', 'primary.fill'], t.brandText)
  const link = s('content-brand', ['content.link.default', 'text.accent', 'primary.fill'], t.brandText)
  const linkHover = s('content-brand', ['content.link.hover', 'text.accent', 'primary.fill'], t.brandText)
  const disabled = s('content-disabled', ['content.disabled', 'text.disabled'], t.disabledText)
  const onFill = s('content-inverse', ['content.on-action', 'accent.on-solid', 'primary.foreground'], t.onBrand)
  const fill = s('background-brand-solid', ['action.primary.default', 'action.primary', 'accent.solid', 'primary.fill'], t.brandSolid)

  const Line = ({ slot, role, children }: { slot: Slot; role: string; children: ReactNode }) => (
    <Row t={t} slot={slot} onEdit={onEditToken} shrinkVisual>
      <span style={{ color: slot.css, ...typeStyleOf(t, role) }} className="truncate block min-w-0">
        {children}
      </span>
    </Row>
  )

  return (
    <Frame t={t}>
      <Section t={t} title="Hierarchy">
        <div className="flex flex-col gap-2.5">
          <Line slot={primary} role="heading-md">Build your design system</Line>
          <Line slot={secondary} role="heading-xs">Foundations that scale</Line>
          <Line slot={tertiary} role="body-sm">
            Tokens keep colour, type and spacing consistent across every surface.
          </Line>
          <Line slot={brandInk} role="button">Read the documentation →</Line>
          <Line slot={link} role="button">Learn more in the docs</Line>
          <Line slot={linkHover} role="button">Learn more (hover)</Line>
          <Line slot={disabled} role="body-sm">Unavailable option</Line>
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
            style={{ color: onFill.css, ...typeOf(t, 'button') }}
          >
            <TokenIcon t={t} concept="check" size={15} color={onFill.css} />
            Text on a brand fill
          </span>
          <TokenMark slot={onFill} onEdit={onEditToken} color={onFill.css} />
        </div>
        <TokenMark slot={fill} onEdit={onEditToken} color={t.fgMuted || '#717680'} />
      </Section>
    </Frame>
  )
}

// ── Icon — the glyph hierarchy, in the contexts icons are actually judged ────
// `icon.*` is a hierarchy parallel to `text.*` where an architecture ships one
// (icons read lighter than type at the same tone, so they get their own ramp
// steps). Categorical and flat have no dedicated icon group, so this falls back
// to their content inks — which is exactly what those roles mean there.
//
// Every glyph comes from `TokenIcon` → `t.iconPrefix`, i.e. the library chosen
// in Foundations · Icons — never a hand-drawn SVG — so switching the library
// re-renders this with that set's real glyphs, same as the Color collage and
// the component docs.
export function IconSpecimen({ tokens: t, onEditToken }: SpecimenProps) {
  const s = (flat: string, arch: string | string[], fb: string) => slotOf(t, flat, arch, fb)
  const primary = s('content-primary', ['icon.primary', 'content.primary', 'text.primary', 'base.foreground'], t.neutralText)
  const secondary = s('content-secondary', ['icon.secondary', 'content.secondary', 'text.secondary', 'muted.foreground'], t.fgMuted || t.neutralText)
  const disabled = s('content-disabled', ['icon.disabled', 'content.disabled', 'text.disabled'], t.disabledText)
  const accent = s('content-brand', ['icon.accent', 'content.accent', 'text.accent', 'primary.fill'], t.brandText)
  const onFill = s('content-inverse', ['content.on-action', 'accent.on-solid', 'primary.foreground'], t.onBrand)
  const fill = s('background-brand-solid', ['action.primary.default', 'action.primary', 'accent.solid', 'primary.fill'], t.brandSolid)
  const surface = s('background-secondary', ['action.secondary.default', 'action.neutral', 'background.surface', 'secondary.fill'], t.neutralFill)
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
            <Row key={g.slot.label} t={t} slot={g.slot} onEdit={onEditToken}>
              <TokenIcon t={t} concept={g.concept} size={20} color={g.slot.css} />
              <span style={{ color: g.slot.css, ...typeOf(t, 'body-sm') }} className="truncate">
                {g.slot.label.split('.').pop()}
              </span>
            </Row>
          ))}
        </div>
      </Section>

      {/* Icon-only buttons are the strictest test: no label to fall back on,
          so the glyph ink has to carry the whole affordance on each fill. */}
      <Section t={t} title="On fills">
        <div className="flex flex-col gap-2">
          <Row t={t} slot={onFill} onEdit={onEditToken}>
            <span
              className="inline-flex items-center justify-center"
              style={{ background: fill.css, borderRadius: r, width: 34, height: 34 }}
            >
              <TokenIcon t={t} concept="plus" size={17} color={onFill.css} />
            </span>
          </Row>
          <Row t={t} slot={primary} onEdit={onEditToken}>
            <span
              className="inline-flex items-center justify-center"
              style={{ background: surface.css, borderRadius: r, width: 34, height: 34 }}
            >
              <TokenIcon t={t} concept="share" size={17} color={primary.css} />
            </span>
            <span
              className="inline-flex items-center gap-2"
              style={{
                background: surface.css, borderRadius: r, padding: '0 12px', height: 34,
                color: primary.css, ...typeOf(t, 'button'),
              }}
            >
              <TokenIcon t={t} concept="upload" size={15} color={primary.css} />
              Upload
            </span>
          </Row>
        </div>
      </Section>

      <Section t={t} title="Inline with text">
        <div className="flex flex-col gap-2">
          {([
            { slot: accent, concept: 'info' as IconConcept, copy: 'Learn how tokens resolve' },
            { slot: secondary, concept: 'user' as IconConcept, copy: 'Signed in as designer' },
          ]).map((line) => (
            <Row key={line.copy} t={t} slot={line.slot} onEdit={onEditToken}>
              <TokenIcon t={t} concept={line.concept} size={15} color={line.slot.css} />
              <span style={{ color: line.slot.css, ...typeOf(t, 'body-sm') }} className="truncate">{line.copy}</span>
            </Row>
          ))}
        </div>
      </Section>
    </Frame>
  )
}

// ── Action — interactive fills: buttons, badges, inputs, controls ───────────
export function ActionSpecimen({ tokens: t, onEditToken }: SpecimenProps) {
  const s = (flat: string, arch: string | string[], fb: string) => slotOf(t, flat, arch, fb)
  const primary = s('background-brand-solid', ['action.primary.default', 'action.primary', 'accent.solid', 'primary.fill'], t.brandSolid)
  const primaryHover = s('background-brand-solid-hover', ['action.primary.hover', 'accent.solid'], t.brandSolid)
  const primaryPressed = s('background-brand-solid-hover', ['action.primary.pressed', 'accent.solid'], t.brandSolid)
  const neutral = s('background-secondary', ['action.secondary.default', 'action.neutral', 'background.surface', 'secondary.fill'], t.neutralFill)
  const secondary = s('background-brand-primary', ['action.secondary.accent', 'action.secondary', 'accent.muted'], t.neutralFill)
  const disabled = s('action-disabled', ['action.disabled', 'background.muted', 'muted.fill'], t.disabledBg)
  // No flat-catalogue equivalent — these only exist in Categorical (see
  // design-plans/alpha-primitives.md), so the flatKey is a label only, never
  // actually looked up while `t.archTokens` is populated (always, in
  // practice — see CLAUDE.md's About-tab/architecture notes). Shown one per
  // INTENT rather than all six: hover carries the colour difference that
  // matters here, and six near-identical washes would read as noise.
  const ghostNeutral = s('action-ghost-neutral', ['action.ghost.neutral.hover'], t.neutralFill)
  const ghostBrand = s('action-ghost-brand', ['action.ghost.brand.hover'], t.neutralFill)
  const ghostDanger = s('action-ghost-danger', ['action.ghost.danger.hover'], t.neutralFill)
  const onAction = s('content-inverse', ['content.on-action', 'accent.on-solid', 'primary.foreground'], t.onBrand)
  const labelInk = s('content-primary', ['content.primary', 'text.primary', 'base.foreground'], t.neutralText)
  const stroke = s('border-primary', ['border.strong', 'border.default'], t.border || '#d0d5dd')
  const r = radiusOf(t, 'md', '8px')

  const Btn = ({ bg, fg, bd, children }: { bg: string; fg: string; bd?: string; children: ReactNode }) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        height: 34,
        padding: '0 14px',
        borderRadius: r,
        background: bg,
        color: fg,
        border: `1px solid ${bd ?? 'transparent'}`,
        whiteSpace: 'nowrap',
        ...typeOf(t, 'button'),
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  )

  return (
    <Frame t={t}>
      <Section t={t} title="Buttons">
        <div className="flex flex-col gap-2">
          <Row t={t} slot={primary} onEdit={onEditToken}>
            <Btn bg={primary.css} fg={onAction.css}>Primary</Btn>
          </Row>
          <Row t={t} slot={secondary} onEdit={onEditToken}>
            <Btn bg={secondary.css} fg={labelInk.css}>Secondary</Btn>
          </Row>
          <Row t={t} slot={neutral} onEdit={onEditToken}>
            <Btn bg={neutral.css} fg={labelInk.css}>Neutral</Btn>
          </Row>
          <Row t={t} slot={stroke} onEdit={onEditToken}>
            <Btn bg="transparent" fg={labelInk.css} bd={stroke.css}>Outline</Btn>
          </Row>
          {/* A ghost button has no fill of its own, so the swatch worth
              showing is the WASH — alpha primitives, not solid tones. One per
              intent, all at hover, so the three read as a set. */}
          <Row t={t} slot={ghostNeutral} onEdit={onEditToken}>
            <Btn bg={ghostNeutral.css} fg={labelInk.css}>Ghost neutral</Btn>
          </Row>
          <Row t={t} slot={ghostBrand} onEdit={onEditToken}>
            <Btn bg={ghostBrand.css} fg={labelInk.css}>Ghost brand</Btn>
          </Row>
          <Row t={t} slot={ghostDanger} onEdit={onEditToken}>
            <Btn bg={ghostDanger.css} fg={labelInk.css}>Ghost danger</Btn>
          </Row>
          <Row t={t} slot={disabled} onEdit={onEditToken}>
            <Btn bg={disabled.css} fg={t.disabledText}>Disabled</Btn>
          </Row>
          <Row t={t} slot={primaryHover} onEdit={onEditToken}>
            <Btn bg={primaryHover.css} fg={onAction.css}>Hover</Btn>
          </Row>
          <Row t={t} slot={primaryPressed} onEdit={onEditToken}>
            <Btn bg={primaryPressed.css} fg={onAction.css}>Pressed</Btn>
          </Row>
        </div>
      </Section>

      <Section t={t} title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          <span style={{ background: primary.css, color: onAction.css, borderRadius: 999, padding: '3px 10px', ...typeOf(t, 'caption') }}>Solid</span>
          <span style={{ background: secondary.css, color: labelInk.css, borderRadius: 999, padding: '3px 10px', ...typeOf(t, 'caption') }}>Soft</span>
          <span style={{ background: 'transparent', color: labelInk.css, border: `1px solid ${stroke.css}`, borderRadius: 999, padding: '3px 10px', ...typeOf(t, 'caption') }}>Outline</span>
        </div>
      </Section>

      {/* Controls read the same action fill as the buttons — the point is that
          one token moves every interactive surface at once. */}
      <Section t={t} title="Controls">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2" style={{ ...typeOf(t, 'label'), color: labelInk.css }}>
            <span style={{ width: 16, height: 16, borderRadius: radiusOf(t, 'sm', '4px'), background: primary.css, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <TokenIcon t={t} concept="check" size={11} color={onAction.css} />
            </span>
            Checkbox
          </span>
          <span className="inline-flex items-center gap-2" style={{ ...typeOf(t, 'label'), color: labelInk.css }}>
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
            ...typeOf(t, 'placeholder'), color: t.placeholderText || t.fgMuted,
          }}
        >
          Input field
        </div>
      </Section>
    </Frame>
  )
}

// ── Surface — the elevation stack, page → layers → overlay ──────────────────
export function SurfaceSpecimen({ tokens: t, onEditToken }: SpecimenProps) {
  const s = (flat: string, arch: string | string[], fb: string) => slotOf(t, flat, arch, fb)
  const page = s('background-primary', ['surface.page', 'background.body', 'base.background'], t.surface)
  const layer1 = s('background-secondary', ['surface.layer-1', 'background.surface', 'card.fill'], t.neutralFill)
  const layer2 = s('background-tertiary', ['surface.layer-2', 'background.muted', 'muted.fill'], t.neutralFill)
  const input = s('background-primary', ['surface.input', 'background.body', 'base.background'], t.surface)
  const selected = s('background-brand-primary', ['surface.selected', 'accent.muted'], t.neutralFill)
  const accent = s('background-brand-primary', ['surface.accent', 'accent.muted'], t.neutralFill)
  const inverse = s('surface-inverse', ['surface.inverse', 'background.inverted'], t.neutralText)
  const overlay = s('background-overlay', ['surface.overlay'], t.neutralText)
  const stroke = s('border-secondary', ['border.subtle', 'border.emphasized', 'border.input'], t.borderDefault || t.border || '#e9eaeb')
  const r = radiusOf(t, 'lg', '12px')

  return (
    <Frame t={t}>
      {/* Nested, not side-by-side: elevation only reads as elevation when the
          layers actually sit on each other. */}
      <Section t={t} title="Elevation">
        <div style={{ background: page.css, border: `1px solid ${stroke.css}`, borderRadius: r, padding: 12 }}>
          <TokenMark slot={page} onEdit={onEditToken} color={t.fgMuted || '#717680'} />
          <div style={{ background: layer1.css, border: `1px solid ${stroke.css}`, borderRadius: radiusOf(t, 'md', '8px'), padding: 12, marginTop: 8 }}>
            <TokenMark slot={layer1} onEdit={onEditToken} color={t.fgMuted || '#717680'} />
            <div style={{ background: layer2.css, borderRadius: radiusOf(t, 'sm', '6px'), padding: 12, marginTop: 8 }}>
              <TokenMark slot={layer2} onEdit={onEditToken} color={t.fgMuted || '#717680'} />
            </div>
          </div>
        </div>
      </Section>

      <Section t={t} title="Input & selected">
        <div className="flex flex-col gap-2.5">
          <div style={{ background: input.css, border: `1px solid ${stroke.css}`, borderRadius: radiusOf(t, 'md', '8px'), padding: '10px 12px' }}>
            <TokenMark slot={input} onEdit={onEditToken} color={t.fgMuted || '#717680'} />
          </div>
          <div style={{ background: selected.css, borderRadius: radiusOf(t, 'md', '8px'), padding: '10px 12px' }}>
            <span style={{ color: t.neutralText, ...typeOf(t, 'body-sm') }}>Selected row</span>
            <TokenMark slot={selected} onEdit={onEditToken} color={t.fgMuted || '#717680'} />
          </div>
        </div>
      </Section>

      <Section t={t} title="Accent & inverse">
        <div className="flex gap-2.5">
          <div style={{ flex: 1, minWidth: 0, background: accent.css, borderRadius: radiusOf(t, 'md', '8px'), padding: '14px 12px' }}>
            <TokenMark slot={accent} onEdit={onEditToken} color={t.brandText} />
          </div>
          <div style={{ flex: 1, minWidth: 0, background: inverse.css, borderRadius: radiusOf(t, 'md', '8px'), padding: '14px 12px' }}>
            <TokenMark slot={inverse} onEdit={onEditToken} color={t.surface} />
          </div>
        </div>
      </Section>

      {/* A scrim only makes sense over content, so the modal renders on top of
          a dimmed layer rather than as another flat swatch. */}
      <Section t={t} title="Overlay">
        <div style={{ position: 'relative', borderRadius: radiusOf(t, 'md', '8px'), overflow: 'hidden', background: layer1.css, height: 108 }}>
          {/* No hardcoded opacity here any more — `surface.overlay` resolves to
              a genuinely translucent alpha primitive now (`{black-a.8}`), so a
              bolted-on `opacity` would double-apply transparency on top of the
              token's own. Before the alpha-primitives fix this token was
              opaque (`{neutral.12}`), and 0.55 was the only thing making this
              demo read as a scrim at all. */}
          <div style={{ position: 'absolute', inset: 0, background: overlay.css }} />
          <div
            style={{
              position: 'absolute', left: 14, right: 14, top: 20,
              background: page.css, border: `1px solid ${stroke.css}`,
              borderRadius: radiusOf(t, 'md', '8px'), padding: 12,
            }}
          >
            <div style={{ ...typeOf(t, 'heading-xs'), color: t.neutralText }}>Dialog</div>
            <div style={{ ...typeOf(t, 'body-sm', true), color: t.fgMuted, marginTop: 2 }}>Sits above the scrim</div>
          </div>
        </div>
        <TokenMark slot={overlay} onEdit={onEditToken} color={t.fgMuted || '#717680'} />
      </Section>
    </Frame>
  )
}

// ── Status — feedback, one alert per severity ───────────────────────────────
export function StatusSpecimen({ tokens: t, onEditToken }: SpecimenProps) {
  const s = (flat: string, arch: string | string[], fb: string) => slotOf(t, flat, arch, fb)
  const r = radiusOf(t, 'md', '8px')

  // **Nothing here substitutes a colour. Every slot renders the token's REAL
  // value, and a failing pair is reported rather than repaired.**
  //
  // This replaced a guard that swapped in an accessible ink whenever the fg
  // read under AA on its tint. That guard is unfixable by construction: it
  // lived HERE, so `t.successColor` rendered one colour in this specimen and
  // its true value in every other preview — measured on a live system, the
  // Status alert showed `#0c3b22` while the Color collage's Success badge
  // showed `#2ea064` for one token. And it can't simply be pushed down to the
  // shared catalogue either: `SPECIMENS` is what the Figma plugin ships, so a
  // preview-only contrast fudge there would make the specimen disagree with
  // the exported component (see the collage's "never hand-rolled markup" rule).
  //
  // So the guard is gone in the direction this file's own rule already pointed:
  // showing one colour under another colour's name teaches the wrong value, and
  // an honestly unreadable alert is information — it is exactly as unreadable in
  // production. `ContrastFlag` below surfaces the ratio instead.
  //
  // Categorical ships a REAL severity ink for text on its own tint
  // (`status.*-fg`, contrast-solved). The extra candidates below are the
  // muted-tint spellings kept from when other architectures shipped: a
  // severity SOLID is a fill for icons and buttons, and forcing one into a
  // text slot is what makes it "fail" — the honest modelling is neutral text
  // on a muted tint with the severity colour spent on the dot.
  const criticalBg = s('background-error-primary', ['status.critical.surface', 'status.critical-bg', 'status.error-muted'], t.neutralFill)
  const warningBg = s('background-warning-primary', ['status.warning.surface', 'status.warning-bg', 'status.warning-muted'], t.neutralFill)
  const successBg = s('background-success-primary', ['status.success.surface', 'status.success-bg', 'status.success-muted'], t.neutralFill)

  const criticalSolid = s('background-error-solid', ['status.critical.surface-solid', 'status.error', 'destructive.fill'], t.errorColor)
  const onCriticalSolid = s('content-inverse', ['status.critical.on-solid', 'accent.on-solid', 'primary.foreground'], t.onBrand)

  const severities: { label: string; bg: Slot; fg: Slot; dot: Slot; copy: string }[] = [
    {
      label: 'Critical',
      bg: criticalBg,
      fg: s('content-error', ['status.critical.content', 'status.critical-fg', 'text.primary', 'base.foreground'], t.errorColor),
      dot: s('content-error', ['status.critical.content', 'status.critical-fg', 'status.error', 'destructive.fill'], t.errorColor),
      copy: 'Could not save your changes',
    },
    {
      label: 'Warning',
      bg: warningBg,
      fg: s('content-warning', ['status.warning.content', 'status.warning-fg', 'text.primary', 'base.foreground'], t.warningColor || t.errorColor),
      dot: s('content-warning', ['status.warning.content', 'status.warning-fg', 'status.warning'], t.warningColor || t.errorColor),
      copy: 'Your free trial ends soon',
    },
    {
      label: 'Success',
      bg: successBg,
      fg: s('content-success', ['status.success.content', 'status.success-fg', 'text.primary', 'base.foreground'], t.successColor || t.brandText),
      dot: s('content-success', ['status.success.content', 'status.success-fg', 'status.success'], t.successColor || t.brandText),
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
                <span style={{ color: sev.fg.css, ...typeOf(t, 'label') }}>{sev.copy}</span>
                <span className="min-w-0">
                  <TokenMark slot={sev.fg} onEdit={onEditToken} color={sev.fg.css} />
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <TokenMark slot={sev.bg} onEdit={onEditToken} color={sev.fg.css} />
                <ContrastFlag fg={sev.fg.css} bg={sev.bg.css} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section t={t} title="Destructive solid">
        <div
          className="flex items-center justify-between gap-3"
          style={{
            background: criticalSolid.css, borderRadius: r, padding: '10px 12px',
          }}
        >
          <span style={{ color: onCriticalSolid.css, ...typeOf(t, 'button') }}>Delete project</span>
          <TokenMark slot={onCriticalSolid} onEdit={onEditToken} color={onCriticalSolid.css} />
        </div>
        <TokenMark slot={criticalSolid} onEdit={onEditToken} color={t.fgMuted || '#717680'} />
      </Section>

      <Section t={t} title="Status chips">
        <div className="flex flex-wrap items-center gap-2">
          {/* The DOT carries the severity solid, the text carries the text
              role — the split that keeps a chip legible without any contrast
              fudge. On Categorical the two resolve to the same token
              (`status.*-fg` is both), so the chip reads as one colour; the
              split still matters for any scheme whose severity colour is a
              fill rather than an ink. */}
          {severities.map((sev) => (
            <span
              key={sev.label}
              title={`${sev.label} — text ${sev.fg.label}, dot ${sev.dot.label}, fill ${sev.bg.label}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: sev.bg.css, color: sev.fg.css,
                borderRadius: 999, padding: '3px 10px', ...typeOf(t, 'caption'),
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: sev.dot.css }} />
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
          {/* The severity SOLID, not the text role — a toast dot is a mark on
              an inverse surface, the one place the vivid tone is unambiguously
              the right token. */}
          <span style={{ width: 7, height: 7, borderRadius: 999, background: severities[2].dot.css }} />
          <span style={{ color: t.surface, ...typeOf(t, 'body-sm'), flex: 1 }}>Changes saved.</span>
          <span style={{ color: t.surface, ...typeOf(t, 'button'), textDecoration: 'underline' }}>Undo</span>
        </div>
      </Section>
    </Frame>
  )
}

// ── Border — strokes in the contexts where they're actually judged ──────────
export function BorderSpecimen({ tokens: t, onEditToken }: SpecimenProps) {
  const s = (flat: string, arch: string | string[], fb: string) => slotOf(t, flat, arch, fb)
  const def = s('border-primary', ['border.default'], t.border || '#d0d5dd')
  const strong = s('border-primary', ['border.strong', 'border.emphasized', 'border.input'], t.border || '#d0d5dd')
  const subtle = s('border-secondary', ['border.subtle', 'border.emphasized', 'border.input'], t.borderDefault || '#e9eaeb')
  const accent = s('border-brand', ['border.accent', 'border.ring'], t.brandSolid)
  const active = s('border-brand', ['border.focus', 'border.active', 'border.ring'], t.brandSolid)
  const critical = s('border-error', ['border.critical', 'destructive.fill'], t.errorColor)
  // The focus HALO — a real token now, where this used to append a raw `33`
  // (20%) to whatever the border resolved to. Same class of hack as
  // ButtonSpecimen's old `color + '33'`: it only works if the border happens
  // to be a clean 6-digit hex, and it went through no named step at all.
  const ring = s('border-focus-ring', ['border.ring.default'], t.brandSolid)
  const ringCritical = s('border-focus-ring-critical', ['border.ring.critical'], t.errorColor)
  const r = radiusOf(t, 'md', '8px')

  const Field = ({ slot, text, ringSlot }: { slot: Slot; text: string; ringSlot?: Slot }) => (
    <Row t={t} slot={ringSlot ?? slot} onEdit={onEditToken}>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', height: 34, minWidth: 150, padding: '0 12px',
          borderRadius: r, border: `1px solid ${slot.css}`,
          boxShadow: ringSlot ? `0 0 0 3px ${ringSlot.css}` : undefined,
          ...typeOf(t, 'placeholder'), color: t.placeholderText || t.fgMuted,
        }}
      >
        {text}
      </span>
    </Row>
  )

  return (
    <Frame t={t}>
      {/* Borders are only judgeable on the thing they outline — a swatch of a
          1px stroke tells you nothing about whether an input reads.
          `border.default` is the control boundary now (WCAG 1.4.11 + APCA
          Lc 45 — see semanticArchitectures.ts), so it's what a resting input
          binds to; `border.strong` moved to Containers below, where it
          actually belongs (emphasis, not the default input weight). */}
      <Section t={t} title="Inputs">
        <div className="flex flex-col gap-2">
          <Field slot={def} text="Default" />
          <Field slot={active} text="Focused" ringSlot={ring} />
          <Field slot={critical} text="Invalid" />
          {/* The severity halo: the solid boundary stays the field's own
              `border.critical`, the glow around it matches. */}
          <Field slot={critical} text="Invalid + focused" ringSlot={ringCritical} />
        </div>
      </Section>

      <Section t={t} title="Separators">
        <div className="flex flex-col gap-2">
          <Row t={t} slot={subtle} onEdit={onEditToken}>
            <span style={{ display: 'block', width: 180, height: 1, background: subtle.css }} />
          </Row>
        </div>
      </Section>

      {/* Three containers, ascending weight: subtle (decorative) → accent
          (decorative, brand-tinted) → strong (emphasis — the ONE step past
          the control boundary, e.g. a selected card's own edge). */}
      <Section t={t} title="Containers">
        <div className="flex gap-2.5">
          <div style={{ flex: 1, minWidth: 0, border: `1px solid ${subtle.css}`, borderRadius: r, padding: 12 }}>
            <TokenMark slot={subtle} onEdit={onEditToken} color={t.fgMuted || '#717680'} />
          </div>
          <div style={{ flex: 1, minWidth: 0, border: `1px solid ${accent.css}`, borderRadius: r, padding: 12 }}>
            <TokenMark slot={accent} onEdit={onEditToken} color={t.brandText} />
          </div>
          <div style={{ flex: 1, minWidth: 0, border: `1px solid ${strong.css}`, borderRadius: r, padding: 12 }}>
            <TokenMark slot={strong} onEdit={onEditToken} color={t.fgMuted || '#717680'} />
          </div>
        </div>
      </Section>
    </Frame>
  )
}

export const SEMANTIC_SPECIMENS: Record<SemanticFocusKey, (p: SpecimenProps) => ReactNode> = {
  content: ContentSpecimen,
  icon: IconSpecimen,
  action: ActionSpecimen,
  surface: SurfaceSpecimen,
  status: StatusSpecimen,
  border: BorderSpecimen,
}

export const SEMANTIC_GROUP_INDEX: { key: SemanticFocusKey; label: string }[] = [
  { key: 'content', label: 'Content' },
  { key: 'icon', label: 'Icon' },
  { key: 'action', label: 'Action' },
  { key: 'surface', label: 'Surface' },
  { key: 'status', label: 'Status' },
  { key: 'border', label: 'Border' },
]

/** Compact jump list for the Color overview (collage / All tokens). */
export function SemanticGroupIndex({ onEditGroup }: { onEditGroup: (key: SemanticFocusKey) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-faint">Semantics</span>
      <div className="flex flex-wrap gap-1">
        {SEMANTIC_GROUP_INDEX.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => onEditGroup(g.key)}
            title={`Edit ${g.label} tokens in the table`}
            aria-label={`Edit ${g.label} tokens in the table`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-line text-[11px] text-fg-muted hover:text-fg hover:border-line-strong hover:bg-elevated/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
          >
            {g.label}
            <span className="text-fg-faint" aria-hidden>
              <EditIcon />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export const SEMANTIC_SPECIMEN_TITLE: Record<SemanticFocusKey, string> = {
  content: 'Content preview',
  icon: 'Icon preview',
  action: 'Action preview',
  surface: 'Surface preview',
  status: 'Status preview',
  border: 'Border preview',
}
