import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AVATAR_STACK_HUES, Live, PhosphorWeightProvider, SPECIMENS, TokenIcon, type SpecimenProps } from '../../configurator/docs/specimens'
import { TokenInspector, inspectGroupAttrs, useInspectorActive } from './TokenInspector'
import {
  cardSurfaceStyle,
  radiusRoleOf,
  shadowOf,
  sizeRoleOf,
  spacingRoleOf,
  strokeRoleOf,
  typeStyleOf,
} from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'
import { useI18n } from '../../../lib/i18n'

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
    <TokenInspector component={key}>{Specimen(p)}</TokenInspector>
  )
  Wrapped.displayName = `Inspectable(${key})`
  return Wrapped
}

const Input = inspectable('Input')
const Select = inspectable('Select')
const Slider = inspectable('Slider')
const SocialLogin = inspectable('SocialLoginButton')
const Card = inspectable('Card')
const Avatar = inspectable('Avatar')
const Badge = inspectable('Badge')
const InputOTP = inspectable('InputOTP')
const TextLink = inspectable('TextLink')
const Segmented = inspectable('SegmentedControl')
const ContextMenu = inspectable('ContextMenu')
const Spinner = inspectable('Spinner')
const InlineAlert = inspectable('InlineAlert')
const TabMenu = inspectable('TabMenu')
const Progress = inspectable('Progress')
const StatusBadge = inspectable('StatusBadge')
const Chip = inspectable('Chip')

/** `Live` already carries the catalogue key as `c`, so the marker reads it
 *  straight off the prop rather than being restated. */
function InspectableLive(p: Parameters<typeof Live>[0]) {
  return <TokenInspector component={p.c}><Live {...p} /></TokenInspector>
}

/**
 * Specimens lay out at a real mobile card width (Input 260, SocialLogin 280
 * with `w="100%"`). Never re-flow that type into the thumbnail column.
 */
const MODULE_SOURCE = 260
/**
 * Thumbnail column. Small on purpose: the canvas is an impression of many
 * modules at once, not three stretched desktop tiles. 156 packs 5–7 across a
 * typical Themes canvas; CSS columns cannot do this (unconstrained height
 * fills one stack).
 */
const MODULE_DISPLAY = 156
/** Sub-row unit for the masonry `grid-row: span` trick. */
const MASONRY_ROW = 4

