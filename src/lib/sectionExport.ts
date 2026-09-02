// Per-section export — turns one foundation's tokens into CSS / Tailwind / JSON /
// Markdown so designers can copy a single slice into an AI prompt or codebase.
// Whole-system exports live in tokenGenerator.ts + exporters.ts; this is scoped.

import chroma from 'chroma-js'
import { toneLabel, darkShadowMap, generateAlphaScale, BLACK_ALPHA_SCALE, WHITE_ALPHA_SCALE } from './colorUtils'
import { fontStack } from './fonts'
import { getIconAiSource, iconAiContext } from './iconLibraries'
import { generateTokenJSON, themeContextFromStore } from './tokenGenerator'
import { useDesignStore } from '../store/useDesignStore'
import { mdCell } from './utils'
import { gradientToCss, gradientSlug } from './gradients'
import {
  buildArchitectureView,
  CATEGORICAL_ROLE_COMMENTS,
  type ArchTokenValue,
} from './semanticArchitectures'
import { typeRoleCssVars, TYPE_ROLES, mergeTypeRoles } from './typeRoles'
import {
  LAYOUT_ROLES,
  layoutRoleCssVars,
  mergeLayoutRoles,
  extractBreakpoints,
  BREAKPOINT_STEPS,
  gridFrameRootCss,
  gridFrameMobileCss,
  breakpointMobileMax,
  mergeGridFrame,
  type LayoutFamily,
} from './layoutTokens'

type Store = ReturnType<typeof useDesignStore.getState>

export type SectionKey =
  | 'color' | 'gradients' | 'typography' | 'radius' | 'spacing'
  | 'shadow' | 'grid' | 'sizes' | 'stroke' | 'icons'

// Order used when assembling the full-system ("all") export. Gradients sit
// right after Color — they're built FROM the accent ramp (linked stops
// reference `primaryScale`/`primaryDarkScale` by tone), so they read as a
// continuation of the same foundation rather than an unrelated one dropped
// in alphabetically.
export const ALL_SECTIONS: SectionKey[] = ['color', 'gradients', 'typography', 'spacing', 'radius', 'shadow', 'grid', 'sizes', 'stroke', 'icons']

export type ExportFormat = 'css' | 'tailwind' | 'tokens' | 'md'
export type ColorFormat = 'hex' | 'rgba' | 'hsl' | 'oklch'

export const EXPORT_FORMATS: { key: ExportFormat; label: string }[] = [
  { key: 'tokens', label: 'JSON' },
  { key: 'css', label: 'CSS' },
  { key: 'tailwind', label: 'Tailwind' },
  { key: 'md', label: 'MD' },
]

export const COLOR_FORMATS: { key: ColorFormat; label: string }[] = [
  { key: 'hex', label: 'HEX' },
  { key: 'rgba', label: 'RGBA' },
  { key: 'hsl', label: 'HSL' },
  { key: 'oklch', label: 'OKLCH' },
]

