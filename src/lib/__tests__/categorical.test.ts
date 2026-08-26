import { describe, expect, it } from 'vitest'
import {
  buildArchitectureView,
  CATEGORICAL_ROLE_COMMENTS,
  categoricalNestedPath,
  projectArchitecture,
} from '../semanticArchitectures'
import { buildSystem } from '../color/audit'
import { buildCategoricalSymbolicTokens, generateTokenJSON } from '../tokenGenerator'
import { buildWizardExport } from '../exportWizard'
import { unzipStore } from '../zipStore'

/**
 * Categorical ships a nested role contract: dotted ids internally
 * (`content.link.default`, `status.critical.surface`, …). The Skill export
 * carries that contract as Agent Skills markdown.
 */

const system = buildSystem('violet/radix', '#7f56d9', 'radix')
const view = buildArchitectureView('categorical', {
  themes: {}, themeKinds: { light: 'light', dark: 'dark' }, themePalettes: {},
  scales: system.scales, accent: system.accent,
} as never, system.errorSeed)!

const roleIds = view.categories.flatMap((c) => c.tokens.map((t) => `${c.key}.${t.key}`))

// A second seed whose SOLID resolves to tone 11, not 9 — amber measures
// 2.15:1/Lc 42 at the ramp's anchor, so `solidInkPair` walks past it. Several
// tests below rely on this to prove a fix, not just the absence of a
// regression on the (already-passing) module-level `view`.
const amberSystem = buildSystem('amber/radix', '#f59e0b', 'radix')
const amberView = buildArchitectureView('categorical', {
  themes: {}, themeKinds: { light: 'light', dark: 'dark' }, themePalettes: {},
  scales: amberSystem.scales, accent: amberSystem.accent,
} as never, amberSystem.errorSeed)!

describe('the categorical catalogue is complete', () => {
  it('ships 41 roles across five groups', () => {
    // 39 + status.info.surface + status.info.content — the Info primitive had
    // a full generated ramp and zero semantic roles referencing it.
    expect(roleIds).toHaveLength(41)
    for (const group of ['content', 'action', 'surface', 'status', 'border']) {
      expect(view.categories.some((c) => c.key === group), group).toBe(true)
    }
  })

  it('every role has a [ROLE] guidance comment for the AI export', () => {
    const missing = roleIds.filter((id) => !CATEGORICAL_ROLE_COMMENTS[id]?.startsWith('[ROLE:'))
    expect(missing, `missing guidance for ${missing.join(', ')}`).toEqual([])
    const extra = Object.keys(CATEGORICAL_ROLE_COMMENTS).filter((id) => !roleIds.includes(id))
    expect(extra, `stale comments for ${extra.join(', ')}`).toEqual([])
  })

  it('nests dotted keys under their group segments', () => {
    expect(categoricalNestedPath('content', 'link.default')).toEqual(['content', 'link', 'default'])
    expect(categoricalNestedPath('status', 'critical.surface')).toEqual(['status', 'critical', 'surface'])
    expect(categoricalNestedPath('action', 'primary.default')).toEqual(['action', 'primary', 'default'])
    expect(categoricalNestedPath('surface', 'page')).toEqual(['surface', 'page'])
  })

  it('uses the layout-tuned dark steps as catalogue defaults', () => {
    const label = (group: string, key: string) =>
      view.categories.find((c) => c.key === group)?.tokens.find((t) => t.key === key)?.modes.dark.label
    expect(label('surface', 'inverse')).toBe('neutral.4')
    expect(label('border', 'subtle')).toBe('neutral-dark.4')
    // All three severities share step 11 in dark. Critical read 10 until it was
    // measured at |Lc| ~42.7 against its own tone-3 tint, ~17 short of the
    // large-text floor — see the note in semanticArchitectures.ts.
    expect(label('status', 'critical.content')).toBe('error.11')
    expect(label('status', 'warning.content')).toBe('warning.11')
    expect(label('status', 'success.content')).toBe('success.11')
    expect(label('status', 'critical.surface-solid')).toBe('error.12')
  })

  // `border.default`/`border.strong` split by JOB (control boundary vs.
  // emphasis) rather than by weight, each dual-metric verified (WCAG 1.4.11 +
  // APCA Lc 45) against the page it sits on — see the [ROLE:] comments in
  // semanticArchitectures.ts and design-plans/border-roles-radix-band.md.
  // Dark is NOT tone-for-tone with light: this ramp's dark tones 8-10 either
  // miss WCAG or pass it while failing APCA (the same blind spot a since-
  // deleted IBM Carbon projection once proved for a sibling architecture's own
  // border-strong), so the walk lands on 11 for the default seed, not 8/9
  // mirrored from light.
  it('border.default is the accessible control boundary, border.strong one step past it', () => {
    const label = (key: string) =>
      view.categories.find((c) => c.key === 'border')?.tokens.find((t) => t.key === key)?.modes
    expect(label('default')?.light.label).toBe('neutral.8')
    expect(label('default')?.dark.label).toBe('neutral-dark.11')
    expect(label('strong')?.light.label).toBe('neutral.9')
    expect(label('strong')?.dark.label).toBe('neutral-dark.12')
  })

  // border.focus is SOLVED against the page, not pinned — a fixed tone can't
  // honestly promise a floor when the ring's colour is the user's own accent
  // hue. This test's seed (#7f56d9, a saturated violet) is one of the hues
  // that already passed at tone 9, so light resolving to accent.9 here proves
  // the solver reproduces the pre-existing value for the common case, not
  // that the solver is a no-op — see the 8-hue table in the design plan for
  // the hues that don't.
  it('border.focus resolves via the solver, matching the pinned value for a passing hue', () => {
    const label = (key: string) =>
      view.categories.find((c) => c.key === 'border')?.tokens.find((t) => t.key === key)?.modes
    expect(label('focus')?.light.label).toBe('accent.9')
    expect(label('focus')?.dark.label).toBe('accent.11')
  })

  // border.success has one step of headroom border.warning does not — see the
  // dual-metric table in the design plan (`warning` has no tone below 11 that
  // clears WCAG in light; `success` does at tone 10).
  it('border.success sits one tone lighter than border.warning', () => {
    const label = (key: string) =>
      view.categories.find((c) => c.key === 'border')?.tokens.find((t) => t.key === key)?.modes
    expect(label('success')?.light.label).toBe('success.10')
    expect(label('warning')?.light.label).toBe('warning.11')
  })
})

