// Platform axis — web · ios · android.
//
// The second, OPTIONAL axis of a system. Viewport (desktop · tablet · mobile)
// answers "how wide is the window"; Platform answers "which operating system
// renders the product". They never combine into one mode set: Figma gets a
// `Platform` collection beside `Typography` / `Dimension Semantics`, and the
// two cross by alias (see PLAN-platform-axis.md in the plugin repo).
//
// Which roles follow which axis — one owner per value, never both:
//   display · heading groups  → Viewport (they grow with the window)
//   body · control groups     → Platform (reading size is an OS trait:
//                               17pt semibold on iOS, 14sp medium on Android)
//
// Web is never stored here: the root foundations ARE the web platform. The
// store only holds native overrides, so `platform.*.web === root` holds by
// construction, and a web-only system (`shipped` = ['web']) emits nothing new.
//
// Pure: no store, no DOM. The store seeds it with `mergePlatformAxis` and
// `generateTokenJSON` emits it through `platformPayload`.

import { TYPE_ROLE_BY_KEY, type TypeAlias, type TypeRoleGroupId, type TypeRoleModes, type TypeViewport } from './typeRoles'
import { SIZE_STEPS, roleDimensionPx } from './layoutTokens'

export const PLATFORMS = ['web', 'ios', 'android'] as const
export type Platform = (typeof PLATFORMS)[number]

export const NATIVE_PLATFORMS = ['ios', 'android'] as const
export type NativePlatform = (typeof NATIVE_PLATFORMS)[number]

export const PLATFORM_LABELS: Record<Platform, string> = { web: 'Web', ios: 'iOS', android: 'Android' }

/** The OS typefaces a native target renders by default. The root family is
 *  the fallback when a Figma workspace lacks them (the plugin already warns). */
export const PLATFORM_FONT_DEFAULTS: Record<NativePlatform, string> = { ios: 'SF Pro', android: 'Roboto' }

/** Minimum touch target per OS: HIG 44pt, Material 48dp. 44 is not a Size
 *  step, so iOS pins a Dimension primitive — the same `dimension-N` form every
 *  role map already accepts. Android's 48 is the `lg` step. */
export const PLATFORM_TOUCH_DEFAULTS: Record<NativePlatform, string> = { ios: 'dimension-44', android: 'lg' }

/** The type-role groups whose cut follows Platform instead of Viewport. */
export const PLATFORM_ROLE_GROUPS: readonly TypeRoleGroupId[] = ['body', 'control']

export interface PlatformAxis {
  /** Canonical order, `web` always present. `['web']` = no platform axis. */
  shipped: Platform[]
  /** Body family per native platform; absent ⇒ PLATFORM_FONT_DEFAULTS. */
  fontFamily: Partial<Record<NativePlatform, string>>
  /** Display family per native platform; absent ⇒ that platform's body family. */
  headingFontFamily: Partial<Record<NativePlatform, string>>
  /** Native cut of a body/control role; a role (or platform) absent follows
   *  its viewport cut. Keys outside PLATFORM_ROLE_GROUPS are dropped. */
  typeRoles: Record<string, Partial<Record<NativePlatform, TypeAlias>>>
  /** Size step or `dimension-N`; absent ⇒ PLATFORM_TOUCH_DEFAULTS. */
  touchTarget: Partial<Record<NativePlatform, string>>
  /** Radius role → step / `dimension-N`; a role absent follows the root. */
  radiusRoles: Partial<Record<NativePlatform, Record<string, string>>>
}

export function defaultPlatformAxis(): PlatformAxis {
  return { shipped: ['web'], fontFamily: {}, headingFontFamily: {}, typeRoles: {}, touchTarget: {}, radiusRoles: {} }
}

export function isPlatform(v: unknown): v is Platform {
  return typeof v === 'string' && (PLATFORMS as readonly string[]).includes(v)
}

export function isNativePlatform(v: unknown): v is NativePlatform {
  return typeof v === 'string' && (NATIVE_PLATFORMS as readonly string[]).includes(v)
}

/** Canonical order, de-duplicated, `web` always first. */
export function normalizePlatforms(list?: readonly unknown[] | null): Platform[] {
  const set = new Set<Platform>(['web'])
  for (const p of list ?? []) if (isPlatform(p)) set.add(p)
  return PLATFORMS.filter((p) => set.has(p))
}

