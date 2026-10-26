/**
 * Phase 3 of design-plans/motion-foundation.md: each brand moves its own way.
 * Every System Style names a preset (the plan's table), moods carry one,
 * a brand's motion reaches its preview, tokens.json and variables.css, and
 * the editor's helpers (groups, nearest preset, pair rule) hold.
 */
import { describe, expect, it } from 'vitest'
import { useDesignStore } from '../../store/useDesignStore'
import { buildCSS } from '../exporters'
import { generateTokenJSON } from '../tokenGenerator'
import { resolveThemeFoundations } from '../themeFoundations'
import { resolvePreviewTokens } from '../previewTokens'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { CURATED_MOODS, drawMotionPreset, proceduralMoodSpec } from '../themeMoods'
import { moodFoundations } from '../randomTheme'
import {
  MOTION_PRESETS, MOTION_PRESET_KEYS, MOTION_ROLES, MOTION_ROLE_GROUPS, matchMotionPreset, motionPairViolation,
  motionPresetPatch, motionSettingsFromTokens, motionThemeTokens, nearestMotionPreset, withMotionRole,
  type MotionPresetKey,
} from '../motion'

/** The plan's assignment table, verbatim. */
const PLAN: Record<string, MotionPresetKey> = {
  'core-minimal': 'standard', 'cupertino-glass': 'expressive', 'material-elevation': 'expressive',
  'nature-organic': 'calm', 'retro-vintage': 'snappy', 'neo-brutalism': 'snappy', 'editorial-serif': 'calm',
  'terminal-mono': 'snappy', 'enterprise-dense': 'snappy', 'playful-candy': 'playful', 'luxury-noir': 'calm',
  'swiss-grid': 'standard', 'abyss-neon': 'expressive', 'synthwave-night': 'expressive', 'cupcake-pastel': 'playful',
  'arctic-frost': 'standard', 'sunset-dusk': 'expressive', 'valentine-blush': 'playful',
}

describe('System Styles move their own way', () => {
  it('all 18 name the preset the plan assigns', () => {
    expect(THEME_STYLE_PRESETS).toHaveLength(18)
    for (const style of THEME_STYLE_PRESETS) {
      const motion = style.foundations.motion
      expect(motion, style.id).toBeDefined()
      expect(matchMotionPreset(motion!), style.id).toBe(PLAN[style.id])
    }
  })

  it('every preset is shown by at least three styles', () => {
    for (const key of MOTION_PRESET_KEYS) {
      expect(THEME_STYLE_PRESETS.filter((s) => matchMotionPreset(s.foundations.motion!) === key).length, key).toBeGreaterThanOrEqual(3)
    }
  })

  it('motion is the LAST key of a style\'s foundations (the v104 migration appends it there)', () => {
    for (const style of THEME_STYLE_PRESETS) expect(Object.keys(style.foundations).at(-1), style.id).toBe('motion')
  })
})

describe('moods', () => {
  it('every curated mood carries a preset, and the six that are System Styles agree with them', () => {
    for (const mood of CURATED_MOODS) expect(MOTION_PRESET_KEYS, mood.id).toContain(mood.motion)
    const pairs: [string, string][] = [['abyss', 'abyss-neon'], ['synthwave', 'synthwave-night'], ['cupcake', 'cupcake-pastel'], ['nord', 'arctic-frost'], ['sunset', 'sunset-dusk'], ['valentine', 'valentine-blush']]
    for (const [mood, style] of pairs) expect(CURATED_MOODS.find((m) => m.id === mood)!.motion, mood).toBe(PLAN[style])
  })

  it('a procedural draw picks Standard 40 % and each other preset 15 %', () => {
    const counts: Record<string, number> = {}
    for (let i = 0; i < 1000; i++) {
      const key = drawMotionPreset(() => (i + 0.5) / 1000)
      counts[key] = (counts[key] ?? 0) + 1
    }
    expect(counts.standard).toBe(400)
    for (const key of ['snappy', 'expressive', 'playful', 'calm']) expect(counts[key], key).toBe(150)
  })

  it('a procedural spec carries a motion preset, and Random applies the mood\'s', () => {
    let n = 0
    const rng = () => ((n++ * 0.6180339887) % 1)
    const spec = proceduralMoodSpec(rng)
    expect(MOTION_PRESET_KEYS).toContain(spec.motion)
    const mood = CURATED_MOODS.find((m) => m.id === 'cyberpunk')!
    const out = moodFoundations(THEME_STYLE_PRESETS[0], mood)
    expect(matchMotionPreset(out.motion!)).toBe('snappy')
  })
})

