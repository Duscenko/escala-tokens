// Docs · Motion — the brand's motion, read from its own settings
// (`SystemDoc.motion`, resolved per brand by `resolveThemeFoundations`). The
// duration ladder, the easings drawn as curves, the 24 roles in the editor's
// five groups, the transforms, and every choreography PLAYABLE, full and
// reduced side by side.
//
// Nothing here picks a number: durations come from `durationMs`, curves from
// `MOTION_EASINGS`, a stage's custom properties from `motionCssVars` (the same
// values `variables.css` ships, full or reduced), and each track plays the
// static `@keyframes motion-*` the component sheet uses. If a value on this
// page looks wrong, it is wrong in the export too.
//
// This module imports only TYPES from `foundationDocs` — `MOTION_DOC` is read
// while that module is still loading.

import { useState, type CSSProperties, type ReactNode } from 'react'
import { useI18n } from '../../../lib/i18n'
import {
  MOTION_DURATION_KEYS, MOTION_EASINGS, MOTION_EASING_KEYS, MOTION_EASING_FALLBACK,
  MOTION_ROLE_GROUPS, MOTION_ROLE_INTENT, MOTION_TRANSFORM_ROLES, SCALED_DURATION_KEYS,
  durationMs, durationRange, matchMotionPreset, motionChoreographies, motionCssVars,
  motionTokens, resolveMotionRef, transformCss,
  type Choreography, type ChoreographyTrack, type MotionDurationKey, type MotionEasingKey,
  type MotionRef, type MotionSettings,
} from '../../../lib/motion'
import { ensureMotionKeyframes } from '../MotionPreview'
import type { FoundationDoc, SystemDoc } from './foundationDocs'

ensureMotionKeyframes()

type Body = Choreography | Choreography['reducedMotion']

const labelOf = (key: string) => key.charAt(0).toUpperCase() + key.slice(1)

function delayMs(delay: MotionDurationKey | 0, settings: MotionSettings): number {
  return delay === 0 ? 0 : durationMs(delay, settings)
}

function timing(ref: MotionRef, settings: MotionSettings) {
  const pick = resolveMotionRef(ref, settings)
  return { ...pick, ms: durationMs(pick.duration, settings), css: MOTION_EASINGS[pick.easing] }
}

/** The `animation` shorthand of one track, resolved to numbers. */
function trackAnimation(keyframes: string, ref: MotionRef, delay: number, settings: MotionSettings): string {
  const t = timing(ref, settings)
  return `motion-${keyframes} ${t.ms}ms ${t.css} ${delay}ms both`
}

// ── Duration ladder ─────────────────────────────────────────────────────────

function DurationLadder({ settings }: { settings: MotionSettings }) {
  const { t } = useI18n()
  const max = Math.max(...MOTION_DURATION_KEYS.map((k) => durationMs(k, settings)), 1)
  return (
    <div className="flex flex-col gap-2">
      {MOTION_DURATION_KEYS.map((key) => {
        const ms = durationMs(key, settings)
        const scaled = SCALED_DURATION_KEYS.includes(key)
        const range = durationRange(key)
        return (
          <div key={key} className="flex items-center gap-4">
            <span className="w-28 flex-shrink-0 font-mono text-mini text-fg-faint">{key}</span>
            <span className="flex h-5 flex-1 items-center">
              <span
                className={`h-2 rounded-full ${scaled ? 'bg-accent-ui' : 'bg-fg/25'}`}
                style={{ width: `${Math.max((ms / max) * 100, 0.6)}%` }}
              />
            </span>
            <span className="w-16 flex-shrink-0 text-right font-mono text-mini tabular-nums text-fg">{ms}ms</span>
            <span className="hidden w-36 flex-shrink-0 font-mono text-mini text-fg-faint lg:block">
              {scaled ? `${range.min}–${range.max}ms` : t('fixed · reduced motion')}
            </span>
          </div>
        )
      })}
      <p className="pt-1 text-caption text-fg-faint">
        {t('Durations ×{factor}. Bars in the accent scale with the factor; grey ones are fixed.', { factor: settings.durationFactor })}
      </p>
    </div>
  )
}

// ── Easings ─────────────────────────────────────────────────────────────────

