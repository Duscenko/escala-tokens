import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  NATIVE_PLATFORMS,
  PLATFORM_FONT_DEFAULTS,
  PLATFORM_TOUCH_DEFAULTS,
  defaultPlatformAxis,
  mergePlatformAxis,
  normalizePlatforms,
  platformPayload,
  roleFollowsPlatform,
  shipsNative,
  typeAliasFor,
  type PlatformAxis,
} from '../platformAxis'
import { TYPE_ROLES, mergeTypeRoles } from '../typeRoles'
import { generateTokenJSON } from '../tokenGenerator'
import { useDesignStore } from '../../store/useDesignStore'

const ios = { family: 'body', size: 'text-lg', weight: 'regular' } as const
const android = { family: 'body', size: 'text-sm', weight: 'medium' } as const

function nativeAxis(extra: Partial<PlatformAxis> = {}): PlatformAxis {
  return mergePlatformAxis({ ...defaultPlatformAxis(), shipped: ['web', 'ios', 'android'], ...extra })
}

describe('platform axis — shape', () => {
  it('normalizes to canonical order with web always first', () => {
    expect(normalizePlatforms(undefined)).toEqual(['web'])
    expect(normalizePlatforms(['android', 'ios', 'android', 'tv'])).toEqual(['web', 'ios', 'android'])
    expect(normalizePlatforms(['ios'])).toEqual(['web', 'ios'])
  })

  it('a web-only axis ships nothing native', () => {
    expect(shipsNative(defaultPlatformAxis())).toBe(false)
    expect(shipsNative(mergePlatformAxis({}))).toBe(false)
    expect(shipsNative(mergePlatformAxis({ shipped: ['web', 'ios'] }))).toBe(true)
  })

  it('body and control roles follow Platform; display and heading follow Viewport', () => {
    const groups = Object.fromEntries(TYPE_ROLES.map((r) => [r.key, r.group]))
    for (const [key, group] of Object.entries(groups)) {
      expect(roleFollowsPlatform(key)).toBe(group === 'body' || group === 'control')
    }
    expect(roleFollowsPlatform('button')).toBe(true)
    expect(roleFollowsPlatform('heading-md')).toBe(false)
  })

  it('repairs a stored axis: unknown platforms, viewport-owned roles and malformed aliases are dropped', () => {
    const axis = mergePlatformAxis({
      shipped: ['ios', 'nope'],
      fontFamily: { ios: 'SF Pro', windows: 'Segoe', android: '' },
      typeRoles: {
        'body-md': { ios, android: { family: 'body' } },
        'heading-md': { ios },
        'unknown-role': { ios },
      },
      touchTarget: { ios: 'dimension-44', android: 'huge' },
      radiusRoles: { android: { action: 'lg' }, ios: 'pill' },
    })
    expect(axis.shipped).toEqual(['web', 'ios'])
    expect(axis.fontFamily).toEqual({ ios: 'SF Pro' })
    expect(axis.typeRoles).toEqual({ 'body-md': { ios } })
    expect(axis.touchTarget).toEqual({ ios: 'dimension-44' })
    expect(axis.radiusRoles).toEqual({ android: { action: 'lg' } })
  })
})

describe('platform axis — resolution', () => {
  const roles = mergeTypeRoles()

  it('a body role takes its native cut; without one it follows the viewport', () => {
    const axis = nativeAxis({ typeRoles: { 'body-md': { ios } } })
    expect(typeAliasFor(roles, axis, 'body-md', 'ios', 'mobile')).toEqual(ios)
    expect(typeAliasFor(roles, axis, 'body-md', 'android', 'mobile')).toEqual(roles['body-md'].mobile)
    expect(typeAliasFor(roles, axis, 'body-md', 'web', 'tablet')).toEqual(roles['body-md'].tablet)
  })

  it('a heading never reads the platform, even with a stray override', () => {
    const axis = nativeAxis()
    axis.typeRoles['heading-md'] = { ios }
    expect(typeAliasFor(roles, axis, 'heading-md', 'ios', 'desktop')).toEqual(roles['heading-md'].desktop)
  })
})

