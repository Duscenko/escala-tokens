// Docs · Color must follow the role table (CATEGORICAL_ROLES). Its sections render the
// live projection, but its PROSE was hand-typed and drifted for months: "Sixteen roles
// resolve to a translucent primitive" (35 by 2026-11-17), five groups named where six
// exist, and no Elevation section — its four roles were counted in the badge but never
// shown. Anyone adding, renaming or moving a role must keep this file green.
import { describe, expect, it } from 'vitest'
import { FOUNDATION_DOCS, COLOR_ROLE_GROUPS } from '../../components/configurator/docs/foundationDocs'
import { categoricalRoleCatalogue, buildArchitectureView } from '../semanticArchitectures'
import { brandAppearanceProjection, generateTokenJSON } from '../tokenGenerator'
import { useDesignStore } from '../../store/useDesignStore'
import { buildStudioTokens } from '../pluginStudio'
import { FIGMA_FILE_PALETTE, applyFigmaFilePalette } from '../figmaFilePalette'

const color = FOUNDATION_DOCS.find((d) => d.key === 'color')!
const prose = [color.lead, color.why, color.usage, ...color.sections.map((s) => s.description ?? '')].join('\n')

describe('Docs · Color follows the role table', () => {
  it('has one section per categorical group, in table order', () => {
    const ids = color.sections.map((s) => s.id).filter((id) => COLOR_ROLE_GROUPS.includes(id))
    expect(ids).toEqual(COLOR_ROLE_GROUPS)
  })

  it('names every group in its lead', () => {
    for (const g of COLOR_ROLE_GROUPS) expect(color.lead).toContain(g[0].toUpperCase() + g.slice(1))
  })

  it('states the translucent-role count the table actually has', () => {
    const rows = categoricalRoleCatalogue()
    const alpha = rows.filter((r) => /-a\./.test(r.light) || /-a\./.test(r.dark)).length
    expect(color.usage).toContain(`${alpha} of the ${rows.length} roles`)
  })

  it('never spells a role count out in words (it cannot follow the table)', () => {
    expect(prose).not.toMatch(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)[- ]?(\w+ )?roles\b/i)
  })

  it('mentions every focus ring role by name', () => {
    const rings = categoricalRoleCatalogue().filter((r) => /(^|\.)ring(\.|$)/.test(r.key)).map((r) => `${r.group}.${r.key}`)
    for (const id of rings) expect(prose).toContain(id)
  })
})

describe('Docs · Color reads one brand in Light AND Dark', () => {
  // Storybook's Variables › Color (one brand) showed the Light value in its Dark
  // column for every role: the brand key alone resolves only its own kind.
  it('has a Dark column that is the Dark export, not a copy of Light', () => {
    // The system Storybook documents (apps/storybook/.storybook/escalaSystem.ts).
    buildStudioTokens({ accent: FIGMA_FILE_PALETTE.accent, name: 'Escala' }, 'pro')
    const s0 = useDesignStore.getState()
    const theme = s0.themeOrder.find((k) => s0.themeSources?.[k]) ?? s0.themeOrder[0]
    applyFigmaFilePalette(theme)
    const store = useDesignStore.getState()
    const p = brandAppearanceProjection(store, theme)!
    const view = buildArchitectureView('categorical', p.input, store.errorColor, p.overrides, p.order)!
    const json = generateTokenJSON(store, { modes: [{ theme, appearance: 'light' }, { theme, appearance: 'dark' }] }) as unknown as {
      colors: { architecture: { tokens: Record<string, Record<string, Record<string, string>>> } }
    }
    const shipped = json.colors.architecture.tokens
    let differs = 0
    for (const cat of view.categories) for (const tk of cat.tokens) {
      const l = tk.modes[p.lightKey]?.css, d = tk.modes[p.darkKey]?.css
      if (l !== d) differs++
      expect(d?.toLowerCase(), `${cat.key}.${tk.key} dark`).toBe(shipped[cat.key][tk.key][p.darkKey]?.toLowerCase())
      expect(l?.toLowerCase(), `${cat.key}.${tk.key} light`).toBe(shipped[cat.key][tk.key][p.lightKey]?.toLowerCase())
    }
    expect(differs).toBeGreaterThan(40)
  })
})
