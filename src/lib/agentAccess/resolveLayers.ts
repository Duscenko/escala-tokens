/** Roles, responsive tokens, icons, type and grid styles on a published payload.
 *  Reads only what the Blob shipped — never a catalogue default — so an old
 *  publish comes back unknown instead of a value the system does not contain. */

import { dimensionKey, parseDimension } from '../dimensionCore.js'
import type {
  GridStyleJSON,
  IconSizeBlock,
  RadiusRoleViewportsJSON,
  TokenJSON,
} from '../agentBundle/types.js'
import type { ResolvedToken } from './resolveToken.js'

const COLOR_GROUPS = ['action', 'content', 'surface', 'status', 'border'] as const
const VIEWPORTS = ['desktop', 'tablet', 'mobile'] as const
type Viewport = (typeof VIEWPORTS)[number]
type Facet = 'size' | 'weight' | 'family' | 'leading'

const FIGMA_GROUP: Record<string, string> = {
  Radius: 'radius',
  Spacing: 'spacing',
  Size: 'size',
  Selector: 'selector',
  Stroke: 'stroke',
  Icon: 'icon',
  Type: 'type',
  Typography: 'type',
  Grid: 'grid',
}

/** Figma slashes and CSS variables → the dotted id `resolveToken` looks up.
 *  Returns null for spellings the existing normalizer already handles
 *  (`Action/primary/default`, `accent-6`, `radius.lg`). */
export function canonicalTokenId(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.includes('/')) return fromFigma(trimmed)
  const wrapped = /^var\(--(.+)\)$/i.exec(trimmed)
  const bare = wrapped?.[1] ?? (trimmed.startsWith('--') ? trimmed.slice(2) : null)
  return bare ? fromCss(bare) : null
}

function fromFigma(s: string): string | null {
  const parts = s.split('/').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return null
  const head = parts[0] ?? ''
  const group = FIGMA_GROUP[head]
  if (!group) return null

  if (parts[1] === 'role' && parts[2]) {
    if (head === 'Grid') return `breakpoint.${parts.slice(2).join('.')}`
    if (head === 'Icon') return `icon.${parts.slice(2).join('.')}`
    if (head === 'Type' || head === 'Typography') {
      const role = parts[2]
      const facet = parts[3] ? facetName(parts[3]) : ''
      return facet ? `type.${role}.${facet}` : `type.${role}`
    }
    return `${group}.${parts.slice(2).join('.')}`
  }
  if (head === 'Icon' && parts[1] === 'size' && parts[2]) return `icon.size.${parts[2]}`
  if (head === 'Radius' && parts[1] === 'component' && parts[2]) return `radius.component-${parts[2]}`
  if (head === 'Spacing' && parts[2] && ['component', 'section', 'layout'].includes(parts[1] ?? '')) {
    return `spacing.${parts[1]}-${parts[2]}`
  }
  if ((head === 'Type' || head === 'Typography') && parts[1] === 'size' && parts[2]) return `font-size.${parts[2]}`
  if ((head === 'Type' || head === 'Typography') && parts.length === 2) {
    const named = /^(.+?)(?:\s*\((tablet|mobile)\))?$/i.exec(parts[1] ?? '')
    if (!named) return null
    const role = named[1]?.trim()
    if (!role || role === 'size') return null
    return named[2] ? `type.${role}.${named[2].toLowerCase()}` : `type.${role}`
  }
  if (
    head === 'Grid'
    && parts[1]
    && !['columns', 'gutter', 'margin', 'container'].includes(parts[1])
    && !parts[1].startsWith('breakpoint')
  ) {
    return `grid.${parts.slice(1).join(' ').toLowerCase().replace(/\s+/g, '-')}`
  }
  return null
}

function facetName(raw: string): string {
  if (raw === 'font-size' || raw === 'size') return 'size'
  if (raw === 'font-weight' || raw === 'weight') return 'weight'
  if (raw === 'font-family' || raw === 'family') return 'family'
  if (raw === 'line-height' || raw === 'leading') return 'leading'
  return ''
}

