// Full-theme Random — the Color-edition button used to spin hue only.
// System Styles already prove that personality is a RECIPE (radius · type ·
// shadow · border semantics · icon weight), not a colour. This generator
// borrows one style's geometry and border recipe, then replaces the things
// that make two clicks feel like two different systems: accent voice, font
// pairing, type-scale density, and often the paper tint.
//
// Nothing here invents a token. Fonts come from FONT_PRESETS, radii from
// RADIUS_GROUP_STEPS via the style's own roles, shadows/strokes/sizes from
// the borrowed style, semantics from that style's documented recipe.

import { backgroundFromBase, colorAtHue, neutralFromBrand, readHuePosition, type HuePosition, type NeutralTint } from './colorUtils'
import { FONT_PRESETS, loadGoogleFont } from './fonts'
import { myThemeKeys } from './themeLibrary'
import { mintTheme, slotsFromAccent } from './themeMint'
import { resetThemeSemantics, type StylePreview } from './stylePreviewOverlay'
import { useDesignStore } from '../store/useDesignStore'
import { daringHue, oppositeNeutralHue, randomHue } from './randomAccent'
import {
  THEME_STYLE_PRESETS,
  type ThemeStylePreset,
  type ThemeStyleSemantics,
} from './themePresets'
import type { ThemeFoundationOverride } from './themeFoundations'
import {
  TYPE_SCALE_MODES,
  buildTypeScale,
  type TypeScaleMode,
} from './typographyStandard'
import type { ThemeAppearance } from './themeModes'
import { RADIUS_STANDARD, STROKE_STANDARD, radiusRolesFromGroups } from './layoutTokens'
import { SHADOW_PRESETS } from './shadowTokens'
import { pickMood, type MoodStates, type ThemeMood } from './themeMoods'

/** Relative positions — same contract as SpectrumSlider, so a voice stays
 *  vivid at every hue instead of ratcheting into mud. */
const ACCENT_VOICES: HuePosition[] = [
  { saturation: 0.94, lightness: 0.50 },
  { saturation: 0.90, lightness: 0.36 },
  { saturation: 0.80, lightness: 0.62 },
  { saturation: 0.74, lightness: 0.44 },
]

type FontPair = readonly [body: string, heading: string]

const FONT_VOICES: Record<'product' | 'editorial' | 'display' | 'mono', FontPair[]> = {
  product: [
    ['Inter', 'Inter'],
    ['Geist', 'Geist'],
    ['DM Sans', 'DM Sans'],
    ['Plus Jakarta Sans', 'Plus Jakarta Sans'],
    ['IBM Plex Sans', 'IBM Plex Sans'],
    ['Source Sans 3', 'Source Sans 3'],
    ['Manrope', 'Manrope'],
    ['Figtree', 'Figtree'],
  ],
  editorial: [
    ['Newsreader', 'Playfair Display'],
    ['Inter', 'Fraunces'],
    ['Inter', 'Cormorant Garamond'],
    ['Source Serif 4', 'Playfair Display'],
    ['Literata', 'Fraunces'],
    ['Lora', 'Instrument Serif'],
    ['DM Sans', 'Newsreader'],
  ],
  display: [
    ['Space Grotesk', 'Space Grotesk'],
    ['Bricolage Grotesque', 'Bricolage Grotesque'],
    ['Outfit', 'Outfit'],
    ['Sora', 'Sora'],
    ['Epilogue', 'Fraunces'],
    ['Plus Jakarta Sans', 'Fraunces'],
  ],
  mono: [
    ['JetBrains Mono', 'JetBrains Mono'],
    ['IBM Plex Mono', 'IBM Plex Mono'],
    ['Geist Mono', 'Geist Mono'],
    ['Courier Prime', 'Courier Prime'],
    ['Space Mono', 'Space Mono'],
  ],
}

