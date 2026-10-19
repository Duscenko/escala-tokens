// tokens.json → the variables the Escala Figma plugin writes, collection by
// collection, mode by mode. The plugin's `importVariables` (code.ts) is the
// source of truth; this MIRRORS it so the web's W3C export is the same
// document the plugin exports from a synced file (both go through
// `snapshotToW3C`). When the plugin's naming or mode rules change, change them
// here too — `figmaCollections.test.ts` locks the shape.
//
// Mirrored, by collection:
//   Color Primitives     primitiveVarName / primitiveAlphaVarName + `Background`
//   Color Semantics      the Categorical architecture: `<Group>/<key>` per theme
//                        column (themeOrder ∩ the architecture's modes, labelled
//                        by themeLabels); a value aliases the primitive that
//                        carries its exact hex (8-digit for the alpha roles)
//   Dimension Primitives every length the payload uses, named by value, plus
//                        `columns/<n>` for the grid's column counts
//   Dimension Semantics  Spacing / Radius / Stroke / Size / Selector / Icon /
//                        Grid, modes = the shipped viewports
//   Typography           size / weight / line-height / letter-spacing steps,
//                        the two families, and `role/<role>/*` per viewport

import { figmaPrimitiveName, type PrimitiveNameContext } from '../agentBundle/names'
import type { generateTokenJSON } from '../tokenGenerator'
import type { CollectionsSnapshot, SnapCollection, SnapValue, SnapVariable } from './w3cTree'

type TokenJSON = ReturnType<typeof generateTokenJSON>
type Viewport = 'desktop' | 'tablet' | 'mobile'
type Loose = Record<string, any>

/** Figma's own label for the one mode of a collection nobody renames. */
const SINGLE_MODE = 'Mode 1'
const VIEWPORTS: [Viewport, string][] = [['desktop', 'Desktop'], ['tablet', 'Tablet'], ['mobile', 'Mobile']]
const CATEGORICAL_GROUPS: [string, string][] = [
  ['content', 'Content'], ['action', 'Action'], ['surface', 'Surface'], ['status', 'Status'], ['border', 'Border'],
]
const ICON_SIZE_PX = { small: 16, medium: 20, large: 24 } as const
const ICON_SIZE_NAMES = ['small', 'medium', 'large'] as const
const FAMILY_BODY = 'font-family-body'
const FAMILY_DISPLAY = 'font-family-display'

// ── Plugin helpers, mirrored ─────────────────────────────────────────────────

const pxToFloat = (val: string) => parseFloat(String(val).replace('px', '').replace('rem', '')) || 0

function parseDimension(raw: string | number | undefined | null): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw * 1000) / 1000 : null
  if (raw == null) return null
  const m = /^\s*(-?(?:\d+\.?\d*|\.\d+))\s*(px)?\s*$/i.exec(String(raw))
  return m ? Math.round(Number(m[1]) * 1000) / 1000 : null
}

export function dimensionKey(n: number): string {
  return String(Math.round(n * 1000) / 1000).replace('.', '_')
}
const dimensionFromKey = (key: string) => Number(key.replace('_', '.'))

function pinnedDimension(value: string | undefined | null): number | null {
  if (typeof value !== 'string' || !value.startsWith('dimension-')) return null
  const key = value.slice('dimension-'.length)
  const n = dimensionFromKey(key)
  return Number.isFinite(n) && dimensionKey(n) === key ? n : null
}

function normalizeFontFamilyName(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return 'Inter'
  const trimmed = raw.trim()
  if (!trimmed) return 'Inter'
  const quoted = /^['"]([^'"]+)['"]/.exec(trimmed)
  if (quoted?.[1]) return quoted[1].trim()
  const first = trimmed.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
  return first || 'Inter'
}

/** `Action/primary.default` → `Action/primary/default`; a leading digit nests under `step/`. */
function figmaVarName(name: string): string {
  const slashed = name.replace(/\./g, '/')
  const first = slashed.split('/')[0]
  return /^\d/.test(first) ? `step/${slashed}` : slashed
}

