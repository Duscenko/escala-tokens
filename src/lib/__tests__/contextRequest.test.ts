import { beforeAll, describe, expect, it } from 'vitest'
import { buildAgentSkillFiles } from '../agentBundle'
import { generateTokenJSON } from '../tokenGenerator'
import { captureCodeSnapshot } from '../codeScope'
import { contextTokenJson } from '../contextSource'
import {
  CONTEXT_FOUNDATIONS,
  buildSystemContext,
  contextSize,
  cutComponentContext,
  splitMarkdown,
} from '../contextRequest'
import { agentContextMarkdown } from '../agentContext'
import { COMPONENTS } from '../componentCatalogue'
import { makeDesignDefaults, useDesignStore } from '../../store/useDesignStore'

let brand = ''

beforeAll(async () => {
  useDesignStore.setState(makeDesignDefaults())
  const { adoptPreset } = await import('../adoptPreset')
  const { THEME_STYLE_PRESETS } = await import('../themePresets')
  const adopted = adoptPreset(THEME_STYLE_PRESETS[0], 'light')
  if ('error' in adopted) throw new Error(adopted.error)
  brand = adopted.key
})

function headings(md: string, level: number): string[] {
  return splitMarkdown(md).filter((c) => c.level === level).map((c) => c.heading)
}

describe('buildSystemContext', () => {
  it('all · both · full is byte-identical to the Agent context the Code tab always showed', () => {
    const store = useDesignStore.getState()
    const json = generateTokenJSON(captureCodeSnapshot(store, brand))
    const legacy = buildAgentSkillFiles(json, { projectFallback: store.projectName }).files
      .filter((f) => f.path.startsWith('references/'))
      .map((f) => f.text.trimEnd())
      .join('\n\n---\n\n')
    const json2 = contextTokenJson(store, brand, 'both')
    expect(buildSystemContext(json2, { scope: 'all', detail: 'full' }, store.projectName)).toBe(legacy)
  })

  it('Values drops the semantic contract and nothing else', () => {
    const json = contextTokenJson(useDesignStore.getState(), brand, 'both')
    const full = buildSystemContext(json, { scope: 'all', detail: 'full' })
    const values = buildSystemContext(json, { scope: 'all', detail: 'tokens' })
    expect(values.length).toBeLessThan(full.length)
    expect(full.startsWith(values.trimEnd())).toBe(true)
  })

  it('a length foundation keeps its own section and the primitives it aliases, nothing else', () => {
    const json = contextTokenJson(useDesignStore.getState(), brand, 'both')
    const md = buildSystemContext(json, { scope: 'radius', detail: 'tokens' })
    const sections = headings(md, 2)
    expect(sections.some((h) => h.startsWith('## Radius'))).toBe(true)
    expect(sections.some((h) => h.startsWith('## Dimension primitives'))).toBe(true)
    expect(sections.some((h) => /^## (Color|Typography|Spacing|Shadows)/.test(h))).toBe(false)
  })

  it('every foundation the picker offers produces its own section', () => {
    const json = contextTokenJson(useDesignStore.getState(), brand, 'both')
    const full = buildSystemContext(json, { scope: 'all', detail: 'tokens' })
    for (const { key } of CONTEXT_FOUNDATIONS) {
      const md = buildSystemContext(json, { scope: key, detail: 'tokens' })
      expect(md, key).not.toContain('_This system ships no tokens')
      expect(md.length, key).toBeLessThan(full.length)
    }
  })

  it('Color keeps the mode preamble and only takes the contract at Full brief', () => {
    const json = contextTokenJson(useDesignStore.getState(), brand, 'both')
    const values = buildSystemContext(json, { scope: 'color', detail: 'tokens' })
    const full = buildSystemContext(json, { scope: 'color', detail: 'full' })
    expect(values).toMatch(/\*\*Modes \(Color Semantics columns\):\*\*/)
    expect(values).toContain('## Color Semantics')
    expect(values).not.toContain('## Typography')
    expect(full.length).toBeGreaterThan(values.length)
  })
})

describe('contextTokenJson — appearance', () => {
  const modesLine = (md: string) => md.match(/\*\*Modes \(Color Semantics columns\):\*\* (.*)/)?.[1]

  it('Light ships only the light column, Dark only the dark one, Both both', () => {
    const store = useDesignStore.getState()
    const md = (a: 'light' | 'dark' | 'both') =>
      buildSystemContext(contextTokenJson(store, brand, a), { scope: 'color', detail: 'tokens' })
    expect(modesLine(md('light'))).toBe('`Light`')
    expect(modesLine(md('dark'))).toBe('`Dark`')
    expect(modesLine(md('both'))).toBe('`Light`, `Dark`')
  })

  it('one appearance costs less than both', () => {
    const store = useDesignStore.getState()
    const both = buildSystemContext(contextTokenJson(store, brand, 'both'), { scope: 'all', detail: 'full' })
    const light = buildSystemContext(contextTokenJson(store, brand, 'light'), { scope: 'all', detail: 'full' })
    expect(contextSize(light).approxTokens).toBeLessThan(contextSize(both).approxTokens)
  })
})

describe('cutComponentContext', () => {
  const def = COMPONENTS.find((c) => c.key === 'Button')!
  const tokens = { radius: { md: '8px' }, spacing: { '1': '4px' } }
  const brief = agentContextMarkdown(def, '<Button />', tokens)
  const dark = agentContextMarkdown(def, '<Button />', { ...tokens, radius: { md: '9px' } })

  it('Values keeps identity and tokens, drops API, snippet and accessibility', () => {
    const md = cutComponentContext(brief, { detail: 'tokens', appearance: 'light' })
    expect(md).toContain('name: button')
    expect(md).toContain('## What it is')
    expect(md).toContain('## Design tokens (live) — Light')
    expect(md).not.toContain('## Snippet')
    expect(md).not.toContain('## Accessibility')
  })

  it('Full brief keeps every section', () => {
    const md = cutComponentContext(brief, { detail: 'full', appearance: 'dark' })
    expect(md).toContain('## Snippet')
    expect(md).toContain('## Design tokens (live) — Dark')
  })

  it('Both puts the light and dark token tables side by side, once each', () => {
    const md = cutComponentContext(brief, { detail: 'tokens', appearance: 'both' }, dark)
    expect(md).toContain('## Design tokens (live) — Light')
    expect(md).toContain('## Design tokens (live) — Dark')
    expect(md.match(/## What it is/g)?.length).toBe(1)
    expect(md.indexOf('— Light')).toBeLessThan(md.indexOf('— Dark'))
  })
})

describe('splitMarkdown', () => {
  it('never splits inside a fenced block', () => {
    const md = '# T\n\n## A\n\n```md\n## not a heading\n```\n\n## B\nb\n'
    expect(headings(md, 2)).toEqual(['## A', '## B'])
  })
})
