// ── Export wizard (Source → Where → Export) ────────────────────────────────
// The guided whole-system export behind Variables' "Export" pill: pick WHAT
// ships (collections + semantic modes), WHERE it goes (Figma / GitHub / code / AI),
// then download/copy the result.
//
// Four destinations, not a pile of file formats. Figma → `escala`, Code →
// `w3c`, AI → `agent-bundle` (Skill zip is a nested "Figma Make only" toggle),
// and GitHub reuses the repository exporter instead of creating a fourth file
// generator. Markdown left the wizard — it already lives in Save (`README.md`)
// and Copy context.
// CSS / SCSS / Tailwind stay on Save (`variables.css`), not a fourth destination.
// The old Categorical-AI JSON is folded into the Skill slice of the AI zip.
//
// Everything derives from ONE call to `generateTokenJSON()` — the same payload
// the Figma plugin imports — so wizard output can never disagree with
// tokens.json: primitives arrive pre-flattened (`accent-500`, `neutral-dark-300`),
// themes pre-normalized onto their source ramps.

import { motionModesFromTokens, motionW3CGroup } from './motion'
import { figmaCollectionsW3C, MOTION_COLLECTION, type SnapshotToW3COptions } from './figmaCollections'
import { letterSpacingsFor } from './typographyStandard'
import { generateTokenJSON, flattenScale } from './tokenGenerator'
import { freeDownloadStore, type FigmaScope } from './freeFigmaScope'
import { shippedThemes, shipsEveryTheme } from './brandThemes'
import { defaultFigmaSyncModes } from './figmaSyncModes'
import { myThemeKeys } from './themeLibrary'
import { primitiveDisplayLabel } from './themeSources'
import { buildSectionExport, type ColorFormat, type SectionKey } from './sectionExport'
import { useDesignStore } from '../store/useDesignStore'
import { buildAgentProductExport, buildSkillExport } from './skillExport'
import { dimensionFromKey, dimensionRef, parseDimension } from './dimensions'
import { phosphorCoreBody, phosphorIconSvgForFigma } from './phosphorIcons'
import { PHOSPHOR_CORE } from './iconLibraries'
import { LAYOUT_ROLES, INSET_SIDE_KEYS, mergeLayoutRoles, mergeGridFrame, extractBreakpoints, BREAKPOINT_STEPS, roleValuePx, type LayoutFamily } from './layoutTokens'

export type WizardCollection =
  | 'primitives' | 'semantics' | 'gradients' | 'typography' | 'spacing'
  | 'radius' | 'shadow' | 'grid' | 'sizes' | 'stroke' | 'icons' | 'motion'

/** Every collection, in export order — also the "share the whole system" preset. */
export const ALL_WIZARD_COLLECTIONS: WizardCollection[] = [
  'primitives', 'semantics', 'gradients', 'typography', 'spacing',
  'radius', 'shadow', 'grid', 'sizes', 'stroke', 'icons', 'motion',
]

export type WizardFormat = 'w3c' | 'escala' | 'md' | 'skill' | 'agent-bundle'
export type WizardDestination = Exclude<WizardFormat, 'md' | 'skill'> | 'github'
export type WizardStructure = 'single' | 'per-collection'

/** The `sectionExport` slice each collection maps onto — Tailwind and Markdown
 *  reuse those builders rather than growing a second renderer per format.
 *  Primitives and semantics are one 'color' section there, hence the dedupe. */
const SECTION_OF: Record<WizardCollection, SectionKey> = {
  primitives: 'color', semantics: 'color', gradients: 'gradients', typography: 'typography',
  spacing: 'spacing', radius: 'radius',
  shadow: 'shadow', grid: 'grid', sizes: 'sizes', stroke: 'stroke', icons: 'icons', motion: 'motion',
}

