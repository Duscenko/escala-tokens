// The design system dashboard's model: everything it shows, derived from the
// system on screen. No React and no stored numbers: each figure on a dashboard
// page is computed here from the tokens, the component catalogue and the
// status decisions, so a page cannot claim something the system does not hold.
//
//   · roles      — the Categorical semantic roles of one brand, with the
//                  contrast audit run over them (color/audit's own loop).
//   · elements   — every role and every component in the system, with its
//                  checks and its status (a decision, or the automatic one).
//   · foundations— which components consume which role, and the reverse.
//   · releases   — the tokens as a flat map, and the difference to the map
//                  stored at the last release.
//   · facts      — one line per foundation for Overview's cards (the fonts,
//                  the three radius axes, the spacing mode, the shadow preset).

import type { useDesignStore } from '../store/useDesignStore'
import { buildThemeArchitecture } from './themeArchitecture'
import { appearanceFromModeKey, type ThemeAppearance } from './themeModes'
import { auditResolvedRoles, CURATED_PAIRINGS, type ResolvedFinding } from './color/audit'
import { COMPONENTS, type ComponentDef } from './componentCatalogue'
import { COMPONENT_RECIPES, recipeRows } from './componentRecipes'
import { COLOR_FIELD_INFO } from './previewColorFields'
import { CATEGORICAL_FIELD_ROLE } from './previewTokens'
import { rolesForComponent } from './tokenInspector'
import { generateTokenJSON } from './tokenGenerator'
import { resolveThemeFoundations } from './themeFoundations'
import { SPACING_MODES, matchSpacingMode, mergeLayoutRoles, resolveLayoutRole } from './layoutTokens'
import { matchShadowPreset } from './shadowTokens'
import {
  RELEASE_CHANGE_LIMIT,
  type ElementDecision, type ElementStatus, type ReleaseBump, type ReleaseChange, type ReleaseRecord,
} from './systemDashboardTypes'

type StoreState = ReturnType<typeof useDesignStore.getState>

// ── Roles ────────────────────────────────────────────────────────────────────

export interface RoleValue { css: string; label: string }

export interface RoleEntry {
  /** `category.key`, e.g. `action.primary.default`. */
  id: string
  category: string
  categoryLabel: string
  /** Mode key → resolved value and the primitive it reads. */
  modes: Record<string, RoleValue>
  /** Re-pointed by hand in at least one mode. */
  edited: boolean
}

export interface SystemRoles {
  brand: string
  modeKeys: string[]
  appearanceOf: Record<string, ThemeAppearance>
  roles: RoleEntry[]
  /** One row per measured pair and mode. */
  findings: ResolvedFinding[]
}

/** The semantic roles of one brand, resolved in each of its themes. */
export function resolveSystemRoles(store: StoreState, brand: string): SystemRoles {
  const built = buildThemeArchitecture(store, brand)
  const view = built.archView
  const modeKeys = view?.modeKeys ?? built.archThemeCols
  const appearanceOf: Record<string, ThemeAppearance> = {}
  for (const mode of modeKeys) appearanceOf[mode] = appearanceFromModeKey(mode) ?? (mode === 'dark' ? 'dark' : 'light')

  const roles: RoleEntry[] = []
  const resolved = new Map<string, Record<string, string>>()
  for (const cat of view?.categories ?? []) {
    for (const tok of cat.tokens) {
      const id = `${cat.key}.${tok.key}`
      const modes: Record<string, RoleValue> = {}
      const css: Record<string, string> = {}
      for (const [mode, value] of Object.entries(tok.modes)) {
        modes[mode] = { css: value.css, label: value.label }
        css[mode] = value.css
      }
      resolved.set(id, css)
      roles.push({
        id,
        category: cat.key,
        categoryLabel: cat.label,
        modes,
        edited: Object.values(tok.edited ?? {}).some(Boolean),
      })
    }
  }

  const findings = auditResolvedRoles(resolved, modeKeys, CURATED_PAIRINGS.categorical ?? [], {
    system: store.projectName,
    architecture: 'categorical',
    lenient: true,
  })
  return { brand: built.activeTheme, modeKeys, appearanceOf, roles, findings }
}

/** A finding fails when the pair clears neither metric's bar for its intent. */
export function findingFails(finding: ResolvedFinding): boolean {
  return !finding.passesWcag
}

export interface ContrastSummary { measured: number; passing: number; failing: ResolvedFinding[] }

