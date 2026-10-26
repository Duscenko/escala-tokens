# Motion foundation

Give motion the same place in Escala as colour, radius and spacing: primitives, roles that name
an intent, and choreographies for multi-element sequences. Each System Style picks a motion
preset, the same way it already picks a radius preset.

Source: motiondesignsystem.org (read 2026-10-25, page + the site's own stylesheet, which carries
tokens the page does not list: `instant`, `fade`, the springs, every transform).

## Decisions (2026-10-25, owner)

- **The chrome keeps its own motion**, independent of the system on screen — the same rule as
  `ESCALA_CHROME_ACCENT`. A preset never reaches Escala's own UI.
- **Springs ship verbatim** as CSS `linear()`, with their cubic fallback (`emphasized`) in
  `motion.easingFallbacks` and an `@supports not (… linear(0, 1))` block in the CSS.
- **Text reveal ships** as a choreography with no component (agents can use it).

## State

**Phase 1 done (2026-10-25).**

- `lib/motion.ts` (pure, DOM-free): primitives, 24 roles, five presets, `matchMotionPreset`,
  `normalizeMotionSettings`, derived choreographies + keyframes, and the CSS / tokens.json /
  Markdown builders. Tests: `motion.test.ts` (ranges, in ≥ out, round-trip, every reference
  resolves, reduced has no travel), `motionExports.test.ts` (the shipped files).
- Store v103: `motion: MotionSettings` in `DesignSnapshot`, `setMotion`; every system and saved
  copy is seeded with Standard. Nothing reads it on screen yet.
- Ships in tokens.json (`motion`, additive, no schemaVersion bump), `variables.css`
  (`--motion-*` in `:root`, `@keyframes motion-*`, the `linear()` fallback, the
  `prefers-reduced-motion` block), the README (`## Motion`) and the agent context
  (`references/foundations.md` → `## Motion`).
- **Moved to phase 4, with the plugin:** the W3C document (it IS the Figma file — five
  collections the plugin mirrors — so a Motion group lands there together with the plugin's
  `Motion` collection), and aliasing transform distances to the Dimension primitives (adding them
  to the ladder changes `Dimension Primitives` in Figma). Phase 1 ships distances as px.

**Phase 2 done (2026-10-26).** Components move from the system's motion.

- **One table, `lib/recipes/motion.ts` (`RECIPE_MOTION`)**: per component, which ROLE times each
  property a state changes (`transitions`: slot → property → role) and which CHOREOGRAPHY plays
  on open / close (`enter` / `exit`, optional `slot` for a portaled panel, `origin`,
  `sideAttr`). Names only. Merged into `COMPONENT_RECIPES` at load (`recipe.motion`).
- **`recipeMotionCss` (`recipeStyles.ts`)** emits `transition: <prop> var(--motion-<role>, 150ms …)`
  (the fallback keeps a component outside any scope easing) and, per choreography track,
  `animation: var(--motion-choreo-<name>-<slot>, none)` on Radix's open / closed states. The
  sheet carries only the keyframes some component plays (`playedKeyframes`).
- **No Web Animations runtime — decided against.** Radix keeps a closing layer mounted until
  its CSS exit animation ends (`animationend`); script-driven animations would not get that, so
  the "runtime" is the stylesheet. `lib/motionRuntime.ts` does not exist. Product-only patterns
  (list stagger, text reveal, switch squash) stay data in tokens.json for a product's runtime.
- **Values**: `RecipeScope` sets `motionCssVars(t.motion, { reduced })` inline (reduced from
  `useReducedMotion`, since an inline style cannot media-query); `variables.css` carries the
  same names. A preset change retimes every component with no rebuild.
- **`data-inline`** (a dialog drawn open in place on the board / docs) never plays a choreography.
- **The shadcn registry ships it**: each item's `@layer components` gets the recipe's motion
  rules and keyframes, its `:root` the `--motion-*` values it reaches (transitively), plus the
  `prefers-reduced-motion` and `linear()`-fallback blocks (`motionSheetOf`, read back from
  tokens.json by `motionSettingsFromTokens`). `cssRulesOf` now nests at-rules (it used to drop
  an `@media` prelude).
- Wired: 37 components incl. Select's and Menubar's portaled `content` (popover-enter). Not
  wired, on purpose: Sonner and Drawer (the libraries own their motion), Spinner / Skeleton /
  OTP caret (loops on their own keyframes), the sliding pill (framer-motion). NavigationMenu's
  chevron reads `--motion-use-disclosure-in` from its class (it is not a recipe slot).
