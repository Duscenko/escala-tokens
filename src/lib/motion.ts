/**
 * Motion foundation — three tiers, after motiondesignsystem.org.
 * Plan: design-plans/motion-foundation.md.
 *
 * - Tier 1, primitives: the duration ladder, the easings, the transform values.
 *   Their NAMES are fixed vocabulary; a system only scales the durations.
 * - Tier 2, roles: `use-*` = one duration + one easing, named after the place it
 *   is used. Stored as names, never ms, so the duration factor moves them all.
 * - Tier 3, choreographies: multi-track or staggered sequences that read tier 2
 *   (or a named duration + easing pair). DERIVED from the settings, never stored.
 *   Each one carries its own reduced-motion version.
 *
 * A preset is a bundle of picks over the fixed primitives, like the radius
 * presets: the preset on screen is MATCHED from the settings, never stored, so
 * moving one role afterwards reads Custom.
 *
 * Pure and DOM-free. The only motion code that will touch the DOM is the
 * runtime that plays choreographies (phase 2).
 */

// ── Tier 1 · Primitives ────────────────────────────────────────────────────

/** The source's ladder, in ms. `instant` and `fade` belong to reduced motion
 *  and never scale; every other rung scales with the system's duration factor. */
export const MOTION_DURATIONS = {
  instant: 0,
  fade: 160,
  quick: 100,
  short: 160,
  medium: 240,
  long: 360,
  'extra-long': 560,
  'super-long': 800,
  cinematic: 1200,
} as const

export type MotionDurationKey = keyof typeof MOTION_DURATIONS

export const MOTION_DURATION_KEYS = Object.keys(MOTION_DURATIONS) as MotionDurationKey[]

/** Rungs the duration factor scales. */
export const SCALED_DURATION_KEYS: readonly MotionDurationKey[] = [
  'quick', 'short', 'medium', 'long', 'extra-long', 'super-long', 'cinematic',
]

const FIXED_DURATION_KEYS = new Set<MotionDurationKey>(['instant', 'fade'])

/** How far a factor may take a rung: 0.7× to 1.5× of the published value. A
 *  preset (or a hand-set factor) that lands outside fails `motion.test.ts`. */
export const MOTION_FACTOR_MIN = 0.7
export const MOTION_FACTOR_MAX = 1.5

export function durationRange(key: MotionDurationKey): { min: number; max: number } {
  const base = MOTION_DURATIONS[key]
  if (FIXED_DURATION_KEYS.has(key)) return { min: base, max: base }
  return { min: Math.round(base * MOTION_FACTOR_MIN), max: Math.round(base * MOTION_FACTOR_MAX) }
}

/** Spring curves as CSS `linear()` point lists, verbatim from the source. */
const SPRING = 'linear(0, 0.035, 0.127, 0.257, 0.408, 0.566, 0.717, 0.854, 0.97, 1.062, 1.129, 1.173, 1.195, 1.2, 1.189, 1.169, 1.141, 1.111, 1.079, 1.05, 1.023, 1.001, 0.984, 0.972, 0.964, 0.96, 0.96, 0.963, 0.967, 0.973, 0.979, 0.986, 0.991, 0.997, 1.001, 1.004, 1.006, 1.007, 1.008, 1.008, 1.007, 1.006, 1)'
const SPRING_BOUNCY = 'linear(0, 0.071, 0.256, 0.507, 0.776, 1.023, 1.217, 1.343, 1.397, 1.386, 1.323, 1.229, 1.122, 1.019, 0.934, 0.875, 0.845, 0.842, 0.861, 0.896, 0.938, 0.981, 1.017, 1.044, 1.06, 1.064, 1.059, 1.046, 1.03, 1.013, 0.997, 0.985, 0.977, 0.974, 0.976, 0.98, 0.986, 0.993, 0.999, 1.005, 1.008, 1.01, 1.01, 1.009, 1.006, 1.004, 1.001, 0.999, 1)'

export const MOTION_EASINGS = {
  standard: 'cubic-bezier(0.45, 0.05, 0.25, 0.95)',
  entrance: 'cubic-bezier(0, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.5, 0, 1, 1)',
  emphasized: 'cubic-bezier(0.22, 1, 0.36, 1)',
  gentle: 'cubic-bezier(0.76, 0, 0.24, 1)',
  linear: 'cubic-bezier(0, 0, 1, 1)',
  spring: SPRING,
  'spring-bouncy': SPRING_BOUNCY,
} as const

export type MotionEasingKey = keyof typeof MOTION_EASINGS

export const MOTION_EASING_KEYS = Object.keys(MOTION_EASINGS) as MotionEasingKey[]

/** The source's second names for two curves. */
export const MOTION_EASING_ALIASES: Record<string, MotionEasingKey> = {
  decelerate: 'entrance',
  accelerate: 'exit',
}

/** What a consumer without CSS `linear()` (Figma, older engines) uses instead. */
export const MOTION_EASING_FALLBACK: Partial<Record<MotionEasingKey, MotionEasingKey>> = {
  spring: 'emphasized',
  'spring-bouncy': 'emphasized',
}

/** The cubic-bezier a consumer without `linear()` can always read. */
export function easingCubic(key: MotionEasingKey): string {
  return MOTION_EASINGS[MOTION_EASING_FALLBACK[key] ?? key]
}

export function resolveEasingKey(name: string): MotionEasingKey | null {
  if (name in MOTION_EASINGS) return name as MotionEasingKey
  return MOTION_EASING_ALIASES[name] ?? null
}

/** Transform ROLES. A preset sets each one's value; the published values are
 *  Standard's. Distances are px, scales are unitless. */
export const MOTION_TRANSFORM_ROLES = [
  'enter', 'glide', 'far', 'pop', 'shrink', 'anticipate', 'overshoot', 'settle', 'zoom', 'clone', 'dolly',
] as const

export type MotionTransformRole = typeof MOTION_TRANSFORM_ROLES[number]

/** Which roles are lengths (px) rather than scales. */
export const MOTION_DISTANCE_ROLES = new Set<MotionTransformRole>(['enter', 'glide', 'far', 'dolly'])

/** The value a transform role takes when it should do nothing. */
export const neutralTransform = (role: MotionTransformRole): number => (MOTION_DISTANCE_ROLES.has(role) ? 0 : 1)

export function transformCss(role: MotionTransformRole, value: number): string {
  return MOTION_DISTANCE_ROLES.has(role) ? `${value}px` : String(value)
}

// ── Tier 2 · Roles ─────────────────────────────────────────────────────────

export interface MotionPick {
  duration: MotionDurationKey
  easing: MotionEasingKey
}

