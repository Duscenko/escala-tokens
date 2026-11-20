import { fontStack } from '../../../lib/fonts'
import { cloneElement, createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { Live, PhosphorWeightProvider, SPECIMENS, TokenIcon, preloadHeavySpecimens, type IconOpts, type SpecimenProps } from '../../configurator/docs/specimens'
import { TokenInspector, INSPECT_EXEMPT_ATTR, inspectGroupAttrs, useInspectorActive } from './TokenInspector'
import { BoardAutoplayContext, TileLiveContext, useAutoplayStep, useBoardConductor, useBoardPaused } from './boardAutoplay'
import { CALENDAR_PLAY } from './boardScripts'
import { BoardRevealContext, REVEAL_CAP_MS, SETTLE_MS, boardEnteredOnce, boardRevealTiming, markBoardEntered } from './boardReveal'
import { useReducedMotion } from 'framer-motion'
import { SkeletonSettingsList } from '../../configurator/docs/skeleton/forms'
import { RecipeScope } from '../../configurator/docs/skeleton/scope'
import { Card as UiCard } from '../../escala-ui/card'
import { Alert as UiAlert } from '../../escala-ui/alert'
import { Button as UiButton } from '../../escala-ui/button'
import { AuthSignInPasskey } from '../../escala-ui/blocks/auth'
import { DashboardActivityCard, DashboardGaugeCard, DashboardMetricCard } from '../../escala-ui/blocks/dashboard'
import { NowPlaying } from '../../escala-ui/blocks/media'
import {
  cardSurfaceStyle,
  radiusRoleOf,
  shadowOf,
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

// Every tile below is built from the Storybook families (`spec/storybook-families.json`,
// the Figma file's components) — no shadcn-era entry (Chart, StatusBadge, Card as a
// specimen…) is placed on the board.
const InputOTP = inspectable('InputOTP')
const TextLink = inspectable('TextLink')
const ButtonGroup = inspectable('ButtonGroup')
const Toast = inspectable('Toast')
const InputTag = inspectable('InputTag')
const FileUpload = inspectable('FileUpload')
const Stepper = inspectable('Stepper')
const Pagination = inspectable('Pagination')
const Separator = inspectable('Separator')
const Calendar = inspectable('Calendar')

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
/**
 * Floor for a board column: half the true size of a tile. Below it the
 * photographs stop being legible, so a canvas too narrow for four columns at
 * this width does not shrink the board further — the board SLIDES sideways
 * (see `slides` in `SystemCollage`).
 */
const BOARD_MIN_COLUMN = 160
/** The canvas's own side inset (`CANVAS_INSET`, px-5): a sliding board bleeds
 *  through it, so its tiles are cut by the canvas edge, not by an inner box. */
const BOARD_SLIDE_BLEED = 20

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

/** A tile before its content: the tile's own Card with pulsing placeholder bars
 *  (surface.layer-2 on radius.action), as many as its height holds. */
function TileSkeleton({ t, height }: { t: PreviewTokens; height: number }) {
  const inset = px(spacingRoleOf(t, 'inset-surface', '20px')) || 20
  const line = 14
  const gapPx = 12
  const lines = Math.max(1, Math.min(SKELETON_WIDTHS.length, Math.floor((height - inset * 2 + gapPx) / (line + gapPx))))
  return (
    <ModuleSurface t={t} style={{ height: '100%', gap: gapPx }}>
      {SKELETON_WIDTHS.slice(0, lines).map((width, i) => (
        <div
          key={i}
          aria-hidden
          className="flex-shrink-0 animate-pulse motion-reduce:animate-none"
          style={{ width, height: i === 0 ? line + 4 : line, background: t.layer2, borderRadius: radiusRoleOf(t, 'action', '8px') }}
        />
      ))}
    </ModuleSurface>
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
/** A bento slot: one column of tiles, or a tile across two columns over two columns of tiles. */
type BentoSlot =
  | { span: 1; tiles: ReactElement[] }
  | { span: 2; head: ReactElement; columns: ReactElement[][] }

/** The first column a slot sits on. */
function bentoStart(bento: BentoSlot[], index: number): number {
  return bento.slice(0, index).reduce((n, slot) => n + slot.span, 0)
}

/** Every tile's band in the entrance wave (the diagonal: column + row, after the three rows above). */
function bentoBands(bento: BentoSlot[]): number[] {
  return bento.flatMap((slot, i) => {
    const c = bentoStart(bento, i)
    return slot.span === 1
      ? slot.tiles.map((_, r) => 3 + c + r)
      : [3 + c, ...slot.columns.flatMap((column, k) => column.map((_, r) => 4 + c + k + r))]
  })
}

export function SystemCollage({
  tokensByAppearance, tileAppearances, layout = 'phones', frameTokens,
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
  const gutter = gap(tile(2), 'gap-control', '8px')
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
  // ONE scale for the whole board. The blocks keep the width the Figma file
  // draws them at (SignIn 480, the Calendar's full panel), so
  // the column is derived from them: SignIn + Calendar span three columns and a
  // gutter, and every tile — block or component — is photographed at the same
  // `display / unit`. Widths are measured once the blocks render (below).
  const [blockWidths, setBlockWidths] = useState({ signIn: 480, calendar: 418, metric: 400, activity: 924 })
  const avail = boardWidth
    ? Math.max(BOARD_MIN_COLUMN, (boardWidth - (BOARD_COLUMNS - 1) * gutterPx) / BOARD_COLUMNS)
    : frame.display
  const pair = blockWidths.signIn + blockWidths.calendar
  const unitTrue = Math.max(frame.source, (pair - gutterPx) / 3)
  // Never above true size: a wide canvas centres the board instead.
  const fitsTrue = avail >= unitTrue
  const unit = phones ? frame.source : fitsTrue ? unitTrue : Math.max(frame.source, (pair * avail) / (3 * avail + gutterPx))
  const boardDisplay = Math.floor(fitsTrue ? unitTrue : avail)
  const display = phones ? phoneInner : boardDisplay
  const scale = display / unit
  const boardSpan = BOARD_COLUMNS * display + (BOARD_COLUMNS - 1) * gutterPx
  // The canvas cannot hold four columns at the floor: the board keeps the floor
  // and slides sideways inside its own scrollport, column by column.
  const slides = !phones && boardWidth > 0 && boardSpan > boardWidth + 0.5
  /** A photo `frameWidth` wide at the board's scale. Only the painted width is
   *  a whole pixel: rounding the source too gave each width its own scale
   *  (0.7542 · 0.7545 · 0.7547 on one board). */
  const photo = (frameWidth: number) => {
    const painted = Math.round(frameWidth)
    return { frameWidth: painted, sourceWidth: painted / scale }
  }
  const widePhoto = photo(display * 2 + gutterPx)
  const signInPhoto = photo(blockWidths.signIn * scale)
  // The Calendar's slot takes whatever SignIn and the last column leave, so
  // the row's edges land on the columns' edges at any width.
  const calendarPhoto = photo(3 * display + gutterPx - signInPhoto.frameWidth)
  // Every render, no deps: the Calendar is a lazy chunk that mounts after the
  // board does, and a theme change can move either. It only sets
  // state on a change over 1px, so it settles in one extra render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const root = stageRef.current
    if (phones || !root) return
    const auth = root.querySelector<HTMLElement>('[data-board-block="signIn"] [data-block="AuthSignInPasskey"]')
    const cal = root.querySelector<HTMLElement>('[data-board-block="calendar"] [data-slot="calendar"]')
    // The Calendar fills its slot, so its rendered width is the slot's. The
    // width the file draws it at is read with the fill taken away for a moment
    // (same task, nothing paints in between) — as `ScaledModule` reads a
    // stretched tile's natural height.
    let calendar = blockWidths.calendar
    if (cal) {
      const kept = cal.style.width
      cal.style.width = 'max-content'
      calendar = cal.offsetWidth || calendar
      cal.style.width = kept
    }
    // The dashboard cards draw at the file's width but cap at their slot
    // (`maxWidth: 100%`): the cap is lifted for the read, as the Calendar's fill.
    const fileWidth = (selector: string, fallback: number) => {
      const el = root.querySelector<HTMLElement>(selector)
      if (!el) return fallback
      const kept = el.style.maxWidth
      el.style.maxWidth = 'none'
      const w = el.offsetWidth || fallback
      el.style.maxWidth = kept
      return w
    }
    const next = {
      signIn: auth ? parseFloat(getComputedStyle(auth).maxWidth) || blockWidths.signIn : blockWidths.signIn,
      calendar,
      metric: fileWidth('[data-board-block="metric"] [data-escala="DashboardMetricCard"]', blockWidths.metric),
      activity: fileWidth('[data-board-block="activity"] [data-escala="DashboardActivityCard"]', blockWidths.activity),
    }
    if ((Object.keys(next) as (keyof typeof next)[]).some((k) => Math.abs(next[k] - blockWidths[k]) > 1)) {
      setBlockWidths(next)
    }
  })
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
            <TextLink t={tile(2)} v={{ Size: 'sm' }} icons={{ prefix: tile(2).iconPrefix ?? 'phosphor', leading: false, trailing: false }}>{translate('Resend')}</TextLink>
          </span>
        </ScaledModule>
    ),
    // The Figma Button's two axes — Variant (default · secondary · critical) ×
    // Appearance (solid · outline · ghost · link) — then the IconButton set and a
    // ButtonGroup, the three action families a screen is built from.
    buttons: (
        <ScaledModule key="buttons"
          t={tile(3)}
          appearance={appearanceAt(3)}
          style={{ gap: gap(tile(3), 'gap-group', '16px') }}
        >
          <div className="flex w-full min-w-0 flex-col" style={{ gap: gap(tile(3), 'gap-control', '8px') }}>
            {([
              ['default', 'solid', translate('Publish')],
              ['secondary', 'solid', translate('Save draft')],
              ['default', 'outline', translate('Preview')],
              ['default', 'ghost', translate('Cancel')],
            ] as const).map(([variant, look, label]) => (
              <InspectableLive
                key={`${variant}-${look}`}
                c="Button"
                t={tile(3)}
                v={{ Variant: variant, Appearance: look, Size: 'sm' }}
                w="100%"
              >
                {label}
              </InspectableLive>
            ))}
          </div>
          <div
            className="grid w-full min-w-0"
            style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: gap(tile(3), 'gap-control', '8px') }}
          >
            <InspectableLive
              c="Button"
              t={tile(3)}
              v={{ Variant: 'critical', Appearance: 'solid', Size: 'sm' }}
              icons={{ ...catalogueIcons(tile(3), 'trash'), leading: true }}
              w="100%"
            >
              {translate('Delete')}
            </InspectableLive>
            <InspectableLive
              c="Button"
              t={tile(3)}
              v={{ Variant: 'default', Appearance: 'link', Size: 'sm' }}
              icons={{ ...catalogueIcons(tile(3)), leading: false }}
              w="100%"
            >
              {translate('Learn more')}
            </InspectableLive>
          </div>
          <Separator t={tile(3)} v={{}} w="100%" />
          <div className="flex items-center justify-between" style={{ gap: gap(tile(3), 'gap-control', '8px') }}>
            {([
              ['default', 'solid', 'plus'],
              ['secondary', 'solid', 'edit'],
              ['default', 'outline', 'share'],
              ['default', 'ghost', 'settings'],
              ['critical', 'ghost', 'trash'],
            ] as const).map(([variant, look, concept]) => (
              <InspectableLive
                key={`${variant}-${look}-${concept}`}
                c="IconButton"
                t={tile(3)}
                v={{ Variant: variant, Appearance: look, Size: 'sm' }}
                icons={catalogueIcons(tile(3), concept)}
              >
                {concept}
              </InspectableLive>
            ))}
          </div>
          <div className="flex w-full justify-center">
            <ButtonGroup t={tile(3)} v={{ Size: 'sm', Variant: 'outline' }} />
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
    // Feedback as a screen shows it: an in-page Alert with its action, and a
    // Toast arriving on the brand's own choreography.
    toasts: (
        <ScaledModule key="toasts"
          t={tile(15)}
          appearance={appearanceAt(15)}
          style={{ gap: gap(tile(15), 'gap-group', '16px') }}
        >
          <TokenInspector component="Alert" variant={{ Variant: 'info', Appearance: 'soft', Layout: 'vertical' }}>
            <RecipeScope t={tile(15)}>
              <UiAlert
                variant="info"
                appearance="soft"
                layout="vertical"
                size="sm"
                closeVisible={false}
                description={translate('A new version of your tokens is ready to sync.')}
                actionsVisible
                actions={<UiButton variant="default" appearance="solid" size="xs">{translate('Sync now')}</UiButton>}
              />
            </RecipeScope>
          </TokenInspector>
          <Toast t={tile(15)} v={{ Variant: 'success' }} w="100%" />
        </ScaledModule>
    ),
    // The Calendar's root is a card, so it IS the tile (no Card around it);
    // the selected day's event sits under the month (the Calendar's children).
    calendar: (
        <ScaledModule key="calendar" t={tile(9)} appearance={appearanceAt(9)} chrome={false} elev="sm">
          {/* As wide as the tiles around it: the weeks spread their seven cells
              (`w`), so the tile keeps the column's edges instead of floating
              narrower in the middle of it. */}
          <Calendar t={tile(9)} v={{ Size: 'sm', Mode: 'single' }} w="100%">
            <CalendarEvent t={tile(9)} muted={muted(9)} />
          </Calendar>
        </ScaledModule>
    ),
    inputTag: (
        <ScaledModule key="inputTag" t={tile(19)} appearance={appearanceAt(19)}>
          <InputTag t={tile(19)} v={{}} w="100%" />
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
  // BLOCKS — the Figma file's composed blocks (`escala-ui/blocks`, the Storybook's
  // `Blocks/`), placed as they ship: their own card, header, fields and copy.
  // Nothing on these tiles is composed here.
  const block = (key: string, i: number, node: ReactNode, size?: { frameWidth: number; sourceWidth: number }) => (
    <ScaledModule key={key} t={tile(i)} appearance={appearanceAt(i)} chrome={false} elev={false} {...size}>
      <RecipeScope t={tile(i)}>
        <div data-board-block={key} className="flex w-full justify-center">{node}</div>
      </RecipeScope>
    </ScaledModule>
  )
  // The sign-in tile is the email-first passkey block (the tray modal), the way a product signs in today.
  const signIn = block('signIn', 5, <AuthSignInPasskey />, phones ? undefined : signInPhoto)
  // Media and data blocks break the run of forms and people: the NowPlaying bar under the Calendar (its artwork takes the
  // brand's accent), a Gauge beside the OTP, and a KPI with its Sparkline in the bento. They replaced the Team avatars,
  // the Tokens-shipped stat and the Editors seats, three tiles that repeated the Members table and each other.
  const nowPlaying = block('nowPlaying', 11, <NowPlaying tint="accent" style={{ width: '100%' }} />, phones ? undefined : calendarPhoto)
  const gaugeCard = block('gauge', 10, <DashboardGaugeCard style={{ width: '100%' }} />)
  // The KPI and the year of activity are drawn at the file's width (400 and 924) and photographed into
  // their slot: squeezed to a column, the KPI's label ran into its value under wide type, and the heatmap's
  // 53 weeks cannot reflow. The KPI fills one column, the heatmap two.
  const metricCard = block('metric', 12, <DashboardMetricCard style={{ width: '100%' }} />,
    phones ? undefined : { frameWidth: display, sourceWidth: Math.max(unit, blockWidths.metric) })
  const activityCard = block('activity', 16, <DashboardActivityCard style={{ width: '100%' }} />,
    phones ? undefined : { frameWidth: 2 * display + gutterPx, sourceWidth: Math.max((2 * display + gutterPx) / scale, blockWidths.activity) })
  // The Calendar at the width the file draws its full panel: the presets rail,
  // one month in range mode and the footer — it needs two columns.
  const calendarPanel = (
    <ScaledModule key="calendarPanel" t={tile(9)} appearance={appearanceAt(9)} chrome={false} elev={false} {...calendarPhoto}>
      {/* The panel fills its slot (`w`): when the column is set by a tile wider
          than the blocks need (the OTP's six cells), the slot is wider than the
          file's panel, and the presets rail takes the difference. Centred at its
          own width, the panel sat 8.7px short of the tile under it on each side. */}
      <div data-board-block="calendar" className="flex w-full">
        <Calendar t={tile(9)} v={{ Size: 'default', Mode: 'range', PresetsVisible: 'True', FooterVisible: 'True' }} w="100%" />
      </div>
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
  // The KPI block (its own card, it does not stretch) sits mid-column; the
  // board ends on the bento, every column on one line.
  // The middle two columns open on the year of activity, spanning both.
  const bento: BentoSlot[] = [
    { span: 1, tiles: [mod.buttons, mod.notifications] },
    { span: 2, head: activityCard, columns: [[mod.stepper], [metricCard, mod.inputTag]] },
    { span: 1, tiles: [mod.toasts, mod.fileUpload] },
  ]
  /** Above the bento, each at its own width and the board's one scale:
   *  the SignIn block, the Calendar's full panel over the NowPlaying bar, and
   *  one column (the Gauge card block over the OTP) — three of a height. */
  const blockRow: { width: number; tiles: ReactElement[] }[] = [
    { width: signInPhoto.frameWidth, tiles: [signIn] },
    { width: calendarPhoto.frameWidth, tiles: [calendarPanel, nowPlaying] },
    { width: display, tiles: [gaugeCard, mod.verify] },
  ]
  const phonePacks: ReactElement[][] = [
    [colorStyle(false), typeStyle(false)],
    [signIn],
    [mod.verify, mod.buttons],
    [mod.calendar, nowPlaying, mod.notifications],
    [metricCard, mod.toasts],
    [mod.inputTag, mod.fileUpload, mod.stepper],
  ]
  // The wave runs on diagonals: the two style tiles first, then each column's
  // tiles one band later than the column to their left and the tile above.
  const place = (el: ReactElement, band: number) => cloneElement(el as ReactElement<{ band?: number }>, { band })
  const bands = phones
    ? phonePacks.reduce((n, pack, p) => Math.max(n, p + pack.length - 1), 0)
    : bentoBands(bento).reduce((n, b) => Math.max(n, b), 3) + 1
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
    {/* `unit`, not `frame.source`: when the blocks set the column (a compact
        theme), a tile laid out at `frame.source` was photographed at a larger
        scale than the blocks beside it. */}
    <CollageFrameContext.Provider value={{ source: unit, display }}>
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
    //
    // A canvas too narrow for the board at its floor scale (`slides`) turns
    // this box into the board's own sideways scrollport: it bleeds through the
    // canvas inset so the tiles are cut by the canvas edge — which is what says
    // there is more — and stops on the bento's columns. Before, the board
    // simply hung 17–40px past the canvas on the right.
    <div
      ref={boardRef}
      data-board-slides={slides || undefined}
      style={slides ? {
        width: `calc(100% + ${BOARD_SLIDE_BLEED * 2}px)`,
        padding: `10px ${BOARD_SLIDE_BLEED}px`,
        margin: `-10px -${BOARD_SLIDE_BLEED}px`,
        overflowX: 'auto',
        overscrollBehaviorX: 'contain',
        scrollSnapType: 'x proximity',
        scrollPaddingInline: BOARD_SLIDE_BLEED,
      } : { width: 'calc(100% + 20px)', padding: 10, margin: -10 }}
    >
      <div className="mx-auto flex flex-col" style={{ width: boardSpan, gap: gutter }}>
        <div className="flex items-stretch" style={{ gap: gutter }}>
          {place(colorStyle(true, true), 0)}
          {place(typeStyle(true, true), 1)}
        </div>
        <div className="flex items-stretch" style={{ gap: gutter }}>
          {blockRow.map((slot, i) => (
            <div key={i} className="flex flex-col" style={{ width: slot.width, gap: gutter }}>
              {(i === 0 ? slot.tiles : fillLast(slot.tiles)).map((el, r) => place(el, 1 + i + r))}
            </div>
          ))}
        </div>
        <div className="flex items-stretch" style={{ gap: gutter }}>
          {bento.map((slot, i) => {
            const c = bentoStart(bento, i)
            const snap = slides ? 'start' as const : undefined
            if (slot.span === 1) {
              return (
                <div key={i} className="flex flex-col" style={{ width: display, gap: gutter, scrollSnapAlign: snap }}>
                  {fillLast(slot.tiles).map((el, r) => place(el, 3 + c + r))}
                </div>
              )
            }
            return (
              <div key={i} className="flex flex-col" style={{ width: 2 * display + gutterPx, gap: gutter, scrollSnapAlign: snap }}>
                {place(slot.head, 3 + c)}
                <div className="flex flex-1 items-stretch" style={{ gap: gutter }}>
                  {slot.columns.map((column, k) => (
                    <div key={k} className="flex flex-col" style={{ width: display, gap: gutter }}>
                      {fillLast(column).map((el, r) => place(el, 4 + c + k + r))}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
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