function fromCss(bare: string): string | null {
  if (bare.startsWith('color-')) {
    const rest = bare.slice('color-'.length)
    for (const g of COLOR_GROUPS) {
      if (rest === g || rest.startsWith(`${g}-`)) {
        const tail = rest.slice(g.length).replace(/^-/, '').replace(/-/g, '.')
        return tail ? `${g}.${tail}` : g
      }
    }
    return rest
  }
  const text = /^text-(.+)-(font-size|font-weight|font-family|line-height)(?:-(tablet|mobile))?$/.exec(bare)
  if (text) {
    const facet = facetName(text[2] ?? '')
    const vp = text[3]
    return `type.${text[1]}.${facet}${vp ? `.${vp}` : ''}`
  }
  if (bare.startsWith('font-size-')) return `font-size.${bare.slice('font-size-'.length)}`
  if (bare.startsWith('font-weight-')) return `font-weight.${bare.slice('font-weight-'.length)}`
  if (bare.startsWith('line-height-')) return `line-height.${bare.slice('line-height-'.length)}`
  if (bare.startsWith('font-family-')) return `font-family.${bare.slice('font-family-'.length)}`
  if (bare.startsWith('icon-size-')) return `icon.size.${bare.slice('icon-size-'.length)}`
  if (bare.startsWith('icon-')) return `icon.${bare.slice('icon-'.length)}`
  if (bare.startsWith('breakpoint-')) return `breakpoint.${bare.slice('breakpoint-'.length)}`
  if (bare.startsWith('radius-component-')) return `radius.component-${bare.slice('radius-component-'.length)}`
  const fam = /^(radius|spacing|size|selector|stroke|shadow|grid)-(.+)$/.exec(bare)
  return fam ? `${fam[1]}.${fam[2]}` : null
}

interface ThemeBag {
  theme: string
  spacing: Record<string, string>
  spacingRoles?: Record<string, string>
  spacingRoleRefs?: Record<string, string>
  radius: Record<string, string>
  radiusRoles?: Record<string, string>
  radiusRoleViewports?: RadiusRoleViewportsJSON
  sizes: Record<string, string>
  sizeRoles?: Record<string, string>
  selector: Record<string, string>
  selectorRoles?: Record<string, string>
  stroke: Record<string, string>
  strokeRoles?: Record<string, string>
  grid: Record<string, string>
  breakpointRoles?: Record<string, string>
  typography: TokenJSON['typography']
  iconSizes?: IconSizeBlock
  gridStyles?: GridStyleJSON[]
}

function bagsOf(json: TokenJSON): ThemeBag[] {
  const themes = json.colors.themeOrder?.length
    ? json.colors.themeOrder
    : Object.keys(json.foundationsByTheme ?? {})
  const one = (theme: string): ThemeBag => {
    const f = json.foundationsByTheme?.[theme]
    return {
      theme,
      spacing: f?.spacing ?? json.spacing ?? {},
      spacingRoles: f?.spacingRoles ?? json.spacingRoles,
      spacingRoleRefs: f?.spacingRoleRefs ?? json.spacingRoleRefs,
      radius: f?.radius ?? json.radius ?? {},
      radiusRoles: f?.radiusRoles ?? json.radiusRoles,
      radiusRoleViewports: f?.radiusRoleViewports ?? json.radiusRoleViewports,
      sizes: f?.sizes ?? json.sizes ?? {},
      sizeRoles: f?.sizeRoles ?? json.sizeRoles,
      selector: f?.selector ?? json.selector ?? {},
      selectorRoles: f?.selectorRoles ?? json.selectorRoles,
      stroke: f?.stroke ?? json.stroke ?? {},
      strokeRoles: f?.strokeRoles ?? json.strokeRoles,
      grid: f?.grid ?? json.grid ?? {},
      breakpointRoles: f?.breakpointRoles ?? json.breakpointRoles,
      typography: f?.typography ?? json.typography,
      iconSizes: f?.iconSizes ?? json.icons?.sizes,
      gridStyles: f?.gridStyles ?? json.gridStyles,
    }
  }
  return (themes.length ? themes : ['default']).map(one)
}

