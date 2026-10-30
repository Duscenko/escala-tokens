/**
 * Variables · Motion — one collection, `Motion semantics`: the 24 roles a
 * component, an agent or a product's own code times its movement with. Each
 * row is a PICK (a duration rung + an easing), never free milliseconds — the
 * same rule radius follows — so a preset's duration factor still moves every
 * role at once. The rail holds the Preset, the one global control.
 *
 * Edits land on the brand on screen (`patchThemeFoundations`), like every
 * other foundation the Theme rail edits.
 */
import { useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
import {
  MOTION_DURATION_KEYS, MOTION_EASINGS, MOTION_EASING_KEYS, MOTION_PRESETS, MOTION_PRESET_KEYS, MOTION_ROLE_GROUPS,
  MOTION_ROLE_INTENT, durationMs, matchMotionPreset, motionPairViolation, motionPresetPatch, nearestMotionPreset, normalizeMotionSettings,
  resolveMotionRole, withMotionRole, type MotionDurationKey, type MotionEasingKey, type MotionPresetKey, type MotionRole,
} from '../../lib/motion'
import VariableCollectionRail, { RailControl } from './VariableCollectionRail'
import RailSelect from '../ui/RailSelect'
import VariableSelect from '../ui/VariableSelect'
import {
  TABLE_CELL_DIVIDER, TABLE_GROUP_LABEL, TABLE_HEAD_CELL, tableHeaderClass, tableRowClass,
} from './tableChrome'

const GRID = 'grid grid-cols-[minmax(10rem,1.1fr)_minmax(8rem,0.8fr)_minmax(9rem,0.9fr)_4.5rem_3rem]'

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M3.5 1.5v2.4h2.4" />
    </svg>
  )
}

/** A dot that travels with the role's own timing — the role, felt. */
function PlaySwatch({ ms, easing, label }: { ms: number; easing: string; label: string }) {
  const dot = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const play = () => {
    const el = dot.current
    if (!el?.animate) return
    el.getAnimations().forEach((a) => a.cancel())
    const frames = reduce
      ? [{ opacity: 0.2 }, { opacity: 1 }]
      : [{ transform: 'translateX(0)' }, { transform: 'translateX(26px)' }]
    el.animate(frames, { duration: Math.max(ms, 1), easing, direction: 'alternate', iterations: 2, fill: 'none' })
  }
  return (
    <button
      type="button"
      onClick={play}
      aria-label={`Play ${label}`}
      title={`Play ${label}`}
      className="group flex h-6 w-[46px] items-center rounded-full bg-elevated px-1 transition-colors hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      <span ref={dot} className="h-3.5 w-3.5 rounded-full bg-accent-solid" />
    </button>
  )
}

