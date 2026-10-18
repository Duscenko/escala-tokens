// ─── Playground specimens ─────────────────────────────────────────────────────
// One live, token-driven render per catalogue component. Each specimen honors
// the variant axes exactly as the Figma plugin builds them (componentCatalogue
// `axes` — the plugin is the source of truth), so what the designer toggles
// here is what lands in Figma. Colors, radius, and type all resolve from
// PreviewTokens. Type is bound to semantic text roles (`label`, `placeholder`,
// `button`, `heading-*`, `body-*`, …) via `typeStyleOf`, so a Semantics edit
// retunes Docs, Components, and Preview together — inline styles by design
// (see CLAUDE.md conventions).

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import chroma from 'chroma-js'
import type { PreviewTokens } from '../../preview/ButtonPreview'
import { effectiveIconWeight, ICON_ROLES, iconSizesFor } from '../../../lib/iconSizing'
import { radiusRoleOf, nestedRadiusOf, fitRadiusPx, concentricRadiusPx, weightOf, shadowOf, tintOf, overlaySurfaceOf, overlaySurfaceStyle, archTokenOf, sizeRoleOf, inputSurfaceOf, selectedSurfaceOf, typeStyleOf, strokeRoleOf, spacingRoleOf, spaceOf, iconOf } from '../../../lib/previewTokens'
import { COMPONENTS, type ComponentDef } from '../../../lib/componentCatalogue'
import { PHOSPHOR_CORE, PHOSPHOR_CORE_COMPONENT } from '../../../lib/iconLibraries'
import { PHOSPHOR_CORE_BODIES, loadPhosphorWeight, peekPhosphorWeight, phosphorCoreBody, phosphorIconMaskUrl, type PhosphorWeight } from '../../../lib/phosphorIcons'
import {
  SkeletonButtonSpecimen, SkeletonButtonGroupSpecimen, SkeletonCloseButtonSpecimen, SkeletonFABButtonSpecimen,
  SkeletonSocialLoginButtonSpecimen, SkeletonTextLinkSpecimen, SkeletonAppStoreBadgeSpecimen,
} from './skeleton/actions'
import {
  SkeletonBadgeSpecimen, SkeletonStatusBadgeSpecimen, SkeletonChipSpecimen, SkeletonProgressSpecimen,
  SkeletonSpinnerSpecimen, SkeletonIconSpecimen, SkeletonRatingSpecimen, SkeletonFileFormatSpecimen, SkeletonAvatarSpecimen,
} from './skeleton/indicators'
import { SKELETON_SNIPPETS } from './skeleton/snippets'
import {
  SkeletonInputSpecimen, SkeletonTextareaSpecimen, SkeletonInputGroupSpecimen, SkeletonInputStepperSpecimen,
  SkeletonInputTagSpecimen, SkeletonSelectSpecimen, SkeletonComboboxSpecimen, SkeletonInputOTPSpecimen,
  SkeletonCheckboxSpecimen, SkeletonCheckboxGroupSpecimen, SkeletonRadioSpecimen, SkeletonRadioGroupSpecimen,
  SkeletonToggleSpecimen, SkeletonSwitchGroupSpecimen, SkeletonSliderSpecimen, SkeletonFileUploadSpecimen,
  SkeletonDropzoneSpecimen, SkeletonFieldSpecimen, SkeletonLabelSpecimen, SkeletonPasswordStrengthSpecimen,
} from './skeleton/forms'
import { SkeletonCardSpecimen, SkeletonModalSpecimen } from './skeleton/surfaces'
import { useInspectorActive } from '../../preview/artefacts/TokenInspector'

export type AxisValues = Record<string, string>

// ── Shared helpers ────────────────────────────────────────────────────────────

const darken = (c: string, amt: number) => {
  try { return chroma(c).darken(amt).hex() } catch { return c }
}
/** A raised neutral surface — a menu panel, dropdown, popover, card, sheet,
 *  breadcrumb bar, sidebar. `surface.layer-1` (which is what `t.neutralFill`
 *  resolves to), NEVER `surface.page`. Specimens historically painted these
 *  containers with `t.surface`, which IS `surface.page` — invisible while a
 *  theme keeps its page near-white, wrong the instant it doesn't. */
// A `function` declaration, not an arrow — `gen-component-color-fields` only
// follows named function declarations when it walks a specimen's call graph, so
// an arrow here would hide `neutralFill` / `surface` from every component that
// paints a panel through this helper.
/** A container RESTING on the page — card, header, sidebar, scroll panel. */
function raisedBg(t: PreviewTokens): string {
  return t.neutralFill ?? t.surface
}
/**
 * A container FLOATING above another container — modal, dropdown panel, context
 * menu, popover, command palette. One step deeper than `raisedBg`.
 *
 * Both used to be `raisedBg`, so a modal was painted the exact fill of the card
 * it floats over and only its shadow told them apart. Falls back to `raisedBg`
 * on a flat system, which has no `surface.layer-2` to reach for.
 */
function floatingBg(t: PreviewTokens): string {
  return overlaySurfaceOf(t)
}
/** Soft tint of a hex — reads the Opacity foundation's 10 / 5 / 20 steps, so
 *  soft fills track the user's transparency scale. */
const soft = (t: PreviewTokens, hex: string) => tintOf(t, hex, '10', 0.1)
/** One step deeper than `soft` — a pressed wash, not a hover one. Used to be
 *  `color + '33'` in ButtonSpecimen: a raw hex-alpha-suffix hack that (a) only
 *  works when `color` is already a clean 6-digit hex, and (b) went through
 *  neither `tintOf` nor any other named step, so it couldn't be told apart
 *  from a typo at the call site. `withAlpha` handles any chroma-parseable
 *  color, and routing through `tintOf` keeps every soft-fill in this file on
 *  ONE mechanism instead of two. */

/** Control stroke for a form field — rest / hover / focus / invalid each
 *  read the role the catalogue names for that job. Hover used to paint
 *  `content.secondary` and Error used to paint `status.critical.surface-solid`,
 *  so Inspect tokens named a text role or a button fill for a border. */

/** A soft 3-stop gradient at the accent's hue rotated `deg` degrees, holding one
 *  lightness/chroma envelope so a rotated stack reads as a family (the attached
 *  reference: periwinkle → mint → lavender → amber → coral, same "weight"). */
export function avatarHueGradient(t: PreviewTokens, deg: number): string {
  let h = 250
  try { h = (chroma(t.brandSolid).get('hsl.h') || 0) + deg } catch { /* keep default */ }
  const at = (l: number, sat: number) => chroma.hsl(((h % 360) + 360) % 360, sat, l).hex()
  return `linear-gradient(140deg, ${at(0.80, 0.52)} 0%, ${at(0.62, 0.62)} 52%, ${at(0.44, 0.55)} 100%)`
}

/** The default gradient fill: the system's ASSIGNED avatar gradient when it has
 *  one, otherwise the accent at hue 0 through the same envelope. */
export function avatarFillOf(t: PreviewTokens): string {
  return t.avatarGradient || t.coverGradient || avatarHueGradient(t, 0)
}

/** Hue offsets for a 5-up avatar stack — cool to warm, so the row shows the
 *  gradient variant's range at a glance without repeating a colour. */
