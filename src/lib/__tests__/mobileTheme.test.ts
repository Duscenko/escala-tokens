import { describe, expect, it } from 'vitest'
import { BRAND_SPECTRUM } from '../brandPalette'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { resolveThemeFoundations } from '../themeFoundations'
import { useDesignStore } from '../../store/useDesignStore'
import { matchRadiusRolePreset, matchSpacingMode } from '../layoutTokens'
import { inferTypeScaleMode } from '../typographyStandard'
import {
  FOLDED, QUICK_ACCENTS, SHEET_FONTS, THEME_SHEET_TABS,
  PREVIEW_VIEWS, readPreviewView, writePreviewView, stepIn,
  basePx, cssVarOf, cssVariables, readThemeSheet, roleContrast, sheetChoices, stepTab,
  withAccent, withFont, withRadiusPreset, withSpacingMode, withTypeScale, writeThemeSheet,
} from '../mobileTheme'
import { FONT_PRESETS } from '../fontStack'

const core = THEME_STYLE_PRESETS.find((p) => p.id === 'core-minimal') ?? THEME_STYLE_PRESETS[0]
const base = resolveThemeFoundations(useDesignStore.getState(), 'light')

describe('sheet state in the URL', () => {
  it('reads an open tab and folds on anything else', () => {
    expect(readThemeSheet('?project=escala&sheet=shape')).toEqual({ open: true, tab: 'shape' })
    expect(readThemeSheet('?project=escala')).toEqual(FOLDED)
    expect(readThemeSheet('?sheet=nope')).toEqual(FOLDED)
  })

  it('writes the sheet and keeps every other param', () => {
    expect(writeThemeSheet('?project=escala&section=about', { open: true, tab: 'type' }))
      .toBe('?project=escala&section=about&sheet=type')
    expect(writeThemeSheet('?project=escala&sheet=type', FOLDED)).toBe('?project=escala')
    expect(writeThemeSheet('?sheet=type', FOLDED)).toBe('')
  })

  it('round-trips every tab', () => {
    for (const tab of THEME_SHEET_TABS) expect(readThemeSheet(writeThemeSheet('', { open: true, tab }))).toEqual({ open: true, tab })
  })

  it('moves between tabs with arrows, Home and End, wrapping', () => {
    expect(stepTab('color', 'ArrowRight')).toBe('type')
    expect(stepTab('color', 'ArrowLeft')).toBe('export')
    expect(stepTab('shape', 'Home')).toBe('color')
    expect(stepTab('type', 'End')).toBe('export')
    expect(stepTab('type', 'Enter')).toBeNull()
  })
})

describe('preview view in the URL', () => {
  it('reads a known view, defaults to the first', () => {
    expect(readPreviewView('?view=forms')).toBe('forms')
    expect(readPreviewView('?view=nope')).toBe('account')
    expect(readPreviewView('')).toBe('account')
  })

  it('writes the view beside the sheet, and drops the default', () => {
    expect(writePreviewView('?project=escala&sheet=type', 'status')).toBe('?project=escala&sheet=type&view=status')
    expect(writePreviewView('?project=escala&view=status', 'account')).toBe('?project=escala')
  })

  it('round-trips every view and wraps with arrows', () => {
    for (const v of PREVIEW_VIEWS) expect(readPreviewView(writePreviewView('', v))).toBe(v)
    expect(stepIn(PREVIEW_VIEWS, 'navigation', 'ArrowRight')).toBe('account')
    expect(stepIn(PREVIEW_VIEWS, 'account', 'ArrowLeft')).toBe('navigation')
  })
})

describe('choices come from the curated lists', () => {
  it('quick accents are six brand presets, no free hex', () => {
    expect(QUICK_ACCENTS).toHaveLength(6)
    for (const c of QUICK_ACCENTS) expect(BRAND_SPECTRUM).toContainEqual(c)
  })

  it('every sheet font is a font preset', () => {
    for (const f of SHEET_FONTS) expect(FONT_PRESETS.some((p) => p.value === f.family)).toBe(true)
  })

  it('base sizes step 14 → 16 → 18', () => {
    expect(basePx('default')).toBe(16)
    expect(basePx('compact')).toBeLessThan(basePx('default'))
    expect(basePx('spacious')).toBeGreaterThan(basePx('default'))
  })
})