export interface WizardSelection {
  collections: WizardCollection[]
  /** Primitive color families to ship (`accent`, `neutral`, a custom key…) —
   *  a subset of `primitiveFamilyMeta()`. Ignored unless 'primitives' is
   *  selected. `undefined` means "every family", so a caller that doesn't care
   *  about family scoping keeps the pre-existing whole-palette behaviour.
   *  Primitives' per-family quick export is just this field pre-filled with
   *  one key — there's no second export path behind that icon. */
  primitiveFamilies?: string[]
  /** Which appearance of those families ships — `undefined` = both ramps
   *  (`accent-*` AND `accent-dark-*`), which is what a normal export does.
   *  Primitives' per-column quick export sets it, since that icon sits in the
   *  light or the dark column and can only honestly ship that one. */
  primitiveAppearance?: 'light' | 'dark'
  /** Semantic themes to ship (subset of themeOrder). Ignored unless 'semantics' is selected. */
  modes: string[]
  format: WizardFormat
  structure: WizardStructure
  colorFormat: ColorFormat
  /** W3C only — values that alias a variable ship as `{Collection.Mode.path}` references (`{Color Primitives.Default.Accents.Accent.09}`). */
  includeAliases: boolean
  /** Escala JSON only — whether `atoms` ships at all (which components, per
   *  `useDesignStore`'s `selectedComponents` — the SAME list the Components
   *  tab edits, so there's no second, divergent "which components" list).
   *  Other formats have no component representation and ignore this. */
  includeComponents: boolean
  /** Free cut — one theme, one appearance, Desktop. The wizard sets it for
   *  Figma JSON, W3C and Markdown. Omitted, the whole document ships. */
  figmaScope?: FigmaScope
}

export interface WizardFile {
  name: string
  content: string
  language: 'json' | 'css' | 'scss' | 'js' | 'md' | 'zip'
  /** When set, download this instead of `content` (Skill zip). */
  binary?: Uint8Array
}

type TokenJSON = ReturnType<typeof generateTokenJSON>

export interface FormatOption {
  key: WizardFormat
  label: string
  hint: string
}

export interface DestinationOption {
  key: WizardDestination
  label: string
  hint: string
}

/** Wizard step 2 — where the system is going, not what the file is called. */
export const WIZARD_DESTINATIONS: DestinationOption[] = [
  { key: 'escala', label: 'Figma', hint: 'Escala plugin — variables land in the file you design in' },
  { key: 'w3c', label: 'Code & other tools', hint: 'W3C JSON for Style Dictionary, Tokens Studio, Figma native import' },
  { key: 'github', label: 'GitHub repository', hint: 'Version tokens, CSS and documentation in your product repo' },
  { key: 'agent-bundle', label: 'AI assistant', hint: 'Full context for Cursor & Claude so the agent stops inventing hex' },
]

/** Generated-format subset of the destination list. GitHub is an outbound
 * repository flow, not a format, so consumers that need a WizardFormat cannot
 * accidentally treat it like a downloadable file. */
export const WIZARD_FORMATS = WIZARD_DESTINATIONS.filter(
  (destination) => destination.key !== 'github',
)

/** Per-column primitive export (ColorPrimitives). Markdown stays here — it is a
 *  paste into a prompt, not a competing wizard destination. Skill does not:
 *  a single Accent ramp is not a Skill package. */
export const FAMILY_FORMAT_OPTIONS: FormatOption[] = [
  { key: 'w3c', label: 'W3C Design Tokens', hint: 'Standard format with $value, $type' },
  { key: 'escala', label: 'Escala JSON', hint: 'The exact tokens.json the Figma plugin imports' },
  { key: 'md', label: 'Markdown', hint: 'Readable tables — paste into a chat' },
]

export const FAMILY_EXPORT_FORMATS: WizardFormat[] = FAMILY_FORMAT_OPTIONS.map((f) => f.key)

export function isAiFormat(format: WizardFormat): boolean {
  return format === 'agent-bundle' || format === 'skill'
}

export function wizardFormatLabel(format: WizardFormat): string {
  if (format === 'skill') return 'AI assistant · Figma Make'
  return WIZARD_DESTINATIONS.find((d) => d.key === format)?.label
    ?? FAMILY_FORMAT_OPTIONS.find((d) => d.key === format)?.label
    ?? format
}

