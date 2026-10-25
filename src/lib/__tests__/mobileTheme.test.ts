import { describe, expect, it } from 'vitest'
import { BRAND_SPECTRUM } from '../brandPalette'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { resolveThemeFoundations } from '../themeFoundations'
import { useDesignStore } from '../../store/useDesignStore'
import { matchRadiusRolePreset, matchSpacingMode } from '../layoutTokens'
import { inferTypeScaleMode } from '../typographyStandard'
import {
  FOLDED, QUICK_ACCENTS, SHEET_FONTS, THEME_SHEET_TABS,
  PREVIEW_VIEWS, readPreviewView, writePreviewView, stepIn, systemBrief, chromeFromRoles,
  LOCK_KEYS, SECTION_LOCKS, SHEET_SECTIONS, applyLocks, readLocks, shuffleSection, writeLocks, type LockKey,
  basePx, cssVarOf, cssVariables, readThemeSheet, roleContrast, sheetChoices,
  withAccent, withFont, withRadiusPreset, withSpacingMode, withTypeScale, writeThemeSheet,
} from '../mobileTheme'
import { FONT_PRESETS } from '../fontStack'
import { stylePreviewStore } from '../stylePreviewOverlay'
import { createShuffleDeck, nextShuffle } from '../randomTheme'
import type { ThemeStylePreset } from '../themePresets'

const core = THEME_STYLE_PRESETS.find((p) => p.id === 'core-minimal') ?? THEME_STYLE_PRESETS[0]
const base = resolveThemeFoundations(useDesignStore.getState(), 'light')