describe('edits write the fields the desktop reads back', () => {
  it('accent', () => {
    expect(withAccent(core, '#fb542b').accent).toBe('#fb542b')
  })

  it('font sets body and headings', () => {
    const t = withFont(core, base, 'Geist').foundations.typography
    expect(t?.fontFamily).toBe('Geist')
    expect(t?.headingFontFamily).toBe('Geist')
  })

  it('type scale is read back as the same mode', () => {
    const next = withTypeScale(core, base, 'spacious')
    expect(inferTypeScaleMode(next.foundations.typography?.sizes)).toBe('spacious')
  })

  it('radius preset is read back as the same preset', () => {
    for (const label of ['Sharp', 'Soft', 'Rounded', 'Pill']) {
      expect(matchRadiusRolePreset(withRadiusPreset(core, base, label).foundations.radiusRoles)).toBe(label)
    }
  })

  it('spacing mode is read back as the same mode', () => {
    for (const id of ['compact', 'quiet', 'airy', 'bold'] as const) {
      const f = withSpacingMode(core, base, id).foundations
      expect(matchSpacingMode(f.sizes, f.spacingRoles, f.stroke)).toBe(id)
    }
  })

  it('sheetChoices lights up what the edits wrote', () => {
    let p = withRadiusPreset(core, base, 'Pill')
    p = withSpacingMode(p, base, 'airy')
    p = withFont(p, base, 'Inter')
    const choices = sheetChoices({ ...base, ...p.foundations })
    expect(choices).toMatchObject({ font: 'Inter', radius: 'Pill', spacing: 'airy' })
  })
})

describe('role contrast', () => {
  const roles = {
    'action.primary.default': '#2970ff',
    'content.on-action': '#ffffff',
    'content.secondary': '#535862',
    'surface.page': '#ffffff',
    'status.success.content': '#067647',
    'status.critical.content': '#d92d20',
    'status.warning.content': '#b54708',
    'status.info.content': '#175cd3',
  }

  it('lists all six roles, Info included', () => {
    expect(roleContrast(roles).map((r) => r.id)).toEqual(['accent', 'neutral', 'success', 'critical', 'warning', 'info'])
  })

  it('a pale label on a pale fill fails', () => {
    const [accent] = roleContrast({ ...roles, 'action.primary.default': '#a5c4ff' })
    expect(accent.verdict.pass).toBe(false)
  })

  it('leaves out a role it cannot measure', () => {
    expect(roleContrast({ ...roles, 'status.info.content': '' }).map((r) => r.id)).not.toContain('info')
  })
})

describe('css export', () => {
  it('names variables by rule 7 and splits light / dark', () => {
    expect(cssVarOf('action.primary.default')).toBe('--color-action-primary-default')
    const css = cssVariables({
      light: { 'action.primary.default': '#2970ff' },
      dark: { 'action.primary.default': '#4d8bff' },
      fontFamily: 'Inter',
      radiusRoles: { action: 'lg' },
      radius: { lg: '8px' },
    })
    expect(css).toContain(':root {\n  --font-family-body: \'Inter\'')
    expect(css).toContain('  --radius-action: 8px;')
    expect(css).toContain('  --color-action-primary-default: #2970ff;')
    expect(css).toContain('.dark {\n  --color-action-primary-default: #4d8bff;')
  })

  it('leads with the primary action, then the rest A→Z', () => {
    const css = cssVariables({ light: { 'action.ghost.default': '#0000', 'surface.page': '#fff', 'action.primary.default': '#2970ff' }, dark: {} })
    const names = css.split('\n').filter((l) => l.includes('--color-')).map((l) => l.trim().split(':')[0])
    expect(names).toEqual(['--color-action-primary-default', '--color-surface-page', '--color-action-ghost-default'])
  })
})
