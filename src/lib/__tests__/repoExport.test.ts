import { COMPONENTS } from '../componentCatalogue'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { TokenJSON } from '../agentBundle'
import { repoSkillFiles } from '../agentBundle/repoSkills'
import { ESSENTIAL_COMPONENT_KEYS } from '../componentCatalogue'
import {
  buildRepoFiles, repoCommitMessage, shouldWriteReadme, README_MARKER, FIGMA_MANIFEST_FORMAT, type FigmaManifest,
} from '../repoExport'

const repoDir = join(dirname(fileURLToPath(import.meta.url)), '../repoExport')

const MINIMAL: TokenJSON = {
  project: 'Acme',
  colors: { primitive: { 'accent-6': '#7f56d9' } },
  typography: { fontFamily: 'Inter', sizes: { 'text-md': '16px' }, weights: { medium: 500 } },
  spacing: { '1': '4px' },
  radius: { md: '8px' },
}

const MANIFEST: FigmaManifest = {
  format: FIGMA_MANIFEST_FORMAT,
  fileKey: null,
  fileName: 'Acme DS',
  generatedAt: '2026-10-27T00:00:00.000Z',
  components: [{ name: 'Button', type: 'COMPONENT_SET', key: 'k1', nodeId: '1:2', page: '❖ Components · Button & Actions', variants: { Variant: ['default'] } }],
}

const byPath = (files: { path: string; content: string }[]) => new Map(files.map((f) => [f.path, f.content]))

describe('repoExport import boundary', () => {
  it('is store-free and DOM-free, so the Figma plugin can bundle it', () => {
    for (const file of readdirSync(repoDir).filter((f) => f.endsWith('.ts'))) {
      const src = readFileSync(join(repoDir, file), 'utf8')
      expect(src, file).not.toMatch(/useDesignStore|from ['"]\.\.\/store\//)
      expect(src, file).not.toMatch(/from ['"]\.\.\/tokenGenerator['"]/)
      expect(src, file).not.toMatch(/from ['"]react['"]|localStorage|document\./)
    }
  })

  // The plugin bundles repoExport/ with everything it imports. A single value
  // import of the store anywhere down the chain drags the store, Supabase and
  // ~400 KB into ui.html — the direct check above cannot see that.
  it('never reaches the store or Supabase through any import chain', () => {
    const seen = new Set<string>()
    const resolve = (from: string, spec: string): string | null => {
      const base = join(dirname(from), spec.replace(/\.js$/, ''))
      for (const c of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
        try { readFileSync(c); return c } catch { /* next */ }
      }
      return null
    }
    const walk = (file: string, chain: string[]) => {
      if (seen.has(file)) return
      seen.add(file)
      expect(file, chain.join(' -> ')).not.toMatch(/store[\\/]useDesignStore|[\\/]supabase\.ts$|tokenGenerator\.ts$/)
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(/^(?:import|export)\s+(?!type\b)[^'"]*?from\s+['"](\.[^'"]+)['"]/gm)) {
        const next = resolve(file, m[1])
        if (next) walk(next, [...chain, next.replace(/^.*src[\\/]/, '')])
      }
    }
    walk(join(repoDir, 'index.ts'), ['repoExport/index.ts'])
    expect(seen.size).toBeGreaterThan(5)
  })
})

describe('buildRepoFiles', () => {
  it('keeps the paths the web push already writes, and adds contracts', () => {
    const { files, prefixes } = buildRepoFiles(MINIMAL, { css: ':root {}', generatedAt: '2026-10-27' })
    const map = byPath(files)
    expect(JSON.parse(map.get('tokens.json')!)).toEqual(MINIMAL)
    expect(map.get('variables.css')).toBe(':root {}\n')
    expect(map.get('README.md')!.startsWith(README_MARKER)).toBe(true)
    expect(map.has('contracts/naming.md')).toBe(true)
    expect(map.has('figma/manifest.json')).toBe(false)
    expect(prefixes).toContain('contracts/components/')
    for (const key of ESSENTIAL_COMPONENT_KEYS) {
      expect(map.has(`contracts/components/${key.replace(/[^A-Za-z0-9]+/g, '')}.json`), key).toBe(true)
    }
  })

  it('carries exactly the agent package the web push writes', () => {
    const { files, prefixes } = buildRepoFiles(MINIMAL, { generatedAt: '2026-10-27' })
    const skills = repoSkillFiles(MINIMAL, { projectFallback: 'Acme', generatedAt: '2026-10-27' })
    const map = byPath(files)
    for (const f of skills.files) expect(map.get(f.path), f.path).toBe(f.content)
    for (const p of skills.prefixes) expect(prefixes).toContain(p)
  })

  it('leaves variables.css and README out when asked', () => {
    const map = byPath(buildRepoFiles(MINIMAL, { readme: false }).files)
    expect(map.has('variables.css')).toBe(false)
    expect(map.has('README.md')).toBe(false)
  })

  it('links a contract to the Figma node the plugin found', () => {
    const json = { ...MINIMAL, atoms: ['Button', 'NotAComponent'] }
    const map = byPath(buildRepoFiles(json, { figma: MANIFEST }).files)
    const button = JSON.parse(map.get('contracts/components/Button.json')!)
    expect(button.figma.inFile).toEqual([{ name: 'Button', key: 'k1', nodeId: '1:2', page: '❖ Components · Button & Actions' }])
    expect(button.axes.length).toBeGreaterThan(0)
    expect(button.selected).toBe(true)
    // The WHOLE catalogue gets a contract; the system's pick is a flag, not a filter.
    const index = JSON.parse(map.get('contracts/components.json')!)
    expect(index.components).toHaveLength(COMPONENTS.length)
    expect(index.components.find((c: { key: string }) => c.key === 'Button')).toMatchObject({ selected: true, inFigma: true })
    expect(index.components.find((c: { key: string }) => c.key === 'Slider')).toMatchObject({ selected: false, inFigma: false })
    expect(index.unknown).toEqual(['NotAComponent'])
    expect(JSON.parse(map.get('figma/manifest.json')!)).toEqual(MANIFEST)
  })

  it('says "unknown" (null), not "missing", when no manifest was sent', () => {
    const map = byPath(buildRepoFiles({ ...MINIMAL, atoms: ['Button'] }).files)
    expect(JSON.parse(map.get('contracts/components/Button.json')!).figma.inFile).toBeNull()
  })

  it('names the source in the commit message', () => {
    expect(repoCommitMessage(MINIMAL, { source: 'figma-plugin' })).toBe('chore(design-system): update Acme from Figma')
  })
})

describe('shouldWriteReadme', () => {
  it('writes over nothing, its own README, or the GitHub stub', () => {
    expect(shouldWriteReadme(null)).toBe(true)
    expect(shouldWriteReadme('# acme-ds\n')).toBe(true)
    expect(shouldWriteReadme('# acme-ds\nAcme design tokens — generated by Escala\n')).toBe(true)
    expect(shouldWriteReadme(`${README_MARKER}\n# Acme\n\nlots\nof\nlines\n`)).toBe(true)
  })
  it('never over a README a person wrote', () => {
    expect(shouldWriteReadme('# Acme\n\nOur design system.\n\n## Setup\nnpm i\n')).toBe(false)
    expect(shouldWriteReadme('Some notes\nmore')).toBe(false)
  })
})
