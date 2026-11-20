// Presentation frames for blocks: the Figma file's prototype mockups (HeaderNavigation · Prototype 1063:2193,
// SidebarNavigation · Prototype 1065:872). A block is shown where it lives — inside a 1440 desktop window or an
// iPhone 18 Pro — so it reads at its real proportion instead of filling the canvas.
//
// `DesktopWindow` is themed (Surface/layer-1, Border/subtle, the three window dots bound to Status/*/surface-solid).
// `PhoneFrame` copies the file's `iPhone18Pro` (1036:132), `iOSStatusBar` (1036:77) and `iOSHomeIndicator` (1036:131):
// hardware chrome, raw values BY DESIGN ("Hardware chrome: raw values by design" in the file); the status bar ink and
// the battery outline are bound to Content/primary and Border/default, as in the file.
//
// `MockupFit` scales a frame down to the width it is given (CSS `zoom`, so the layout box shrinks too), the way the
// Figma canvas shows a 1440 frame at a glance. Never above 1.
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
import { blockType } from './shared'

const v = (ref: string) => `var(${cssVarOf(ref)})`

export const DESKTOP_FRAME = { width: 1440, height: 900 } as const
/** The Grid's tablet viewport, drawn as the same window: the file has no tablet hardware to copy. */
export const TABLET_FRAME = { width: 768, height: 1024 } as const
export const PHONE_FRAME = { width: 422, height: 894, screenWidth: 402, screenHeight: 874, bezel: 10 } as const

/** Figma `window-bar` + `screen`: a 1440 × 900 desktop window. `screen` styles the screen area (its fill, padding,
 *  alignment); the children are what the prototype places in it. */
export function DesktopWindow({ children, screen, label, size = DESKTOP_FRAME }: { children?: React.ReactNode; screen?: React.CSSProperties; label?: string; size?: { width: number; height: number } }) {
  return (
    <div
      data-mockup="desktop"
      role="img"
      aria-label={label}
      style={{
        width: size.width, height: size.height, flexShrink: 0, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', overflow: 'clip',
        background: v('color.surface.layer-1'),
        border: `${v('stroke.divider')} solid ${v('color.border.subtle')}`,
        borderRadius: v('radius.container'),
      }}
    >
      <div data-part="window-bar" aria-hidden style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-tight'), padding: v('spacing.inset-control'), borderBottom: `${v('stroke.divider')} solid ${v('color.border.subtle')}`, flexShrink: 0 }}>
        {['critical', 'warning', 'success'].map((s) => (
          <span key={s} style={{ width: 8, height: 8, borderRadius: '50%', background: v(`color.status.${s}.surface-solid`) }} />
        ))}
      </div>
      <div data-part="screen" role="presentation" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'clip', position: 'relative', ...screen }}>
        {children}
      </div>
    </div>
  )
}

const HW = { bezel: '#000', edge: '#8e8e93', button: '#78787e', homeBar: '#0e0e0f' } as const

/** The `iPhone18Pro` overlay with its `iOSStatusBar` (9:41) and `iOSHomeIndicator`. `screen` styles the 402 × 812 area
 *  under the status bar; `scrim` lays Surface/overlay over the whole screen (status bar included), as the file's
 *  drawer prototype does, with the children above it. */
