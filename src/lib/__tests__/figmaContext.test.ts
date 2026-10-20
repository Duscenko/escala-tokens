import { describe, expect, it } from 'vitest'
import { extractEscalaPayload, figmaContextMarkdown } from '../figmaContext'

describe('Figma agent context', () => {
  const json = JSON.stringify({ schemaVersion: 7, project: 'Acme', colors: { primitive: {} } })
  const text = figmaContextMarkdown({ project: 'Acme', brandLines: ['Acme (Light + Dark)'], viewports: ['Desktop', 'Mobile'], json })

  it('ships as agent-context/v1 with the scope the page checked', () => {
    expect(text).toContain('format: agent-context/v1')
    expect(text).toContain('source: escala-tokens')
    expect(text).toContain('# Agent context — Acme')
    expect(text).toContain('context card (⌘V) → Import into this file')
    expect(text).toContain('Brands: Acme (Light + Dark)')
    expect(text).toContain('Viewports: Desktop · Mobile')
    expect(text).toContain('```json escala-tokens')
  })

  it('round-trips the payload through the reader the plugin mirrors', () => {
    expect(JSON.parse(extractEscalaPayload(text))).toEqual(JSON.parse(json))
  })

  it('prefers the escala-tokens fence when a plain json fence also exists', () => {
    const decoy = JSON.stringify({ not: 'ours' })
    const mixed = `intro\n\`\`\`json\n${decoy}\n\`\`\`\n\n\`\`\`json escala-tokens\n${json}\n\`\`\`\n`
    expect(JSON.parse(extractEscalaPayload(mixed))).toEqual(JSON.parse(json))
  })

  it('accepts a bare JSON paste and a plain json fence', () => {
    expect(extractEscalaPayload(`  ${json}\n`)).toBe(json)
    expect(extractEscalaPayload('intro\n```json\n' + json + '\n```\n')).toBe(json)
  })
})