/** Render a hex in the requested CSS color format. */
export function formatColor(hex: string, fmt: ColorFormat): string {
  let c: chroma.Color
  try { c = chroma(hex) } catch { return hex }
  switch (fmt) {
    case 'rgba': { const [r, g, b] = c.rgb(); return `rgba(${r}, ${g}, ${b}, 1)` }
    case 'hsl': { const [h, s, l] = c.hsl(); return `hsl(${Math.round(h || 0)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)` }
    case 'oklch': { const [l, ch, h] = c.oklch(); return `oklch(${l.toFixed(3)} ${ch.toFixed(3)} ${Number.isNaN(h) ? 0 : Math.round(h)})` }
    default: return c.hex()
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Code language for the rendered block (labels / future highlighting).
export function exportLanguage(format: ExportFormat): string {
  return format === 'css' ? 'css' : format === 'tailwind' ? 'js' : format === 'tokens' ? 'json' : 'markdown'
}

/** How many declarations a preview pane shows before it truncates. Color alone
 *  emits ~89 semantic roles plus every family ramp — the full file is one
 *  click away in Export, and a page-length dump teaches nothing. Shared by
 *  `useIt.ts` (foundation pages) and `agentContext.ts` (component "Copy
 *  context" — its Color section is this same excerpt, so the two can't quote
 *  a different truncation depth for the same CSS). */
export const CSS_PREVIEW_LINES = 8

/** Trim `:root { … }` down to a readable, still-valid excerpt.
 *  `cssFor` is always `wrapRoot(...)` (see above), so the first line opens the
 *  block and the first bare `}` closes it — Grid appends a media query AFTER
 *  that brace, which is why the close is FOUND rather than assumed to be the
 *  last line. */
export function cssExcerpt(css: string): string {
  const lines = css.split('\n')
  const close = lines.findIndex((l) => l.trim() === '}')
  if (close < 1) return css.trimEnd()
  const decls = lines.slice(1, close).filter((l) => l.trim())
  if (decls.length <= CSS_PREVIEW_LINES) return css.trimEnd()
  const rest = decls.length - CSS_PREVIEW_LINES
  return [
    lines[0],
    ...decls.slice(0, CSS_PREVIEW_LINES),
    `  /* …+${rest} more — the full file is Export → Code */`,
    '}',
  ].join('\n')
}

// ── Section token sources ───────────────────────────────────────────────────

/** Per-call export scoping. Today only the color section reads it: the export
 *  wizard lets a run ship a SUBSET of the primitive families (Primitives' own
 *  per-family quick export is that same path, pre-scoped to one family), so
 *  every renderer here has to honour the same filter or the Tailwind/Markdown
 *  slices would silently ship families the summary said were excluded. */
export interface SectionExportOptions {
  /** Family keys to keep (`accent`, `neutral`, a custom family's key…).
   *  Omitted = every family, i.e. the pre-existing behaviour. */
  families?: string[]
  /** Which appearance's ramps ship. An explicit 'light'/'dark' ships EXACTLY
   *  that one, under its exported name (`accent-*` / `accent-dark-*`) — the
   *  per-column quick export from the Primitives table is one appearance by
   *  definition, so it says which.
   *
   *  OMITTED means UNSCOPED, and unscoped now means BOTH: light ramps followed
   *  by the dark twins, gated on the system actually having a dark-kind theme
   *  — the identical `hasDarkTheme` rule `tokenGenerator` uses. It used to
   *  mean "light only", which made this module the one renderer that
   *  disagreed with the tokens.json beside it: measured on a 7-family system
   *  with light+dark themes, the `.MD` pane shipped 7 ramps (84 tokens) while
   *  tokens.json shipped 14 (168) — every `accent-dark-*`, `neutral-dark-*`
   *  and custom `-dark` twin silently absent from a file whose own header
   *  says "use these tokens verbatim". Same class as the `modes` bug below,
   *  one layer down: that one dropped the dark THEME's semantics, this one
   *  dropped the dark PRIMITIVES they alias.
   *
   *  A light-only system is byte-identical to before — there are no twins to
   *  add, so nothing about that output changes. */
  appearance?: 'light' | 'dark'
  /** Whether the semantic block ships alongside the primitives. Omitted = yes.
   *  The wizard passes `false` when the run picked Primitives but not
   *  Semantics — those are two separate collections there, and the color
   *  section used to ship both regardless of which one was checked. */
  includeSemantics?: boolean
  /** Which theme keys' semantic tokens ship, in order — the wizard's own
   *  Semantics mode picker (`sel.modes`, a subset of `store.themeOrder`).
   *  Omitted = `['light']` only. This existed nowhere until a real bug: the
   *  wizard's Summary step counts variables across every CHECKED mode (so
   *  "light, dark" ships as 222 variables), but `mdFor`'s color section read
   *  `store.themes.light` as a literal — dark (and any custom theme) was
   *  silently dropped from the Markdown file regardless of what Step 1 said
   *  was included. Threaded through so the promised count and the actual file
   *  agree, the same rule `families` already exists to keep for Primitives. */
  modes?: string[]
}

/** Ordered color families present in the system: [name, scale].
 *  Family names match tokens.json (`accent`/`neutral` — the plugin contract),
 *  so every export surface speaks the same vocabulary. */
function colorFamilies(store: Store, opts: SectionExportOptions = {}): [string, Record<number, string>][] {
  // Name and scale move together: the dark twin exports as `accent-dark-*`,
  // exactly what tokenGenerator emits, so a scoped slice still names the same
  // tokens as tokens.json. `families` always matches on the FAMILY (`accent`),
  // never on the suffixed name.
  type Fam = { family: string; light?: Record<number, string>; dark?: Record<number, string> }
  const fams: Fam[] = [
    { family: 'accent', light: store.primaryScale, dark: store.primaryDarkScale },
    { family: 'neutral', light: store.grayLightScale, dark: store.grayDarkScale },
    { family: 'error', light: store.errorScale, dark: store.errorDarkScale },
    { family: 'warning', light: store.warningScale, dark: store.warningDarkScale },
    { family: 'success', light: store.successScale, dark: store.successDarkScale },
    { family: 'info', light: store.infoScale, dark: store.infoDarkScale },
    ...store.customColors.map((c): Fam => ({ family: c.key, light: c.scale, dark: c.darkScale })),
  ].filter((f) => !opts.families || opts.families.includes(f.family))

  const filled = (s?: Record<number, string>) => Boolean(s && Object.keys(s).length)

  // One explicit appearance — the per-column quick export. Unchanged.
  if (opts.appearance) {
    const dark = opts.appearance === 'dark'
    return fams
      .filter((f) => filled(dark ? f.dark : f.light))
      .map((f) => [dark ? `${f.family}-dark` : f.family, (dark ? f.dark : f.light)!])
  }

  // Unscoped — every light ramp, then every dark twin, but only for a system
  // that HAS a dark-kind theme. That gate is `tokenGenerator`'s own, read from
  // the shared `themeContextFromStore` rather than re-derived here, so the two
  // can't drift on which twins exist.
  const out: [string, Record<number, string>][] = fams
    .filter((f) => filled(f.light))
    .map((f) => [f.family, f.light!])
  const hasDark = themeContextFromStore(store).hasDarkTheme
  if (hasDark) {
    fams.filter((f) => filled(f.dark)).forEach((f) => out.push([`${f.family}-dark`, f.dark!]))
  }

  // Alpha twins — reproduce each solid tone when composited over the page
  // (see tokens.json's `colors.primitiveAlpha`). `-a`/`-a-dark` disambiguate
  // from the solid `-dark` suffix above in this shared flat namespace; no
  // other exporter reads these composite names as a contract, they're just
  // the CSS-var/Tailwind-key/MD-row labels this file already mints for every
  // other family here.
  fams.filter((f) => filled(f.light)).forEach((f) => {
    out.push([`${f.family}-a`, generateAlphaScale(f.light!, store.pageBackground, 'light')])
  })
  if (hasDark) {
    fams.filter((f) => filled(f.dark)).forEach((f) => {
      out.push([`${f.family}-a-dark`, generateAlphaScale(f.dark!, store.darkBackground, 'dark')])
    })
  }

  // Neutral alpha primitives — a fixed opacity ladder, not derived from any
  // family. Tied to whether NEUTRAL ships (they're the neutral's alpha
  // twins in spirit — see design-plans/alpha-primitives.md), not to a family
  // filter of their own.
  if (!opts.families || opts.families.includes('neutral')) {
    out.push(['black-a', BLACK_ALPHA_SCALE], ['white-a', WHITE_ALPHA_SCALE])
  }

  return out
}

const sortedEntries = (o: Record<string, string>) =>
  Object.entries(o).sort(([a], [b]) => (Number(a) || 0) - (Number(b) || 0) || a.localeCompare(b))

// Simple key→value sections share one code path.
//
// `extra` is a SECOND primitive ramp shipping under the same section. Sizes
// carries two: control heights (`--size-*`) and the selector glyph square
// (`--selector-*`). They're one foundation — "how big is a control" — but not
// one ramp, since 24px is `size` xs and `selector` xl. Folding it in here
// rather than minting a section key keeps `ALL_SECTIONS`, and therefore the
// Export wizard's collection checkboxes, unchanged.
interface SimpleSpec {
  prefix: string
  tailwind: string
  get: (s: Store) => Record<string, string>
  extra?: { prefix: string; family: LayoutFamily; label: string; get: (s: Store) => Record<string, string> }
}

const SIMPLE: Partial<Record<SectionKey, SimpleSpec>> = {
  spacing: { prefix: 'spacing', tailwind: 'spacing', get: (s) => s.spacing },
  radius: { prefix: 'radius', tailwind: 'borderRadius', get: (s) => s.radius },
  shadow: { prefix: 'shadow', tailwind: 'boxShadow', get: (s) => s.shadows },
  grid: { prefix: 'grid', tailwind: 'grid', get: (s) => s.grid },
  sizes: {
    prefix: 'size', tailwind: 'height', get: (s) => s.sizes,
    extra: { prefix: 'selector', family: 'selector', label: 'Selectors', get: (s) => s.selector ?? {} },
  },
  stroke: { prefix: 'stroke', tailwind: 'borderWidth', get: (s) => s.stroke ?? {} },
}

// ── CSS ──────────────────────────────────────────────────────────────────────

// Inner :root declarations (un-indented) for a section — composable for "all".
function cssLines(section: SectionKey, store: Store, cf: ColorFormat, opts: SectionExportOptions = {}): string[] {
  if (section === 'color') {
    const lines: string[] = []
    colorFamilies(store, opts).forEach(([name, scale]) => {
      lines.push(`/* ${cap(name)} */`)
      sortedEntries(scale).forEach(([k, v]) => lines.push(`--color-${name}-${toneLabel(store.colorNaming, Number(k))}: ${formatColor(v, cf)};`))
    })
    if (opts.includeSemantics !== false) {
      lines.push('/* Semantic — light */')
      Object.entries(store.themes.light ?? {}).forEach(([k, v]) => { if (v) lines.push(`--color-${k}: ${formatColor(v, cf)};`) })
    }
    return lines
  }
  if (section === 'typography') {
    const t = store.typography
    const lines = [
      `--font-family-heading: ${fontStack(t.headingFontFamily ?? t.fontFamily)};`,
      `--font-family-body: ${fontStack(t.fontFamily)};`,
    ]
    Object.entries(t.sizes).forEach(([k, v]) => lines.push(`--font-size-${k}: ${v};`))
    Object.entries(t.lineHeights ?? {}).forEach(([k, v]) => lines.push(`--line-height-${k}: ${v};`))
    Object.entries(t.weights).forEach(([k, v]) => lines.push(`--font-weight-${k}: ${v};`))
    typeRoleCssVars(t.roles).forEach((l) => lines.push(`${l}`))
    return lines
  }
  if (section === 'icons') {
    const ai = getIconAiSource(store.iconAiSource)
    const lines = [
      `/* Icons — ${ai.label} · ${ai.repo} */`,
      `/* Install: npm i ${ai.npm} */`,
    ]
    if (store.customIcons.length) lines.push(`/* Custom icons: ${store.customIcons.map((i) => i.name).join(', ')} */`)
    return lines
  }
  if (section === 'gradients') {
    // Light-only here, matching every other section's per-slice `css` output
    // (shadow's dark twin is likewise absent from THIS format) — the `.dark`
    // selector override lives in the whole-system `exporters.ts` build, not
    // this per-section/AI-context utility.
    return store.gradients.map((g) => `--gradient-${gradientSlug(g)}: ${gradientToCss(g)};`)
  }
  if (section === 'grid') {
    const bps = extractBreakpoints(store.grid)
    return [
      ...BREAKPOINT_STEPS.map((s) => `--breakpoint-${s}: ${bps[s]};`),
      ...layoutRoleCssVars('breakpoint', store.breakpointRoles),
      ...gridFrameRootCss(store.gridFrame),
    ]
  }
  const simple = SIMPLE[section]!
  const lines = Object.entries(simple.get(store)).map(([k, v]) => `--${simple.prefix}-${k}: ${v};`)
  const family = layoutFamilyOf(section)
  if (family) {
    lines.push(...layoutRoleCssFor(family, store))
  }
  if (simple.extra) {
    Object.entries(simple.extra.get(store)).forEach(([k, v]) => lines.push(`--${simple.extra!.prefix}-${k}: ${v};`))
    lines.push(...layoutRoleCssFor(simple.extra.family, store))
  }
  if (section === 'spacing') {
    Object.entries(store.padding ?? {}).forEach(([k, v]) => lines.push(`--padding-${k}: ${v};`))
  }
  return lines
}

function layoutFamilyOf(section: SectionKey): LayoutFamily | null {
  if (section === 'radius') return 'radius'
  if (section === 'spacing') return 'spacing'
  if (section === 'sizes') return 'size'
  if (section === 'stroke') return 'stroke'
  return null
}

function layoutRolesOf(family: LayoutFamily, store: Store): Record<string, string> {
  if (family === 'radius') return store.radiusRoles
  if (family === 'spacing') return store.spacingRoles
  if (family === 'size') return store.sizeRoles
  if (family === 'selector') return store.selectorRoles
  if (family === 'stroke') return store.strokeRoles
  return store.breakpointRoles
}

function layoutRoleCssFor(family: LayoutFamily, store: Store): string[] {
  return layoutRoleCssVars(family, layoutRolesOf(family, store))
}

function wrapRoot(lines: string[]): string {
  return `:root {\n${lines.map((l) => (l ? `  ${l}` : '')).join('\n')}\n}`
}

function cssFor(section: SectionKey, store: Store, cf: ColorFormat, opts: SectionExportOptions = {}): string {
  const root = wrapRoot(cssLines(section, store, cf, opts))
  if (section !== 'grid') return root
  const bps = extractBreakpoints(store.grid)
  const max = breakpointMobileMax(store.breakpointRoles, bps)
  const inner = gridFrameMobileCss(store.gridFrame).map((l) => `    ${l}`).join('\n')
  return `${root}\n\n@media (max-width: ${max}) {\n  :root {\n${inner}\n  }\n}`
}

// ── Tailwind (theme.extend snippet) ──────────────────────────────────────────

// Wrap a theme.extend object as a copy-pasteable tailwind.config.js snippet.
function twConfig(extend: Record<string, unknown>): string {
  const body = JSON.stringify(extend, null, 2).replace(/\n/g, '\n    ')
  return `/** @type {import('tailwindcss').Config} */\nexport default {\n  theme: {\n    extend: ${body},\n  },\n}`
}

// The theme.extend slice for a section — composable for "all".
function twExtend(section: SectionKey, store: Store, cf: ColorFormat, opts: SectionExportOptions = {}): Record<string, unknown> {
  if (section === 'color') {
    const colors: Record<string, unknown> = {}
    colorFamilies(store, opts).forEach(([name, scale]) => {
      const obj: Record<string, string> = {}
      sortedEntries(scale).forEach(([k, v]) => { obj[toneLabel(store.colorNaming, Number(k))] = formatColor(v, cf) })
      colors[name] = obj
    })
    if (opts.includeSemantics !== false) {
      Object.entries(store.themes.light ?? {}).forEach(([k, v]) => { if (v) colors[k] = formatColor(v, cf) })
    }
    return { colors }
  }
  if (section === 'typography') {
    const t = store.typography
    return {
      fontFamily: { heading: [t.headingFontFamily ?? t.fontFamily], body: [t.fontFamily] },
      fontSize: t.sizes,
      lineHeight: t.lineHeights ?? {},
      fontWeight: t.weights,
      // Semantic text styles — consume as `fontSize: var(--text-label-font-size)`.
    }
  }
  if (section === 'icons') return {}
  if (section === 'gradients') {
    // `backgroundImage` is Tailwind's real theme key for named gradients —
    // this mints usable `bg-<slug>` utilities, not a placeholder comment.
    return { backgroundImage: Object.fromEntries(store.gradients.map((g) => [gradientSlug(g), gradientToCss(g)])) }
  }
  if (section === 'grid') {
    const bps = extractBreakpoints(store.grid)
    const cuts = mergeLayoutRoles('breakpoint', store.breakpointRoles)
    return {
      screens: {
        ...Object.fromEntries(BREAKPOINT_STEPS.map((s) => [s, bps[s]])),
        desktop: bps[cuts.desktop],
        mobile: { max: breakpointMobileMax(store.breakpointRoles, bps) },
      },
    }
  }
  const simple = SIMPLE[section]!
  // The extra ramp has no Tailwind theme key of its own — a checkbox square is
  // a `size-*` utility, and merging it into `height` would collide on xs/sm/md.
  // It ships in CSS, JSON and Markdown; Tailwind users read it as a var.
  return { [simple.tailwind]: simple.get(store) }
}

function tailwindFor(section: SectionKey, store: Store, cf: ColorFormat, opts: SectionExportOptions = {}): string {
  if (section === 'icons') {
    const ai = getIconAiSource(store.iconAiSource)
    return `// Icons aren't a Tailwind theme key — install the set named in the Skill/README.\n// ${ai.label}  ·  ${ai.repo}\n// npm i ${ai.npm}`
  }
  return twConfig(twExtend(section, store, cf, opts))
}

// ── Tokens (exact tokens.json slices) ────────────────────────────────────────
// The Tokens format is NOT a re-render: it slices the real `generateTokenJSON()`
// payload (the contract the Figma plugin imports), so keys and values are always
// byte-identical to the full tokens.json. Canonical hex — the color-format
// toggle doesn't apply here (the modal hides it).

function tokensFor(section: SectionKey): unknown {
  const full = generateTokenJSON()
  switch (section) {
    case 'color': return { colors: full.colors }
    case 'gradients': return { gradients: full.gradients, gradientsDark: full.gradientsDark, gradientAssignments: full.gradientAssignments }
    case 'typography': return { typography: full.typography }
    case 'spacing': return { spacing: full.spacing, spacingRoles: full.spacingRoles, padding: full.padding }
    case 'radius': return { radius: full.radius, radiusRoles: full.radiusRoles }
    case 'shadow': return { shadows: full.shadows }
    case 'grid': return { grid: full.grid, gridFrame: full.gridFrame, breakpointRoles: full.breakpointRoles }
    case 'sizes': return { sizes: full.sizes, sizeRoles: full.sizeRoles, selector: full.selector, selectorRoles: full.selectorRoles }
    case 'stroke': return { stroke: full.stroke, strokeRoles: full.strokeRoles }
    case 'icons': return { icons: full.icons }
  }
}

// ── Markdown ──────────────────────────────────────────────────────────────────

// Cells are escaped here, once, rather than at every call site — a value that
// looks safe today (a hex, a token name) is one custom-font-name or
// custom-color-label field away from carrying a literal `|` that would
// silently misalign the row it lands in.
function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.map(mdCell).join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`),
  ].join('\n')
}

function categoricalRoleLabel(comment: string): string {
  return comment.match(/^\[ROLE: ([^\]]+)\]/)?.[1] ?? ''
}

function modeValue(
  modes: Record<string, ArchTokenValue>,
  mode: string,
  cf: ColorFormat,
): [string, string] {
  const v = modes[mode]
  if (!v) return ['—', '—']
  return [`\`${v.label}\``, `\`${formatColor(v.css, cf)}\``]
}