function primitiveAlphaVarName(key: string, ctx: PrimitiveNameContext): string {
  const ladder = /^(black|white)-a-(\d+)$/.exec(key)
  if (ladder) {
    const tone = /^\d$/.test(ladder[2]) ? `0${ladder[2]}` : ladder[2]
    return `Neutrals/${ladder[1] === 'black' ? 'Black' : 'White'} Alpha/${tone}`
  }
  const solid = figmaPrimitiveName(key, ctx)
  const slash = solid.lastIndexOf('/')
  return slash === -1 ? `Alpha/${solid}` : `${solid.slice(0, slash)}/Alpha/${solid.slice(slash + 1)}`
}

const normHex = (hex: string) => {
  let h = hex.trim().toLowerCase().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return h.slice(0, 6)
}
/** `#rrggbb[aa]` → { hex6, alpha8 | null }. An `ff` alpha is opaque. */
function splitHex(hex: string): { opaque: string; alpha: string | null } {
  const h = hex.trim().toLowerCase().replace('#', '')
  if (h.length === 8 && h.slice(6) !== 'ff') return { opaque: h.slice(0, 6), alpha: h }
  return { opaque: normHex(h), alpha: null }
}

function columnsFrom(order: readonly string[] | undefined, present: Loose | null | undefined): string[] {
  if (!present) return []
  const listed = (order ?? []).filter((key) => present[key] != null)
  return listed.length ? listed : Object.keys(present)
}

function themeColumnBase(key: string): string {
  return key.split('::')[0]
}

function activeThemeKey(t: TokenJSON): string {
  const order = t.colors.themeOrder ?? []
  const named = (t.colors as Loose).activeTheme as string | undefined
  if (named) {
    if (order.includes(named) || (t as Loose).foundationsByTheme?.[named] || (t.colors as Loose).themes?.[named]) return named
    const match = order.find((key) => key === named || themeColumnBase(key) === themeColumnBase(named))
    if (match) return match
  }
  const own = order.filter((k) => k !== 'light' && k !== 'dark')
  return own[own.length - 1] ?? order[0] ?? 'light'
}

function shippedViewports(t: TokenJSON): [Viewport, string][] {
  const listed = (t as Loose).viewports as string[] | undefined
  const picked = VIEWPORTS.filter(([k]) => listed?.includes(k))
  return picked.length ? picked : VIEWPORTS
}

function gridFrame(t: Loose, vp: Viewport, theme?: string): { columns: number; gutter: number; margin: number; container: number } {
  const fb = theme ? t.foundationsByTheme?.[theme] : undefined
  const spacing = fb?.spacing ?? t.spacing
  const grid = fb?.grid ?? t.grid ?? {}
  const alias = (fb?.gridFrame ?? t.gridFrame)?.[vp]
  if (!alias) {
    if (vp === 'desktop') {
      return {
        columns: parseInt(grid.columns, 10) || 12,
        gutter: pxToFloat(grid.gutter ?? '24px'),
        margin: pxToFloat(grid.margin ?? '32px'),
        container: !grid.container || grid.container === 'none' ? 0 : pxToFloat(grid.container),
      }
    }
    const step = vp === 'tablet' ? '6' : '4'
    const fallback = vp === 'tablet' ? '24px' : '16px'
    return { columns: vp === 'tablet' ? 8 : 4, gutter: pxToFloat(spacing?.[step] ?? fallback), margin: pxToFloat(spacing?.[step] ?? fallback), container: 0 }
  }
  const fallbackCols = vp === 'mobile' ? '4' : vp === 'tablet' ? '8' : '12'
  const columns = Math.max(1, parseInt(alias.columns || fallbackCols, 10) || 12)
  const fallbackGut = vp === 'mobile' ? '16px' : '24px'
  const fallbackMar = vp === 'mobile' ? '16px' : vp === 'tablet' ? '24px' : '32px'
  const gutter = pinnedDimension(alias.gutter) ?? pxToFloat((alias.gutter && spacing?.[alias.gutter]) || grid.gutter || fallbackGut)
  const margin = pinnedDimension(alias.margin) ?? pxToFloat((alias.margin && spacing?.[alias.margin]) || grid.margin || fallbackMar)
  let container = 0
  if (alias.container && alias.container !== 'none') {
    container = pinnedDimension(alias.container) ?? pxToFloat(grid[`breakpoint-${alias.container}`] || '0')
  }
  return { columns, gutter, margin, container }
}

