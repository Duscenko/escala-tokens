import { BRAND_SPECTRUM } from './brandPalette'
import { backgroundFromBase, previewHarmony, type NeutralTint } from './colorUtils'
import type { PhosphorWeight } from './phosphorIcons'
import {
  GRID_FRAME_STANDARD,
  RADIUS_STANDARD,
  radiusRolesFromGroups,
  type RadiusGroupStep,
  STROKE_STANDARD,
  buildSelectorsFromBase,
  buildSizesFromBase,
  buildSpacingFromBase,
  concentricRadiusStep,
  defaultLayoutRoles,
  resolveLayoutRole,
  type GridFrameModes,
} from './layoutTokens'
import { SHADOW_PRESETS } from './shadowTokens'
import type { ThemeFoundationOverride } from './themeFoundations'
import { mergeTypeRoles } from './typeRoles'
import {
  FONT_SIZE_STANDARD,
  FONT_WEIGHT_STANDARD,
  LINE_HEIGHT_STANDARD,
} from './typographyStandard'

/**
 * Per-appearance primitive REFS a style pins on top of the Categorical schema
 * — the same `{family.tone}` / `{family-a.tone}` grammar the Semantics table
 * writes, stored the same way (`architectureOverrides`), so an adopted style is
 * indistinguishable from a hand-edited one and "Reset to schema" still works.
 *
 * This exists because the schema's defaults are deliberately NEUTRAL — they
 * have to be right for any system — while a STYLE is allowed an opinion. The
 * borders are the case that forced it, and the measurement is worth keeping:
 *
 * `surface.input` ships as `{neutral.1}`, i.e. **exactly `surface.page`** (the
 * role's own comment says "same tone as surface.page by design"). With no fill
 * difference, the border is the ONLY thing identifying a text field, so
 * `border.control`'s `{ui:…}` solver is obliged to clear WCAG 1.4.11's 3:1 —
 * and on a dark ramp the first tone that also clears APCA Lc 45 is tone 11, the
 * near-white TEXT tone. Measured across the six styles: a resting input in dark
 * drew a hairline at OKLab ΔL **+0.63 to +0.68** and **11–12:1** against its own
 * page. That is not a boundary, it is a highlight — and ~22× the weight of
 * Escala's own dark chrome edges (ΔL 0.030).
 *
 * So a style that wants a quiet border first gives the field a FILL, and only
 * then softens the edge to an alpha. That is the same rule the app's own dark
 * chrome already follows ("the fill separates a control, the edge stops
 * shouting") — and it is what keeps 1.4.11 satisfied: the control is identified
 * by its surface, not by its outline. Neo is the deliberate exception: its
 * border IS the design, so it keeps a full-strength solid one.
 */
export type ThemeStyleSemantics = Record<string, { light?: string; dark?: string }>

/**
 * How a style paints a DESTRUCTIVE or CONFIRMING action.
 *
 *  · `solid` — filled with the severity, label in the solved `on-solid` ink
 *    (near-white on every seed here). Reads as a commitment; what Material and
 *    most product systems ship.
 *  · `soft`  — a translucent wash of the severity with the severity's OWN text
 *    (`status.<sev>.content`). Quieter, and what Apple and print-led systems do.
 *
 * It exists because destructive and confirming are the SAME control at two
 * severities and must be painted the SAME way — the collage used to show Solid
 * Danger beside Soft Success, which reads as two unrelated components and makes
 * the severities impossible to compare. Unifying them raised the real question:
 * unified as WHICH? Both answers are right for different systems, so it is a
 * style axis rather than a global default.
 */
export type StatusAction = 'soft' | 'solid'

/**
 * The Phosphor WEIGHT a style renders its glyphs at.
 *
 * The icon SET never changes — always the bundled Phosphor library, which is
 * what the system recommends and ships. Only the stroke weight is a style
 * decision, and it is one of the cheapest ways to give a set real character:
 * a brutalist system reads bold, a glass one reads light, Material reads
 * filled. `regular` is the neutral baseline every pre-`iconWeight` system
 * keeps.
 */
export type StyleIconWeight = PhosphorWeight

/** Seed hexes for the four severity families. */
export interface ThemeStyleStates {
  error: string
  warning: string
  success: string
  info: string
}

export interface ThemeStylePreset {
  id: string
  label: string
  shortLabel: string
  description: string
  detail: string
  accent: string
  preferredAppearance: 'light' | 'dark'
  neutralTint: NeutralTint
  /**
   * Optional hand-picked Neutral base. Omit and the try-on / adopt path derive
   * it from the accent via `previewHarmony` (the common case). Nature's lived-in
   * recipe keeps a dark green-gray that is NOT link-derived — without this field
   * the try-on would silently swap in a different paper.
   */
  neutral?: string
  foundations: ThemeFoundationOverride
  /** Categorical role overrides — see `ThemeStyleSemantics`. */
  semantics?: ThemeStyleSemantics
  /**
   * The style's OWN severity seeds. Omit and the four are derived from the
   * accent by `recommendStateColors`, which is right for a system whose accent
   * the user picked and wrong for a curated set — see `presetStates`.
   */
  states?: ThemeStyleStates
  accessibilityNote?: string
}