function lengthOf(step: string, scale: Record<string, string> | undefined, dimensions?: Record<string, string>): string | null {
  if (step.startsWith('dimension-')) {
    return dimensions?.[step.slice('dimension-'.length)] ?? null
  }
  const direct = scale?.[step]
  if (direct) return direct
  const n = parseDimension(step)
  return n !== null ? `${n}px` : null
}

/** Figma name of the Dimension primitive a length resolves to (`16`, `3_5`). */
function primitiveKey(px: string | undefined): string {
  const alias = dimensionAlias(px)
  return alias?.startsWith('dimension.') ? alias.slice('dimension.'.length) : ''
}

function primitiveCss(px: string | undefined): string {
  const key = primitiveKey(px)
  return key ? `var(--dimension-${key})` : ''
}

function dimensionAlias(px: string | undefined): string | undefined {
  const n = parseDimension(px)
  return n === null ? undefined : `dimension.${dimensionKey(n)}`
}

function pack(
  rows: Record<string, Record<Viewport, string>>,
  asked: Viewport,
  aliasAt: (theme: string, vp: Viewport) => string | undefined,
): Pick<ResolvedToken, 'values' | 'viewports' | 'aliases'> | null {
  const values: Record<string, string> = {}
  const viewports: Record<string, Record<string, string>> = {}
  const aliases: Record<string, string> = {}
  let steps = false
  for (const [theme, row] of Object.entries(rows)) {
    const value = row[asked]
    if (!value) continue
    values[theme] = value
    if (row.tablet !== row.desktop || row.mobile !== row.desktop) {
      steps = true
      viewports[theme] = { ...row }
    }
    const alias = aliasAt(theme, asked)
    if (alias) aliases[theme] = alias
  }
  if (!Object.keys(values).length) return null
  return {
    values,
    ...(steps ? { viewports } : {}),
    ...(Object.keys(aliases).length ? { aliases } : {}),
  }
}

function hit(
  id: string,
  figma: string,
  css: string,
  packed: Pick<ResolvedToken, 'values' | 'viewports' | 'aliases'>,
  extra?: Partial<ResolvedToken>,
): ResolvedToken {
  return {
    query: id,
    id,
    kind: 'foundation',
    figma,
    css,
    found: true,
    ...packed,
    ...extra,
  }
}

const ROLE_FAMILY: Record<string, { figma: string; css: string; roles: keyof ThemeBag; scale: keyof ThemeBag }> = {
  radius: { figma: 'Radius', css: 'radius', roles: 'radiusRoles', scale: 'radius' },
  size: { figma: 'Size', css: 'size', roles: 'sizeRoles', scale: 'sizes' },
  selector: { figma: 'Selector', css: 'selector', roles: 'selectorRoles', scale: 'selector' },
  stroke: { figma: 'Stroke', css: 'stroke', roles: 'strokeRoles', scale: 'stroke' },
}

function staticRole(json: TokenJSON, family: string, key: string): ResolvedToken | null {
  const meta = ROLE_FAMILY[family]
  if (!meta) return null
  const rows: Record<string, Record<Viewport, string>> = {}
  for (const bag of bagsOf(json)) {
    const roles = bag[meta.roles]
    const step = roles && typeof roles === 'object' && !Array.isArray(roles)
      ? (roles as Record<string, string>)[key]
      : undefined
    if (!step) continue
    const scale = bag[meta.scale] as Record<string, string>
    const px = lengthOf(step, scale, json.dimensions)
    if (!px) continue
    rows[bag.theme] = { desktop: px, tablet: px, mobile: px }
  }
  const packed = pack(rows, 'desktop', () => undefined)
  if (!packed) return null
  // Alias from the px, per theme — same string, so one pass is enough.
  for (const theme of Object.keys(packed.values)) {
    const alias = dimensionAlias(packed.values[theme])
    if (alias) {
      packed.aliases = packed.aliases ?? {}
      packed.aliases[theme] = alias
    }
  }
  return hit(`${family}.${key}`, `${meta.figma}/role/${key}`, `var(--${meta.css}-${key})`, packed)
}