describe('border.focus solver — a hue the old pinned {accent.9} actually failed', () => {
  // Amber measured 2.15:1 / Lc 42 at tone 9 in light — under both the WCAG
  // 3:1 and APCA Lc 45 floors. This is the case the solver exists for; the
  // test above (violet) only proves the solver doesn't regress the common
  // passing case. (`amberSystem`/`amberView` declared at module scope.)
  it('walks past tone 9 to a tone that actually clears both floors', () => {
    const focus = amberView.categories.find((c) => c.key === 'border')?.tokens.find((t) => t.key === 'focus')
    expect(focus?.modes.light.label).not.toBe('accent.9')
    expect(['accent.10', 'accent.11', 'accent.12']).toContain(focus?.modes.light.label)
  })
})

// `{step:accent+n}` replaced fixed `{accent.10}`/`{accent.11}`/`{accent.6}`
// for hover/pressed. Two seeds: violet (solid resolves to 9 in light, proving
// the common case is byte-identical to the old pin) and amber (solid resolves
// to 11, the case the old pin silently broke — hover measured 2.51:1 and
// pressed was IDENTICAL to default under the fixed-tone version).
describe('action.primary hover/pressed — solved relative to the resolved solid, not pinned', () => {
  const actionOf = (v: typeof view, key: string) =>
    v.categories.find((c) => c.key === 'action')?.tokens.find((t) => t.key === key)?.modes

  it('a hue whose solid is 9 resolves to the exact tones the old fixed pin used', () => {
    expect(actionOf(view, 'primary.default')?.light.label).toBe('accent.9')
    expect(actionOf(view, 'primary.hover')?.light.label).toBe('accent.10')
    expect(actionOf(view, 'primary.pressed')?.light.label).toBe('accent.11')
  })

  it('a hue whose solid is 11 gets a hover/pressed that are NOT the broken fixed pin', () => {
    const solid = actionOf(amberView, 'primary.default')?.light.label
    const hover = actionOf(amberView, 'primary.hover')?.light.label
    const pressed = actionOf(amberView, 'primary.pressed')?.light.label
    expect(solid).toBe('accent.11')
    // The old fixed pin put hover at accent.10 — LIGHTER than an 11-solid,
    // reading as a step backward and measuring 2.51:1 (fails AA). The solved
    // version must differ from that broken value.
    expect(hover).not.toBe('accent.10')
    // The old fixed pin put pressed at accent.11 — IDENTICAL to the default,
    // i.e. no pressed state at all for this hue.
    expect(pressed).not.toBe(solid)
  })

  it('pressed is never lighter than hover, which is never lighter than default', () => {
    for (const v of [view, amberView]) {
      const toneOf = (label?: string) => Number(label?.split('.')[1] ?? 0)
      const d = toneOf(actionOf(v, 'primary.default')?.light.label)
      const h = toneOf(actionOf(v, 'primary.hover')?.light.label)
      const p = toneOf(actionOf(v, 'primary.pressed')?.light.label)
      expect(h).toBeGreaterThanOrEqual(d)
      expect(p).toBeGreaterThanOrEqual(h)
    }
  })
})

