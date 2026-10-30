/**
 * The systems the export audit runs over (design-plans/export-watchdog.md).
 *
 * Each case builds a fresh store and returns the brands to audit. Together
 * they cover what has broken before or could: every System Style, random
 * moods (seeded, so a failure reproduces), brands that share seed colours, a
 * brand created in Dark, a brand that ships one theme, hand edits, a pinned
 * radius and a system at the brand limit.
 */
import { makeDesignDefaults, useDesignStore, type DesignSnapshot } from '../store/useDesignStore'
import { adoptPreset } from './adoptPreset'
import { THEME_STYLE_PRESETS, type ThemeStylePreset } from './themePresets'
import { CURATED_MOODS, moodFromSpec, proceduralMoodSpec, type ThemeMood } from './themeMoods'

export interface AuditCase {
  name: string
  /** Builds the system in the store; returns the brands to audit. */
  build: () => string[]
}

/** Deterministic PRNG (mulberry32) — a mood that fails must fail again. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function adopt(preset: ThemeStylePreset, appearance: 'light' | 'dark' = 'light'): string {
  const r = adoptPreset(preset, appearance, { track: false })
  if ('error' in r) throw new Error(`${preset.id}: ${r.error}`)
  return r.key
}

function fresh(): void {
  useDesignStore.setState(makeDesignDefaults())
}

function preset(id: string): ThemeStylePreset {
  const p = THEME_STYLE_PRESETS.find((x) => x.id === id)
  if (!p) throw new Error(`no System Style "${id}"`)
  return p
}

/** A mood as a System Style, so it is minted through the same path. */
function moodPreset(mood: ThemeMood, n: number): ThemeStylePreset {
  const base = THEME_STYLE_PRESETS[0]
  return {
    ...base,
    id: `audit-mood-${n}-${mood.id}`,
    label: `Mood ${n} ${mood.id}`,
    shortLabel: `Mood ${n}`,
    accent: mood.accent,
    neutral: mood.neutral,
    neutralTint: mood.neutralTint,
    states: mood.states,
    preferredAppearance: mood.appearance,
    semantics: undefined,
  }
}

const chunks = <T,>(list: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size))

export function auditCases(opts: { moods?: number; seed?: number } = {}): AuditCase[] {
  const moodCount = opts.moods ?? 20
  const rng = seededRng(opts.seed ?? 20261030)
  const cases: AuditCase[] = []

  // Every System Style, four brands to a system (the beta caps a system at 5).
  chunks(THEME_STYLE_PRESETS, 4).forEach((group, i) => {
    cases.push({ name: `styles ${i + 1}: ${group.map((p) => p.id).join(', ')}`, build: () => { fresh(); return group.map((p) => adopt(p)) } })
  })

  // Brands whose state seeds equal each other's (Swiss borrowed Playful's error).
  cases.push({
    name: 'shared seeds: enterprise-dense, playful-candy, luxury-noir, swiss-grid',
    build: () => { fresh(); return ['enterprise-dense', 'playful-candy', 'luxury-noir', 'swiss-grid'].map((id) => adopt(preset(id))) },
  })

  // Random moods: curated first, then procedural draws.
  const moods: ThemeMood[] = []
  for (let i = 0; i < moodCount; i++) {
    moods.push(i % 2 === 0 && CURATED_MOODS.length
      ? CURATED_MOODS[Math.floor(rng() * CURATED_MOODS.length)]
      : moodFromSpec(`procedural-${i}`, proceduralMoodSpec(rng)))
  }
  chunks(moods, 4).forEach((group, i) => {
    cases.push({
      name: `moods ${i + 1}: ${group.map((m) => m.id).join(', ')}`,
      build: () => { fresh(); return group.map((m, j) => adopt(moodPreset(m, i * 4 + j), m.appearance)) },
    })
  })

  // Edge systems.
  cases.push({ name: 'one brand, created in Dark', build: () => { fresh(); return [adopt(preset('core-minimal'), 'dark')] } })
  cases.push({
    name: 'Light only and Dark only brands',
    build: () => {
      fresh()
      const a = adopt(preset('core-minimal'))
      const b = adopt(preset('neo-brutalism'))
      const s = useDesignStore.getState()
      s.setBrandThemes(a, ['light'])
      s.setBrandThemes(b, ['dark'])
      return [a, b]
    },
  })
  cases.push({
    name: 'hand edits: overridden roles (bare key and per theme), a pinned radius role',
    build: () => {
      fresh()
      const a = adopt(preset('material-elevation'))
      const s = useDesignStore.getState()
      s.setArchitectureOverride('categorical', 'action.primary.default', a, '{accent.11}')
      s.setArchitectureOverride('categorical', 'surface.selected', a, '{accent-a.4}')
      // What the editor writes today: one column of the brand.
      s.setArchitectureOverride('categorical', 'border.default', `${a}::dark`, '{neutral-dark.7}')
      s.setArchitectureOverride('categorical', 'content.accent', `${a}::light`, '{accent.12}')
      s.setRadiusRoles({ ...s.radiusRoles, container: 'dimension-20' })
      return [a]
    },
  })
  cases.push({
    name: 'five brands (the beta limit)',
    build: () => { fresh(); return ['core-minimal', 'retro-vintage', 'terminal-mono', 'abyss-neon', 'cupcake-pastel'].map((id) => adopt(preset(id))) },
  })

  return cases
}

export function currentStore(): DesignSnapshot {
  return useDesignStore.getState() as unknown as DesignSnapshot
}