/** Categorical semantic tables — same projection the Color preview and Semantics
 *  table render, grouped Content · Action · Surface · Status · Border. */
function categoricalSemanticsMd(store: Store, cf: ColorFormat, modes: string[]): string {
  const { themeNames, globalScales, resolvedPalettes } = themeContextFromStore(store)
  const modeKeys = (modes.length ? modes : themeNames).filter((m) => store.themes[m])
  if (!modeKeys.length) return ''

  const view = buildArchitectureView(
    'categorical',
    {
      themes: store.themes,
      themeKinds: store.themeKinds ?? {},
      themePalettes: resolvedPalettes,
      scales: globalScales,
      accent: store.primaryColor,
      pageBackground: store.pageBackground,
      darkBackground: store.darkBackground,
    },
    store.errorColor,
    store.architectureOverrides?.categorical ?? {},
    modeKeys,
  )
  if (!view) return ''

  const parts = [
    '\n### Semantic (Categorical)\n',
    '_Nested role contract — matches the Color preview and Semantics table. Designs reference these roles; roles alias the primitive ramps per theme._\n',
  ]

  const lightDark = modeKeys.length === 2 && modeKeys.includes('light') && modeKeys.includes('dark')

  for (const cat of view.categories) {
    parts.push(`\n#### ${cat.label}\n`)
    if (cat.description) parts.push(`_${cat.description}_\n`)

    if (lightDark) {
      parts.push(table(
        ['Token', 'Role', 'Primitive · light', 'Hex · light', 'Primitive · dark', 'Hex · dark'],
        cat.tokens.map((tk) => {
          const id = `${cat.key}.${tk.key}`
          const [lRef, lHex] = modeValue(tk.modes, 'light', cf)
          const [dRef, dHex] = modeValue(tk.modes, 'dark', cf)
          return [
            `\`${id}\``,
            categoricalRoleLabel(CATEGORICAL_ROLE_COMMENTS[id] ?? ''),
            lRef,
            lHex,
            dRef,
            dHex,
          ]
        }),
      ))
      continue
    }

    for (const mode of modeKeys) {
      parts.push(`\n**${cap(mode)}**\n`)
      parts.push(table(
        ['Token', 'Role', 'Primitive', 'Hex'],
        cat.tokens.map((tk) => {
          const id = `${cat.key}.${tk.key}`
          const [ref, hex] = modeValue(tk.modes, mode, cf)
          return [
            `\`${id}\``,
            categoricalRoleLabel(CATEGORICAL_ROLE_COMMENTS[id] ?? ''),
            ref,
            hex,
          ]
        }),
      ))
    }
  }

  return parts.join('\n')
}