export const AVATAR_STACK_HUES = [0, 42, 96, 168, 214]

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

// Per-severity ink, for the call sites that only ever mean ONE severity.
//
// These deliberately do NOT delegate to `statusInk`, and both halves of that
// matter to `gen-component-color-fields`, which resolves each specimen's field
// list as the transitive closure over this file's call graph:
//   · They are `function` DECLARATIONS. The generator only walks declarations,
//     so an arrow const truncates the closure — measured, Label / Field /
//     ContextMenu / DropdownMenu all dropped `errorColor` from their agent
//     context when this was `const errorInkOf = (t) => …`.
//   · They read one severity's fields, not the generic switch's. Routing a
//     Label through `statusInk` gave it `successColor` / `warningColor` /
//     `infoColor` / `brandSolid` / `brandText` as well — every field the
//     dispatcher touches — which is a Color section listing roles the
//     component provably never paints.
// `statusInk` itself stays generic for `ButtonSpecimen`, where the intent is a
// real axis and listing all of them IS correct.
function errorInkOf(t: PreviewTokens): string {
  return t.archTokens?.['status.critical.content'] || t.errorColor
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

const strokeControl = (t: PreviewTokens) => strokeRoleOf(t, 'control', '1px')

/** Control anatomy that has no step of its own (a badge's padding, a progress
 *  track, a stepper node) scaled by the `control` size role against its 40px
 *  standard. The Fields dial and the spacing modes move that role, so these
 *  grow and shrink with the buttons and inputs beside them. Exactly 1 at the
 *  standard ramp, so a default system renders byte for byte as before. */
function fieldPx(t: PreviewTokens, px: number): number {
  const control = parseFloat(sizeRoleOf(t, 'control', '40px')) || 40
  return Math.round(px * control / 40)
}

/** Eases every property a State variant can change. 140ms sits in the
 *  micro-feedback band — long enough to read as a transition, short enough that
 *  the control still feels immediate under the cursor. */
const STATE_TRANSITION =
  'background 0.14s ease-out, border-color 0.14s ease-out, color 0.14s ease-out, box-shadow 0.14s ease-out'

/** Tween for a selection pill that the user just moved. Same curve the
 *  layoutId pills used — bounce still reads as toy on this canvas. */
const PILL_TRANSITION = { duration: 0.26, ease: [0.16, 1, 0.3, 1] as const }
const PILL_SNAP = { duration: 0 }

/**
 * One sliding selection mark, measured in the track's OWN layout pixels.
 *
 * `layoutId` is the obvious tool and the wrong one here. Theme Preview
 * photographs every module with `transform: scale()` (`ScaledModule`,
 * `ScaledArtefactCard`). Framer's projection is in screen space, so a token
 * refresh, a first measure, or a page reload plays the same "slide" as a
 * click — the pill jumps through the scale. `layoutDependency` only gates
 * layout animations; it does not stop that projection.
 *
 * `offsetLeft` / `offsetTop` are pre-transform, so a click still slides and
 * a resize/refresh snaps. The mark is a sibling of the items (not a child of
 * the active one) so it can travel without remounting.
 */
function SlidingSelection({
  trackRef,
  selection,
  reduce,
  style,
}: {
  trackRef: { current: HTMLElement | null }
  selection: string | number
  reduce: boolean
  style: CSSProperties
}) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [slide, setSlide] = useState(false)
  const prevSel = useRef(selection)

  const measure = useCallback(() => {
    const track = trackRef.current
    const item = track?.querySelector<HTMLElement>('[data-sliding-active="true"]')
    if (!track || !item) return
    const next = {
      x: item.offsetLeft,
      y: item.offsetTop,
      w: item.offsetWidth,
      h: item.offsetHeight,
    }
    setBox((prev) =>
      prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h
        ? prev
        : next,
    )
  }, [trackRef])

  useLayoutEffect(() => {
    const moved = prevSel.current !== selection
    prevSel.current = selection
    if (moved) setSlide(!reduce)
    measure()
  }, [selection, measure, reduce])

  // The track ref sits on the parent host. This child's layout effect can run
  // before that ref is attached, and a miss used to stick: the mark never
  // mounted, so the current item kept `content.on-action` (ink solved for the
  // solid fill) sitting on the track instead. `useEffect` runs after every
  // ref in the commit, so the mark still lands on the first paint.
  useEffect(() => {
    measure()
  }, [selection, measure])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(track)
    for (const child of track.children) {
      // The mark itself is aria-hidden; watching it would re-measure
      // mid-tween and fight the slide.
      if (child instanceof HTMLElement && child.getAttribute('aria-hidden') !== 'true') {
        ro.observe(child)
      }
    }
    return () => ro.disconnect()
  }, [measure])

  if (!box) return null
  return (
    <motion.span
      aria-hidden
      initial={false}
      animate={{ x: box.x, y: box.y, width: box.w, height: box.h }}
      transition={slide && !reduce ? PILL_TRANSITION : PILL_SNAP}
      onAnimationComplete={() => setSlide(false)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        ...style,
      }}
    />
  )
}

function baseFont(t: PreviewTokens): CSSProperties {
  return { ...typeStyleOf(t, 'body-md', { leading: false }), color: t.neutralText }
}

/** Text role, no line-height — the default for controls (buttons, labels, tabs). */
function typeOf(t: PreviewTokens, role: string): CSSProperties {
  return typeStyleOf(t, role, { leading: false })
}

// ── Icons — Phosphor, bundled locally ───────────────────────────────────────
// Specimens render Phosphor glyphs (regular weight) from the committed catalog.
// Concept names map through PHOSPHOR_CORE so Button/Input slots stay stable.

export type IconConcept =
  | 'star' | 'arrow' | 'search' | 'eye'
  | 'plus' | 'upload' | 'info' | 'success' | 'warning' | 'error'
  | 'home' | 'box' | 'grid' | 'image' | 'text' | 'settings' | 'palette'
  | 'bookmark' | 'heart' | 'share' | 'user' | 'users' | 'zap' | 'check'
  | 'chevron' | 'close' | 'chat' | 'mail'

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

/** Brand keeps the catalogue star. A severity button that still shows a star
 *  is advertising decoration as status — Danger is the error circle, Success
 *  the plain check (`check-circle` collapses to a star-shaped blob at SM). */
export function buttonLeadingConcept(color?: string): IconConcept {
  if (color === 'Danger') return 'error'
  if (color === 'Success') return 'check'
  return ICON_SLOTS.Button.leading
}

export interface IconOpts {
  prefix: string
  leading: boolean
  trailing: boolean
  /** Overrides `buttonLeadingConcept` / `ICON_SLOTS` for this render. */
  leadingConcept?: IconConcept
}

/**
 * Which Phosphor WEIGHT the specimens under this subtree render at.
 *
 * The icon SET never changes — it is always the bundled Phosphor library
 * (`@phosphor-icons/core`, committed under `src/generated/`, regenerated by the
 * `pre{dev,build}` hooks). Only the stroke weight varies, and it is a per-theme
 * STYLE choice (see `themePresets`), so a wrapper provides the loaded body map
 * and every `PreviewIcon` beneath reads it. Default is `regular`, available
 * synchronously as `PHOSPHOR_CORE_BODIES`; every other weight is a lazy chunk,
 * so a subtree renders `regular` for one frame and swaps in when it resolves.
 */