export const MOTION_ROLES = [
  'use-hover', 'use-focus', 'use-press',
  'use-disclosure-in', 'use-disclosure-out',
  'use-overlay-in', 'use-overlay-out',
  'use-emphasis-in',
  'use-travel-in', 'use-travel-out',
  'use-toggle',
  'use-stagger-in', 'use-stagger-out',
  'use-reveal',
  'use-page-transition', 'use-celebration', 'use-color', 'use-loop',
  'base-functional-entrance', 'base-functional-exit', 'base-functional-standard',
  'base-expressive-entrance', 'base-expressive-exit', 'base-expressive-standard',
] as const

export type MotionRole = typeof MOTION_ROLES[number]

/** How the editor groups the roles (Variables · Motion semantics). Every role
 *  sits in exactly one group — a test holds it. */
export const MOTION_ROLE_GROUPS: readonly { label: string; roles: readonly MotionRole[] }[] = [
  { label: 'Interaction', roles: ['use-hover', 'use-focus', 'use-press', 'use-toggle'] },
  { label: 'Overlays', roles: ['use-disclosure-in', 'use-disclosure-out', 'use-overlay-in', 'use-overlay-out', 'use-emphasis-in', 'use-travel-in', 'use-travel-out'] },
  { label: 'Sequences', roles: ['use-stagger-in', 'use-stagger-out', 'use-page-transition', 'use-reveal'] },
  { label: 'Moments', roles: ['use-celebration', 'use-color', 'use-loop'] },
  { label: 'Bases', roles: ['base-functional-entrance', 'base-functional-exit', 'base-functional-standard', 'base-expressive-entrance', 'base-expressive-exit', 'base-expressive-standard'] },
]

/** The preset these settings came from: the matching one, else the one that
 *  shares the most role picks (duration factor first). What a hand-edited
 *  role is compared and reset against. */
export function nearestMotionPreset(settings: MotionSettings): MotionPresetKey {
  const exact = matchMotionPreset(settings)
  if (exact) return exact
  let best: MotionPresetKey = DEFAULT_MOTION_PRESET
  let score = -1
  for (const key of MOTION_PRESET_KEYS) {
    const p = MOTION_PRESETS[key].settings
    const same = MOTION_ROLES.filter((r) => {
      const a = settings.roles[r]
      const b = p.roles[r]
      return a?.duration === b.duration && a?.easing === b.easing
    }).length + (p.durationFactor === settings.durationFactor ? MOTION_ROLES.length : 0)
    if (same > score) { score = same; best = key }
  }
  return best
}

/** A role edited by hand: the settings with that one pick changed. The preset
 *  is matched afterwards, so this reads Custom unless it lands on one. */
export function withMotionRole(settings: MotionSettings, role: MotionRole, pick: MotionPick): MotionSettings {
  return { ...settings, roles: { ...settings.roles, [role]: { ...pick } } }
}

/** The way in of a pair that is now FASTER than its way out (the rule every
 *  preset keeps); `null` when the role is not an entrance or the pair holds. */
export function motionPairViolation(settings: MotionSettings, role: MotionRole): MotionRole | null {
  const pair = MOTION_ROLE_PAIRS.find(([inRole]) => inRole === role)
  if (!pair) return null
  const ms = (r: MotionRole) => durationMs((settings.roles[r] ?? STANDARD_ROLES[r]).duration, settings)
  return ms(pair[0]) < ms(pair[1]) ? pair[1] : null
}

/** In/out role pairs: the way in is never shorter than the way out. */
export const MOTION_ROLE_PAIRS: readonly [MotionRole, MotionRole][] = [
  ['use-disclosure-in', 'use-disclosure-out'],
  ['use-overlay-in', 'use-overlay-out'],
  ['use-travel-in', 'use-travel-out'],
  ['use-stagger-in', 'use-stagger-out'],
  ['base-functional-entrance', 'base-functional-exit'],
  ['base-expressive-entrance', 'base-expressive-exit'],
]

/** What an agent (and the docs) is told about each role. */
export const MOTION_ROLE_INTENT: Record<MotionRole, { usage: string[]; direction: string }> = {
  'use-hover': { usage: ['hover'], direction: 'Fast and responsive; the most frequent interaction on desktop.' },
  'use-focus': { usage: ['focus ring'], direction: 'Same speed as hover; the entrance curve lets the ring settle as someone tabs through.' },
  'use-press': { usage: ['pressed state'], direction: 'Immediate; the exit curve reads as a press going down.' },
  'use-disclosure-in': { usage: ['tooltip', 'popover', 'dropdown', 'select'], direction: 'Small content appearing next to its trigger; time to settle.' },
  'use-disclosure-out': { usage: ['tooltip', 'popover', 'dropdown', 'select'], direction: 'Gets out of the way quickly.' },
  'use-overlay-in': { usage: ['dialog backdrop', 'sheet backdrop', 'drawer backdrop'], direction: 'The layer that covers the page arriving.' },
  'use-overlay-out': { usage: ['dialog', 'sheet', 'drawer'], direction: 'An overlay leaving; shorter than its entrance.' },
  'use-emphasis-in': { usage: ['dialog card', 'focal element'], direction: 'The element the eye should land on; the expressive curve, a beat behind its backdrop.' },
  'use-travel-in': { usage: ['sheet panel', 'drawer panel'], direction: 'A panel crossing the screen into place.' },
  'use-travel-out': { usage: ['sheet panel', 'drawer panel'], direction: 'The panel leaving the way it came.' },
  'use-toggle': { usage: ['switch thumb'], direction: 'A state change the thumb travels across.' },
  'use-stagger-in': { usage: ['list items', 'grid cards'], direction: 'One child of a staggered reveal.' },
  'use-stagger-out': { usage: ['list items being dismissed'], direction: 'One child of a staggered dismissal.' },
  'use-reveal': { usage: ['hero text', 'headline lines'], direction: 'Storytelling: slow, deliberate, meant to be watched.' },
  'use-page-transition': { usage: ['route change', 'view change'], direction: 'The whole view changing.' },
  'use-celebration': { usage: ['success moments', 'confetti'], direction: 'Expressive and long; rare by design.' },
  'use-color': { usage: ['theme switch', 'colour change'], direction: 'Slow and symmetric so a colour shift does not flash.' },
  'use-loop': { usage: ['spinner', 'indeterminate progress'], direction: 'Continuous motion: linear, one full turn per cycle.' },
  'base-functional-entrance': { usage: ['any functional entrance with no role of its own'], direction: 'Fallback for UI that appears.' },
  'base-functional-exit': { usage: ['any functional exit with no role of its own'], direction: 'Fallback for UI that leaves.' },
  'base-functional-standard': { usage: ['any functional change in place'], direction: 'Fallback for UI that changes without entering or leaving.' },
  'base-expressive-entrance': { usage: ['any expressive entrance'], direction: 'Fallback for storytelling arrivals.' },
  'base-expressive-exit': { usage: ['any expressive exit'], direction: 'Fallback for storytelling departures.' },
  'base-expressive-standard': { usage: ['any expressive change in place'], direction: 'Fallback for storytelling changes.' },
}