function mdFor(section: SectionKey, store: Store, cf: ColorFormat, opts: SectionExportOptions = {}): string {
  if (section === 'color') {
    const parts = ['## Color']
    colorFamilies(store, opts).forEach(([name, scale]) => {
      parts.push(`\n### ${cap(name)}\n`)
      parts.push(table(['Token', 'Value'], sortedEntries(scale).map(([k, v]) => [`\`${name}-${toneLabel(store.colorNaming, Number(k))}\``, `\`${formatColor(v, cf)}\``])))
    })
    if (opts.includeSemantics !== false) {
      const modes = opts.modes?.length ? opts.modes : ['light']
      if (store.semanticArchitecture === 'categorical') {
        parts.push(categoricalSemanticsMd(store, cf, modes))
      } else {
        // Flat catalogue — one table per selected mode.
        modes.forEach((mode) => {
          const entries = Object.entries(store.themes[mode] ?? {}).filter(([, v]) => v)
          if (!entries.length) return
          parts.push(`\n### Semantic (${cap(mode)})\n`)
          parts.push(table(['Token', 'Value'], entries.map(([k, v]) => [`\`${k}\``, `\`${formatColor(v, cf)}\``])))
        })
      }
    }
    return parts.join('\n')
  }
  if (section === 'typography') {
    const t = store.typography
    return [
      '## Typography\n',
      `- **Heading font:** ${t.headingFontFamily ?? t.fontFamily}`,
      `- **Body font:** ${t.fontFamily}\n`,
      '### Sizes\n',
      table(['Token', 'Size', 'Line height'], Object.keys(t.sizes).map((k) => [`\`${k}\``, `\`${t.sizes[k]}\``, `\`${t.lineHeights?.[k] ?? '—'}\``])),
      '\n### Weights\n',
      table(['Token', 'Weight'], Object.entries(t.weights).map(([k, v]) => [`\`${k}\``, `\`${v}\``])),
      '\n### Text roles (semantics)\n',
      table(
        ['Role', 'Desktop', 'Mobile'],
        TYPE_ROLES.map((r) => {
          const m = mergeTypeRoles(t.roles)[r.key]
          const fmt = (a: { family: string; size: string; weight: string }) =>
            `\`${a.size}\` · ${a.weight} · ${a.family}`
          return [`\`text-${r.key}\``, fmt(m.desktop), fmt(m.mobile)]
        }),
      ),
      '\nDesktop CSS: `var(--text-label-font-size)`. Mobile: `var(--text-label-font-size-mobile)` at `max-width: var(--breakpoint-mobile)`. Both alias primitives (`var(--font-size-text-sm)`).',
    ].join('\n')
  }
  if (section === 'icons') {
    const ctx = iconAiContext(store.iconAiSource)
    const extra = store.customIcons.length
      ? `\n- **Custom:** ${store.customIcons.map((i) => i.name).join(', ')}`
      : ''
    return `${ctx.markdown}${extra}`
  }
  if (section === 'gradients') {
    const gradients = store.gradients
    if (!gradients.length) return '## Gradients\n\n_No gradients defined._'
    const slugById = (id: string | null) => {
      const g = gradients.find((x) => x.id === id)
      return g ? gradientSlug(g) : null
    }
    const cover = slugById(store.gradientAssignments.cover)
    const avatar = slugById(store.gradientAssignments.avatar)
    const assigned = [
      cover ? `card cover → \`--gradient-${cover}\`` : null,
      avatar ? `avatars → \`--gradient-${avatar}\`` : null,
    ].filter(Boolean).join(', ') || '_none_'
    return [
      '## Gradients\n',
      table(
        ['Token', 'Type', 'Light', 'Dark'],
        gradients.map((g) => [
          `\`--gradient-${gradientSlug(g)}\``,
          g.type,
          `\`${gradientToCss(g)}\``,
          g.stops.some((s) => s.darkColor) ? `\`${gradientToCss(g, 'dark')}\`` : '—',
        ]),
      ),
      `\nAssigned surfaces: ${assigned}.`,
    ].join('\n')
  }
  if (section === 'grid') {
    const bps = extractBreakpoints(store.grid)
    const cuts = mergeLayoutRoles('breakpoint', store.breakpointRoles)
    const max = breakpointMobileMax(store.breakpointRoles, bps)
    const f = mergeGridFrame(store.gridFrame)
    const fmt = (k: 'columns' | 'gutter' | 'margin' | 'container', step: string) =>
      k === 'columns' ? step : k === 'container' ? (step === 'none' ? 'none' : `var(--breakpoint-${step})`) : `var(--spacing-${step})`
    return [
      '## Grid\n',
      '### Breakpoints\n',
      table(['Token', 'Value'], BREAKPOINT_STEPS.map((s) => [`\`--breakpoint-${s}\``, `\`${bps[s]}\``])),
      '\n### Viewport roles\n',
      table(
        ['Role', 'Aliases', 'Query'],
        [
          [`\`--breakpoint-desktop\``, `\`var(--breakpoint-${cuts.desktop})\``, `min-width: ${bps[cuts.desktop]}`],
          [`\`--breakpoint-mobile\``, `\`calc(var(--breakpoint-${cuts.mobile}) - 1px)\``, `max-width: ${max}`],
        ],
      ),
      '\nType mobile styles apply at `max-width: var(--breakpoint-mobile)`. `@media` itself must use the resolved px (`' + max + '`), because custom properties are not valid there.\n',
      '\n### Frame\n',
      table(
        ['Token', 'Desktop', 'Mobile'],
        (['columns', 'gutter', 'margin', 'container'] as const).map((k) => [
          `\`--grid-${k}\``,
          `\`${fmt(k, f.desktop[k])}\``,
          `\`${fmt(k, f.mobile[k])}\``,
        ]),
      ),
    ].join('\n')
  }
  const simple = SIMPLE[section]!
  const parts = [
    `## ${cap(section)}\n`,
    table(['Token', 'Value'], Object.entries(simple.get(store)).map(([k, v]) => [`\`--${simple.prefix}-${k}\``, `\`${v}\``])),
  ]
  const family = layoutFamilyOf(section)
  if (family) {
    const roles = mergeLayoutRoles(family, layoutRolesOf(family, store))
    parts.push(
      `\n### Semantics\n`,
      '_Intent aliases — never raw px. Components bind these; they alias a primitive step._\n',
      table(
        ['Role', 'Aliases'],
        LAYOUT_ROLES[family].map((r) => [`\`--${family}-${r.key}\``, `\`var(--${family}-${roles[r.key]})\``]),
      ),
    )
  }
  if (simple.extra) {
    const ex = simple.extra
    const roles = mergeLayoutRoles(ex.family, layoutRolesOf(ex.family, store))
    parts.push(
      `\n### ${ex.label}\n`,
      '_The square a checkbox, radio or switch knob is drawn in — a glyph, not a control height. Below 24px, pair it with a transparent hit area (`--size-hit`) for WCAG 2.2 target size._\n',
      table(['Token', 'Value'], Object.entries(ex.get(store)).map(([k, v]) => [`\`--${ex.prefix}-${k}\``, `\`${v}\``])),
      `\n#### ${ex.label} semantics\n`,
      table(
        ['Role', 'Aliases'],
        LAYOUT_ROLES[ex.family].map((r) => [`\`--${ex.family}-${r.key}\``, `\`var(--${ex.family}-${roles[r.key]})\``]),
      ),
    )
  }
  if (section === 'spacing') {
    parts.push(
      `\n### Surface padding\n`,
      table(['Token', 'Value'], Object.entries(store.padding ?? {}).map(([k, v]) => [`\`--padding-${k}\``, `\`${v}\``])),
    )
  }
  // The elevation ramp has a DERIVED dark twin (`shadowsDark` in tokens.json,
  // `.dark` in the CSS) — one value provably cannot serve both appearances, a
  // black shadow on a near-black page moves the pixel by 0.36 of one 8-bit
  // level. The Markdown listed the light ramp alone, so a reader (or an agent
  // told to "use these tokens verbatim") had no dark elevation to reach for.
  // Same gate as the primitive twins above: only where a dark theme exists.
  if (section === 'shadow' && themeContextFromStore(store).hasDarkTheme) {
    const dark = darkShadowMap(store.shadows)
    if (Object.keys(dark).length) {
      parts.push(
        `\n### Dark\n`,
        '_Derived, not a second editable ramp — re-coloured to pure black at a higher alpha plus a 1px light rim, since below a near-black page only ~5% of the luminance range is left to spend downward._\n',
        table(['Token', 'Value'], Object.entries(dark).map(([k, v]) => [`\`--${simple.prefix}-${k}\` (\`.dark\`)`, `\`${v}\``])),
      )
    }
  }
  return parts.join('\n')
}

