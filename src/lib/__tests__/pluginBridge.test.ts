import { describe, expect, it, vi, afterEach } from 'vitest'
import { bridgePayload, studioChoicesOf } from '../pluginBridge'
import { adoptBridgedProject } from '../pluginBridgeOpen'
import { useDesignStore } from '../../store/useDesignStore'

const ID = 'esc_7K2M-9QX4-N3PD'

afterEach(() => {
  vi.unstubAllGlobals()
  useDesignStore.setState({ publishId: '' })
})

describe('plugin bridge payload', () => {
  it('keeps the choices and drops a licence stamp', () => {
    const out = bridgePayload({
      name: 'Test 1',
      tokens: {
        project: 'test-1',
        colors: { primitive: { 'accent-9': '#9522e9' } },
        studio: { accent: '#9522e9', name: 'Test 1' },
        escalaLicence: { until: null, sealed: '2020-01-01T00:00:00.000Z' },
      },
    })
    expect('error' in out).toBe(false)
    if ('error' in out) return
    expect(out.name).toBe('Test 1')
    expect(out.tokens.studio).toEqual({ accent: '#9522e9', name: 'Test 1' })
    expect(out.tokens.escalaLicence).toBeUndefined()
    expect(studioChoicesOf(out.tokens)?.accent).toBe('#9522e9')
  })

  it('refuses a payload with no colors', () => {
    expect(bridgePayload({ tokens: { project: 'x' } })).toEqual({ error: 'Missing "colors" field in tokens.' })
    expect(studioChoicesOf({ colors: {} })).toBeNull()
  })
})

describe('opening a bridged theme', () => {
  it('rebuilds the editor onto the publish id the plugin is polling', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return { ok: true, status: 200, json: async () => ({ ok: true }) }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          project: 'Test 1',
          colors: { primitive: {} },
          studio: { accent: '#9522e9', name: 'Test 1' },
        }),
      }
    }))
    const opened = await adoptBridgedProject(ID)
    expect(opened).toBe(true)
    expect(useDesignStore.getState().publishId).toBe(ID)
    expect(useDesignStore.getState().projectName).toBe('Test 1')
  })

  it('leaves the editor alone when the blob has no choices', async () => {
    useDesignStore.setState({ publishId: '', projectName: 'Escala' })
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ project: 'Other', colors: { primitive: {} } }),
    })))
    expect(await adoptBridgedProject(ID)).toBe(false)
    expect(useDesignStore.getState().publishId).toBe('')
    expect(useDesignStore.getState().projectName).toBe('Escala')
  })
})