/** What an agent is told about each duration rung. */
export const MOTION_DURATION_INTENT: Record<MotionDurationKey, { usage: string[]; direction: string }> = {
  instant: { usage: ['reduced motion'], direction: 'No animation: the change happens at once.' },
  fade: { usage: ['reduced motion'], direction: 'The cross-fade that replaces travel and scale when motion is reduced.' },
  quick: { usage: ['hover', 'focus', 'press', 'toggles'], direction: 'The fastest perceptible response; reads near-instant.' },
  short: { usage: ['small disclosures'], direction: 'Small content entering; fast but visible.' },
  medium: { usage: ['overlays', 'positional travel'], direction: 'Functional motion that needs a little more time.' },
  long: { usage: ['choreography', 'panels'], direction: 'Coordinated motion between elements.' },
  'extra-long': { usage: ['celebration', 'colour change'], direction: 'Expressive, still part of using the product.' },
  'super-long': { usage: ['storytelling', 'loops'], direction: 'Meant to be noticed rather than used.' },
  cinematic: { usage: ['hero moments'], direction: 'Storytelling only; never on a control.' },
}

const p = (duration: MotionDurationKey, easing: MotionEasingKey): MotionPick => ({ duration, easing })

/** Standard's roles: the source's published recipes, plus the roles Escala's
 *  choreographies read. */
const STANDARD_ROLES: Record<MotionRole, MotionPick> = {
  'use-hover': p('quick', 'standard'),
  'use-focus': p('quick', 'entrance'),
  'use-press': p('quick', 'exit'),
  'use-disclosure-in': p('short', 'entrance'),
  'use-disclosure-out': p('quick', 'exit'),
  'use-overlay-in': p('medium', 'entrance'),
  'use-overlay-out': p('short', 'exit'),
  'use-emphasis-in': p('long', 'emphasized'),
  'use-travel-in': p('long', 'entrance'),
  'use-travel-out': p('medium', 'exit'),
  'use-toggle': p('long', 'standard'),
  'use-stagger-in': p('short', 'entrance'),
  'use-stagger-out': p('quick', 'exit'),
  'use-reveal': p('cinematic', 'gentle'),
  'use-page-transition': p('long', 'emphasized'),
  'use-celebration': p('extra-long', 'emphasized'),
  'use-color': p('extra-long', 'gentle'),
  'use-loop': p('super-long', 'linear'),
  'base-functional-entrance': p('short', 'entrance'),
  'base-functional-exit': p('quick', 'exit'),
  'base-functional-standard': p('short', 'standard'),
  'base-expressive-entrance': p('long', 'emphasized'),
  'base-expressive-exit': p('medium', 'exit'),
  'base-expressive-standard': p('long', 'standard'),
}

// ── Settings (what a system stores) ────────────────────────────────────────

export interface MotionSettings {
  /** Multiplies every scaled rung. 0.7–1.5. */
  durationFactor: number
  roles: Record<MotionRole, MotionPick>
  transforms: Record<MotionTransformRole, number>
  /** Delay between children of a list reveal, ms. Dismissal and text reveal
   *  derive their own offsets from it. */
  stagger: number
}

// ── The five presets ───────────────────────────────────────────────────────

export const MOTION_PRESET_KEYS = ['snappy', 'standard', 'expressive', 'playful', 'calm'] as const
export type MotionPresetKey = typeof MOTION_PRESET_KEYS[number]

export interface MotionPreset {
  key: MotionPresetKey
  label: string
  brief: string
  settings: MotionSettings
}

const T = (enter: number, far: number, pop: number, shrink: number, anticipate: number, overshoot: number, settle: number, zoom: number, clone: number, dolly: number): Record<MotionTransformRole, number> =>
  ({ enter, glide: enter, far, pop, shrink, anticipate, overshoot, settle, zoom, clone, dolly })

const withRoles = (patch: Partial<Record<MotionRole, MotionPick>>): Record<MotionRole, MotionPick> =>
  ({ ...STANDARD_ROLES, ...patch })

export const MOTION_PRESETS: Record<MotionPresetKey, MotionPreset> = {
  snappy: {
    key: 'snappy',
    label: 'Snappy',
    brief: 'Fast and direct. Short travel, no bounce.',
    settings: {
      durationFactor: 0.75,
      roles: withRoles({
        'use-emphasis-in': p('medium', 'entrance'),
        'use-travel-in': p('medium', 'entrance'),
        'use-travel-out': p('short', 'exit'),
        'use-toggle': p('medium', 'standard'),
        'use-reveal': p('long', 'entrance'),
        'use-page-transition': p('medium', 'entrance'),
        'use-celebration': p('long', 'entrance'),
        'base-expressive-entrance': p('medium', 'entrance'),
        'base-expressive-standard': p('medium', 'standard'),
      }),
      transforms: T(4, 24, 0.97, 0.98, 0.95, 1, 1, 0.85, 0.75, -120),
      stagger: 60,
    },
  },
  standard: {
    key: 'standard',
    label: 'Standard',
    brief: 'The reference values. Functional first, expressive where it helps.',
    settings: {
      durationFactor: 1,
      roles: withRoles({}),
      transforms: T(8, 40, 0.94, 0.96, 0.9, 1.06, 1.02, 0.7, 0.5, -240),
      stagger: 100,
    },
  },
  expressive: {
    key: 'expressive',
    label: 'Expressive',
    brief: 'Generous arrivals on the emphasized curve and soft springs. Exits stay fast.',
    settings: {
      durationFactor: 1.25,
      roles: withRoles({
        'use-disclosure-in': p('short', 'emphasized'),
        'use-overlay-in': p('long', 'emphasized'),
        'use-emphasis-in': p('long', 'spring'),
        'use-travel-in': p('long', 'emphasized'),
        'use-stagger-in': p('short', 'emphasized'),
        'use-celebration': p('extra-long', 'spring'),
      }),
      transforms: T(12, 56, 0.92, 0.95, 0.88, 1.06, 1.02, 0.65, 0.5, -320),
      stagger: 100,
    },
  },
  playful: {
    key: 'playful',
    label: 'Playful',
    brief: 'Bouncy springs and a bigger overshoot. Exits stay fast.',
    settings: {
      durationFactor: 1.25,
      roles: withRoles({
        'use-disclosure-in': p('short', 'spring'),
        'use-overlay-in': p('long', 'emphasized'),
        'use-emphasis-in': p('long', 'spring-bouncy'),
        'use-travel-in': p('long', 'spring'),
        'use-stagger-in': p('short', 'spring'),
        'use-page-transition': p('long', 'spring'),
        'use-celebration': p('extra-long', 'spring-bouncy'),
        'base-expressive-entrance': p('long', 'spring'),
      }),
      transforms: T(12, 56, 0.9, 0.94, 0.85, 1.1, 1.03, 0.6, 0.45, -320),
      stagger: 120,
    },
  },
  calm: {
    key: 'calm',
    label: 'Calm',
    brief: 'Slow fades on the gentle curve. No travel, no scale. Not the reduced-motion mode.',
    settings: {
      durationFactor: 1.5,
      roles: withRoles({
        'use-hover': p('quick', 'gentle'),
        'use-focus': p('quick', 'gentle'),
        'use-press': p('quick', 'gentle'),
        'use-disclosure-in': p('medium', 'gentle'),
        'use-overlay-in': p('long', 'gentle'),
        'use-emphasis-in': p('long', 'gentle'),
        'use-travel-in': p('long', 'gentle'),
        'use-toggle': p('long', 'gentle'),
        'use-stagger-in': p('short', 'gentle'),
        'use-page-transition': p('extra-long', 'gentle'),
        'use-celebration': p('extra-long', 'gentle'),
        'base-functional-entrance': p('short', 'gentle'),
        'base-functional-standard': p('short', 'gentle'),
        'base-expressive-entrance': p('long', 'gentle'),
        'base-expressive-standard': p('long', 'gentle'),
      }),
      transforms: T(0, 0, 1, 1, 1, 1, 1, 1, 1, 0),
      stagger: 140,
    },
  },
}