export function contrastSummary(findings: readonly ResolvedFinding[]): ContrastSummary {
  // Decorative and surface pairs carry no threshold: they are measured for the
  // report, never counted for or against the score.
  const scored = findings.filter((f) => f.intent !== 'decorative' && f.intent !== 'surface')
  const failing = scored.filter(findingFails)
  return { measured: scored.length, passing: scored.length - failing.length, failing }
}

// ── Component ↔ role ─────────────────────────────────────────────────────────

/** Role id → the catalogue keys of the components that read it. */
export function componentsByRole(keys: readonly string[] = COMPONENTS.map((c) => c.key)): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const key of keys) {
    for (const role of rolesForComponent(key)) {
      const list = out.get(role)
      if (list) list.push(key)
      else out.set(role, [key])
    }
  }
  return out
}

export interface TokenMappingRow {
  component: string
  componentLabel: string
  /** What the role paints on the component ("Brand solid fill"). */
  property: string
  /** The semantic role, or null when the component reads a value with no role. */
  role: string | null
}

/** Component · property → role, for every component given. */
export function tokenMapping(keys: readonly string[]): TokenMappingRow[] {
  const rows: TokenMappingRow[] = []
  for (const key of keys) {
    const def = COMPONENTS.find((c) => c.key === key)
    if (!def) continue
    const recipe = COMPONENT_RECIPES[key]
    if (recipe) {
      for (const row of recipeRows(recipe).filter((r) => r.ref.startsWith('color.'))) {
        rows.push({
          component: key,
          componentLabel: def.label,
          property: `${row.slot} ${row.prop}`,
          role: row.ref.slice(6),
        })
      }
      continue
    }
  }
  return rows
}

// ── Components ───────────────────────────────────────────────────────────────

export interface ComponentRow {
  key: string
  label: string
  category: string
  /** Part of this design system (`selectedComponents`). */
  included: boolean
  figmaSets: number
  /** A live preview exists for it. */
  preview: boolean
  /** Usage, accessibility notes and at least one prop are written. */
  documented: boolean
  variants: number
  roles: number
}

export function variantCount(def: ComponentDef): number {
  return def.axes.reduce((total, axis) => total * Math.max(1, axis.values.length), 1)
}

function isDocumented(def: ComponentDef): boolean {
  return Boolean(def.usage.trim() && def.accessibility.trim() && def.props.length)
}

export function componentRows(selected: readonly string[], previewKeys: ReadonlySet<string>): ComponentRow[] {
  const included = new Set(selected)
  return COMPONENTS.map((def) => ({
    key: def.key,
    label: def.label,
    category: def.category,
    included: included.has(def.key),
    figmaSets: def.figmaSets.length,
    preview: previewKeys.has(def.key),
    documented: isDocumented(def),
    variants: variantCount(def),
    roles: rolesForComponent(def.key).length,
  }))
}

// ── Releases: the token map and its difference ───────────────────────────────

type Json = string | number | boolean | null | undefined | Json[] | { [key: string]: Json }

function flattenInto(out: Record<string, string>, value: Json, path: string): void {
  if (value === null || value === undefined) return
  if (Array.isArray(value)) {
    if (value.every((item) => item === null || typeof item !== 'object')) out[path] = value.join(', ')
    else value.forEach((item, index) => flattenInto(out, item, `${path}.${index}`))
    return
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) flattenInto(out, value[key], `${path}.${key}`)
    return
  }
  out[path] = String(value)
}

export const RELEASE_COMPONENT_PREFIX = 'component.'
export const RELEASE_SEMANTIC_PREFIX = 'color.semantic.'

/**
 * The tokens a release records, as path → value.
 *
 * Built from `generateTokenJSON`, so it holds exactly what an export holds.
 * Only the sections that are the system's own decisions are kept: primitives,
 * semantic roles, each brand's foundations and gradients, the icon library and
 * the component list. The root foundation maps are left out on purpose: they
 * mirror whichever brand is on screen, so switching brand would read as a
 * change.
 */
export function releaseTokenMap(store: StoreState): Record<string, string> {
  const json = generateTokenJSON(store) as unknown as Record<string, Json>
  const colors = (json.colors ?? {}) as Record<string, Json>
  const architecture = (colors.architecture ?? {}) as Record<string, Json>
  const icons = (json.icons ?? {}) as Record<string, Json>
  const out: Record<string, string> = {}
  flattenInto(out, colors.primitive, 'color.primitive')
  flattenInto(out, colors.primitiveAlpha, 'color.alpha')
  flattenInto(out, architecture.tokens, 'color.semantic')
  flattenInto(out, json.foundationsByTheme, 'brand')
  flattenInto(out, json.gradientsByTheme, 'gradient')
  flattenInto(out, icons.library, 'icons.library')
  flattenInto(out, icons.weight, 'icons.weight')
  const atoms = Array.isArray(json.atoms) ? json.atoms : []
  for (const atom of atoms) if (typeof atom === 'string') out[`${RELEASE_COMPONENT_PREFIX}${atom}`] = 'included'
  return out
}

