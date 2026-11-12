import { fontStack } from '../../../lib/fonts'
import { cloneElement, createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { AVATAR_STACK_HUES, Live, PhosphorWeightProvider, SPECIMENS, TokenIcon, preloadHeavySpecimens, type IconOpts, type SpecimenProps } from '../../configurator/docs/specimens'
import { TokenInspector, INSPECT_EXEMPT_ATTR, inspectGroupAttrs, useInspectorActive } from './TokenInspector'
import { BoardAutoplayContext, TileLiveContext, useAutoplayStep, useBoardConductor, useBoardPaused } from './boardAutoplay'
import { CALENDAR_PLAY, EDITORS_PLAY, EDITOR_PRICE, FOLLOWERS_PLAY, READINESS_PLAY } from './boardScripts'
import { RollingNumber } from './RollingNumber'
import { BoardRevealContext, REVEAL_CAP_MS, SETTLE_MS, boardEnteredOnce, boardRevealTiming, markBoardEntered } from './boardReveal'
import { Skeleton as UiSkeleton } from '../../escala-ui/skeleton'
import { useReducedMotion } from 'framer-motion'
import { SkeletonInlineLinkSpecimen } from '../../configurator/docs/skeleton/actions'
import { SkeletonSettingsList } from '../../configurator/docs/skeleton/forms'
import { RecipeScope } from '../../configurator/docs/skeleton/scope'
import { Card as UiCard } from '../../escala-ui/card'
import {
  cardSurfaceStyle,
  radiusRoleOf,
  shadowOf,
  sizeOf,
  sizeRoleOf,
  spacingRoleOf,
  strokeRoleOf,
  typeStyleOf, spaceOf, iconOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'
import type { ThemeAppearance } from '../../../lib/themeModes'
import { useI18n } from '../../../lib/i18n'
import { extractBreakpoints, resolveGridFrame, type GridViewport } from '../../../lib/layoutTokens'
import { artefactSourceWidth, ScaledDeviceFrame } from './DeviceFrame'
import { readableInk } from '../../../lib/colorUtils'
import { MOTION_EASINGS, resolveMotionRole } from '../../../lib/motion'

export { COLLAGE_TILE_COUNT } from '../../../lib/randomTheme'

/**
 * A catalogue specimen, marked up for Inspector mode.
 *
 * Wrapping here rather than at each of the ~30 call sites below is deliberate:
 * the collage's JSX is the composition, and threading a `component="Input"`
 * prop through every tag would be repeating a name the registry lookup already
 * knows — one that could then disagree with it. `TokenInspector` renders
 * nothing while the mode is off, so this costs nothing in the normal case.
 */
const inspectable = (key: string) => {
  const Specimen = SPECIMENS[key]
  const Wrapped = (p: SpecimenProps) => (
    <TokenInspector component={key} variant={p.v}>{Specimen(p)}</TokenInspector>
  )
  Wrapped.displayName = `Inspectable(${key})`
  return Wrapped
}

const Input = inspectable('Input')
const SocialLogin = inspectable('SocialLoginButton')
const Card = inspectable('Card')
const Avatar = inspectable('Avatar')
const Badge = inspectable('Badge')
const InputOTP = inspectable('InputOTP')
/** An inline link in running copy: shadcn's `Button variant="link"`. */
const InlineLink = ({ t, children }: { t: PreviewTokens; children: ReactNode }) => (
  <TokenInspector component="Button" variant={{ Variant: 'link' }}>
    <SkeletonInlineLinkSpecimen t={t}>{children}</SkeletonInlineLinkSpecimen>
  </TokenInspector>
)
const Segmented = inspectable('SegmentedControl')
const Sonner = inspectable('Sonner')
const TabMenu = inspectable('TabMenu')
const Progress = inspectable('Progress')
const StatusBadge = inspectable('StatusBadge')
const Chip = inspectable('Chip')
const Sidebar = inspectable('Sidebar')
const InputTag = inspectable('InputTag')
const FileUpload = inspectable('FileUpload')
const Stepper = inspectable('Stepper')
const Pagination = inspectable('Pagination')
const Separator = inspectable('Separator')
const Chart = inspectable('Chart')
const Calendar = inspectable('Calendar')
const InputStepper = inspectable('NumberInput')

/** `Live` already carries the catalogue key as `c`, so the marker reads it
 *  straight off the prop rather than being restated. */
function InspectableLive(p: Parameters<typeof Live>[0]) {
  const icons = p.icons ?? ((p.c === 'Button' || p.c === 'Input') ? catalogueIcons(p.t) : undefined)
  return <TokenInspector component={p.c} variant={p.v}><Live {...p} icons={icons} /></TokenInspector>
}

/**
 * Floor for the photograph. Specimens lay out at this width first, then
 * scale down — never re-flow type into the thumbnail. A roomier theme
 * (larger button type, larger surface inset) grows past the floor via
 * `collageFrame`, or a 260px card clips "Continue with Google" and the
 * stats row.
 */
const MODULE_SOURCE = 260
/**
 * Thumbnail column at the floor width. The scale stays this ratio when the
 * source grows, so a wider card is a larger photo, not a smaller type scale.
 * CSS columns cannot do this (unconstrained height fills one stack).
 */
const MODULE_DISPLAY = 156
/** Photograph width of each Theme Preview phone. Two fit in ~540px with a peek. */
const PHONE_DISPLAY = 236
/** Semibold Latin at this size. Generous on purpose — a short estimate clips. */
const LABEL_EM = 0.62

function fontPx(t: PreviewTokens, role: string, fallback: number): number {
  const raw = typeStyleOf(t, role).fontSize
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function labelPx(font: number, text: string): number {
  return Math.ceil(font * LABEL_EM * Math.max(text.length, 1))
}

/**
 * One masonry column, wide enough for the compositions that must stay on
 * one line: the social label, a pair of icon buttons, the OTP cells, the
 * segmented track, the profile stats and the calendar's week. Display keeps
 * the floor scale.
 */
function collageFrame(t: PreviewTokens, copy: {
  social: string
  pair: string
  followers: string
  following: string
}): { source: number; display: number } {
  const pad = px(spacingRoleOf(t, 'inset-surface', '20px'))
  const border = px(strokeRoleOf(t, 'control', '1px'))
  const button = fontPx(t, 'button', 14)
  const heading = fontPx(t, 'heading-sm', 16)
  const helper = fontPx(t, 'helper', 12)
  const body = fontPx(t, 'body-sm', 14)
  const gapC = px(spacingRoleOf(t, 'gap-control', '8px')) || 8
  // SM button: pad 14, icon 14, gap 6 — the specimen's own chrome, not a token.
  const pairCell = 14 * 2 + 14 + 6 + labelPx(button, copy.pair)
  const inner = Math.max(
    MODULE_SOURCE - pad * 2 - border * 2,
    labelPx(button, copy.social) + 16 + 10,
    pairCell * 2 + gapC,
    // The OTP group: six `size.control` slots, `gap-control` apart (its recipe).
    px(sizeRoleOf(t, 'control', '40px')) * 6 + gapC * 5,
    labelPx(button, 'List') + labelPx(button, 'Board') + labelPx(button, 'Timeline') + 20 * 3 + 10,
    labelPx(heading, '12.4K') + 6 + labelPx(helper, copy.followers) + gapC + labelPx(heading, '4') + 6 + labelPx(helper, copy.following),
    // The Calendar IS its tile (its root is a card): seven `size.compact` days
    // and its own `spacing.3` inset on each side must fit the tile's width.
    px(sizeRoleOf(t, 'compact', '32px')) * 7 + px(spaceOf(t, 12)) * 2 - pad * 2,
  )
  const source = Math.ceil(inner + pad * 2 + border * 2)
  const display = Math.max(MODULE_DISPLAY, Math.round(source * (MODULE_DISPLAY / MODULE_SOURCE)))
  return { source, display }
}
/** Columns of the desktop board. The top row's two style cards span two each. */
const BOARD_COLUMNS = 4
/** Floor for a board column — below it the photographs stop being legible. */
const BOARD_MIN_COLUMN = 140

/**
 * COLOR STYLE — the palette at a glance: the accent as a 12-step ramp
 * (same height as before, equal bands like the gradient strip), over the
 * neutral ramp. Read straight off the previewed theme's ramps, so it can't
 * show a colour the system doesn't ship.
 */
function ColorStyleSpecimen({ t }: { t: PreviewTokens }) {
  const brand = t.brandRamp ?? {}
  const neutral = t.neutralRamp ?? {}
  const radius = nestedRadius(t)
  const accent = Array.from({ length: 12 }, (_, i) => brand[i + 1]).filter(Boolean)
  const steps = Array.from({ length: 12 }, (_, i) => neutral[i + 1]).filter(Boolean)
  const accentBands = accent.length > 0 ? accent : [t.brandSolid]
  // `flex-1` below so a stretched card hands its spare height to the blocks, not
  // to the padding — the surface inset has to read the same on all four sides.
  return (
    <div className="flex flex-1 flex-col" style={{ gap: gap(t, 'gap-control', '8px') }}>
      <RampStrip colors={accentBands} className="flex-1" style={{ minHeight: 120, borderRadius: radius }} labelled />
      {steps.length > 0 && <RampStrip colors={steps} style={{ height: 40, borderRadius: radius }} />}
    </div>
  )
}

/**
 * One ramp as a row of bands that answers the pointer: the band under it
 * widens (its siblings give the room back, so the row never changes size),
 * and the tall row writes the step and hex on it in an ink solved against
 * that band. A click copies the hex — only while the inspector is off, since
 * with it on a click means "inspect this card". Reduced motion: no easing.
 */
function RampStrip({ colors, labelled = false, className = '', style }: { colors: string[]; labelled?: boolean; className?: string; style: CSSProperties }) {
  const inspecting = useInspectorActive()
  const [hover, setHover] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const copy = (i: number) => {
    if (inspecting) return
    void navigator.clipboard?.writeText(colors[i]).then(() => {
      setCopied(i)
      window.setTimeout(() => setCopied(c => (c === i ? null : c)), 1200)
    }, () => {})
  }
  return (
    <div className={`flex overflow-hidden ${className}`} style={style} onPointerLeave={() => setHover(null)}>
      {colors.map((c, i) => {
        const open = hover === i
        const ink = readableInk(c)
        return (
          <span
            key={i}
            title={inspecting ? undefined : `Copy ${c}`}
            onPointerEnter={() => setHover(i)}
            onClick={() => copy(i)}
            className={`relative min-w-0 overflow-hidden transition-[flex-grow] duration-300 ease-[var(--ease-out-quint)] motion-reduce:transition-none ${inspecting ? '' : 'cursor-copy'}`}
            style={{ flex: `${open ? (labelled ? 5 : 3) : 1} 1 0`, background: c }}
          >
            {labelled && (
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-3 bottom-3 flex flex-col gap-1 whitespace-nowrap font-mono transition-opacity duration-200 motion-reduce:transition-none ${open ? 'opacity-100 delay-100' : 'opacity-0'}`}
                style={{ color: ink }}
              >
                <span style={{ fontSize: 13, letterSpacing: '0.08em', opacity: 0.7 }}>{i + 1}</span>
                <span style={{ fontSize: 17, fontWeight: 500 }}>{copied === i ? 'Copied' : c.toUpperCase()}</span>
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

/** First three letters of the family name, no spaces — Inter → INT, Roboto → ROB. */
function fontAbbrev(name: string): string {
  return name.replace(/\s+/g, '').slice(0, 3).toUpperCase()
}

/**
 * TYPE STYLE — body face only: abbrev + name, and Regular · Medium · Heavy.
 */
function TypeStyleSpecimen({ t }: { t: PreviewTokens }) {
  const body = t.typography.fontFamily
  const w = t.typography.weights ?? {}
  const ink = t.neutralText
  const muted = t.fgMuted || ink
  const sizes = t.typography.sizes ?? {}
  const floor = sizes['display-md'] || '36px'
  const caption = typeStyleOf(t, 'caption')
  const weights: [string, number][] = [
    ['Regular', w.regular ?? 400],
    ['Medium', w.medium ?? 500],
    ['Heavy', w.bold ?? 700],
  ]
  const abbrevSize = (abbrev: string) =>
    `clamp(${floor}, calc(110cqi / ${Math.max(abbrev.length, 1)}), 24cqi)`

  const faceBlock = (name: string, stack: string) => {
    const abbrev = fontAbbrev(name)
    return (
      <div key={name} className="flex flex-col items-center" style={{ gap: gap(t, 'gap-tight', '4px') }}>
        <span
          style={{
            fontFamily: stack,
            fontWeight: w.bold ?? 700,
            fontSize: abbrevSize(abbrev),
            lineHeight: 0.9,
            letterSpacing: '-0.02em',
            color: ink,
          }}
        >
          {abbrev}
        </span>
        <span style={{ ...caption, fontFamily: stack, color: muted }}>{name}</span>
      </div>
    )
  }

  return (
    <div
      className="grid flex-1 items-stretch"
      style={{ containerType: 'inline-size', gridTemplateColumns: '1fr 1fr', gap: gap(t, 'gap-group', '16px'), minHeight: 200 }}
    >
      <div className="flex flex-col items-center justify-center text-center">
        {faceBlock(body, fontStack(body))}
      </div>
      {/* Weights on a flat wash — no shadow; the module surface already carries elevation. */}
      <div
        className="flex min-w-0 flex-col items-center justify-center overflow-hidden text-center"
        style={{
          // A wash of the page ink, not `neutralFill`: that one is the card's
          // own surface in dark, so the well vanished into the module.
          background: `color-mix(in srgb, ${ink} 7%, transparent)`,
          borderRadius: nestedRadius(t),
          padding: gap(t, 'gap-control', '8px'),
        }}
      >
        <span className="flex max-w-full flex-col">
          {weights.map(([label, weight]) => (
            <span
              key={label}
              style={{
                fontFamily: fontStack(body),
                fontWeight: weight,
                fontSize: 'clamp(14px, 7cqi, 32px)',
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                color: ink,
              }}
            >
              {label}
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}

/** Inner corner for a block flush inside a module surface. */
function nestedRadius(t: PreviewTokens): string {
  const outer = parseFloat(radiusRoleOf(t, 'container', '16px')) || 0
  const inset = parseFloat(spacingRoleOf(t, 'inset-surface', '20px')) || 0
  const action = parseFloat(radiusRoleOf(t, 'action', '8px')) || 0
  return `${Math.max(0, Math.min(action, outer - inset / 2))}px`
}

/** Sub-row unit for the masonry `grid-row: span` trick. */
const MASONRY_ROW = 4

const gap = (t: PreviewTokens, role: string, fb: string) => spacingRoleOf(t, role, fb)

const CollageFrameContext = createContext({ source: MODULE_SOURCE, display: MODULE_DISPLAY })

/** Same icon library + slot contract as Theme Preview · Components. */
function catalogueIcons(t: PreviewTokens, leadingConcept?: IconOpts['leadingConcept']): IconOpts {
  return { prefix: t.iconPrefix ?? 'phosphor', leading: true, trailing: false, leadingConcept }
}

function px(value: string): number {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Every tile IS the catalogue's Card (`escala-ui/card`): fill, stroke, radius
 * and inset come from the Card recipe, so the board cannot paint a surface the
 * Card component doesn't. Only layout is set here — the tile's own gap and
 * direction — plus a translucent panel, which the recipe has no word for.
 */

/**
 * A primary action as the board plays it: rest, Loading, done, rest. Still
 * (and inspectable as a plain Button) whenever the board is not playing.
 */
function PlayedButton({ t, v, icons, done, period, children }: {
  t: PreviewTokens
  v: SpecimenProps['v']
  icons?: IconOpts
  /** The label once the work is done ("Saved"). */
  done: string
  /** Milliseconds per step — tiles differ so they do not load in unison. */
  period: number
  children: string
}) {
  const beat = useAutoplayStep(BUTTON_PLAY.length, period)
  const phase = beat == null ? 'rest' : BUTTON_PLAY[beat]
  return (
    <InspectableLive
      c="Button"
      t={t}
      v={phase === 'loading' ? { ...v, State: 'Loading' } : v}
      icons={phase === 'done' ? { ...catalogueIcons(t, 'check'), leading: true } : icons}
      w="100%"
    >
      {phase === 'done' ? done : children}
    </InspectableLive>
  )
}

const BUTTON_PLAY = ['rest', 'rest', 'rest', 'rest', 'loading', 'loading', 'done', 'done'] as const

/** A step of one of `boardScripts`' value lists, or `still` when the board is
 *  still (the value the tile has always shown). */
function useScripted<T>(script: { ms: number; values: readonly T[] }, still: T): T {
  const step = useAutoplayStep(script.values.length, script.ms)
  return step == null ? still : script.values[step]
}

/** Plays an element in on the brand's `use-stagger-in` (one child of a
 *  staggered reveal) whenever `key` changes while the board plays. */
function useEnterOnChange(ref: { current: HTMLElement | null }, t: PreviewTokens, key: unknown, playing: boolean) {
  useEffect(() => {
    const el = ref.current
    if (!playing || !el || !t.motion) return
    const role = resolveMotionRole('use-stagger-in', t.motion)
    el.animate(
      [{ opacity: 0, transform: `translateY(${t.motion.transforms.enter}px)` }, { opacity: 1, transform: 'none' }],
      { duration: role.ms, easing: MOTION_EASINGS[role.easing] },
    )
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** The Chart tile's figure and its trend badge, climbing together. */
function ReadinessFigure({ t, muted }: { t: PreviewTokens; muted: string }) {
  const value = useScripted(READINESS_PLAY, 98)
  return (
    <>
      <div className="flex min-w-0 flex-col">
        <span style={{ ...typeStyleOf(t, 'heading-lg'), color: t.neutralText }}>
          <RollingNumber value={String(value)} />
          <span style={{ ...typeStyleOf(t, 'body-sm'), color: muted }}>%</span>
        </span>
        <ReadinessLabel t={t} muted={muted} />
      </div>
      <Badge t={t} v={{ Variant: 'secondary' }}><RollingNumber value={`+${value - 92}%`} /></Badge>
    </>
  )
}

function ReadinessLabel({ t, muted }: { t: PreviewTokens; muted: string }) {
  const { t: translate } = useI18n()
  return <span style={{ ...typeStyleOf(t, 'body-sm'), color: muted }}>{translate('Workspace readiness')}</span>
}

function FollowersCount({ t }: { t: PreviewTokens }) {
  return <span style={{ ...typeStyleOf(t, 'heading-sm'), color: t.neutralText }}><RollingNumber value={useScripted(FOLLOWERS_PLAY, '12.4K')} /></span>
}

/** The Editors tile's total: the stepper's count × the seat price. */
function EditorsTotal() {
  return <RollingNumber value={`$${useScripted(EDITORS_PLAY, 12) * EDITOR_PRICE}`} />
}

const SEATS = 20

/** The stepper's count as a figure, against the seats the plan holds. */
function SeatCount({ t, muted }: { t: PreviewTokens; muted: string }) {
  const { t: translate } = useI18n()
  return (
    <span style={{ ...typeStyleOf(t, 'heading-lg'), color: t.neutralText }}>
      <RollingNumber value={String(useScripted(EDITORS_PLAY, 12))} />
      <span style={{ ...typeStyleOf(t, 'body-sm'), color: muted }}> / {SEATS} {translate('seats')}</span>
    </span>
  )
}

/** One cell per seat: taken ones in the brand's action fill, free ones in the
 *  secondary fill — a step off the card, where `neutralFill` (the card's own
 *  layer) would vanish. Cells change on the brand's `use-color`. */
function SeatGrid({ t }: { t: PreviewTokens }) {
  const count = useScripted(EDITORS_PLAY, 12)
  const free = t.archTokens?.['action.secondary.default'] ?? t.neutralFill
  return (
    <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${SEATS / 2}, minmax(0, 1fr))`, gap: gap(t, 'gap-tight', '4px') }}>
      {Array.from({ length: SEATS }, (_, i) => (
        <span
          key={i}
          style={{
            aspectRatio: '1',
            borderRadius: radiusRoleOf(t, 'control', '4px'),
            background: i < count ? t.brandSolid : free,
            transition: 'background-color var(--motion-use-color, 200ms ease)',
          }}
        />
      ))}
    </div>
  )
}

/** The event under the calendar, following the day the calendar selects. */
function CalendarEvent({ t, muted }: { t: PreviewTokens; muted: string }) {
  const { t: translate } = useI18n()
  const step = useAutoplayStep(CALENDAR_PLAY.days.length, CALENDAR_PLAY.ms)
  const day = CALENDAR_PLAY.days[step ?? 0]
  const ref = useRef<HTMLSpanElement>(null)
  useEnterOnChange(ref, t, day.day, step != null)
  return (
    <span className="flex items-center" style={{ gap: gap(t, 'gap-tight', '4px'), marginTop: spaceOf(t, 12), ...typeStyleOf(t, 'helper'), color: muted }}>
      <TokenIcon t={t} concept="calendar" size={iconOf(12)} color={t.brandText} />
      <span ref={ref}>{translate(day.event)} · {day.time}</span>
    </span>
  )
}

function ModuleSurface({ t, children, style }: { t: PreviewTokens; children: ReactNode; style?: CSSProperties }) {
  return (
    <RecipeScope t={t}>
      <UiCard
        style={{
          ...(t.panelBackground === 'translucent' ? cardSurfaceStyle(t) : null),
          // Elevation lives on `ScaledModule`'s OUTER frame — an inner
          // box-shadow is clipped by the photograph and shrunk by scale().
          boxShadow: 'none',
          gap: gap(t, 'gap-control', '8px'),
          ...style,
        }}
      >
        {children}
      </UiCard>
    </RecipeScope>
  )
}

/**
 * Photograph a mobile-width module down to `MODULE_DISPLAY`. Same contract as
 * `ScaledArtefactCard`: layout at true size first, then `transform: scale()`.
 * The inner is taken out of flow so its 260px min-content cannot inflate the
 * masonry column. Pointer events stay on the specimens so `Live` still drives
 * Hover/Pressed.
 *
 * Elevation is painted on THIS frame (display size), never on the scaled
 * inner — `overflow: hidden` + `scale()` made Strong look like None.
 */
function ScaledModule({
  t, appearance = 'light', children, chrome = true, clip = true, elev, style, sourceWidth = MODULE_SOURCE, frameWidth = MODULE_DISPLAY, fill = false, inspect = true, band = 0,
}: {
  /** Diagonal position in the board's entrance wave (see `boardReveal`). */
  band?: number
  t: PreviewTokens
  appearance?: ThemeAppearance
  children: ReactNode
  chrome?: boolean
  /** When false the photograph can spill past the frame. */
  clip?: boolean
  /** Shadow ramp step on the unscaled frame. Defaults to `sm` when chrome. */
  elev?: string | false
  style?: CSSProperties
  sourceWidth?: number
  /** Painted column. Grows with `sourceWidth` so the scale stays put. */
  frameWidth?: number
  /** Stretch to whatever height the bento column hands it, content centred.
   *  The last tile of each board column takes it, so every column ends on
   *  the same line. Chrome modules only — the surface is what stretches. */
  fill?: boolean
  /** Style overviews (the palette strip, the type specimen) are not components.
   *  Inspector mode leaves them alone: no crosshair, no badge, no pin. */
  inspect?: boolean
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null)
  // A module IS the container Inspector mode groups by — the cluster of
  // controls that read a set of roles together. The frame is already a real
  // box, so this is an attribute and not a wrapper (see `inspectGroupAttrs`),
  // and the badge derives its name and its members from what's inside rather
  // than from a label passed down here.
  const inspecting = useInspectorActive()
  const frame = useContext(CollageFrameContext)
  const resolvedSource = sourceWidth === MODULE_SOURCE ? frame.source : sourceWidth
  const resolvedFrame = frameWidth === MODULE_DISPLAY ? frame.display : frameWidth
  const scale = resolvedFrame / resolvedSource
  const frameRadius = (parseFloat(radiusRoleOf(t, 'container', '16px')) || 0) * scale
  const displayHeight = naturalHeight != null ? Math.ceil(naturalHeight * scale) : 0
  const stretches = fill && chrome
  const outerRef = useRef<HTMLDivElement>(null)
  const [stretchHeight, setStretchHeight] = useState<number | null>(null)
  const gutter = px(gap(t, 'gap-control', '8px')) || 8
  const span = Math.max(1, Math.ceil((displayHeight + gutter) / (MASONRY_ROW + gutter)))
  const elevation = elev === false ? undefined : elev ?? (chrome ? 'sm' : undefined)
  const frameShadow = elevation
    ? shadowOf(t, elevation, '0 1px 2px rgba(10,13,18,0.05)')
    : undefined

  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const SETTLE = 0.5
    const contentHeight = (node: HTMLElement) =>
      Math.max(node.offsetHeight, node.scrollHeight, node.getBoundingClientRect().height)

    const measureNatural = (surface: HTMLElement | null) => {
      if (surface) {
        const kept = surface.style.minHeight
        surface.style.minHeight = '0px'
        const natural = contentHeight(surface)
        surface.style.minHeight = kept
        if (natural > 0) {
          setNaturalHeight((prev) => (prev !== null && Math.abs(prev - natural) < SETTLE ? prev : natural))
        }
        return
      }
      const natural = contentHeight(el)
      if (natural > 0) {
        setNaturalHeight((prev) => (prev !== null && Math.abs(prev - natural) < SETTLE ? prev : natural))
      }
    }

    if (!stretches) {
      const measure = () => measureNatural(null)
      measure()
      const raf = requestAnimationFrame(measure)
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      for (const child of Array.from(el.children)) {
        ro.observe(child)
        if (child instanceof HTMLElement) {
          for (const grand of Array.from(child.children)) ro.observe(grand)
        }
      }
      return () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
      }
    }
    // A stretched surface is taller than its content, so its rendered height is
    // NOT its natural height. The natural height is measured by taking the
    // stretch away for a moment: clear the surface's min-height, read its real
    // height, put the min-height back — all inside one task, so nothing paints
    // in between. The earlier version summed the children's bounding boxes
    // instead, and any child that fills the space it is given (a `flex: 1` row,
    // a full-height specimen) made the "natural" height depend on the stretch
    // that was itself derived from it. That fed back on itself: one tile flipped
    // between two heights every frame, for as long as the board was on screen.
    // The Card itself — `RecipeScope` around it is `display: contents` and has no height.
    const surface = (el.querySelector(':scope > * > [data-slot="card"]') ?? el.firstElementChild) as HTMLElement | null
    const measure = () => {
      const outer = outerRef.current
      if (outer) {
        const h = outer.getBoundingClientRect().height
        setStretchHeight((prev) => (prev !== null && Math.abs(prev - h) < SETTLE ? prev : h))
      }
      measureNatural(surface)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (outerRef.current) ro.observe(outerRef.current)
    if (surface) for (const child of Array.from(surface.children)) ro.observe(child)
    measure()
    return () => ro.disconnect()
  }, [stretches, resolvedSource, resolvedFrame, scale])

  // Entrance: a skeleton until the height holds still and this band's turn in
  // the wave comes up, then the content crosses over it (see `boardReveal`).
  const reveal = useContext(BoardRevealContext)
  const [shown, setShown] = useState(() => !reveal)
  const [skeleton, setSkeleton] = useState(() => Boolean(reveal))
  useEffect(() => {
    if (shown || !reveal || reveal.held || naturalHeight == null) return
    const id = window.setTimeout(() => setShown(true), Math.max(0, reveal.start + band * reveal.step - performance.now()))
    return () => window.clearTimeout(id)
  }, [shown, reveal, naturalHeight, band])
  useEffect(() => {
    if (!shown || !skeleton) return
    const id = window.setTimeout(() => setSkeleton(false), (reveal?.ms ?? 0) + 60)
    return () => window.clearTimeout(id)
  }, [shown, skeleton, reveal])
  const crossing = reveal && skeleton ? `${reveal.ms}ms ${reveal.easing}` : null
  const contentStyle: CSSProperties | undefined = crossing && reveal ? {
    opacity: shown ? 1 : 0,
    transform: shown || !reveal.enter ? undefined : `translateY(${reveal.enter}px)`,
    transition: `opacity ${crossing}, transform ${crossing}`,
  } : undefined
  const skeletonHeight = stretches && stretchHeight ? stretchHeight / scale : naturalHeight

  // A tile's scripts hold while it is off screen (no work nobody sees) and
  // while the pointer is on it (the person is using it).
  const [onScreen, setOnScreen] = useState(true)
  const [pointerIn, setPointerIn] = useState(false)
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting ?? true))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const live = onScreen && !pointerIn

  const surfaceStyle: CSSProperties | undefined = stretches
    ? { ...style, justifyContent: 'center', minHeight: stretchHeight ? stretchHeight / scale : undefined }
    : style
  const body = (
    <TileLiveContext.Provider value={live}>
      {chrome ? <ModuleSurface t={t} style={surfaceStyle}>{children}</ModuleSurface> : children}
    </TileLiveContext.Provider>
  )
  const appearanceClass = appearance === 'dark' ? 'dark' : 'light'

  return (
    <div
      ref={outerRef}
      className={`relative overflow-visible ${appearanceClass}`}
      data-collage-appearance={appearance}
      onPointerEnter={() => setPointerIn(true)}
      onPointerLeave={() => setPointerIn(false)}
      {...(inspect ? inspectGroupAttrs(inspecting) : { [INSPECT_EXEMPT_ATTR]: '' })}
      style={{
        width: resolvedFrame,
        cursor: !inspect && inspecting ? 'default' : undefined,
        minWidth: resolvedFrame,
        maxWidth: resolvedFrame,
        height: stretches ? undefined : displayHeight || undefined,
        minHeight: stretches ? displayHeight || undefined : undefined,
        flex: stretches ? '1 0 auto' : undefined,
        gridRowEnd: `span ${span}`,
        opacity: naturalHeight != null ? 1 : 0,
        borderRadius: chrome || frameShadow ? frameRadius : undefined,
        boxShadow: frameShadow,
        // Floating menus sit above neighbours; elevated chrome does too so a
        // Strong shadow isn't buried under the next tile.
        zIndex: !clip || frameShadow ? 1 : undefined,
      }}
    >
      {skeleton && crossing && skeletonHeight != null && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0"
          style={{
            width: resolvedSource,
            height: skeletonHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            opacity: shown ? 0 : 1,
            transition: `opacity ${crossing}`,
          }}
        >
          <TileSkeleton t={t} height={skeletonHeight} />
        </div>
      )}
      {/* Always this wrapper, entering or not: swapping the tree would remount
          the specimens and lose their state. */}
      <div className="absolute inset-0" style={contentStyle}>
        <div
          ref={innerRef}
          className={clip ? 'absolute left-0 top-0 overflow-hidden' : 'absolute left-0 top-0'}
          style={{
            width: resolvedSource,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            borderRadius: chrome && clip ? radiusRoleOf(t, 'container', '16px') : undefined,
          }}
        >
          {body}
        </div>
      </div>
    </div>
  )
}

const SKELETON_WIDTHS = ['42%', '88%', '70%', '94%', '58%', '80%']

/** A tile before its content: the tile's own Card with bars of the catalogue's
 *  Skeleton, as many as its height holds. */
function TileSkeleton({ t, height }: { t: PreviewTokens; height: number }) {
  const inset = px(spacingRoleOf(t, 'inset-surface', '20px')) || 20
  const line = 14
  const gapPx = 12
  const lines = Math.max(1, Math.min(SKELETON_WIDTHS.length, Math.floor((height - inset * 2 + gapPx) / (line + gapPx))))
  return (
    <ModuleSurface t={t} style={{ height: '100%', gap: gapPx }}>
      {SKELETON_WIDTHS.slice(0, lines).map((width, i) => (
        <UiSkeleton
          key={i}
          className="flex-shrink-0 motion-reduce:animate-none"
          style={{ width, height: i === 0 ? line + 4 : line }}
        />
      ))}
    </ModuleSurface>
  )
}

function Well({
  t, size, icon, iconSize, pill = false,
}: {
  t: PreviewTokens
  size: string
  icon: 'user' | 'users' | 'zap' | 'box'
  /** Override glyph px. Default ~58% of the well — fills the chip without
   *  growing the container (14–16 in a 32–40 well read as lost). */
  iconSize?: number
  pill?: boolean
}) {
  const wellPx = parseFloat(size) || 32
  const glyph = iconSize ?? Math.round(wellPx * 0.58)
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        borderRadius: pill ? 999 : radiusRoleOf(t, 'control', '8px'),
        background: t.neutralFill,
      }}
    >
      <TokenIcon t={t} concept={icon} size={glyph} color={t.neutralText} />
    </span>
  )
}

