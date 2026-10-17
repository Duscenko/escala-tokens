// Docs → Radius: the responsive curve shown as corners, not as a table of step
// names. Two blocks:
//
// - `RadiusResponsiveHero` — one token, three values. Mobile · Tablet · Desktop
//   panels with the range each one covers (from the system's own breakpoint
//   roles) and the px that token resolves to there. The panel matching the
//   window right now is outlined, so resizing shows the token move.
// - `RadiusTokenReference` — every responsive token, its corner magnified 2× at
//   each breakpoint so the small steps stay legible. Three windows = the token
//   steps down; one window = it is fixed everywhere (none, full).
//
// Every px is read from the live ramp (`radius`) through RADIUS_RESPONSIVE, the
// same table CSS, tokens.json and the plugin use. Nothing here picks a number.

import { useEffect, useState } from 'react'
import {
  RADIUS_RESPONSIVE,
  RADIUS_RESPONSIVE_STEPS,
  breakpointRolePx,
  extractBreakpoints,
  type RadiusResponsiveStep,
} from '../../../lib/layoutTokens'
import { CopyButton } from './blocks'

type Viewport = 'mobile' | 'tablet' | 'desktop'
const VIEWPORTS: Viewport[] = ['mobile', 'tablet', 'desktop']
const VIEWPORT_LABEL: Record<Viewport, string> = { mobile: 'Mobile', tablet: 'Tablet', desktop: 'Desktop' }

/** What each token is for — the hint beside its row. */
export const RADIUS_TOKEN_USE: Record<RadiusResponsiveStep, string> = {
  none: 'flush edges, tables',
  sm: 'checkboxes, small chips',
  md: 'inputs, buttons',
  lg: 'menu items, tiles',
  xl: 'cards, popovers',
  '2xl': 'panels, dialogs',
  '3xl': 'large cards',
  '4xl': 'sheets, media',
  '5xl': 'hero surfaces',
  full: 'avatars, pills, toggles',
}

/** The tokens that step down (none and full are fixed on purpose). */
const SCALING = RADIUS_RESPONSIVE_STEPS.filter(
  (s) => RADIUS_RESPONSIVE[s].mobile !== s || RADIUS_RESPONSIVE[s].tablet !== s,
)

function pxOf(radius: Record<string, string>, step: string): number {
  const n = parseFloat(radius[step] ?? '')
  return Number.isFinite(n) ? n : 0
}

export function valuesOf(radius: Record<string, string>, step: RadiusResponsiveStep): Record<Viewport, number> {
  const row = RADIUS_RESPONSIVE[step]
  return { mobile: pxOf(radius, row.mobile), tablet: pxOf(radius, row.tablet), desktop: pxOf(radius, row.desktop) }
}

/** The range each viewport covers, from the system's breakpoint roles —
 *  the same numbers the tablet / mobile media queries are written with. */
function useViewportRanges(breakpointRoles: Record<string, string>, grid: Record<string, string>) {
  const bps = extractBreakpoints(grid)
  const mobileEnd = Math.round(breakpointRolePx(breakpointRoles, bps, 'mobile'))
  const desktopStart = Math.round(breakpointRolePx(breakpointRoles, bps, 'desktop'))
  return {
    ranges: {
      mobile: `up to ${mobileEnd - 1}px`,
      tablet: `${mobileEnd} to ${desktopStart - 1}px`,
      desktop: `${desktopStart}px and up`,
    } as Record<Viewport, string>,
    mobileEnd,
    desktopStart,
  }
}

function useCurrentViewport(mobileEnd: number, desktopStart: number): Viewport {
  const read = () => {
    const w = typeof window === 'undefined' ? desktopStart : window.innerWidth
    return w >= desktopStart ? 'desktop' : w >= mobileEnd ? 'tablet' : 'mobile'
  }
  const [vp, setVp] = useState<Viewport>(read)
  useEffect(() => {
    const onResize = () => setVp(read())
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileEnd, desktopStart])
  return vp
}

