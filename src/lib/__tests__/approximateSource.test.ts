import { describe, expect, it } from 'vitest'
import { analyzeTokens } from '../tokenImport/analyze'
import { approximateSource, isSourceFile } from '../tokenImport/approximateSource'

const COMPONENT = `
export function Button() {
  return (
    <button style={{ background: '#7c3aed', color: '#ffffff' }}>
      Save
    </button>
  )
}
const page = '#fafafa'
const muted = '#6b7280'
const danger = '#ef4444'
const tint = '#ede9fe'
`.repeat(1) + '\n' + '#ede9fe '.repeat(12) + '\n' + '#7c3aed '.repeat(6) + '\n' + '#6b7280 '.repeat(4) + '\n' + '#ef4444 '.repeat(3)

describe('approximateSource', () => {
  it('seeds accent, neutral and error from colors the file actually uses', () => {
    const result = approximateSource(COMPONENT, 'Acme')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const colors = result.json.colors as Record<string, string>
    expect(colors.primary).toBe('#7c3aed')
    expect(colors.gray).toBe('#6b7280')
    expect(colors.red).toBe('#ef4444')
    expect(result.json.project).toBe('Acme')
  })

  it('lets a named CSS variable win its slot', () => {
    const css = `
      :root {
        --color-brand: #0f766e;
        --color-gray: #57534e;
      }
      .btn { background: #7c3aed; }
    `.repeat(8)
    const result = approximateSource(css)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const colors = result.json.colors as Record<string, string>
    expect(colors.primary).toBe('#0f766e')
    expect(colors.gray).toBe('#57534e')
    expect(result.seeds.find((s) => s.slot === 'primary')?.via).toBe('variable')
  })

  it('feeds the existing analyzer, which generates the accent ramp from that seed', () => {
    const result = approximateSource(`const brand = '#7c3aed'; const ink = '#111111';`)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const analyzed = analyzeTokens(result.json)
    expect(analyzed.ok).toBe(true)
    if (!analyzed.ok) return
    expect(analyzed.analysis.families.accent?.baseHex.toLowerCase()).toBe('#7c3aed')
    expect(analyzed.analysis.families.accent?.source).toBe('singleton')
  })

  it('reads a font-family declaration', () => {
    const result = approximateSource(`body { font-family: "IBM Plex Sans", sans-serif; color: #7c3aed; }`)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.json.fontFamily).toBe('IBM Plex Sans')
  })

  it('refuses a file with no readable colors', () => {
    const result = approximateSource(`export const label = 'Save'`)
    expect(result.ok).toBe(false)
  })

  it('skips dependencies and keeps source files', () => {
    expect(isSourceFile('src/Button.tsx')).toBe(true)
    expect(isSourceFile('node_modules/react/index.js')).toBe(false)
    expect(isSourceFile('public/logo.png')).toBe(false)
  })
})
