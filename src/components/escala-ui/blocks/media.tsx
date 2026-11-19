// Escala blocks · MediaPlayer, MediaPlayerTrack and NowPlaying. The Figma page `❖ MediaPlayer & NowPlaying (PRO)` (2397:83):
// MediaPlayer (sets Playing=false · true, 2402:139 / 2402:209), MediaPlayerTrack (State Default · Hover · Focused · Current,
// 2402:42…52) and NowPlaying (Playing=false · true, 2402:57 / 2402:81). Each is an arrangement of escala-ui components
// (Image, IconButton, Slider, Separator) in role tokens; nothing here is drawn with a value of its own except the two listed
// in media.contract.json (the player card's 40 corner, which the file draws raw).
//
// Behaviour: a clock plays the 24-second sample (no audio element: the sample has no sound file); seek and volume are
// Sliders that announce "0:12 of 0:24" and "70%"; Play/Pause toggles its name; the current row carries aria-current.
// Motion (contract in media.contract.json): the equalizer loops on `use-loop` while playing, the play glyph swaps on
// `use-toggle`, the title enters on `use-disclosure-in`, the current rail glides on `use-travel-in`.
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
import { glyph } from '../../../lib/icons'
import { blockType } from './shared'
import { IconButton } from '../icon-button'
import { Image } from '../image'
import { Separator } from '../separator'
import { Slider } from '../slider'
import { ALBUM_WAVES, COVER_ALPINE } from './mediaSamples'

const v = (ref: string) => `var(${cssVarOf(ref)})`
const type = blockType
const motion = (role: string) => `var(--motion-${role}-duration) var(--motion-${role}-easing)`
const primary = v('color.content.primary')
const secondary = v('color.content.secondary')

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const icon = (name: Parameters<typeof glyph>[0]) => glyph(name)

// ── MediaPlayerTrack ─────────────────────────────────────────────────────────

export const MEDIA_PLAYER_TRACK_STATES = ['Default', 'Hover', 'Focused', 'Current'] as const
export type MediaPlayerTrackState = (typeof MEDIA_PLAYER_TRACK_STATES)[number]

export interface MediaPlayerTrackProps extends Omit<React.ComponentProps<'button'>, 'title'> {
  title?: string
  duration?: string
  /** Figma State. Default / Hover / Focused come from the pointer and keyboard; `forceState` pins one (docs). */
  current?: boolean
  forceState?: MediaPlayerTrackState
}

/** Figma MediaPlayerTrack (2402:56): a playlist row, Size/control-lg high, Radius/action. The current row carries aria-current and the 2 × 16 rail. */
export function MediaPlayerTrack({ title = 'Morning tide', duration = '0:24', current = false, forceState, style, ...props }: MediaPlayerTrackProps) {
  const [hover, setHover] = React.useState(false)
  const isCurrent = current || forceState === 'Current'
  const isHover = hover || forceState === 'Hover'
  const focused = forceState === 'Focused'
  return (
    <button
      type="button"
      data-escala="MediaPlayerTrack"
      data-state={isCurrent ? 'Current' : focused ? 'Focused' : isHover ? 'Hover' : 'Default'}
      aria-current={isCurrent ? 'true' : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="outline-none focus-visible:outline-solid focus-visible:[outline-width:var(--stroke-focus)] focus-visible:[outline-color:var(--color-border-ring-default)] focus-visible:[outline-offset:calc(var(--stroke-divider)*-1)]"
      style={{
        position: 'relative', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: v('spacing.gap-control'),
        width: '100%', height: v('size.touch'), padding: `0 ${v('spacing.inset-control')}`, border: 0, cursor: 'pointer', textAlign: 'left',
        borderRadius: v('radius.action'),
        background: isCurrent ? v('color.surface.selected') : isHover ? v('color.action.ghost.hover') : 'transparent',
        color: isCurrent ? primary : secondary,
        outline: focused ? `${v('stroke.focus')} solid ${v('color.border.ring.default')}` : undefined,
        outlineOffset: focused ? `calc(${v('stroke.divider')} * -1)` : undefined,
        ...style,
      }}
      {...props}
    >
      <span style={{ ...type('body-md'), flex: '1 1 0', minWidth: 1, color: isCurrent ? primary : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      <span style={{ ...type('body-sm'), color: secondary, whiteSpace: 'nowrap' }}>{duration}</span>
      {isCurrent && (
        <span aria-hidden style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: v('stroke.focus'), height: `calc(${v('spacing.4')} * 1)`,
          borderRadius: v('radius.full'), background: v('color.action.primary.default'), transition: `opacity ${motion('use-travel-in')}`,
        }} />
      )}
    </button>
  )
}

// ── Equalizer (NowPlaying's decorative bars) ─────────────────────────────────

function Equalizer({ playing }: { playing: boolean }) {
  const bars = [0.6, 1, 0.45, 0.8]
  return (
    <span aria-hidden data-part="NowPlaying.equalizer" style={{ display: 'inline-flex', alignItems: 'flex-end', gap: `calc(${v('spacing.1')} * 1)`, width: v('icon.medium'), height: v('icon.medium'), flexShrink: 0, color: playing ? v('color.content.accent') : v('color.content.subtle') }}>
      {bars.map((h, i) => (
        <span key={i} style={{
          flex: '1 1 0', height: `${h * 100}%`, background: 'currentColor', borderRadius: v('radius.control'), transformOrigin: 'bottom',
          animation: playing ? `escala-eq var(--motion-use-loop-duration) var(--motion-use-loop-easing) ${i * -150}ms infinite alternate` : undefined,
        }} />
      ))}
      <style>{'@keyframes escala-eq{from{transform:scaleY(.35)}to{transform:scaleY(1)}}@media (prefers-reduced-motion:reduce){[data-part="NowPlaying.equalizer"] span{animation:none!important}}'}</style>
    </span>
  )
}

// ── Transport ────────────────────────────────────────────────────────────────

function PlayButton({ playing, onClick }: { playing: boolean; onClick?: () => void }) {
  return (
    <IconButton
      variant="secondary" appearance="solid" size="lg" aria-label={playing ? 'Pause' : 'Play'} onClick={onClick}
      icon={<span key={String(playing)} style={{ display: 'contents' }}>{icon(playing ? 'pause' : 'play')}</span>}
      style={{ borderRadius: v('radius.full') }}
    />
  )
}

// ── NowPlaying ───────────────────────────────────────────────────────────────

export interface NowPlayingProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  playing?: boolean
  defaultPlaying?: boolean
  onPlayingChange?: (playing: boolean) => void
  title?: string
  artist?: string
  artwork?: string
  onNext?: () => void
}