export function PhoneFrame({ children, screen, scrim, label }: { children?: React.ReactNode; screen?: React.CSSProperties; scrim?: boolean; label?: string }) {
  const side = (left: number, top: number, height: number): React.CSSProperties => ({ position: 'absolute', left, top, width: 3, height, borderRadius: 1.5, background: HW.button })
  return (
    <div data-mockup="mobile" role="img" aria-label={label} style={{ position: 'relative', width: PHONE_FRAME.width, height: PHONE_FRAME.height, flexShrink: 0 }}>
      <div
        data-part="screen"
        style={{
          position: 'absolute', left: PHONE_FRAME.bezel, top: PHONE_FRAME.bezel, width: PHONE_FRAME.screenWidth, height: PHONE_FRAME.screenHeight,
          borderRadius: 62, overflow: 'clip', display: 'flex', flexDirection: 'column', background: v('color.surface.page'),
        }}
      >
        <StatusBar />
        {scrim && <div aria-hidden style={{ position: 'absolute', inset: 0, background: v('color.surface.overlay'), zIndex: 1 }} />}
        <div
          data-part="content"
          role="presentation"
          style={{
            display: 'flex', flexDirection: 'column', overflow: 'clip',
            ...(scrim ? { position: 'absolute', left: 0, right: 0, top: 62, bottom: 0, zIndex: 2 } : { flex: 1, minHeight: 0, position: 'relative' }),
            ...screen,
          }}
        >
          {children}
        </div>
        <div data-part="home-indicator" aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 34, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8, boxSizing: 'border-box', zIndex: 3 }}>
          <span style={{ width: 144, height: 5, borderRadius: 100, background: HW.homeBar }} />
        </div>
      </div>
      {/* The device overlay: bezel, titanium edge, Dynamic Island, side buttons. */}
      <div aria-hidden style={{ position: 'absolute', left: PHONE_FRAME.bezel, top: PHONE_FRAME.bezel, width: PHONE_FRAME.screenWidth, height: PHONE_FRAME.screenHeight, boxSizing: 'border-box', border: `10px solid ${HW.bezel}`, borderRadius: 62, pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, boxSizing: 'border-box', border: `1.5px solid ${HW.edge}`, borderRadius: 72, pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', left: 148.5, top: 21, width: 125, height: 37, borderRadius: 9999, background: HW.bezel, zIndex: 3 }} />
      <span aria-hidden style={side(-3, 180, 34)} />
      <span aria-hidden style={side(-3, 240, 62)} />
      <span aria-hidden style={side(-3, 316, 62)} />
      <span aria-hidden style={side(422, 260, 96)} />
      <span aria-hidden style={side(422, 560, 58)} />
    </div>
  )
}

/** Figma `iOSStatusBar` Size=lg: 9:41, cellular, wifi, battery. OS chrome. */
function StatusBar() {
  const ink = v('color.content.primary')
  return (
    <div data-part="status-bar" aria-hidden style={{ height: 62, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '21px 16px 19px', boxSizing: 'border-box', position: 'relative', zIndex: 0 }}>
      <span style={{ width: 108, textAlign: 'center', paddingTop: 2, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: 17, color: ink }}>9:41</span>
      <span style={{ width: 108, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, paddingTop: 1 }}>
        <svg width="19" height="12" viewBox="0 0 19 12" fill={ink}><rect x="0" y="7.5" width="3" height="4.5" rx="0.7" /><rect x="5" y="5" width="3" height="7" rx="0.7" /><rect x="10" y="2.5" width="3" height="9.5" rx="0.7" /><rect x="15" y="0" width="3" height="12" rx="0.7" /></svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill={ink}><path d="M8.5 2.3c2.3 0 4.4.9 6 2.4l1.2-1.2C13.8 1.6 11.3.6 8.5.6S3.2 1.6 1.3 3.5l1.2 1.2c1.6-1.5 3.7-2.4 6-2.4Zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.2-1.2C12 4.7 10.3 4 8.5 4S5 4.7 3.7 5.9l1.2 1.2c1-.9 2.2-1.4 3.6-1.4Zm0 3.4c.5 0 1 .2 1.3.5L8.5 11 7.2 9.6c.3-.3.8-.5 1.3-.5Z" /></svg>
        <span style={{ position: 'relative', width: 27, height: 13 }}>
          <span style={{ position: 'absolute', left: 0, top: 0, width: 25, height: 13, boxSizing: 'border-box', border: `1px solid ${v('color.border.default')}`, borderRadius: 4.3 }} />
          <span style={{ position: 'absolute', left: 25.6, top: 4.5, width: 1.4, height: 4, background: v('color.border.default'), borderRadius: '0 1px 1px 0' }} />
          <span style={{ position: 'absolute', left: 2, top: 2, width: 21, height: 9, background: ink, borderRadius: 2.5 }} />
        </span>
      </span>
    </div>
  )
}