export function diffTokenMaps(
  before: Readonly<Record<string, string>>,
  after: Readonly<Record<string, string>>,
): ReleaseChange[] {
  const changes: ReleaseChange[] = []
  for (const path of Object.keys(after)) {
    if (!(path in before)) changes.push({ path, kind: 'added', after: after[path] })
    else if (before[path] !== after[path]) changes.push({ path, kind: 'changed', before: before[path], after: after[path] })
  }
  for (const path of Object.keys(before)) {
    if (!(path in after)) changes.push({ path, kind: 'removed', before: before[path] })
  }
  return changes.sort((a, b) => a.path.localeCompare(b.path))
}

export function changeCounts(changes: readonly ReleaseChange[]): ReleaseRecord['counts'] {
  const counts = { added: 0, changed: 0, removed: 0 }
  for (const change of changes) counts[change.kind] += 1
  return counts
}

/** The first two path segments: the collection a change belongs to. */
export function changeCollection(path: string): string {
  return path.split('.').slice(0, 2).join('.')
}

/** Removing something breaks whoever used it; adding does not; a new value is a fix. */
export function suggestedBump(counts: ReleaseRecord['counts']): ReleaseBump | null {
  if (counts.removed > 0) return 'major'
  if (counts.added > 0) return 'minor'
  if (counts.changed > 0) return 'patch'
  return null
}