/** Figma NowPlaying (2402:102): a compact floating player on Surface/layer-2 · Border/default · Radius/overlay · Shadow/lg. */
export function NowPlaying({ playing, defaultPlaying = true, onPlayingChange, title = 'Undertow', artist = 'Hollis Reed', artwork = ALBUM_WAVES, onNext, style, ...props }: NowPlayingProps) {
  const [inner, setInner] = React.useState(defaultPlaying)
  const on = playing ?? inner
  const toggle = () => { setInner(!on); onPlayingChange?.(!on) }
  return (
    <div
      role="group" aria-label="Now playing" data-escala="NowPlaying" data-playing={on ? 'true' : 'false'}
      style={{
        boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', gap: v('spacing.gap-control'), padding: v('spacing.inset-control'),
        background: v('color.surface.layer-2'), border: `${v('stroke.divider')} solid ${v('color.border.default')}`,
        borderRadius: v('radius.overlay'), boxShadow: v('shadow.lg'), ...style,
      }}
      {...props}
    >
      <div style={{ width: `calc(${v('spacing.8')} * 1.75)`, flexShrink: 0, borderRadius: v('radius.action'), overflow: 'hidden', background: v('color.surface.muted') }}>
        <Image ratio="1:1" src={artwork} alt="" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', paddingRight: v('spacing.gap-group'), whiteSpace: 'nowrap' }}>
        <span style={{ ...type('label'), color: primary }}>{title}</span>
        <span style={{ ...type('body-sm'), color: secondary }}>{artist}</span>
      </div>
      <Equalizer playing={on} />
      <PlayButton playing={on} onClick={toggle} />
      <IconButton variant="secondary" appearance="ghost" aria-label="Next track" icon={icon('skip-forward')} onClick={onNext} />
    </div>
  )
}

// ── MediaPlayer ──────────────────────────────────────────────────────────────

export interface MediaPlayerTrackData { id: string; title: string; subtitle?: string; seconds?: number }
export const MEDIA_PLAYER_TRACKS: MediaPlayerTrackData[] = [
  { id: 'morning-tide', title: 'Morning tide', seconds: 24 },
  { id: 'glass-garden', title: 'Glass garden', seconds: 24 },
  { id: 'after-the-rain', title: 'After the rain', subtitle: 'Arc Sessions · Original loop', seconds: 24 },
]