/** Scales its single frame down to the available width (never up): `zoom`, so the box it leaves is the scaled one. */
export function MockupFit({ width, children, max = 1 }: { width: number; children: React.ReactNode; max?: number }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(max)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setScale(Math.min(max, e.contentRect.width / width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [width, max])
  return (
    <div ref={ref} style={{ width: '100%', minWidth: 0 }}>
      <div style={{ zoom: scale, width } as React.CSSProperties}>{children}</div>
    </div>
  )
}

// ── Screen prototypes ── the Figma file's `DocWindow` (2265:774, ⚙ Doc Assets) and the 390 mobile frame of every
// `<Screen> Prototype` section (SettingsPage 2227:1261, IssueBoardPage 2231:16964). A screen is built at 1440 × 900
// and shown in the window at 0.75, as the file scales its `_Screen / … · desktop` instance into the Screen slot.

export const DOC_WINDOW = { width: 1080, titleBar: 40, scale: 0.75 } as const
export const MOBILE_SCREEN = { width: 390, height: 844, statusBar: 59, homeIndicator: 34 } as const

/** Figma `DocWindow`: Surface/layer-1, Border/default, Radius/container, Shadow/xl; a 40 px title bar (three
 *  Border/strong dots, the `Url` pill on Surface/muted in Type/caption, a 52 px balance) over the Screen slot.
 *  `screen` is the 1440-wide build; it is drawn at `scale` (0.75) and clipped to the window's viewport. */
export function DocWindow({ url = 'app.ohmewn.com', urlVisible = true, children, screenSize = DESKTOP_FRAME, scale = DOC_WINDOW.scale, label }: {
  url?: string; urlVisible?: boolean; children?: React.ReactNode; screenSize?: { width: number; height: number }; scale?: number; label?: string
}) {
  const w = Math.round(screenSize.width * scale)
  const h = Math.round(screenSize.height * scale)
  return (
    <div
      data-mockup="window"
      aria-label={label}
      role={label ? 'group' : undefined}
      style={{
        width: w, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'clip', position: 'relative',
        background: v('color.surface.layer-1'),
        borderRadius: v('radius.container'),
        boxShadow: v('shadow.xl'),
      }}
    >
      {/* Figma's stroke sits INSIDE the 1080 box, over the title bar and the screen, so it is drawn as an overlay. */}
      <span aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', borderRadius: 'inherit', border: `${v('stroke.divider')} solid ${v('color.border.default')}` }} />
      <div data-part="title-bar" style={{ height: DOC_WINDOW.titleBar, flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: `0 ${v('spacing.inset-control')}`, background: v('color.surface.layer-1'), borderBottom: `${v('stroke.divider')} solid ${v('color.border.subtle')}` }}>
        <span aria-hidden style={{ width: 52, display: 'flex', gap: 8, flexShrink: 0 }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: v('color.border.strong') }} />)}
        </span>
        <span data-part="address" style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
          {urlVisible && (
            <output
              data-part="url"
              aria-label="Address"
              style={{
                display: 'flex', alignItems: 'center', padding: `${v('spacing.gap-tight')} ${v('spacing.inset-control')}`, borderRadius: v('radius.full'),
                background: v('color.surface.muted'), color: v('color.content.secondary'), whiteSpace: 'nowrap', ...blockType('caption'),
              }}
            >
              {url}
            </output>
          )}
        </span>
        <span aria-hidden style={{ width: 52, flexShrink: 0 }} />
      </div>
      <div data-part="screen" style={{ width: w, height: h, overflow: 'clip', position: 'relative', background: v('color.surface.page') }}>
        <div style={{ width: screenSize.width, height: screenSize.height, zoom: scale } as React.CSSProperties}>{children}</div>
      </div>
    </div>
  )
}

/** `iOSStatusBar` / `iOSHomeIndicator` Tone: hardware ink, black on a light page and white on a dark one (raw values
 *  BY DESIGN in the file). The tone is read from the page the frame paints, so it follows Escala Light / Dark. */
