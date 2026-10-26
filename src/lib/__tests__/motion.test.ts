import { describe, expect, it } from 'vitest'
import {
  MOTION_DURATIONS,
  MOTION_EASINGS,
  MOTION_PRESETS,
  MOTION_PRESET_KEYS,
  MOTION_ROLES,
  MOTION_ROLE_PAIRS,
  MOTION_TRANSFORM_ROLES,
  SCALED_DURATION_KEYS,
  defaultMotionSettings,
  durationMs,
  durationRange,
  matchMotionPreset,
  motionChoreographies,
  motionKeyframes,
  motionPresetPatch,
  motionRootCss,
  motionTokens,
  motionTrailingCss,
  normalizeMotionSettings,
  resolveMotionRef,
  resolveMotionRole,
} from '../motion'
import { COMPONENT_KEYS } from '../componentCatalogue'

const presets = MOTION_PRESET_KEYS.map((k) => MOTION_PRESETS[k].settings)

describe('motion primitives', () => {
  it('Standard reproduces the published ladder and curves', () => {
    const s = MOTION_PRESETS.standard.settings
    expect(SCALED_DURATION_KEYS.map((k) => durationMs(k, s))).toEqual([100, 160, 240, 360, 560, 800, 1200])
    expect(MOTION_EASINGS.standard).toBe('cubic-bezier(0.45, 0.05, 0.25, 0.95)')
    expect(MOTION_EASINGS.entrance).toBe('cubic-bezier(0, 0, 0.2, 1)')
    expect(MOTION_EASINGS.exit).toBe('cubic-bezier(0.5, 0, 1, 1)')
    expect(MOTION_EASINGS.emphasized).toBe('cubic-bezier(0.22, 1, 0.36, 1)')
    expect(MOTION_EASINGS.gentle).toBe('cubic-bezier(0.76, 0, 0.24, 1)')
    expect(s.transforms).toMatchObject({ enter: 8, far: 40, pop: 0.94, shrink: 0.96, overshoot: 1.06, settle: 1.02, dolly: -240 })
    expect(resolveMotionRole('use-hover', s).value).toBe(`100ms ${MOTION_EASINGS.standard}`)
    expect(resolveMotionRole('use-disclosure-in', s).value).toBe(`160ms ${MOTION_EASINGS.entrance}`)
  })

  it('instant and fade never scale', () => {
    for (const s of presets) {
      expect(durationMs('instant', s)).toBe(0)
      expect(durationMs('fade', s)).toBe(MOTION_DURATIONS.fade)
    }
  })
})

describe('motion presets', () => {
  it.each(MOTION_PRESET_KEYS)('%s keeps every rung inside its intent range', (key) => {
    const s = MOTION_PRESETS[key].settings
    for (const k of SCALED_DURATION_KEYS) {
      const ms = durationMs(k, s)
      const { min, max } = durationRange(k)
      expect(ms, `${key} ${k}`).toBeGreaterThanOrEqual(min)
      expect(ms, `${key} ${k}`).toBeLessThanOrEqual(max)
    }
  })

  it.each(MOTION_PRESET_KEYS)('%s: every way in is at least as long as its way out', (key) => {
    const s = MOTION_PRESETS[key].settings
    for (const [inRole, outRole] of MOTION_ROLE_PAIRS) {
      expect(resolveMotionRole(inRole, s).ms, `${key} ${inRole}`).toBeGreaterThanOrEqual(resolveMotionRole(outRole, s).ms)
    }
  })

  it.each(MOTION_PRESET_KEYS)('%s round-trips through matchMotionPreset', (key) => {
    expect(matchMotionPreset(motionPresetPatch(key))).toBe(key)
  })

  it('the five presets are five different bundles', () => {
    const json = new Set(presets.map((s) => JSON.stringify(s)))
    expect(json.size).toBe(5)
  })

  it('moving one role reads Custom', () => {
    const s = motionPresetPatch('standard')
    s.roles['use-hover'] = { duration: 'short', easing: 'standard' }
    expect(matchMotionPreset(s)).toBeNull()
  })

  it('exits stay functional in every preset but Calm', () => {
    const out = ['use-disclosure-out', 'use-overlay-out', 'use-stagger-out'] as const
    for (const key of ['snappy', 'standard', 'expressive', 'playful'] as const) {
      for (const role of out) expect(MOTION_PRESETS[key].settings.roles[role].easing).toBe('exit')
    }
  })

  it('Calm has no travel and no scale', () => {
    const t = MOTION_PRESETS.calm.settings.transforms
    for (const role of MOTION_TRANSFORM_ROLES) expect([0, 1]).toContain(t[role])
  })
})