const PhosphorWeightContext = createContext<Record<string, string>>(PHOSPHOR_CORE_BODIES)
/** The NAME of the weight in force, so a small icon can step up to regular
 *  (`effectiveIconWeight`) without the provider knowing its children's sizes. */
const PhosphorWeightNameContext = createContext<PhosphorWeight>('regular')

function usePhosphorWeightBodies(weight: PhosphorWeight): Record<string, string> {
  const [bodies, setBodies] = useState(() => peekPhosphorWeight(weight) ?? PHOSPHOR_CORE_BODIES)
  useLayoutEffect(() => {
    const ready = peekPhosphorWeight(weight)
    if (ready) { setBodies(ready); return }
    let live = true
    loadPhosphorWeight(weight).then((map) => { if (live) setBodies(map) })
    return () => { live = false }
  }, [weight])
  // Prefer the cache on THIS render so a reset onto a weight we already
  // loaded never paints the regular fallback for a frame. While a new
  // weight is in flight, keep the previous bodies — swapping to regular
  // mid-reset is the icon pop the collage was showing.
  return peekPhosphorWeight(weight) ?? bodies
}

export function PhosphorWeightProvider({ weight, children }: { weight: PhosphorWeight | undefined; children: ReactNode }) {
  const bodies = usePhosphorWeightBodies(weight ?? 'regular')
  return (
    <PhosphorWeightNameContext.Provider value={weight ?? 'regular'}>
      <PhosphorWeightContext.Provider value={bodies}>{children}</PhosphorWeightContext.Provider>
    </PhosphorWeightNameContext.Provider>
  )
}