function iconPx(t: Loose, theme?: string): Record<(typeof ICON_SIZE_NAMES)[number], Record<Viewport, number>> {
  const src = (theme ? t.foundationsByTheme?.[theme]?.iconSizes : undefined) ?? t.icons?.sizes
  const read = (role: (typeof ICON_SIZE_NAMES)[number], vp: Viewport) =>
    parseDimension(src?.viewports?.[vp]?.[role] ?? '') ?? parseDimension(src?.scale?.[role] ?? '') ?? ICON_SIZE_PX[role]
  const out = {} as Record<(typeof ICON_SIZE_NAMES)[number], Record<Viewport, number>>
  for (const role of ICON_SIZE_NAMES) out[role] = { desktop: read(role, 'desktop'), tablet: read(role, 'tablet'), mobile: read(role, 'mobile') }
  return out
}

// ── Snapshot ─────────────────────────────────────────────────────────────────

const alias = (collection: string, name: string): SnapValue => ({ alias: { collection, name } })

class Collection {
  readonly vars = new Map<string, SnapVariable>()
  readonly name: string
  readonly modes: string[]
  constructor(name: string, modes: string[]) { this.name = name; this.modes = modes }
  set(name: string, type: SnapVariable['type'], values: Record<string, SnapValue>) {
    this.vars.set(name, { name, type, values })
  }
  /** One value in every mode. */
  all(name: string, type: SnapVariable['type'], value: SnapValue) {
    this.set(name, type, Object.fromEntries(this.modes.map((m) => [m, value])))
  }
  done(): SnapCollection {
    return { name: this.name, modes: this.modes, variables: [...this.vars.values()] }
  }
}

export interface PrimitiveEntry { key: string; alpha: boolean; name: string; hex: string }

/** Every Color Primitives variable with the tokens.json key it came from. */
export function primitiveEntries(tokens: TokenJSON): PrimitiveEntry[] {
  const colors = tokens.colors as unknown as Loose
  const ctx: PrimitiveNameContext = { themeSources: colors.themeSources, themeOrder: colors.themeOrder, themeLabels: colors.themeLabels }
  const out: PrimitiveEntry[] = []
  for (const [key, hex] of Object.entries((colors.primitive ?? {}) as Record<string, string>)) {
    if (hex) out.push({ key, alpha: false, name: figmaPrimitiveName(key, ctx), hex: String(hex).toLowerCase() })
  }
  for (const [key, hex] of Object.entries((colors.primitiveAlpha ?? {}) as Record<string, string>)) {
    if (hex) out.push({ key, alpha: true, name: primitiveAlphaVarName(key, ctx), hex: String(hex).toLowerCase() })
  }
  return out
}

