/**
 * Phase 4 (web half) of design-plans/motion-foundation.md: the W3C document's
 * `Motion` group. Durations are `duration`, cubic curves `cubicBezier`, a spring
 * a `string` with its cubic stand-in, a role a `transition` aliasing its rung
 * and curve, a choreography `$type: "choreography"`; every reference resolves
 * inside the document, distances alias Dimension primitives when present.
 */
import { describe, expect, it } from 'vitest'
import { useDesignStore } from '../../store/useDesignStore'
import { buildWizardExport, ALL_WIZARD_COLLECTIONS } from '../exportWizard'
import { MOTION_DURATION_KEYS, MOTION_PRESETS, MOTION_ROLES, motionPresetPatch, motionW3CMode } from '../motion'

type Leaf = { $type: string; $value: unknown; $extensions?: Record<string, unknown> }

function doc(collections = ALL_WIZARD_COLLECTIONS, includeAliases = true): Record<string, any> {
  const [file] = buildWizardExport({
    collections, modes: ['light', 'dark'], format: 'w3c', structure: 'single', colorFormat: 'hex', includeAliases, includeComponents: false,
  })
  return JSON.parse(file.content)
}

/** Every `{A.B.C}` reference in a value, deep. */
function refsIn(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') for (const m of v.matchAll(/\{([^}]+)\}/g)) out.push(m[1])
  else if (Array.isArray(v)) v.forEach((x) => refsIn(x, out))
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => refsIn(x, out))
  return out
}
const at = (root: Record<string, any>, path: string) => path.split('.').reduce<any>((n, k) => n?.[k], root)

describe('W3C Motion group', () => {
  it('ships with the Motion collection and not without it', () => {
    expect(doc().Motion).toBeDefined()
    expect(doc(['primitives']).Motion).toBeUndefined()
  })

  it('types: duration, cubicBezier / string, transition, choreography — with ai.intent', () => {
    const mode = Object.values(doc().Motion)[0] as Record<string, Record<string, Leaf>>
    for (const k of MOTION_DURATION_KEYS) {
      expect(mode.duration[k].$type).toBe('duration')
      expect(mode.duration[k].$extensions?.['ai.intent']).toBeDefined()
    }
    expect(mode.easing.standard).toEqual({ $type: 'cubicBezier', $value: [0.45, 0.05, 0.25, 0.95] })
    expect(mode.easing.spring.$type).toBe('string')
    for (const r of MOTION_ROLES) {
      expect(mode.role[r].$type, r).toBe('transition')
      expect(mode.role[r].$extensions?.['ai.intent'], r).toBeDefined()
    }
    expect(mode.choreography['dialog-enter'].$type).toBe('choreography')
    expect((mode.choreography['dialog-enter'].$value as { reducedMotion?: unknown }).reducedMotion).toBeDefined()
  })

  it('every reference in the document resolves to a token inside it', () => {
    const d = doc()
    const refs = refsIn(d.Motion)
    expect(refs.length).toBeGreaterThan(50)
    for (const r of refs) expect(at(d, r)?.$value, r).toBeDefined()
  })

  it('a role\'s timingFunction is always a cubic curve (a spring rides beside it)', () => {
    const d = doc()
    for (const mode of Object.values(d.Motion) as Record<string, Record<string, Leaf>>[]) {
      for (const r of MOTION_ROLES) {
        const tf = (mode.role[r].$value as { timingFunction: string }).timingFunction
        expect(at(d, tf.slice(1, -1)).$type, r).toBe('cubicBezier')
      }
    }
  })

  it('a distance aliases the Dimension primitive of its length; one off the ladder is px', () => {
    const mode = motionW3CMode(MOTION_PRESETS.standard.settings, 'Default', {
      dimensionRef: (px) => (px === 8 ? '{Dimension Primitives.Default.8}' : undefined),
    }) as Record<string, Record<string, Leaf>>
    expect(mode.transform.enter.$value).toBe('{Dimension Primitives.Default.8}')
    expect(mode.transform.dolly.$value).toBe('-240px')
    expect(mode.transform.pop).toEqual({ $type: 'number', $value: 0.94 })
  })

  it('in the real document, enter (8px) aliases Dimension Primitives', () => {
    const d = doc()
    const mode = d.Motion.Default as Record<string, Record<string, Leaf>>
    expect(mode.transform.enter.$value).toBe('{Dimension Primitives.Default.8}')
    expect(at(d, 'Dimension Primitives.Default.8').$value).toBe('8px')
  })

  it('without aliases, nothing in the group is a reference', () => {
    expect(refsIn(doc(ALL_WIZARD_COLLECTIONS, false).Motion)).toEqual([])
  })

  it('brands that move differently get one mode each; alike, one Default', () => {
    expect(Object.keys(doc().Motion)).toEqual(['Default'])
    const s = useDesignStore.getState()
    const key = s.themeOrder[0]
    const before = s.themeFoundations[key]
    try {
      s.patchThemeFoundations(key, { motion: motionPresetPatch('calm') })
      if (useDesignStore.getState().themeOrder.length > 1) expect(Object.keys(doc().Motion).length).toBeGreaterThan(1)
    } finally {
      useDesignStore.setState((st) => ({ themeFoundations: { ...st.themeFoundations, [key]: before as never } }))
    }
  })
})