function spacingRole(json: TokenJSON, key: string): ResolvedToken | null {
  const rows: Record<string, Record<Viewport, string>> = {}
  const refs: Record<string, string> = {}
  for (const bag of bagsOf(json)) {
    const ref = bag.spacingRoleRefs?.[key] ?? bag.spacingRoles?.[key]
    if (!ref) continue
    const at = (vp: Viewport) => json.spacingResponsive?.[ref]?.[vp] ?? ref
    const px = (vp: Viewport) => lengthOf(at(vp), bag.spacing, json.dimensions)
    const desktop = px('desktop')
    if (!desktop) continue
    rows[bag.theme] = {
      desktop,
      tablet: px('tablet') ?? desktop,
      mobile: px('mobile') ?? desktop,
    }
    refs[bag.theme] = ref
  }
  const packed = pack(rows, 'desktop', (theme) => dimensionAlias(rows[theme]?.desktop))
  if (!packed) return null
  return hit(`spacing.${key}`, `Spacing/role/${key}`, `var(--spacing-${key})`, packed)
}

function radiusRole(json: TokenJSON, key: string): ResolvedToken | null {
  const rows: Record<string, Record<Viewport, string>> = {}
  for (const bag of bagsOf(json)) {
    const desktopStep = bag.radiusRoles?.[key]
    if (!desktopStep) continue
    const stepAt = (vp: Viewport) => {
      if (vp === 'desktop') return desktopStep
      return bag.radiusRoleViewports?.[vp]?.[key] ?? json.radiusResponsive?.[desktopStep]?.[vp] ?? desktopStep
    }
    const px = (vp: Viewport) => lengthOf(stepAt(vp), bag.radius, json.dimensions)
    const desktop = px('desktop')
    if (!desktop) continue
    rows[bag.theme] = {
      desktop,
      tablet: px('tablet') ?? desktop,
      mobile: px('mobile') ?? desktop,
    }
  }
  const packed = pack(rows, 'desktop', (theme) => dimensionAlias(rows[theme]?.desktop))
  if (!packed) return null
  return hit(`radius.${key}`, `Radius/role/${key}`, `var(--radius-${key})`, packed)
}

function breakpointScale(grid: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(grid)) {
    if (k.startsWith('breakpoint-')) out[k.slice('breakpoint-'.length)] = v
  }
  return out
}

function breakpointRole(json: TokenJSON, key: string): ResolvedToken | null {
  const rows: Record<string, Record<Viewport, string>> = {}
  for (const bag of bagsOf(json)) {
    const step = bag.breakpointRoles?.[key]
    if (!step) continue
    const bare = step.startsWith('breakpoint-') ? step.slice('breakpoint-'.length) : step
    const px = lengthOf(bare, breakpointScale(bag.grid), json.dimensions) ?? lengthOf(step, bag.grid, json.dimensions)
    if (!px) continue
    rows[bag.theme] = { desktop: px, tablet: px, mobile: px }
  }
  const packed = pack(rows, 'desktop', (theme) => dimensionAlias(rows[theme]?.desktop))
  if (!packed) return null
  const sample = Object.values(rows)[0]?.desktop
  return hit(`breakpoint.${key}`, primitiveKey(sample), `var(--breakpoint-${key})`, packed)
}

