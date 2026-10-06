import { fontStack } from '../../../lib/fonts'
import { cloneElement, createContext, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { AVATAR_STACK_HUES, Live, PhosphorWeightProvider, SPECIMENS, TokenIcon, type IconOpts, type SpecimenProps } from '../../configurator/docs/specimens'
import { TokenInspector, INSPECT_EXEMPT_ATTR, inspectGroupAttrs, useInspectorActive } from './TokenInspector'
import {
  cardSurfaceStyle,
  radiusRoleOf,
  shadowOf,
  sizeOf,
  sizeRoleOf,
  spacingRoleOf,
  strokeRoleOf,
  typeStyleOf, spaceOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'
import type { ThemeAppearance } from '../../../lib/themeModes'
import { useI18n } from '../../../lib/i18n'
import { COMPONENTS } from '../../../lib/componentCatalogue'
import { extractBreakpoints, resolveGridFrame, type GridViewport, type OverlapSize } from '../../../lib/layoutTokens'
import { artefactSourceWidth, ScaledDeviceFrame } from './DeviceFrame'

export { COLLAGE_TILE_COUNT } from '../../../lib/randomTheme'

/** One axis's values for a catalogue component — same source as ThemePreviewHub. */
function axisValuesOf(key: string, axis: string): string[] {
  return COMPONENTS.find((c) => c.key === key)?.axes.find((a) => a.name === axis)?.values ?? []
}

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
const TextLink = inspectable('TextLink')
const Segmented = inspectable('SegmentedControl')
const Toast = inspectable('Toast')
const TabMenu = inspectable('TabMenu')
const Progress = inspectable('Progress')
const StatusBadge = inspectable('StatusBadge')
const Chip = inspectable('Chip')
const Sidebar = inspectable('Sidebar')
const InputTag = inspectable('InputTag')
const CheckboxGroup = inspectable('CheckboxGroup')
const FileUpload = inspectable('FileUpload')
const Stepper = inspectable('Stepper')
const Pagination = inspectable('Pagination')
const Spinner = inspectable('Spinner')

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
 * segmented track, and the profile stats. Display keeps the floor scale.
 */
function collageFrame(t: PreviewTokens, copy: {
  social: string
  pair: string
  followers: string
  following: string
  credits: string
  upgrade: string
}): { source: number; display: number } {
  const pad = px(spacingRoleOf(t, 'inset-surface', '20px'))
  const border = px(strokeRoleOf(t, 'control', '1px'))
  const button = fontPx(t, 'button', 14)
  const heading = fontPx(t, 'heading-sm', 16)
  const helper = fontPx(t, 'helper', 12)
  const body = fontPx(t, 'body-sm', 14)
  const gapC = px(spacingRoleOf(t, 'gap-control', '8px')) || 8
  const gapT = px(spacingRoleOf(t, 'gap-tight', '4px')) || 4
  const smPx = sizeOf(t, 'sm', 32)
  // SM button: pad 14, icon 14, gap 6 — the specimen's own chrome, not a token.
  const pairCell = 14 * 2 + 14 + 6 + labelPx(button, copy.pair)
  const inner = Math.max(
    MODULE_SOURCE - pad * 2 - border * 2,
    labelPx(button, copy.social) + 16 + 10,
    pairCell * 2 + gapC,
    smPx * 6 + gapT * 5,
    labelPx(button, 'List') + labelPx(button, 'Board') + labelPx(button, 'Timeline') + 20 * 3 + 10,
    labelPx(heading, '12.4K') + 6 + labelPx(helper, copy.followers) + gapC + labelPx(heading, '4') + 6 + labelPx(helper, copy.following),
    labelPx(body, copy.credits) + gapC + 14 * 2 + labelPx(button, copy.upgrade),
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
 * COLOR STYLE — the palette at a glance: the accent as the lead block, then
 * three readings of its own ramp (soft · deep · tint), over the neutral ramp.
 * Read straight off the previewed theme's ramps, so it can't show a colour
 * the system doesn't ship.
 */
function ColorStyleSpecimen({ t }: { t: PreviewTokens }) {
  const brand = t.brandRamp ?? {}
  const neutral = t.neutralRamp ?? {}
  const radius = nestedRadius(t)
  const blocks: { color: string; grow: number }[] = [
    { color: t.brandSolid, grow: 4 },
    { color: brand[5] ?? t.brandSolid, grow: 1 },
    { color: brand[12] ?? t.neutralText, grow: 1 },
    { color: brand[3] ?? t.neutralFill, grow: 1 },
  ]
  const steps = Array.from({ length: 12 }, (_, i) => neutral[i + 1]).filter(Boolean)
  // `flex-1` below so a stretched card hands its spare height to the blocks, not
  // to the padding — the surface inset has to read the same on all four sides.
  return (
    <TokenInspector component="Card">
      <div className="flex flex-1 flex-col" style={{ gap: gap(t, 'gap-control', '8px') }}>
        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 120, borderRadius: radius }}>
          {blocks.map((b, i) => <span key={i} style={{ flex: `${b.grow} 1 0`, background: b.color }} />)}
        </div>
        {steps.length > 0 && (
          <div className="flex overflow-hidden" style={{ height: 40, borderRadius: radius }}>
            {steps.map((c, i) => <span key={i} style={{ flex: '1 1 0', background: c }} />)}
          </div>
        )}
      </div>
    </TokenInspector>
  )
}

/**
 * TYPE STYLE — the faces at a glance: the heading face as a glyph specimen
 * on a soft well, the body face named and set at three weights.
 */
function TypeStyleSpecimen({ t }: { t: PreviewTokens }) {
  const body = t.typography.fontFamily
  const heading = t.typography.headingFontFamily || body
  const w = t.typography.weights ?? {}
  const ink = t.neutralText
  const weights: [string, number][] = [
    ['Regular', w.regular ?? 400],
    ['Medium', w.medium ?? 500],
    ['Heavy', w.bold ?? 700],
  ]
  return (
    <div className="grid flex-1 items-stretch" style={{ gridTemplateColumns: '1fr 1fr', gap: gap(t, 'gap-group', '16px'), minHeight: 200 }}>
      <div
        className="flex items-center justify-center"
        style={{ background: wellFill(t), borderRadius: nestedRadius(t), padding: spaceOf(t, 16) }}
      >
        <span style={{ fontFamily: fontStack(heading), fontWeight: w.bold ?? 700, fontSize: 52, lineHeight: 1.02, letterSpacing: '-0.02em', color: ink, textAlign: 'center' }}>
          Aa<br />123<br />#&amp;!
        </span>
      </div>
      <div className="flex flex-col items-center justify-center text-center" style={{ gap: gap(t, 'gap-control', '8px') }}>
        <span style={{ ...typeStyleOf(t, 'caption'), color: t.fgMuted || ink }}>{body}</span>
        <span className="flex flex-col">
          {weights.map(([label, weight]) => (
            <span key={label} style={{ fontFamily: fontStack(body), fontWeight: weight, fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.01em', color: ink }}>
              {label}
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}

/**
 * A well that reads as a step OFF the card, in both appearances. Themes put
 * their cards on different neutral steps (Core's dark card IS step 3), so a
 * fixed step can land on the card's own tone — go two steps past the card.
 */
function wellFill(t: PreviewTokens): string {
  const ramp = t.neutralRamp ?? {}
  const card = String(cardSurfaceStyle(t).background ?? '').toLowerCase()
  const at = Object.entries(ramp).find(([, hex]) => hex.toLowerCase() === card)?.[0]
  const step = at ? Math.min(12, Number(at) + 2) : 3
  return ramp[step] ?? t.neutralFill
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

function ModuleSurface({ t, children, style }: { t: PreviewTokens; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        ...cardSurfaceStyle(t),
        border: `${strokeRoleOf(t, 'control', '1px')} solid ${t.borderDefault || t.border || '#eaecf0'}`,
        borderRadius: radiusRoleOf(t, 'container', '16px'),
        // Elevation lives on `ScaledModule`'s OUTER frame — an inner
        // box-shadow is clipped by the photograph and shrunk by scale().
        padding: spacingRoleOf(t, 'inset-surface', '20px'),
        display: 'flex',
        flexDirection: 'column',
        gap: gap(t, 'gap-control', '8px'),
        ...style,
      }}
    >
      {children}
    </div>
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
  t, appearance = 'light', children, chrome = true, clip = true, elev, style, sourceWidth = MODULE_SOURCE, frameWidth = MODULE_DISPLAY, fill = false, inspect = true,
}: {
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
  const displayHeight = naturalHeight != null ? naturalHeight * scale : 0
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
    if (!stretches) {
      const ro = new ResizeObserver((entries) => {
        const h = entries[0]?.contentRect.height
        if (h) setNaturalHeight(h)
      })
      ro.observe(el)
      return () => ro.disconnect()
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
    const surface = el.firstElementChild as HTMLElement | null
    const SETTLE = 0.5
    const measure = () => {
      const outer = outerRef.current
      if (outer) {
        const h = outer.getBoundingClientRect().height
        setStretchHeight((prev) => (prev !== null && Math.abs(prev - h) < SETTLE ? prev : h))
      }
      if (!surface) return
      const kept = surface.style.minHeight
      surface.style.minHeight = '0px'
      const natural = surface.offsetHeight
      surface.style.minHeight = kept
      // Only a real change updates state: sub-pixel rounding must not re-render.
      setNaturalHeight((prev) => (prev !== null && Math.abs(prev - natural) < SETTLE ? prev : natural))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (outerRef.current) ro.observe(outerRef.current)
    if (surface) for (const child of Array.from(surface.children)) ro.observe(child)
    measure()
    return () => ro.disconnect()
  }, [stretches])

  const surfaceStyle: CSSProperties | undefined = stretches
    ? { ...style, justifyContent: 'center', minHeight: stretchHeight ? stretchHeight / scale : undefined }
    : style
  const body = chrome ? <ModuleSurface t={t} style={surfaceStyle}>{children}</ModuleSurface> : children
  const appearanceClass = appearance === 'dark' ? 'dark' : 'light'

  return (
    <div
      ref={outerRef}
      className={`relative overflow-visible ${appearanceClass}`}
      data-collage-appearance={appearance}
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
  )
}

function GradientAvatar({ t, size }: { t: PreviewTokens; size: string }) {
  return (
    <TokenInspector component="Avatar">
      <span
        aria-hidden
        style={{
          width: size, height: size, flexShrink: 0,
          borderRadius: 999,
          background: t.avatarGradient || t.coverGradient || t.brandSolid,
        }}
      />
    </TokenInspector>
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
  tokensByAppearance, tileAppearances, projectName, layout = 'phones', frameTokens, overlapSize = 'md',
}: {
  tokensByAppearance: Record<ThemeAppearance, PreviewTokens>
  tileAppearances: ThemeAppearance[]
  projectName: string
  layout?: 'board' | 'phones'
  frameTokens?: PreviewTokens
  /** Which `overlap-*` role the avatar card stacks with — the Spacing
   *  edition's Overlap bar. */
  overlapSize?: OverlapSize
}) {
  const { t: translate } = useI18n()
  const tile = (index: number) => tokensByAppearance[tileAppearances[index] === 'dark' ? 'dark' : 'light']
  const appearanceAt = (index: number) => tileAppearances[index] ?? 'light'
  const muted = (index: number) => tile(index).fgMuted || '#717680'
  const handle = `@${projectName.replace(/\s+/g, '_').toLowerCase()}`
  const gutter = gap(tile(2), 'gap-control', '8px')
  const wellLg = sizeRoleOf(tile(2), 'control', '40px')
  const wellSm = sizeRoleOf(tile(2), 'compact', '32px')
  const frame = collageFrame(tokensByAppearance.light, {
    social: translate('Continue with Google'),
    pair: [translate('Critical'), translate('Success')].sort((a, b) => b.length - a.length)[0] ?? 'Critical',
    followers: translate('Followers'),
    following: translate('Following'),
    credits: translate('You have 2 credits left'),
    upgrade: translate('Upgrade'),
  })
  const phones = layout === 'phones'
  const board = frameTokens ?? tokensByAppearance.light
  const collageCut: GridViewport = board.previewPlatform ?? 'desktop'
  const liveGrid = resolveGridFrame(collageCut, board.gridFrame, board.spacing, extractBreakpoints(board.grid))
  const marginPx = parseFloat(liveGrid.margin) || 16
  const sourceW = artefactSourceWidth({ ...board, previewPlatform: collageCut })
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
          <InputOTP t={tile(2)} v={{ State: 'Filled', Size: 'SM' }} />
          <span style={{ ...typeStyleOf(tile(2), 'body-sm'), color: muted(2) }}>
            {translate('Didn’t get a code?')}{' '}
            <TextLink t={tile(2)} v={{}}>{translate('Resend')}</TextLink>
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
            {axisValuesOf('Button', 'Style').map((style) => (
              <InspectableLive
                key={style}
                c="Button"
                t={tile(3)}
                v={{ Style: style, Color: 'Brand', Size: 'SM' }}
                w="100%"
              >
                {translate('Click me')}
              </InspectableLive>
            ))}
          </div>
          <div
            className="grid w-full min-w-0"
            style={{
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: gap(tile(3), 'gap-control', '8px'),
              paddingTop: gap(tile(3), 'gap-group', '16px'),
              borderTop: `${strokeRoleOf(tile(3), 'divider', '1px')} solid ${tile(3).borderDefault || tile(3).border}`,
            }}
          >
            <InspectableLive
              c="Button"
              t={tile(3)}
              v={{ Style: 'Solid', Color: 'Danger', Size: 'SM' }}
              icons={{ ...catalogueIcons(tile(3)), leading: false }}
              w="100%"
            >
              {translate('Critical')}
            </InspectableLive>
            <InspectableLive
              c="Button"
              t={tile(3)}
              v={{ Style: 'Solid', Color: 'Success', Size: 'SM' }}
              icons={{ ...catalogueIcons(tile(3)), leading: false }}
              w="100%"
            >
              {translate('Success')}
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
            <Badge t={tile(4)} v={{ Style: 'Soft', Color: 'Error', Size: 'SM' }}>{translate('Critical')}</Badge>
            <Badge t={tile(4)} v={{ Style: 'Soft', Color: 'Warning', Size: 'SM' }}>{translate('Warning')}</Badge>
            <Badge t={tile(4)} v={{ Style: 'Soft', Color: 'Success', Size: 'SM' }}>{translate('Success')}</Badge>
            <Badge t={tile(4)} v={{ Style: 'Soft', Color: 'Info', Size: 'SM' }}>{translate('Info')}</Badge>
          </div>
          <div
            className="flex flex-wrap items-center"
            style={{
              gap: gap(tile(4), 'gap-control', '8px'),
              paddingTop: gap(tile(4), 'gap-group', '16px'),
              borderTop: `${strokeRoleOf(tile(4), 'divider', '1px')} solid ${tile(4).borderDefault || tile(4).border}`,
            }}
          >
            <StatusBadge t={tile(4)} v={{ Status: 'Online' }} />
            <StatusBadge t={tile(4)} v={{ Status: 'Busy' }} />
            <InspectableLive c="Chip" t={tile(4)} v={{ Selected: 'True' }} toggle="Selected" />
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
            <InspectableLive c="CloseButton" t={tile(5)} v={{ Size: 'SM' }} />
          </div>
          <div
            className="flex flex-col items-center text-center"
            style={{ gap: gap(tile(5), 'gap-control', '8px'), paddingBottom: spaceOf(tile(5), 2) }}
          >
            <GradientAvatar t={tile(5)} size={wellLg} />
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
            <Input t={tile(5)} v={{ Type: 'E-Mail', State: 'Filled', Size: 'SM' }} w="100%" hideHint />
            <Input t={tile(5)} v={{ Type: 'Password', State: 'Filled', Size: 'SM' }} w="100%" hideHint />
          </div>
          <InspectableLive
            c="Button"
            t={tile(5)}
            v={{ Style: 'Solid', Size: 'MD' }}
            icons={catalogueIcons(tile(5), 'star')}
            w="100%"
          >
            {translate('Get Started')}
          </InspectableLive>
          <div className="flex items-center" style={{ gap: gap(tile(5), 'gap-control', '8px') }}>
            <span style={{ flex: 1, height: 1, background: tile(5).borderDefault || tile(5).border }} />
            <span style={{ ...typeStyleOf(tile(5), 'caption'), color: muted(5) }}>{translate('or')}</span>
            <span style={{ flex: 1, height: 1, background: tile(5).borderDefault || tile(5).border }} />
          </div>
          <div className="flex w-full min-w-0 flex-col" style={{ gap: gap(tile(5), 'gap-control', '8px') }}>
            <SocialLogin t={tile(5)} v={{ Provider: 'Google' }} w="100%" />
            <SocialLogin t={tile(5)} v={{ Provider: 'Apple' }} w="100%" />
          </div>
        </ScaledModule>
    ),
    segmented: (
        <ScaledModule key="segmented" t={tile(6)} appearance={appearanceAt(6)}>
          <Segmented t={tile(6)} v={{ Size: 'SM' }} />
        </ScaledModule>
    ),
    profile: (
        <ScaledModule key="profile" t={tile(8)} appearance={appearanceAt(8)}>
          <div className="flex items-start" style={{ gap: gap(tile(8), 'gap-control', '8px') }}>
            <TokenInspector component="Avatar">
              <span
                aria-hidden
                style={{
                  width: wellSm, height: wellSm, flexShrink: 0,
                  borderRadius: radiusRoleOf(tile(8), 'control', '8px'),
                  background: tile(8).coverGradient || tile(8).brandSolid,
                }}
              />
            </TokenInspector>
            <div className="min-w-0 flex-1">
              <TokenInspector component="Badge">
                <div className="flex items-center" style={{ gap: gap(tile(8), 'gap-tight', '4px') }}>
                  <span style={{ ...typeStyleOf(tile(8), 'label'), color: tile(8).neutralText }}>{projectName}</span>
                  <TokenIcon t={tile(8)} concept="check" size={12} color={tile(8).brandSolid} />
                </div>
              </TokenInspector>
              <TokenInspector component="TextLink">
                <p style={{ margin: 0, ...typeStyleOf(tile(8), 'helper'), color: muted(8) }}>{handle}</p>
              </TokenInspector>
            </div>
          </div>
          <TokenInspector component="InlineAlert">
            <p style={{ margin: 0, ...typeStyleOf(tile(8), 'body-sm', { leading: true }), color: tile(8).neutralText }}>
              {translate('One payload underneath: the same JSON Figma, CSS, and an agent all read.')}
            </p>
          </TokenInspector>
          <TokenInspector component="Badge">
            <div className="flex min-w-0 flex-wrap" style={{ gap: gap(tile(8), 'gap-group', '16px') }}>
              <div>
                <span style={{ ...typeStyleOf(tile(8), 'heading-sm'), color: tile(8).neutralText }}>4</span>
                <span style={{ marginLeft: spaceOf(tile(8), 6), ...typeStyleOf(tile(8), 'helper'), color: muted(8) }}>{translate('Following')}</span>
              </div>
              <div>
                <span style={{ ...typeStyleOf(tile(8), 'heading-sm'), color: tile(8).neutralText }}>12.4K</span>
                <span style={{ marginLeft: spaceOf(tile(8), 6), ...typeStyleOf(tile(8), 'helper'), color: muted(8) }}>{translate('Followers')}</span>
              </div>
            </div>
          </TokenInspector>
        </ScaledModule>
    ),
    credits: (
        <ScaledModule key="credits" t={tile(12)} appearance={appearanceAt(12)} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: gap(tile(12), 'gap-control', '8px') }}>
          <span style={{ ...typeStyleOf(tile(12), 'body-sm'), color: tile(12).neutralText, flex: '1 1 8em', minWidth: 0 }}>{translate('You have 2 credits left')}</span>
          <InspectableLive c="Button" t={tile(12)} v={{ Style: 'Soft', Size: 'SM' }}>{translate('Upgrade')}</InspectableLive>
        </ScaledModule>
    ),
    toggle: (
        <ScaledModule key="toggle" t={tile(13)} appearance={appearanceAt(13)} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <InspectableLive c="Toggle" t={tile(13)} v={{ On: 'True', Size: 'SM' }} toggle="On" />
        </ScaledModule>
    ),
    unsaved: (
        <ScaledModule key="unsaved" t={tile(14)} appearance={appearanceAt(14)}>
          <div className="flex items-start justify-between" style={{ gap: gap(tile(14), 'gap-control', '8px') }}>
            <Well t={tile(14)} size={wellSm} icon="box" />
            <InspectableLive c="CloseButton" t={tile(14)} v={{ Size: 'SM' }} />
          </div>
          <div>
            <p style={{ margin: 0, ...typeStyleOf(tile(14), 'heading-sm'), color: tile(14).neutralText }}>{translate('Unsaved changes')}</p>
            <p style={{ margin: 0, ...typeStyleOf(tile(14), 'body-sm', { leading: true }), color: muted(14) }}>
              {translate('Do you want to save or discard changes?')}
            </p>
          </div>
          <div className="flex flex-col" style={{ gap: gap(tile(14), 'gap-control', '8px') }}>
            <InspectableLive c="Button" t={tile(14)} v={{ Style: 'Outline', Size: 'SM' }} w="100%">{translate('Discard')}</InspectableLive>
            <InspectableLive c="Button" t={tile(14)} v={{ Style: 'Solid', Size: 'SM' }} w="100%">{translate('Save changes')}</InspectableLive>
          </div>
        </ScaledModule>
    ),
    toasts: (
        <ScaledModule key="toasts"
          t={tile(15)}
          appearance={appearanceAt(15)}
          style={{ gap: gap(tile(15), 'gap-group', '16px') }}
        >
          <Toast t={tile(15)} v={{ Status: 'Success' }} w="100%" elev={false} />
          <Toast t={tile(15)} v={{ Status: 'Error' }} w="100%" elev={false} />
        </ScaledModule>
    ),
    tabsProgress: (
        <ScaledModule key="tabsProgress"
          t={tile(16)}
          appearance={appearanceAt(16)}
          style={{ gap: gap(tile(16), 'gap-group', '16px') }}
        >
          <TabMenu t={tile(16)} v={{}} w="100%" />
          <Progress t={tile(16)} v={{}} w="100%" />
        </ScaledModule>
    ),
    sidebar: (
        <ScaledModule key="sidebar" t={tile(18)} appearance={appearanceAt(18)} chrome={false} elev="sm">
          <Sidebar t={tile(18)} v={{}} w="100%" />
        </ScaledModule>
    ),
    inputTag: (
        <ScaledModule key="inputTag" t={tile(19)} appearance={appearanceAt(19)}>
          <InputTag t={tile(19)} v={{}} w="100%" />
        </ScaledModule>
    ),
    checkbox: (
        <ScaledModule key="checkbox" t={tile(20)} appearance={appearanceAt(20)}>
          <CheckboxGroup t={tile(20)} v={{}} />
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
          <div
            className="flex w-full justify-center"
            style={{
              paddingTop: gap(tile(22), 'gap-group', '16px'),
              borderTop: `${strokeRoleOf(tile(22), 'divider', '1px')} solid ${tile(22).borderDefault || tile(22).border}`,
            }}
          >
            <Pagination t={tile(22)} v={{}} />
          </div>
        </ScaledModule>
    ),
    spinner: (
        <ScaledModule key="spinner" t={tile(23)} appearance={appearanceAt(23)} style={{ alignItems: 'center', justifyContent: 'center', minHeight: 72 }}>
          <Spinner t={tile(23)} v={{ Size: 'MD' }} />
        </ScaledModule>
    ),
  }
  // The avatar card: four avatars stacked by the chosen `overlap-*` role. The
  // px is the role's LIVE value (negative), so Variables edits land here too.
  // Each avatar is ringed in the card's own colour — the ring is what keeps a
  // tucked avatar's edge legible against the one it sits under.
  const overlapPx = parseFloat(spacingRoleOf(tile(11), `overlap-${overlapSize}`, '-8px')) || 0
  const cardBg = String(cardSurfaceStyle(tile(11)).background ?? tile(11).surface)
  const teamCard = (
    <ScaledModule key="team" t={tile(11)} appearance={appearanceAt(11)}>
      <div className="flex items-baseline justify-between" style={{ gap: gap(tile(11), 'gap-control', '8px') }}>
        <span style={{ ...typeStyleOf(tile(11), 'label'), color: tile(11).neutralText }}>{translate('Team')}</span>
        <span style={{ ...typeStyleOf(tile(11), 'helper'), color: muted(11), fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          {`overlap-${overlapSize} · ${overlapPx}px`}
        </span>
      </div>
      <TokenInspector component="Avatar">
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
              <Avatar t={tile(11)} v={{ Size: 'LG', Variant: 'Gradient', Hue: String(hue) }} />
            </span>
          ))}
        </div>
      </TokenInspector>
    </ScaledModule>
  )

  const community = (community: { title: string; count: string; by: string; icon: 'users' | 'zap'; index: number }) => (
        <ScaledModule key={community.title} t={tile(community.index)} appearance={appearanceAt(community.index)} chrome={false} elev="sm">
          <Card t={tile(community.index)} v={{}} w="100%" elev={false}>
            <div className="flex flex-col" style={{ gap: gap(tile(community.index), 'gap-control', '8px') }}>
              <Well t={tile(community.index)} size={wellSm} icon={community.icon} />
              <div>
                <p style={{ margin: 0, ...typeStyleOf(tile(community.index), 'label'), color: tile(community.index).neutralText }}>{community.title}</p>
                <p style={{ margin: 0, ...typeStyleOf(tile(community.index), 'helper'), color: muted(community.index) }}>{community.count}</p>
              </div>
              <div className="flex items-center" style={{ gap: gap(tile(community.index), 'gap-tight', '4px') }}>
                <Avatar t={tile(community.index)} v={{ Size: 'XS' }} />
                <span style={{ ...typeStyleOf(tile(community.index), 'helper'), color: muted(community.index) }}>{translate('By')} {community.by}</span>
              </div>
            </div>
          </Card>
        </ScaledModule>
  )
  const indie = community({ title: translate('Indie Hackers'), count: '148', by: 'John', icon: 'users', index: 9 })
  // CHART — how a data widget reads in this system: a metric, a trend badge and
  // an area chart, all on tokens. The line is the brand solid, the area a wash
  // of it, gridlines the decorative border, axis labels the muted ink, the
  // trend a real Success badge. Fixed sample data; the subject is the paint.
  const chart = tile(10)
  const CHART_POINTS = [32, 38, 35, 46, 44, 52, 50, 61, 58, 66, 71, 69, 78]
  const CHART_W = 240
  const CHART_H = 72
  const maxV = Math.max(...CHART_POINTS)
  const minV = Math.min(...CHART_POINTS) - 8
  const xy = CHART_POINTS.map((v, i) => [
    (i / (CHART_POINTS.length - 1)) * CHART_W,
    CHART_H - ((v - minV) / (maxV - minV)) * (CHART_H - 6) - 3,
  ] as const)
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${CHART_W},${CHART_H} L0,${CHART_H} Z`
  const gridColor = chart.borderDefault || chart.border
  const chartCard = (
    <ScaledModule key="chart" t={chart} appearance={appearanceAt(10)}>
      <div className="flex items-start justify-between" style={{ gap: gap(chart, 'gap-control', '8px') }}>
        <div className="flex min-w-0 flex-col">
          <span style={{ ...typeStyleOf(chart, 'heading-lg'), color: chart.neutralText }}>
            98<span style={{ ...typeStyleOf(chart, 'body-sm'), color: muted(10) }}>%</span>
          </span>
          <span style={{ ...typeStyleOf(chart, 'body-sm'), color: muted(10) }}>{translate('Workspace readiness')}</span>
        </div>
        <Badge t={chart} v={{ Style: 'Soft', Color: 'Success', Size: 'SM' }}>+6%</Badge>
      </div>
      <TokenInspector component="Card">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%" height={CHART_H} preserveAspectRatio="none" aria-hidden style={{ display: 'block', overflow: 'visible' }}>
          {[0.25, 0.55, 0.85].map((f) => (
            <line key={f} x1={0} x2={CHART_W} y1={CHART_H * f} y2={CHART_H * f} stroke={gridColor} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill={chart.brandSolid} fillOpacity={0.18} />
          <path d={line} fill="none" stroke={chart.brandSolid} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </TokenInspector>
      <div className="flex justify-between" style={{ ...typeStyleOf(chart, 'helper'), color: muted(10) }}>
        {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'].map((m) => <span key={m}>{translate(m)}</span>)}
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
  // heights, every column ends on one line. Spinner closes the shortest
  // column because a centred spinner reads fine at any height.
  const boardColumns: ReactElement[][] = [
    [mod.createAccount, mod.profile, mod.credits, mod.segmented],
    [mod.buttons, indie, mod.tabsProgress, mod.inputTag, mod.checkbox],
    [mod.verify, mod.sidebar, mod.unsaved, mod.toggle, mod.stepper],
    [mod.badges, chartCard, teamCard, mod.toasts, mod.fileUpload, mod.spinner],
  ]

  return (
    <PhosphorWeightProvider weight={tokensByAppearance.light.iconWeight}>
    <CollageFrameContext.Provider value={{ source: frame.source, display }}>
    {phones ? (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-start gap-3 overflow-x-auto snap-x snap-mandatory pb-1" aria-label={platformCaption}>
        <CollagePack {...pack}>{colorStyle(false)}{typeStyle(false)}</CollagePack>
        <CollagePack {...pack}>{mod.verify}{mod.buttons}{mod.badges}</CollagePack>
        <CollagePack {...pack}>{mod.createAccount}</CollagePack>
        <CollagePack {...pack}>{mod.segmented}{mod.profile}{chartCard}{teamCard}{indie}</CollagePack>
        <CollagePack {...pack}>{mod.credits}{mod.toggle}{mod.unsaved}{mod.toasts}{mod.tabsProgress}</CollagePack>
        <CollagePack {...pack}>{mod.sidebar}{mod.inputTag}{mod.checkbox}{mod.fileUpload}{mod.stepper}{mod.spinner}</CollagePack>
      </div>
      <p className="text-mini text-fg-faint text-center tabular-nums">
        {platformCaption} · {liveGrid.columns} col · page margin {liveGrid.margin} from Grid
      </p>
    </div>
    ) : (
    // Room for unscaled elevation to paint into the scrollport padding —
    // without it Strong's blur reads clipped against the canvas edge.
    <div ref={boardRef} className="w-full" style={{ padding: 10, margin: -10 }}>
      <div className="mx-auto flex flex-col" style={{ width: BOARD_COLUMNS * display + (BOARD_COLUMNS - 1) * gutterPx, gap: gutter }}>
        <div className="flex items-stretch" style={{ gap: gutter }}>
          {colorStyle(true, true)}
          {typeStyle(true, true)}
        </div>
        <div className="flex items-stretch" style={{ gap: gutter }}>
          {boardColumns.map((column, i) => (
            <div key={i} className="flex flex-col" style={{ width: display, gap: gutter }}>
              {fillLast(column)}
            </div>
          ))}
        </div>
      </div>
    </div>
    )}
    </CollageFrameContext.Provider>
    </PhosphorWeightProvider>
  )
}
