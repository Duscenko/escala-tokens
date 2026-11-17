// Black / Gray / White box guards (design-plans/component-box-classification.md).
// No generator pick — a preset or any step of any radius axis — may change what
// a component's shape MEANS: a checkbox stays a square, a radio a circle, a
// rounded avatar stays distinct from a circle one.
import { describe, expect, it } from 'vitest'
import { COMPONENT_RECIPES, refFn, refFnPx, resolveRecipe } from '../componentRecipes'
import {
  LAYOUT_ROLES,
  RADIUS_AXIS_STEPS,
  RADIUS_GROUPS,
  RADIUS_ROLE_PRESETS,
  RADIUS_STANDARD,
  applyRadiusGroup,
  defaultLayoutRoles,
  radiusRolesForPreset,
  resolveLayoutRole,
} from '../layoutTokens'

type Roles = Record<string, string>

/** Every radius role map the generator can produce: the presets, and each
 *  axis on each step of its ladder with the others at their default. */
function radiusPicks(): { label: string; roles: Roles }[] {
  const picks = RADIUS_ROLE_PRESETS.map((p) => ({ label: `preset ${p.label}`, roles: radiusRolesForPreset(p.label) as Roles }))
  for (const group of RADIUS_GROUPS) {
    for (const step of RADIUS_AXIS_STEPS) {
      picks.push({ label: `${group.key} = ${step}`, roles: applyRadiusGroup(group, defaultLayoutRoles('radius'), step) })
    }
  }
  return picks
}

function px(ref: string | undefined, radiusRoles: Roles): number {
  if (!ref) return 0
  const fn = refFn(ref)
  if (fn) return refFnPx(fn.fn, fn.terms.map((t) => px(t, radiusRoles)))
  const [family, key] = ref.split('.') as [string, string]
  if (family === 'radius') {
    if (LAYOUT_ROLES.radius.some((r) => r.key === key)) return parseFloat(resolveLayoutRole('radius', radiusRoles, RADIUS_STANDARD, key, '0px')) || 0
    return parseFloat(RADIUS_STANDARD[key as keyof typeof RADIUS_STANDARD] ?? '0') || 0
  }
  if (family === 'selector') return parseFloat(resolveLayoutRole('selector', undefined, {}, key, '0px')) || 0
  throw new Error(`unhandled ref ${ref}`)
}

const PICKS = radiusPicks()
const CIRCLE = 9999

describe('Black box: Checkbox stays a square', () => {
  for (const size of ['xs', 'sm', 'default']) {
    it(`Size=${size} never rounder than 30% of its side, at any radius pick`, () => {
      const root = resolveRecipe(COMPONENT_RECIPES.Checkbox, { Size: size }).root
      for (const { label, roles } of PICKS) {
        const side = px(root.width as string, roles)
        const r = px(root.radius as string, roles)
        expect(side, label).toBeGreaterThan(0)
        expect(r / side, `${label}: ${r}px on ${side}px`).toBeLessThanOrEqual(0.3)
      }
    })
  }

  it('keeps the Rounded default untouched (Radius/control 4)', () => {
    const roles = radiusRolesForPreset('Rounded') as Roles
    for (const size of ['xs', 'sm', 'default']) {
      expect(px(resolveRecipe(COMPONENT_RECIPES.Checkbox, { Size: size }).root.radius as string, roles)).toBe(4)
    }
  })

  it('Sharp still gives a square corner', () => {
    const roles = radiusRolesForPreset('Sharp') as Roles
    expect(px(resolveRecipe(COMPONENT_RECIPES.Checkbox).root.radius as string, roles)).toBe(0)
  })
})

describe('Black box: circles stay circles', () => {
  const circles: [string, string][] = [['RadioGroup', 'item'], ['RadioGroup', 'indicator'], ['Switch', 'root'], ['Switch', 'thumb'], ['AvatarStatus', 'root']]
  for (const [key, slot] of circles) {
    it(`${key}.${slot} is radius.pill at every pick`, () => {
      const recipe = COMPONENT_RECIPES[key]
      expect(recipe, key).toBeDefined()
      const ref = resolveRecipe(recipe)[slot]?.radius as string
      for (const { label, roles } of PICKS) expect(px(ref, roles), label).toBe(CIRCLE)
    })
  }

  it('Kbd never becomes a pill', () => {
    const ref = resolveRecipe(COMPONENT_RECIPES.Kbd).root.radius as string
    for (const { label, roles } of PICKS) expect(px(ref, roles), label).toBeLessThanOrEqual(8)
  })
})

describe('Gray box: Shape=rounded never collapses into Shape=circle', () => {
  for (const key of ['Avatar', 'AvatarGroup', 'FeaturedIcon']) {
    it(`${key} rounded stays ≤ 12px at every pick`, () => {
      const map = resolveRecipe(COMPONENT_RECIPES[key], { Shape: 'rounded' })
      const ref = (map.root?.radius ?? map.item?.radius) as string
      expect(ref, key).toBeTruthy()
      for (const { label, roles } of PICKS) expect(px(ref, roles), label).toBeLessThanOrEqual(12)
    })
  }

  it('InputOTPSlot stays a box (≤ 12px) at every pick', () => {
    const ref = resolveRecipe(COMPONENT_RECIPES.InputOTPSlot).root.radius as string
    for (const { label, roles } of PICKS) expect(px(ref, roles), label).toBeLessThanOrEqual(12)
  })
})