function useHardwareTone(ref: React.RefObject<HTMLElement | null>): 'light' | 'dark' {
  const [tone, setTone] = React.useState<'light' | 'dark'>('light')
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof getComputedStyle === 'undefined') return
    const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g)
    if (!m || m.length < 3) return
    const [r, g, b] = m.slice(0, 3).map(Number)
    const next = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5 ? 'dark' : 'light'
    if (next !== tone) setTone(next)
  })
  return tone
}

/** The 390 mobile frame of the Prototype sections: Surface/page, Border/subtle, Radius/overlay, the `iOSStatusBar`
 *  Size=default (59) on top and the `iOSHomeIndicator` (34) at the foot. The screen between them scrolls. */
export function MobileScreenFrame({ children, height = MOBILE_SCREEN.height, label }: { children?: React.ReactNode; height?: number; label?: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const tone = useHardwareTone(ref)
  const hw = tone === 'dark' ? '255,255,255' : '14,14,15'
  const ink = v('color.content.primary')
  return (
    <div
      ref={ref}
      data-mockup="mobile-screen"
      aria-label={label}
      role={label ? 'group' : undefined}
      style={{
        width: MOBILE_SCREEN.width, height, flexShrink: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'clip', position: 'relative',
        background: v('color.surface.page'), border: `${v('stroke.divider')} solid ${v('color.border.subtle')}`, borderRadius: v('radius.overlay'),
      }}
    >
      <div data-part="status-bar" aria-hidden style={{ height: MOBILE_SCREEN.statusBar, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', boxSizing: 'border-box', position: 'relative' }}>
        <span style={{ width: 117, textAlign: 'center', paddingTop: 2, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: 17, lineHeight: '21px', color: ink }}>9:41</span>
        <span style={{ width: 125, height: 37, borderRadius: 9999, background: '#000', flexShrink: 0 }} />
        <span style={{ width: 117, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, paddingTop: 1 }}>
          <svg width="19" height="12" viewBox="0 0 19 12" fill={ink}><rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" /><rect x="5" y="5" width="3.2" height="6.8" rx="0.7" /><rect x="10" y="2.7" width="3.2" height="9.3" rx="0.7" /><rect x="15.8" y="0" width="3.2" height="12" rx="0.7" /></svg>
          <svg width="17" height="12" viewBox="0 0 17 12" fill={ink}><path d="M8.5 2.3c2.3 0 4.4.9 6 2.4l1.2-1.2C13.8 1.6 11.3.6 8.5.6S3.2 1.6 1.3 3.5l1.2 1.2c1.6-1.5 3.7-2.4 6-2.4Zm0 3.4c1.4 0 2.6.5 3.6 1.4l1.2-1.2C12 4.7 10.3 4 8.5 4S5 4.7 3.7 5.9l1.2 1.2c1-.9 2.2-1.4 3.6-1.4Zm0 3.4c.5 0 1 .2 1.3.5L8.5 11 7.2 9.6c.3-.3.8-.5 1.3-.5Z" /></svg>
          <span style={{ position: 'relative', width: 27, height: 13 }}>
            <span style={{ position: 'absolute', left: 0, top: 0, width: 25, height: 13, boxSizing: 'border-box', border: `1px solid rgba(${hw},0.35)`, borderRadius: 4.3 }} />
            <span style={{ position: 'absolute', left: 26, top: 4.5, width: 1.4, height: 4, background: `rgba(${hw},0.4)`, borderRadius: '0 1px 1px 0' }} />
            <span style={{ position: 'absolute', left: 2, top: 2, width: 21, height: 9, background: ink, borderRadius: 2.5 }} />
          </span>
        </span>
      </div>
      <div data-part="screen" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'clip', scrollbarWidth: 'none' }}>
        {children}
      </div>
      <div data-part="home-indicator" aria-hidden style={{ height: MOBILE_SCREEN.homeIndicator, flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8, boxSizing: 'border-box' }}>
        <span style={{ width: 144, height: 5, borderRadius: 100, background: `rgb(${hw})` }} />
      </div>
    </div>
  )
}