- Tests: `recipeMotion.test.ts` (every role / choreography / slot / keyframe resolves, the
  sheet's vars are answered in every preset full and reduced, by the preview AND variables.css,
  `data-inline` never animates, tokens.json round-trips, no `duration-*` / `ease-*` /
  `transition-*` utility left in `escala-ui`); `shadcnRegistry.test.ts` (motion vars resolve per item).

**Phase 3 done (2026-10-26).** Each brand moves its own way, and it is edited like the rest.

- **Motion is per brand**: `ThemeFoundationOverride.motion` (`resolveThemeFoundations` falls back
  to the root `motion`). The preview, `codeScope` (Get code), tokens.json
  (`foundationsByTheme[t].motion` = `motionThemeTokens`, read back by `motionSettingsFromTokens`)
  and `variables.css` follow it: a brand block overrides only the `--motion-*` that differ
  (`motionThemeCssDiff`) and the reduced-motion block RESTATES every property the brand
  overrode — otherwise its full-motion value would beat `:root`'s reduced one.
- **System Styles**: all 18 carry `motion: motionPresetPatch(…)` per the table above, written as
  the LAST foundation key. **Store v104** gives a brand already adopted from a style
  (`themeOrigin`) its style's motion, appended last, so `themeHasEdits` (a JSON compare against
  the preset) still reads it as untouched.
- **Moods**: `ThemeMood.motion`; curated by `CURATED_MOOD_MOTION` (the six that are styles agree),
  procedural draws `drawMotionPreset` (Standard 40 %, others 15 %), appended LAST to the rng
  sequence so every earlier draw is unchanged. `moodFoundations` (Random) applies it. Shuffle
  locks: motion rides the `shape` axis.
