import { describe, expect, it } from 'vitest'
import { buildArchitectureView } from '../semanticArchitectures'
import { buildSystem } from '../color/audit'
import { resolvePreviewTokens, inputSurfaceOf, focusBorderOf, statusSoftFillOf } from '../previewTokens'
import type { PreviewTokens } from '../../components/preview/ButtonPreview'

/** Every Categorical arch id the semantic specimens reference — first match in each slotOf list. */
const SPECIMEN_ARCH_IDS = [
  'content.primary', 'content.secondary', 'content.subtle', 'content.accent', 'content.disabled',
  'content.on-action', 'content.link.default', 'content.link.hover',
  'action.primary.default', 'action.primary.hover', 'action.primary.pressed',
  'action.secondary.default', 'action.secondary.accent', 'action.disabled',
  'action.ghost.neutral.hover', 'action.ghost.brand.hover',
  'border.ring.default',
  'surface.page', 'surface.layer-1', 'surface.layer-2', 'surface.input', 'surface.selected',
  'surface.accent', 'surface.inverse', 'surface.overlay',
  'status.critical.surface', 'status.critical.content', 'status.critical.surface-solid', 'status.critical.on-solid',
  'status.critical.border', 'status.critical.border-strong',
  'status.warning.surface', 'status.warning.content', 'status.success.surface', 'status.success.content',
  'border.control', 'border.control-hover', 'border.default', 'border.subtle', 'border.strong',
  'border.focus', 'border.accent',
  'icon.primary', 'icon.secondary', 'icon.disabled', 'icon.accent',
]

function mockStore(system: ReturnType<typeof buildSystem>) {
  return {
    primaryColor: system.accent,
    grayLightScale: system.scales.gray,
    grayDarkScale: system.scales.grayDark ?? system.scales.gray,
    primaryScale: system.scales.brand,
    primaryDarkScale: system.scales.dark?.brand,
    errorScale: system.scales.error,
    errorDarkScale: system.scales.dark?.error,
    warningScale: system.scales.warning,
    warningDarkScale: system.scales.dark?.warning,
    successScale: system.scales.success,
    successDarkScale: system.scales.dark?.success,
    infoScale: system.scales.info,
    infoDarkScale: system.scales.dark?.info,
    errorColor: system.errorSeed,
    warningColor: '#f79009',
    successColor: '#17b26a',
    infoColor: '#2e90fa',
    themes: { light: {}, dark: {} },
    themeKinds: { light: 'light', dark: 'dark' },
    themeSources: { light: {}, dark: {} },
    semanticArchitecture: 'categorical' as const,
    architectureOverrides: {},
    radius: {},
    spacing: {},
    typography: { fontFamily: 'Inter', weights: {} },
    panelBackground: 'solid' as const,
    pageBackground: '#ffffff',
    darkBackground: '#0a0d12',
    padding: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    sizes: {},
    shadows: {},
    grid: {},
    opacity: {},
    iconLibrary: 'untitled',
    iconAiSource: 'untitled',
    gradients: [],
    gradientAssignments: {},
    customColors: [],
  }
}

function assertCollageFieldMapping(tokens: PreviewTokens) {
  const arch = tokens.archTokens!
  expect(tokens.brandSolid).toBe(arch['action.primary.default'])
  expect(tokens.onBrand).toBe(arch['content.on-action'])
  expect(tokens.neutralText).toBe(arch['content.primary'])
  // These four are FILLS — `errorColor` is "destructive accent", painted as the
  // Solid Danger button's background and the Delete pill. They used to be
  // wired to `status.<sev>.content`, the INK role, so a destructive button took
  // its own label colour as its fill. Invisible in light (both roles resolve to
  // the same hex there) and reported from dark, where they diverge.
  expect(tokens.errorColor).toBe(arch['status.critical.surface-solid'])
  expect(tokens.warningColor).toBe(arch['status.warning.surface-solid'])
  expect(tokens.successColor).toBe(arch['status.success.surface-solid'])
  expect(tokens.surface).toBe(arch['surface.page'])
  expect(tokens.neutralFill).toBe(arch['surface.layer-1'])
  // `PreviewTokens.border` is the component stroke (inputs, selects), so it
  // takes the CONTROL BOUNDARY. That role is `border.control` since phase 1
  // split the neutral strokes by JOB; it was `border.default`, and before that
  // `border.strong`. The resolved value never moved across either rename.
  expect(tokens.border).toBe(arch['border.control'])
  // The decorative outline stays on the ladder's lightest rung — see the note
  // in previewTokens.ts for why it did NOT move up to `border.default`.
  expect(tokens.borderDefault).toBe(arch['border.subtle'])
  // The two jobs must resolve to DIFFERENT values, or the split bought nothing.
  expect(arch['border.control']).not.toBe(arch['border.default'])
  expect(inputSurfaceOf(tokens)).toBe(arch['surface.input'])
  expect(focusBorderOf(tokens)).toBe(arch['border.focus'])
  expect(statusSoftFillOf(tokens, 'Error', tokens.errorColor)).toBe(arch['status.critical.surface'])
  expect(statusSoftFillOf(tokens, 'Success', tokens.successColor!)).toBe(arch['status.success.surface'])
}