describe('status.info — no longer orphaned', () => {
  it('references the info family, matching the shape of the other three severities', () => {
    const infoSurface = view.categories.find((c) => c.key === 'status')?.tokens.find((t) => t.key === 'info.surface')
    const infoContent = view.categories.find((c) => c.key === 'status')?.tokens.find((t) => t.key === 'info.content')
    expect(infoSurface?.modes.light.label).toBe('info.3')
    expect(infoContent?.modes.light.label).toBe('info.11')
    expect(infoContent?.modes.dark.label).toBe('info.11')
  })
})

describe('buildCategoricalSymbolicTokens matches the architecture view', () => {
  it('emits one alias per role per theme', () => {
    const { themeOrder, tokens } = buildCategoricalSymbolicTokens()
    expect(themeOrder.length).toBeGreaterThanOrEqual(2)
    for (const id of roleIds) {
      const [group, ...rest] = id.split('.')
      const key = rest.join('.')
      for (const theme of themeOrder) {
        expect(tokens[group]?.[key]?.[theme], `${id} · ${theme}`).toMatch(/^\{[^}]+\}$/)
      }
    }
  })
})

describe('generateTokenJSON is the live-sync payload the plugin GETs', () => {
  it('ships nested categorical keys, not the pre-v51 flat ids', () => {
    const json = generateTokenJSON()
    expect(json.colors.semanticArchitecture).toBe('categorical')
    const arch = json.colors.architecture as {
      kind: string
      tokens: Record<string, Record<string, Record<string, string>>>
    }
    expect(arch.kind).toBe('categorical')
    expect(arch.tokens.action['primary.default']).toBeDefined()
    expect(arch.tokens.action.primary).toBeUndefined()
    expect(arch.tokens.status['critical.surface']).toBeDefined()
    expect(arch.tokens.status['critical-bg']).toBeUndefined()
    expect(arch.tokens.status['critical.content']).toBeDefined()
    expect(arch.tokens.content['on-action']).toBeDefined()
    expect(arch.tokens.border.strong).toBeDefined()
    for (const id of roleIds) {
      const [group, ...rest] = id.split('.')
      const key = rest.join('.')
      const light = arch.tokens[group]?.[key]?.light
      expect(light, id).toMatch(/^(#[0-9a-fA-F]{6}|\{[a-z0-9-]+\.\d+\})$/)
    }
  })
})

describe('projectArchitecture keeps nested override ids', () => {
  const input = {
    themes: {},
    themeKinds: { light: 'light', dark: 'dark' },
    themePalettes: {},
    scales: system.scales,
    accent: system.accent,
  } as never

  it('applies action.primary.default instead of truncating at primary', () => {
    const baseline = projectArchitecture('categorical', input, system.errorSeed, {}, ['light', 'dark']) as {
      tokens: Record<string, Record<string, Record<string, string>>>
    }
    const edited = projectArchitecture('categorical', input, system.errorSeed, {
      'action.primary.default': { light: '{accent.1}' },
    }, ['light', 'dark']) as {
      tokens: Record<string, Record<string, Record<string, string>>>
    }
    expect(baseline.tokens.action['primary.default']).toBeDefined()
    expect(baseline.tokens.action.primary).toBeUndefined()
    expect(edited.tokens.action['primary.default'].light)
      .not.toBe(baseline.tokens.action['primary.default'].light)
  })

  it('rewrites legacy action.primary overrides onto primary.default', () => {
    const nested = projectArchitecture('categorical', input, system.errorSeed, {
      'action.primary.default': { light: '{accent.1}' },
    }, ['light', 'dark']) as {
      tokens: Record<string, Record<string, Record<string, string>>>
    }
    const legacy = projectArchitecture('categorical', input, system.errorSeed, {
      'action.primary': { light: '{accent.1}' },
    }, ['light', 'dark']) as {
      tokens: Record<string, Record<string, Record<string, string>>>
    }
    expect(legacy.tokens.action['primary.default'].light)
      .toBe(nested.tokens.action['primary.default'].light)
  })
})

describe('the Skill export format', () => {
  const files = buildWizardExport({
    collections: [],
    modes: ['light', 'dark'],
    format: 'skill',
    structure: 'single',
    colorFormat: 'hex',
    includeAliases: true,
    includeComponents: false,
  })

  it('ships a Figma MCP skill zip (SKILL.md + references/)', () => {
    expect(files).toHaveLength(1)
    expect(files[0].name).toMatch(/\.zip$/)
    expect(files[0].language).toBe('zip')
    expect(files[0].binary?.length).toBeGreaterThan(100)

    const md = files[0].content
    expect(md).toMatch(/^---\nname: /)
    expect(md).toContain('description:')
    expect(md).toContain('compatibility:')
    expect(md).toContain('mcp-server: figma')
    expect(md).toContain('## When to use')
    expect(md).toContain('## Instructions')
    expect(md).toContain('## Examples')
    expect(md).toContain('## Common edge cases')
    expect(md).toContain('figma-use')
    expect(md).toContain('Color Semantics')

    const desc = md.match(/^description: "([^"]*)"/m)?.[1] ?? ''
    expect(desc.length).toBeGreaterThan(0)
    expect(desc.length).toBeLessThanOrEqual(1024)
    const name = md.match(/^name: ([a-z0-9-]+)$/m)?.[1] ?? ''
    expect(name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(name.length).toBeLessThanOrEqual(64)

    const unzipped = unzipStore(files[0].binary!)
    const paths = unzipped.map((f) => f.path)
    expect(paths).toContain('SKILL.md')
    expect(paths).toContain('references/tokens.md')
    expect(paths).toContain('references/foundations.md')
    expect(paths).toContain('references/semantic-contract.md')
    expect(md).toContain('## Token catalog')
    expect(md).toContain('#### Content')
    expect(md).toContain('#### Action')
    expect(md).toContain('#### Surface')
    expect(md).toContain('#### Status')
    expect(md).toContain('#### Border')
    expect(md).toContain('`Action/primary/default`')
    expect(md).toContain('`Content/primary`')
    expect(md).toContain('Spacing')
    expect(md).toContain('step/{n}')

    const tokensMd = new TextDecoder().decode(
      unzipped.find((f) => f.path === 'references/tokens.md')!.data,
    )
    expect(tokensMd).toContain('Color Primitives')
    expect(tokensMd).toContain('### Content')
    expect(tokensMd).toContain('### Action')
    expect(tokensMd).toContain('`Content/primary`')
    expect(tokensMd).toContain('`Action/primary/default`')

    const foundationsMd = new TextDecoder().decode(
      unzipped.find((f) => f.path === 'references/foundations.md')!.data,
    )
    expect(foundationsMd).toContain('## Spacing')
    expect(foundationsMd).toContain('## Radius')
    expect(foundationsMd).toContain('## Shadows')
    expect(foundationsMd).toContain('/Shadow/')
    expect(foundationsMd).toContain('## Icons')
    expect(foundationsMd).toContain('https://github.com/untitleduico/icons')
    expect(md).toContain('### Icons')
    expect(md).toContain('https://github.com/untitleduico/icons')
    expect(md).toContain('When generating UI for this product, use icons from')
  })

  it('puts every categorical role in the semantic-contract reference', () => {
    const unzipped = unzipStore(files[0].binary!)
    const contract = new TextDecoder().decode(
      unzipped.find((f) => f.path.endsWith('semantic-contract.md'))!.data,
    )
    for (const id of roleIds) {
      expect(contract, id).toContain(`\`${id}\``)
      expect(contract, id).toContain(CATEGORICAL_ROLE_COMMENTS[id]!)
    }
    expect(contract).toContain('`Content/primary`')
    expect(contract).toContain('`Action/primary/default`')
    expect(contract).toContain('`var(--color-content-link-default)`')
    expect(contract).toContain('`border.focus`')
    expect(contract).not.toContain('`border.active`')
  })

  it('nests content.link and action.primary in the contract list', () => {
    const unzipped = unzipStore(files[0].binary!)
    const contract = new TextDecoder().decode(
      unzipped.find((f) => f.path.endsWith('semantic-contract.md'))!.data,
    )
    expect(contract).toContain('`content.link.default`')
    expect(contract).toContain('`content.link.hover`')
    expect(contract).toContain('`action.primary.default`')
    expect(contract).toContain('`status.critical.surface`')
    expect(contract).toContain('`status.critical.content`')
  })
})
