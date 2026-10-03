import { describe, expect, it } from 'vitest'
import {
  BREAKPOINT_STANDARD,
  GRID_FRAME_STANDARD,
  GRID_VIEWPORTS,
  SPACING_STANDARD,
  extractBreakpoints,
  resolveGridFrame,
  resolveGridStyles,
  restandardGrid,
  type GridViewport,
} from '../layoutTokens'
import { freeFigmaScope } from '../freeFigmaScope'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { generateTokenJSON } from '../tokenGenerator'

// Dimension Semantics ships one Figma mode per viewport, and Grid/* is the
// group whose value differs per mode. Each mode IS one of the six named grid
// styles: Desktop = XL Desktop, Tablet = MD Tablet, Mobile = SM Mobile.
const MODES: Record<GridViewport, { columns: number; gutter: string; margin: string; container: string }> = {
  desktop: { columns: 12, gutter: '32px', margin: '32px', container: '1280px' },
  tablet: { columns: 8, gutter: '32px', margin: '32px', container: 'none' },
  mobile: { columns: 4, gutter: '16px', margin: '16px', container: 'none' },
}

// The six named styles, as the reference spec sheet draws them. Every row
// adds up: columns × column + (columns − 1) × gutter + 2 × margin + sidebar.
const STYLES = [
  { key: '2xl-desktop', columns: 12, column: 80, gutter: 32, margin: 64, width: 1440 },
  { key: 'xl-desktop', columns: 12, column: 72, gutter: 32, margin: 32, width: 1280 },
  { key: 'xl-desktop-sidebar', columns: 12, column: 64, gutter: 24, margin: 32, width: 1440, sidebar: 344 },
  { key: 'lg-web', columns: 12, column: 48, gutter: 32, margin: 48, width: 1024 },
  { key: 'md-tablet', columns: 8, column: 60, gutter: 32, margin: 32, width: 768 },
  { key: 'sm-mobile', columns: 4, column: 60, gutter: 16, margin: 16, width: 320 },
]

const pick = ({ key, columns, column, gutter, margin, width, sidebar }: ReturnType<typeof resolveGridStyles>[number]) =>
  ({ key, columns, column, gutter, margin, width, ...(sidebar ? { sidebar } : {}) })

describe('Grid per viewport and the six named styles', () => {
  it('the default system resolves each mode to its style', () => {
    for (const vp of GRID_VIEWPORTS) {
      expect(resolveGridFrame(vp, GRID_FRAME_STANDARD, SPACING_STANDARD, BREAKPOINT_STANDARD)).toEqual(MODES[vp])
    }
  })

  it('the six styles match the reference and add up to their frame', () => {
    const styles = resolveGridStyles(GRID_FRAME_STANDARD, SPACING_STANDARD, BREAKPOINT_STANDARD)
    expect(styles.map(pick)).toEqual(STYLES)
    for (const s of styles) {
      expect(s.columns * s.column + (s.columns - 1) * s.gutter + 2 * s.margin + (s.sidebar ?? 0)).toBe(s.width)
    }
  })

  it.each(THEME_STYLE_PRESETS.map((p) => [p.id, p] as const))(
    '%s keeps the standard grid whatever its spacing base',
    (_id, preset) => {
      const f = preset.foundations
      const spacing = f.spacing ?? SPACING_STANDARD
      const bps = extractBreakpoints(f.grid ?? {})
      for (const vp of GRID_VIEWPORTS) expect(resolveGridFrame(vp, f.gridFrame, spacing, bps)).toEqual(MODES[vp])
      expect(resolveGridStyles(f.gridFrame, spacing, bps).map(pick)).toEqual(STYLES)
    },
  )

  it('tokens.json ships a style only when its viewport ships', () => {
    type Doc = { viewports: string[]; gridStyles: { key: string }[] }
    const all = generateTokenJSON() as unknown as Doc
    expect(all.viewports).toEqual(['desktop', 'tablet', 'mobile'])
    expect(all.gridStyles.map((s) => s.key)).toEqual(STYLES.map((s) => s.key))
    const desktop = generateTokenJSON(undefined, { viewports: ['desktop'] }) as unknown as Doc
    expect(desktop.gridStyles.map((s) => s.key)).toEqual(['2xl-desktop', 'xl-desktop', 'xl-desktop-sidebar', 'lg-web'])
  })

  it('the free tier ships Desktop and XL Desktop only', () => {
    const doc = generateTokenJSON(undefined, freeFigmaScope(undefined, ['light', 'dark'], {}, {})) as unknown as {
      viewports: string[]; gridStyles: { key: string }[]
    }
    expect(doc.viewports).toEqual(['desktop'])
    expect(doc.gridStyles.map((s) => s.key)).toEqual(['xl-desktop'])
  })
})

describe('store v76 migration', () => {
  it('moves a frame still on the old default, and leaves a hand-set one alone', () => {
    const persisted = {
      spacing: { ...SPACING_STANDARD },
      grid: { columns: '12', gutter: '24px', margin: '32px', container: '1280px', 'breakpoint-2xl': '1536px' },
      gridFrame: {
        desktop: { columns: '12', gutter: '6', margin: '8', container: 'xl' },
        tablet: { columns: '8', gutter: '6', margin: '6', container: 'none' },
        mobile: { columns: '4', gutter: '5', margin: '4', container: 'none' },
      },
    }
    restandardGrid(persisted, persisted.spacing)
    const out = persisted
    expect(out.gridFrame.desktop).toEqual(GRID_FRAME_STANDARD.desktop)
    expect(out.gridFrame.tablet).toEqual(GRID_FRAME_STANDARD.tablet)
    expect(out.gridFrame.mobile.gutter).toBe('5')
    expect(out.grid.gutter).toBe('32px')
    expect(out.grid['breakpoint-2xl']).toBe('1440px')
  })
})