/**
 * A style's four severity seeds: its own when it declares them, otherwise the
 * accent-derived recommendation.
 *
 * The derivation exists so a user's hand-picked accent pulls error/warning/
 * success/info into the same family — it blends CHROMA only, keeping each
 * severity's canonical hue and lightness, because a red drifting toward a green
 * accent stops reading as an error. That is the correct behaviour for a system
 * someone is building. It is the wrong behaviour for a curated SET, and
 * measurably so: because the blend is chroma-only, six very different accents
 * collapsed onto near-identical severities. Measured before this existed —
 *
 *   warning  #ff8a00 · #f5911c · #f09434 · #ff8a00 · #ff8a00 · #f69011
 *   success  #00b75f · #17b26a · #31b06e · #00b75f · #00b75f · #08b369
 *
 * — Core, Material and Retro shipping BYTE-IDENTICAL warning and success. A
 * vintage press and a Material dashboard have no business sharing an alert
 * colour, and the styles are the one place in the app where an opinion about
 * that is wanted, exactly like `semantics` and `foundations`.
 *
 * Shared by the try-on and by `adoptPreset`, so a previewed style and the theme
 * it mints seed the same families — the `MintPages` rule.
 */
export function presetStates(preset: ThemeStylePreset): ThemeStyleStates {
  return preset.states ?? previewHarmony(preset.accent, preset.neutralTint).states
}

/**
 * Accent + tint (+ optional hand-picked Neutral) → the pages and gray the
 * try-on and `adoptPreset` both use. Shared so a style with `neutral` set
 * cannot preview one paper and mint another.
 */
export function presetHarmony(preset: ThemeStylePreset) {
  const h = previewHarmony(preset.accent, preset.neutralTint)
  if (!preset.neutral) return h
  return {
    ...h,
    neutral: preset.neutral,
    pageLight: backgroundFromBase(preset.neutral, 'light', preset.neutralTint),
    pageDark: backgroundFromBase(preset.neutral, 'dark', preset.neutralTint),
  }
}

function accent(label: string): string {
  return BRAND_SPECTRUM.find((preset) => preset.label === label)?.hex ?? BRAND_SPECTRUM[0].hex
}

// ── Border recipes ──────────────────────────────────────────────────────────
// Each gives the field a FILL one step off the page first, then softens the
// edge onto the alpha ladders. `black-a` / `white-a` are the published Radix
// alpha scales, so an alpha border is a real token rather than an ad-hoc rgba —
// and, unlike a ramp tone, it is not quantised by the ramp's lightness steps,
// which is exactly why the dark hairline had nowhere to land between
// "invisible" and "near-white".
//
// THE ALPHAS ARE SOLVED, NOT PICKED — AND A FILL FORCES THE BORDER TO MOVE.
//
// DARK is where the visible defect was. The ramp runs out of room there: tones
// 9–10 clear WCAG but fail APCA Lc 45, so `{ui:…}` walks to tone 11 — the
// near-white TEXT tone — and a resting field drew a hairline at OKLab ΔL
// +0.63…+0.68 and 11–12:1 against its own page. A highlight, not a boundary,
// and ~22× the weight of Escala's own dark chrome edges (ΔL 0.030).
//
// LIGHT looked fine and had to move anyway, which is the part worth writing
// down: `{ui:neutral.8}` solves against the **page**, and giving the field a
// fill moves the surface the border actually sits on. Measured after adding
// `surface.input`, the untouched solver fell to **2.91:1 (Core) and 2.75:1
// (Material)** — under the floor. Adding a fill and keeping the solved border
// is not a safe half-measure; the two go together.
//
// The values are the FIRST ladder step clearing 3:1 on each style's own input
// fill: **`black-a.7` light, `white-a.6` dark** (3.53–3.87:1 across all twelve
// style×appearance pairs). Dark composites to a mid-grey at ΔL 0.33–0.36
// against the fill — **half the old weight, still over the floor.** Nothing
// lighter clears it: `black-a.6` / `white-a.5` fail, and the next NEUTRAL tone
// up (the solver's own `{ui+:…}` step) is heavier than the alpha at ΔL 0.44.
// Do not lower these without re-running that measurement. `subtle` and the rim
// are decoration, carry no floor, and are free to go as light as they like.
//
// So every style shares one boundary weight. Not a missed opportunity — the
// floor doing its job. A style differentiates on the FILL depth, the border's
// HUE, the rim and the shadow, all of which are unconstrained, not on how
// illegible its control boundary is.
// ── Dark-mode compensation ──────────────────────────────────────────────────
// Dark is not light inverted, and two things measurably fall short of it.
//
// SURFACES. `surface.layer-1/-2` ship as `{neutral.2}` / `{neutral.3}` in both
// appearances, but the dark ramp's low steps are compressed: measured across
// the six styles, tone 2 lifts a card by OKLab ΔL **0.022–0.027** in dark
// against **0.028–0.037** in light — a quarter less separation, on the
// appearance that needs MORE. (Same compression this codebase already
// documents for shadows: below a near-black page only ~5% of the luminance
// range exists.) Moving each surface one step up gives 0.046–0.054 and
// 0.069–0.084 — slightly over light's own figures, which is the right
// direction rather than an overshoot.
//
// SUBTLE INK. `content.subtle` is `{neutral.9}`, which reads 3.27–5.10:1 on a
// light page and only **2.90–3.19:1** on a dark one. One step up recovers it.
//
// Both are DARK-ONLY: light measured fine and is left on the schema.
const DARK_DEPTH = {
  'surface.layer-1': { dark: '{neutral-dark.3}' },
  'surface.layer-2': { dark: '{neutral-dark.4}' },
  'content.subtle': { dark: '{neutral-dark.10}' },
} satisfies ThemeStyleSemantics