function voiceFor(preset: ThemeStylePreset): keyof typeof FONT_VOICES {
  switch (preset.id) {
    case 'editorial-serif':
    case 'luxury-noir':
    case 'nature-organic':
      return 'editorial'
    case 'terminal-mono':
    case 'retro-vintage':
      return 'mono'
    case 'neo-brutalism':
    case 'swiss-grid':
    case 'playful-candy':
    case 'cupertino-glass':
      return 'display'
    default:
      return 'product'
  }
}

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]
}

function pickOther<T>(items: readonly T[], avoid: T | undefined, rng: () => number, same: (a: T, b: T) => boolean): T {
  if (items.length === 1) return items[0]
  const pool = avoid == null ? items : items.filter((item) => !same(item, avoid))
  return pick(pool.length ? pool : items, rng)
}

export interface RandomThemeInput {
  /** The accent on screen. Kept for callers; the new accent comes from the
   *  mood, which is never the one just shown (`avoidMood`). */
  accent: string
  bodyFont?: string
  headingFont?: string
  typeScale?: TypeScaleMode | null
  avoidScaffold?: string
  /** The last spin's mood id — never drawn twice in a row. */
  avoidMood?: string
  rng?: () => number
}

export interface RandomThemeRecipe {
  accent: string
  /** Neutral seed with its OWN hue — the page is no longer a tint of the
   *  accent (see `themeMoods`). Writing it unlinks the neutral from the
   *  accent, which is the point: the two are separate decisions now. */
  neutral: string
  neutralTint: NeutralTint
  /** The mood's four severity seeds. */
  states: MoodStates
  /** The appearance the mood was designed in; the board opens on it. */
  appearance: ThemeAppearance
  /** Curated DaisyUI id, or `procedural`. */
  moodId: string
  bodyFont: string
  headingFont: string
  typeScale: TypeScaleMode
  scaffoldId: string
  foundations: ThemeFoundationOverride
  semantics: ThemeStyleSemantics | undefined
}

/** Scaffolds whose elevation or stroke IS their signature — a mood keeps
 *  their shadows (Neo's hard offset, Retro's ink, Nature's flat) instead of
 *  painting its own depth over them. Neo also keeps its 2px stroke. */
const SIGNATURE_SHADOWS = new Set(['neo-brutalism', 'retro-vintage', 'nature-organic'])

/**
 * A scaffold's semantics, minus the overrides tuned to THAT style's own
 * accent and severities. Border, surface and ink recipes travel with the
 * scaffold (they are its personality); `action.*` and `status.*` pins — e.g.
 * Glass forcing `{accent.9}` as its dark button — were measured against
 * Glass's cyan, and pinned onto a mood's pale lavender or neon lime they
 * would bypass the solver that keeps the label readable.
 */
export function moodSafeSemantics(semantics: ThemeStyleSemantics | undefined): ThemeStyleSemantics | undefined {
  if (!semantics) return semantics
  const out: ThemeStyleSemantics = {}
  for (const [token, modes] of Object.entries(semantics)) {
    if (token.startsWith('action.') || token.startsWith('status.')) continue
    out[token] = modes
  }
  return out
}

/** A mood's geometry painted over a scaffold: the three radius axes on the
 *  standard ramp, the border width, and depth → Subtle / Soft elevation. */
export function moodFoundations(scaffold: ThemeStylePreset, mood: ThemeMood): ThemeFoundationOverride {
  const signature = SIGNATURE_SHADOWS.has(scaffold.id)
  const stroke = { ...(scaffold.foundations.stroke ?? STROKE_STANDARD) }
  if (scaffold.id !== 'neo-brutalism') stroke.sm = `${mood.border}px`
  return {
    ...scaffold.foundations,
    radius: { ...RADIUS_STANDARD },
    radiusRoles: radiusRolesFromGroups(mood.radius),
    stroke,
    shadows: signature
      ? scaffold.foundations.shadows
      : { ...SHADOW_PRESETS[mood.depth ? 2 : 1].values },
  }
}

export function randomAccentVoice(
  current: string,
  rng: () => number = Math.random,
): string {
  const { hue } = readHuePosition(current)
  return colorAtHue(pick(ACCENT_VOICES, rng), randomHue(hue, rng))
}