export const DEFAULT_MOTION_PRESET: MotionPresetKey = 'standard'

/** A fresh copy of a preset's settings — what applying the preset writes. */
export function motionPresetPatch(key: MotionPresetKey): MotionSettings {
  return structuredCloneSettings(MOTION_PRESETS[key].settings)
}

export function defaultMotionSettings(): MotionSettings {
  return motionPresetPatch(DEFAULT_MOTION_PRESET)
}

function structuredCloneSettings(s: MotionSettings): MotionSettings {
  return {
    durationFactor: s.durationFactor,
    roles: Object.fromEntries(MOTION_ROLES.map((r) => [r, { ...s.roles[r] }])) as Record<MotionRole, MotionPick>,
    transforms: { ...s.transforms },
    stagger: s.stagger,
  }
}

function sameSettings(a: MotionSettings, b: MotionSettings): boolean {
  if (a.durationFactor !== b.durationFactor || a.stagger !== b.stagger) return false
  for (const r of MOTION_ROLES) {
    if (a.roles[r]?.duration !== b.roles[r].duration || a.roles[r]?.easing !== b.roles[r].easing) return false
  }
  for (const t of MOTION_TRANSFORM_ROLES) if (a.transforms[t] !== b.transforms[t]) return false
  return true
}

/** The preset these settings ARE, or null (Custom). */
export function matchMotionPreset(settings: MotionSettings): MotionPresetKey | null {
  return MOTION_PRESET_KEYS.find((k) => sameSettings(settings, MOTION_PRESETS[k].settings)) ?? null
}

/** Accepts anything (persisted state, an import) and returns complete settings:
 *  every missing or invalid field takes Standard's value. */
export function normalizeMotionSettings(input: unknown): MotionSettings {
  const base = defaultMotionSettings()
  if (!input || typeof input !== 'object') return base
  const raw = input as Partial<Record<keyof MotionSettings, unknown>>
  const factor = typeof raw.durationFactor === 'number' && Number.isFinite(raw.durationFactor)
    ? Math.min(MOTION_FACTOR_MAX, Math.max(MOTION_FACTOR_MIN, raw.durationFactor))
    : base.durationFactor
  const roles = { ...base.roles }
  if (raw.roles && typeof raw.roles === 'object') {
    for (const r of MOTION_ROLES) {
      const pick = (raw.roles as Record<string, unknown>)[r] as Partial<MotionPick> | undefined
      if (pick && typeof pick === 'object' && pick.duration && pick.duration in MOTION_DURATIONS && pick.easing && pick.easing in MOTION_EASINGS) {
        roles[r] = { duration: pick.duration, easing: pick.easing }
      }
    }
  }
  const transforms = { ...base.transforms }
  if (raw.transforms && typeof raw.transforms === 'object') {
    for (const t of MOTION_TRANSFORM_ROLES) {
      const v = (raw.transforms as Record<string, unknown>)[t]
      if (typeof v === 'number' && Number.isFinite(v)) transforms[t] = v
    }
  }
  const stagger = typeof raw.stagger === 'number' && Number.isFinite(raw.stagger) && raw.stagger >= 0
    ? raw.stagger
    : base.stagger
  return { durationFactor: factor, roles, transforms, stagger }
}

/** The settings a tokens.json `motion` block was written from (`motionTokens`):
 *  its roles keep their names, transforms and stagger come back from their CSS
 *  text. Anything unreadable falls back to Standard, like `normalizeMotionSettings`. */
export function motionSettingsFromTokens(motion: unknown): MotionSettings {
  if (!motion || typeof motion !== 'object') return defaultMotionSettings()
  const m = motion as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN)
  const transforms: Record<string, number> = {}
  if (m.transforms && typeof m.transforms === 'object') {
    for (const [k, v] of Object.entries(m.transforms as Record<string, unknown>)) transforms[k] = num(v)
  }
  return normalizeMotionSettings({ durationFactor: m.durationFactor, roles: m.roles, transforms, stagger: num(m.stagger) })
}

// ── Resolution ─────────────────────────────────────────────────────────────

/** A rung in ms for these settings. */
export function durationMs(key: MotionDurationKey, settings: Pick<MotionSettings, 'durationFactor'>): number {
  const base = MOTION_DURATIONS[key]
  if (FIXED_DURATION_KEYS.has(key)) return base
  return Math.round(base * settings.durationFactor)
}

export function motionDurations(settings: MotionSettings): Record<MotionDurationKey, number> {
  return Object.fromEntries(MOTION_DURATION_KEYS.map((k) => [k, durationMs(k, settings)])) as Record<MotionDurationKey, number>
}

export interface ResolvedMotionRole extends MotionPick {
  ms: number
  /** `<ms>ms <easing>` — ready for a `transition` or `animation` shorthand. */
  value: string
}

export function resolveMotionRole(role: MotionRole, settings: MotionSettings): ResolvedMotionRole {
  const pick = settings.roles[role] ?? STANDARD_ROLES[role]
  const ms = durationMs(pick.duration, settings)
  return { ...pick, ms, value: `${ms}ms ${MOTION_EASINGS[pick.easing]}` }
}

// ── Tier 3 · Choreography ──────────────────────────────────────────────────

export interface MotionKeyframes {
  opacity?: string[]
  transform?: string[]
  height?: string[]
  /** One offset per keyframe (0…1), when the keyframes are not evenly spaced. */
  offset?: number[]
  /** One easing name per SEGMENT (keyframes − 1). */
  easing?: MotionEasingKey[]
}

/** A track's motion: a role (what the preset sets) or a named pair. */
export type MotionRef = { role: MotionRole } | MotionPick