export function RadiusResponsiveHero({
  radius, breakpointRoles, grid,
}: { radius: Record<string, string>; breakpointRoles: Record<string, string>; grid: Record<string, string> }) {
  const [step, setStep] = useState<RadiusResponsiveStep>('5xl')
  const { ranges, mobileEnd, desktopStart } = useViewportRanges(breakpointRoles, grid)
  const current = useCurrentViewport(mobileEnd, desktopStart)
  const values = valuesOf(radius, step)
  const distinct = new Set(Object.values(values)).size
  const name = `radius-component-${step}`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Token">
        {SCALING.map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={s === step}
            onClick={() => setStep(s)}
            className={`h-7 px-2.5 rounded-md font-mono text-caption transition-colors ${
              s === step ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg hover:bg-elevated/60'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-mono text-body text-fg">
          {name}
          <CopyButton text={name} label="" title={`Copy ${name}`} />
        </span>
        <span className="rounded-full bg-accent-ui/[0.12] px-2.5 py-0.5 text-caption font-medium text-accent-ui">
          {distinct > 1 ? `Responsive · ${distinct} values` : 'Fixed'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {VIEWPORTS.map((vp) => {
          const active = vp === current
          const px = values[vp]
          return (
            <div
              key={vp}
              className={`flex flex-col overflow-hidden rounded-xl border bg-surface transition-colors ${
                active ? 'border-accent-ui ring-1 ring-accent-ui' : 'border-line'
              }`}
            >
              <div className="flex flex-col gap-0.5 border-b border-line px-4 py-3">
                <span className="flex items-center gap-1.5 text-ui font-medium text-fg">
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-accent-ui" aria-hidden />}
                  {VIEWPORT_LABEL[vp]}
                </span>
                <span className="font-mono text-caption text-fg-faint">{ranges[vp]}</span>
              </div>
              <div className="flex items-center justify-center bg-app px-5 py-6">
                <div
                  className="h-24 w-full bg-fg/85 transition-[border-radius] duration-300 ease-out"
                  style={{ borderRadius: px }}
                />
              </div>
              <div className="border-t border-line px-4 py-2.5 font-mono text-body text-fg tabular-nums">{px}px</div>
            </div>
          )
        })}
      </div>

      <p className="text-body text-fg-muted">
        One token, three values. The outlined panel is your window right now, so resize it and watch the token move.
      </p>
      <p className="font-mono text-caption text-fg-faint">2 media queries in the system, 0 in your markup</p>
    </div>
  )
}

/** One corner, magnified 2× and faded out so only the curve reads. Capped so
 *  `full` (9999px) draws a circle rather than overflowing the window. */
export function CornerWindow({ px }: { px: number }) {
  const SIZE = 104
  if (px * 2 >= SIZE) {
    return <span className="block rounded-full border-dashed border-fg/50 bg-elevated" style={{ width: SIZE, height: SIZE, borderWidth: 1 }} />
  }
  const fade = 'linear-gradient(to right, #000 55%, transparent), linear-gradient(to bottom, #000 55%, transparent)'
  return (
    <span
      className="block border-dashed border-fg/60 bg-elevated"
      style={{
        borderLeftWidth: 1,
        borderTopWidth: 1,
        width: SIZE,
        height: SIZE,
        borderTopLeftRadius: px * 2,
        WebkitMaskImage: fade,
        WebkitMaskComposite: 'source-in',
        maskImage: fade,
        maskComposite: 'intersect',
      }}
    />
  )
}

export function RadiusTokenReference({ radius }: { radius: Record<string, string> }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
        <span className="font-mono text-body text-fg">component</span>
        <span className="font-mono text-caption text-fg-faint">mobile · tablet · desktop, corners shown at 2×</span>
      </div>
      <div className="divide-y divide-line px-5">
        {RADIUS_RESPONSIVE_STEPS.map((step) => {
          const values = valuesOf(radius, step)
          const fixed = values.mobile === values.desktop && values.tablet === values.desktop
          const shown: number[] = fixed ? [values.desktop] : [values.mobile, values.tablet, values.desktop]
          const name = `radius-component-${step}`
          return (
            <div key={step} className="grid grid-cols-[minmax(10rem,1fr)_auto_minmax(8rem,1fr)] items-center gap-6 py-5">
              <span className="flex items-center gap-2 font-mono text-body text-fg">
                component-{step}
                <CopyButton text={name} label="" title={`Copy ${name}`} />
              </span>
              <div className="grid grid-cols-[repeat(3,104px)] gap-6" title={fixed ? 'Same at every breakpoint' : 'Mobile · Tablet · Desktop'}>
                {shown.map((px, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <CornerWindow px={px} />
                    <span className="font-mono text-caption text-fg-muted tabular-nums">{px}px</span>
                  </div>
                ))}
              </div>
              <span className="text-right font-mono text-caption text-fg-faint">{RADIUS_TOKEN_USE[step]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