describe('semantic preview wiring', () => {
  const system = buildSystem('violet/radix', '#9522e9', 'radix')
  const store = mockStore(system)
  const view = buildArchitectureView('categorical', {
    themes: {}, themeKinds: { light: 'light', dark: 'dark' }, themePalettes: {},
    scales: system.scales, accent: system.accent,
    pageBackground: system.lightBg, darkBackground: system.darkBg,
  } as never, system.errorSeed)!
  const roleIds = new Set(view.categories.flatMap((c) => c.tokens.map((t) => `${c.key}.${t.key}`)))

  it('specimen arch ids are a subset of the categorical catalogue', () => {
    const unknown = SPECIMEN_ARCH_IDS.filter((id) => !id.startsWith('icon.') && !roleIds.has(id))
    expect(unknown, `unknown specimen ids: ${unknown.join(', ')}`).toEqual([])
  })

  for (const theme of ['light', 'dark'] as const) {
    describe(`${theme} preview`, () => {
      it('resolvePreviewTokens fills archTokens for every catalogue role', () => {
        const tokens = resolvePreviewTokens(store as never, theme) as PreviewTokens
        expect(tokens.architecture).toBe('categorical')
        expect(tokens.archTokens).toBeDefined()
        for (const id of roleIds) {
          expect(tokens.archTokens?.[id], id).toBeTruthy()
          expect(tokens.archTokens?.[id]).not.toBe('transparent')
        }
      })

      it('every specimen arch id resolves to a real hex in archTokens', () => {
        const tokens = resolvePreviewTokens(store as never, theme) as PreviewTokens
        const arch = tokens.archTokens!
        for (const id of SPECIMEN_ARCH_IDS) {
          if (id.startsWith('icon.')) continue
          // 8-digit (translucent) hex is real too — surface.overlay resolves
          // through an alpha primitive (`{black-a.8}`) now, not an opaque tone.
          expect(arch[id], id).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i)
        }
      })

      it('resolvePreviewTokens maps collage fields to contract roles', () => {
        assertCollageFieldMapping(resolvePreviewTokens(store as never, theme) as PreviewTokens)
      })
    })
  }

  it('dark preview resolves different surface and status ink than light', () => {
    const light = resolvePreviewTokens(store as never, 'light') as PreviewTokens
    const dark = resolvePreviewTokens(store as never, 'dark') as PreviewTokens
    const l = light.archTokens!
    const d = dark.archTokens!

    // Page inverts; status fg uses a chromatic dark step (not the near-white 12).
    expect(d['surface.page']).not.toBe(l['surface.page'])
    expect(d['status.success.content']).not.toBe(l['status.success.content'])
    expect(d['status.critical.content']).not.toBe(l['status.critical.content'])
    expect(d['status.warning.content']).not.toBe(l['status.warning.content'])

    // Dark control boundary is not tone-for-tone with light (neutral-dark.12
    // vs light neutral.9 — the dark ramp's APCA blind spot forces the walk up).
    expect(d['border.control-hover']).not.toBe(l['border.control-hover'])

    // Collage fields still track arch roles in dark — the wiring, not the hex parity.
    expect(dark.onBrand).toBe(d['content.on-action'])
    expect(dark.brandSolid).toBe(d['action.primary.default'])
  })
})