export interface ChoreographyTrack {
  /** The recipe slot the track animates (`data-slot`). Absent = the root. */
  slot?: string
  keyframes: string
  motion: MotionRef
  /** A duration rung, or 0. */
  delay: MotionDurationKey | 0
}

interface ChoreographyBody {
  pattern: 'coordinated' | 'stagger' | 'disclosure'
  tracks?: ChoreographyTrack[]
  /** stagger */
  child?: { slot?: string; keyframes: string; motion: MotionRef }
  offset?: number
  direction?: 'forward' | 'reverse' | 'expand' | 'collapse'
  maxElements?: number
  /** disclosure */
  motion?: MotionRef
}

export interface Choreography extends ChoreographyBody {
  /** Catalogue components that play it. Empty = no component yet (agent use). */
  components: string[]
  intent: { usage: string[]; direction: string }
  reducedMotion: ChoreographyBody & { collapseTo: 'coordinated' | 'parallel' | 'disclosure' }
}

const FADE_IN: MotionPick = { duration: 'fade', easing: 'entrance' }
const FADE_OUT: MotionPick = { duration: 'fade', easing: 'exit' }
const INSTANT: MotionPick = { duration: 'instant', easing: 'standard' }

/** The keyframe sets choreographies use — one static set for every system.
 *  Transforms read the transform ROLES (`var(--motion-transform-pop)`), so a
 *  preset that softens `pop` softens every choreography using it, and the
 *  switch's squash reads `--motion-squash` (0 when the preset has no
 *  overshoot). Static on purpose: a stylesheet can carry them once. */
export const MOTION_KEYFRAMES: Record<string, MotionKeyframes> = {
  'fade-in': { opacity: ['0', '1'] },
  'fade-out': { opacity: ['1', '0'] },
  pop: { opacity: ['0', '1'], transform: ['scale(var(--motion-transform-pop))', 'scale(1)'] },
  shrink: { opacity: ['1', '0'], transform: ['scale(1)', 'scale(var(--motion-transform-shrink))'] },
  rise: { opacity: ['0', '1'], transform: ['translateY(var(--motion-transform-enter))', 'translateY(0)'] },
  sink: { opacity: ['1', '0'], transform: ['translateY(0)', 'translateY(var(--motion-transform-enter))'] },
  unmask: { transform: ['translateY(100%)', 'translateY(0)'] },
  'slide-in-right': { transform: ['translateX(100%)', 'translateX(0)'] },
  'slide-out-right': { transform: ['translateX(0)', 'translateX(100%)'] },
  'slide-in-left': { transform: ['translateX(-100%)', 'translateX(0)'] },
  'slide-out-left': { transform: ['translateX(0)', 'translateX(-100%)'] },
  'slide-in-top': { transform: ['translateY(-100%)', 'translateY(0)'] },
  'slide-out-top': { transform: ['translateY(0)', 'translateY(-100%)'] },
  'slide-in-bottom': { transform: ['translateY(100%)', 'translateY(0)'] },
  'slide-out-bottom': { transform: ['translateY(0)', 'translateY(100%)'] },
  // Height from 0 to the content's own (a Radix disclosure publishes it;
  // the recipe points `--escala-disclosure-height` at that variable).
  'disclosure-expand': { height: ['0', 'var(--escala-disclosure-height)'] },
  'disclosure-collapse': { height: ['var(--escala-disclosure-height)', '0'] },
  'switch-move': { transform: ['translateX(var(--switch-from))', 'translateX(var(--switch-to))'] },
  'switch-toggle': {
    transform: [
      'translateX(var(--switch-from)) scaleX(1) scaleY(1)',
      'translateX(var(--switch-from)) scaleX(calc(1 - var(--motion-squash))) scaleY(calc(1 + var(--motion-squash)))',
      'translateX(calc(var(--switch-from) + (var(--switch-to) - var(--switch-from)) * 0.9)) scaleX(calc(1 + var(--motion-squash))) scaleY(calc(1 - var(--motion-squash)))',
      'translateX(var(--switch-to)) scaleX(1) scaleY(1)',
    ],
    offset: [0, 0.278, 0.722, 1],
    easing: ['entrance', 'gentle', 'exit'],
  },
  'spring-in': {
    opacity: ['0', '1', '1', '1', '1'],
    transform: [
      'scale(var(--motion-transform-pop))',
      'scale(var(--motion-transform-overshoot))',
      'scale(var(--motion-transform-shrink))',
      'scale(var(--motion-transform-settle))',
      'scale(1)',
    ],
    offset: [0, 0.3, 0.52, 0.75, 1],
    easing: ['entrance', 'standard', 'standard', 'entrance'],
  },
}

/** How far the switch thumb squashes: 0.1 at the published overshoot (1.06),
 *  capped at 0.15, 0 with no overshoot. */
export function motionSquash(settings: MotionSettings): number {
  return +Math.min(0.15, Math.max(0, (settings.transforms.overshoot - 1) * 1.67)).toFixed(3)
}

/** The keyframe sets (kept as a function for callers that pass settings). */
export function motionKeyframes(_settings?: MotionSettings): Record<string, MotionKeyframes> {
  return MOTION_KEYFRAMES
}

/** Every choreography for these settings. Which keyframes a component plays
 *  follows the settings: no overshoot → no squash or spring, no travel → fades. */