function spacingToken(json: TokenJSON, key: string): ResolvedToken | null {
  const table = json.spacingResponsive?.[key]
  if (!table) return null
  const rows: Record<string, Record<Viewport, string>> = {}
  for (const bag of bagsOf(json)) {
    const px = (vp: Viewport) => {
      const step = table[vp] ?? table.desktop
      return step ? lengthOf(step, bag.spacing, json.dimensions) : null
    }
    const desktop = px('desktop')
    if (!desktop) continue
    rows[bag.theme] = { desktop, tablet: px('tablet') ?? desktop, mobile: px('mobile') ?? desktop }
  }
  const packed = pack(rows, 'desktop', (theme) => dimensionAlias(rows[theme]?.desktop))
  if (!packed) return null
  const sample = Object.values(rows)[0]?.desktop
  return hit(`spacing.${key}`, primitiveKey(sample), primitiveCss(sample), packed)
}

function radiusToken(json: TokenJSON, step: string): ResolvedToken | null {
  const table = json.radiusResponsive?.[step]
  if (!table) return null
  const rows: Record<string, Record<Viewport, string>> = {}
  for (const bag of bagsOf(json)) {
    const px = (vp: Viewport) => {
      const s = table[vp] ?? table.desktop ?? step
      return lengthOf(s, bag.radius, json.dimensions)
    }
    const desktop = px('desktop')
    if (!desktop) continue
    rows[bag.theme] = { desktop, tablet: px('tablet') ?? desktop, mobile: px('mobile') ?? desktop }
  }
  const packed = pack(rows, 'desktop', (theme) => dimensionAlias(rows[theme]?.desktop))
  if (!packed) return null
  const sample = Object.values(rows)[0]?.desktop
  return hit(`radius.component-${step}`, primitiveKey(sample), primitiveCss(sample), packed)
}

function iconSize(json: TokenJSON, step: string): ResolvedToken | null {
  const rows: Record<string, Record<Viewport, string>> = {}
  for (const bag of bagsOf(json)) {
    const px = bag.iconSizes?.scale?.[step]
    if (!px) continue
    rows[bag.theme] = { desktop: px, tablet: px, mobile: px }
  }
  const packed = pack(rows, 'desktop', (theme) => dimensionAlias(rows[theme]?.desktop))
  if (!packed) return null
  const sample = Object.values(rows)[0]?.desktop
  return hit(`icon.size.${step}`, primitiveKey(sample), `var(--icon-size-${step})`, packed)
}

function iconRole(json: TokenJSON, role: string): ResolvedToken | null {
  const rows: Record<string, Record<Viewport, string>> = {}
  for (const bag of bagsOf(json)) {
    const step = bag.iconSizes?.roles?.[role]
    const px = step ? bag.iconSizes?.scale?.[step] : undefined
    if (!step || !px) continue
    rows[bag.theme] = { desktop: px, tablet: px, mobile: px }
  }
  const packed = pack(rows, 'desktop', (theme) => dimensionAlias(rows[theme]?.desktop))
  if (!packed) return null
  return hit(`icon.${role}`, `Icon/role/${role}`, `var(--icon-${role})`, packed)
}

interface TypeAlias {
  family?: string
  size?: string
  weight?: string
}

function parseTypeQuery(id: string): { role: string; facet: Facet; viewport: Viewport } | null {
  if (!id.startsWith('type.')) return null
  const bits = id.slice('type.'.length).split('.')
  let viewport: Viewport = 'desktop'
  let facet: Facet = 'size'
  const last = bits[bits.length - 1]
  if (last && (VIEWPORTS as readonly string[]).includes(last)) {
    viewport = bits.pop() as Viewport
  }
  const facetBit = bits[bits.length - 1]
  if (facetBit && ['size', 'weight', 'family', 'leading'].includes(facetBit)) {
    facet = bits.pop() as Facet
  }
  const role = bits.join('.')
  return role ? { role, facet, viewport } : null
}

