import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Live, SPECIMENS, TokenIcon } from '../../configurator/docs/specimens'
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

const Input = SPECIMENS.Input
const Select = SPECIMENS.Select
const Slider = SPECIMENS.Slider
const SocialLogin = SPECIMENS.SocialLoginButton
const Card = SPECIMENS.Card
const Avatar = SPECIMENS.Avatar
const Badge = SPECIMENS.Badge
const InputOTP = SPECIMENS.InputOTP
const TextLink = SPECIMENS.TextLink
const Segmented = SPECIMENS.SegmentedControl
const ContextMenu = SPECIMENS.ContextMenu
const Spinner = SPECIMENS.Spinner

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
const CONTEXT_MENU_SOURCE = 210

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
        boxShadow: shadowOf(t, 'sm', '0 1px 2px rgba(10,13,18,0.05)'),
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
 */
function ScaledModule({
  t, children, chrome = true, style, sourceWidth = MODULE_SOURCE,
}: {
  t: PreviewTokens
  children: ReactNode
  chrome?: boolean
  style?: CSSProperties
  sourceWidth?: number
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null)
  const scale = MODULE_DISPLAY / sourceWidth
  const frameRadius = (parseFloat(radiusRoleOf(t, 'container', '16px')) || 0) * scale
  const displayHeight = naturalHeight != null ? naturalHeight * scale : 0
  const gutter = px(gap(t, 'gap-control', '8px')) || 8
  const span = Math.max(1, Math.ceil((displayHeight + gutter) / (MASONRY_ROW + gutter)))

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
      className="relative overflow-hidden"
      style={{
        width: MODULE_DISPLAY,
        minWidth: MODULE_DISPLAY,
        maxWidth: MODULE_DISPLAY,
        height: displayHeight || undefined,
        gridRowEnd: `span ${span}`,
        opacity: naturalHeight != null ? 1 : 0,
        borderRadius: chrome ? frameRadius : undefined,
      }}
    >
      <div
        ref={innerRef}
        className="absolute left-0 top-0"
        style={{ width: sourceWidth, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {body}
      </div>
    </div>
  )
}

function Well({
  t, size, icon, iconSize, pill = false,
}: {
  t: PreviewTokens
  size: string
  icon: 'user' | 'users' | 'zap' | 'box'
  iconSize: number
  pill?: boolean
}) {
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
      <TokenIcon t={t} concept={icon} size={iconSize} color={t.neutralText} />
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
    <div
      className="w-full"
      style={{
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
          <Live c="Checkbox" t={t} v={{ Checked: 'True', Size: 'SM' }} toggle="Checked" />
          <Live c="Toggle" t={t} v={{ On: 'True', Size: 'SM' }} toggle="On" />
          <Live c="Radio" t={t} v={{ Checked: 'True', Size: 'SM' }} toggle="Checked" />
          <Spinner t={t} v={{ Size: 'SM' }} />
        </div>
        <Slider t={t} v={{}} w="100%" />
      </ScaledModule>

      <ScaledModule t={t} style={{ flexDirection: 'row', alignItems: 'center' }}>
        {([1, 2, 3, 4, 5] as const).map((i) => (
          <span key={i} style={{ marginLeft: i === 1 ? 0 : -10, zIndex: 6 - i, position: 'relative' }}>
            <Avatar t={t} v={{ Size: 'SM' }} />
          </span>
        ))}
        <span style={{ marginLeft: 8 }}>
          <Badge t={t} v={{ Style: 'Soft', Color: 'Neutral' }}>+5</Badge>
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
          <Live c="Button" t={t} v={{ Style: 'Solid', Size: 'SM' }} w="100%">{translate('Click me')}</Live>
          <Live c="Button" t={t} v={{ Style: 'Soft', Size: 'SM' }} w="100%">{translate('Click me')}</Live>
          <Live c="Button" t={t} v={{ Style: 'Outline', Size: 'SM' }} w="100%">{translate('Click me')}</Live>
          <Live c="Button" t={t} v={{ Style: 'Ghost', Size: 'SM' }} w="100%">{translate('Click me')}</Live>
          <Live c="Button" t={t} v={{ Style: 'Solid', Color: 'Danger', Size: 'SM' }} w="100%">{translate('Click me')}</Live>
          <Live c="Button" t={t} v={{ Style: 'Soft', Color: 'Success', Size: 'SM' }} w="100%">{translate('Click me')}</Live>
        </div>
      </ScaledModule>

      <ScaledModule t={t}>
        <div className="flex justify-end">
          <Live c="CloseButton" t={t} v={{ Size: 'SM' }} />
        </div>
        <div className="flex flex-col items-center text-center" style={{ gap: gap(t, 'gap-tight', '4px') }}>
          <Well t={t} size={wellLg} icon="user" iconSize={18} pill />
          <p style={{ margin: 0, ...typeStyleOf(t, 'heading-sm'), color: t.neutralText }}>{translate('Create an account')}</p>
          <p style={{ margin: 0, ...typeStyleOf(t, 'body-sm', { leading: true }), color: muted }}>
            {translate('Sign in to continue to your workspace.')}
          </p>
        </div>
        <Live c="Button" t={t} v={{ Style: 'Solid', Size: 'MD' }} w="100%">{translate('Get Started')}</Live>
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
          <Live c="Button" t={t} v={{ Style: 'Outline', Size: 'SM' }} w="100%">{translate('Chats')}</Live>
          <Live c="Button" t={t} v={{ Style: 'Outline', Size: 'SM' }} w="100%">{translate('Emails')}</Live>
        </div>
      </ScaledModule>

      <ScaledModule t={t}>
        <div className="flex items-start" style={{ gap: gap(t, 'gap-control', '8px') }}>
          <span
            aria-hidden
            style={{
              width: wellSm, height: wellSm, flexShrink: 0,
              borderRadius: radiusRoleOf(t, 'control', '8px'),
              background: t.coverGradient || t.brandSolid,
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center" style={{ gap: gap(t, 'gap-tight', '4px') }}>
              <span style={{ ...typeStyleOf(t, 'label'), color: t.neutralText }}>{projectName}</span>
              <TokenIcon t={t} concept="check" size={12} color={t.brandSolid} />
            </div>
            <p style={{ margin: 0, ...typeStyleOf(t, 'helper'), color: muted }}>{handle}</p>
          </div>
        </div>
        <p style={{ margin: 0, ...typeStyleOf(t, 'body-sm', { leading: true }), color: t.neutralText }}>
          {translate('One payload underneath: the same JSON Figma, CSS, and an agent all read.')}
        </p>
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
      </ScaledModule>

      {([
        { title: translate('Indie Hackers'), count: '148', by: 'John', icon: 'users' as const },
        { title: translate('AI Builders'), count: '362', by: 'Martha', icon: 'zap' as const },
      ]).map((community) => (
        <ScaledModule key={community.title} t={t} chrome={false}>
          <Card t={t} v={{}} w="100%" elev="sm">
            <div className="flex flex-col" style={{ gap: gap(t, 'gap-control', '8px') }}>
              <Well t={t} size={wellSm} icon={community.icon} iconSize={16} />
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

      <ScaledModule t={t} chrome={false} sourceWidth={CONTEXT_MENU_SOURCE}>
        <ContextMenu t={t} v={{}} />
      </ScaledModule>

      <ScaledModule t={t} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...typeStyleOf(t, 'body-sm'), color: t.neutralText }}>{translate('You have 2 credits left')}</span>
        <Live c="Button" t={t} v={{ Style: 'Soft', Size: 'SM' }}>{translate('Upgrade')}</Live>
      </ScaledModule>

      <ScaledModule t={t} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Live c="Toggle" t={t} v={{ On: 'True', Size: 'SM' }} toggle="On" />
      </ScaledModule>

      <ScaledModule t={t}>
        <div className="flex items-start justify-between" style={{ gap: gap(t, 'gap-control', '8px') }}>
          <Well t={t} size={wellSm} icon="box" iconSize={14} />
          <Live c="CloseButton" t={t} v={{ Size: 'SM' }} />
        </div>
        <div>
          <p style={{ margin: 0, ...typeStyleOf(t, 'heading-sm'), color: t.neutralText }}>{translate('Unsaved changes')}</p>
          <p style={{ margin: 0, ...typeStyleOf(t, 'body-sm', { leading: true }), color: muted }}>
            {translate('Do you want to save or discard changes?')}
          </p>
        </div>
        <div className="flex justify-end" style={{ gap: gap(t, 'gap-control', '8px') }}>
          <Live c="Button" t={t} v={{ Style: 'Outline', Size: 'SM' }}>{translate('Discard')}</Live>
          <Live c="Button" t={t} v={{ Style: 'Solid', Size: 'SM' }}>{translate('Save changes')}</Live>
        </div>
      </ScaledModule>
    </div>
  )
}