// ── Public entry ──────────────────────────────────────────────────────────────

// Whole-system export — every section assembled into one document. Powers the
// "Get MD" full AI-context window.
function buildFullExport(store: Store, format: ExportFormat, cf: ColorFormat, opts: SectionExportOptions = {}): string {
  switch (format) {
    case 'css': {
      const lines: string[] = []
      ALL_SECTIONS.forEach((s, i) => {
        const body = cssLines(s, store, cf)
        if (!body.length) return
        if (i) lines.push('')
        lines.push(`/* ═══ ${cap(s)} ═══ */`, ...body)
      })
      const bps = extractBreakpoints(store.grid)
      const max = breakpointMobileMax(store.breakpointRoles, bps)
      const inner = gridFrameMobileCss(store.gridFrame).map((l) => `    ${l}`).join('\n')
      return `${wrapRoot(lines)}\n\n@media (max-width: ${max}) {\n  :root {\n${inner}\n  }\n}`
    }
    case 'tailwind':
      return twConfig(Object.assign({}, ...ALL_SECTIONS.map((s) => twExtend(s, store, cf))))
    case 'tokens':
      // The full Tokens export IS tokens.json — the exact payload the Figma
      // plugin imports (schemaVersion, themes, atoms and all).
      return JSON.stringify(generateTokenJSON(), null, 2)
    case 'md': {
      const desc = store.projectDescription?.trim()
      const header = `# ${store.projectName} — design tokens\n${desc ? `\n${desc}\n` : ''}\n_Personalized design-system context. Use these tokens verbatim; don't invent new values._`
      // `opts` carries `modes` through to the color section, same as the
      // per-collection path — without it the whole-system "Get MD" export hit
      // the identical dropped-dark-theme bug `modes` exists to fix, just via a
      // different call path (this whole-system builder used to take no opts
      // at all).
      return `${header}\n\n${ALL_SECTIONS.map((s) => mdFor(s, store, cf, opts)).join('\n\n---\n\n')}`
    }
  }
}

export function buildSectionExport(
  section: SectionKey | 'all',
  format: ExportFormat,
  colorFormat: ColorFormat = 'hex',
  opts: SectionExportOptions = {},
): string {
  const store = useDesignStore.getState()
  if (section === 'all') return buildFullExport(store, format, colorFormat, opts)
  switch (format) {
    case 'css': return cssFor(section, store, colorFormat, opts)
    case 'tailwind': return tailwindFor(section, store, colorFormat, opts)
    case 'tokens': return JSON.stringify(tokensFor(section), null, 2)
    case 'md': return mdFor(section, store, colorFormat, opts)
  }
}