function aliasAt(modes: Record<string, TypeAlias> | undefined, role: string, vp: Viewport): TypeAlias | undefined {
  const row = modes?.[role] as { desktop?: TypeAlias; tablet?: TypeAlias; mobile?: TypeAlias } | undefined
  if (!row) return undefined
  return row[vp] ?? row.desktop
}

function typeValue(typo: TokenJSON['typography'], alias: TypeAlias, facet: Facet): string | null {
  if (facet === 'size') {
    const size = alias.size
    return size ? typo.sizes?.[size] ?? null : null
  }
  if (facet === 'weight') {
    const weight = alias.weight
    const n = weight ? typo.weights?.[weight] : undefined
    return n === undefined ? null : String(n)
  }
  if (facet === 'family') {
    if (alias.family === 'display') return typo.headingFontFamily ?? typo.fontFamily ?? null
    if (alias.family === 'body') return typo.fontFamily ?? null
    return null
  }
  const size = alias.size
  return size ? typo.lineHeights?.[size] ?? null : null
}

function typeAliasName(alias: TypeAlias, facet: Facet): string | undefined {
  if (facet === 'size' && alias.size) return `font-size.${alias.size}`
  if (facet === 'weight' && alias.weight) return `font-weight.${alias.weight}`
  if (facet === 'family' && alias.family) return `font-family.${alias.family === 'display' ? 'heading' : 'body'}`
  if (facet === 'leading' && alias.size) return `line-height.${alias.size}`
  return undefined
}

function typeCss(role: string, facet: Facet, vp: Viewport): string {
  const suffix = facet === 'size' ? 'font-size' : facet === 'weight' ? 'font-weight' : facet === 'family' ? 'font-family' : 'line-height'
  const base = `--text-${role}-${suffix}`
  return `var(${vp === 'desktop' ? base : `${base}-${vp}`})`
}

function typeFigma(role: string, vp: Viewport): string {
  const suffix = vp === 'tablet' ? ' (Tablet)' : vp === 'mobile' ? ' (Mobile)' : ''
  return `Type/${role}${suffix}`
}

function typeRole(json: TokenJSON, id: string): ResolvedToken | null {
  const parsed = parseTypeQuery(id)
  if (!parsed) return null
  const { role, facet, viewport } = parsed
  const rows: Record<string, Record<Viewport, string>> = {}
  const aliasByTheme: Record<string, Record<Viewport, string | undefined>> = {}
  let any = false
  for (const bag of bagsOf(json)) {
    const modes = bag.typography?.roles as Record<string, TypeAlias> | undefined
    const row = {} as Record<Viewport, string>
    const aliases = {} as Record<Viewport, string | undefined>
    for (const vp of VIEWPORTS) {
      const alias = aliasAt(modes, role, vp)
      const value = alias ? typeValue(bag.typography, alias, facet) : null
      if (!value) continue
      row[vp] = value
      aliases[vp] = typeAliasName(alias!, facet)
      any = true
    }
    if (!row.desktop && !row[viewport]) continue
    const desktop = row.desktop ?? row[viewport]
    rows[bag.theme] = {
      desktop: row.desktop ?? desktop,
      tablet: row.tablet ?? row.desktop ?? desktop,
      mobile: row.mobile ?? row.desktop ?? desktop,
    }
    aliasByTheme[bag.theme] = aliases
  }
  if (!any) return null
  const packed = pack(rows, viewport, (theme, vp) => aliasByTheme[theme]?.[vp])
  if (!packed) return null
  const canonical = `type.${role}`
  return hit(canonical, typeFigma(role, viewport), typeCss(role, facet, viewport), packed)
}