export function figmaCollectionsSnapshot(tokens: TokenJSON): CollectionsSnapshot {
  const t = tokens as unknown as Loose
  const colors = t.colors as Loose
  const fbt = (t.foundationsByTheme ?? {}) as Record<string, Loose>
  const foundationThemes = columnsFrom(colors.themeOrder, t.foundationsByTheme)
  const vps = shippedViewports(tokens)

  // ── Color Primitives ───────────────────────────────────────────────────────
  const prim = new Collection('Color Primitives', [SINGLE_MODE])
  const byHex = new Map<string, string>()
  const byAlpha = new Map<string, string>()
  for (const p of primitiveEntries(tokens)) {
    prim.all(p.name, 'COLOR', p.hex)
    if (p.alpha) {
      const h8 = splitHex(p.hex).alpha ?? `${normHex(p.hex)}ff`
      if (!byAlpha.has(h8)) byAlpha.set(h8, p.name)
    } else {
      const h = normHex(p.hex)
      if (!byHex.has(h)) byHex.set(h, p.name)
    }
  }
  if (colors.background) prim.all('Background', 'COLOR', String(colors.background).toLowerCase())

  // ── Color Semantics ────────────────────────────────────────────────────────
  const archTokens = colors.architecture?.tokens as Record<string, Record<string, Record<string, string>>> | undefined
  const themeNames = columnsFrom(colors.themeOrder, colors.themes && Object.keys(colors.themes).length ? colors.themes : { light: 1, dark: 1 })
  const labelOf = (m: string) => (colors.themeLabels?.[m] as string | undefined)?.trim() || m.charAt(0).toUpperCase() + m.slice(1)
  const present = new Set<string>()
  for (const group of Object.values(archTokens ?? {})) for (const node of Object.values(group)) Object.keys(node).forEach((m) => present.add(m))
  const semKeys = (() => {
    const ordered = themeNames.filter((m) => present.has(m))
    return ordered.length ? ordered : themeNames
  })()
  const sem = new Collection('Color Semantics', semKeys.map(labelOf))
  const colorValue = (hex: string): SnapValue => {
    const { opaque, alpha } = splitHex(hex)
    const target = alpha ? byAlpha.get(alpha) : byHex.get(opaque)
    return target ? alias('Color Primitives', target) : hex.toLowerCase()
  }
  // An architecture value is a `{family.tone}` ref, a hex, or `rgb(r g b / a)`
  // — the plugin's `archValueRgba` + `primitiveRefHex`, mirrored.
  const archHex = (raw: string | undefined): string | undefined => {
    const val = (raw ?? '').trim()
    if (!val) return undefined
    const ref = /^\{([^}.]+)\.([^}]+)\}$/.exec(val)
    if (ref) {
      const [, fam, tone] = ref
      const solid = colors.primitive?.[`${fam}-${tone}`] as string | undefined
      const alpha = colors.primitiveAlpha as Record<string, string> | undefined
      const hex = solid ?? alpha?.[`${fam}-${tone}`] ?? (fam.endsWith('-a') ? alpha?.[`${fam.slice(0, -2)}-${tone}`] : undefined)
      return hex?.toLowerCase()
    }
    const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/i.exec(val)
    if (fn) {
      const ch = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
      const a = fn[4] === undefined ? 1 : Number(fn[4])
      return `#${ch(+fn[1])}${ch(+fn[2])}${ch(+fn[3])}${a >= 1 ? '' : ch(a * 255)}`
    }
    return /^#?[0-9a-f]{6}([0-9a-f]{2})?$/i.test(val) ? `#${val.replace('#', '').toLowerCase()}` : undefined
  }
  if (archTokens) {
    const known = new Set(CATEGORICAL_GROUPS.map(([k]) => k))
    const groups = [
      ...CATEGORICAL_GROUPS.filter(([k]) => archTokens[k]),
      ...Object.keys(archTokens).filter((k) => !known.has(k)).map((k) => [k, k.charAt(0).toUpperCase() + k.slice(1)] as [string, string]),
    ]
    for (const [key, label] of groups) {
      for (const [tok, byMode] of Object.entries(archTokens[key] ?? {})) {
        const base = semKeys.map((m) => archHex(byMode[m])).find(Boolean)
        if (!base) continue
        sem.set(figmaVarName(`${label}/${tok}`), 'COLOR', Object.fromEntries(semKeys.map((m) => [labelOf(m), colorValue(archHex(byMode[m]) ?? base)])))
      }
    }
  }
  if (colors.panelBackground) sem.all('panel-background', 'STRING', String(colors.panelBackground))

  // ── Dimension Primitives ───────────────────────────────────────────────────
  const dims = new Set<number>()
  for (const key of Object.keys(t.dimensions ?? {})) {
    const n = dimensionFromKey(key)
    if (Number.isFinite(n)) dims.add(n)
  }
  const collect = (map: Record<string, string> | undefined, skip?: (k: string) => boolean) => {
    for (const [k, v] of Object.entries(map ?? {})) {
      if (skip?.(k)) continue
      const n = parseDimension(v)
      if (n !== null) dims.add(n)
    }
  }
  const lengthsOf = (f: Loose) => {
    collect(f.spacing); collect(f.padding); collect(f.radius); collect(f.sizes); collect(f.selector)
    collect(f.grid, (k) => k === 'columns'); collect(f.stroke ?? f.borders?.width)
  }
  const pinsOf = (f: Loose) => {
    for (const roles of [f.radiusRoles, f.spacingRoles, f.sizeRoles, f.selectorRoles, f.strokeRoles, f.breakpointRoles]) {
      for (const v of Object.values((roles ?? {}) as Record<string, string>)) { const n = pinnedDimension(v); if (n !== null) dims.add(n) }
    }
  }
  lengthsOf(t); pinsOf(t)
  for (const th of foundationThemes) if (fbt[th]) { lengthsOf(fbt[th]); pinsOf(fbt[th]) }
  for (const th of [undefined, ...foundationThemes]) {
    const px = iconPx(t, th)
    for (const role of ICON_SIZE_NAMES) for (const [vp] of VIEWPORTS) dims.add(px[role][vp])
  }
  for (const st of [...(t.gridStyles ?? []), ...foundationThemes.flatMap((th) => fbt[th]?.gridStyles ?? [])] as Loose[]) {
    for (const n of [st.column, st.gutter, st.margin, st.width, st.sidebar]) if (typeof n === 'number' && Number.isFinite(n) && n > 0) dims.add(n)
  }
  for (const vp of ['tablet', 'mobile'] as const) {
    for (const th of [undefined, ...foundationThemes]) {
      const fr = gridFrame(t, vp, th)
      for (const n of [fr.gutter, fr.margin, fr.container]) if (Number.isFinite(n)) dims.add(Math.round(n * 1000) / 1000)
    }
  }
  const dimPrim = new Collection('Dimension Primitives', [SINGLE_MODE])
  for (const n of [...dims].sort((a, b) => a - b)) dimPrim.all(dimensionKey(n), 'FLOAT', n)
  const counts = new Set<number>()
  for (const th of [undefined, ...foundationThemes]) {
    for (const [vp] of VIEWPORTS) {
      const n = gridFrame(t, vp, th).columns
      if (Number.isFinite(n) && n > 0) counts.add(Math.round(n))
    }
  }
  for (const n of [...counts].sort((a, b) => a - b)) dimPrim.all(`columns/${n}`, 'FLOAT', n)

  // ── Dimension Semantics ────────────────────────────────────────────────────
  const dimSem = new Collection('Dimension Semantics', vps.map(([, label]) => label))
  const dimTheme = [activeThemeKey(tokens), ...foundationThemes].find((k) => k && fbt[k])
  const dimF = dimTheme ? fbt[dimTheme] : undefined
  const pick = (k: string) => (dimF?.[k] ?? t[k]) as Record<string, string> | undefined
  const primAlias = (px: number | null): SnapValue | undefined => {
    if (px === null || !Number.isFinite(px)) return undefined
    return dims.has(px) ? alias('Dimension Primitives', dimensionKey(px)) : px
  }
  const valuePx = (value: string, scale: Record<string, string> | undefined) => pinnedDimension(value) ?? parseDimension(scale?.[value])
  /** A value per viewport; a viewport with none takes the first shipped one's. */
  const writeDim = (name: string, perVp: Partial<Record<Viewport, SnapValue | undefined>>) => {
    const first = perVp[vps[0][0]] ?? perVp.desktop
    if (first === undefined) return false
    dimSem.set(name, 'FLOAT', Object.fromEntries(vps.map(([k, label]) => [label, perVp[k] ?? first])))
    return true
  }
  const same = (v: SnapValue | undefined) => ({ desktop: v, tablet: v, mobile: v })

  const fSpacing = pick('spacing')
  const fRadius = pick('radius')
  const strokeV6 = !!(t.stroke && Object.keys(t.stroke).length)
  const fStroke = (dimF?.stroke ?? (strokeV6 ? t.stroke : t.borders?.width)) as Record<string, string> | undefined
  const strokeName = strokeV6 ? (k: string) => k : (k: string) => `width/${k}`

  {
    const roles = pick('spacingRoles') ?? {}
    const refs = (dimF?.spacingRoleRefs ?? t.spacingRoleRefs ?? {}) as Record<string, string>
    const table = (t.spacingResponsive ?? {}) as Record<string, Record<Viewport, string>>
    for (const [role, desktopStep] of Object.entries(roles)) {
      if (typeof desktopStep !== 'string') continue
      const ref = refs[role] || desktopStep
      const at = (vp: Viewport) => primAlias(valuePx(table[ref]?.[vp] ?? table[ref]?.desktop ?? ref, fSpacing))
      writeDim(`Spacing/role/${role}`, { desktop: at('desktop'), tablet: at('tablet'), mobile: at('mobile') })
    }
  }
  {
    const roles = pick('radiusRoles') ?? {}
    const perVp = (dimF?.radiusRoleViewports ?? t.radiusRoleViewports ?? {}) as Partial<Record<'tablet' | 'mobile', Record<string, string>>>
    const table = (t.radiusResponsive ?? {}) as Record<string, Partial<Record<Viewport, string>>>
    const tokenVar = new Set<string>()
    for (const [step, row] of Object.entries(table)) {
      const at = (vp: Viewport) => primAlias(valuePx(row?.[vp] ?? row?.desktop ?? step, fRadius))
      if (writeDim(`Radius/component/${step}`, { desktop: at('desktop'), tablet: at('tablet'), mobile: at('mobile') })) tokenVar.add(step)
    }
    for (const [role, desktopStep] of Object.entries(roles)) {
      if (typeof desktopStep !== 'string') continue
      const at = (vp: Viewport): SnapValue | undefined => {
        const override = vp === 'desktop' ? undefined : perVp[vp]?.[role]
        if (override === undefined && tokenVar.has(desktopStep)) return alias('Dimension Semantics', `Radius/component/${desktopStep}`)
        const step = override ?? (vp === 'desktop' ? desktopStep : (table[desktopStep]?.[vp] ?? desktopStep))
        return primAlias(valuePx(step, fRadius))
      }
      writeDim(`Radius/role/${role}`, { desktop: at('desktop'), tablet: at('tablet'), mobile: at('mobile') })
    }
  }
  const emitRoles = (group: string, roles: Record<string, string> | undefined, scale: Record<string, string> | undefined, stepName: (s: string) => string = (s) => s) => {
    for (const [role, step] of Object.entries(roles ?? {})) {
      if (typeof step !== 'string' || !step) continue
      const px = pinnedDimension(step) ?? parseDimension(scale?.[stepName(step)])
      if (px !== null && dims.has(px)) writeDim(`${group}/role/${role}`, same(alias('Dimension Primitives', dimensionKey(px))))
    }
  }
  emitRoles('Stroke', pick('strokeRoles'), fStroke, strokeName)
  emitRoles('Size', pick('sizeRoles'), pick('sizes'))
  emitRoles('Selector', pick('selectorRoles'), pick('selector'))
  {
    const px = iconPx(t, dimTheme)
    for (const role of ICON_SIZE_NAMES) {
      writeDim(`Icon/role/${role}`, { desktop: primAlias(px[role].desktop), tablet: primAlias(px[role].tablet), mobile: primAlias(px[role].mobile) })
    }
  }
  if (t.grid) {
    const frames = { desktop: gridFrame(t, 'desktop', dimTheme), tablet: gridFrame(t, 'tablet', dimTheme), mobile: gridFrame(t, 'mobile', dimTheme) }
    const lengthValue = (raw: number | undefined, count = false): SnapValue | undefined => {
      if (raw === undefined || !Number.isFinite(raw)) return undefined
      if (count) { const n = Math.round(raw); return counts.has(n) ? alias('Dimension Primitives', `columns/${n}`) : n }
      return primAlias(parseDimension(raw))
    }
    for (const k of ['columns', 'gutter', 'margin', 'container'] as const) {
      const per = (vp: Viewport) => lengthValue(frames[vp][k], k === 'columns')
      writeDim(`Grid/${k}`, { desktop: per('desktop'), tablet: per('tablet'), mobile: per('mobile') })
    }
    const styles = (dimF?.gridStyles ?? t.gridStyles ?? []) as Loose[]
    const styleKey: Record<Viewport, string> = { desktop: 'xl-desktop', tablet: 'md-tablet', mobile: 'sm-mobile' }
    const colOf = (vp: Viewport) => {
      const st = styles.find((x) => x.key === styleKey[vp])
      return st ? primAlias(parseDimension(`${st.column}px`)) : undefined
    }
    writeDim('Grid/column', { desktop: colOf('desktop'), tablet: colOf('tablet'), mobile: colOf('mobile') })
  }

  // ── Typography ─────────────────────────────────────────────────────────────
  const typo = new Collection('Typography', vps.map(([, label]) => label))
  const typoTheme = [activeThemeKey(tokens), ...foundationThemes].find((k) => k && fbt[k]?.typography)
  const tf = (typoTheme ? fbt[typoTheme]?.typography : undefined) as Loose | undefined
  const ty = t.typography as Loose
  for (const [k, v] of Object.entries((tf?.sizes ?? ty.sizes ?? {}) as Record<string, string>)) typo.all(`size/${k}`, 'FLOAT', pxToFloat(v))
  for (const [k, v] of Object.entries((tf?.weights ?? ty.weights ?? {}) as Record<string, number>)) typo.all(`weight/${k}`, 'FLOAT', Number(v))
  for (const [k, v] of Object.entries((tf?.lineHeights ?? ty.lineHeights ?? {}) as Record<string, string>)) typo.all(`line-height/${k}`, 'FLOAT', pxToFloat(v))
  for (const [k, v] of Object.entries((tf?.letterSpacings ?? ty.letterSpacings ?? {}) as Record<string, string>)) typo.all(`letter-spacing/${k}`, 'FLOAT', pxToFloat(v))
  typo.all(FAMILY_BODY, 'STRING', normalizeFontFamilyName(tf?.fontFamily ?? ty.fontFamily))
  typo.all(FAMILY_DISPLAY, 'STRING', normalizeFontFamilyName(tf?.headingFontFamily ?? tf?.fontFamily ?? ty.headingFontFamily ?? ty.fontFamily))
  const roles = (tf?.roles ?? ty.roles) as Record<string, Partial<Record<Viewport, { family?: string; size?: string; weight?: string }>>> | undefined
  if (roles) {
    const typoAlias = (name: string | undefined): SnapValue | undefined => (name && typo.vars.has(name) ? alias('Typography', name) : undefined)
    const writeRole = (name: string, type: SnapVariable['type'], at: (vp: Viewport) => SnapValue | undefined) => {
      const vals = vps.map(([vp, label]) => [label, at(vp)] as const)
      const first = vals.find(([, v]) => v !== undefined)?.[1]
      if (first === undefined) return
      typo.set(name, type, Object.fromEntries(vals.map(([label, v]) => [label, v ?? first])))
    }
    for (const [key, modes] of Object.entries(roles)) {
      const cut = (vp: Viewport) => modes?.[vp] ?? modes?.desktop
      writeRole(`role/${key}/size`, 'FLOAT', (vp) => typoAlias(cut(vp)?.size ? `size/${cut(vp)!.size}` : undefined))
      writeRole(`role/${key}/weight`, 'FLOAT', (vp) => typoAlias(cut(vp)?.weight ? `weight/${cut(vp)!.weight}` : undefined))
      writeRole(`role/${key}/line-height`, 'FLOAT', (vp) => typoAlias(cut(vp)?.size ? `line-height/${cut(vp)!.size}` : undefined))
      writeRole(`role/${key}/letter-spacing`, 'FLOAT', (vp) => typoAlias(cut(vp)?.size ? `letter-spacing/${cut(vp)!.size}` : undefined))
      writeRole(`role/${key}/family`, 'STRING', (vp) => {
        const fam = cut(vp)?.family
        return fam ? typoAlias(fam === 'display' ? FAMILY_DISPLAY : FAMILY_BODY) : undefined
      })
    }
  }

  return { collections: [prim, sem, dimPrim, dimSem, typo].map((c) => c.done()) }
}
