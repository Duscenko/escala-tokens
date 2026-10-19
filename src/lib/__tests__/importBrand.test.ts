import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'
import { generateTokenJSON } from '../tokenGenerator'
import { figmaContextMarkdown } from '../figmaContext'
import { addBrandFromPayload, readBrandPayload } from '../importBrand'
import { generateColorScale, generateFamilyDarkScale } from '../colorUtils'

// A system with a green accent, exported the way another Escala user hands it out.
const GREEN = '#15803d'
function otherSystemJson(): Record<string, unknown> {
  const d = makeDesignDefaults()
  return generateTokenJSON({
    ...d,
    projectName: 'Acme',
    primaryColor: GREEN,
    primaryScale: generateColorScale(GREEN, d.colorAlgorithm, d.contrastShift, d.pageBackground),
    primaryDarkScale: generateFamilyDarkScale(GREEN, d.colorAlgorithm, d.contrastShift, d.darkBackground),
  } as never) as unknown as Record<string, unknown>
}

describe('add a brand from another Escala system', () => {
  let json: Record<string, unknown>
  beforeEach(() => {
    json = otherSystemJson()
    useDesignStore.setState(makeDesignDefaults())
  })

  it('reads a bare tokens.json', () => {
    const read = readBrandPayload(JSON.stringify(json), 'json')
    expect(read.ok).toBe(true)
  })

  it('reads the Figma Copy context paste', () => {
    const text = figmaContextMarkdown({ project: 'Acme', brandLines: ['Acme'], viewports: ['Desktop'], json: JSON.stringify(json) })
    const read = readBrandPayload(text, 'context')
    expect(read.ok).toBe(true)
  })

  it('refuses prose and W3C tokens with a message', () => {
    const prose = readBrandPayload('# Escala — color tokens\nUse action.primary.default', 'context')
    expect(prose.ok).toBe(false)
    const w3c = readBrandPayload('{"color":{"a":{"$value":"#fff","$type":"color"}}}', 'json')
    expect(w3c.ok).toBe(false)
    if (!w3c.ok) expect(w3c.error).toMatch(/W3C/)
  })

  it('mints the payload as a new brand, keeping the system on screen', () => {
    const before = useDesignStore.getState()
    const projectBefore = before.projectName
    const orderBefore = before.themeOrder.length
    const read = readBrandPayload(JSON.stringify(json), 'json')
    if (!read.ok) throw new Error(read.error)
    const res = addBrandFromPayload(read.json, read.name)
    expect('error' in res).toBe(false)
    if ('error' in res) return
    const after = useDesignStore.getState()
    expect(after.projectName).toBe(projectBefore)
    expect(after.themeOrder.length).toBe(orderBefore + 1)
    expect(after.themeFoundations?.[res.key]?.typography).toBeTruthy()
    // The brand is the payload's colour, not the system it lands in.
    const brandKey = after.themeSources[res.key].brand
    const family = after.customColors.find((c) => c.key === brandKey)
    expect((family?.base ?? '').toLowerCase()).toBe(GREEN)
    expect(after.themeLabels[res.key]).toBe('Acme')
  })
})