export interface MediaPlayerProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** Figma Playing. Controlled, or `defaultPlaying`. */
  playing?: boolean
  defaultPlaying?: boolean
  onPlayingChange?: (playing: boolean) => void
  tracks?: MediaPlayerTrackData[]
  /** The row that is playing (an id from `tracks`). */
  currentId?: string
  cover?: string
  /** The seek position, in seconds (controlled by the clock when left out). */
  defaultTime?: number
}

/** Figma MediaPlayer (2402:277): cover, title and transport, seek, volume and a playlist, in one 640 card. */
export function MediaPlayer({
  playing, defaultPlaying = true, onPlayingChange, tracks = MEDIA_PLAYER_TRACKS, currentId, cover = COVER_ALPINE, defaultTime = 12, style, ...props
}: MediaPlayerProps) {
  const [innerPlaying, setInnerPlaying] = React.useState(defaultPlaying)
  const on = playing ?? innerPlaying
  const [id, setId] = React.useState(currentId ?? tracks[tracks.length - 1]?.id)
  const active = currentId ?? id
  const track = tracks.find((t) => t.id === active) ?? tracks[0]
  const total = track?.seconds ?? 24
  const [time, setTime] = React.useState(defaultTime)
  const [volume, setVolume] = React.useState(70)
  const [muted, setMuted] = React.useState(false)
  const [pick, setPick] = React.useState(0)
  React.useEffect(() => {
    if (!on) return
    const t = setInterval(() => setTime((s) => (s + 0.25 >= total ? 0 : s + 0.25)), 250)
    return () => clearInterval(t)
  }, [on, total])
  const toggle = () => { setInnerPlaying(!on); onPlayingChange?.(!on) }
  const step = (d: number) => {
    const i = tracks.findIndex((t) => t.id === active)
    const next = tracks[(i + d + tracks.length) % tracks.length]
    setId(next.id); setTime(0); setPick((n) => n + 1)
  }
  return (
    <div
      role="region" aria-label="Media player" data-escala="MediaPlayer" data-playing={on ? 'true' : 'false'}
      style={{
        boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group'), width: `calc(${v('spacing.32')} * 5)`, maxWidth: '100%',
        padding: v('spacing.inset-surface'), background: v('color.surface.layer-1'),
        border: `${v('stroke.divider')} solid ${v('color.border.default')}`, borderRadius: `calc(${v('spacing.8')} * 1.25)`, ...style,
      }}
      {...props}
    >
      <div style={{ borderRadius: v('radius.action'), overflow: 'hidden', background: v('color.surface.muted') }}>
        <Image ratio="16:9" src={cover} alt="" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div key={pick} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: v('spacing.gap-tight'), whiteSpace: 'nowrap' }}>
          <span style={{ ...type('heading-xs'), color: primary }}>{track?.title}</span>
          <span style={{ ...type('body-sm'), color: secondary }}>{track?.subtitle ?? 'Arc Sessions · Original loop'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-control') }}>
          <IconButton variant="secondary" appearance="ghost" aria-label="Previous track" icon={icon('skip-back')} onClick={() => step(-1)} />
          <PlayButton playing={on} onClick={toggle} />
          <IconButton variant="secondary" appearance="ghost" aria-label="Next track" icon={icon('skip-forward')} onClick={() => step(1)} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-group') }}>
        <span style={{ ...type('caption'), color: secondary }}>{clock(time)}</span>
        <div style={{ flex: '1 1 0', minWidth: 1 }}>
          <Slider size="sm" className="w-full!" aria-label="Seek" min={0} max={total} step={0.25} value={time} onValueChange={(n) => setTime(Array.isArray(n) ? n[0] : n)} format={(n) => `${clock(n)} of ${clock(total)}`} />
        </div>
        <span style={{ ...type('caption'), color: secondary }}>{clock(total)}</span>
      </div>
      <Separator />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...type('label'), color: primary }}>Playlist</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-control') }}>
          <IconButton variant="secondary" appearance="ghost" size="sm" aria-label={muted ? 'Unmute' : 'Mute'} icon={icon(muted || volume === 0 ? 'speaker-slash' : 'speaker-high')} onClick={() => setMuted(!muted)} />
          <div style={{ width: `calc(${v('spacing.32')} * 1.25)` }}>
            <Slider size="xs" className="w-full!" aria-label="Volume" value={muted ? 0 : volume} onValueChange={(n) => { setMuted(false); setVolume(Array.isArray(n) ? n[0] : n) }} format={(n) => `${n}%`} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-tight') }}>
        {tracks.map((t) => (
          <MediaPlayerTrack key={t.id} title={t.title} duration={clock(t.seconds ?? 24)} current={t.id === active} onClick={() => { setId(t.id); setTime(0); setPick((n) => n + 1) }} />
        ))}
      </div>
    </div>
  )
}