const gap = (t: PreviewTokens, role: string, fb: string) => spacingRoleOf(t, role, fb)

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
  t, children, chrome = true, clip = true, elev, style, sourceWidth = MODULE_SOURCE,
}: {
  t: PreviewTokens
  children: ReactNode
  chrome?: boolean
  /** When false the photograph can spill past the frame — floating menus
   *  (ContextMenu) have no card of their own and break when squeezed into one. */
  clip?: boolean
  /** Shadow ramp step on the unscaled frame. Defaults to `sm` when chrome. */
  elev?: string | false
  style?: CSSProperties
  sourceWidth?: number
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null)
  // A module IS the container Inspector mode groups by — the cluster of
  // controls that read a set of roles together. The frame is already a real
  // box, so this is an attribute and not a wrapper (see `inspectGroupAttrs`),
  // and the badge derives its name and its members from what's inside rather
  // than from a label passed down here.
  const inspecting = useInspectorActive()
  const scale = MODULE_DISPLAY / sourceWidth
  const frameRadius = (parseFloat(radiusRoleOf(t, 'container', '16px')) || 0) * scale
  const displayHeight = naturalHeight != null ? naturalHeight * scale : 0
  const gutter = px(gap(t, 'gap-control', '8px')) || 8
  const span = Math.max(1, Math.ceil((displayHeight + gutter) / (MASONRY_ROW + gutter)))
  const elevation = elev === false ? undefined : elev ?? (chrome ? 'sm' : undefined)
  const frameShadow = elevation
    ? shadowOf(t, elevation, '0 1px 2px rgba(10,13,18,0.05)')
    : undefined

  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height
      if (h) setNaturalHeight(h)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const body = chrome ? <ModuleSurface t={t} style={style}>{children}</ModuleSurface> : children

  return (
    <div
      className="relative overflow-visible"
      {...inspectGroupAttrs(inspecting)}
      style={{
        width: MODULE_DISPLAY,
        minWidth: MODULE_DISPLAY,
        maxWidth: MODULE_DISPLAY,
        height: displayHeight || undefined,
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
          width: sourceWidth,
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

/**
 * Packed wall of mobile-sized catalogue modules — the Theme Preview impression
 * of the system as a set, not as three stretched desktop tiles.
 */
export function SystemCollage({
  t, projectName,
}: {
  t: PreviewTokens
  projectName: string
}) {
  const { t: translate } = useI18n()
  const muted = t.fgMuted || '#717680'
  const handle = `@${projectName.replace(/\s+/g, '_').toLowerCase()}`
  const gutter = gap(t, 'gap-control', '8px')
  const wellLg = sizeRoleOf(t, 'control', '40px')
  const wellSm = sizeRoleOf(t, 'compact', '32px')

  return (
    <PhosphorWeightProvider weight={t.iconWeight}>
    <div
      className="w-full"
      style={{
        // Room for unscaled elevation to paint into the scrollport padding —
        // without it Strong's blur reads clipped against the canvas edge.
        padding: 10,
        margin: -10,
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, ${MODULE_DISPLAY}px)`,
        gridAutoRows: MASONRY_ROW,
        gap: gutter,
        alignItems: 'start',
        justifyContent: 'center',
      }}
    >
      <ScaledModule t={t}>
        <Input t={t} v={{ Type: 'E-Mail', State: 'Filled' }} w="100%" />
        <div className="flex min-w-0 flex-col" style={{ gap: gap(t, 'gap-tight', '4px') }}>
          <span style={{ ...typeStyleOf(t, 'label'), color: t.neutralText }}>{translate('State')}</span>
          <Select t={t} v={{}} w="100%" />
        </div>
        <div className="flex flex-wrap items-center" style={{ gap: gap(t, 'gap-control', '8px') }}>
          <InspectableLive c="Checkbox" t={t} v={{ Checked: 'True', Size: 'SM' }} toggle="Checked" />
          <InspectableLive c="Toggle" t={t} v={{ On: 'True', Size: 'SM' }} toggle="On" />
          <InspectableLive c="Radio" t={t} v={{ Checked: 'True', Size: 'SM' }} toggle="Checked" />
          <Spinner t={t} v={{ Size: 'SM' }} />
        </div>
        <Slider t={t} v={{}} w="100%" />
      </ScaledModule>

      <ScaledModule t={t} style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Three hue-rotated gradient avatars, then ONE accent-tint + initials
            default, then the count. Both avatar kinds are shown; the run of
            three keeps the gradient family (see AVATAR_STACK_HUES) readable as
            a set before the default breaks the rhythm. */}
        {AVATAR_STACK_HUES.slice(0, 4).map((hue, i) => (
          <span key={hue} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 6 - i, position: 'relative' }}>
            <Avatar
              t={t}
              v={i < 3
                ? { Size: 'SM', Variant: 'Gradient', Hue: String(hue) }
                : { Size: 'SM' }}
            />
          </span>
        ))}
        <span style={{ marginLeft: 8 }}>
          <Badge t={t} v={{ Style: 'Soft', Color: 'Neutral', Dot: 'False' }}>+5</Badge>
        </span>
      </ScaledModule>

      <ScaledModule t={t}>
        <span style={{ ...typeStyleOf(t, 'heading-sm'), color: t.neutralText }}>{translate('Verify account')}</span>
        <InputOTP t={t} v={{ State: 'Filled', Size: 'SM' }} />
        <span style={{ ...typeStyleOf(t, 'body-sm'), color: muted }}>
          {translate('Didn’t get a code?')}{' '}
          <TextLink t={t} v={{}}>{translate('Resend')}</TextLink>
        </span>
      </ScaledModule>

      <ScaledModule t={t}>
        <div className="grid grid-cols-2" style={{ gap: gap(t, 'gap-control', '8px') }}>
          <InspectableLive c="Button" t={t} v={{ Style: 'Solid', Size: 'SM' }} w="100%">{translate('Click me')}</InspectableLive>
          <InspectableLive c="Button" t={t} v={{ Style: 'Soft', Size: 'SM' }} w="100%">{translate('Click me')}</InspectableLive>
          <InspectableLive c="Button" t={t} v={{ Style: 'Outline', Size: 'SM' }} w="100%">{translate('Click me')}</InspectableLive>
          <InspectableLive c="Button" t={t} v={{ Style: 'Ghost', Size: 'SM' }} w="100%">{translate('Click me')}</InspectableLive>
          {/* Destructive and confirming are the SAME control with a different
              severity, so they're painted the same way — always `Solid`, so
              the fill IS `status.<sev>.surface-solid` verbatim. Whatever the
              user assigns that role in Token Details (an alpha primitive or a
              solid tone) is exactly what shows here — no `statusAction` layer
              in between deciding to wash it. The token is the control. */}
          <InspectableLive c="Button" t={t} v={{ Style: 'Solid', Color: 'Danger', Size: 'SM' }} w="100%">{translate('Critical')}</InspectableLive>
          <InspectableLive c="Button" t={t} v={{ Style: 'Solid', Color: 'Success', Size: 'SM' }} w="100%">{translate('Success')}</InspectableLive>
        </div>
      </ScaledModule>

      <ScaledModule t={t}>
        <div className="grid grid-cols-2" style={{ gap: gap(t, 'gap-control', '8px') }}>
          <Badge t={t} v={{ Style: 'Solid', Color: 'Error', Size: 'SM' }}>{translate('Critical')}</Badge>
          <Badge t={t} v={{ Style: 'Solid', Color: 'Warning', Size: 'SM' }}>{translate('Warning')}</Badge>
          <Badge t={t} v={{ Style: 'Solid', Color: 'Success', Size: 'SM' }}>{translate('Success')}</Badge>
          <Badge t={t} v={{ Style: 'Solid', Color: 'Info', Size: 'SM' }}>{translate('Info')}</Badge>
        </div>
      </ScaledModule>

      <ScaledModule t={t}>
        <div className="flex justify-end">
          <InspectableLive c="CloseButton" t={t} v={{ Size: 'SM' }} />
        </div>
        <div className="flex flex-col items-center text-center" style={{ gap: gap(t, 'gap-tight', '4px') }}>
          <GradientAvatar t={t} size={wellLg} />
          <p style={{ margin: 0, ...typeStyleOf(t, 'heading-sm'), color: t.neutralText }}>{translate('Create an account')}</p>
          <p style={{ margin: 0, ...typeStyleOf(t, 'body-sm', { leading: true }), color: muted }}>
            {translate('Sign in to continue to your workspace.')}
          </p>
        </div>
        <InspectableLive c="Button" t={t} v={{ Style: 'Solid', Size: 'MD' }} w="100%">{translate('Get Started')}</InspectableLive>
        <div className="flex items-center" style={{ gap: gap(t, 'gap-control', '8px') }}>
          <span style={{ flex: 1, height: 1, background: t.borderDefault || t.border }} />
          <span style={{ ...typeStyleOf(t, 'caption'), color: muted }}>{translate('or')}</span>
          <span style={{ flex: 1, height: 1, background: t.borderDefault || t.border }} />
        </div>
        <SocialLogin t={t} v={{ Provider: 'Google' }} w="100%" />
        <SocialLogin t={t} v={{ Provider: 'Apple' }} w="100%" />
      </ScaledModule>

      <ScaledModule t={t}>
        <Segmented t={t} v={{ Size: 'SM' }} />
      </ScaledModule>

      <ScaledModule t={t}>
        <div className="grid grid-cols-2" style={{ gap: gap(t, 'gap-control', '8px') }}>
          <InspectableLive c="Button" t={t} v={{ Style: 'Outline', Size: 'SM' }} w="100%">{translate('Chats')}</InspectableLive>
          <InspectableLive c="Button" t={t} v={{ Style: 'Outline', Size: 'SM' }} w="100%">{translate('Emails')}</InspectableLive>
        </div>
      </ScaledModule>

      <ScaledModule t={t}>
        <div className="flex items-start" style={{ gap: gap(t, 'gap-control', '8px') }}>
          <TokenInspector component="Avatar">
            <span
              aria-hidden
              style={{
                width: wellSm, height: wellSm, flexShrink: 0,
                borderRadius: radiusRoleOf(t, 'control', '8px'),
                background: t.coverGradient || t.brandSolid,
              }}
            />
          </TokenInspector>
          <div className="min-w-0 flex-1">
            <TokenInspector component="Badge">
              <div className="flex items-center" style={{ gap: gap(t, 'gap-tight', '4px') }}>
                <span style={{ ...typeStyleOf(t, 'label'), color: t.neutralText }}>{projectName}</span>
                <TokenIcon t={t} concept="check" size={12} color={t.brandSolid} />
              </div>
            </TokenInspector>
            <TokenInspector component="TextLink">
              <p style={{ margin: 0, ...typeStyleOf(t, 'helper'), color: muted }}>{handle}</p>
            </TokenInspector>
          </div>
        </div>
        <TokenInspector component="InlineAlert">
          <p style={{ margin: 0, ...typeStyleOf(t, 'body-sm', { leading: true }), color: t.neutralText }}>
            {translate('One payload underneath: the same JSON Figma, CSS, and an agent all read.')}
          </p>
        </TokenInspector>
        <TokenInspector component="Badge">
          <div className="flex" style={{ gap: gap(t, 'gap-group', '16px') }}>
            <div>
              <span style={{ ...typeStyleOf(t, 'heading-sm'), color: t.neutralText }}>4</span>
              <span style={{ marginLeft: 6, ...typeStyleOf(t, 'helper'), color: muted }}>{translate('Following')}</span>
            </div>
            <div>
              <span style={{ ...typeStyleOf(t, 'heading-sm'), color: t.neutralText }}>12.4K</span>
              <span style={{ marginLeft: 6, ...typeStyleOf(t, 'helper'), color: muted }}>{translate('Followers')}</span>
            </div>
          </div>
        </TokenInspector>
      </ScaledModule>

      {([
        { title: translate('Indie Hackers'), count: '148', by: 'John', icon: 'users' as const },
        { title: translate('AI Builders'), count: '362', by: 'Martha', icon: 'zap' as const },
      ]).map((community) => (
        <ScaledModule key={community.title} t={t} chrome={false} elev="sm">
          <Card t={t} v={{}} w="100%" elev={false}>
            <div className="flex flex-col" style={{ gap: gap(t, 'gap-control', '8px') }}>
              <Well t={t} size={wellSm} icon={community.icon} />
              <div>
                <p style={{ margin: 0, ...typeStyleOf(t, 'label'), color: t.neutralText }}>{community.title}</p>
                <p style={{ margin: 0, ...typeStyleOf(t, 'helper'), color: muted }}>{community.count}</p>
              </div>
              <div className="flex items-center" style={{ gap: gap(t, 'gap-tight', '4px') }}>
                <Avatar t={t} v={{ Size: 'XS' }} />
                <span style={{ ...typeStyleOf(t, 'helper'), color: muted }}>{translate('By')} {community.by}</span>
              </div>
            </div>
          </Card>
        </ScaledModule>
      ))}

      {/* Floating menu — same column width as every other module (`w=100%`
          → MODULE_SOURCE). Elevation on the unscaled frame; specimen shadow off. */}
      <ScaledModule t={t} chrome={false} clip={false} elev="sm">
        <ContextMenu t={t} v={{}} w="100%" elev={false} />
      </ScaledModule>

      <ScaledModule t={t} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...typeStyleOf(t, 'body-sm'), color: t.neutralText }}>{translate('You have 2 credits left')}</span>
        <InspectableLive c="Button" t={t} v={{ Style: 'Soft', Size: 'SM' }}>{translate('Upgrade')}</InspectableLive>
      </ScaledModule>

      <ScaledModule t={t} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <InspectableLive c="Toggle" t={t} v={{ On: 'True', Size: 'SM' }} toggle="On" />
      </ScaledModule>

      <ScaledModule t={t}>
        <div className="flex items-start justify-between" style={{ gap: gap(t, 'gap-control', '8px') }}>
          <Well t={t} size={wellSm} icon="box" />
          <InspectableLive c="CloseButton" t={t} v={{ Size: 'SM' }} />
        </div>
        <div>
          <p style={{ margin: 0, ...typeStyleOf(t, 'heading-sm'), color: t.neutralText }}>{translate('Unsaved changes')}</p>
          <p style={{ margin: 0, ...typeStyleOf(t, 'body-sm', { leading: true }), color: muted }}>
            {translate('Do you want to save or discard changes?')}
          </p>
        </div>
        <div className="flex flex-col" style={{ gap: gap(t, 'gap-control', '8px') }}>
          <InspectableLive c="Button" t={t} v={{ Style: 'Outline', Size: 'SM' }} w="100%">{translate('Discard')}</InspectableLive>
          <InspectableLive c="Button" t={t} v={{ Style: 'Solid', Size: 'SM' }} w="100%">{translate('Save changes')}</InspectableLive>
        </div>
      </ScaledModule>

      {/* Feedback — every `status.*` role at once: the two tints, their ink and
          their border. The fastest surface for judging a retinted severity. */}
      <ScaledModule t={t}>
        <InlineAlert t={t} v={{ Status: 'Success' }} w="100%" nested />
        <InlineAlert t={t} v={{ Status: 'Error' }} w="100%" nested />
      </ScaledModule>

      {/* Navigation + progress — accent underline, `neutralFill` track,
          `brandSolid` fill. */}
      <ScaledModule t={t}>
        <TabMenu t={t} v={{}} />
        <Progress t={t} v={{}} />
      </ScaledModule>

      {/* Status pills — one per severity plus a brand chip, so a retint of any
          status or accent family is visible side by side. */}
      <ScaledModule t={t} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        <StatusBadge t={t} v={{ Status: 'Online' }} />
        <StatusBadge t={t} v={{ Status: 'Busy' }} />
        <Chip t={t} v={{ Selected: 'True' }} />
      </ScaledModule>
    </div>
    </PhosphorWeightProvider>
  )
}
