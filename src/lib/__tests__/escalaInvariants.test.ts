import { describe, expect, it } from 'vitest'
import { buildStudioTokens } from '../pluginStudio'
import { checkContrast, compositeOver } from '../colorUtils'

/**
 * The Escala Figma file's contract for a NEW system (owner decisions,
 * 2026-11-11): the default system — the one `check-ground-truth.mjs` builds —
 * picks every colour role by job and keeps the skill's WCAG 2.x invariants.
 *
 * Built exactly as the plugin's ground-truth check builds it: accent #874fff,
 * named Escala. If a pair here fails, a ramp or a role moved: fix the tone,
 * never the floor.
 */

type Tokens = {
  colors: {
    themeOrder: string[]
    themeLabels: Record<string, string>
    themeSources: Record<string, Record<string, string>>
    primitive: Record<string, string>
    primitiveAlpha: Record<string, string>
    architecture: { tokens: Record<string, Record<string, Record<string, string>>> }
  }
  typography: { sizes: Record<string, string>; lineHeights: Record<string, string>; letterSpacings: Record<string, string> }
  radius: Record<string, string>
  radiusRoles: Record<string, string>
  radiusRoleViewports: Record<string, Record<string, string>>
  spacing: Record<string, string>
  spacingRoles: Record<string, string>
  spacingRoleRefs: Record<string, string>
  spacingRoleViewports: Record<string, Record<string, string>>
  spacingResponsive: Record<string, Record<string, string>>
  sizeRoles: Record<string, string>
  sizeRoleViewports: Record<string, Record<string, string>>
  selectorRoles: Record<string, string>
}

const built = buildStudioTokens({ accent: '#874fff', name: 'Escala' }, 'pro')
if ('error' in built) throw new Error(built.error)
const t = built.tokens as Tokens
const [LIGHT, DARK] = t.colors.themeOrder
const arch = t.colors.architecture.tokens
const role = (id: string, theme: string): string => {
  const dot = id.indexOf('.')
  const v = arch[id.slice(0, dot)]?.[id.slice(dot + 1)]?.[theme]
  if (!v) throw new Error(`no ${id} in ${theme}`)
  return v
}
/** A translucent value as the eye sees it, over the surface it sits on. */
const over = (fg: string, bg: string) => (fg.length === 9 ? compositeOver(fg, bg) : fg)
const ratio = (fg: string, bg: string, theme: string) => checkContrast(over(role(fg, theme), role(bg, theme)), role(bg, theme))
const SEVERITIES = ['critical', 'success', 'warning', 'info'] as const
const FAMILY: Record<string, string> = { critical: 'error', success: 'success', warning: 'warning', info: 'info' }

describe('the default Escala system — contrast invariants (WCAG 2.x)', () => {
  for (const [name, theme] of [['Light', LIGHT], ['Dark', DARK]] as const) {
    describe(name, () => {
      it('text on surfaces', () => {
        expect(ratio('content.primary', 'surface.page', theme)).toBeGreaterThanOrEqual(7)
        expect(ratio('content.secondary', 'surface.layer-2', theme)).toBeGreaterThanOrEqual(4.5)
        expect(ratio('content.accent', 'surface.page', theme)).toBeGreaterThanOrEqual(4.5)
        expect(ratio('content.link.default', 'surface.page', theme)).toBeGreaterThanOrEqual(4.5)
        // Placeholder and decoration only.
        expect(ratio('content.subtle', 'surface.input', theme)).toBeGreaterThanOrEqual(3)
      })

      it('the primary button label on every state', () => {
        for (const state of ['default', 'hover', 'pressed']) {
          expect(ratio('content.on-action', `action.primary.${state}`, theme), state).toBeGreaterThanOrEqual(4.5)
        }
      })

      it('boundaries: focus and the control outline clear WCAG 1.4.11', () => {
        expect(ratio('border.focus', 'surface.page', theme)).toBeGreaterThanOrEqual(3)
        expect(ratio('border.control', 'surface.page', theme)).toBeGreaterThanOrEqual(3)
      })

      it('every severity: label on its solids, content on the page and on its tint', () => {
        for (const sev of SEVERITIES) {
          for (const state of ['', '-hover', '-pressed']) {
            expect(ratio(`status.${sev}.on-solid`, `status.${sev}.surface-solid${state}`, theme), `${sev}${state}`).toBeGreaterThanOrEqual(4.5)
          }
          expect(ratio(`status.${sev}.content`, 'surface.page', theme), sev).toBeGreaterThanOrEqual(4.5)
          // The tint is translucent: measure it composited over the page.
          const tint = over(role(`status.${sev}.surface`, theme), role('surface.page', theme))
          expect(checkContrast(role(`status.${sev}.content`, theme), tint), `${sev} on tint`).toBeGreaterThanOrEqual(4.5)
        }
      })

      it('the inverse context: secondary ink on surface.inverse', () => {
        expect(ratio('content.inverse', 'surface.inverse', theme)).toBeGreaterThanOrEqual(4.5)
        expect(ratio('content.inverse-secondary', 'surface.inverse', theme)).toBeGreaterThanOrEqual(4.5)
      })
    })
  }
})