describe('sheet state in the URL', () => {
  it('reads an open tab and folds on anything else', () => {
    expect(readThemeSheet('?project=escala&sheet=radius')).toEqual({ open: true, tab: 'radius' })
    // `shape` was split into Radius and Spacing; an old link opens Radius.
    expect(readThemeSheet('?sheet=shape')).toEqual({ open: true, tab: 'radius' })
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
})

describe('preview page in the URL', () => {
  it('reads a known page, defaults to the first', () => {
    expect(readPreviewView('?view=forms')).toBe('forms')
    expect(readPreviewView('?view=nope')).toBe('account')
    expect(readPreviewView('')).toBe('account')
  })

  it('writes the page beside the sheet and locks, and drops the default', () => {
    expect(writePreviewView('?project=escala&sheet=type', 'status')).toBe('?project=escala&sheet=type&view=status')
    expect(writePreviewView('?project=escala&view=status', 'account')).toBe('?project=escala')
    expect(writePreviewView('?lock=font,radius', 'cards')).toBe('?lock=font,radius&view=cards')
  })

  it('round-trips every page and wraps with arrows', () => {
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

describe('copy prompt: the system brief', () => {
  const light = { 'action.primary.default': '#2c67dc', 'content.on-action': '#ffffff', 'surface.page': '#fcfcfd', 'content.primary': '#1c2024' }
  const dark = { 'action.primary.default': '#2c67dc', 'content.on-action': '#ffffff', 'surface.page': '#111113', 'content.primary': '#edeef0' }
  const input = {
    name: 'Core / Minimalist', light, dark, headingFont: 'Inter', bodyFont: 'Inter', basePx: 16,
    radius: 'Soft', spacing: null, css: ':root {\n  --color-surface-page: #fcfcfd;\n}', link: 'https://www.escalatokens.com/?remix=abc',
  }

  it('ships in the agent-context envelope, titled with the system', () => {
    const brief = systemBrief(input)
    expect(brief.startsWith('---\nscope: global\ntitle: Core / Minimalist')).toBe(true)
    expect(brief).toContain('format: agent-context/v1')
  })

  it('names roles by their real CSS variables (rule 7), dark only when it differs', () => {
    const brief = systemBrief(input)
    expect(brief).toContain('- Primary action: `var(--color-action-primary-default)` · #2c67dc\n')
    expect(brief).toContain('- Page: `var(--color-surface-page)` · #fcfcfd (dark #111113)')
    expect(brief).not.toContain('Success:')
  })

  it('carries type, shape, the CSS and the laptop link; skips what is unknown', () => {
    const brief = systemBrief(input)
    expect(brief).toContain('- Base size: 16px')
    expect(brief).toContain('- Radius: Soft')
    expect(brief).not.toContain('Spacing:')
    expect(brief).toContain('```css\n:root {')
    expect(brief).toContain('?remix=abc')
    expect(systemBrief({ ...input, link: null })).not.toContain('Open and edit')
  })
})

/** What the phone shows for a preset: its resolved foundations. */
const resolve = (preset: ThemeStylePreset) => resolveThemeFoundations(
  stylePreviewStore(useDesignStore.getState(), { preset, appearance: 'light' }, 'light'),
  'light',
)
/** A fixed sequence, so a failing case replays. */
const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }

describe('locks in the URL', () => {
  it('reads known names, drops the rest', () => {
    expect([...readLocks('?lock=font,accent,nope')].sort()).toEqual(['accent', 'font'])
    expect(readLocks('?sheet=type').size).toBe(0)
  })

  it('writes in a fixed order with plain commas, keeps other params, drops an empty set', () => {
    expect(writeLocks('?sheet=type', new Set<LockKey>(['spacing', 'accent']))).toBe('?sheet=type&lock=accent,spacing')
    expect(writeLocks('?sheet=type&lock=font', new Set())).toBe('?sheet=type')
  })
})

describe('applyLocks: the big Shuffle keeps what is locked', () => {
  // Start from a system with every pick moved off its default, so a lock that
  // does nothing would show.
  const start = withSpacingMode(withRadiusPreset(withTypeScale(withFont(withAccent(core, BRAND_SPECTRUM[3].hex), base, 'DM Sans'), base, 'spacious'), base, 'Pill'), base, 'airy')
  const startBase = resolve(start)
  const was = sheetChoices(startBase)

  it('each lock survives every curated style dealt whole', () => {
    for (const key of LOCK_KEYS) {
      for (const next of THEME_STYLE_PRESETS) {
        const out = applyLocks(next, resolve(next), start, startBase, new Set([key]))
        const now = sheetChoices(resolve(out))
        if (key === 'accent') expect(out.accent).toBe(start.accent)
        if (key === 'font') expect(now.font).toBe(was.font)
        if (key === 'scale') expect(now.typeScale).toBe(was.typeScale)
        if (key === 'radius') expect(now.radius).toBe(was.radius)
        if (key === 'spacing') expect(now.spacing).toBe(was.spacing)
      }
    }
  })

  it('no locks: the dealt system is untouched', () => {
    const next = THEME_STYLE_PRESETS[2]
    expect(applyLocks(next, resolve(next), start, startBase, new Set())).toBe(next)
  })
})

describe('shuffleSection: a section re-picks only its own choices', () => {
  const coreBase = resolve(core)

  it('every section maps to its locks', () => {
    expect(SHEET_SECTIONS.flatMap((s) => SECTION_LOCKS[s]).sort()).toEqual([...LOCK_KEYS].sort())
  })

  it('Type changes font and size, never the colour or shape; picks are from the sheet lists', () => {
    const rng = seeded(7)
    for (let i = 0; i < 30; i++) {
      const out = shuffleSection('type', core, coreBase, new Set(), rng)
      const now = sheetChoices(resolve(out))
      expect(out.accent).toBe(core.accent)
      expect(SHEET_FONTS.map((f) => f.family)).toContain(now.font)
      expect(now.font).not.toBe(sheetChoices(coreBase).font)
      expect(now.radius).toBe(sheetChoices(coreBase).radius)
      expect(now.spacing).toBe(sheetChoices(coreBase).spacing)
    }
  })

  it('Color picks a curated colour that is not the current one', () => {
    const rng = seeded(11)
    for (let i = 0; i < 30; i++) {
      const out = shuffleSection('color', core, coreBase, new Set(), rng)
      expect(BRAND_SPECTRUM.map((c) => c.hex)).toContain(out.accent)
      expect(out.accent.toLowerCase()).not.toBe(core.accent.toLowerCase())
    }
  })

  it('a lock inside the section holds, the other choice still moves', () => {
    const rng = seeded(3)
    for (let i = 0; i < 30; i++) {
      const out = shuffleSection('type', core, coreBase, new Set<LockKey>(['font']), rng)
      const now = sheetChoices(resolve(out))
      expect(now.font).toBe(sheetChoices(coreBase).font)
      expect(now.typeScale).not.toBe(sheetChoices(coreBase).typeScale)
    }
  })

  it('Radius and Spacing each move only their own choice', () => {
    const rng = seeded(9)
    for (let i = 0; i < 20; i++) {
      const r = sheetChoices(resolve(shuffleSection('radius', core, coreBase, new Set(), rng)))
      expect(r.radius).not.toBe(sheetChoices(coreBase).radius)
      expect(r.spacing).toBe(sheetChoices(coreBase).spacing)
      const sp = sheetChoices(resolve(shuffleSection('spacing', core, coreBase, new Set(), rng)))
      expect(sp.spacing).not.toBe(sheetChoices(coreBase).spacing)
      expect(sp.radius).toBe(sheetChoices(coreBase).radius)
    }
  })

  it('a fully locked section returns the same preset', () => {
    expect(shuffleSection('type', core, coreBase, new Set<LockKey>(['font', 'scale']))).toBe(core)
  })
})

describe('style picker: a shuffle that stays inside one style', () => {
  it('every spin keeps the scaffold and never deals a style whole', () => {
    const deck = createShuffleDeck()
    const target = THEME_STYLE_PRESETS[3]
    const rng = seeded(5)
    for (let i = 0; i < 20; i++) {
      const recipe = nextShuffle({ accent: core.accent, scaffold: target.id, deck, rng })
      expect(recipe.scaffoldId).toBe(target.id)
      expect(recipe.styleId).toBeUndefined()
    }
  })

  it('without a style the deck still deals styles first', () => {
    const recipe = nextShuffle({ accent: core.accent, deck: createShuffleDeck() })
    expect(recipe.styleId).toBe(THEME_STYLE_PRESETS[0].id)
  })
})

describe('the home in the shuffled system', () => {
  it('maps the system roles onto the chrome variables index.css documents', () => {
    const vars = chromeFromRoles({
      'surface.page': '#08161a', 'surface.layer-1': '#172124', 'content.primary': '#bdedfd',
      'action.primary.default': '#06aed4', 'content.on-action': '#2b3538', 'border.subtle': '#ffffff26',
    }, 'Inter')
    expect(vars['--app']).toBe('#08161a')
    expect(vars['--surface']).toBe('#172124')
    expect(vars['--fg']).toBe('#bdedfd')
    expect(vars['--line']).toBe('#ffffff26')
    expect(vars['--rainbow-fill-a']).toBe('#06aed4')
    expect(vars['--rainbow-ink']).toBe('#2b3538')
    expect(vars['font-family']).toBe("'Inter', system-ui, sans-serif")
  })

  it('leaves out what the system does not resolve, never guesses', () => {
    const vars = chromeFromRoles({ 'surface.page': '#ffffff' })
    expect(Object.keys(vars)).toEqual(['--app', '--canvas', '--nav'])
  })
})
