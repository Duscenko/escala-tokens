import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { COMPONENTS } from '../componentCatalogue'
import { PREVIEW_COLOR_FIELDS } from '../previewColorFields'
import { COMPONENT_ARCH_ROLES, COMPONENT_COLOR_FIELDS } from '../componentColorFields.generated'
import { rolesForComponent } from '../tokenInspector'
import { buildArchitectureView } from '../semanticArchitectures'
import { buildSystem } from '../color/audit'

const system = buildSystem('violet/radix', '#7f56d9', 'radix')
const roleIds = buildArchitectureView('categorical', {
  themes: {}, themeKinds: { light: 'light', dark: 'dark' }, themePalettes: {},
  scales: system.scales, accent: system.accent,
  pageBackground: system.lightBg, darkBackground: system.darkBg,
} as never, system.errorSeed)!.categories.flatMap((c) => c.tokens.map((t) => `${c.key}.${t.key}`))

const root = resolve(__dirname, '../../..')

describe('the generated component color-field map is current', () => {
  it('regenerating produces the committed file byte-for-byte', () => {
    // GENERATED data, same contract as radix/tailwind/carbon reference tables:
    // if `specimens.tsx` changes which PreviewTokens a specimen reads without
    // re-running the generator, this catches it instead of shipping a stale
    // (silently wrong) scoped Color section for that component.
    const path = resolve(root, 'src/lib/componentColorFields.generated.ts')
    const before = readFileSync(path, 'utf8')
    execFileSync('npx', ['tsx', 'scripts/gen-component-color-fields.ts'], { cwd: root, stdio: 'pipe' })
    expect(readFileSync(path, 'utf8')).toBe(before)
  }, 60_000)

  it('every key is a real catalogue key and every field is an allow-listed color field', () => {
    const catalogueKeys = new Set(COMPONENTS.map((c) => c.key))
    const fieldSet = new Set(PREVIEW_COLOR_FIELDS)
    for (const [key, fields] of Object.entries(COMPONENT_COLOR_FIELDS)) {
      expect(catalogueKeys.has(key)).toBe(true)
      expect(fields.length).toBeGreaterThan(0)
      for (const f of fields) expect(fieldSet.has(f)).toBe(true)
    }
  })

  it('Button — a specimen with an explicit Color/Style/State axis — resolves brand and disabled fields', () => {
    expect(COMPONENT_COLOR_FIELDS.Button).toContain('brandSolid')
    expect(COMPONENT_COLOR_FIELDS.Button).toContain('onBrand')
    expect(COMPONENT_COLOR_FIELDS.Button).toContain('disabledText')
  })

  it('Input binds the form-field surface, not the page', () => {
    expect(COMPONENT_COLOR_FIELDS.Input).toContain('inputSurface')
  })

  it('TabMenu binds the selected-tab surface', () => {
    expect(COMPONENT_COLOR_FIELDS.TabMenu).toContain('selectedSurface')
  })

  it('TextLink binds the link roles, not accent copy', () => {
    expect(COMPONENT_COLOR_FIELDS.TextLink).toContain('linkText')
  })

  it('Input hover/error strokes bind control roles, not text or the solid fill', () => {
    expect(COMPONENT_COLOR_FIELDS.Input).toContain('borderHover')
    expect(COMPONENT_COLOR_FIELDS.Input).toContain('borderCritical')
  })

  it('Chip selected bind the selection surface', () => {
    expect(COMPONENT_COLOR_FIELDS.Chip).toContain('selectedSurface')
  })

  it('Divider — a single hairline with no live axis — resolves only its border', () => {
    expect(COMPONENT_COLOR_FIELDS.Divider).toEqual(['borderDefault'])
  })
})

/**
 * The role half of the same map. A specimen reaches many roles WITHOUT a
 * `PreviewTokens` field — `archTokenOf(t, 'surface.inverse')`, or a helper in
 * `previewTokens.ts` like `overlaySurfaceOf`/`focusBorderOf` — and a field list
 * structurally cannot express those.
 *
 * That was not a cosmetic gap: `rolesForComponent` is the ALLOW-LIST a measured
 * inspection filters against (`rolesForPaints`), so a role missing from it was
 * dropped from the Inspect-tokens badge even though the component visibly
 * painted it. Each case below was observed on the live board before the
 * generator learned to collect these.
 */
describe('the generated arch-role map covers roles reached by name', () => {
  it('every key is a real catalogue key and every id a real Categorical role', () => {
    const catalogueKeys = new Set(COMPONENTS.map((c) => c.key))
    const valid = new Set(roleIds)
    for (const [key, roles] of Object.entries(COMPONENT_ARCH_ROLES)) {
      expect(catalogueKeys.has(key), key).toBe(true)
      expect(roles.length).toBeGreaterThan(0)
      for (const id of roles) expect(valid.has(id), `${key} → ${id}`).toBe(true)
    }
  })

  it('SegmentedControl can name the floating surface its track paints', () => {
    // Reported as the track reading `surface.layer-1`. Fixing the paint alone
    // made it worse — the role vanished from the badge entirely, because
    // `overlaySurfaceOf` hid it from the field closure.
    expect(rolesForComponent('SegmentedControl')).toContain('surface.layer-2')
  })

  it('a text field can name its focus ring', () => {
    for (const key of ['Input', 'Select', 'Textarea']) {
      expect(rolesForComponent(key), key).toContain('border.focus')
    }
  })

  it('Toggle can name the solved hover tone of its track', () => {
    expect(rolesForComponent('Toggle')).toContain('action.primary.hover')
  })

  it('Toast can name the inverse pair it is built from', () => {
    // These survived in the UI only because Toast has an explicit
    // `data-inspect-variant` path that bypasses the allow-list — the fallback
    // was masking the same hole.
    expect(rolesForComponent('Toast')).toEqual(
      expect.arrayContaining(['surface.inverse', 'content.inverse']),
    )
  })

  it('the union carries the field-derived roles as well as the named ones', () => {
    // Both halves, or fixing one silently drops the other.
    const roles = rolesForComponent('SegmentedControl')
    expect(roles).toContain('content.primary') // via the `neutralText` field
    expect(roles).toContain('surface.layer-2') // via `overlaySurfaceOf`
  })

  it('every role a specimen names outright is reportable for that component', () => {
    // Independent of the generator's own AST walk: a plain regex scan of
    // `specimens.tsx` for `archTokenOf(t, '<role>')`, mapped back through the
    // SPECIMENS registry. If the two derivations disagree, the generator has a
    // hole — which is exactly how these bugs shipped.
    const src = readFileSync(resolve(root, 'src/components/configurator/docs/specimens.tsx'), 'utf8')
    const registry = src.slice(src.indexOf('SPECIMENS'))
    const fnOf = new Map<string, string>()
    for (const m of registry.matchAll(/^\s{2}(\w+):\s*(\w+Specimen),?$/gm)) fnOf.set(m[2], m[1])

    const valid = new Set(roleIds)
    const misses: string[] = []
    for (const [fn, key] of fnOf) {
      const start = src.indexOf(`function ${fn}(`)
      if (start < 0) continue
      const next = src.indexOf('\nfunction ', start + 1)
      const body = src.slice(start, next < 0 ? undefined : next)
      const reported = rolesForComponent(key)
      for (const m of body.matchAll(/archTokenOf\(t,\s*'([^']+)'/g)) {
        if (!valid.has(m[1])) continue // a role the architecture doesn't ship
        if (!reported.includes(m[1])) misses.push(`${key} paints ${m[1]} but cannot report it`)
      }
    }
    expect(misses).toEqual([])
  })
})