// Badge next to a destination in the wizard. Figma is the one this app is
// built around (filled). Code and AI are informational (outline).
export const WIZARD_FORMAT_BADGE: Partial<Record<WizardFormat, string>> = {
  escala: 'Plugin',
  w3c: 'W3C JSON',
  'agent-bundle': 'Cursor · Claude',
  skill: 'Figma Make',
}

// ── Primitive families ───────────────────────────────────────────────────────
// `colors.primitive` is FLAT (`accent-9`, `accent-dark-9`, `teal-3`), so a
// "family" here is the exported prefix minus its tone and minus the `-dark`
// twin marker: picking Accent ships BOTH appearances, exactly like the
// Primitives table shows one family as a light + dark pair of columns. Keyed
// off the real payload rather than the store, so a family can't be offered
// that the export doesn't actually contain.

/** `accent-9` → `accent` · `neutral-dark-3` → `neutral`. */
export function primitiveFamilyOf(tokenName: string): string {
  return splitFlat(tokenName)[0].replace(/-dark$/, '')
}

export interface PrimitiveFamilyMeta {
  key: string
  label: string
  count: number
}

/** Every primitive family in the payload, in export order, with its variable
 *  count (light + dark ramps together). */
export function primitiveFamilyMeta(full: TokenJSON = generateTokenJSON()): PrimitiveFamilyMeta[] {
  const counts = new Map<string, number>()
  for (const name of Object.keys(full.colors.primitive)) {
    const key = primitiveFamilyOf(name)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const state = useDesignStore.getState()
  const stored = new Map(state.customColors.map((c) => [c.key, c.label]))
  const keys = [...counts.keys()]
  return keys.map((key) => ({
    key,
    label: primitiveDisplayLabel(
      key,
      state.themeSources,
      state.themeLabels,
      keys,
      stored.get(key),
    ),
    count: counts.get(key) ?? 0,
  }))
}

/** Is this flat token name a DARK-twin one (`accent-dark-9`)? */
const isDarkToken = (name: string) => splitFlat(name)[0].endsWith('-dark')

/** The primitive slice a selection ships — every family, both ramps, when
 *  unscoped. */
function pickedPrimitives(
  full: TokenJSON,
  families?: string[],
  appearance?: 'light' | 'dark',
): Record<string, string> {
  if (!families && !appearance) return full.colors.primitive
  return Object.fromEntries(
    Object.entries(full.colors.primitive).filter(([name]) =>
      (!families || families.includes(primitiveFamilyOf(name)))
      && (!appearance || isDarkToken(name) === (appearance === 'dark')),
    ),
  )
}

// ── Collection metadata (labels + live variable counts) ──────────────────────

export interface CollectionMeta {
  key: WizardCollection
  label: string
  count: number
  /** Present on 'semantics' — the theme columns available as modes. */
  modes?: string[]
}

export function collectionMeta(full: TokenJSON = generateTokenJSON()): CollectionMeta[] {
  const t = full.typography
  const typeRoleCount = Object.keys(t.roles ?? {}).length
  const typographyCount =
    2 + Object.keys(t.sizes).length + Object.keys(t.lineHeights ?? {}).length + Object.keys(t.weights).length + typeRoleCount
  const themeNames = full.colors.themeOrder
  const roleCount = Object.keys(full.colors.themes[themeNames[0]] ?? {}).length
  return [
    { key: 'primitives', label: 'Color · Primitives', count: Object.keys(full.colors.primitive).length },
    { key: 'semantics', label: 'Color · Semantics', count: roleCount * themeNames.length, modes: themeNames },
    { key: 'gradients', label: 'Gradients', count: Object.keys(full.gradients).length + Object.keys(full.gradientsDark).length },
    { key: 'typography', label: 'Font', count: typographyCount },
    { key: 'spacing', label: 'Spacing', count: Object.keys(full.spacing).length + Object.keys(full.spacingRoles ?? {}).length },
    { key: 'radius', label: 'Radius', count: Object.keys(full.radius).length + Object.keys(full.radiusRoles ?? {}).length },
    { key: 'shadow', label: 'Shadow', count: Object.keys(full.shadows).length },
    { key: 'grid', label: 'Grid', count: Object.keys(full.grid).length + Object.keys(full.breakpointRoles ?? {}).length + 8 },
    { key: 'sizes', label: 'Sizes', count: Object.keys(full.sizes).length + Object.keys(full.sizeRoles ?? {}).length + Object.keys(full.selector ?? {}).length + Object.keys(full.selectorRoles ?? {}).length },
    { key: 'stroke', label: 'Stroke', count: Object.keys(full.stroke ?? {}).length + Object.keys(full.strokeRoles ?? {}).length },
    { key: 'icons', label: 'Icons', count: 1 + (full.icons.custom?.length ?? 0) },
    { key: 'motion', label: 'Motion', count: motionTokenCount(full) },
  ]
}

/** Variables the current selection ships — the summary's headline number. */
export function selectionCount(
  sel: Pick<WizardSelection, 'collections' | 'modes' | 'primitiveFamilies' | 'primitiveAppearance'>,
  full: TokenJSON = generateTokenJSON(),
): number {
  const meta = collectionMeta(full)
  return sel.collections.reduce((sum, key) => {
    const m = meta.find((x) => x.key === key)
    if (!m) return sum
    // Family-scoped primitives count only the families actually shipping —
    // the headline number has to match the file, family filter included.
    if (key === 'primitives') return sum + Object.keys(pickedPrimitives(full, sel.primitiveFamilies, sel.primitiveAppearance)).length
    if (key === 'semantics') {
      const perMode = m.modes?.length ? m.count / m.modes.length : m.count
      return sum + Math.round(perMode * sel.modes.length)
    }
    return sum + m.count
  }, 0)
}

// ── W3C DTCG ─────────────────────────────────────────────────────────────────

// `accent-500` → ['accent', '500'] · `neutral-dark-300` → ['neutral-dark', '300'].
const splitFlat = (name: string): [string, string] => {
  const i = name.lastIndexOf('-')
  return i < 0 ? [name, name] : [name.slice(0, i), name.slice(i + 1)]
}

/** The folder a primitive family sits in — Accents · Neutrals · States, the
 *  same three groups the plugin's Color Primitives and the platform's
 *  Primitives nav use. Figma's native "Import variables" turns the JSON tree
 *  into groups, so a flat list of families (`holi`, `holi-dark`, `holi-gray`…)
 *  landed as an unordered pile; nested under these three it reads in the
 *  platform's order. Accents first, then Neutrals, then States. */
export const PRIMITIVE_GROUPS = ['Accents', 'Neutrals', 'States'] as const
export function primitiveGroupOf(family: string): (typeof PRIMITIVE_GROUPS)[number] {
  let raw = family
  if (raw.endsWith('-dark')) raw = raw.slice(0, -5)
  if (raw.endsWith('-a') && raw !== 'black-a' && raw !== 'white-a') raw = raw.slice(0, -2)
  if (raw === 'black-a' || raw === 'white-a' || raw === 'black' || raw === 'white') return 'Neutrals'
  if (raw === 'accent' || raw === 'brand') return 'Accents'
  if (raw === 'neutral' || raw === 'gray') return 'Neutrals'
  const STATES = ['error', 'warning', 'success', 'info']
  if (STATES.includes(raw)) return 'States'
  const seg = raw.replace(/-\d+$/, '').split('-').pop() ?? ''
  if (seg === 'gray') return 'Neutrals'
  if (STATES.includes(seg)) return 'States'
  return 'Accents'
}
// ── Wizard collections → Figma collections ──────────────────────────────────
// Gradients and shadows are Figma STYLES, not variables, so the collections
// document has no place for them.
const DIMENSION_GROUPS_OF: Partial<Record<WizardCollection, string[]>> = {
  spacing: ['Spacing'], radius: ['Radius'], stroke: ['Stroke'], sizes: ['Size', 'Selector'], icons: ['Icon'], grid: ['Grid'],
}

function figmaCollectionsFor(ordered: WizardCollection[]): string[] {
  const out: string[] = []
  if (ordered.includes('primitives')) out.push('Color Primitives')
  if (ordered.includes('semantics')) out.push('Color Semantics')
  if (ordered.some((k) => DIMENSION_GROUPS_OF[k])) out.push('Dimension Primitives', 'Dimension Semantics')
  if (ordered.includes('typography')) out.push('Typography')
  return out
}

function dimensionGroupsFor(ordered: WizardCollection[]): string[] {
  return ordered.flatMap((k) => DIMENSION_GROUPS_OF[k] ?? [])
}

// ── Motion ───────────────────────────────────────────────────────────────────

/** Roles + rungs + curves + transforms + choreographies — what the Motion
 *  group carries, for Step 1's count. */
export function motionTokenCount(full: TokenJSON): number {
  const m = (full as unknown as { motion?: Record<string, Record<string, unknown>> }).motion
  if (!m) return 0
  return ['durations', 'easings', 'transforms', 'roles', 'choreography'].reduce((n, k) => n + Object.keys(m[k] ?? {}).length, 0)
}

/** The W3C `Motion` group: one mode per brand when brands move differently,
 *  one `Default` mode when they all move alike (`motionModesFromTokens`, the
 *  rule the plugin's `Motion` collection follows). Written by `snapshotToW3C`
 *  after the five collections; a distance aliases the Dimension primitive of
 *  its length when the document carries it. */
function motionW3CFor(full: TokenJSON): NonNullable<SnapshotToW3COptions['motion']> {
  const modes = motionModesFromTokens(full)
  return ({ aliases, dimensionRef }) => motionW3CGroup(modes, { aliases, dimensionRef })
}

// ── Public entry ─────────────────────────────────────────────────────────────

function desktopOnlyPayload(full: TokenJSON): boolean {
  const viewports = full.viewports
  return Array.isArray(viewports) && viewports.length > 0 && viewports.every((viewport) => viewport === 'desktop')
}

/** The Figma file honours what each brand ships: a brand set to "Light only"
 *  leaves its Dark theme out, exactly as live Sync does (same `modes` scope,
 *  same column shape). While every brand ships everything — the default, and
 *  every system before `brandThemes` — the whole-system payload is returned
 *  untouched, so that download does not change by a byte. */
function brandScopedFigmaDoc(whole: TokenJSON): TokenJSON {
  const s = useDesignStore.getState()
  const brands = myThemeKeys(s.themeOrder, s.themes)
  const narrowed = brands.some((brand) => !shipsEveryTheme(shippedThemes(s.brandThemes, brand)))
  if (!narrowed) return whole
  return generateTokenJSON(undefined, { modes: defaultFigmaSyncModes(brands, s.themeKinds, s.brandThemes) })
}

export function buildWizardExport(sel: WizardSelection): WizardFile[] {
  const unscoped = generateTokenJSON()
  const full = sel.figmaScope ? generateTokenJSON(undefined, sel.figmaScope) : unscoped
  const project = useDesignStore.getState().projectName || 'escala'
  const slug = project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'escala'
  const ordered = ALL_WIZARD_COLLECTIONS.filter((k) => sel.collections.includes(k))

  if (sel.format === 'escala') {
    // NOT sliced by `collections` — this format's whole promise (see its hint
    // in ExportWizard) is "the exact payload the Figma plugin imports", and
    // the plugin requires typography/spacing/radius unconditionally, plus
    // `atoms`/`style` which aren't even collection options here. A collection
    // filter on this format used to produce a file that LOOKED like a valid
    // tokens.json (right name, right shape) but silently dropped required
    // fields — the plugin doesn't degrade gracefully on those, it throws
    // (e.g. missing `typography` crashed importVariables and, because every
    // import phase used to share one try/catch, took Components and
    // Documentation down with it). Ship `full` verbatim, always — EXCEPT
    // `atoms`, the one field Step 1's "Include components" toggle controls:
    // off ships an empty array so the plugin's importComponents phase
    // no-ops, same as unchecking every component individually.
    const doc = sel.figmaScope ? full : brandScopedFigmaDoc(full)
    const payload = sel.includeComponents ? doc : { ...doc, atoms: [] }
    return [{ name: `${slug}.tokens.json`, content: JSON.stringify(payload, null, 2), language: 'json' }]
  }

  if (sel.format === 'skill') {
    const pack = buildSkillExport(sel.colorFormat, undefined, sel.figmaScope)
    return [{
      name: `${pack.name}.zip`,
      content: pack.skillMd,
      language: 'zip',
      binary: pack.zip,
    }]
  }

  if (sel.format === 'agent-bundle') {
    const pack = buildAgentProductExport(sel.colorFormat, sel.figmaScope)
    return [{
      name: `${pack.name}-agent-bundle.zip`,
      content: pack.skillMd,
      language: 'zip',
      binary: pack.zip,
    }]
  }

  if (sel.format === 'w3c') {
    // The Figma file, written down: the five collections the plugin creates,
    // each mode a group under its collection (lib/figmaCollections). The
    // plugin's own W3C export runs the same converter over the file's real
    // variables, so the two downloads share one shape.
    const include = figmaCollectionsFor(ordered)
    const families = sel.primitiveFamilies ? new Set(sel.primitiveFamilies) : null
    const keepPrimitive = families || sel.primitiveAppearance
      ? (key: string, alpha: boolean) => {
          if (key === 'Background') return !families
          if (alpha && families) return false
          const family = primitiveFamilyOf(key)
          if (families && !families.has(family)) return false
          if (sel.primitiveAppearance) return (splitFlat(key)[0].endsWith('-dark')) === (sel.primitiveAppearance === 'dark')
          return true
        }
      : undefined
    // Motion is the plugin's sixth collection; its group comes from the
    // motion settings (choreographies are not variables), through the same
    // converter the plugin's W3C export uses.
    const motion = ordered.includes('motion')
    const groups = motion ? [...include, MOTION_COLLECTION] : [...include]
    const tree = figmaCollectionsW3C(full, {
      include: groups,
      dimensionGroups: dimensionGroupsFor(ordered),
      semanticModes: sel.figmaScope?.modes?.length ? undefined : sel.modes,
      keepPrimitive,
      aliases: sel.includeAliases,
      project,
      ...(motion ? { motion: motionW3CFor(full) } : {}),
    })
    if (sel.structure === 'per-collection') {
      const { $description, $extensions } = tree
      return groups.map((name) => ({
        name: `${name.toLowerCase().replace(/\s+/g, '-')}.tokens.json`,
        content: JSON.stringify({ $description, $extensions, [name]: tree[name] }, null, 2),
        language: 'json' as const,
      }))
    }
    return [{ name: `${slug}.tokens.json`, content: JSON.stringify(tree, null, 2), language: 'json' }]
  }

  // Markdown — delegate to the section builders so a slice reads identically
  // wherever it's taken (preview .MD tab, wizard, Copy Page).
  const sections = [...new Set(ordered.map((k) => SECTION_OF[k]))]
  const live = useDesignStore.getState()
  const narrowed = sel.figmaScope?.modes?.length
    ? freeDownloadStore(live, sel.figmaScope)
    : undefined
  const mdStore = narrowed ?? live
  const colorOpts = {
    families: ordered.includes('primitives') ? sel.primitiveFamilies : [],
    appearance: sel.primitiveAppearance,
    includeSemantics: ordered.includes('semantics'),
    modes: sel.figmaScope?.themes?.length
      ? sel.figmaScope.themes
      : ordered.includes('semantics') ? sel.modes : undefined,
    desktopOnly: desktopOnlyPayload(full),
  }
  if (sel.structure === 'per-collection') {
    return sections
      .map((s) => ({
        name: `${s}.md`,
        content: buildSectionExport(s, 'md', sel.colorFormat, colorOpts, mdStore),
        language: 'md' as const,
      }))
      .filter((f) => f.content.trim().length > 0)
  }
  const isAll = ordered.length === ALL_WIZARD_COLLECTIONS.length && !sel.primitiveFamilies && !sel.primitiveAppearance
  const content = isAll
    ? buildSectionExport('all', 'md', sel.colorFormat, colorOpts, mdStore)
    : sections.map((s) => buildSectionExport(s, 'md', sel.colorFormat, colorOpts, mdStore)).join('\n\n---\n\n')
  return [{ name: `${slug}.md`, content, language: 'md' }]
}

/** One primitive family, one appearance, one format — the payload behind the
 *  per-column export icon in the Primitives table. It is NOT a separate
 *  exporter: it builds a normal `WizardSelection` and runs it through
 *  `buildWizardExport`, so a quick copy of the Accent ramp is byte-identical
 *  to running the full wizard scoped the same way (and to tokens.json).
 *  Escala JSON is the documented exception — it ships the whole document by
 *  contract, scoping or not. */
export function buildFamilyExport(
  family: string,
  appearance: 'light' | 'dark',
  format: WizardFormat,
  colorFormat: ColorFormat = 'hex',
): WizardFile[] {
  return buildWizardExport({
    collections: ['primitives'],
    modes: [],
    format,
    structure: 'single',
    colorFormat,
    includeAliases: false,
    includeComponents: false,
    primitiveFamilies: [family],
    primitiveAppearance: appearance,
  })
}

// ── Alpha ramp export ────────────────────────────────────────────────────────
// The per-column export icon used to be hidden entirely on alpha families
// (Accent-Alpha, a custom family's `-Alpha` twin) — CLAUDE.md's own reasoning
// was "the icon would hand over the solid twin instead", and that was literal:
// alpha values live in `colors.primitiveAlpha`, a bucket `buildFamilyExport`'s
// pipeline (scoped to `colors.primitive` via `primitiveFamilies`) never reads,
// so routing an alpha family through it silently exported nothing or the wrong
// ramp. This is a SEPARATE, minimal builder rather than teaching the whole
// wizard pipeline about a bucket only this one popover needs to reach.
//
// Only the formats that can be built CORRECTLY from a bare `Record<number,
// string>` are offered — see `ALPHA_EXPORT_FORMATS` below. Markdown and Skill
// have no alpha concept in `sectionExport`; faking support there would repeat
// the exact bug this function exists to fix.
export const ALPHA_EXPORT_FORMATS: WizardFormat[] = ['w3c', 'escala']

export function buildAlphaFamilyExport(
  /** The alpha Family's own `tokenPrefix` (e.g. `accent-a`, `<custom>-a`) —
   *  already the exact prefix `tokenGenerator` flattens `colors.primitiveAlpha`
   *  under, so the output can't disagree with what's already in tokens.json. */
  tokenPrefix: string,
  scale: Record<number, string>,
  format: WizardFormat,
  _colorFormat: ColorFormat = 'hex',
): WizardFile[] {
  // Escala JSON is the documented exception for the solid path too — it ships
  // the whole document by contract, and `colors.primitiveAlpha` is already
  // part of it, so no family-specific assembly is needed here at all.
  if (format === 'escala') {
    const project = useDesignStore.getState().projectName || 'escala'
    const slug = project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'escala'
    return [{ name: `${slug}.tokens.json`, content: JSON.stringify(generateTokenJSON(), null, 2), language: 'json' }]
  }

  const naming = useDesignStore.getState().colorNaming
  // Same flattener `tokenGenerator` uses for `colors.primitiveAlpha` itself —
  // `accent-a-1`…`accent-a-12` (or the naming scheme's own labels) — so a
  // reader can match these names straight back to the real export.
  const flat = flattenScale(tokenPrefix, scale, naming)

  if (format === 'w3c') {
    // Same document shape as every other W3C export — Color Primitives only,
    // narrowed to this alpha ramp. `colors.primitiveAlpha` keys a twin by its
    // BARE family (`accent-3`), the neutral ladder keeps its `-a` (`black-a-3`).
    const ladder = tokenPrefix === 'black-a' || tokenPrefix === 'white-a'
    const base = ladder ? tokenPrefix : tokenPrefix.replace(/-a$/, '')
    const project = useDesignStore.getState().projectName || 'escala'
    const slug = project.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'escala'
    const tree = figmaCollectionsW3C(generateTokenJSON(), {
      include: ['Color Primitives'],
      keepPrimitive: (key, alpha) => alpha && splitFlat(key)[0] === base,
      project,
    })
    return [{ name: `${slug}.tokens.json`, content: JSON.stringify(tree, null, 2), language: 'json' }]
  }

  return []
}