const A_DEFAULT_L = '{black-a.7}'
const A_DEFAULT_D = '{white-a.6}'
const A_STRONG_L = '{black-a.9}'
const A_STRONG_D = '{white-a.8}'

/** Quiet: filled field, mid-grey edge. Shared by Editorial and Playful. */
const softBorders: ThemeStyleSemantics = {
  ...DARK_DEPTH,
  'surface.input': { light: '{neutral.2}', dark: '{neutral-dark.2}' },
  'border.control': { light: A_DEFAULT_L, dark: A_DEFAULT_D },
  'border.control-hover': { light: A_STRONG_L, dark: A_STRONG_D },
  'border.subtle': { light: '{black-a.3}', dark: '{white-a.3}' },
}

/**
 * Nature's lived-in recipe — ported verbatim from the "superb" theme the
 * designer iterated in-app and asked to keep under the Nature name. The
 * personality is a soft alpha control edge (`{neutral-a.5}` light /
 * `{accent-a.4}` dark), an accent-tinted `content.primary` in light, and a
 * `{white-a.6}` input surface. Owner waived the WCAG 1.4.11 floor on the
 * control edge (same call as Core / Glass).
 */
const natureSemantics: ThemeStyleSemantics = {
  'border.control': { light: '{neutral-a.5}', dark: '{accent-a.4}' },
  'border.subtle': { dark: '{accent-a.2}' },
  'content.primary': { light: '{accent.12}' },
  'surface.input': { light: '{white-a.6}' },
  // Not from `superb` — its tinted dark ramp compresses the low steps, so the
  // schema's `{neutral.9}` subtle ink falls to ~3.1:1 in dark. One tone up
  // clears the codebase's dark-legibility floor without touching the light
  // appearance the designer personalised.
  'content.subtle': { dark: '{neutral-dark.10}' },
}

/**
 * Core's lived-in recipe — ported from the adopted "Core / Minimalist" theme
 * the designer iterated in-app. Borders are the quiet, fill-led look they
 * chose (`{neutral.5}` / `{white-a.3}`), not the WCAG 1.4.11 alpha floor the
 * other soft styles keep. Owner call: accessibility on the control edge is
 * not required for this style; the fill identifies the field.
 */
const coreSemantics: ThemeStyleSemantics = {
  ...DARK_DEPTH,
  'surface.input': { light: '{neutral.2}', dark: '{neutral-dark.2}' },
  'border.control': { light: '{neutral.5}', dark: '{white-a.3}' },
  'border.control-hover': { light: '{neutral.7}', dark: '{white-a.5}' },
  'border.subtle': { light: '{black-a.3}', dark: '{white-a.1}' },
  'content.primary': { dark: '{accent.12}' },
  'content.secondary': { dark: '{neutral-dark.11}' },
}

/**
 * Glass's lived-in recipe — ported from the adopted "Cupertino / Glass" theme.
 * Control + subtle borders ride accent alpha in both appearances; the owner
 * waived the WCAG 1.4.11 floor the same way as Core: fill + rim identify the
 * field; the edge is decorative glass chrome, not a 3:1 boundary.
 */
const glassSemantics: ThemeStyleSemantics = {
  ...DARK_DEPTH,
  'surface.input': { light: '{neutral.2}', dark: '{black-a.2}' },
  'border.control': { light: '{accent-a.4}', dark: '{accent-a.3}' },
  'border.control-hover': { light: '{black-a.9}', dark: '{white-a.8}' },
  'border.subtle': { light: '{accent-a.3}', dark: '{accent-a.2}' },
  'border.rim-highlight': { light: '{white-a.9}', dark: '{white-a.4}' },
  'content.primary': { dark: '{accent-a.12}' },
  'action.primary.default': { dark: '{accent.9}' },
  'status.critical.content': { dark: '{error.10}' },
  'status.critical.surface-solid': { light: '{error.9}', dark: '{error-a.10}' },
  'status.critical.border-strong': { light: '{error.9}' },
  'status.success.surface-solid': { light: '{success.10}' },
}

/** Material's filled text field: the fill goes TWO steps off the page, so the
 *  surface carries the control and the decorative tier can nearly vanish. */
const filledBorders: ThemeStyleSemantics = {
  ...DARK_DEPTH,
  // Dark input goes to 4, not 3: `DARK_DEPTH` just moved the card to 3, and a
  // filled field that matches its own card is not a filled field.
  'surface.input': { light: '{neutral.3}', dark: '{neutral-dark.4}' },
  'border.control': { light: A_DEFAULT_L, dark: A_DEFAULT_D },
  'border.control-hover': { light: A_STRONG_L, dark: A_STRONG_D },
  // `border.subtle` override dropped — identical to the default schema now
  // (audit F4 moved the neutral ladder onto {black-a}/{white-a}).
}

/**
 * Retro's lived-in recipe — ported from the adopted "Retro / Vintage" theme.
 * Light control edge is a firm neutral (`{neutral.9}`); dark rides a soft
 * accent tint (`{accent.4}`). Owner waived the WCAG 1.4.11 floor where the
 * adopted edge sits under it (same call as Core / Glass / Nature).
 */