describe('platform axis — payload', () => {
  const root = {
    typography: { fontFamily: 'Inter', headingFontFamily: 'Fraunces', roles: mergeTypeRoles() },
    sizeRoles: { touch: 'lg', control: 'md' },
  }

  it('emits nothing for a web-only system', () => {
    expect(platformPayload(defaultPlatformAxis(), root)).toEqual({})
    expect(platformPayload(undefined, root)).toEqual({})
  })

  it('web mirrors the root; natives fall back to the OS defaults', () => {
    const out = platformPayload(nativeAxis(), root)
    expect(out.platforms).toEqual(['web', 'ios', 'android'])
    expect(out.platform?.fontFamily).toEqual({ web: 'Inter', ...PLATFORM_FONT_DEFAULTS })
    expect(out.platform?.headingFontFamily).toEqual({ web: 'Fraunces', ...PLATFORM_FONT_DEFAULTS })
    expect(out.platform?.touchTarget).toEqual({ web: 'lg', ...PLATFORM_TOUCH_DEFAULTS })
    expect(out.platform?.typeRoles).toEqual({})
    expect(out.platform?.radiusRoles).toEqual({})
  })

  it('emits only the shipped platforms and only roles with a native cut, web = desktop alias', () => {
    const axis = nativeAxis({
      shipped: ['web', 'ios'],
      typeRoles: { 'body-md': { ios, android }, label: { android } },
      radiusRoles: { ios: { action: 'pill' }, android: { action: 'lg' } },
    })
    const out = platformPayload(axis, root)
    expect(out.platforms).toEqual(['web', 'ios'])
    expect(Object.keys(out.platform!.fontFamily)).toEqual(['web', 'ios'])
    expect(out.platform?.typeRoles).toEqual({ 'body-md': { web: root.typography.roles['body-md'].desktop, ios } })
    expect(out.platform?.radiusRoles).toEqual({ ios: { action: 'pill' } })
  })
})

describe('platform axis — generateTokenJSON', () => {
  it('a web-only store emits neither key (byte parity with the pre-axis payload)', () => {
    const json = generateTokenJSON()
    expect(json).not.toHaveProperty('platforms')
    expect(json).not.toHaveProperty('platform')
    for (const theme of Object.values(json.foundationsByTheme ?? {})) {
      expect(theme).not.toHaveProperty('platforms')
    }
  })

  it('a native target adds the axis at the root and per theme, web mirroring that scope', () => {
    const state = useDesignStore.getState()
    const snapshot = { ...state, platformAxis: nativeAxis({ shipped: ['web', 'android'] }) } as typeof state
    const json = generateTokenJSON(snapshot)
    expect(json.platforms).toEqual(['web', 'android'])
    expect(json.platform?.fontFamily.web).toBe(json.typography.fontFamily)
    expect(json.platform?.touchTarget.web).toBe(json.sizeRoles.touch)
    expect(json.platform?.fontFamily.android).toBe('Roboto')
    for (const theme of Object.values(json.foundationsByTheme ?? {})) {
      expect(theme.platforms).toEqual(['web', 'android'])
      expect(theme.platform?.fontFamily.web).toBe(theme.typography.fontFamily)
    }
    expect(json.schemaVersion).toBe(7)
  })
})

describe('platform axis — store migration v106', () => {
  it('the persisted store bumped to v106 and seeds the axis on root and saved systems', () => {
    // No test here reaches the persist middleware's migrate (node env, no
    // storage), so pin the two lines the migration is made of: the version
    // bump and the seed, which is `mergePlatformAxis` — covered above.
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../store/useDesignStore.ts'), 'utf8')
    expect(src).toContain('version: 106,')
    expect(src).toContain('if (version < 106) {')
    expect(src).toContain('state.platformAxis = mergePlatformAxis(state.platformAxis)')
    expect(mergePlatformAxis(undefined)).toEqual(defaultPlatformAxis())
    expect(mergePlatformAxis({ shipped: ['ios'] }).shipped).toEqual(['web', 'ios'])
  })

  it('the store default is web-only and the setter repairs patches', () => {
    expect(useDesignStore.getState().platformAxis).toEqual(defaultPlatformAxis())
    useDesignStore.getState().setPlatformAxis({ shipped: ['android'], typeRoles: { 'heading-md': { ios } } })
    const axis = useDesignStore.getState().platformAxis
    expect(axis.shipped).toEqual(['web', 'android'])
    expect(axis.typeRoles).toEqual({})
    useDesignStore.getState().setPlatformAxis(defaultPlatformAxis())
    expect(NATIVE_PLATFORMS).toEqual(['ios', 'android'])
  })
})