export function roleFollowsPlatform(key: string): boolean {
  const spec = TYPE_ROLE_BY_KEY[key]
  return !!spec && PLATFORM_ROLE_GROUPS.includes(spec.group)
}

function isAlias(v: unknown): v is TypeAlias {
  if (!v || typeof v !== 'object') return false
  const a = v as TypeAlias
  return (a.family === 'display' || a.family === 'body') && typeof a.size === 'string' && typeof a.weight === 'string'
}

function isSizeStepOrPin(v: unknown): v is string {
  return typeof v === 'string' && ((SIZE_STEPS as readonly string[]).includes(v) || roleDimensionPx(v) !== null)
}

function nativeMap<T>(bag: unknown, keep: (v: unknown) => v is T): Partial<Record<NativePlatform, T>> {
  const out: Partial<Record<NativePlatform, T>> = {}
  if (!bag || typeof bag !== 'object') return out
  for (const p of NATIVE_PLATFORMS) {
    const hit = (bag as Record<string, unknown>)[p]
    if (keep(hit)) out[p] = hit
  }
  return out
}

const isString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const isStringMap = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === 'object' && Object.values(v as object).every((x) => typeof x === 'string')

/** Seed or repair a stored axis. Unknown platforms, malformed aliases and
 *  roles outside body/control are dropped; nothing else is invented, so a
 *  stored `{}` and an absent field both read as a web-only system. */
export function mergePlatformAxis(stored?: unknown): PlatformAxis {
  const bag = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>
  const typeRoles: PlatformAxis['typeRoles'] = {}
  if (bag.typeRoles && typeof bag.typeRoles === 'object') {
    for (const [key, cuts] of Object.entries(bag.typeRoles as Record<string, unknown>)) {
      if (!roleFollowsPlatform(key)) continue
      const m = nativeMap(cuts, isAlias)
      if (Object.keys(m).length) typeRoles[key] = m
    }
  }
  return {
    shipped: normalizePlatforms(Array.isArray(bag.shipped) ? bag.shipped : null),
    fontFamily: nativeMap(bag.fontFamily, isString),
    headingFontFamily: nativeMap(bag.headingFontFamily, isString),
    typeRoles,
    touchTarget: nativeMap(bag.touchTarget, isSizeStepOrPin),
    radiusRoles: nativeMap(bag.radiusRoles, isStringMap),
  }
}

export function shipsNative(axis: Pick<PlatformAxis, 'shipped'>): boolean {
  return axis.shipped.some((p) => p !== 'web')
}

/** Body family a platform renders. Web is the root family. */
export function fontFamilyFor(axis: PlatformAxis, platform: Platform, rootFamily: string): string {
  if (platform === 'web') return rootFamily
  return axis.fontFamily[platform] ?? PLATFORM_FONT_DEFAULTS[platform]
}

export function headingFontFamilyFor(axis: PlatformAxis, platform: Platform, rootHeading: string, rootFamily: string): string {
  if (platform === 'web') return rootHeading
  return axis.headingFontFamily[platform] ?? fontFamilyFor(axis, platform, rootFamily)
}

export function touchTargetFor(axis: PlatformAxis, platform: Platform, rootTouch: string): string {
  if (platform === 'web') return rootTouch
  return axis.touchTarget[platform] ?? PLATFORM_TOUCH_DEFAULTS[platform]
}

/** The alias a role resolves to on a platform at a viewport. Display and
 *  heading roles ignore the platform; body and control roles take their
 *  native cut when one is stored, else the viewport cut. */
export function typeAliasFor(
  roles: Record<string, TypeRoleModes>,
  axis: PlatformAxis,
  key: string,
  platform: Platform,
  viewport: TypeViewport,
): TypeAlias | undefined {
  const modes = roles[key]
  if (!modes) return undefined
  if (platform !== 'web' && roleFollowsPlatform(key)) {
    const native = axis.typeRoles[key]?.[platform]
    if (native) return native
  }
  return modes[viewport]
}

export interface PlatformPayload {
  platforms: Platform[]
  platform: {
    fontFamily: Record<Platform, string>
    headingFontFamily: Record<Platform, string>
    typeRoles: Record<string, Partial<Record<Platform, TypeAlias>>>
    touchTarget: Record<Platform, string>
    radiusRoles: Partial<Record<Platform, Record<string, string>>>
  }
}