const retroSemantics: ThemeStyleSemantics = {
  ...DARK_DEPTH,
  'surface.input': { light: '{neutral.2}', dark: '{neutral-dark.2}' },
  'border.control': { light: '{neutral.9}', dark: '{accent.4}' },
  'border.control-hover': { light: '{accent.12}', dark: '{accent.11}' },
  'border.subtle': { light: '{black-a.3}', dark: '{white-a.3}' },
}

/** Legacy warm-ink borders — superseded by `retroSemantics`. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const inkBorders: ThemeStyleSemantics = {
  ...DARK_DEPTH,
  'surface.input': { light: '{neutral.2}', dark: '{neutral-dark.2}' },
  'border.control': { light: '{accent.10}', dark: '{accent.8}' },
  'border.control-hover': { light: '{accent.12}', dark: '{accent.11}' },
  'border.subtle': { light: '{black-a.3}', dark: '{white-a.3}' },
}

/**
 * Every preset ships the STANDARD type ramp (`FONT_SIZE_STANDARD` —
 * 12·14·16·18·20·24·30·36·48·60·72). It used to bake a `buildTypeScale(factor)`
 * variant per style (`comfortable` → 13·15·17·19·21, `compact` → 11·12·14·16·18),
 * which meant an adopted theme opened on a scale that didn't match Variables'
 * base and read as "why are these odd sizes here". Density (Compact … Spacious)
 * is a CHOICE the designer makes on the Text scale slider afterwards, not a
 * property of the style — so a fresh adoption starts on Default, coherent with
 * Variables, and the slider still grades the whole ramp from there. A style's
 * character lives in its family, radius, spacing, shadows and semantics.
 */
