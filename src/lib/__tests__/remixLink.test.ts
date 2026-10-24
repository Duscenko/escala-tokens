import { describe, expect, it } from 'vitest'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { randomTheme, stylePreviewFromRecipe } from '../randomTheme'
import { applyShuffleLocks } from '../shuffleLocks'
import { applyMergePatch, createMergePatch, decodeRemix, encodeRemix, remixUrl } from '../remixLink'

/** A seeded rng, so the random looks are the same every run. */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}

const core = THEME_STYLE_PRESETS[0]
const randomLook = (seed: number) => {
  const recipe = randomTheme({ accent: core.accent, rng: seeded(seed) })
  return stylePreviewFromRecipe({ preset: core, appearance: 'light' }, recipe, 'light').preset
}

/** Re-encode a raw payload, to test what a hand-made link decodes to. */
async function codeFor(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  const out = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  const packed = new Uint8Array(await new Response(out).arrayBuffer())
  let bin = ''
  for (const b of packed) bin += String.fromCharCode(b)
  return `1.${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}

describe('merge patch', () => {
  it('round-trips, including removed keys', () => {
    const a = { x: 1, y: { z: 'a', w: 'b' }, gone: true }
    const b = { x: 2, y: { z: 'a' }, added: ['q'] }
    expect(applyMergePatch(a, createMergePatch(a, b)!)).toEqual(b)
    expect(createMergePatch(a, a)).toBeUndefined()
  })
})

describe('remix link', () => {
  it('a whole System Style is just its id, and opens as that style', async () => {
    for (const style of THEME_STYLE_PRESETS) {
      const code = await encodeRemix(style)
      expect(code.length).toBeLessThan(48)
      const out = await decodeRemix(code)
      expect(out).toEqual({ preset: style, whole: true })
    }
  })

  it('a random look survives the trip exactly, in a link short enough to share', async () => {
    for (const seed of [1, 2, 3, 42, 99]) {
      const look = randomLook(seed)
      const code = await encodeRemix(look)
      expect(code.length).toBeLessThan(1200)
      const out = await decodeRemix(code)
      expect(out?.whole).toBe(false)
      expect(out?.preset).toEqual(look)
    }
  })

  it('a locked mix of two styles survives too', async () => {
    const retro = THEME_STYLE_PRESETS.find((p) => p.id === 'retro-vintage')!
    const mix = applyShuffleLocks(randomLook(7), retro, new Set(['color', 'shape']))
    expect((await decodeRemix(await encodeRemix(mix)))?.preset).toEqual(mix)
  })

  it('builds the public URL', () => {
    expect(remixUrl('1.abc')).toBe('https://www.escalatokens.com/?remix=1.abc')
  })

  it('refuses what it cannot read safely', async () => {
    const base = { b: core.id }
    expect(await decodeRemix('2.abc')).toBeNull()
    expect(await decodeRemix('1.***')).toBeNull()
    expect(await decodeRemix('1.' + 'a'.repeat(7000))).toBeNull()
    expect(await decodeRemix(await codeFor({ b: 'not-a-style' }))).toBeNull()
    // A font outside the catalogue (it would be fetched from Google Fonts).
    expect(await decodeRemix(await codeFor({ ...base, p: { foundations: { typography: { fontFamily: 'Evil Font' } } } }))).toBeNull()
    // A value that could end a CSS declaration.
    expect(await decodeRemix(await codeFor({ ...base, p: { foundations: { radiusRoles: { action: '4px; background:url(x)' } } } }))).toBeNull()
    // A field the preset does not carry, and a foundation that does not exist.
    expect(await decodeRemix(await codeFor({ ...base, p: { label: 'Mine' } }))).toBeNull()
    expect(await decodeRemix(await codeFor({ ...base, p: { foundations: { script: { a: 'b' } } } }))).toBeNull()
    // A colour that is not a hex.
    expect(await decodeRemix(await codeFor({ ...base, p: { accent: 'red' } }))).toBeNull()
  })
})