export function motionChoreographies(settings: MotionSettings): Record<string, Choreography> {
  const s = settings.transforms
  const bounces = s.overshoot > 1
  const travels = s.enter > 0
  const r = (role: MotionRole): MotionRef => ({ role })
  const fadeTracks = (slots: string[], pick: MotionPick): ChoreographyTrack[] =>
    slots.map((slot) => ({ slot, keyframes: pick === FADE_OUT ? 'fade-out' : 'fade-in', motion: pick, delay: 0 }))
  const sheet = (side: 'right' | 'left' | 'bottom'): [Choreography, Choreography] => [
    {
      pattern: 'coordinated',
      components: side === 'bottom' ? ['Drawer'] : ['Sheet'],
      intent: { usage: [side === 'bottom' ? 'drawers' : 'side panels'], direction: 'The backdrop fades while the panel crosses into place from its edge.' },
      tracks: [
        { slot: 'overlay', keyframes: 'fade-in', motion: r('use-overlay-in'), delay: 0 },
        { slot: 'content', keyframes: `slide-in-${side}`, motion: r('use-travel-in'), delay: 0 },
      ],
      reducedMotion: { collapseTo: 'coordinated', pattern: 'coordinated', tracks: fadeTracks(['overlay', 'content'], FADE_IN) },
    },
    {
      pattern: 'coordinated',
      components: side === 'bottom' ? ['Drawer'] : ['Sheet'],
      intent: { usage: [side === 'bottom' ? 'drawers' : 'side panels'], direction: 'The panel leaves the way it came; the backdrop follows, shorter.' },
      tracks: [
        { slot: 'content', keyframes: `slide-out-${side}`, motion: r('use-travel-out'), delay: 0 },
        { slot: 'overlay', keyframes: 'fade-out', motion: r('use-overlay-out'), delay: 0 },
      ],
      reducedMotion: { collapseTo: 'coordinated', pattern: 'coordinated', tracks: fadeTracks(['content', 'overlay'], FADE_OUT) },
    },
  ]
  const [sheetEnter, sheetExit] = sheet('right')
  const [drawerEnter, drawerExit] = sheet('bottom')

  return {
    'dialog-enter': {
      pattern: 'coordinated',
      components: ['Dialog', 'AlertDialog'],
      intent: { usage: ['dialogs', 'confirmations', 'focal overlays'], direction: 'The backdrop fades while the card pops a beat behind it. The card is the focal point, so it takes the emphasis role and a `quick` delay.' },
      tracks: [
        { slot: 'overlay', keyframes: 'fade-in', motion: r('use-overlay-in'), delay: 0 },
        { slot: 'content', keyframes: 'pop', motion: r('use-emphasis-in'), delay: 'quick' },
      ],
      reducedMotion: { collapseTo: 'coordinated', pattern: 'coordinated', tracks: fadeTracks(['overlay', 'content'], FADE_IN) },
    },
    'dialog-exit': {
      pattern: 'coordinated',
      components: ['Dialog', 'AlertDialog'],
      intent: { usage: ['dialogs', 'confirmations'], direction: 'Card and backdrop leave together, fast.' },
      tracks: [
        { slot: 'content', keyframes: 'shrink', motion: r('use-overlay-out'), delay: 0 },
        { slot: 'overlay', keyframes: 'fade-out', motion: r('use-overlay-out'), delay: 0 },
      ],
      reducedMotion: { collapseTo: 'coordinated', pattern: 'coordinated', tracks: fadeTracks(['content', 'overlay'], FADE_OUT) },
    },
    'sheet-enter': sheetEnter,
    'sheet-exit': sheetExit,
    'drawer-enter': drawerEnter,
    'drawer-exit': drawerExit,
    'switch-toggle': {
      pattern: 'coordinated',
      components: ['Switch'],
      intent: { usage: ['switch'], direction: bounces ? 'The thumb squashes as it leaves and stretches as it lands.' : 'The thumb slides across; this preset carries no squash.' },
      tracks: [{ slot: 'thumb', keyframes: bounces ? 'switch-toggle' : 'switch-move', motion: r('use-toggle'), delay: 0 }],
      reducedMotion: { collapseTo: 'coordinated', pattern: 'coordinated', tracks: [{ slot: 'thumb', keyframes: 'switch-move', motion: INSTANT, delay: 0 }] },
    },
    'list-reveal': {
      pattern: 'stagger',
      components: [],
      intent: { usage: ['lists', 'card grids', 'search results'], direction: 'Rows rise into place one after another, capped so a long list is not slow.' },
      child: { keyframes: travels ? 'rise' : 'fade-in', motion: r('use-stagger-in') },
      offset: settings.stagger,
      direction: 'forward',
      maxElements: 8,
      reducedMotion: { collapseTo: 'parallel', pattern: 'stagger', child: { keyframes: 'fade-in', motion: FADE_IN }, offset: 0 },
    },
    'list-dismiss': {
      pattern: 'stagger',
      components: [],
      intent: { usage: ['clearing a list', 'bulk delete'], direction: 'Rows sink away from the last one up, faster than they arrived.' },
      child: { keyframes: travels ? 'sink' : 'fade-out', motion: r('use-stagger-out') },
      offset: Math.round(settings.stagger * 0.6),
      direction: 'reverse',
      maxElements: 8,
      reducedMotion: { collapseTo: 'parallel', pattern: 'stagger', child: { keyframes: 'fade-out', motion: FADE_OUT }, offset: 0 },
    },
    'text-reveal': {
      pattern: 'stagger',
      components: [],
      intent: { usage: ['hero headlines', 'marketing text'], direction: 'Each line rises out of its own mask. Storytelling only; never on product UI.' },
      child: { slot: 'line', keyframes: travels ? 'unmask' : 'fade-in', motion: r('use-reveal') },
      offset: Math.round(settings.stagger * 0.8),
      direction: 'forward',
      maxElements: 8,
      reducedMotion: { collapseTo: 'parallel', pattern: 'stagger', child: { slot: 'line', keyframes: 'fade-in', motion: FADE_IN }, offset: 0 },
    },
    'accordion-expand': {
      pattern: 'disclosure',
      components: ['Accordion', 'Collapsible'],
      intent: { usage: ['accordion', 'collapsible'], direction: 'Height eases open; never a jump cut.' },
      direction: 'expand',
      motion: r('use-disclosure-in'),
      reducedMotion: { collapseTo: 'disclosure', pattern: 'disclosure', direction: 'expand', motion: INSTANT },
    },
    'accordion-collapse': {
      pattern: 'disclosure',
      components: ['Accordion', 'Collapsible'],
      intent: { usage: ['accordion', 'collapsible'], direction: 'Height eases closed, faster than it opened.' },
      direction: 'collapse',
      motion: r('use-disclosure-out'),
      reducedMotion: { collapseTo: 'disclosure', pattern: 'disclosure', direction: 'collapse', motion: INSTANT },
    },
    'popover-enter': {
      pattern: 'coordinated',
      components: ['Popover', 'Tooltip', 'HoverCard', 'DropdownMenu', 'ContextMenu', 'Select', 'Menubar'],
      intent: { usage: ['popovers', 'tooltips', 'menus'], direction: 'A floating layer grows out of its trigger: a short pop on the disclosure role.' },
      tracks: [{ keyframes: s.pop < 1 ? 'pop' : 'fade-in', motion: r('use-disclosure-in'), delay: 0 }],
      reducedMotion: { collapseTo: 'coordinated', pattern: 'coordinated', tracks: [{ keyframes: 'fade-in', motion: FADE_IN, delay: 0 }] },
    },
    'popover-exit': {
      pattern: 'coordinated',
      components: ['Popover', 'Tooltip', 'HoverCard', 'DropdownMenu', 'ContextMenu', 'Select', 'Menubar'],
      intent: { usage: ['popovers', 'tooltips', 'menus'], direction: 'Gets out of the way, faster than it came.' },
      tracks: [{ keyframes: s.shrink < 1 ? 'shrink' : 'fade-out', motion: r('use-disclosure-out'), delay: 0 }],
      reducedMotion: { collapseTo: 'coordinated', pattern: 'coordinated', tracks: [{ keyframes: 'fade-out', motion: FADE_OUT, delay: 0 }] },
    },
    'sonner-enter': {
      pattern: 'coordinated',
      components: ['Sonner'],
      intent: { usage: ['toasts', 'notifications'], direction: bounces ? 'The toast springs in: pop, overshoot, settle.' : travels ? 'The toast rises into place.' : 'The toast fades in.' },
      tracks: [bounces
        ? { keyframes: 'spring-in', motion: { duration: 'cinematic', easing: 'standard' }, delay: 0 }
        : { keyframes: travels ? 'rise' : 'fade-in', motion: r('use-disclosure-in'), delay: 0 }],
      reducedMotion: { collapseTo: 'coordinated', pattern: 'coordinated', tracks: [{ keyframes: 'fade-in', motion: FADE_IN, delay: 0 }] },
    },
  }
}