- **Editor**: a seventh accordion row, **Motion** (`EditionCard foundationKey="motion"`, glyph
  `motion-variables.svg`): `MotionPreview` (a dialog entering + a list revealing, played from the
  brand's own settings, reduced when the viewer asks; Replay remounts it) + the Preset picker.
  Also in the create studio (`CREATE_STEPS`) and the Edit list. Variables gets the `motion`
  foundation (`MotionSemantics`, one collection `Motion semantics`, route
  `variables/<brand>/motion/semantics`): Preset in the rail, the 24 roles in five groups
  (`MOTION_ROLE_GROUPS`), each a duration select + easing select + play swatch + reset. No free ms.
  An edited role is compared with `nearestMotionPreset`; an entrance made faster than its exit is
  flagged (`motionPairViolation`).
- **Inspector**: a Motion filter (`tokenTrace.motionRows`): each transition (role, variable,
  duration + easing) and each enter / exit choreography with its tracks' timing. Not clickable
  (no Token Details drawer for motion). The filter row wraps.
- Tests: `motionStyles.test.ts` (the 18 assignments, ≥ 3 styles per preset, moods, the 40/15
  draw, per-brand resolution / tokens.json / CSS incl. reduced, groups, nearest preset, the pair
  rule), `tokenTrace.test.ts` (motion rows).
- **Not done, phase 4**: the plugin's `ST_ROWS` Motion row (the rule "when a web rail row
  changes, change its plugin row too" applies there), the `Motion` collection, W3C.

## Tier 1 — Primitives (fixed, not edited per system)

Like `SPACING_STEPS` / `RADIUS_STANDARD`: the ladder is the vocabulary, presets pick from it.

### Duration

| token | ms | intent |
|---|---|---|
| `instant` | 0 | the reduced-motion jump |
| `quick` | 100 | hover, focus, press, toggles |
| `short` | 160 | small disclosures |
| `fade` | 160 | the reduced-motion cross-fade (same value as short, different job) |
| `medium` | 240 | overlays, positional travel |
| `long` | 360 | choreography |
| `extra-long` | 560 | celebration, colour change |
| `super-long` | 800 | storytelling |
| `cinematic` | 1200 | hero text, attention |

The name is the token. A preset scales the ms (see presets) but never renames a rung, so
`long` always means "choreography pace", whatever it resolves to.

### Easing

| token | value | intent |
|---|---|---|
| `standard` | `cubic-bezier(0.45, 0.05, 0.25, 0.95)` | symmetric default |
| `entrance` (alias `decelerate`) | `cubic-bezier(0, 0, 0.2, 1)` | settles in |
| `exit` (alias `accelerate`) | `cubic-bezier(0.5, 0, 1, 1)` | gets out of the way |
| `emphasized` | `cubic-bezier(0.22, 1, 0.36, 1)` | expressive arrival |
| `gentle` | `cubic-bezier(0.76, 0, 0.24, 1)` | slow, symmetric storytelling |
| `linear` | `cubic-bezier(0, 0, 1, 1)` | continuous loops (spinner, progress) |
| `spring` | `linear(…)`, peaks ~1.2 | soft overshoot |
| `spring-bouncy` | `linear(…)`, peaks ~1.4 | playful overshoot |

Springs are CSS `linear()` point lists, copied verbatim from the source. `linear()` is a CSS
easing, so they need a cubic fallback where it is not supported (Figma, older consumers):
`spring` → `emphasized`, `spring-bouncy` → `emphasized`.

### Transform

| token | value | role name (tier 2) |
|---|---|---|
| `translate-sm` | 8px | `enter`, `glide` |
| `translate-lg` | 40px | `far` |
| `scale-pop` | 0.94 | `pop` |
| `scale-shrink` | 0.96 | `shrink` |
| `scale-anticipate` | 0.9 | `anticipate` |
| `scale-overshoot` | 1.06 | `overshoot` |
| `scale-settle` | 1.02 | `settle` |
| `scale-zoom` | 0.7 | `zoom` |
| `scale-clone` | 0.5 | `clone` |
| `translate-z-dolly` | -240px | `dolly` |

- **Distances alias the Dimension primitives** (`dimension-8`, `dimension-40`), like every other
  length (`lib/dimensions.ts`). A distance the ladder lacks (-240) is added to it the way a pinned
  length already is.
- **Scales are unitless numbers**, so they get their own primitives (`motion-scale-<n>`), the same
  move as Grid's `columns/<n>`. Never alias a dimension for a scale.

## Tier 2 — Semantic roles (stored per system, picked by the preset)

A role is a recipe: **duration + easing**, named after where it is used. Stored as two refs
(`{ duration: 'quick', easing: 'standard' }`), never as ms, so a preset's duration factor moves
every role at once.

| role | default | used by |
|---|---|---|
| `use-hover` | quick · standard | every hover state |
| `use-focus` | quick · entrance | focus ring |
| `use-press` | quick · exit | pressed state |
| `use-disclosure-in` | short · entrance | tooltip, popover, dropdown in |
| `use-disclosure-out` | quick · exit | the same, out |
| `use-overlay-in` | medium · entrance | dialog, sheet, drawer in |
| `use-overlay-out` | short · exit | the same, out |
| `use-page-transition` | long · emphasized | route / view change |
| `use-celebration` | extra-long · emphasized | success moments (`lib/celebrate.ts`) |
| `use-color` | extra-long · gentle | theme / appearance switch |
| `use-loop` | super-long · linear | spinner, indeterminate progress (Escala addition: the source has no role for it) |
| `use-emphasis-in` | long · emphasized | the focal element of an overlay (dialog card) |
| `use-travel-in` / `-out` | long · entrance / medium · exit | a panel crossing the screen (sheet, drawer) |
| `use-toggle` | long · standard | switch thumb |
| `use-stagger-in` / `-out` | short · entrance / quick · exit | one child of a staggered list |
| `use-reveal` | cinematic · gentle | hero text lines |

The last five rows are Escala additions too: the source's choreographies name raw pairs
("long emphasized"), Escala's read ROLES, so that a preset reaches every choreography.

Plus the source's six bases, which are the first thing an agent should reach for when no role fits:
`base-functional-{entrance, exit, standard}` = short·entrance / quick·exit / short·standard,
`base-expressive-{entrance, exit, standard}` = long·emphasized / medium·exit / long·standard.

Transform roles (`enter`, `pop`, `shrink`, `overshoot`, `settle`, `far`) are tier 2 too: the preset
decides how far a thing travels and how much it pops.

**The rule worth keeping from the source: an entrance is slower than its exit.** Every in/out pair
above respects it. A test asserts it per role pair, per preset.

## Tier 3 — Choreography

A DTCG token with a custom `$type: "choreography"`. Its fields reference tiers 1–2 by name
(`"motion": "long emphasized"`, `"delay": "quick"`), never raw ms. Three patterns:

- **coordinated**: parallel tracks, each `{ selector, keyframes, motion, delay }`.
- **stagger**: one child recipe repeated with `offset`, `direction` (forward | reverse), `maxElements`.
- **disclosure**: height expand / collapse.

Escala's choreographies, mapped to catalogue components (the selectors become recipe SLOTS, i.e.
`data-slot` values, not the source's class names):

| choreography | pattern | tracks (full motion) | reduced |
|---|---|---|---|
| `dialog-enter` / `-exit` | coordinated | overlay fade-in (medium·entrance) + content pop (long·emphasized, delay quick) / content shrink + overlay fade-out (short·exit) | content fade (fade·entrance / exit) |
| `sheet-enter` / `-exit` (also Drawer) | coordinated | overlay fade + panel slide-in-from-side (long·entrance) / slide-out (medium·exit) + fade (short·exit) | both fade |
| `switch-toggle` | coordinated | thumb squash-and-stretch, 4 keyframes, offsets 0·0.278·0.722·1, easings entrance·gentle·exit (long·standard) | thumb moves, instant |
| `list-reveal` / `-dismiss` | stagger | children rise (short·entrance, offset 100ms, forward) / sink (quick·exit, 60ms, reverse), max 8 | parallel fade, offset 0 |
| `text-reveal` | stagger | lines unmask (cinematic·gentle, 80ms) | parallel fade |
| `accordion-expand` / `-collapse` (also Collapsible) | disclosure | short·entrance / quick·exit | instant |
| `sonner-enter` | coordinated | spring-in: pop → overshoot → shrink → settle → 1 (cinematic·standard) | fade |

Keyframes are named and shared (`fade-in`, `fade-out`, `pop`, `shrink`, `rise`, `sink`, `unmask`,
`slide-in-<side>`, `slide-out-<side>`, `spring-in`, `switch-toggle`) and read transform ROLES
(`var(--motion-transform-pop)`), so a preset that softens `pop` softens every choreography using it.

### Reduced motion is part of the contract

Every choreography carries its own `reducedMotion` block, and one without it fails a test (the same
way a colour role without a dark value would). Reduced does not mean none: travel and scale go to 0,
a cross-fade on `fade` stays, a stagger collapses to `parallel`. Hover / focus / press roles keep
their colour change but drop any transform.

### `ai.intent`

Every primitive and role ships `$extensions["ai.intent"]`: `usage` (list), `direction` (one
sentence), and for durations `constraints.range` (e.g. `quick` 80–140ms). The range bounds what a
preset factor may produce: a preset whose factor pushes `quick` outside its range fails the test.
The ranges therefore define how far presets can go; they are written once here, not per preset.

Each range is the published value × 0.7 to × 1.5 (`durationRange`), the bounds of the duration
factor, so every preset fits by construction: quick 70–150 · short 112–240 · medium 168–360 ·
long 252–540 · extra-long 392–840 · super-long 560–1200 · cinematic 840–1800. (The source
publishes one range, `quick` 80–140; a fixed table would have rejected Calm.) `instant` and
`fade` do not scale.

## The five presets

A preset is a BUNDLE of picks over the fixed primitives — never a regenerated ladder. Same rule as
`RADIUS_ROLE_PRESETS`: applying one writes the roles; moving one role afterwards reads "Custom".

| | Snappy | Standard | Expressive | Playful | Calm |
|---|---|---|---|---|---|
| **Duration factor** | ×0.75 | ×1 | ×1.25 | ×1.25 | ×1.5 |
| quick · short · medium · long (ms) | 75 · 120 · 180 · 270 | 100 · 160 · 240 · 360 | 125 · 200 · 300 · 450 | 125 · 200 · 300 · 450 | 150 · 240 · 360 · 540 |
| `use-hover` / `focus` / `press` | quick · standard / entrance / exit | same | same | same | quick · gentle (all three) |
| `use-disclosure-in` | short · entrance | short · entrance | short · emphasized | short · spring | medium · gentle |
| `use-overlay-in` | medium · entrance | medium · entrance | long · emphasized | long · emphasized | long · gentle |
| `use-emphasis-in` (dialog card) | medium · entrance | long · emphasized | long · spring | long · spring-bouncy | long · gentle |
| `use-page-transition` | medium · entrance | long · emphasized | long · emphasized | long · spring | extra-long · gentle |
| `use-celebration` | long · entrance | extra-long · emphasized | extra-long · spring | extra-long · spring-bouncy | extra-long · gentle |
| transform `enter` | 4px | 8px | 12px | 12px | 0 (fade only) |
| `pop` / `shrink` | 0.97 / 0.98 | 0.94 / 0.96 | 0.92 / 0.95 | 0.9 / 0.94 | 1 / 1 |
| `overshoot` / `settle` | 1 / 1 | 1.06 / 1.02 | 1.06 / 1.02 | 1.1 / 1.03 | 1 / 1 |
| Sonner enter | fade + rise | spring-in | spring-in | spring-in, bouncy | fade |
| Switch | slide, no squash | squash-and-stretch | squash-and-stretch | squash-and-stretch, bouncy | slide, no squash |
| Stagger offset (list) | 60ms | 100ms | 100ms | 120ms | 140ms |

Exits are not lengthened by Expressive / Playful: `use-*-out` stays on quick · exit and short · exit
in every preset except Calm (which uses the factor like everything else). Getting out of the way
fast is functional, not a matter of character. Snappy at ×0.75 still respects every range.
Calm is the motion-sensitive-friendly look: no travel, no scale, slow fades. It is NOT the
reduced-motion mode. Reduced motion applies on top of any preset, Calm included.

## Assignment to the System Styles

Three System Styles are named after an existing look (Core, Material, Cupertino Glass); the other
fifteen follow their brief.

| System Style | preset | why |
|---|---|---|
| Core / Minimalist (`core-minimal`) | Standard | the source's own values; the neutral default |
| Cupertino Glass (`cupertino-glass`) | Expressive | Apple's motion is spring-led and generous |
| Material (`material-elevation`) | Expressive | M3 "emphasized" easing for arrivals, fast exits |
| Nature (`nature-organic`) | Calm | organic, slow, no hard travel |
| Retro (`retro-vintage`) | Snappy | print-era directness, no bounce |
| Neo-Brutalism (`neo-brutalism`) | Snappy | hard, immediate, nothing soft about it |
| Editorial (`editorial-serif`) | Calm | reading surfaces; motion stays out of the text's way |
| Terminal (`terminal-mono`) | Snappy | a terminal does not ease |
| Enterprise (`enterprise-dense`) | Snappy | dense data UIs want speed above all |
| Playful Candy (`playful-candy`) | Playful | the only style whose brief asks for bounce |
| Luxury Noir (`luxury-noir`) | Calm | slow, deliberate reveals |
| Swiss Grid (`swiss-grid`) | Standard | functional, unadorned |
| Abyss (`abyss-neon`) | Expressive | neon on a deep page, built to draw the eye |
| Synthwave (`synthwave-night`) | Expressive | same |
| Cupcake (`cupcake-pastel`) | Playful | soft pastels, friendly bounce |
| Arctic (`arctic-frost`) | Standard | nord: calm, functional |
| Sunset (`sunset-dusk`) | Expressive | warm, generous transitions |
| Blush (`valentine-blush`) | Playful | soft and friendly |

Distribution: Snappy 4 · Standard 3 · Expressive 5 · Playful 3 · Calm 3, so every preset is
shown by at least three styles. Random moods (`lib/themeMoods.ts`) draw a preset too: curated
moods map like the table above (by their style or nearest brief), procedural draws pick
Standard 40 % and the other four 15 % each.

## Where it lives in Escala

- **Model:** `lib/motion.ts` (pure, DOM-free, tested): primitives, `MOTION_ROLE_DEFAULTS`,
  `MOTION_PRESETS`, `motionPresetPatch`, `matchMotionPreset`, `resolveMotionRole`,
  `CHOREOGRAPHIES` (per preset, with `reducedMotion`). Choreographies are DERIVED from the preset,
  not stored. Only the role picks and transform picks are stored.
- **Store:** `motion: { preset, roles, transforms }` in `DesignSnapshot` and `makeDesignDefaults()`
  (Standard), a `ThemeFoundationOverride` field so each brand can carry its own, store version
  bump with a migration that seeds Standard (a no-op: nothing reads motion yet).
- **Editor:** a seventh row in the quick-settings accordion, **Motion** (glyph · preset name ·
  chevron): the Preset select + a "Preview" button that replays a dialog-enter and a list-reveal on
  the board. Variables gets a `Motion` foundation with one collection, `Motion semantics` (the
  roles, each a duration select + easing select + a play swatch). No free ms input: picks only,
  same as radius. **When the web rail row lands, the plugin's `ST_ROWS` gets the same row.**
- **Components:** each recipe gains an optional `motion` slot (`state: 'use-hover'`,
  `enter: 'dialog-enter'`…). `recipeStyles.ts` emits `transition` from it, replacing the 29
  hardcoded `duration-150`s; overlays (Dialog, Sheet, Drawer, Popover, Tooltip, Dropdown, Sonner,
  Accordion, Collapsible, Switch) play their choreography through a small Web Animations runtime
  (`lib/motionRuntime.ts`, the only DOM-touching file), honouring `prefers-reduced-motion` and the
  app's reduced setting.
- **Inspector:** the token trace gains a Motion filter beside Color · Layout · Type (Transition
  duration / easing per state, the choreography name per overlay).

## Exports

| surface | tier 1 | tier 2 | tier 3 |
|---|---|---|---|
| tokens.json | `motion.primitives` | `motion.roles` (refs + resolved) | `motion.choreography` (full JSON + `reducedMotion`) |
| CSS | `--motion-primitive-*` | `--motion-duration-*`, `--motion-easing-*`, `--motion-use-*` (shorthand `<duration> <easing>`), `--motion-transform-*` | `@keyframes` + one `@media (prefers-reduced-motion: reduce)` block that swaps roles to `fade`/`instant` and transforms to 0 |
| W3C | `$type: duration` (`{value, unit}`), `$type: cubicBezier` (4 numbers; springs as `$type: string` with the cubic fallback in `$extensions`) | aliases `{motion.duration.quick}` | `$type: "choreography"` with `ai.intent` |
| Figma (plugin) | number variables (ms, scale) + string variables (easing) in a `Motion` collection, one mode (motion does not change per viewport or appearance) | string variables `Motion/role/<role>` | documentation only: a ⬡ Motion page drawing each choreography as a timeline. Figma variables cannot hold a sequence. |
| Agent context / Skill | `references/motion.md` from the same `ai.intent` text, cut by `## ` sections like every other foundation | | |

tokens.json additions are new keys, no `schemaVersion` bump (the `shadowsDark` precedent).

## Tests

- Every duration a preset resolves sits inside its `ai.intent` range.
- Every in/out role pair: in ≥ out, in every preset.
- Every choreography has a `reducedMotion` block, and that block contains no transform other than
  opacity.
- Every name a choreography references (duration, easing, keyframes, transform role) resolves.
- `matchMotionPreset(motionPresetPatch(p)) === p` for all five.
- Standard reproduces the source's published values byte for byte.
- All 18 System Styles name a preset.

## Phases

1. **Model + exports** — DONE: `lib/motion.ts`, store field, tokens.json / CSS / Markdown /
   agent context, tests. Nothing on screen moves yet. (W3C moved to phase 4.)
2. **Components** — DONE: recipe `motion` slot, `recipeStyles` transitions + CSS choreographies
   (no script runtime, see State), registry items carry it. No hardcoded `duration-*` left.
3. **Editor** — DONE: the Motion row in the accordion, the Variables collection, the inspector
   filter, System Style + mood assignments, motion per brand (store v104).
4. **Plugin + W3C**: `Motion` collection, `Motion/role/*`, the ⬡ Motion documentation page, the
   plugin studio row, the W3C Motion group (same converter), transform distances aliased to the
   Dimension primitives.
5. **Docs**: a Motion page in System · Docs with each choreography playable, full and reduced side by side.

## Implementation notes (phase 1)

- **The preset is matched, never stored** (`matchMotionPreset`). Stored: `durationFactor`, the 24
  role picks, the 11 transform values, `stagger`.
- **Choreographies follow the transforms**: no overshoot (Snappy, Calm) → the switch slides
  without squash and Sonner rises instead of springing; no travel (Calm) → every rise / unmask
  becomes a fade. The switch squash amplitude is derived from `overshoot` (0.1 at 1.06, capped 0.15).
- **Selectors are recipe slots** (`overlay`, `content`, `thumb`, `line`), not the source's classes.
- **Reduced motion in CSS**: every transform role goes neutral (0px / 1), `--motion-stagger` 0,
  and every role except hover · focus · press · loop becomes `fade` + entrance/exit. Those four
  keep their timing: interaction feedback is a colour change, and a loader's motion is the information.
- The six `base-*` roles follow the source in every preset except Snappy (expressive ones go
  medium · entrance), Playful (expressive entrance → spring) and Calm (gentle).
- Playful's `use-overlay-in` is long · emphasized, not spring-bouncy: the bounce belongs to the
  focal card (`use-emphasis-in`), not the backdrop.