export function PreviewIcon({ concept, size = 16, color = 'currentColor' }: { prefix?: string; concept: IconConcept; size?: number; color?: string }) {
  const weightBodies = useContext(PhosphorWeightContext)
  const weightName = useContext(PhosphorWeightNameContext)
  const slug = PHOSPHOR_CORE[concept] ?? ''
  // Below 16px a thin / light stroke washes out, so a small icon steps up to
  // regular — always synchronous, no lazy map to wait for (`lib/iconSizing`).
  const smallLight = effectiveIconWeight(weightName, size) !== weightName
  // The weighted map is the full catalogue and contains the core slugs; fall
  // back to the sync regular body while a lazy weight is still loading.
  const body = smallLight ? phosphorCoreBody(slug) : weightBodies[slug] ?? phosphorCoreBody(slug)
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

/** Representative glyphs for the Theme Preview icon-style rail — same weight the canvas uses. */
const ICON_STYLE_OVERVIEW: IconConcept[] = [
  'search', 'home', 'mail', 'user', 'settings', 'warning', 'check', 'plus',
]

/**
 * The three icon sizes — about half a control's height — at the theme's
 * weight. The same px on every viewport.
 */
export function IconSizeLadder({ weight = 'regular', sizes }: { weight?: PhosphorWeight; sizes?: Record<string, string> }) {
  const icon = iconSizesFor(sizes)
  return (
    <PhosphorWeightProvider weight={weight}>
      <div className="flex items-end justify-between gap-1.5" role="img" aria-label="Icon sizes">
        {ICON_ROLES.map((role) => {
          const px = icon[role]
          return (
            <div key={role} className="flex min-w-0 flex-col items-center gap-1">
              <span
                className="flex items-center justify-center rounded-md border border-line bg-surface text-fg"
                style={{ height: px + 16, width: px + 16 }}
              >
                <PreviewIcon concept="home" size={px} />
              </span>
              <span className="text-micro tabular-nums text-fg-faint">{`${role} · ${px}`}</span>
            </div>
          )
        })}
      </div>
    </PhosphorWeightProvider>
  )
}

export function IconStyleOverview({ weight = 'regular', ariaLabel = 'Phosphor icon style preview' }: { weight?: PhosphorWeight; ariaLabel?: string }) {
  return (
    <PhosphorWeightProvider weight={weight}>
      <div
        role="img"
        aria-label={ariaLabel}
        className="mb-1 grid grid-cols-4 gap-2 rounded-lg border border-line bg-surface px-2 py-2.5"
      >
        {ICON_STYLE_OVERVIEW.map((concept) => (
          <span key={concept} className="flex h-9 items-center justify-center text-fg-muted">
            <PreviewIcon concept={concept} size={20} />
          </span>
        ))}
      </div>
    </PhosphorWeightProvider>
  )
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
   * Flush inside a Boxes-radius parent (a card, a collage module) whose
   * padding is `inset-surface`. Inner corner = parent − padding, so a short
   * alert cannot reuse the card's own radius and read as a pill. Opt-in and
   * inert — omit and the specimen keeps `container` verbatim.
   */
  nested?: boolean
  /**
   * Which step of the SHADOW ramp this specimen sits on. Honoured by `Card`
   * (and floating menus). Opt-in like `w` / `children` — omit → `sm`.
   *
   * Pass `false` to omit the specimen's own shadow when a parent paints
   * elevation at true size (SystemCollage's scaled modules — an inner
   * `boxShadow` is clipped by the photograph frame and shrunk by
   * `transform: scale`).
   *
   * It is a token REFERENCE, never a value — `shadowOf` resolves it against the
   system's own ramp, so an artefact still cannot invent an elevation.
   */
  elev?: string | false
  /** Omit the helper line under fields — dense collage / sign-up modules. */
  hideHint?: boolean
}

// ── Button (Color × Style × State) ────────────────────────────────────────────

// Button size scale — heights resolve from the Sizes foundation (sm–xl), so
// editing Foundations · Sizes retunes every button size live.
export const BUTTON_SIZE_SPECS: Record<string, { sizeKey: string; h: number; f: number; padX: number; gap: number }> = {
  SM: { sizeKey: 'sm', h: 32, f: 13, padX: 14, gap: 6 },
  MD: { sizeKey: 'md', h: 40, f: 14, padX: 18, gap: 8 },
  LG: { sizeKey: 'lg', h: 48, f: 15, padX: 22, gap: 8 },
  XL: { sizeKey: 'xl', h: 56, f: 16, padX: 26, gap: 10 },
}

// ── Input (Size × State × Type) ───────────────────────────────────────────────

/** Field height as a share of the `control` size role. MD IS the role (the
 *  height every other form control uses); SM/XS have no step of their own
 *  (34 and 28 sit between ramp steps), so they scale with it — the Fields
 *  dial then resizes inputs with the selects and buttons beside them. */
export const INPUT_META: Record<string, { label: string; placeholder: string; prefix?: string; lead?: ReactNode }> = {
  'Default':      { label: 'Name', placeholder: 'Jane Doe' },
  'E-Mail':       { label: 'Email', placeholder: 'you@company.com', lead: '@' },
  'Password':     { label: 'Password', placeholder: '••••••••' },
  'Search':       { label: 'Search', placeholder: 'Search anything…', lead: '⌕' },
  'Phone Number': { label: 'Phone', placeholder: '(555) 000-0000', prefix: 'US' },
  'Website':      { label: 'Website', placeholder: 'yoursite.com', prefix: 'https://' },
}

export const INPUT_HTML_TYPE: Record<string, string> = {
  Default: 'text',
  'Icon Leading': 'text',
  'Icon Trailing': 'text',
  'E-Mail': 'email',
  Password: 'password',
  Search: 'search',
  'Phone Number': 'tel',
  Website: 'url',
}

export function inputSeed(type: string | undefined, state: string | undefined): string {
  if (state !== 'Filled') return ''
  if (type === 'E-Mail') return 'maya@escala.ds'
  if (type === 'Password') return '••••••••'
  return 'Maya Duscenko'
}

/**
 * Two kinds of avatar, chosen by `v.Variant` — both opt-in and inert (every
 * pre-existing call site omits `Variant` and gets the initials look, byte for
 * byte):
 *
 *  · default / `Initial` — accent-secondary tint + initials. The system's
 *    long-standing avatar; reverted here after a brief detour through a solid
 *    gradient fill that read as decoration rather than identity.
 *  · `Gradient` — a soft gradient, no letter. `v.Hue` (degrees) rotates it off
 *    the accent so a stack can show a range (see `AVATAR_STACK_HUES`); omit
 *    `Hue` and it uses the system's assigned avatar gradient.
 */
// ── Toast (Status) ────────────────────────────────────────────────────────────

function ToastSpecimen({ t, v, w, children, elev }: SpecimenProps) {
  const status = v.Status ?? 'Success'
  // Inverse snackbar: `surface.inverse` fill + `content.inverse` ink. Falls back
  // to the neutralText/surface pairing that already reads in both themes — see
  // the note below on why `background-overlay` is wrong here.
  const inverse = archTokenOf(t, 'surface.inverse', t.neutralText)
  const ink = archTokenOf(t, 'content.inverse', t.surface)
  const rowGap = spacingRoleOf(t, 'gap-tight', '8px')
  const padBlock = spacingRoleOf(t, 'gap-control', '12px')
  const padInline = spacingRoleOf(t, 'gap-group', '14px')
  const defaultMessage =
    status === 'Error' ? 'Something went wrong.'
      : status === 'Warning' ? 'Storage almost full.'
        : status === 'Info' ? 'A new version is available.'
          : 'Changes saved.'
  const width = w ?? 280
  return (
    <div
      role={status === 'Error' ? 'alert' : 'status'}
      style={{
        ...baseFont(t),
        display: 'flex',
        alignItems: 'center',
        gap: rowGap,
        padding: `${padBlock} ${padInline}`,
        borderRadius: radiusRoleOf(t, 'container'),
        background: inverse,
        color: ink,
        boxShadow: elev === false ? undefined : shadowOf(t, 'xl', '0 8px 24px rgba(10,13,18,0.25)'),
        width,
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      <span
        style={{
          ...typeOf(t, 'body-sm'),
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {children ?? defaultMessage}
      </span>
      <span style={{ ...typeOf(t, 'button'), textDecoration: 'underline', cursor: 'pointer', flexShrink: 0 }}>Undo</span>
      <span style={{ ...typeOf(t, 'button'), opacity: 0.6, cursor: 'pointer', flexShrink: 0 }}>✕</span>
    </div>
  )
}

// ── Divider (Orientation) ─────────────────────────────────────────────────────

function DividerSpecimen({ t, v, w }: SpecimenProps) {
  const horizontal = (v.Orientation ?? 'Horizontal') === 'Horizontal'
  return horizontal
    ? <hr style={{ width: w ?? 220, border: 'none', borderTop: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}` }} />
    : <span style={{ display: 'inline-block', height: 64, width: 1, background: t.borderDefault ?? '#e9eaeb' }} />
}

// ── Single-variant specimens ──────────────────────────────────────────────────

/** A box's real shorter side, measured — so `fitRadiusPx` can cap a tall box's
 *  role radius (an alert that wraps, a card with a long body) instead of
 *  guessing from a min-height. Returns the ref to attach and the radius to use. */
function useFitRadius(t: PreviewTokens, role: string, fallback?: string) {
  const ref = useRef<HTMLDivElement>(null)
  const [side, setSide] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSide(Math.min(el.offsetWidth, el.offsetHeight))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const base = fallback ?? radiusRoleOf(t, role)
  return { ref, radius: side ? `${fitRadiusPx(t, role, side)}px` : base }
}

function TooltipSpecimen({ t }: { t: PreviewTokens }) {
  // See ToastSpecimen's note — same inverse-chip pairing, same dark-mode fix
  // (was `background-overlay`, a modal scrim that goes near-black in BOTH
  // themes and nearly matched the dark page, making this unreadable there).
  const inverse = t.neutralText
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ ...typeOf(t, 'caption'), padding: `${spaceOf(t, 6)} ${spaceOf(t, 10)}`, borderRadius: radiusRoleOf(t, 'action'), background: inverse, color: t.surface }}>
        Copy to clipboard
      </span>
      <span style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${inverse}` }} />
    </div>
  )
}

function TabsSpecimen({ t }: { t: PreviewTokens }) {
  const tabs = ['Overview', 'Tokens', 'Usage']
  return (
    <div style={{ ...baseFont(t), display: 'flex', gap: spacingRoleOf(t, 'gap-tight', '4px'), borderBottom: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}` }}>
      {tabs.map((tab, i) => (
        <span
          key={tab}
          style={{
            ...typeOf(t, 'button'), padding: `${spaceOf(t, 8)} ${spaceOf(t, 14)}`, cursor: 'pointer',
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
    <nav aria-label="Breadcrumb" style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: spacingRoleOf(t, 'gap-control', '8px') }}>
      <span style={{ color: t.fgMuted, cursor: 'pointer' }}>Home</span>
      <span style={{ color: t.placeholderText }}>/</span>
      <span style={{ color: t.fgMuted, cursor: 'pointer' }}>Library</span>
      <span style={{ color: t.placeholderText }}>/</span>
      <span style={{ fontWeight: weightOf(t, 'medium', 500) }}>Design tokens</span>
    </nav>
  )
}

// ── Content & Surfaces — disclosure, media, floating panels ───────────────────

function AccordionSpecimen({ t }: { t: PreviewTokens }) {
  const rows = ['What are design tokens?', 'How does Figma sync work?', 'Can I export CSS?']
  return (
    <div style={{ ...baseFont(t), width: 320, borderRadius: radiusRoleOf(t, 'container'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: raisedBg(t), overflow: 'hidden' }}>
      {rows.map((q, i) => (
        <div key={q} style={{ borderTop: i === 0 ? 'none' : `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}` }}>
          <button type="button" aria-expanded={i === 0} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spaceOf(t, 10), padding: `${spaceOf(t, 13)} ${spaceOf(t, 16)}`, background: 'transparent', border: 'none', cursor: 'pointer', ...typeOf(t, 'heading-xs'), color: t.neutralText, textAlign: 'left' }}>
            {q}
            <span style={{ transform: i === 0 ? 'rotate(180deg)' : undefined, flexShrink: 0, display: 'inline-flex' }}>
              <PreviewIcon concept="chevron" size={iconOf(13)} color={t.fgMuted} />
            </span>
          </button>
          {i === 0 && (
            <p style={{ margin: 0, padding: `0 ${spaceOf(t, 16)} ${spaceOf(t, 14)}`, ...typeStyleOf(t, 'body-sm', { leading: true }), color: t.fgMuted }}>
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
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spaceOf(t, 6) }}>
      <div style={{ width: 260, borderRadius: radiusRoleOf(t, 'overlay'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, ...overlaySurfaceStyle(t), boxShadow: shadowOf(t, 'xl', '0 12px 32px rgba(10,13,18,0.14)'), padding: spaceOf(t, 16), display: 'flex', flexDirection: 'column', gap: spaceOf(t, 6) }}>
        <span style={{ ...typeOf(t, 'heading-xs') }}>Share this system</span>
        <span style={{ ...typeStyleOf(t, 'body-sm', { leading: true }), color: t.fgMuted }}>Anyone with the link can view tokens and docs.</span>
        <span style={{ alignSelf: 'flex-start', marginTop: spaceOf(t, 4), ...typeOf(t, 'button'), padding: `${spaceOf(t, 6)} ${spaceOf(t, 12)}`, borderRadius: radiusRoleOf(t, 'action'), background: t.brandSolid, color: t.onBrand, cursor: 'pointer' }}>Copy link</span>
      </div>
      <span style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `6px solid ${floatingBg(t)}`, filter: 'drop-shadow(0 1px 0 rgba(10,13,18,0.08))' }} aria-hidden />
      <span style={{ ...typeOf(t, 'label'), padding: `${spaceOf(t, 7)} ${spaceOf(t, 14)}`, borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, background: raisedBg(t), cursor: 'pointer' }}>Share</span>
    </div>
  )
}

function InfoTooltipSpecimen({ t }: { t: PreviewTokens }) {
  // See ToastSpecimen's note — same fix, same reason.
  const inverse = t.neutralText
  return (
    <div style={{ ...baseFont(t), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacingRoleOf(t, 'gap-tight', '4px') }}>
      <span style={{ ...typeOf(t, 'caption'), padding: `${spaceOf(t, 6)} ${spaceOf(t, 10)}`, borderRadius: radiusRoleOf(t, 'action'), background: inverse, color: t.surface }}>
        Applies to new projects only.
      </span>
      <span style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${inverse}` }} aria-hidden />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: spaceOf(t, 6), ...typeOf(t, 'label') }}>
        Default visibility
        <PreviewIcon concept="info" size={iconOf(14)} color={t.fgMuted} />
      </span>
    </div>
  )
}