function typography(body: string, heading: string) {
  return {
    fontFamily: body,
    headingFontFamily: heading,
    sizes: { ...FONT_SIZE_STANDARD },
    lineHeights: { ...LINE_HEIGHT_STANDARD },
    weights: { ...FONT_WEIGHT_STANDARD },
    roles: mergeTypeRoles(),
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function paddingOf(spacing: Record<string, string>, step: string) {
  const value = spacing[step] ?? '20px'
  return { top: value, right: value, bottom: value, left: value }
}

/**
 * UNWIRED — kept for reference, do not assume it runs. No preset spreads it, so
 * everything it claims below has only ever been true of the code, not of the
 * shipped styles. The one part that mattered — the concentric `control ⊂ action`
 * derivation — is live as `styleRadiusRoles` above, which every preset does use.
 * Wiring the rest would also pin spacing/size/selector/stroke/grid roles to
 * defaults the styles have never declared; that is a separate decision.
 *
 * Style-scoped layout aliases. The primitive ramps are the personality;
 * the roles are what specimens actually read. Nested `control ⊂ action`
 * is derived from the current ramp + inset so a Pill style cannot ship a
 * chip that collides with its field — the same concentric rule the
 * roundness slider now keeps.
 */
/**
 * A style's radius as THREE independent axis picks, then the concentric guard.
 *
 * Styles used to differ by picking a whole graded RAMP (Sharp/Soft/Rounded/
 * Pill), which is the coupling DaisyUI's split exists to remove: one dial moved
 * cards, buttons and checkboxes together, so a "Pill" style shipped stadium
 * cards you cannot read. Every style now sits on the SAME standard ramp — which
 * is what makes the five ladder steps mean the same pixels everywhere — and
 * expresses its personality as boxes / fields / selectors, exactly the three
 * variables the reference exposes.
 *
 * `control` is NOT re-derived from `action` here, and that is the point of the
 * split rather than an omission. An earlier version did exactly that — the
 * concentric r = R − p — which re-couples two of the three axes: picking a
 * tighter Field would silently square every checkbox, which is the coupling
 * this model exists to remove. `control` is also not always nested (a standalone
 * checkbox sits on the page, not inside an input), so deriving it from the field
 * is wrong for the common case as well.
 *
 * A genuine collision is still surfaced — `radiusNestingReport` reports
 * `control ⊂ action` like it reports `container ⊂ overlay` — on the same
 * report-don't-steer policy this file already applies to the other pair.
 */
function styleRadiusRoles(
  picks: { boxes?: RadiusGroupStep; fields?: RadiusGroupStep; selectors?: RadiusGroupStep },
): Record<string, string> {
  return radiusRolesFromGroups(picks)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function styleLayout(opts: {
  radius: Record<string, string>
  spacing: Record<string, string>
  radiusPins?: Record<string, string>
  spacingPins?: Record<string, string>
  strokePins?: Record<string, string>
  sizePins?: Record<string, string>
  selectorPins?: Record<string, string>
  gridFrame?: GridFrameModes
}) {
  const spacingRoles = { ...defaultLayoutRoles('spacing'), ...opts.spacingPins }
  const radiusRoles = { ...defaultLayoutRoles('radius'), ...opts.radiusPins }
  if (radiusRoles.control !== 'none' && radiusRoles.action !== 'none') {
    const insetPx = parseFloat(resolveLayoutRole('spacing', spacingRoles, opts.spacing, 'inset-control', '12px')) || 12
    radiusRoles.control = concentricRadiusStep(opts.radius, radiusRoles.action, insetPx)
  }
  return {
    radiusRoles,
    spacingRoles,
    strokeRoles: { ...defaultLayoutRoles('stroke'), ...opts.strokePins },
    sizeRoles: { ...defaultLayoutRoles('size'), ...opts.sizePins },
    selectorRoles: { ...defaultLayoutRoles('selector'), ...opts.selectorPins },
    gridFrame: opts.gridFrame ?? GRID_FRAME_STANDARD,
  }
}

const hardShadows = {
  xs: '1px 1px 0 rgba(10,13,18,0.92)',
  sm: '2px 2px 0 rgba(10,13,18,0.92)',
  md: '3px 3px 0 rgba(10,13,18,0.92)',
  lg: '4px 4px 0 rgba(10,13,18,0.92)',
  xl: '6px 6px 0 rgba(10,13,18,0.92)',
  '2xl': '8px 8px 0 rgba(10,13,18,0.92)',
}

// Retro's offset is INK-COLOURED, not near-black, and it is paired with a
// hairline rather than run at full strength.
//
// It used to be `rgba(10,13,18,0.35→0.62)` — the same near-black Neo uses, just
// weaker. Measured on each style's own page, that put Retro at OKLab ΔL
// 0.30–0.40 against Neo's 0.72: two of six styles speaking the identical
// hard-offset language, differing only in volume, which is the thinnest kind of
// difference a style set can offer. A vintage print offset is a warm second
// impression of the ink, so this carries the same brown the page is tinted with
// (see `neutralTint: 'tinted'` below) and stays well under Neo.
const retroShadows = {
  xs: '1px 1px 0 rgba(74,44,26,0.20)',
  sm: '0 0 0 1px rgba(74,44,26,0.10), 2px 2px 0 rgba(74,44,26,0.24)',
  md: '0 0 0 1px rgba(74,44,26,0.10), 3px 3px 0 rgba(74,44,26,0.28)',
  lg: '0 0 0 1px rgba(74,44,26,0.10), 4px 4px 0 rgba(74,44,26,0.32)',
  xl: '0 0 0 1px rgba(74,44,26,0.10), 6px 6px 0 rgba(74,44,26,0.36)',
  '2xl': '0 0 0 1px rgba(74,44,26,0.10), 9px 9px 0 rgba(74,44,26,0.42)',
}

export const THEME_STYLE_PRESETS: ThemeStylePreset[] = [
  {
    id: 'core-minimal',
    label: 'Core / Minimalist',
    shortLabel: 'Core',
    description: 'Quiet, precise, content-first.',
    detail: 'A dependable baseline for SaaS, dashboards, and corporate tools.',
    accent: accent('Blue Dark'),
    // Matches the adopted Core theme the designer iterated (dark-first).
    preferredAppearance: 'dark',
    neutralTint: 'subtle',
    // Crisp, conventional product severities — the register a dashboard reads
    // as "correct" rather than expressive. Deliberately the least opinionated
    // set here: Core is the baseline the other five are variations from.
    states: { error: '#d92d20', warning: '#dc6803', success: '#079455', info: '#1570ef' },
    foundations: {
      typography: typography('Inter', 'Inter'),
      spacing: buildSpacingFromBase(4),
      radius: { ...RADIUS_STANDARD },
      // Selectors bumped xs → sm — from the adopted theme's radiusRoles.control.
      radiusRoles: styleRadiusRoles({ boxes: 'lg', fields: 'sm', selectors: 'sm' }),
      sizes: buildSizesFromBase(4),
      selector: buildSelectorsFromBase(3),
      stroke: { ...STROKE_STANDARD },
      // Subtle elevation — the adopted Core theme's shadow ramp. Softer than
      // Soft (the previous Core pick); still a six-step ladder, just quieter.
      shadows: { ...SHADOW_PRESETS[1].values },
      panelBackground: 'solid',
      statusAction: 'solid',
      iconWeight: 'regular',
    },
    semantics: coreSemantics,
  },
  {
    id: 'cupertino-glass',
    label: 'Cupertino / Glass',
    shortLabel: 'Glass',
    description: 'Fluid, translucent, and spacious.',
    detail: 'Soft depth and generous geometry, using Escala’s existing panel treatment.',
    // Lived-in accent from the adopted Cupertino / Glass theme (#06aed4), not
    // spectrum Ice (#22d3ee). Same cyan family; the darker seed is what the
    // designer actually shipped after iterating in-app.
    accent: '#06aed4',
    preferredAppearance: 'dark',
    neutralTint: 'tinted',
    // Apple's own system colours (systemRed / systemOrange / systemGreen /
    // systemBlue), verbatim. A Cupertino style borrowing Cupertino's severities
    // is the same kind of faithfulness as the translucent panel treatment.
    states: { error: '#ff3b30', warning: '#ff9500', success: '#34c759', info: '#007aff' },
    foundations: {
      typography: typography('Roboto', 'Inter'),
      spacing: buildSpacingFromBase(4),
      radius: { ...RADIUS_STANDARD },
      // Selectors at `lg` (not `sm`) — matches the adopted theme's control
      // radius so checkboxes don't sit square next to pill fields.
      radiusRoles: styleRadiusRoles({ boxes: '2xl', fields: '2xl', selectors: 'lg' }),
      sizes: buildSizesFromBase(4.5),
      selector: buildSelectorsFromBase(3.5),
      // Hairline stroke — the glass chrome the adopted theme uses.
      stroke: { ...STROKE_STANDARD, sm: '0.5px' },
      // Subtle (not the old hairline-penumbra glassShadows) — matches the
      // adopted Cupertino / Glass theme after the latest iteration.
      shadows: { ...SHADOW_PRESETS[1].values },
      panelBackground: 'translucent',
      statusAction: 'soft',
      iconWeight: 'light',
    },
    semantics: glassSemantics,
    accessibilityNote: 'Translucent surfaces still use semantic foreground roles; verify contrast over real content.',
  },
  {
    id: 'material-elevation',
    label: 'Material / Elevation',
    shortLabel: 'Material',
    description: 'Layered, responsive, and explicit.',
    detail: 'Maps Material-like elevation onto Escala’s existing six-step shadow ramp.',
    // Grape, not Indigo — same reason as Glass: Indigo's H 274 was 12° from
    // Core. Grape (H 304, chroma 0.233, the most saturated hex in the spectrum)
    // is also the closest thing here to Material 3's own purple baseline seed.
    accent: accent('Grape'),
    preferredAppearance: 'light',
    // M3's baseline error (#b3261e) with Material palette 800s for the rest —
    // deeper and less neon than Glass, which is what Material's own elevation
    // model expects to sit under.
    states: { error: '#b3261e', warning: '#f9a825', success: '#2e7d32', info: '#1565c0' },
    // `tinted`, not `subtle`. Material 3's whole surface model is seed-tinted
    // paper, so this is the faithful reading — and at `subtle` its page
    // resolved to `#fdfdff` / `#0f0f13`, within a hair of Core's `#fdfdff` /
    // `#0e0f13`. Two of six styles on indistinguishable paper is a wasted slot.
    neutralTint: 'tinted',
    foundations: {
      typography: typography('Roboto', 'Roboto'),
      spacing: buildSpacingFromBase(4),
      // Rounded (lg 16), not Pill (lg 24). M3's own shape scale puts a card at
      // 12px and its largest container at 28px; Pill resolves this style's
      // `container` to 36px, rounder than anything in the spec it is named
      // after. Glass and Nature keep Pill — "generous" and "organic" are their
      // briefs, and at the corrected role rungs that is 36px, not 72px.
      radius: { ...RADIUS_STANDARD },
      radiusRoles: styleRadiusRoles({ boxes: 'lg', fields: '2xl', selectors: 'xs' }),
      sizes: buildSizesFromBase(4),
      selector: buildSelectorsFromBase(3),
      stroke: { ...STROKE_STANDARD },
      shadows: { ...SHADOW_PRESETS[3].values },
      panelBackground: 'solid',
      statusAction: 'solid',
      iconWeight: 'fill',
    },
    // M3's filled text field: the fill carries the control so the edge can be a
    // whisper. It is the one style whose input sits TWO steps off the page.
    semantics: filledBorders,
  },
  {
    id: 'nature-organic',
    label: 'Nature / Organic',
    shortLabel: 'Nature',
    description: 'Grounded, calm, and approachable.',
    detail: 'Fresh green accent, tinted paper, an editorial heading voice, and no elevation at all.',
    // Ported verbatim from the designer's own "superb" theme — they kept the
    // customization and asked for it under the Nature name.
    accent: '#6bbd2b',
    preferredAppearance: 'light',
    // error stays the system default (`superb` referenced the global `error`
    // family); warning / success / info are the designer's own seeds.
    states: { error: '#f04438', warning: '#ff8b00', success: '#00b662', info: '#1c8fff' },
    // Green-grey neutral, pinned so the try-on can't swap in a link-derived one.
    neutral: '#738863',
    neutralTint: 'tinted',
    foundations: {
      // Inter body over a Fraunces heading. Standard type ramp — density is the
      // Text-scale slider's job (see the `typography()` note).
      typography: typography('Inter', 'Fraunces'),
      spacing: buildSpacingFromBase(4),
      sizes: buildSizesFromBase(4),
      selector: buildSelectorsFromBase(3),
      // FLAT — no shadow on any surface. This is the style's signature.
      shadows: { xs: 'none', sm: 'none', md: 'none', lg: 'none', xl: 'none', '2xl': 'none' },
      // Container inset one step deeper than the system default (step 5 → 6).
      spacingRoles: { ...defaultLayoutRoles('spacing'), 'inset-surface': '6' },
      padding: { top: '24px', right: '24px', bottom: '24px', left: '24px' },
    },
    semantics: natureSemantics,
  },
  {
    id: 'retro-vintage',
    label: 'Retro / Vintage',
    shortLabel: 'Retro',
    description: 'Tactile, nostalgic, and structured.',
    detail: 'Monospace typography, compact rhythm, firm borders, and offset depth.',
    // Flame (#ff4405) — matches the adopted Retro / Vintage accent byte-for-byte.
    accent: accent('Flame'),
    preferredAppearance: 'dark',
    // Muted press inks on aged stock: brick, mustard, moss, faded slate.
    states: { error: '#b03a2e', warning: '#cc8b1f', success: '#5f8d4e', info: '#4a7a96' },
    // `vivid` — the adopted theme's gray `#966554` is exactly
    // `previewHarmony(Flame, vivid).neutral`. Store tint may read `pure` after
    // later edits; the paper that ships with this recipe is the vivid sepia.
    neutralTint: 'vivid',
    foundations: {
      typography: typography('Courier Prime', 'Courier Prime'),
      spacing: buildSpacingFromBase(4),
      radius: { ...RADIUS_STANDARD },
      radiusRoles: styleRadiusRoles({ boxes: 'xs', fields: 'xs', selectors: 'none' }),
      sizes: buildSizesFromBase(4),
      selector: buildSelectorsFromBase(3),
      stroke: { ...STROKE_STANDARD },
      shadows: retroShadows,
      panelBackground: 'page',
      statusAction: 'soft',
      iconWeight: 'bold',
    },
    semantics: retroSemantics,
  },
  {
    id: 'neo-brutalism',
    label: 'Neo-Brutalism',
    shortLabel: 'Neo',
    description: 'Saturated, graphic, and direct.',
    detail: 'Heavy boundaries and hard elevation create a deliberately raw system.',
    accent: accent('Yellow'),
    preferredAppearance: 'light',
    neutralTint: 'pure',
    // Near-primary and maximally saturated, matching the pure neutral and the
    // hard black offset. Brutalism does not do muted.
    states: { error: '#e5252c', warning: '#ffb302', success: '#00c853', info: '#2962ff' },
    foundations: {
      typography: typography('Space Grotesk', 'Space Grotesk'),
      spacing: buildSpacingFromBase(5),
      radius: { ...RADIUS_STANDARD },
      radiusRoles: styleRadiusRoles({ boxes: 'none', fields: 'none', selectors: 'none' }),
      sizes: buildSizesFromBase(4.5),
      selector: buildSelectorsFromBase(3.5),
      stroke: { ...STROKE_STANDARD, sm: '2px' },
      shadows: hardShadows,
      panelBackground: 'solid',
      statusAction: 'solid',
      iconWeight: 'bold',
    },
    // THE deliberate exception to the soften-the-border rule: brutalism's
    // border IS the design, so it goes the other way — the ramp's text tone,
    // full strength, matching the hard offset it sits under. No fill step
    // either: a flat field inside a heavy outline is the whole look.
    semantics: {
      ...DARK_DEPTH,
      // Neo is the ONE style that overrides both halves of the split. Every
      // other style softens the control boundary and leaves the decorative
      // ladder on the schema; here the decorative ladder is the point, so all
      // five rungs go to the ramp's text tone.
      'border.control': { light: '{neutral.12}', dark: '{neutral-dark.12}' },
      'border.control-hover': { light: '{neutral.12}', dark: '{neutral-dark.12}' },
      'border.default': { light: '{neutral.12}', dark: '{neutral-dark.12}' },
      'border.strong': { light: '{neutral.12}', dark: '{neutral-dark.12}' },
      'border.subtle': { light: '{neutral.11}', dark: '{neutral-dark.11}' },
    },
  },
  {
    id: 'editorial-serif',
    label: 'Editorial / Serif',
    shortLabel: 'Editorial',
    description: 'Literary, paced, and ink-led.',
    detail: 'A magazine voice: serif display, quiet paper, and a wine accent that reads as print rather than product.',
    accent: '#7f1d5a',
    preferredAppearance: 'light',
    neutralTint: 'tinted',
    states: { error: '#9f1239', warning: '#b45309', success: '#3f6212', info: '#1e3a5f' },
    foundations: {
      typography: typography('Newsreader', 'Playfair Display'),
      spacing: buildSpacingFromBase(4),
      radius: { ...RADIUS_STANDARD },
      radiusRoles: styleRadiusRoles({ boxes: 'lg', fields: 'xs', selectors: 'xs' }),
      sizes: buildSizesFromBase(4),
      selector: buildSelectorsFromBase(3),
      stroke: { ...STROKE_STANDARD },
      shadows: { ...SHADOW_PRESETS[1].values },
      panelBackground: 'solid',
      statusAction: 'soft',
      iconWeight: 'light',
    },
    semantics: softBorders,
  },
  {
    id: 'terminal-mono',
    label: 'Terminal / Mono',
    shortLabel: 'Terminal',
    description: 'Monospace, sharp, and dark-first.',
    detail: 'A console system: one family for everything, no radius, no elevation, a matrix green that only exists on a black page.',
    accent: '#12b981',
    preferredAppearance: 'dark',
    neutralTint: 'pure',
    states: { error: '#f87171', warning: '#fbbf24', success: '#34d399', info: '#22d3ee' },
    foundations: {
      typography: typography('JetBrains Mono', 'JetBrains Mono'),
      spacing: buildSpacingFromBase(4),
      radius: { ...RADIUS_STANDARD },
      radiusRoles: styleRadiusRoles({ boxes: 'none', fields: 'none', selectors: 'none' }),
      sizes: buildSizesFromBase(4),
      selector: buildSelectorsFromBase(3),
      stroke: { ...STROKE_STANDARD },
      shadows: { ...SHADOW_PRESETS[0].values },
      panelBackground: 'page',
      statusAction: 'solid',
      iconWeight: 'regular',
    },
    semantics: {
      ...DARK_DEPTH,
      'surface.input': { light: '{neutral.2}', dark: '{neutral-dark.2}' },
      'border.control': { light: A_DEFAULT_L, dark: A_DEFAULT_D },
      'border.control-hover': { light: A_STRONG_L, dark: A_STRONG_D },
    },
  },
  {
    id: 'enterprise-dense',
    label: 'Enterprise / Dense',
    shortLabel: 'Enterprise',
    description: 'Compact, tabular, and explicit.',
    detail: 'A data-dense workplace: IBM Plex, tighter fields, filled inputs, and a teal that is not Core’s blue.',
    accent: '#0f766e',
    preferredAppearance: 'light',
    neutralTint: 'subtle',
    states: { error: '#b91c1c', warning: '#c2410c', success: '#047857', info: '#1d4ed8' },
    foundations: {
      typography: typography('IBM Plex Sans', 'IBM Plex Sans'),
      spacing: buildSpacingFromBase(3.5),
      radius: { ...RADIUS_STANDARD },
      radiusRoles: styleRadiusRoles({ boxes: 'sm', fields: 'xs', selectors: 'xs' }),
      sizes: buildSizesFromBase(3.5),
      selector: buildSelectorsFromBase(3),
      stroke: { ...STROKE_STANDARD },
      shadows: { ...SHADOW_PRESETS[1].values },
      panelBackground: 'solid',
      statusAction: 'solid',
      iconWeight: 'regular',
    },
    semantics: filledBorders,
  },
  {
    id: 'playful-candy',
    label: 'Playful / Candy',
    shortLabel: 'Playful',
    description: 'Rounded, saturated, and light-hearted.',
    detail: 'A consumer voice: generous pills, vivid paper, and a magenta that the other eleven hues leave room for.',
    accent: '#d946ef',
    preferredAppearance: 'light',
    neutralTint: 'vivid',
    states: { error: '#e11d48', warning: '#f59e0b', success: '#22c55e', info: '#6366f1' },
    foundations: {
      typography: typography('Plus Jakarta Sans', 'Plus Jakarta Sans'),
      spacing: buildSpacingFromBase(4.5),
      radius: { ...RADIUS_STANDARD },
      radiusRoles: styleRadiusRoles({ boxes: '2xl', fields: '2xl', selectors: 'lg' }),
      sizes: buildSizesFromBase(4.5),
      selector: buildSelectorsFromBase(3.5),
      stroke: { ...STROKE_STANDARD },
      shadows: { ...SHADOW_PRESETS[2].values },
      panelBackground: 'solid',
      statusAction: 'soft',
      iconWeight: 'regular',
    },
    semantics: softBorders,
  },
  {
    id: 'luxury-noir',
    label: 'Luxury / Noir',
    shortLabel: 'Luxury',
    description: 'Dark, gold, and restrained.',
    detail: 'A night-time brand: serif display on near-black paper, a champagne accent, and elevation instead of a loud edge.',
    accent: '#c56b23',
    preferredAppearance: 'dark',
    neutralTint: 'subtle',
    states: { error: '#9f1239', warning: '#ca8a04', success: '#4d7c0f', info: '#1e3a5f' },
    foundations: {
      typography: typography('Inter', 'Cormorant Garamond'),
      spacing: buildSpacingFromBase(4),
      radius: { ...RADIUS_STANDARD },
      radiusRoles: styleRadiusRoles({ boxes: 'lg', fields: 'sm', selectors: 'xs' }),
      sizes: buildSizesFromBase(4),
      selector: buildSelectorsFromBase(3),
      stroke: { ...STROKE_STANDARD },
      shadows: { ...SHADOW_PRESETS[3].values },
      panelBackground: 'solid',
      statusAction: 'solid',
      iconWeight: 'thin',
    },
    semantics: {
      ...DARK_DEPTH,
      'surface.input': { light: '{neutral.2}', dark: '{neutral-dark.3}' },
      'border.control': { light: A_DEFAULT_L, dark: A_DEFAULT_D },
      'border.control-hover': { light: A_STRONG_L, dark: A_STRONG_D },
    },
  },
  {
    id: 'swiss-grid',
    label: 'Swiss / Grid',
    shortLabel: 'Swiss',
    description: 'Orthogonal, red, and unadorned.',
    detail: 'International Typographic Style: Inter, square corners, no shadow, a poster red that is the only colour on the page.',
    accent: '#d2004e',
    preferredAppearance: 'light',
    neutralTint: 'pure',
    states: { error: '#e11d48', warning: '#ca8a04', success: '#15803d', info: '#1d4ed8' },
    foundations: {
      typography: typography('Inter', 'Inter'),
      spacing: buildSpacingFromBase(4),
      radius: { ...RADIUS_STANDARD },
      radiusRoles: styleRadiusRoles({ boxes: 'none', fields: 'none', selectors: 'none' }),
      sizes: buildSizesFromBase(4),
      selector: buildSelectorsFromBase(3),
      stroke: { ...STROKE_STANDARD },
      shadows: { ...SHADOW_PRESETS[0].values },
      panelBackground: 'page',
      statusAction: 'solid',
      iconWeight: 'light',
    },
    semantics: {
      ...DARK_DEPTH,
      'surface.input': { light: '{neutral.2}', dark: '{neutral-dark.2}' },
      'border.control': { light: A_DEFAULT_L, dark: A_DEFAULT_D },
      'border.control-hover': { light: A_STRONG_L, dark: A_STRONG_D },
    },
  },

]

export function themeStylePreset(id: string): ThemeStylePreset | undefined {
  return THEME_STYLE_PRESETS.find((preset) => preset.id === id)
}