/** The additive `platforms` + `platform` keys of tokens.json, or nothing at
 *  all for a web-only system — so that payload is byte-identical to before
 *  this axis existed. Every `web` entry mirrors the root value. */
export function platformPayload(
  axis: PlatformAxis | undefined,
  root: {
    typography: { fontFamily: string; headingFontFamily?: string; roles: Record<string, TypeRoleModes> }
    sizeRoles: Record<string, string>
  },
): Partial<PlatformPayload> {
  if (!axis || !shipsNative(axis)) return {}
  const shipped = axis.shipped
  const rootFamily = root.typography.fontFamily
  const rootHeading = root.typography.headingFontFamily ?? rootFamily
  const rootTouch = root.sizeRoles.touch ?? 'lg'
  const per = <T>(f: (p: Platform) => T) => Object.fromEntries(shipped.map((p) => [p, f(p)])) as Record<Platform, T>

  const typeRoles: PlatformPayload['platform']['typeRoles'] = {}
  for (const [key, cuts] of Object.entries(axis.typeRoles)) {
    const modes = root.typography.roles[key]
    if (!modes) continue
    const entry: Partial<Record<Platform, TypeAlias>> = { web: { ...modes.desktop } }
    for (const p of shipped) if (p !== 'web' && cuts[p]) entry[p] = { ...cuts[p] as TypeAlias }
    if (Object.keys(entry).length > 1) typeRoles[key] = entry
  }

  const radiusRoles: PlatformPayload['platform']['radiusRoles'] = {}
  for (const p of shipped) {
    if (p === 'web') continue
    const own = axis.radiusRoles[p]
    if (own && Object.keys(own).length) radiusRoles[p] = { ...own }
  }

  return {
    platforms: [...shipped],
    platform: {
      fontFamily: per((p) => fontFamilyFor(axis, p, rootFamily)),
      headingFontFamily: per((p) => headingFontFamilyFor(axis, p, rootHeading, rootFamily)),
      typeRoles,
      touchTarget: per((p) => touchTargetFor(axis, p, rootTouch)),
      radiusRoles,
    },
  }
}

/** OS families the browser serves itself; never request them from Google. */
export function isSystemFontFamily(family: string): boolean {
  return /^(sf pro|san francisco|-apple-system|system-ui)/i.test(family.trim())
}

/** The typography a platform renders: its family behind `fontFamily` /
 *  `headingFontFamily`, and every viewport cut of a body/control role replaced
 *  by that role's native cut when one is stored. Web returns the input as is.
 *  Viewport-aware consumers (`typeStyleOf`, the Type table) then show the OS
 *  cut at every width, which is what the Figma alias does. */
export function typographyForPlatform<T extends { fontFamily: string; headingFontFamily?: string; roles: Record<string, TypeRoleModes> }>(
  typography: T,
  axis: PlatformAxis | undefined,
  platform: Platform,
): T {
  if (platform === 'web' || !axis) return typography
  const roles: Record<string, TypeRoleModes> = { ...typography.roles }
  for (const [key, cuts] of Object.entries(axis.typeRoles)) {
    const native = cuts[platform]
    if (!native || !roles[key] || !roleFollowsPlatform(key)) continue
    roles[key] = { desktop: { ...native }, tablet: { ...native }, mobile: { ...native } }
  }
  const fontFamily = fontFamilyFor(axis, platform, typography.fontFamily)
  return {
    ...typography,
    fontFamily,
    headingFontFamily: headingFontFamilyFor(axis, platform, typography.headingFontFamily ?? typography.fontFamily, typography.fontFamily),
    roles,
  }
}

/** The size and radius roles a platform renders: `touch` and any radius role
 *  with a native override. Web returns the inputs as they are. */
export function layoutForPlatform(
  axis: PlatformAxis | undefined,
  platform: Platform,
  roles: { sizeRoles: Record<string, string>; radiusRoles: Record<string, string> },
): { sizeRoles: Record<string, string>; radiusRoles: Record<string, string> } {
  if (platform === 'web' || !axis) return roles
  return {
    sizeRoles: { ...roles.sizeRoles, touch: touchTargetFor(axis, platform, roles.sizeRoles.touch ?? 'lg') },
    radiusRoles: { ...roles.radiusRoles, ...(axis.radiusRoles[platform] ?? {}) },
  }
}