function ScrollAreaSpecimen({ t }: { t: PreviewTokens }) {
  const rows = ['Accent / 500', 'Accent / 600', 'Neutral / 100', 'Neutral / 200', 'Success / 500']
  return (
    <div style={{ ...baseFont(t), position: 'relative', width: 240, height: 150, borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: raisedBg(t), overflow: 'hidden', padding: `${spaceOf(t, 6)} ${spaceOf(t, 14)} ${spaceOf(t, 6)} ${spaceOf(t, 6)}` }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((r) => (
          <span key={r} style={{ padding: `${spaceOf(t, 8)} ${spaceOf(t, 10)}`, ...typeOf(t, 'body-sm'), color: t.neutralText, borderRadius: radiusRoleOf(t, 'control') }}>{r}</span>
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
  return <PreviewIcon concept={concept} size={iconOf(15)} color={c} />
}

function AlertBannerSpecimen({ t, v, nested }: SpecimenProps) {
  const status = v.Status ?? 'Info'
  const c = statusColor(t, status)
  const fit = useFitRadius(t, 'container', nested ? nestedRadiusOf(t, 'container') : undefined)
  return (
    // `container`, not `action` — an alert is a BOX. `RADIUS_GROUPS`' Boxes
    // axis is hinted "card, modal, alert" and `RADIUS_ROLES.container` is
    // described "Cards, accordion, inline alerts". When `nested`, the inner
    // corner is parent − `inset-surface` so a short banner cannot reuse the
    // card's radius and read as a pill (see `nestedRadiusOf`).
    <div role="status" ref={fit.ref} style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: spaceOf(t, 10), width: 380, padding: `${spaceOf(t, 10)} ${spaceOf(t, 14)}`, borderRadius: nested ? nestedRadiusOf(t, 'container') : fit.radius, background: soft(t, c), border: `${strokeControl(t)} solid ${statusBorder(t, status, c)}` }}>
      <StatusIcon c={c} status={status} />
      <span style={{ ...typeOf(t, 'body-sm'), flex: 1 }}>
        {status === 'Error' ? 'Sync failed — tokens were not published.' : status === 'Warning' ? 'Your trial ends in 3 days.' : status === 'Success' ? 'All tokens are synced to Figma.' : 'Scheduled maintenance on Sunday 02:00 UTC.'}
      </span>
      <span style={{ ...typeOf(t, 'button'), color: c, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {status === 'Warning' ? 'Upgrade' : 'View'}
      </span>
      <PreviewIcon concept="close" size={iconOf(12)} color={t.fgMuted} />
    </div>
  )
}

function InlineAlertSpecimen({ t, v, w, children, nested }: SpecimenProps) {
  const status = v.Status ?? 'Info'
  const c = statusColor(t, status)
  const fit = useFitRadius(t, 'container', nested ? nestedRadiusOf(t, 'container') : undefined)
  return (
    // `container` — see `AlertBannerSpecimen`; an alert is a Box, not a Field.
    <div role="status" ref={fit.ref} style={{ ...baseFont(t), display: 'flex', gap: spaceOf(t, 10), width: w ?? 320, padding: spaceOf(t, 14), borderRadius: nested ? nestedRadiusOf(t, 'container') : fit.radius, background: soft(t, c), border: `${strokeControl(t)} solid ${statusBorder(t, status, c)}` }}>
      <StatusIcon c={c} status={status} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: spaceOf(t, 3), flex: 1, minWidth: 0 }}>
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
  elev?: string | false
}) {
  // Panel is an overlay. Items float in `pad` (not a flush nesting pair), so
  // they take `control` — the role named for menu items — capped so they never
  // out-round the gutter. `overflow: hidden` clips the first/last hover to the
  // panel curve; overlay−pad on a ~32px row made the hover a pill.
  const pad = 4
  const outerRadius = radiusRoleOf(t, 'overlay')
  const nestedPx = parseFloat(nestedRadiusOf(t, 'overlay', pad)) || 0
  const controlPx = parseFloat(radiusRoleOf(t, 'control')) || 0
  const rowRadius = `${Math.min(controlPx || nestedPx, nestedPx)}px`
  return (
    <div role="menu" style={{ ...baseFont(t), width: w ?? 210, borderRadius: outerRadius, border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, ...overlaySurfaceStyle(t), boxShadow: elev === false ? undefined : shadowOf(t, elev || 'lg', '0 12px 32px rgba(10,13,18,0.14)'), padding: pad, overflow: 'hidden' }}>
      {items.map((item, i) =>
        item.sep ? (
          <span key={i} style={{ display: 'block', height: 1, background: t.borderDefault ?? '#e9eaeb', margin: `${spaceOf(t, 4)} ${spaceOf(t, 6)}` }} aria-hidden />
        ) : (
          <span
            key={item.label}
            role="menuitem"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spaceOf(t, 10),
              padding: `${spaceOf(t, 7)} ${spaceOf(t, 10)}`, borderRadius: rowRadius, ...typeOf(t, 'body-sm'), cursor: 'pointer',
              // `action.ghost.hover` — the role named for menu items
              // and close buttons. `surface.selected` is persistent selection
              // (a tab, a table row), not a transient hover.
              background: item.hover ? (t.ghostNeutralHover ?? archTokenOf(t, 'action.ghost.hover', darken(floatingBg(t), 0.25))) : 'transparent',
              color: item.danger ? errorInkOf(t) : t.neutralText,
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: spaceOf(t, 6) }}>
      <span style={{ ...baseFont(t), display: 'inline-flex', alignItems: 'center', gap: spaceOf(t, 6), ...typeOf(t, 'label'), padding: `${spaceOf(t, 7)} ${spaceOf(t, 12)}`, borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.border ?? '#d0d5dd'}`, background: raisedBg(t), cursor: 'pointer' }}>
        Options
        <PreviewIcon concept="chevron" size={iconOf(11)} color={t.fgMuted} />
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
    <div style={{ ...baseFont(t), width: 320, borderRadius: radiusRoleOf(t, 'container'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, ...overlaySurfaceStyle(t), boxShadow: shadowOf(t, '2xl', '0 20px 48px rgba(10,13,18,0.18)'), overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacingRoleOf(t, 'gap-control', '8px'), padding: `${spaceOf(t, 11)} ${spaceOf(t, 14)}`, borderBottom: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}` }}>
        <PreviewIcon concept="search" size={iconOf(14)} color={t.fgMuted} />
        <span style={{ flex: 1, ...typeOf(t, 'placeholder'), color: t.placeholderText }}>Type a command…</span>
        <span style={{ ...typeOf(t, 'caption'), color: t.placeholderText, border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, borderRadius: radiusRoleOf(t, 'control', '4px'), padding: `${spaceOf(t, 2)} ${spaceOf(t, 5)}` }}>⌘K</span>
      </div>
      <div style={{ padding: spaceOf(t, 6) }}>
        <span style={{ display: 'block', padding: `${spaceOf(t, 4)} ${spaceOf(t, 10)}`, ...typeOf(t, 'caption'), textTransform: 'uppercase', letterSpacing: 1, color: t.placeholderText }}>Actions</span>
        {results.map((r) => (
          <span key={r.label} style={{ display: 'block', padding: `${spaceOf(t, 7)} ${spaceOf(t, 10)}`, borderRadius: radiusRoleOf(t, 'control'), ...typeOf(t, 'body-sm'), color: t.neutralText, background: r.hover ? t.neutralFill : 'transparent', cursor: 'pointer' }}>
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
    <header style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: spaceOf(t, 20), width: 420, padding: `${spaceOf(t, 10)} ${spaceOf(t, 16)}`, borderRadius: radiusRoleOf(t, 'action'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: raisedBg(t) }}>
      <span style={{ width: 24, height: 24, borderRadius: radiusRoleOf(t, 'control'), background: t.brandSolid, flexShrink: 0 }} aria-hidden />
      <nav aria-label="Main" style={{ display: 'flex', gap: spaceOf(t, 14), flex: 1 }}>
        {links.map((l, i) => (
          <span key={l} style={{ ...typeOf(t, i === 0 ? 'button' : 'body-sm'), cursor: 'pointer', color: i === 0 ? t.neutralText : t.fgMuted }}>{l}</span>
        ))}
      </nav>
      <span style={{ width: 28, height: 28, borderRadius: radiusRoleOf(t, 'pill', '9999px'), background: t.selectedSurface ?? soft(t, t.brandSolid), color: t.brandText, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...typeOf(t, 'caption'), flexShrink: 0 }}>MD</span>
    </header>
  )
}

const SIDEBAR_ICONS: Record<string, IconConcept> = {
  home: 'home',
  color: 'palette',
  box: 'box',
  gear: 'settings',
}

function SidebarSpecimen({ t, w }: SpecimenProps) {
  const items = [
    { icon: 'home', label: 'Overview' },
    { icon: 'color', label: 'Tokens' },
    { icon: 'box', label: 'Components' },
    { icon: 'gear', label: 'Settings' },
  ]
  const [active, setActive] = useState(1)
  const [hover, setHover] = useState<number | null>(null)
  const reduce = useReducedMotion() ?? false
  const trackRef = useRef<HTMLElement>(null)

  return (
    <nav ref={trackRef} aria-label="Sidebar" style={{ ...baseFont(t), position: 'relative', width: w ?? 200, padding: spaceOf(t, 8), borderRadius: radiusRoleOf(t, 'container'), border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`, background: raisedBg(t), display: 'flex', flexDirection: 'column', gap: spaceOf(t, 2) }}>
      <SlidingSelection
        trackRef={trackRef}
        selection={active}
        reduce={reduce}
        style={{
          borderRadius: radiusRoleOf(t, 'control'),
          background: t.selectedSurface ?? selectedSurfaceOf(t),
        }}
      />
      {items.map((item, i) => {
        const on = i === active
        const hot = hover === i
        return (
          <button
            key={item.label}
            type="button"
            aria-current={on ? 'page' : undefined}
            tabIndex={on ? 0 : -1}
            onClick={() => setActive(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault()
                const next = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
                setActive(next)
                const rows = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('button')
                rows?.[next]?.focus()
              }
            }}
            data-sliding-active={on ? 'true' : undefined}
            style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', gap: spaceOf(t, 10), padding: `${spaceOf(t, 8)} ${spaceOf(t, 10)}`,
              border: 'none', background: 'transparent',
              borderRadius: radiusRoleOf(t, 'control'), ...typeOf(t, 'body-sm'),
              cursor: 'pointer', textAlign: 'left', width: '100%',
              // Inactive warms the ink on hover — a second fill would compete
              // with the sliding pill for "which row is current" (same rule
              // TabMenu already follows).
              color: on ? t.brandText : hot ? t.neutralText : t.fgMuted,
              fontWeight: on ? weightOf(t, 'medium', 500) : 400,
              transition: STATE_TRANSITION,
            }}
          >
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: spaceOf(t, 10) }}>
              <PreviewIcon concept={SIDEBAR_ICONS[item.icon]} size={iconOf(15)} color={on ? t.brandText : hot ? t.neutralText : t.fgMuted} />
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function PaginationSpecimen({ t }: { t: PreviewTokens }) {
  const pages = [1, 2, 3, 8]
  const [page, setPage] = useState(2)
  const [hover, setHover] = useState<string | null>(null)
  const reduce = useReducedMotion() ?? false
  const trackRef = useRef<HTMLElement>(null)
  const at = pages.indexOf(page)
  const go = (n: number) => setPage(pages[Math.min(pages.length - 1, Math.max(0, n))] ?? page)

  const cell = (id: string, label: string, opts: { current?: boolean; muted?: boolean; onClick?: () => void } = {}): ReactNode => {
    const hot = hover === id && !opts.muted && !opts.current
    return (
      <button
        key={id}
        type="button"
        disabled={opts.muted}
        aria-current={opts.current ? 'page' : undefined}
        data-sliding-active={opts.current ? 'true' : undefined}
        onClick={opts.muted ? undefined : opts.onClick}
        onMouseEnter={() => setHover(id)}
        onMouseLeave={() => setHover((h) => (h === id ? null : h))}
        style={{
          position: 'relative',
          minWidth: sizeRoleOf(t, 'compact', '32px'), height: sizeRoleOf(t, 'compact', '32px'), padding: `0 ${spaceOf(t, 6)}`, borderRadius: radiusRoleOf(t, 'action'),
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', background: 'transparent',
          ...typeOf(t, 'body-sm'),
          cursor: opts.muted ? 'default' : 'pointer',
          color: opts.current ? t.onBrand : opts.muted ? t.placeholderText : hot ? t.neutralText : t.fgMuted,
          fontWeight: opts.current ? weightOf(t, 'semibold', 600) : 400,
          transition: STATE_TRANSITION,
        }}
      >
        <span style={{ position: 'relative' }}>{label}</span>
      </button>
    )
  }

  return (
    <nav
      ref={trackRef}
      aria-label="Pagination"
      style={{
        ...baseFont(t),
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: spaceOf(t, 2),
        padding: spaceOf(t, 4),
        borderRadius: radiusRoleOf(t, 'pill', '9999px'),
        background: raisedBg(t),
        border: `${strokeControl(t)} solid ${t.borderDefault ?? '#e9eaeb'}`,
      }}
    >
      <SlidingSelection
        trackRef={trackRef}
        selection={page}
        reduce={reduce}
        style={{
          borderRadius: radiusRoleOf(t, 'action'),
          background: t.brandSolid,
        }}
      />
      {cell('prev', '‹', { onClick: () => go(at - 1) })}
      {cell('p1', '1', { current: page === 1, onClick: () => setPage(1) })}
      {cell('p2', '2', { current: page === 2, onClick: () => setPage(2) })}
      {cell('p3', '3', { current: page === 3, onClick: () => setPage(3) })}
      {cell('ellipsis', '…', { muted: true })}
      {cell('p8', '8', { current: page === 8, onClick: () => setPage(8) })}
      {cell('next', '›', { onClick: () => go(at + 1) })}
    </nav>
  )
}

function StepperSpecimen({ t, w }: SpecimenProps) {
  const steps = [
    { label: 'Account', state: 'done' },
    { label: 'Tokens', state: 'current' },
    { label: 'Publish', state: 'todo' },
  ]
  const fill = w != null
  return (
    <ol style={{ ...baseFont(t), display: 'flex', alignItems: 'center', gap: 0, listStyle: 'none', margin: 0, padding: 0, width: w }}>
      {steps.map((s, i) => (
        <li key={s.label} style={{ display: 'flex', alignItems: 'center', flex: fill ? 1 : undefined, minWidth: 0 }} aria-current={s.state === 'current' ? 'step' : undefined}>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spaceOf(t, 6), width: fill ? '100%' : 84 }}>
            <span
              style={{
                width: fieldPx(t, 28), height: fieldPx(t, 28), borderRadius: 999,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                ...typeOf(t, 'button'),
                background: s.state === 'todo' ? 'transparent' : t.brandSolid,
                color: s.state === 'todo' ? t.fgMuted : t.onBrand,
                border: `${strokeControl(t)} solid transparent`,
              }}
            >
              {s.state === 'done' ? (
                <PreviewIcon concept="check" size={iconOf(12)} color={t.onBrand} />
              ) : (
                i + 1
              )}
            </span>
            <span style={{ ...typeOf(t, s.state === 'current' ? 'label' : 'helper'), color: s.state === 'todo' ? t.fgMuted : t.neutralText }}>{s.label}</span>
          </span>
          {i < steps.length - 1 && <span style={{ width: fill ? undefined : 40, flex: fill ? 1 : undefined, minWidth: fill ? 12 : undefined, height: 2, marginBottom: spaceOf(t, 20), borderRadius: 999, background: s.state === 'done' ? t.brandSolid : t.neutralFill }} aria-hidden />}
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
// The active pill is ONE element that slides between tabs rather than a
// background that blinks on and off per tab. That's what makes the selection
// read as a single object moving — and while it slides you can see the brand
// tint travel across the neutral text, so the two tokens are judged against
// each other. Tween, not spring: this is a tool, and bounce reads as toy here.
//
// Measured with `SlidingSelection` (offset*, not `layoutId`): the collage
// photographs this module with `transform: scale()`, and a layout projection
// would jump on refresh / token reset even when the selection did not change.
function TabMenuSpecimen({ t, w }: SpecimenProps) {
  const items = ['All', 'Drafts', 'Published']
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const reduce = useReducedMotion() ?? false
  const fill = w === '100%'
  const tabGap = spacingRoleOf(t, 'gap-tight', '4px')
  const trackRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={trackRef}
      role="tablist"
      style={{
        ...baseFont(t),
        position: 'relative',
        display: 'flex',
        width: fill ? '100%' : undefined,
        maxWidth: '100%',
        minWidth: 0,
        gap: tabGap,
      }}
    >
      <SlidingSelection
        trackRef={trackRef}
        selection={active}
        reduce={reduce}
        style={{
          borderRadius: radiusRoleOf(t, 'pill', '9999px'),
          // Persistent selection — `surface.selected`, not a local
          // `soft(brandSolid)` wash. That wash matched no role, so
          // Inspect tokens dropped the pill and kept only the inactive
          // label (`content.secondary`).
          background: t.selectedSurface ?? selectedSurfaceOf(t),
        }}
      />
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
                // stay usable past the first press. Query by role: the
                // sliding mark is a sibling in this track.
                const tabs = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')
                tabs?.[next]?.focus()
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setActive(i)
              }
            }}
            data-sliding-active={on ? 'true' : undefined}
            style={{
              position: 'relative',
              flex: fill ? '1 1 0' : undefined,
              minWidth: fill ? 0 : undefined,
              padding: fill ? `${fieldPx(t, 8)}px ${fieldPx(t, 6)}px` : `${fieldPx(t, 7)}px ${fieldPx(t, 14)}px`,
              borderRadius: radiusRoleOf(t, 'full', '9999px'),
              textAlign: fill ? 'center' : undefined,
              ...typeOf(t, fill ? 'label' : 'button'),
              cursor: 'pointer',
              // An inactive tab warms toward the brand ink on hover instead of
              // gaining a fill — a second filled pill would compete with the
              // real selection for "which one is active".
              color: on ? t.brandText : hover === i ? t.neutralText : t.fgMuted,
              fontWeight: on ? weightOf(t, 'semibold', 600) : 400,
              transition: STATE_TRANSITION,
              outline: 'none',
            }}
          >
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
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const reduce = useReducedMotion() ?? false
  const trackRef = useRef<HTMLDivElement>(null)
  // The selected segment is CONCENTRIC with the track (track radius − the
  // track's padding), a pill when the track is one — not a separate `control`
  // radius that leaves a squarer chip inside a round track.
  const [trackH, setTrackH] = useState(0)
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => setTrackH(el.offsetHeight)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const trackPad = parseFloat(spaceOf(t, 3)) || 3
  const innerRadius = trackH
    ? `${concentricRadiusPx(t, parseFloat(radiusRoleOf(t, 'action')) || 0, trackH, trackH - trackPad * 2, trackPad)}px`
    : radiusRoleOf(t, 'control')
  return (
    // The TRACK is a container sitting on another container (this control
    // lives inside a card, never straight on the page), which is exactly what
    // `surface.layer-2` means in the elevation contract `overlaySurfaceOf`
    // states — layer-1 is the card it sits ON, so painting the track with it
    // too left the two indistinguishable.
    <div ref={trackRef} role="radiogroup" style={{ ...baseFont(t), position: 'relative', display: 'inline-flex', padding: spaceOf(t, 3), gap: spaceOf(t, 2), borderRadius: radiusRoleOf(t, 'action'), background: overlaySurfaceOf(t) }}>
      <SlidingSelection
        trackRef={trackRef}
        selection={active}
        reduce={reduce}
        style={{
          borderRadius: innerRadius,
          background: t.inputSurface ?? inputSurfaceOf(t),
          boxShadow: shadowOf(t, 'xs', '0 1px 2px rgba(10,13,18,0.1)'),
        }}
      />
      {items.map((item, i) => {
        const on = i === active
        const hot = hover === i
        return (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={on}
            data-sliding-active={on ? 'true' : undefined}
            onClick={() => setActive(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            style={{
              position: 'relative',
              padding: `${fieldPx(t, small ? 4 : 6)}px ${fieldPx(t, small ? 10 : 14)}px`,
              border: 'none', background: 'transparent',
              borderRadius: innerRadius, ...typeOf(t, 'button'), cursor: 'pointer',
              color: on ? t.neutralText : hot ? t.neutralText : t.fgMuted,
              fontWeight: on ? weightOf(t, 'semibold', 600) : 400,
              transition: STATE_TRANSITION,
            }}
          >
            <span style={{ position: 'relative' }}>{item}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Registry + snippet builder ────────────────────────────────────────────────

export const SPECIMENS: Record<string, (p: SpecimenProps) => ReactNode> = {
  // Button & Actions
  Button: SkeletonButtonSpecimen,
  ButtonGroup: SkeletonButtonGroupSpecimen,
  CloseButton: SkeletonCloseButtonSpecimen,
  FABButton: SkeletonFABButtonSpecimen,
  SocialLoginButton: SkeletonSocialLoginButtonSpecimen,
  TextLink: SkeletonTextLinkSpecimen,
  AppStoreBadge: SkeletonAppStoreBadgeSpecimen,
  // Form Controls
  Input: SkeletonInputSpecimen,
  InputGroup: SkeletonInputGroupSpecimen,
  Textarea: SkeletonTextareaSpecimen,
  InputOTP: SkeletonInputOTPSpecimen,
  InputStepper: SkeletonInputStepperSpecimen,
  InputTag: SkeletonInputTagSpecimen,
  Select: SkeletonSelectSpecimen,
  Combobox: SkeletonComboboxSpecimen,
  Checkbox: SkeletonCheckboxSpecimen,
  CheckboxGroup: SkeletonCheckboxGroupSpecimen,
  Radio: SkeletonRadioSpecimen,
  RadioGroup: SkeletonRadioGroupSpecimen,
  Toggle: SkeletonToggleSpecimen,
  SwitchGroup: SkeletonSwitchGroupSpecimen,
  Slider: SkeletonSliderSpecimen,
  FileUpload: SkeletonFileUploadSpecimen,
  Dropzone: SkeletonDropzoneSpecimen,
  Field: SkeletonFieldSpecimen,
  Label: SkeletonLabelSpecimen,
  PasswordStrength: SkeletonPasswordStrengthSpecimen,
  // Indicators
  Badge: SkeletonBadgeSpecimen,
  StatusBadge: SkeletonStatusBadgeSpecimen,
  Chip: SkeletonChipSpecimen,
  Progress: SkeletonProgressSpecimen,
  Spinner: SkeletonSpinnerSpecimen,
  Icon: SkeletonIconSpecimen,
  Rating: SkeletonRatingSpecimen,
  FileFormat: SkeletonFileFormatSpecimen,
  // Content & Surfaces
  Avatar: SkeletonAvatarSpecimen,
  Card: SkeletonCardSpecimen,
  Divider: DividerSpecimen,
  Accordion: AccordionSpecimen,
  AspectRatio: AspectRatioSpecimen,
  Modal: SkeletonModalSpecimen,
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
  // Pointing AT a specimen is how the inspector selects it, so the same
  // gesture was also driving this wrapper's Hover variant — the inspector
  // then measured the hover paint and named the roles of a state the user
  // never asked to see (worst on Toggle, whose hovered track resolves to a
  // tone no role owns, so it dropped out of the list entirely). While
  // inspecting, specimens hold their Default variant.
  const inspecting = useInspectorActive()

  const toggleValues = toggle ? axisValues(c, toggle) : []
  const canToggle = !!toggle && toggleValues.includes('True') && toggleValues.includes('False')
  const [on, setOn] = useState((v[toggle ?? ''] ?? 'True') === 'True')

  if (!render) return null

  // First state in the chain the catalogue actually offers. Focus sits last:
  // it's the weakest signal of the three and only shows when nothing else does.
  const pick = (...want: (string | undefined)[]) =>
    want.find((s): s is string => !!s && states.includes(s))
  const state = inspecting ? undefined : (
    (press ? pick('Pressed', hoverState, 'Hover') : undefined) ??
    (hover ? pick(hoverState, 'Hover') : undefined) ??
    (focus ? pick('Focused') : undefined)
  )

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
  const skeleton = SKELETON_SNIPPETS[def.key]
  if (skeleton) return skeleton(v, icons)
  const low = (s?: string) => (s ?? '').toLowerCase().replace(/\s+/g, '-')
  // ` size="…"` only when the non-default size is selected — keeps snippets lean.
  const sizeProp = v.Size && low(v.Size) !== 'md' ? ` size="${low(v.Size)}"` : ''
  switch (def.key) {
    case 'Toast':
      return `<Toast\n  status="${low(v.Status) || 'success'}"\n  message="Changes saved."\n  action={{ label: 'Undo', onClick: undo }}\n/>`
    case 'Divider':
      return `<Divider orientation="${low(v.Orientation) || 'horizontal'}" />`
    case 'Tooltip':
      return `<Tooltip content="Copy to clipboard" side="top">\n  <IconButton icon={copy} />\n</Tooltip>`
    case 'Tabs':
      return `<Tabs defaultValue="overview" items={[\n  { label: 'Overview', value: 'overview' },\n  { label: 'Tokens', value: 'tokens' },\n]} />`
    case 'Breadcrumb':
      return `<Breadcrumb items={[\n  { label: 'Home', href: '/' },\n  { label: 'Library', href: '/library' },\n  { label: 'Design tokens' },\n]} />`
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