/** Resolve a track's motion reference to a pick. */
export function resolveMotionRef(ref: MotionRef, settings: MotionSettings): MotionPick {
  return 'role' in ref ? (settings.roles[ref.role] ?? STANDARD_ROLES[ref.role]) : ref
}

// ── tokens.json ────────────────────────────────────────────────────────────

/** The `motion` block of tokens.json. Additive (no schemaVersion bump). */
export function motionTokens(settings: MotionSettings) {
  const durations = motionDurations(settings)
  return {
    preset: matchMotionPreset(settings),
    durationFactor: settings.durationFactor,
    durations: Object.fromEntries(MOTION_DURATION_KEYS.map((k) => [k, `${durations[k]}ms`])),
    easings: { ...MOTION_EASINGS },
    easingFallbacks: Object.fromEntries(Object.entries(MOTION_EASING_FALLBACK).map(([k, v]) => [k, MOTION_EASINGS[v!]])),
    easingAliases: { ...MOTION_EASING_ALIASES },
    transforms: Object.fromEntries(MOTION_TRANSFORM_ROLES.map((t) => [t, transformCss(t, settings.transforms[t])])),
    stagger: `${settings.stagger}ms`,
    roles: Object.fromEntries(MOTION_ROLES.map((role) => {
      const res = resolveMotionRole(role, settings)
      return [role, { duration: res.duration, easing: res.easing, value: res.value }]
    })),
    choreography: motionChoreographies(settings),
    keyframes: MOTION_KEYFRAMES,
    intent: {
      durations: Object.fromEntries(MOTION_DURATION_KEYS.map((k) => [k, {
        ...MOTION_DURATION_INTENT[k],
        constraints: { range: { ...durationRange(k), unit: 'ms' } },
      }])),
      roles: MOTION_ROLE_INTENT,
    },
  }
}

/** One brand's motion in `foundationsByTheme`: the picks and their resolved
 *  values, without the shared vocabulary (easings, keyframes, intent) the
 *  root `motion` block already carries. `motionSettingsFromTokens` reads it. */
export function motionThemeTokens(settings: MotionSettings) {
  const full = motionTokens(settings)
  return {
    preset: full.preset,
    durationFactor: full.durationFactor,
    durations: full.durations,
    transforms: full.transforms,
    stagger: full.stagger,
    roles: full.roles,
  }
}

// ── CSS ────────────────────────────────────────────────────────────────────

/** Roles that keep their duration under reduced motion: interaction feedback
 *  (a colour change, not travel) and loaders (the motion IS the information). */
const KEEP_UNDER_REDUCED = new Set<MotionRole>(['use-hover', 'use-focus', 'use-press', 'use-loop'])

/** The custom property one choreography track writes. A disclosure (no
 *  tracks) is `--motion-choreo-<name>`. */
export function choreographyVar(name: string, slot?: string): string {
  return `--motion-choreo-${name}${slot ? `-${slot}` : ''}`
}

function refCss(ref: MotionRef): string {
  if ('role' in ref) return `var(--motion-${ref.role})`
  return `var(--motion-duration-${ref.duration}) var(--motion-easing-${ref.easing})`
}

function animationCss(keyframes: string, ref: MotionRef, delay: MotionDurationKey | 0): string {
  const d = delay === 0 ? '0ms' : `var(--motion-duration-${delay})`
  return `motion-${keyframes} ${refCss(ref)} ${d} both`
}

/** `name → animation shorthand` for every track a component plays (tokens of
 *  one body: the full one or its reduced-motion version). */
function choreographyVarsOf(name: string, body: Choreography | Choreography['reducedMotion']): Record<string, string> {
  const out: Record<string, string> = {}
  for (const t of body.tracks ?? []) out[choreographyVar(name, t.slot)] = animationCss(t.keyframes, t.motion, t.delay)
  if (body.pattern === 'disclosure' && body.motion) {
    out[choreographyVar(name)] = animationCss(body.direction === 'collapse' ? 'disclosure-collapse' : 'disclosure-expand', body.motion, 0)
  }
  return out
}

/**
 * Every motion custom property for these settings, as `name → value`. ONE
 * source for `variables.css` (`:root` and its reduced-motion block) and for a
 * preview scope, which sets them inline. `reduced` gives the values a viewer
 * who asked for less motion gets: no travel, no scale, short fades.
 */
export function motionCssVars(settings: MotionSettings, opts: { reduced?: boolean } = {}): Record<string, string> {
  const vars: Record<string, string> = {}
  const durations = motionDurations(settings)
  MOTION_DURATION_KEYS.forEach((k) => { vars[`--motion-duration-${k}`] = `${durations[k]}ms` })
  MOTION_EASING_KEYS.forEach((k) => { vars[`--motion-easing-${k}`] = MOTION_EASINGS[k] })
  Object.entries(MOTION_EASING_ALIASES).forEach(([alias, key]) => { vars[`--motion-easing-${alias}`] = `var(--motion-easing-${key})` })
  MOTION_TRANSFORM_ROLES.forEach((t) => {
    vars[`--motion-transform-${t}`] = transformCss(t, opts.reduced ? neutralTransform(t) : settings.transforms[t])
  })
  vars['--motion-squash'] = String(opts.reduced ? 0 : motionSquash(settings))
  vars['--motion-stagger'] = `${opts.reduced ? 0 : settings.stagger}ms`
  MOTION_ROLES.forEach((role) => {
    const pick = settings.roles[role] ?? STANDARD_ROLES[role]
    if (opts.reduced && !KEEP_UNDER_REDUCED.has(role)) {
      const exits = /-(out|exit)$/.test(role)
      vars[`--motion-${role}`] = `var(--motion-duration-fade) var(--motion-easing-${exits ? 'exit' : 'entrance'})`
    } else {
      vars[`--motion-${role}`] = `var(--motion-duration-${pick.duration}) var(--motion-easing-${pick.easing})`
    }
  })
  for (const [name, c] of Object.entries(motionChoreographies(settings))) {
    if (!c.components.length) continue // no component plays it (list, text): data only
    Object.assign(vars, choreographyVarsOf(name, opts.reduced ? c.reducedMotion : c))
  }
  return vars
}

const pct = (n: number) => `${+(n * 100).toFixed(1)}%`