/** A brand colour on the far side of the wheel, still at a vivid voice so it
 *  does not collapse into grey. */
export function daringAccent(
  current: string,
  rng: () => number = Math.random,
): string {
  const { hue } = readHuePosition(current)
  return colorAtHue(pick(ACCENT_VOICES, rng), daringHue(hue, rng))
}

/** Paper hue opposite the accent. `tinted` / `vivid` keep enough chroma that
 *  the opposition is visible; `pure` and `subtle` would hide it. */
export function oppositeNeutral(
  accent: string,
  tint: NeutralTint,
  rng: () => number = Math.random,
): string {
  const { hue } = readHuePosition(accent)
  const seed = colorAtHue({ saturation: 0.85, lightness: 0.5 }, oppositeNeutralHue(hue, rng))
  return neutralFromBrand(seed, tint)
}

export function randomTheme(input: RandomThemeInput): RandomThemeRecipe {
  const rng = input.rng ?? Math.random
  const scaffold = pickOther(
    THEME_STYLE_PRESETS,
    THEME_STYLE_PRESETS.find((preset) => preset.id === input.avoidScaffold),
    rng,
    (a, b) => a.id === b.id,
  )
  const pairs = FONT_VOICES[voiceFor(scaffold)]
  const currentPair: FontPair | undefined =
    input.bodyFont && input.headingFont ? [input.bodyFont, input.headingFont] : undefined
  const [bodyFont, headingFont] = pickOther(
    pairs,
    currentPair,
    rng,
    (a, b) => a[0] === b[0] && a[1] === b[1],
  )
  const typeScale = pickOther(
    TYPE_SCALE_MODES.map((mode) => mode.key),
    input.typeScale ?? undefined,
    rng,
    (a, b) => a === b,
  )
  const { sizes, lineHeights } = buildTypeScale(
    TYPE_SCALE_MODES.find((mode) => mode.key === typeScale)?.factor ?? 1,
  )
  const baseType = scaffold.foundations.typography
  // Colour + geometry come from a MOOD (DaisyUI's built-ins, or its own
  // randomiser) — see `themeMoods`. The scaffold keeps type, sizes, spacing,
  // icon weight and its border recipe.
  const mood = pickMood(rng, input.avoidMood)
  return {
    accent: mood.accent,
    neutral: mood.neutral,
    neutralTint: mood.neutralTint,
    states: { ...mood.states },
    appearance: mood.appearance,
    moodId: mood.id,
    bodyFont,
    headingFont,
    typeScale,
    scaffoldId: scaffold.id,
    semantics: moodSafeSemantics(scaffold.semantics),
    foundations: {
      ...moodFoundations(scaffold, mood),
      typography: {
        fontFamily: bodyFont,
        headingFontFamily: headingFont,
        sizes,
        lineHeights,
        weights: { ...(baseType?.weights ?? {}) },
        roles: { ...(baseType?.roles ?? {}) },
      },
    },
  }
}

/** A Random tweak on a try-on: the scaffold's geometry and severities, with
 *  the recipe's accent, tint, type and border recipe painted on top. The id
 *  stays the scaffold's, so adopting it files the theme under that style. */
export function stylePreviewFromRecipe(
  current: StylePreview,
  recipe: RandomThemeRecipe,
  appearance: ThemeAppearance,
): StylePreview {
  const scaffold = THEME_STYLE_PRESETS.find((preset) => preset.id === recipe.scaffoldId) ?? current.preset
  return {
    appearance,
    preset: {
      ...scaffold,
      accent: recipe.accent,
      neutral: recipe.neutral,
      neutralTint: recipe.neutralTint,
      states: { ...recipe.states },
      preferredAppearance: recipe.appearance,
      foundations: recipe.foundations,
      semantics: recipe.semantics,
    },
  }
}

/** A theme that came out of Random has no name of its own: it is called
 *  "Random" (then "Random 2", "Random 3"…) until the designer names it. */
