import { beforeEach, describe, expect, it } from 'vitest'
import { makeDesignDefaults, useDesignStore, type DesignSnapshot } from '../../store/useDesignStore'
import { adoptPreset } from '../adoptPreset'
import { THEME_STYLE_PRESETS } from '../themePresets'
import { captureCodeSnapshot } from '../codeScope'
import { buildCSS } from '../exporters'
import { generateTokenJSON } from '../tokenGenerator'
import { defaultFigmaSyncModes } from '../figmaSyncModes'
import { withBrandCss } from '../brandCss'
import { buildRepoFiles } from '../repoExport'
import { COMPONENTS } from '../componentCatalogue'
import type { TokenJSON } from '../agentBundle/types'

// The Figma plugin's "Save to GitHub": the payload it holds (what the web
// publishes / the plugin studio builds) goes through buildRepoFiles. It must
// write the SAME variables.css as the web's CSS door, with both themes, the
// brand's gradients and every role variable recipes.css reads.

const store = () => useDesignStore.getState() as unknown as DesignSnapshot
function adopt(id: string, appearance: 'light' | 'dark' = 'light'): string {
  const r = adoptPreset(THEME_STYLE_PRESETS.find((p) => p.id === id)!, appearance, { track: false })
  if ('error' in r) throw new Error(r.error)
  return r.key
}
/** What publishTokens sends: every brand × its themes, plus brandCss. */
function published(keys: string[]): TokenJSON {
  const s = store()
  const json = generateTokenJSON(undefined, { modes: defaultFigmaSyncModes(keys, s.themeKinds) })
  return withBrandCss(json, s) as unknown as TokenJSON
}
const fileOf = (files: { path: string; content: string }[], path: string) => files.find((f) => f.path === path)?.content ?? ''

beforeEach(() => { useDesignStore.setState(makeDesignDefaults()) })

describe('plugin GitHub save', () => {
  it('writes the web variables.css of a brand made in Dark, byte for byte', () => {
    const key = adopt('retro-vintage', 'dark')
    const payload = published([key])
    expect(payload.brandCss?.map((b) => b.key)).toEqual([key])
    const { files } = buildRepoFiles(payload, { css: '/* plugin fallback */', source: 'figma-plugin' })
    const css = fileOf(files, 'variables.css')
    expect(css.trimEnd()).toBe(buildCSS(captureCodeSnapshot(store(), key) as never).trimEnd())
    for (const v of ['--radius-action:', '--size-control:', '--spacing-gap-control:', '--text-button-font-size:', '--color-action-primary-default:']) {
      expect(css, v).toContain(v)
    }
    // both themes, dark first; the light block restores the light ramp
    expect(css).toContain('.light, [data-theme="light"] {')
    // tokens.json never carries the CSS strings
    expect(JSON.parse(fileOf(files, 'tokens.json')).brandCss).toBeUndefined()
  })

  it('names the brand, documents the whole catalogue, and writes every brand when there are several', () => {
    const keys = ['core-minimal', 'neo-brutalism'].map((id) => adopt(id))
    const payload = published(keys)
    const { files, prefixes } = buildRepoFiles(payload, { source: 'figma-plugin' })
    const readme = fileOf(files, 'README.md')
    expect(readme).toMatch(/> Brand: \*\*.+\*\*/)
    expect(readme.split('\n').filter((l) => /\| \[Contract\]\(/.test(l))).toHaveLength(COMPONENTS.length)
    const brandFiles = files.filter((f) => f.path.startsWith('brands/'))
    expect(brandFiles).toHaveLength(2)
    for (const k of keys) {
      const css = buildCSS(captureCodeSnapshot(store(), k) as never).trimEnd()
      expect(brandFiles.some((f) => f.content.trimEnd() === css)).toBe(true)
    }
    expect(prefixes).toContain('brands/')
    expect(files.filter((f) => f.path.startsWith('contracts/components/'))).toHaveLength(COMPONENTS.length)
    const written = new Set(files.map((f) => f.path))
    for (const [, href] of readme.matchAll(/\]\(([^)#]+)\)/g)) {
      if (/^https?:/.test(href)) continue
      expect(written.has(href.replace(/%20/g, ' ')), href).toBe(true)
    }
  })

  it('an older payload with no brandCss keeps the caller\'s CSS', () => {
    const key = adopt('core-minimal')
    const s = store()
    const json = generateTokenJSON(undefined, { modes: defaultFigmaSyncModes([key], s.themeKinds) }) as unknown as TokenJSON
    const { files } = buildRepoFiles(json, { css: '/* plugin fallback */' })
    expect(fileOf(files, 'variables.css')).toBe('/* plugin fallback */\n')
  })

  it('five brands still fit the publish limit with their CSS', () => {
    const keys = ['core-minimal', 'retro-vintage', 'terminal-mono', 'abyss-neon', 'cupcake-pastel'].map((id) => adopt(id))
    const payload = published(keys)
    expect(payload.brandCss).toHaveLength(5)
    expect(JSON.stringify(payload).length).toBeLessThan(2 * 1024 * 1024)
  })
})