describe('motion settings', () => {
  it('normalize fills anything missing with Standard', () => {
    expect(normalizeMotionSettings(undefined)).toEqual(defaultMotionSettings())
    const partial = normalizeMotionSettings({ durationFactor: 9, roles: { 'use-hover': { duration: 'long', easing: 'nope' } } })
    expect(partial.durationFactor).toBe(1.5)
    expect(partial.roles['use-hover']).toEqual(defaultMotionSettings().roles['use-hover'])
  })
})

describe('motion choreography', () => {
  it.each(MOTION_PRESET_KEYS)('%s: every reference resolves', (key) => {
    const s = MOTION_PRESETS[key].settings
    const keyframes = motionKeyframes(s)
    const refs = (c: { tracks?: { keyframes: string; motion: Parameters<typeof resolveMotionRef>[0]; delay: unknown }[]; child?: { keyframes: string; motion: Parameters<typeof resolveMotionRef>[0] }; motion?: Parameters<typeof resolveMotionRef>[0] }) => {
      for (const t of c.tracks ?? []) {
        expect(keyframes[t.keyframes], t.keyframes).toBeDefined()
        const pick = resolveMotionRef(t.motion, s)
        expect(pick.duration in MOTION_DURATIONS).toBe(true)
        expect(pick.easing in MOTION_EASINGS).toBe(true)
        if (t.delay !== 0) expect(String(t.delay) in MOTION_DURATIONS).toBe(true)
      }
      if (c.child) {
        expect(keyframes[c.child.keyframes], c.child.keyframes).toBeDefined()
        resolveMotionRef(c.child.motion, s)
      }
      if (c.motion) resolveMotionRef(c.motion, s)
    }
    for (const [name, c] of Object.entries(motionChoreographies(s))) {
      refs(c)
      refs(c.reducedMotion)
      for (const comp of c.components) expect(COMPONENT_KEYS, `${name} → ${comp}`).toContain(comp)
    }
    for (const kf of Object.values(keyframes)) {
      for (const e of kf.easing ?? []) expect(e in MOTION_EASINGS).toBe(true)
    }
  })

  it.each(MOTION_PRESET_KEYS)('%s: reduced motion carries no travel and no scale', (key) => {
    const s = MOTION_PRESETS[key].settings
    const keyframes = motionKeyframes(s)
    for (const [name, c] of Object.entries(motionChoreographies(s))) {
      const r = c.reducedMotion
      expect(r, name).toBeDefined()
      const used = [...(r.tracks ?? []).map((t) => t.keyframes), ...(r.child ? [r.child.keyframes] : [])]
      for (const k of used) {
        if (k === 'switch-move') continue // the thumb has to reach its end; it jumps (instant)
        expect(keyframes[k].transform, `${name} reduced → ${k}`).toBeUndefined()
      }
      for (const t of r.tracks ?? []) {
        const pick = resolveMotionRef(t.motion, s)
        expect(['fade', 'instant']).toContain(pick.duration)
      }
    }
  })

  it('a preset without overshoot plays no squash and no spring', () => {
    const c = motionChoreographies(MOTION_PRESETS.snappy.settings)
    expect(c['switch-toggle'].tracks![0].keyframes).toBe('switch-move')
    expect(c['sonner-enter'].tracks![0].keyframes).toBe('rise')
    expect(motionChoreographies(MOTION_PRESETS.calm.settings)['sonner-enter'].tracks![0].keyframes).toBe('fade-in')
    expect(motionChoreographies(MOTION_PRESETS.standard.settings)['sonner-enter'].tracks![0].keyframes).toBe('spring-in')
  })
})

describe('motion exports', () => {
  it('CSS declares every rung, easing, transform and role', () => {
    const s = defaultMotionSettings()
    const root = motionRootCss(s).join('\n')
    for (const role of MOTION_ROLES) expect(root).toContain(`--motion-${role}:`)
    for (const t of MOTION_TRANSFORM_ROLES) expect(root).toContain(`--motion-transform-${t}:`)
    expect(root).toContain('--motion-duration-quick: 100ms;')
    expect(root).toContain('--motion-use-hover: var(--motion-duration-quick) var(--motion-easing-standard);')
    const tail = motionTrailingCss(s).join('\n')
    expect(tail).toContain('@media (prefers-reduced-motion: reduce)')
    expect(tail).toContain('@keyframes motion-pop')
    expect(tail).toContain('--motion-easing-spring: cubic-bezier(0.22, 1, 0.36, 1);')
  })

  it('tokens.json names its preset and ships intent ranges', () => {
    const t = motionTokens(MOTION_PRESETS.expressive.settings)
    expect(t.preset).toBe('expressive')
    expect(t.durations.quick).toBe('125ms')
    expect(t.intent.durations.quick.constraints.range).toEqual({ min: 70, max: 150, unit: 'ms' })
    expect(Object.keys(t.choreography)).toContain('dialog-enter')
  })
})