export const RANDOM_THEME_LABEL = 'Random'

export function nextRandomLabel(labels: Record<string, string>): string {
  const taken = new Set(Object.values(labels).map((label) => label.trim()))
  if (!taken.has(RANDOM_THEME_LABEL)) return RANDOM_THEME_LABEL
  let n = 2
  while (taken.has(`${RANDOM_THEME_LABEL} ${n}`)) n++
  return `${RANDOM_THEME_LABEL} ${n}`
}

/** Label to give `themeKey` after a Random tweak, or null to keep its name.
 *  Only a name the designer never chose is replaced: the style's own label
 *  ("Core / Minimalist" — now a lie, the look is random) or none at all. A
 *  name they typed stays, and a theme already called Random stays as it is. */
export function randomLabelAfterTweak(
  themeKey: string,
  labels: Record<string, string>,
  origin: string | undefined,
): string | null {
  const current = labels[themeKey]?.trim()
  if (current && (current === RANDOM_THEME_LABEL || current.startsWith(`${RANDOM_THEME_LABEL} `))) return null
  const styleLabel = origin ? THEME_STYLE_PRESETS.find((preset) => preset.id === origin)?.label : undefined
  const untouched = !current || current === styleLabel
  return untouched ? nextRandomLabel(labels) : null
}

/** Module count on the Theme Preview artefacts board — keep in sync with
 *  `SystemCollage`'s `ScaledModule` rows. */
export const COLLAGE_TILE_COUNT = 24

/** Flip the whole artefacts board to light or dark — never a per-tile mix. */
export function randomBoardAppearance(
  rng: () => number = Math.random,
): ThemeAppearance {
  return rng() < 0.5 ? 'light' : 'dark'
}

export type RandomThemeStart =
  | { status: 'upgrade' }
  /** `minted`: a brand-new draft theme, not one the designer already had. */
  | { status: 'open'; key: string; minted: boolean }
  | { status: 'error'; error: string }

/**
 * The Home "Random" door. Free keeps the one theme it already has and opens
 * that instead of minting; with no theme of its own the caller shows Pro.
 * Otherwise mint the recipe, write its foundations, and return the new key.
 */
export function startRandomTheme(previewTheme: string, needsPro: boolean): RandomThemeStart {
  if (needsPro) {
    const s = useDesignStore.getState()
    const own = myThemeKeys(s.themeOrder, s.themes)
    const key = own.includes(previewTheme) ? previewTheme : own[0]
    if (key) return { status: 'open', key, minted: false }
    return { status: 'upgrade' }
  }
  const s = useDesignStore.getState()
  const recipe = randomTheme({ accent: s.primaryColor })
  const slots = slotsFromAccent(recipe.accent, recipe.neutralTint, recipe.states)
  slots.gray = recipe.neutral
  const res = mintTheme(
    slots,
    recipe.appearance,
    '',
    null,
    recipe.neutralTint,
    {
      light: backgroundFromBase(slots.gray, 'light', recipe.neutralTint),
      dark: backgroundFromBase(slots.gray, 'dark', recipe.neutralTint),
    },
  )
  if ('error' in res) return { status: 'error', error: res.error }
  const next = useDesignStore.getState()
  next.setThemeFoundations(res.key, recipe.foundations)
  next.setThemeLabel(res.key, nextRandomLabel(next.themeLabels))
  useDesignStore.setState({
    architectureOverrides: resetThemeSemantics(next.architectureOverrides, recipe.semantics, res.key),
  })
  loadGoogleFont(recipe.bodyFont)
  loadGoogleFont(recipe.headingFont)
  return { status: 'open', key: res.key, minted: true }
}

/** Guard: every pairing names a family the type picker actually ships. */
export function fontPairingsAreCatalogued(): boolean {
  const known = new Set(FONT_PRESETS.map((font) => font.value))
  return Object.values(FONT_VOICES).every((pairs) =>
    pairs.every(([body, heading]) => known.has(body) && known.has(heading)),
  )
}