export function nextVersion(current: string | null, bump: ReleaseBump): string {
  if (!current) return '1.0.0'
  const [major = 0, minor = 0, patch = 0] = current.split('.').map((part) => Number.parseInt(part, 10) || 0)
  if (bump === 'major') return `${major + 1}.0.0`
  if (bump === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

export interface ReleaseDraft {
  /** No release yet: the first one records the whole system. */
  first: boolean
  current: Record<string, string>
  changes: ReleaseChange[]
  counts: ReleaseRecord['counts']
  suggested: ReleaseBump | null
  lastVersion: string | null
}

export function releaseDraft(store: StoreState): ReleaseDraft {
  const current = releaseTokenMap(store)
  const baseline = store.releaseBaseline ?? null
  const lastVersion = store.releases?.[0]?.version ?? null
  if (!baseline) {
    const total = Object.keys(current).length
    return {
      first: true, current, changes: [],
      counts: { added: total, changed: 0, removed: 0 },
      suggested: 'major', lastVersion,
    }
  }
  const changes = diffTokenMaps(baseline, current)
  const counts = changeCounts(changes)
  return { first: false, current, changes, counts, suggested: suggestedBump(counts), lastVersion }
}

export function buildRelease(draft: ReleaseDraft, bump: ReleaseBump, note: string, at: string): ReleaseRecord {
  return {
    version: nextVersion(draft.lastVersion, bump),
    at,
    bump,
    note: note.trim(),
    counts: draft.counts,
    changes: draft.changes.slice(0, RELEASE_CHANGE_LIMIT),
  }
}

// ── Elements and their status ────────────────────────────────────────────────

export type ElementKind = 'token' | 'component'

export type ElementCheck =
  | { kind: 'contrast'; state: 'pass' | 'fail' | 'none'; measured: number; failed: number; worst: ResolvedFinding | null }
  | { kind: 'naming'; state: 'pass' | 'fail' }
  | { kind: 'duplicate'; state: 'pass' | 'info'; of: string | null }
  | { kind: 'usage'; state: 'pass' | 'info'; components: string[] }
  | { kind: 'figma'; state: 'pass' | 'fail'; sets: number }
  | { kind: 'docs'; state: 'pass' | 'fail' }
  | { kind: 'preview'; state: 'pass' | 'info' }
  | { kind: 'roles'; state: 'pass' | 'fail'; total: number; failing: string[] }

/** What the checks recommend. The person still decides. */
export type Suggestion = 'approve' | 'changes' | 'keep'

export interface DashboardElement {
  /** `token:<role id>` or `component:<catalogue key>`. */
  id: string
  kind: ElementKind
  name: string
  group: string
  status: ElementStatus
  /** Someone set this status. False: it follows the system. */
  decided: boolean
  decidedAt: string | null
  /** Its value changed, or it was added, since the last release. */
  changedSinceRelease: boolean
  checks: ElementCheck[]
  failing: number
  suggestion: Suggestion
}

export const tokenElementId = (role: string) => `token:${role}`
export const componentElementId = (key: string) => `component:${key}`

/** `content.primary`, `action.primary.default`, `status.critical.on-solid`. */
const ROLE_NAME = /^[a-z]+(\.[a-z0-9]+(-[a-z0-9]+)*)+$/

interface StatusContext {
  decisions: Readonly<Record<string, ElementDecision>>
  /** Something left this browser for Figma or GitHub at least once. */
  published: boolean
  hasRelease: boolean
}

/**
 * The status an element has when nobody decided one.
 *
 * With a release on file, the release is the line: what changed after it is
 * Pending, the rest is Live. Before the first release there is no line to
 * measure against, so the system is Live once it was published and Pending
 * until then. Allow sync and Disabled are decisions, never the automatic state.
 */
export function automaticStatus(changedSinceRelease: boolean, ctx: Pick<StatusContext, 'published' | 'hasRelease'>): ElementStatus {
  if (ctx.hasRelease) return changedSinceRelease ? 'proposed' : 'live'
  return ctx.published ? 'live' : 'proposed'
}

function statusOf(id: string, changed: boolean, ctx: StatusContext) {
  const decision = ctx.decisions[id]
  return decision
    ? { status: decision.status, decided: true, decidedAt: decision.at }
    : { status: automaticStatus(changed, ctx), decided: false, decidedAt: null }
}

function suggestionFor(status: ElementStatus, failing: number): Suggestion {
  if (status === 'deprecated') return 'keep'
  if (failing > 0) return 'changes'
  if (status === 'proposed' || status === 'review') return 'approve'
  return 'keep'
}

const countFailing = (checks: readonly ElementCheck[]) => checks.filter((check) => check.state === 'fail').length

export interface ElementsInput {
  store: StoreState
  roles: SystemRoles
  previewKeys: ReadonlySet<string>
  /** `releaseDraft(store).changes`, passed in so it is built once. */
  changes: readonly ReleaseChange[]
}

export function buildElements({ store, roles, previewKeys, changes }: ElementsInput): DashboardElement[] {
  const ctx: StatusContext = {
    decisions: store.elementStatus ?? {},
    published: Boolean(store.figmaLastPublishAt || store.githubLastPushAt),
    hasRelease: Boolean(store.releaseBaseline),
  }
  const changedPaths = changes.map((change) => change.path)
  const usage = componentsByRole(store.selectedComponents)

  const findingsByRole = new Map<string, ResolvedFinding[]>()
  for (const finding of roles.findings) {
    if (finding.intent === 'decorative' || finding.intent === 'surface') continue
    const list = findingsByRole.get(finding.role)
    if (list) list.push(finding)
    else findingsByRole.set(finding.role, [finding])
  }
  const failingRoles = new Set<string>()
  for (const [role, list] of findingsByRole) if (list.some(findingFails)) failingRoles.add(role)

  // Roles that resolve to one value in every theme, keyed by that value.
  const signature = (role: RoleEntry) => roles.modeKeys.map((mode) => role.modes[mode]?.css ?? '').join('|')
  const firstWithSignature = new Map<string, string>()
  for (const role of roles.roles) {
    const sig = signature(role)
    if (!firstWithSignature.has(sig)) firstWithSignature.set(sig, role.id)
  }

  const elements: DashboardElement[] = []

  for (const role of roles.roles) {
    const id = tokenElementId(role.id)
    const measured = findingsByRole.get(role.id) ?? []
    const failed = measured.filter(findingFails)
    const worst = [...measured].sort((a, b) => a.wcag - b.wcag)[0] ?? null
    const twin = firstWithSignature.get(signature(role))
    const usedBy = usage.get(role.id) ?? []
    const checks: ElementCheck[] = [
      { kind: 'contrast', state: measured.length === 0 ? 'none' : failed.length ? 'fail' : 'pass', measured: measured.length, failed: failed.length, worst },
      { kind: 'naming', state: ROLE_NAME.test(role.id) ? 'pass' : 'fail' },
      { kind: 'duplicate', state: twin && twin !== role.id ? 'info' : 'pass', of: twin && twin !== role.id ? twin : null },
      { kind: 'usage', state: usedBy.length ? 'pass' : 'info', components: usedBy },
    ]
    const prefix = `${RELEASE_SEMANTIC_PREFIX}${role.id}.`
    const changed = changedPaths.some((path) => path.startsWith(prefix))
    const failing = countFailing(checks)
    const status = statusOf(id, changed, ctx)
    elements.push({
      id, kind: 'token', name: role.id, group: role.categoryLabel,
      ...status, changedSinceRelease: changed, checks, failing,
      suggestion: suggestionFor(status.status, failing),
    })
  }

  const included = new Set(store.selectedComponents)
  for (const def of COMPONENTS) {
    if (!included.has(def.key)) continue
    const id = componentElementId(def.key)
    const consumed = rolesForComponent(def.key)
    const checks: ElementCheck[] = [
      { kind: 'figma', state: def.figmaSets.length ? 'pass' : 'fail', sets: def.figmaSets.length },
      { kind: 'docs', state: isDocumented(def) ? 'pass' : 'fail' },
      { kind: 'preview', state: previewKeys.has(def.key) ? 'pass' : 'info' },
      { kind: 'roles', state: consumed.some((role) => failingRoles.has(role)) ? 'fail' : 'pass', total: consumed.length, failing: consumed.filter((role) => failingRoles.has(role)) },
    ]
    const changed = changedPaths.includes(`${RELEASE_COMPONENT_PREFIX}${def.key}`)
    const failing = countFailing(checks)
    const status = statusOf(id, changed, ctx)
    elements.push({
      id, kind: 'component', name: def.label, group: def.category,
      ...status, changedSinceRelease: changed, checks, failing,
      suggestion: suggestionFor(status.status, failing),
    })
  }

  return elements
}

const STATUS_RANK: Record<ElementStatus, number> = { proposed: 0, review: 1, approved: 3, live: 4, deprecated: 5 }

/** What needs a decision first: open proposals, then anything a check fails on. */
export function sortForDecision(elements: readonly DashboardElement[]): DashboardElement[] {
  const rank = (el: DashboardElement) => {
    const base = STATUS_RANK[el.status]
    return el.failing > 0 && base > 1 ? 2 : base
  }
  return [...elements].sort((a, b) => rank(a) - rank(b) || b.failing - a.failing || a.name.localeCompare(b.name))
}

export function statusCounts(elements: readonly DashboardElement[]): Record<ElementStatus, number> {
  const counts: Record<ElementStatus, number> = { proposed: 0, review: 0, approved: 0, live: 0, deprecated: 0 }
  for (const element of elements) counts[element.status] += 1
  return counts
}

// ── Sources ──────────────────────────────────────────────────────────────────

/** `never`: nothing was sent. `stale`: something changed after the last send. */
export type SourceState = 'never' | 'stale' | 'synced'

export function latestChange(updatedAt: Readonly<Record<string, string>> | undefined): string | null {
  let latest: string | null = null
  for (const iso of Object.values(updatedAt ?? {})) if (!latest || iso > latest) latest = iso
  return latest
}

export function sourceState(sentAt: string | null, changedAt: string | null): SourceState {
  if (!sentAt) return 'never'
  return changedAt && Date.parse(changedAt) > Date.parse(sentAt) ? 'stale' : 'synced'
}

// ── Overview facts ───────────────────────────────────────────────────────────

/** What Overview's foundation cards say about one brand. A `null` label means
 *  the values match no preset: the card says Custom. */
export interface FoundationFacts {
  fonts: { body: string; heading: string }
  /** Resolved Desktop px of the three radius axes. */
  radius: { boxes: number; fields: number; selectors: number }
  /** A `SPACING_MODES` label. */
  spacing: string | null
  /** The standard control height (`size-md`). */
  fieldHeight: string
  /** A `SHADOW_PRESETS` label. */
  shadow: string | null
  /** The middle step of the light shadow ramp, to draw the card with. */
  shadowMd: string
}

export function foundationFacts(store: StoreState, brand: string): FoundationFacts {
  const f = resolveThemeFoundations(store, brand)
  const radiusRoles = mergeLayoutRoles('radius', f.radiusRoles)
  const px = (role: string) => parseFloat(resolveLayoutRole('radius', radiusRoles, f.radius, role, '0')) || 0
  const mode = matchSpacingMode(f.sizes, f.spacingRoles, f.stroke)
  return {
    fonts: { body: f.typography.fontFamily, heading: f.typography.headingFontFamily || f.typography.fontFamily },
    radius: { boxes: px('container'), fields: px('action'), selectors: px('control') },
    spacing: SPACING_MODES.find((m) => m.id === mode)?.label ?? null,
    fieldHeight: f.sizes.md ?? '',
    shadow: matchShadowPreset(f.shadows),
    shadowMd: f.shadows.md ?? 'none',
  }
}
