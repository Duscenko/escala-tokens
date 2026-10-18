// ─── Playground specimens ─────────────────────────────────────────────────────
// One live, token-driven render per catalogue component. Each specimen honors
// the variant axes exactly as the Figma plugin builds them (componentCatalogue
// `axes` — the plugin is the source of truth), so what the designer toggles
// here is what lands in Figma. Colors, radius, and type all resolve from
// PreviewTokens. Type is bound to semantic text roles (`label`, `placeholder`,
// `button`, `heading-*`, `body-*`, …) via `typeStyleOf`, so a Semantics edit
// retunes Docs, Components, and Preview together — inline styles by design
// (see CLAUDE.md conventions).

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import chroma from 'chroma-js'
import type { PreviewTokens } from '../../preview/ButtonPreview'
import { effectiveIconWeight, ICON_ROLES, iconSizesFor } from '../../../lib/iconSizing'

import { COMPONENTS, type ComponentDef } from '../../../lib/componentCatalogue'
import { PHOSPHOR_CORE, PHOSPHOR_CORE_COMPONENT } from '../../../lib/iconLibraries'
import { PHOSPHOR_CORE_BODIES, loadPhosphorWeight, peekPhosphorWeight, phosphorCoreBody, phosphorIconMaskUrl, type PhosphorWeight } from '../../../lib/phosphorIcons'
import {
  SkeletonButtonSpecimen, SkeletonButtonGroupSpecimen,
  SkeletonSocialLoginButtonSpecimen, SkeletonAppStoreBadgeSpecimen,
} from './skeleton/actions'
import {
  SkeletonBadgeSpecimen, SkeletonStatusBadgeSpecimen, SkeletonChipSpecimen, SkeletonProgressSpecimen,
  SkeletonSpinnerSpecimen, SkeletonIconSpecimen, SkeletonRatingSpecimen, SkeletonFileFormatSpecimen, SkeletonAvatarSpecimen,
} from './skeleton/indicators'
import {
  SkeletonTabsSpecimen, SkeletonTabMenuSpecimen, SkeletonSegmentedControlSpecimen, SkeletonBreadcrumbSpecimen,
  SkeletonPaginationSpecimen, SkeletonStepperSpecimen, SkeletonDropdownMenuSpecimen, SkeletonContextMenuSpecimen,
  SkeletonCommandSpecimen, SkeletonNavbarSpecimen, SkeletonSidebarSpecimen,
} from './skeleton/navigation'
import { SKELETON_SNIPPETS } from './skeleton/snippets'
import {
  SkeletonInputSpecimen, SkeletonTextareaSpecimen, SkeletonInputGroupSpecimen, SkeletonInputStepperSpecimen,
  SkeletonInputTagSpecimen, SkeletonSelectSpecimen, SkeletonComboboxSpecimen, SkeletonInputOTPSpecimen,
  SkeletonCheckboxSpecimen, SkeletonCheckboxGroupSpecimen, SkeletonRadioSpecimen, SkeletonRadioGroupSpecimen,
  SkeletonToggleSpecimen, SkeletonSwitchGroupSpecimen, SkeletonSliderSpecimen, SkeletonFileUploadSpecimen,
  SkeletonDropzoneSpecimen, SkeletonFieldSpecimen, SkeletonLabelSpecimen, SkeletonPasswordStrengthSpecimen,
} from './skeleton/forms'
import {
  SkeletonCardSpecimen, SkeletonModalSpecimen, SkeletonDividerSpecimen, SkeletonAccordionSpecimen,
  SkeletonAspectRatioSpecimen, SkeletonPopoverSpecimen, SkeletonTooltipSpecimen, SkeletonInfoTooltipSpecimen,
  SkeletonScrollAreaSpecimen, SkeletonAlertSpecimen, SkeletonSonnerSpecimen,
} from './skeleton/surfaces'
import { useInspectorActive } from '../../preview/artefacts/TokenInspector'

export type AxisValues = Record<string, string>

// ── Shared helpers ────────────────────────────────────────────────────────────

const darken = (c: string, amt: number) => {
  try { return chroma(c).darken(amt).hex() } catch { return c }
}
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
export function buttonLeadingConcept(variant?: string): IconConcept {
  if (variant === 'destructive') return 'error'
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
 * `Card` is one fixed title/body/link — and
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

// ── Registry + snippet builder ────────────────────────────────────────────────

export const SPECIMENS: Record<string, (p: SpecimenProps) => ReactNode> = {
  // Button & Actions
  Button: SkeletonButtonSpecimen,
  ButtonGroup: SkeletonButtonGroupSpecimen,
  SocialLoginButton: SkeletonSocialLoginButtonSpecimen,
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
  Divider: SkeletonDividerSpecimen,
  Accordion: SkeletonAccordionSpecimen,
  AspectRatio: SkeletonAspectRatioSpecimen,
  Modal: SkeletonModalSpecimen,
  Popover: SkeletonPopoverSpecimen,
  Tooltip: SkeletonTooltipSpecimen,
  InfoTooltip: SkeletonInfoTooltipSpecimen,
  ScrollArea: SkeletonScrollAreaSpecimen,
  // Feedback
  Sonner: SkeletonSonnerSpecimen,
  Alert: SkeletonAlertSpecimen,
  // Navigation
  Tabs: SkeletonTabsSpecimen,
  TabMenu: SkeletonTabMenuSpecimen,
  SegmentedControl: SkeletonSegmentedControlSpecimen,
  Breadcrumb: SkeletonBreadcrumbSpecimen,
  Pagination: SkeletonPaginationSpecimen,
  Stepper: SkeletonStepperSpecimen,
  DropdownMenu: SkeletonDropdownMenuSpecimen,
  ContextMenu: SkeletonContextMenuSpecimen,
  Command: SkeletonCommandSpecimen,
  Navbar: SkeletonNavbarSpecimen,
  Sidebar: SkeletonSidebarSpecimen,
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
    default:
      return `<${def.key} />`
  }
}