/** The curve's points in progress space (x 0…1, y may overshoot). */
function easingPoints(css: string): [number, number][] {
  const cubic = css.match(/cubic-bezier\(([^)]+)\)/)
  if (cubic) {
    const [x1, y1, x2, y2] = cubic[1].split(',').map(Number)
    return Array.from({ length: 41 }, (_, i) => {
      const s = i / 40
      const u = 1 - s
      return [3 * u * u * s * x1 + 3 * u * s * s * x2 + s * s * s, 3 * u * u * s * y1 + 3 * u * s * s * y2 + s * s * s]
    })
  }
  const linear = css.match(/linear\(([^)]+)\)/)
  if (linear) {
    const ys = linear[1].split(',').map(Number)
    return ys.map((y, i) => [i / (ys.length - 1), y])
  }
  return [[0, 0], [1, 1]]
}

function EasingCurve({ css }: { css: string }) {
  const pts = easingPoints(css)
  const lo = Math.min(0, ...pts.map((p) => p[1]))
  const hi = Math.max(1, ...pts.map((p) => p[1]))
  const W = 96
  const H = 64
  const y = (v: number) => H - 4 - ((v - lo) / (hi - lo)) * (H - 8)
  const x = (v: number) => 4 + v * (W - 8)
  const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${x(px).toFixed(1)} ${y(py).toFixed(1)}`).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="flex-shrink-0">
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(0)} className="stroke-line" strokeWidth={1} />
      <line x1={x(0)} y1={y(1)} x2={x(1)} y2={y(1)} className="stroke-line" strokeWidth={1} strokeDasharray="2 3" />
      <path d={d} fill="none" className="stroke-accent-ui" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EasingTile({ name, settings }: { name: MotionEasingKey; settings: MotionSettings }) {
  const { t } = useI18n()
  const [end, setEnd] = useState(false)
  const css = MOTION_EASINGS[name]
  const fallback = MOTION_EASING_FALLBACK[name]
  const ms = durationMs('long', settings)
  return (
    <button
      type="button"
      onClick={() => setEnd((v) => !v)}
      aria-label={t('Play the {easing} easing', { easing: name })}
      className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-ui font-semibold text-fg">{name}</span>
          <span className="truncate font-mono text-mini text-fg-faint">--motion-easing-{name}</span>
        </span>
        <EasingCurve css={css} />
      </span>
      <span className="relative h-3 rounded-full bg-elevated">
        <span
          className="absolute top-0 h-3 w-3 rounded-full bg-accent-solid"
          style={{ left: end ? 'calc(100% - 12px)' : 0, transition: `left ${ms}ms ${css}` }}
        />
      </span>
      <span className="font-mono text-mini text-fg-faint">
        {fallback ? t('linear() spring · falls back to {easing}', { easing: fallback }) : css.replace('cubic-bezier', 'cubic')}
      </span>
    </button>
  )
}

function EasingGrid({ settings }: { settings: MotionSettings }) {
  return (
    <div className="grid grid-cols-1 gap-3 @min-[520px]:grid-cols-2 @min-[820px]:grid-cols-4">
      {MOTION_EASING_KEYS.map((k) => <EasingTile key={k} name={k} settings={settings} />)}
    </div>
  )
}

// ── Roles ───────────────────────────────────────────────────────────────────

function RoleTables({ settings }: { settings: MotionSettings }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-6">
      {MOTION_ROLE_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <h4 className="text-caption font-semibold uppercase tracking-widest text-fg-faint">{t(group.label)}</h4>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[34rem] text-left">
              <thead>
                <tr className="border-b border-line text-mini font-semibold uppercase tracking-widest text-fg-faint">
                  <th className="px-3 py-2 font-semibold">{t('Variable')}</th>
                  <th className="px-3 py-2 font-semibold">{t('Duration')}</th>
                  <th className="px-3 py-2 font-semibold">{t('Easing')}</th>
                  <th className="px-3 py-2 font-semibold">{t('Use')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {group.roles.map((role) => {
                  const r = timing({ role }, settings)
                  return (
                    <tr key={role} className="align-top">
                      <td className="px-3 py-2 font-mono text-mini text-fg">--motion-{role}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-mini tabular-nums text-fg">
                        {r.duration} <span className="text-fg-faint">· {r.ms}ms</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-mini text-fg">{r.easing}</td>
                      <td className="px-3 py-2 text-caption text-fg-muted"><Ticks text={MOTION_ROLE_INTENT[role].direction} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

function TransformTable({ settings }: { settings: MotionSettings }) {
  const rows: [string, string][] = [
    ...MOTION_TRANSFORM_ROLES.map((r) => [`--motion-transform-${r}`, transformCss(r, settings.transforms[r])] as [string, string]),
    ['--motion-stagger', `${settings.stagger}ms`],
  ]
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 @min-[560px]:grid-cols-2">
      {rows.map(([name, value]) => (
        <div key={name} className="flex items-center justify-between gap-4 border-b border-line py-1.5">
          <span className="font-mono text-mini text-fg-muted">{name}</span>
          <span className="font-mono text-mini tabular-nums text-fg">{value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Choreographies ──────────────────────────────────────────────────────────

type Scene = 'dialog' | 'sheet' | 'drawer' | 'popover' | 'sonner' | 'switch' | 'list' | 'text' | 'accordion'

function sceneOf(name: string): Scene {
  if (name.startsWith('dialog')) return 'dialog'
  if (name.startsWith('sheet')) return 'sheet'
  if (name.startsWith('drawer')) return 'drawer'
  if (name.startsWith('popover')) return 'popover'
  if (name.startsWith('sonner')) return 'sonner'
  if (name.startsWith('switch')) return 'switch'
  if (name.startsWith('list')) return 'list'
  if (name.startsWith('text')) return 'text'
  return 'accordion'
}

const ROWS = 5

/** One stage: the choreography's body played on placeholder parts. `run` 0
 *  shows the parts at rest; every Play remounts the stage with the animation. */
function Stage({ name, body, settings, reduced, run }: {
  name: string; body: Body; settings: MotionSettings; reduced: boolean; run: number
}) {
  const scene = sceneOf(name)
  const vars = motionCssVars(settings, { reduced }) as CSSProperties
  const anim = (slot?: string): CSSProperties | undefined => {
    if (!run) return undefined
    const track = body.tracks?.find((tr) => (tr.slot ?? undefined) === slot)
    return track ? { animation: trackAnimation(track.keyframes, track.motion, delayMs(track.delay, settings), settings) } : undefined
  }
  const childAnim = (i: number, n: number): CSSProperties | undefined => {
    if (!run || !body.child) return undefined
    const cap = Math.min(n, body.maxElements ?? n)
    const order = body.direction === 'reverse' ? n - 1 - i : i
    const delay = (body.offset ?? 0) * Math.min(order, cap - 1)
    return { animation: trackAnimation(body.child.keyframes, body.child.motion, delay, settings) }
  }
  const disclosure = (): CSSProperties => {
    const base: CSSProperties = { ['--escala-disclosure-height' as string]: '52px', height: name.endsWith('collapse') ? 52 : run ? undefined : 0 }
    if (!run || !body.motion) return base
    const kf = body.direction === 'collapse' ? 'disclosure-collapse' : 'disclosure-expand'
    return { ...base, animation: trackAnimation(kf, body.motion, 0, settings) }
  }

  let content: ReactNode
  if (scene === 'dialog' || scene === 'sheet' || scene === 'drawer') {
    const panel = scene === 'dialog'
      ? 'relative m-auto w-3/5 rounded-md border border-line bg-elevated p-2.5 shadow-sm'
      : scene === 'sheet'
        ? 'absolute inset-y-0 right-0 w-2/5 border-l border-line bg-elevated p-2.5'
        : 'absolute inset-x-0 bottom-0 h-1/2 rounded-t-md border-t border-line bg-elevated p-2.5'
    content = (
      <div className="absolute inset-0 flex">
        <div className="absolute inset-0 bg-black/40" style={anim('overlay')} />
        <div className={panel} style={{ transformOrigin: 'center', ...anim('content') }}>
          <span className="block h-1.5 w-2/3 rounded-full bg-fg/60" />
          <span className="mt-1.5 block h-1.5 w-full rounded-full bg-fg/20" />
          <span className="mt-1.5 block h-1.5 w-4/5 rounded-full bg-fg/20" />
        </div>
      </div>
    )
  } else if (scene === 'popover') {
    content = (
      <div className="flex flex-col items-center gap-1.5 pt-4">
        <span className="h-5 w-20 rounded-md border border-line bg-elevated" />
        <div className="w-32 rounded-md border border-line bg-elevated p-2 shadow-sm" style={{ transformOrigin: 'top center', ...anim(undefined) }}>
          {[0, 1, 2].map((i) => <span key={i} className="mt-1 block h-1.5 rounded-full bg-fg/25 first:mt-0" />)}
        </div>
      </div>
    )
  } else if (scene === 'sonner') {
    content = (
      <div className="absolute inset-x-0 bottom-3 flex justify-center">
        <div className="flex w-3/4 items-center gap-2 rounded-md border border-line bg-elevated p-2 shadow-sm" style={anim(undefined)}>
          <span className="h-3 w-3 flex-shrink-0 rounded-full bg-accent-solid" />
          <span className="h-1.5 flex-1 rounded-full bg-fg/30" />
        </div>
      </div>
    )
  } else if (scene === 'switch') {
    content = (
      <div className="flex h-full items-center justify-center">
        <span className="relative h-6 w-11 rounded-full bg-accent-solid">
          <span
            className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
            style={{ ['--switch-from' as string]: '0px', ['--switch-to' as string]: '20px', transform: 'translateX(20px)', ...anim('thumb') }}
          />
        </span>
      </div>
    )
  } else if (scene === 'list') {
    content = (
      <div className="flex flex-col justify-center gap-1.5 p-3">
        {Array.from({ length: ROWS }, (_, i) => (
          <div key={i} className="flex items-center gap-1.5 rounded bg-elevated px-1.5 py-1" style={childAnim(i, ROWS)}>
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-accent-solid/70" />
            <span className="h-1.5 flex-1 rounded-full bg-fg/25" />
          </div>
        ))}
      </div>
    )
  } else if (scene === 'text') {
    content = (
      <div className="flex flex-col justify-center gap-1 p-3">
        {['w-11/12', 'w-4/5', 'w-2/3'].map((w, i) => (
          <span key={w} className="block overflow-hidden py-0.5">
            <span className={`block h-3 rounded-sm bg-fg/60 ${w}`} style={childAnim(i, 3)} />
          </span>
        ))}
      </div>
    )
  } else {
    content = (
      <div className="flex flex-col p-3">
        <span className="flex items-center justify-between rounded-t-md border border-line bg-elevated px-2 py-1.5">
          <span className="h-1.5 w-1/2 rounded-full bg-fg/60" />
          <span className="h-1.5 w-1.5 rounded-full bg-fg/40" />
        </span>
        <div className="overflow-hidden rounded-b-md border border-t-0 border-line bg-surface" style={disclosure()}>
          <div className="flex flex-col gap-1.5 p-2">
            <span className="block h-1.5 w-full rounded-full bg-fg/20" />
            <span className="block h-1.5 w-5/6 rounded-full bg-fg/20" />
            <span className="block h-1.5 w-2/3 rounded-full bg-fg/20" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div key={run} style={vars} aria-hidden className="relative h-[132px] overflow-hidden rounded-lg border border-line bg-app">
      {content}
    </div>
  )
}

/** `code` spans in a sentence, like `Prose` does for the article copy. */
function Ticks({ text }: { text: string }) {
  return <>{text.split(/(`[^`]+`)/).map((part, i) => (
    part.startsWith('`') && part.endsWith('`')
      ? <code key={i} className="font-mono text-[0.92em] text-fg">{part.slice(1, -1)}</code>
      : part
  ))}</>
}