function fontPrimitive(json: TokenJSON, id: string): ResolvedToken | null {
  const kind = id.startsWith('font-size.') ? 'size'
    : id.startsWith('font-weight.') ? 'weight'
    : id.startsWith('line-height.') ? 'leading'
    : id.startsWith('font-family.') ? 'family'
    : null
  if (!kind) return null
  const key = id.slice(id.indexOf('.') + 1)
  const rows: Record<string, Record<Viewport, string>> = {}
  for (const bag of bagsOf(json)) {
    const typo = bag.typography
    let value: string | null = null
    if (kind === 'size') value = typo?.sizes?.[key] ?? null
    else if (kind === 'leading') value = typo?.lineHeights?.[key] ?? null
    else if (kind === 'weight') {
      const n = typo?.weights?.[key]
      value = n === undefined ? null : String(n)
    } else if (key === 'heading') value = typo?.headingFontFamily ?? typo?.fontFamily ?? null
    else if (key === 'body') value = typo?.fontFamily ?? null
    if (!value) continue
    rows[bag.theme] = { desktop: value, tablet: value, mobile: value }
  }
  const packed = pack(rows, 'desktop', () => undefined)
  if (!packed) return null
  const cssName = kind === 'size' ? 'font-size' : kind === 'weight' ? 'font-weight' : kind === 'leading' ? 'line-height' : 'font-family'
  const figma = kind === 'family' ? `Type/family/${key}` : `Type/${kind === 'leading' ? 'line-height' : kind}/${key}`
  return hit(id, figma, `var(--${cssName}-${key})`, packed)
}

function gridStyle(json: TokenJSON, id: string): ResolvedToken | null {
  const tail = id.slice('grid.'.length)
  const values: Record<string, string> = {}
  const spec: Record<string, Record<string, string>> = {}
  let label = ''
  for (const bag of bagsOf(json)) {
    const style = bag.gridStyles?.find((s) => s.key === tail || (s.label ?? '').toLowerCase().replace(/\s+/g, '-') === tail)
    if (!style || style.width === undefined) continue
    label = style.label || style.key
    values[bag.theme] = `${style.width}px`
    spec[bag.theme] = {
      ...(style.viewport ? { viewport: style.viewport } : {}),
      ...(style.columns !== undefined ? { columns: String(style.columns) } : {}),
      ...(style.column !== undefined ? { column: `${style.column}px` } : {}),
      ...(style.gutter !== undefined ? { gutter: `${style.gutter}px` } : {}),
      ...(style.margin !== undefined ? { margin: `${style.margin}px` } : {}),
      width: `${style.width}px`,
      ...(style.sidebar !== undefined ? { sidebar: `${style.sidebar}px` } : {}),
    }
  }
  if (!Object.keys(values).length) return null
  return {
    query: id,
    id: `grid.${tail}`,
    kind: 'foundation',
    figma: `Grid/${label}`,
    css: '',
    values,
    spec,
    found: true,
  }
}

/** Layers the step resolver does not own: roles, responsive tokens, icons, type, grid styles. */
export function resolveLayer(json: TokenJSON, id: string): ResolvedToken | null {
  const type = typeRole(json, id)
  if (type) return type
  const font = fontPrimitive(json, id)
  if (font) return font

  if (id.startsWith('icon.size.')) return iconSize(json, id.slice('icon.size.'.length))
  if (id.startsWith('icon.')) return iconRole(json, id.slice('icon.'.length))

  if (id.startsWith('radius.component-')) return radiusToken(json, id.slice('radius.component-'.length))
  if (id.startsWith('breakpoint.')) return breakpointRole(json, id.slice('breakpoint.'.length))

  const dot = id.indexOf('.')
  if (dot <= 0) return null
  const family = id.slice(0, dot)
  const key = id.slice(dot + 1)
  if (!key || key.includes('.')) return null

  if (family === 'spacing') {
    return spacingToken(json, key) ?? spacingRole(json, key)
  }
  if (family === 'radius') return radiusRole(json, key)
  if (family === 'grid') return gridStyle(json, id)
  if (ROLE_FAMILY[family]) return staticRole(json, family, key)
  return null
}