describe('the default Escala system — roles picked by job', () => {
  const src = t.colors.themeSources[LIGHT]
  const prim = (family: string, step: number, dark = false) => t.colors.primitive[`${family}${dark ? '-dark' : ''}-${step}`]
  const alpha = (family: string, step: number, dark = false) => t.colors.primitiveAlpha[`${family}${dark ? '-dark' : ''}-${step}`]
  const accent = src.brand
  const gray = src.gray

  it('names the modes after the system: Escala Light / Escala Dark', () => {
    expect([t.colors.themeLabels[LIGHT], t.colors.themeLabels[DARK]]).toEqual(['Escala Light', 'Escala Dark'])
  })

  it('primary: Light 09 · 10 · 11 on the light page, Dark 10 · 11 · 12 on the dark page', () => {
    expect(['default', 'hover', 'pressed'].map((s) => role(`action.primary.${s}`, LIGHT))).toEqual([9, 10, 11].map((n) => prim(accent, n)))
    expect(['default', 'hover', 'pressed'].map((s) => role(`action.primary.${s}`, DARK))).toEqual([10, 11, 12].map((n) => prim(accent, n, true)))
    expect(role('content.on-action', LIGHT)).toBe(prim(accent, 1))
    expect(role('content.on-action', DARK)).toBe(prim(accent, 1, true))
  })

  it('links 11, focus 09, secondary pressed 06, inverse 12', () => {
    expect(role('content.link.default', LIGHT)).toBe(prim(accent, 11))
    expect(role('content.link.default', DARK)).toBe(prim(accent, 11, true))
    expect(role('border.focus', LIGHT)).toBe(prim(accent, 9))
    expect(role('border.focus', DARK)).toBe(prim(accent, 9, true))
    expect(role('action.secondary.pressed', LIGHT)).toBe(prim(gray, 6))
    expect(role('surface.inverse', DARK)).toBe(prim(gray, 12, true))
  })

  it('status solids: Light 09 · 10 · 11; Dark critical 08 · 07 · 06, success 09 · 10 · 11, warning / info 10 · 11 · 12', () => {
    const dark: Record<string, number[]> = { critical: [8, 7, 6], success: [9, 10, 11], warning: [10, 11, 12], info: [10, 11, 12] }
    for (const sev of SEVERITIES) {
      const fam = src[FAMILY[sev]]
      const solids = (theme: string) => ['', '-hover', '-pressed'].map((s) => role(`status.${sev}.surface-solid${s}`, theme))
      expect(solids(LIGHT), sev).toEqual([9, 10, 11].map((n) => prim(fam, n)))
      expect(solids(DARK), sev).toEqual(dark[sev].map((n) => prim(fam, n, true)))
      expect(role(`status.${sev}.on-solid`, LIGHT), sev).toBe(prim(accent, 1))
      // Critical stays light-inked in Dark; the others carry the dark page.
      expect(role(`status.${sev}.on-solid`, DARK), sev).toBe(sev === 'critical' ? prim(gray, 1) : prim(accent, 1, true))
      expect(role(`status.${sev}.surface`, DARK), sev).toBe(alpha(fam, 4, true))
      expect(role(`status.${sev}.surface-pressed`, LIGHT), sev).toBe(alpha(fam, 4))
    }
  })

  it('the control outline sits on the alpha ladder at 3:1 (Black α 07 / White α 06)', () => {
    expect([role('border.control', LIGHT), role('border.control-hover', LIGHT)]).toEqual([t.colors.primitiveAlpha['black-a-7'], t.colors.primitiveAlpha['black-a-8']])
    expect([role('border.control', DARK), role('border.control-hover', DARK)]).toEqual([t.colors.primitiveAlpha['white-a-6'], t.colors.primitiveAlpha['white-a-7']])
  })
})

describe('the default Escala system — dimensions and type', () => {
  const px = (v: string | undefined) => parseFloat(v ?? '')
  const radius = (role: string, vp?: 'tablet' | 'mobile') => px(t.radius[vp ? t.radiusRoleViewports[vp][role] : t.radiusRoles[role]])

  it('type scale ×0.875', () => {
    expect(Object.values(t.typography.sizes).map(px)).toEqual([11, 12, 14, 16, 18, 21, 26, 32, 42, 53, 63])
    expect(Object.values(t.typography.lineHeights).map(px)).toEqual([16, 18, 21, 25, 26, 28, 33, 39, 53, 63, 79])
    expect(Object.values(t.typography.letterSpacings).map(px)).toEqual([0, 0, 0, 0, -0.2, -0.3, -0.5, -0.6, -0.8, -1.1, -1.3])
  })

  it('radius: control 8 · action 12 · container 16 · overlay 16 · full, the same on every viewport', () => {
    for (const vp of [undefined, 'tablet', 'mobile'] as const) {
      expect(['control', 'action', 'container', 'overlay', 'pill'].map((r) => radius(r, vp)), vp ?? 'desktop').toEqual([8, 12, 16, 16, 9999])
    }
  })

  it('insets: control 12 everywhere, page 32 / 16 / 16, section 96 / 64 / 48; target-min 24 / 44 / 44; selectors 20 / 16', () => {
    const spacing = (role: string, vp?: 'tablet' | 'mobile') => {
      const own = vp ? t.spacingRoleViewports[vp]?.[role] : undefined
      const ref = t.spacingRoleRefs[role]
      const step = own ?? (vp ? t.spacingResponsive[ref]?.[vp] : undefined) ?? (vp ? undefined : t.spacingRoles[role]) ?? ref
      return px(t.spacing[step])
    }
    expect([undefined, 'tablet', 'mobile'].map((vp) => spacing('inset-control', vp as never))).toEqual([12, 12, 12])
    expect([undefined, 'tablet', 'mobile'].map((vp) => spacing('inset-page', vp as never))).toEqual([32, 16, 16])
    expect([undefined, 'tablet', 'mobile'].map((vp) => spacing('inset-section', vp as never))).toEqual([96, 64, 48])
    expect(t.sizeRoles['target-min']).toBe('xs')
    expect(t.sizeRoleViewports).toEqual({ tablet: { 'target-min': 'dimension-44' }, mobile: { 'target-min': 'dimension-44' } })
    expect(t.selectorRoles).toEqual({ control: 'dimension-20', compact: 'dimension-16' })
  })
})
