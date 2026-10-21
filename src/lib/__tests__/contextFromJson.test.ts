import { beforeAll, describe, expect, it } from 'vitest'
import { pluginPayload } from '../contextSource'
import { agentContextFromJSON, contextModes, narrowToMode } from '../agentBundle/contextFromJson'
import { FIGMA_CONTEXT_FENCE } from '../escalaPayloadFence'
import type { TokenJSON } from '../agentBundle/types'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'

let json: TokenJSON

beforeAll(async () => {
  useDesignStore.setState(makeDesignDefaults())
  const { adoptPreset } = await import('../adoptPreset')
  const { THEME_STYLE_PRESETS } = await import('../themePresets')
  const adopted = adoptPreset(THEME_STYLE_PRESETS[0], 'light')
  if ('error' in adopted) throw new Error(adopted.error)
  // The payload the plugin holds: one column per brand theme.
  json = pluginPayload(useDesignStore.getState(), adopted.key, 'both') as unknown as TokenJSON
})

const fenced = (md: string): TokenJSON | null => {
  const m = new RegExp('```' + FIGMA_CONTEXT_FENCE + '\\n([\\s\\S]*?)\\n```').exec(md)
  return m ? JSON.parse(m[1]) : null
}

describe('plugin context hub (contextFromJson)', () => {
  it('lists the payload\'s modes with readable labels', () => {
    const modes = contextModes(json)
    expect(modes.length).toBeGreaterThanOrEqual(2)
    expect(modes.some((m) => / Dark$/.test(m.label))).toBe(true)
    for (const m of modes) expect(m.label).not.toMatch(/--|::/)
  })

  it('one mode keeps one Color Semantics column and drops the other appearance\'s ramps', () => {
    const light = contextModes(json).find((m) => m.key.endsWith('light'))!.key
    const n = narrowToMode(json, light)
    expect(n.colors.themeOrder).toEqual([light])
    for (const roles of Object.values(n.colors.architecture?.tokens ?? {})) {
      for (const byMode of Object.values(roles)) expect(Object.keys(byMode)).toEqual([light])
    }
    expect(Object.keys(n.colors.primitive ?? {}).some((k) => /-dark-\d+$/.test(k))).toBe(false)
  })

  it('All foundations ends with an importable JSON narrowed to the chosen mode', () => {
    const dark = contextModes(json).find((m) => m.key.endsWith('dark'))!.key
    const md = agentContextFromJSON(json, { scope: 'all', mode: dark, detail: 'tokens' })
    expect(fenced(md)?.colors.themeOrder).toEqual([dark])
    expect(fenced(agentContextFromJSON(json, { scope: 'all', mode: 'all', detail: 'full' }))?.colors.themeOrder).toEqual(json.colors.themeOrder)
  })

  it('a single foundation stays light: no JSON, only its sections', () => {
    const md = agentContextFromJSON(json, { scope: 'radius', mode: 'all', detail: 'tokens' })
    expect(fenced(md)).toBeNull()
    expect(md).toContain('## Radius')
    expect(md).not.toContain('## Color ')
    expect(md.length).toBeLessThan(agentContextFromJSON(json, { scope: 'all', mode: 'all', detail: 'tokens' }).length / 5)
  })
})