function CollagePack({
  phones, t, gap, children,
}: {
  phones: boolean
  t: PreviewTokens
  gap: string
  children: ReactNode
}) {
  if (!phones) return <>{children}</>
  return (
    <div className="snap-center flex-shrink-0">
      <ScaledDeviceFrame t={t} targetWidth={PHONE_DISPLAY}>
        <div className="flex w-full flex-col items-stretch" style={{ gap }}>{children}</div>
      </ScaledDeviceFrame>
    </div>
  )
}

/**
 * Packed wall of catalogue modules — the Theme Preview impression of the
 * system as a set. Theme Preview ships the phone carousel only; the masonry
 * board layout remains for tests or a future entry point.
 */
export function SystemCollage({
  tokensByAppearance, tileAppearances, projectName, layout = 'phones', frameTokens,
}: {
  tokensByAppearance: Record<ThemeAppearance, PreviewTokens>
  tileAppearances: ThemeAppearance[]
  projectName: string
  layout?: 'board' | 'phones'
  frameTokens?: PreviewTokens
}) {
  const { t: translate } = useI18n()
  // Inspecting wants a still board; with the inspector off the board plays
  // itself, so the brand's motion is seen (see `boardAutoplay`).
  const inspecting = useInspectorActive()
  const reduceMotion = useReducedMotion() ?? false
  // The entrance (see `boardReveal`): one wave per page load, a short fade on
  // a return. Autoplay waits for it, or tiles would change under their skeletons.
  const [mountedAt] = useState(() => performance.now())
  const [quickEntry] = useState(boardEnteredOnce)
  const [heavyReady, setHeavyReady] = useState(false)
  useEffect(() => {
    let live = true
    const done = () => { if (live) setHeavyReady(true) }
    preloadHeavySpecimens().then(done, done)
    return () => { live = false }
  }, [])
  const [waveDone, setWaveDone] = useState(false)
  const paused = useBoardPaused()
  const playing = !inspecting && !reduceMotion && waveDone && !paused
  const stageRef = useRef<HTMLDivElement>(null)
  useBoardConductor(stageRef, playing)
  const tile = (index: number) => tokensByAppearance[tileAppearances[index] === 'dark' ? 'dark' : 'light']
  const appearanceAt = (index: number) => tileAppearances[index] ?? 'light'
  const muted = (index: number) => tile(index).fgMuted || '#717680'
  const handle = `@${projectName.replace(/\s+/g, '_').toLowerCase()}`
  const gutter = gap(tile(2), 'gap-control', '8px')
  const wellSm = sizeRoleOf(tile(2), 'compact', '32px')
  const frame = collageFrame(tokensByAppearance.light, {
    social: translate('Continue with Google'),
    pair: [translate('Critical'), translate('Success')].sort((a, b) => b.length - a.length)[0] ?? 'Critical',
    followers: translate('Followers'),
    following: translate('Following'),
  })
  const phones = layout === 'phones'
  const board = frameTokens ?? tokensByAppearance.light
  const collageCut: GridViewport = board.previewViewport ?? 'desktop'
  const liveGrid = resolveGridFrame(collageCut, board.gridFrame, board.spacing, extractBreakpoints(board.grid))
  const marginPx = parseFloat(liveGrid.margin) || 16
  const sourceW = artefactSourceWidth({ ...board, previewViewport: collageCut })
  const phoneInner = Math.max(160, sourceW - marginPx * 2)
  // The board is a squared bento of BOARD_COLUMNS columns that fills the
  // canvas width: the photo scale follows the measured width (never above
  // true size), instead of a fixed 156px column that left a ragged edge.
  const gutterPx = px(gutter) || 8
  const boardRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState(0)
  useLayoutEffect(() => {
    if (phones) return
    const el = boardRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setBoardWidth(entries[0]?.contentRect.width ?? 0))
    ro.observe(el)
    return () => ro.disconnect()
  }, [phones])
  const boardDisplay = boardWidth
    ? Math.min(frame.source, Math.max(BOARD_MIN_COLUMN, Math.floor((boardWidth - (BOARD_COLUMNS - 1) * gutterPx) / BOARD_COLUMNS)))
    : frame.display
  const display = phones ? phoneInner : boardDisplay
  // A two-column photo: same scale as its neighbours, so its type matches.
  const wideFrame = display * 2 + gutterPx
  const widePhoto = { frameWidth: wideFrame, sourceWidth: Math.round(wideFrame * (frame.source / display)) }
  const pack = { phones, t: board, gap: gutter }
  const platformCaption =
    collageCut === 'mobile' ? translate('Mobile')
    : collageCut === 'tablet' ? translate('Tablet')
    : translate('Desktop')

  // Every module is built ONCE and then placed by the active layout: the
  // phone carousel groups them into screens, the desktop board into a
  // squared bento (see `board` below).
  const mod = {
    verify: (
        <ScaledModule key="verify" t={tile(2)} appearance={appearanceAt(2)}>
          <span style={{ ...typeStyleOf(tile(2), 'heading-sm'), color: tile(2).neutralText }}>{translate('Verify account')}</span>
          <InputOTP t={tile(2)} v={{ State: 'Filled' }} />
          <span style={{ ...typeStyleOf(tile(2), 'body-sm'), color: muted(2) }}>
            {translate('Didn’t get a code?')}{' '}
            <InlineLink t={tile(2)}>{translate('Resend')}</InlineLink>
          </span>
        </ScaledModule>
    ),
    buttons: (
        <ScaledModule key="buttons"
          t={tile(3)}
          appearance={appearanceAt(3)}
          style={{ gap: gap(tile(3), 'gap-group', '16px') }}
        >
          <div className="flex w-full min-w-0 flex-col" style={{ gap: gap(tile(3), 'gap-control', '8px') }}>
            {(['default', 'secondary', 'outline', 'ghost'] as const).map((variant) => (
              <InspectableLive
                key={variant}
                c="Button"
                t={tile(3)}
                v={{ Variant: variant, Size: 'sm' }}
                w="100%"
              >
                {translate('Click me')}
              </InspectableLive>
            ))}
          </div>
          <Separator t={tile(3)} v={{}} w="100%" />
          <div
            className="grid w-full min-w-0"
            style={{
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: gap(tile(3), 'gap-control', '8px'),
            }}
          >
            <InspectableLive
              c="Button"
              t={tile(3)}
              v={{ Variant: 'destructive', Size: 'sm' }}
              icons={{ ...catalogueIcons(tile(3)), leading: false }}
              w="100%"
            >
              {translate('Delete')}
            </InspectableLive>
            <InspectableLive
              c="Button"
              t={tile(3)}
              v={{ Variant: 'link', Size: 'sm' }}
              icons={{ ...catalogueIcons(tile(3)), leading: false }}
              w="100%"
            >
              {translate('Learn more')}
            </InspectableLive>
          </div>
        </ScaledModule>
    ),
    badges: (
        <ScaledModule key="badges"
          t={tile(4)}
          appearance={appearanceAt(4)}
          style={{ gap: gap(tile(4), 'gap-group', '16px') }}
        >
          <div
            className="grid w-full min-w-0 grid-cols-2 justify-items-center"
            style={{ gap: gap(tile(4), 'gap-control', '8px') }}
          >
            <Badge t={tile(4)} v={{ Variant: 'default', Appearance: 'solid' }}>{translate('Published')}</Badge>
            <Badge t={tile(4)} v={{ Variant: 'secondary' }}>{translate('Draft')}</Badge>
            <Badge t={tile(4)} v={{ Variant: 'critical' }}>{translate('Critical')}</Badge>
            <Badge t={tile(4)} v={{ Variant: 'secondary', Appearance: 'outline' }}>{translate('Info')}</Badge>
          </div>
          <Separator t={tile(4)} v={{}} w="100%" />
          <div className="flex flex-wrap items-center" style={{ gap: gap(tile(4), 'gap-control', '8px') }}>
            <StatusBadge t={tile(4)} v={{ Status: 'online' }} />
            <StatusBadge t={tile(4)} v={{ Status: 'busy' }} />
            <Chip t={tile(4)} v={{ Interactive: 'True', State: 'Selected' }}>Design tokens</Chip>
          </div>
        </ScaledModule>
    ),
    createAccount: (
        <ScaledModule key="createAccount"
          t={tile(5)}
          appearance={appearanceAt(5)}
          style={{ gap: gap(tile(5), 'gap-group', '16px') }}
        >
          <div className="flex justify-end" style={{ marginTop: -2 }}>
            <InspectableLive c="Button" t={tile(5)} v={{ Variant: 'ghost', Size: 'icon-sm' }} icons={catalogueIcons(tile(5), 'close')}>{translate('Close')}</InspectableLive>
          </div>
          <div
            className="flex flex-col items-center text-center"
            style={{ gap: gap(tile(5), 'gap-control', '8px'), paddingBottom: spaceOf(tile(5), 2) }}
          >
            <Avatar t={tile(5)} v={{ Size: 'default', Fill: 'Gradient' }} />
            <p style={{ margin: 0, ...typeStyleOf(tile(5), 'heading-sm'), color: tile(5).neutralText }}>
              {translate('Create an account')}
            </p>
            <p
              style={{
                margin: 0,
                maxWidth: '92%',
                ...typeStyleOf(tile(5), 'body-sm', { leading: true }),
                color: muted(5),
              }}
            >
              {translate('Sign in to continue to your workspace.')}
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col" style={{ gap: gap(tile(5), 'gap-group', '12px') }}>
            <Input t={tile(5)} v={{ Type: 'E-Mail', State: 'Filled' }} w="100%" hideHint />
            <Input t={tile(5)} v={{ Type: 'Password', State: 'Filled' }} w="100%" hideHint />
          </div>
          <PlayedButton t={tile(5)} v={{ Variant: 'default', Size: 'default' }} icons={catalogueIcons(tile(5), 'star')} done={translate('Welcome')} period={780}>
            {translate('Get Started')}
          </PlayedButton>
          <div className="flex items-center" style={{ gap: gap(tile(5), 'gap-control', '8px') }}>
            <span className="flex min-w-0 flex-1"><Separator t={tile(5)} v={{}} w="100%" /></span>
            <span style={{ ...typeStyleOf(tile(5), 'caption'), color: muted(5) }}>{translate('or')}</span>
            <span className="flex min-w-0 flex-1"><Separator t={tile(5)} v={{}} w="100%" /></span>
          </div>
          <div className="flex w-full min-w-0 flex-col" style={{ gap: gap(tile(5), 'gap-control', '8px') }}>
            <SocialLogin t={tile(5)} v={{ Provider: 'google' }} w="100%" />
            <SocialLogin t={tile(5)} v={{ Provider: 'apple' }} w="100%" />
          </div>
        </ScaledModule>
    ),
    profile: (
        <ScaledModule key="profile" t={tile(8)} appearance={appearanceAt(8)}>
          <div className="flex items-start" style={{ gap: gap(tile(8), 'gap-control', '8px') }}>
            <Avatar t={tile(8)} v={{ Size: 'sm', Fill: 'Gradient' }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center" style={{ gap: gap(tile(8), 'gap-tight', '4px') }}>
                <span style={{ ...typeStyleOf(tile(8), 'label'), color: tile(8).neutralText }}>{projectName}</span>
                <TokenIcon t={tile(8)} concept="check" size={12} color={tile(8).brandSolid} />
              </div>
              <p style={{ margin: 0, ...typeStyleOf(tile(8), 'helper'), color: muted(8) }}>{handle}</p>
            </div>
          </div>
          <p style={{ margin: 0, ...typeStyleOf(tile(8), 'body-sm', { leading: true }), color: tile(8).neutralText }}>
            {translate('One payload underneath: the same JSON Figma, CSS, and an agent all read.')}
          </p>
          <div className="flex min-w-0 flex-wrap" style={{ gap: gap(tile(8), 'gap-group', '16px') }}>
            <div>
              <span style={{ ...typeStyleOf(tile(8), 'heading-sm'), color: tile(8).neutralText }}>4</span>
              <span style={{ marginLeft: spaceOf(tile(8), 6), ...typeStyleOf(tile(8), 'helper'), color: muted(8) }}>{translate('Following')}</span>
            </div>
            <div>
              <FollowersCount t={tile(8)} />
              <span style={{ marginLeft: spaceOf(tile(8), 6), ...typeStyleOf(tile(8), 'helper'), color: muted(8) }}>{translate('Followers')}</span>
            </div>
          </div>
        </ScaledModule>
    ),
    // Settings as a person meets them: switches in rows, each with its label.
    // A lone switch read as a widget, not a screen.
    notifications: (
        <ScaledModule key="notifications" t={tile(13)} appearance={appearanceAt(13)}>
          <TokenInspector component="Switch" variant={{ Checked: 'true' }}>
            <SkeletonSettingsList
              t={tile(13)}
              control="switch"
              legend={translate('Notifications')}
              rows={[
                { label: translate('Push notifications'), on: true },
                { label: translate('Weekly digest'), on: false },
                { label: translate('Mentions only'), on: true },
              ]}
            />
          </TokenInspector>
        </ScaledModule>
    ),
    // A count the person sets, seen as well as read: the stepper, the figure,
    // the seats it fills, and what it costs.
    seats: (
        <ScaledModule key="seats" t={tile(12)} appearance={appearanceAt(12)} style={{ gap: gap(tile(12), 'gap-group', '16px') }}>
          <div className="flex items-start justify-between" style={{ gap: gap(tile(12), 'gap-control', '8px') }}>
            <div className="flex min-w-0 flex-col">
              <span style={{ ...typeStyleOf(tile(12), 'label'), color: tile(12).neutralText }}>{translate('Editors')}</span>
              <span style={{ ...typeStyleOf(tile(12), 'helper'), color: muted(12) }}>{translate('Who can publish tokens')}</span>
            </div>
            <InputStepper t={tile(12)} v={{}} />
          </div>
          <SeatCount t={tile(12)} muted={muted(12)} />
          <SeatGrid t={tile(12)} />
          <Separator t={tile(12)} v={{}} w="100%" />
          <div className="flex items-baseline justify-between" style={{ gap: gap(tile(12), 'gap-control', '8px') }}>
            <span style={{ ...typeStyleOf(tile(12), 'body-sm'), color: muted(12) }}>{translate('Total')}</span>
            <span style={{ ...typeStyleOf(tile(12), 'heading-sm'), color: tile(12).neutralText, fontVariantNumeric: 'tabular-nums' }}>
              <EditorsTotal /><span style={{ ...typeStyleOf(tile(12), 'helper'), color: muted(12) }}> / {translate('per month')}</span>
            </span>
          </div>
        </ScaledModule>
    ),
    toasts: (
        <ScaledModule key="toasts"
          t={tile(15)}
          appearance={appearanceAt(15)}
          style={{ gap: gap(tile(15), 'gap-group', '16px') }}
        >
          <Sonner t={tile(15)} v={{ Type: 'success' }} w="100%" />
          <Sonner t={tile(15)} v={{ Type: 'error' }} w="100%" />
        </ScaledModule>
    ),
    tabsProgress: (
        <ScaledModule key="tabsProgress"
          t={tile(16)}
          appearance={appearanceAt(16)}
          style={{ gap: gap(tile(16), 'gap-group', '16px') }}
        >
          <Segmented t={tile(16)} v={{ Size: 'sm' }} />
          <TabMenu t={tile(16)} v={{}} w="100%" />
          <Progress t={tile(16)} v={{}} w="100%" />
        </ScaledModule>
    ),
    // The Calendar's root is a card, so it IS the tile (no Card around it);
    // the selected day's event sits under the month (the Calendar's children).
    calendar: (
        <ScaledModule key="calendar" t={tile(9)} appearance={appearanceAt(9)} chrome={false} elev="sm">
          {/* The file's Calendar is seven cells wide: the sm one is the tile. */}
          <div className="flex w-full justify-center">
          <Calendar t={tile(9)} v={{ Size: 'sm', Mode: 'single' }}>
            <CalendarEvent t={tile(9)} muted={muted(9)} />
          </Calendar>
          </div>
        </ScaledModule>
    ),
    sidebar: (
        <ScaledModule key="sidebar" t={tile(18)} appearance={appearanceAt(18)}>
          {/* The tile's card is the panel — same border as every other tile —
              so the sidebar is shadcn's `inset` variant, with no stroke of its
              own. `floating` drew a second, stronger `border.default` frame.
              Its opaque layer-1 fill is dropped too, or a translucent card
              shows it as a square patch. */}
          <div className="[&_[data-slot=sidebar]]:!bg-transparent">
            <Sidebar t={tile(18)} v={{ Variant: 'inset' }} w="100%" />
          </div>
        </ScaledModule>
    ),
    inputTag: (
        <ScaledModule key="inputTag" t={tile(19)} appearance={appearanceAt(19)}>
          <InputTag t={tile(19)} v={{}} w="100%" />
        </ScaledModule>
    ),
    checkbox: (
        <ScaledModule key="checkbox" t={tile(20)} appearance={appearanceAt(20)}>
          <TokenInspector component="Checkbox" variant={{ Checked: 'true' }}>
            <SkeletonSettingsList
              t={tile(20)}
              control="checkbox"
              legend={'Notify me about'}
              rows={[
                { label: 'Comments on my files', on: true },
                { label: 'New team members', on: true },
                { label: 'Weekly digest', on: false },
              ]}
            />
          </TokenInspector>
        </ScaledModule>
    ),
    fileUpload: (
        <ScaledModule key="fileUpload" t={tile(21)} appearance={appearanceAt(21)}>
          <FileUpload t={tile(21)} v={{}} w="100%" />
        </ScaledModule>
    ),
    stepper: (
        <ScaledModule key="stepper"
          t={tile(22)}
          appearance={appearanceAt(22)}
          style={{ gap: gap(tile(22), 'gap-group', '16px') }}
        >
          <Stepper t={tile(22)} v={{}} w="100%" />
          <Separator t={tile(22)} v={{}} w="100%" />
          <div className="flex w-full justify-center">
            <Pagination t={tile(22)} v={{}} />
          </div>
        </ScaledModule>
    ),
  }
  // The avatar card: four avatars stacked by the `overlap-md` role. The px is
  // the role's LIVE value (negative), so Variables edits land here too.
  // Each avatar is ringed in the card's own colour — the ring is what keeps a
  // tucked avatar's edge legible against the one it sits under.
  const overlapPx = parseFloat(spacingRoleOf(tile(11), 'overlap-md', '-8px')) || 0
  const cardBg = String(cardSurfaceStyle(tile(11)).background ?? tile(11).surface)
  const teamCard = (
    <ScaledModule key="team" t={tile(11)} appearance={appearanceAt(11)}>
      <div className="flex items-baseline justify-between" style={{ gap: gap(tile(11), 'gap-control', '8px') }}>
        <span style={{ ...typeStyleOf(tile(11), 'label'), color: tile(11).neutralText }}>{translate('Team')}</span>
        <span style={{ ...typeStyleOf(tile(11), 'helper'), color: muted(11) }}>{translate('4 members')}</span>
      </div>
      <div className="flex items-center">
        {AVATAR_STACK_HUES.slice(0, 4).map((hue, i) => (
          <span
            key={hue}
            style={{
              display: 'inline-flex',
              position: 'relative',
              zIndex: 4 - i,
              marginLeft: i === 0 ? 0 : overlapPx,
              borderRadius: 999,
              boxShadow: `0 0 0 2px ${cardBg}`,
            }}
          >
            <Avatar t={tile(11)} v={{ Size: 'default', Fill: 'Gradient', Hue: String(hue) }} />
          </span>
        ))}
      </div>
    </ScaledModule>
  )

  // CHART — how a data widget reads in this system: a metric, a trend badge and
  // the catalogue's Chart (shadcn `chart` over Recharts), all on tokens.
  const chart = tile(10)
  const chartCard = (
    <ScaledModule key="chart" t={chart} appearance={appearanceAt(10)}>
      <div className="flex items-start justify-between" style={{ gap: gap(chart, 'gap-control', '8px') }}>
        <ReadinessFigure t={chart} muted={muted(10)} />
      </div>
      <Chart t={chart} v={{ Type: 'area' }} w="100%" />
    </ScaledModule>
  )
  const colorStyle = (wide: boolean, fill = false) => (
    <ScaledModule key="colorStyle" t={tile(0)} appearance={appearanceAt(0)} fill={fill} inspect={false} {...(wide ? widePhoto : {})}>
      <ColorStyleSpecimen t={tile(0)} />
    </ScaledModule>
  )
  const typeStyle = (wide: boolean, fill = false) => (
    <ScaledModule key="typeStyle" t={tile(1)} appearance={appearanceAt(1)} fill={fill} inspect={false} {...(wide ? widePhoto : {})}>
      <TypeStyleSpecimen t={tile(1)} />
    </ScaledModule>
  )
  const fillLast = (column: ReactElement[]) =>
    column.map((el, i) => (i === column.length - 1 ? cloneElement(el as ReactElement<{ fill?: boolean }>, { fill: true }) : el))
  // Four columns, hand-balanced by typical height; the last tile of each
  // stretches (`fill`), so whatever the theme's type and spacing do to the
  // heights, every column ends on one line. Each column closes on a tile whose
  // content reads fine centred in extra height.
  const boardColumns: ReactElement[][] = [
    [mod.createAccount, mod.profile, mod.checkbox],
    [mod.buttons, mod.calendar, mod.tabsProgress, mod.notifications],
    [mod.verify, mod.sidebar, mod.seats, mod.stepper],
    [mod.badges, chartCard, teamCard, mod.toasts, mod.fileUpload, mod.inputTag],
  ]
  const phonePacks: ReactElement[][] = [
    [colorStyle(false), typeStyle(false)],
    [mod.verify, mod.buttons, mod.badges],
    [mod.createAccount],
    [mod.calendar, mod.profile, chartCard, teamCard],
    [mod.notifications, mod.seats, mod.toasts, mod.tabsProgress],
    [mod.sidebar, mod.inputTag, mod.checkbox, mod.fileUpload, mod.stepper],
  ]
  // The wave runs on diagonals: the two style tiles first, then each column's
  // tiles one band later than the column to their left and the tile above.
  const place = (el: ReactElement, band: number) => cloneElement(el as ReactElement<{ band?: number }>, { band })
  const bands = phones
    ? phonePacks.reduce((n, pack, p) => Math.max(n, p + pack.length - 1), 0)
    : boardColumns.reduce((n, column, c) => Math.max(n, 1 + c + column.length - 1), 1)
  // The wave starts once the BOARD holds still: the on-demand library is in and
  // no tile has changed size for `SETTLE_MS`. Settling tile by tile was not
  // enough — when the Chart grows, every column's last tile re-stretches and
  // the tiles below it move, so a tile already shown would be shoved.
  const [waveStart, setWaveStart] = useState<number | null>(null)
  useEffect(() => {
    if (waveStart != null) return
    const go = () => setWaveStart(performance.now())
    const cap = window.setTimeout(go, Math.max(0, mountedAt + REVEAL_CAP_MS - performance.now()))
    const root = stageRef.current
    if (!heavyReady || !root) return () => window.clearTimeout(cap)
    let settle = 0
    const arm = () => { window.clearTimeout(settle); settle = window.setTimeout(go, SETTLE_MS) }
    const ro = new ResizeObserver(arm)
    root.querySelectorAll('[data-collage-appearance]').forEach((el) => ro.observe(el))
    arm()
    return () => { window.clearTimeout(cap); window.clearTimeout(settle); ro.disconnect() }
  }, [heavyReady, waveStart, mountedAt])
  const timing = boardRevealTiming(board.motion, { start: waveStart ?? mountedAt, bands, quick: quickEntry, reduced: reduceMotion, held: waveStart == null })
  // Memoised on its numbers: the tokens object is rebuilt on any store change,
  // and a new context value would re-run every tile's reveal timer.
  const reveal = useMemo(
    () => timing,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timing.start, timing.step, timing.ms, timing.easing, timing.enter, timing.span, timing.held],
  )
  useEffect(() => {
    if (waveStart == null) return
    const id = window.setTimeout(() => {
      setWaveDone(true)
      markBoardEntered()
    }, Math.max(0, waveStart + reveal.span + 250 - performance.now()))
    return () => window.clearTimeout(id)
  }, [waveStart, reveal.span])

  return (
    <PhosphorWeightProvider weight={tokensByAppearance.light.iconWeight}>
    <CollageFrameContext.Provider value={{ source: frame.source, display }}>
    <BoardRevealContext.Provider value={reveal}>
    <BoardAutoplayContext.Provider value={playing}>
    <div ref={stageRef} className="contents">
    {phones ? (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-start gap-3 overflow-x-auto snap-x snap-mandatory pb-1" aria-label={platformCaption}>
        {phonePacks.map((packed, p) => (
          <CollagePack key={p} {...pack}>{packed.map((el, i) => place(el, p + i))}</CollagePack>
        ))}
      </div>
      <p className="text-mini text-fg-faint text-center tabular-nums">
        {platformCaption} · {liveGrid.columns} col · page margin {liveGrid.margin} from Grid
      </p>
    </div>
    ) : (
    // Room for unscaled elevation to paint into the scrollport padding —
    // without it Strong's blur reads clipped against the canvas edge.
    // `width: calc(100% + 20px)`, not `w-full`: under border-box the 10px
    // padding sits INSIDE a 100% width, so the -10px margin only shifted the
    // box left — the board measured 20px narrow and hugged the left edge
    // (22.5px inset left, 42.5px right). Growing the box by its own padding
    // keeps the content box exactly the canvas's, so the board centres.
    <div ref={boardRef} style={{ width: 'calc(100% + 20px)', padding: 10, margin: -10 }}>
      <div className="mx-auto flex flex-col" style={{ width: BOARD_COLUMNS * display + (BOARD_COLUMNS - 1) * gutterPx, gap: gutter }}>
        <div className="flex items-stretch" style={{ gap: gutter }}>
          {place(colorStyle(true, true), 0)}
          {place(typeStyle(true, true), 1)}
        </div>
        <div className="flex items-stretch" style={{ gap: gutter }}>
          {boardColumns.map((column, i) => (
            <div key={i} className="flex flex-col" style={{ width: display, gap: gutter }}>
              {fillLast(column).map((el, r) => place(el, 1 + i + r))}
            </div>
          ))}
        </div>
      </div>
    </div>
    )}
    </div>
    </BoardAutoplayContext.Provider>
    </BoardRevealContext.Provider>
    </CollageFrameContext.Provider>
    </PhosphorWeightProvider>
  )
}