function keyframesCss(name: string, kf: MotionKeyframes): string[] {
  const count = Math.max(kf.opacity?.length ?? 0, kf.transform?.length ?? 0, kf.height?.length ?? 0)
  if (!count) return []
  const offsets = kf.offset ?? Array.from({ length: count }, (_, i) => (count === 1 ? 0 : i / (count - 1)))
  const lines = [`@keyframes motion-${name} {`]
  for (let i = 0; i < count; i++) {
    const decls: string[] = []
    if (kf.opacity?.[i] !== undefined) decls.push(`opacity: ${kf.opacity[i]};`)
    if (kf.transform?.[i] !== undefined) decls.push(`transform: ${kf.transform[i]};`)
    if (kf.height?.[i] !== undefined) decls.push(`height: ${kf.height[i]};`)
    const ease = kf.easing?.[i]
    if (ease) decls.push(`animation-timing-function: var(--motion-easing-${ease});`)
    lines.push(`  ${pct(offsets[i])} { ${decls.join(' ')} }`)
  }
  lines.push('}')
  return lines
}

/** `@keyframes motion-*` — static, the same for every system. `only` keeps a subset. */
export function motionKeyframesCss(only?: readonly string[]): string[] {
  return Object.entries(MOTION_KEYFRAMES)
    .filter(([name]) => !only || only.includes(name))
    .flatMap(([name, kf]) => keyframesCss(name, kf))
}

/** Declarations that go inside `:root`. */
export function motionRootCss(settings: MotionSettings): string[] {
  return ['/* Motion — lib/motion.ts. Roles: `transition: background-color var(--motion-use-hover)` */',
    ...Object.entries(motionCssVars(settings)).map(([k, v]) => `${k}: ${v};`)]
}

/** The motion declarations a brand block overrides: the ones whose value
 *  differs from the root system's, full and reduced. Empty when the brand
 *  moves like the root. */
export function motionThemeCssDiff(root: MotionSettings, theme: MotionSettings): { full: string[]; reduced: string[] } {
  const rootFull = motionCssVars(root)
  const themeFull = motionCssVars(theme)
  const rootReduced = motionCssVars(root, { reduced: true })
  const themeReduced = motionCssVars(theme, { reduced: true })
  const overridden = Object.keys(themeFull).filter((k) => rootFull[k] !== themeFull[k])
  // Under reduced motion the brand block must restate every property it
  // overrides (its full value would beat `:root`'s reduced one), plus any
  // whose reduced value is its own.
  const reducedKeys = [...new Set([...overridden, ...Object.keys(themeReduced).filter((k) => rootReduced[k] !== themeReduced[k])])]
  return {
    full: overridden.map((k) => `${k}: ${themeFull[k]};`),
    reduced: reducedKeys.filter((k) => k in themeReduced).map((k) => `${k}: ${themeReduced[k]};`),
  }
}

/** Top-level blocks after `:root`: keyframes, the `linear()` fallback, and
 *  the reduced-motion override (only the properties that change). */
export function motionTrailingCss(settings: MotionSettings, themed: { selector: string; reduced: string[] }[] = []): string[] {
  const lines: string[] = ['', '/* Motion — keyframes the choreographies play (tokens.json `motion.choreography`) */', ...motionKeyframesCss()]

  const springs = (Object.keys(MOTION_EASING_FALLBACK) as MotionEasingKey[])
  lines.push('', '@supports not (transition-timing-function: linear(0, 1)) {', '  :root {')
  springs.forEach((k) => lines.push(`    --motion-easing-${k}: ${easingCubic(k)};`))
  lines.push('  }', '}')

  const full = motionCssVars(settings)
  const reduced = motionCssVars(settings, { reduced: true })
  lines.push('', '/* Reduced motion: no travel, no scale; a short fade instead. */', '@media (prefers-reduced-motion: reduce) {', '  :root {')
  for (const [k, v] of Object.entries(reduced)) if (full[k] !== v) lines.push(`    ${k}: ${v};`)
  lines.push('  }')
  // A brand that moves its own way overrides the roles in its block, which
  // beats `:root` — so its reduced values have to be restated there too.
  for (const t of themed) {
    if (!t.reduced.length) continue
    lines.push(`  ${t.selector} {`, ...t.reduced.map((d) => `    ${d}`), '  }')
  }
  lines.push('}')
  return lines
}

// ── Markdown ───────────────────────────────────────────────────────────────

export function motionMarkdown(settings: MotionSettings): string {
  const preset = matchMotionPreset(settings)
  const durations = motionDurations(settings)
  const rows = (cells: string[][]) => cells.map((c) => `| ${c.join(' | ')} |`).join('\n')
  const choreo = motionChoreographies(settings)
  return [
    '## Motion',
    '',
    `Preset: **${preset ? MOTION_PRESETS[preset].label : 'Custom'}** · durations ×${settings.durationFactor}. Reduced motion is built in: \`prefers-reduced-motion\` removes travel and scale and swaps every entrance and exit for a ${MOTION_DURATIONS.fade}ms fade.`,
    '',
    '### Durations',
    '',
    '| Token | Value | Use |',
    '|-------|-------|-----|',
    rows(MOTION_DURATION_KEYS.map((k) => [`\`--motion-duration-${k}\``, `${durations[k]}ms`, MOTION_DURATION_INTENT[k].usage.join(', ')])),
    '',
    '### Easings',
    '',
    '| Token | Value |',
    '|-------|-------|',
    rows(MOTION_EASING_KEYS.map((k) => [`\`--motion-easing-${k}\``, k in MOTION_EASING_FALLBACK ? `spring \`linear()\` (fallback \`${easingCubic(k)}\`)` : `\`${MOTION_EASINGS[k]}\``])),
    '',
    '### Roles',
    '',
    'Reach for a role, never a raw duration. `transition: opacity var(--motion-use-disclosure-in)`.',
    '',
    '| Token | Duration · easing | Use |',
    '|-------|-------------------|-----|',
    rows(MOTION_ROLES.map((role) => {
      const res = resolveMotionRole(role, settings)
      return [`\`--motion-${role}\``, `${res.duration} (${res.ms}ms) · ${res.easing}`, MOTION_ROLE_INTENT[role].usage.join(', ')]
    })),
    '',
    '### Transforms',
    '',
    '| Token | Value |',
    '|-------|-------|',
    rows(MOTION_TRANSFORM_ROLES.map((t) => [`\`--motion-transform-${t}\``, `\`${transformCss(t, settings.transforms[t])}\``])),
    '',
    '### Choreography',
    '',
    'Full sequences ship in `tokens.json` under `motion.choreography`, each with its reduced-motion version.',
    '',
    '| Name | Pattern | Components | What it does |',
    '|------|---------|------------|--------------|',
    rows(Object.entries(choreo).map(([name, c]) => [`\`${name}\``, c.pattern, c.components.join(', ') || '—', c.intent.direction])),
  ].join('\n')
}