export default function MotionSemantics({ previewTheme, query }: { previewTheme?: string; query?: string }) {
  const { foundations, patch } = useThemeFoundations(previewTheme)
  const settings = normalizeMotionSettings(foundations.motion)
  const preset = matchMotionPreset(settings)
  const nearest = nearestMotionPreset(settings)
  const baseline = MOTION_PRESETS[nearest].settings
  const [ownQuery] = useState('')
  const q = (query ?? ownQuery).trim().toLowerCase()

  const setPick = (role: MotionRole, duration: MotionDurationKey, easing: MotionEasingKey) =>
    patch({ motion: withMotionRole(settings, role, { duration, easing }) })

  const groups = MOTION_ROLE_GROUPS
    .map((g) => ({ ...g, roles: g.roles.filter((r) => !q || r.includes(q) || MOTION_ROLE_INTENT[r].direction.toLowerCase().includes(q)) }))
    .filter((g) => g.roles.length)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-app">
      <div className="flex min-h-0 flex-1 items-stretch">
        <VariableCollectionRail>
          <div className="flex flex-col gap-0.5">
            <RailControl label="Preset" trailing={`×${settings.durationFactor}`}>
              <RailSelect<MotionPresetKey>
                ariaLabel="Motion preset"
                value={preset}
                options={MOTION_PRESET_KEYS.map((key) => ({
                  value: key,
                  label: MOTION_PRESETS[key].label,
                  description: MOTION_PRESETS[key].brief,
                  trailing: `×${MOTION_PRESETS[key].settings.durationFactor}`,
                }))}
                onChange={(key) => patch({ motion: motionPresetPatch(key) })}
              />
            </RailControl>
            <p className="px-2 pt-1 text-caption leading-5 text-fg-faint">
              A preset sets every role and the duration factor. Reduced motion applies on top of any preset.
            </p>
          </div>
        </VariableCollectionRail>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="@container/tablescroll min-w-0 flex-1 overflow-auto">
            <div className="w-fit min-w-full">
            {groups.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-fg-faint">No tokens match “{query}”.</div>
            ) : groups.map((g) => (
              <div key={g.label}>
                <div className={TABLE_GROUP_LABEL}>
                  <span className="text-caption font-semibold uppercase tracking-widest text-fg-muted">{g.label}</span>
                  <span className="text-caption font-mono tabular-nums text-fg-faint">{g.roles.length}</span>
                </div>
                <div className={tableHeaderClass(GRID, { stacked: true })}>
                  <span className={`${TABLE_HEAD_CELL} pl-4`}>Token name</span>
                  <span className={`${TABLE_HEAD_CELL} px-3`}>Duration</span>
                  <span className={`${TABLE_HEAD_CELL} px-3`}>Easing</span>
                  <span className={`${TABLE_HEAD_CELL} px-3`}>Preview</span>
                  <span aria-hidden />
                </div>
                {g.roles.map((role, i) => {
                  const pick = settings.roles[role]
                  const resolved = resolveMotionRole(role, settings)
                  const modified = pick.duration !== baseline.roles[role].duration || pick.easing !== baseline.roles[role].easing
                  const slower = motionPairViolation(settings, role)
                  return (
                    <div key={role} className={tableRowClass(i, GRID)}>
                      <div className={`flex min-w-0 flex-col justify-center py-2 pl-4 pr-3 ${TABLE_CELL_DIVIDER}`} title={MOTION_ROLE_INTENT[role].direction}>
                        <span className="flex min-w-0 items-center">
                          <code className="truncate font-mono text-body text-fg-muted">motion-{role}</code>
                          {modified && <span className="ml-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-ui" title="Changed from the preset" />}
                        </span>
                        {slower && (
                          <span className="mt-0.5 text-micro text-status-warning">Shorter than {slower}: an entrance should not beat its exit.</span>
                        )}
                      </div>
                      <div className={`flex items-center px-2.5 py-1.5 ${TABLE_CELL_DIVIDER}`}>
                        <VariableSelect
                          ariaLabel={`${role} duration`}
                          value={pick.duration}
                          onChange={(v) => setPick(role, v as MotionDurationKey, pick.easing)}
                        >
                          {MOTION_DURATION_KEYS.map((k) => (
                            <option key={k} value={k}>{k} · {durationMs(k, settings)}ms</option>
                          ))}
                        </VariableSelect>
                      </div>
                      <div className={`flex items-center px-2.5 py-1.5 ${TABLE_CELL_DIVIDER}`}>
                        <VariableSelect
                          ariaLabel={`${role} easing`}
                          value={pick.easing}
                          onChange={(v) => setPick(role, pick.duration, v as MotionEasingKey)}
                        >
                          {MOTION_EASING_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                        </VariableSelect>
                      </div>
                      <div className={`flex items-center px-3 py-1.5 ${TABLE_CELL_DIVIDER}`}>
                        <PlaySwatch ms={resolved.ms} easing={MOTION_EASINGS[resolved.easing]} label={role} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setPick(role, baseline.roles[role].duration, baseline.roles[role].easing)}
                        disabled={!modified}
                        title={`Reset to ${MOTION_PRESETS[nearest].label}`}
                        aria-label={`Reset ${role}`}
                        className="flex h-full w-full items-center justify-center py-3 text-fg-faint transition-colors hover:text-fg disabled:opacity-25 disabled:hover:text-fg-faint"
                      >
                        <ResetIcon />
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
