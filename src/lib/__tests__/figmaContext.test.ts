import { describe, expect, it } from 'vitest'
import { extractEscalaPayload, figmaContextMarkdown } from '../figmaContext'

describe('Figma agent context', () => {
  const json = JSON.stringify({ schemaVersion: 7, project: 'Acme', colors: { primitive: {} } })
  const text = figmaContextMarkdown({ project: 'Acme', brandLines: ['Acme (Light + Dark)'], viewports: ['Desktop', 'Mobile'], json })

  it('carries the scope it ships in prose for people and agents', () => {
    expect(text).toContain('Agent Context')
    expect(text).toContain('Brands: Acme (Light + Dark)')
    expect(text).toContain('Viewports: Desktop · Mobile')
  })

  it('round-trips the payload through the reader the plugin mirrors', () => {
    expect(JSON.parse(extractEscalaPayload(text))).toEqual(JSON.parse(json))
  })

  it('accepts a bare JSON paste and a plain json fence', () => {
    expect(extractEscalaPayload(`  ${json}\n`)).toBe(json)
    expect(extractEscalaPayload('intro\n```json\n' + json + '\n```\n')).toBe(json)
  })
})