describe('a brand\'s motion reaches every reader', () => {
  it('resolves per theme, falls back to the root, and the preview reads the brand\'s', () => {
    const s = useDesignStore.getState()
    const key = s.themeOrder[0]
    const before = s.themeFoundations[key]
    try {
      s.patchThemeFoundations(key, { motion: motionPresetPatch('calm') })
      const st = useDesignStore.getState()
      expect(matchMotionPreset(resolveThemeFoundations(st, key).motion)).toBe('calm')
      expect(matchMotionPreset(resolvePreviewTokens(st, key).motion!)).toBe('calm')
      const other = st.themeOrder.find((k) => k !== key && !st.themeFoundations[k]?.motion)
      if (other) expect(matchMotionPreset(resolveThemeFoundations(st, other).motion)).toBe(matchMotionPreset(st.motion))
    } finally {
      useDesignStore.setState((st) => ({ themeFoundations: { ...st.themeFoundations, [key]: before as never } }))
    }
  })

  it('tokens.json carries it per theme, and variables.css overrides it in that brand\'s block, reduced included', () => {
    const s = useDesignStore.getState()
    const key = s.themeOrder.find((k) => k !== s.themeOrder[0]) ?? s.themeOrder[0]
    const before = s.themeFoundations[key]
    try {
      s.patchThemeFoundations(key, { motion: motionPresetPatch('playful') })
      const json = generateTokenJSON() as unknown as { foundationsByTheme: Record<string, { motion: { preset: string } }> }
      expect(json.foundationsByTheme[key].motion.preset).toBe('playful')
      const css = buildCSS(useDesignStore.getState())
      const block = css.slice(css.indexOf(`/* Motion — ${key} */`))
      expect(block.split('\n}')[0]).toContain('--motion-duration-quick: 125ms;')
      // Under reduced motion the brand's block restates what it overrode, or
      // its full-motion value would beat `:root`'s reduced one.
      const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
      const brandReduced = reduced.slice(reduced.indexOf('}') + 1)
      expect(brandReduced).toContain('--motion-duration-quick: 125ms;')
      expect(brandReduced).toContain('--motion-transform-enter: 0px;')
      expect(brandReduced).toContain('--motion-use-overlay-in: var(--motion-duration-fade) var(--motion-easing-entrance);')
    } finally {
      useDesignStore.setState((st) => ({ themeFoundations: { ...st.themeFoundations, [key]: before as never } }))
    }
  })

  it('a brand block round-trips through tokens.json', () => {
    for (const key of MOTION_PRESET_KEYS) {
      const settings = MOTION_PRESETS[key].settings
      expect(motionSettingsFromTokens(JSON.parse(JSON.stringify(motionThemeTokens(settings)))), key).toEqual(settings)
    }
  })
})

describe('editor helpers', () => {
  it('every role sits in exactly one group', () => {
    const listed = MOTION_ROLE_GROUPS.flatMap((g) => g.roles)
    expect([...listed].sort()).toEqual([...MOTION_ROLES].sort())
  })

  it('one role edited still compares against the preset it came from', () => {
    for (const key of MOTION_PRESET_KEYS) {
      const edited = withMotionRole(MOTION_PRESETS[key].settings, 'use-hover', { duration: 'long', easing: 'linear' })
      expect(matchMotionPreset(edited), key).toBeNull()
      expect(nearestMotionPreset(edited), key).toBe(key)
    }
  })

  it('flags an entrance made faster than its exit, and only then', () => {
    const base = MOTION_PRESETS.standard.settings
    for (const role of MOTION_ROLES) expect(motionPairViolation(base, role), role).toBeNull()
    const broken = withMotionRole(base, 'use-overlay-in', { duration: 'quick', easing: 'entrance' })
    expect(motionPairViolation(broken, 'use-overlay-in')).toBe('use-overlay-out')
  })
})