/** One line per track: what moves, how, for how long. */
function trackLines(body: Body, settings: MotionSettings): string[] {
  const line = (slot: string | undefined, kf: string, ref: MotionRef, delay = 0) => {
    const tm = timing(ref, settings)
    const who = 'role' in ref ? ref.role : `${ref.duration}`
    return `${slot ?? 'root'} · ${kf} · ${who} · ${tm.ms}ms ${tm.easing}${delay ? ` · +${delay}ms` : ''}`
  }
  if (body.tracks) return body.tracks.map((tr: ChoreographyTrack) => line(tr.slot, tr.keyframes, tr.motion, delayMs(tr.delay, settings)))
  if (body.child) return [`${line(body.child.slot ?? 'item', body.child.keyframes, body.child.motion)} · ${body.offset ?? 0}ms apart`]
  if (body.motion) return [line('panel', body.direction === 'collapse' ? 'disclosure-collapse' : 'disclosure-expand', body.motion)]
  return []
}

function ChoreographyCard({ name, choreo, settings }: { name: string; choreo: Choreography; settings: MotionSettings }) {
  const { t } = useI18n()
  const [run, setRun] = useState(0)
  const halves: { key: string; label: string; body: Body; reduced: boolean }[] = [
    { key: 'full', label: t('Full'), body: choreo, reduced: false },
    { key: 'reduced', label: t('Reduced motion'), body: choreo.reducedMotion, reduced: true },
  ]
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-ui font-semibold text-fg">{name}</span>
          <span className="text-caption text-fg-muted"><Ticks text={choreo.intent.direction} /></span>
          <span className="text-mini text-fg-faint">
            {choreo.components.length ? choreo.components.join(' · ') : t('No component plays it yet — tokens.json carries it for a product runtime.')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="flex flex-shrink-0 items-center gap-1 rounded-md border border-line bg-elevated px-2 py-1 text-caption font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M2 1.2v7.6L8.6 5z" fill="currentColor" /></svg>
          {run ? t('Replay') : t('Play')}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 @min-[520px]:grid-cols-2">
        {halves.map((h) => (
          <div key={h.key} className="flex min-w-0 flex-col gap-1.5">
            <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{h.label}</span>
            <Stage name={name} body={h.body} settings={settings} reduced={h.reduced} run={run} />
            {trackLines(h.body, settings).map((l) => (
              <span key={l} className="truncate font-mono text-mini text-fg-faint" title={l}>{l}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Choreographies({ settings }: { settings: MotionSettings }) {
  const all = motionChoreographies(settings)
  return (
    <div className="flex flex-col gap-3">
      {Object.entries(all).map(([name, c]) => <ChoreographyCard key={name} name={name} choreo={c} settings={settings} />)}
    </div>
  )
}

function PresetLine({ settings }: { settings: MotionSettings }) {
  const { t } = useI18n()
  const preset = matchMotionPreset(settings)
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-ui text-fg-muted">
      <span>{t('Preset')}: <span className="font-semibold text-fg">{preset ? t(labelOf(preset)) : t('Custom')}</span></span>
      <span>{t('Duration factor')}: <span className="font-mono text-fg">×{settings.durationFactor}</span></span>
      <span>{t('Stagger')}: <span className="font-mono text-fg">{settings.stagger}ms</span></span>
    </div>
  )
}

/** Same count as Export's Motion collection (`motionTokenCount`). */
export function motionTokenTotal(settings: MotionSettings): number {
  const m = motionTokens(settings) as unknown as Record<string, Record<string, unknown> | unknown>
  return ['durations', 'easings', 'transforms', 'roles', 'choreography']
    .reduce((n, k) => n + Object.keys((m[k] as Record<string, unknown>) ?? {}).length, 0)
}

export const MOTION_DOC: FoundationDoc = {
  key: 'motion',
  label: 'Motion',
  lead: 'How the system moves: a duration ladder, eight easings, 24 roles that name a duration and an easing for one job, and choreographies that time several parts together. Every role has a reduced-motion version.',
  why: 'A 200ms here and a 300ms ease-in-out there is how a product ends up feeling like five products. Naming the job (`use-overlay-in`, `use-hover`) instead of the number means one preset retimes every component, an entrance is never shorter than its exit, and reduced motion is handled once, in the tokens, instead of in every component.',
  usage: 'Reach for a role, never a raw duration: `transition: background-color var(--motion-use-hover)`. Open and close layers play a choreography (`--motion-choreo-*`). `variables.css` carries the `prefers-reduced-motion` block, so do not add your own override.',
  usageCode: `.button { transition: background-color var(--motion-use-hover); }

.dialog[data-state="open"] { animation: var(--motion-choreo-dialog-enter-content); }

/* Reduced motion is already in variables.css: travel and scale go to 0,
   entrances and exits become a short fade. */`,
  ships: {
    json: 'motion · foundationsByTheme[brand].motion',
    css: '--motion-*  (durations · easings · transforms · roles · choreographies, @keyframes motion-*, reduced-motion block)',
    figma: 'Not in Figma yet — the plugin’s Motion collection is still to come',
  },
  tokenCount: (c) => motionTokenTotal(c.motion),
  sections: [
    {
      id: 'preset',
      title: 'Preset',
      description: 'The preset is matched from the settings, never stored. Edit a role and it reads Custom.',
      render: (c: SystemDoc) => <PresetLine settings={c.motion} />,
    },
    {
      id: 'durations',
      title: 'Duration ladder',
      description: 'Nine rungs. Seven scale with the brand’s duration factor; `instant` and `fade` belong to reduced motion and never move.',
      render: (c: SystemDoc) => <DurationLadder settings={c.motion} />,
    },
    {
      id: 'easings',
      title: 'Easings',
      description: 'Each curve drawn from its own value. Click one to play it. The two springs are CSS `linear()` lists; a consumer without `linear()` reads their cubic fallback.',
      render: (c: SystemDoc) => <EasingGrid settings={c.motion} />,
    },
    {
      id: 'roles',
      title: 'Roles',
      description: 'One role per job, each a duration and an easing by name. The same five groups as Variables · Motion.',
      render: (c: SystemDoc) => <RoleTables settings={c.motion} />,
    },
    {
      id: 'transforms',
      title: 'Transforms',
      description: 'How far and how much things travel and scale. Reduced motion sets every one of them to nothing.',
      render: (c: SystemDoc) => <TransformTable settings={c.motion} />,
    },
    {
      id: 'choreographies',
      title: 'Choreographies',
      description: 'Several parts timed together. Play one to see the full version beside the reduced one a viewer who asked for less motion gets.',
      render: (c: SystemDoc) => <Choreographies settings={c.motion} />,
    },
  ],
}
