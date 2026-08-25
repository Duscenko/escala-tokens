// "Use it" parity — the page, the pasted markdown and the MCP reply are meant
// to be three renderings of ONE descriptor (`docs/useIt.ts`). Today they agree
// because both sides happen to read `COMPONENTS`; these assertions turn that
// coincidence into a guarantee, the same move `no-duplication.test.ts` makes
// for the colour layer.
//
// Deliberately component-only: `useItForComponent` needs nothing but the pure
// catalogue, so this suite stays DOM-free and cheap. The foundation half is
// covered end-to-end in the browser (a CSS value that moves when you retint
// is the real proof it's derived, and that can't be asserted from a fixture).

import { describe, expect, it } from 'vitest'
import { COMPONENTS } from '../componentCatalogue'
import { getComponent } from '../agentAccess/components'
import {
  useItForComponent, useItMarkdown, USE_IT_TITLE,
} from '../../components/configurator/docs/useIt'

const SNIPPET = '<Button>Save</Button>'

describe('useItForComponent', () => {
  it('offers exactly the three destinations, in Figma · Code · AI order', () => {
    const useIt = useItForComponent(COMPONENTS[0], SNIPPET)
    expect(useIt.destinations.map((d) => d.id)).toEqual(['figma', 'code', 'ai'])
  })

  it('shows the caller-supplied snippet verbatim, so the block cannot disagree with the playground above it', () => {
    const code = useItForComponent(COMPONENTS[0], SNIPPET).destinations.find((d) => d.id === 'code')
    expect(code?.code).toBe(SNIPPET)
  })

  // The load-bearing one: the Figma pane and the MCP `get_component` reply are
  // two faces of the same catalogue entry. If either ever starts inventing or
  // dropping a set, this fails.
  it('names the same Figma sets that MCP get_component returns, for every component', () => {
    for (const def of COMPONENTS) {
      const fromMcp = getComponent(def.key)
      expect(fromMcp, `get_component missed ${def.key}`).not.toBeNull()

      const figma = useItForComponent(def, SNIPPET).destinations.find((d) => d.id === 'figma')!
      for (const set of fromMcp!.figmaSets) {
        expect(figma.code, `${def.key} omitted the set ${set}`).toContain(set)
      }
    }
  })

  // A catalogue-first entry has no set yet, and the catalogue's rule is that it
  // must SAY so rather than imply a library that doesn't exist. Every entry
  // currently HAS a set (measured: 59 of 59), so this drives the branch with a
  // synthetic def — testing the behaviour, not today's data. Written this way
  // on purpose: asserting that spec-only entries exist would make this fail the
  // day the plugin ships the last gate, which is the wrong thing to guard.
  it('says a spec-only component is not in Figma yet instead of naming a set', () => {
    const specOnly = { ...COMPONENTS[0], figmaSets: [] }
    const figma = useItForComponent(specOnly, SNIPPET).destinations.find((d) => d.id === 'figma')!
    expect(figma.code).toContain('not in the Figma library yet')
    expect(figma.note).toContain('spec-only')
  })

  it('points the AI pane at this component, by its real catalogue key', () => {
    const def = COMPONENTS.find((c) => c.key === 'Button') ?? COMPONENTS[0]
    const ai = useItForComponent(def, SNIPPET).destinations.find((d) => d.id === 'ai')!
    expect(ai.code).toContain(`get_component   { "key": "${def.key}" }`)
    expect(ai.code).toContain(def.category)
  })
})

describe('useItMarkdown', () => {
  it('serialises the same descriptor the page renders — every destination, same code', () => {
    const useIt = useItForComponent(COMPONENTS[0], SNIPPET)
    const md = useItMarkdown(useIt)
    expect(md).toContain(`## ${USE_IT_TITLE}`)
    for (const d of useIt.destinations) {
      expect(md).toContain(`### ${d.label}`)
      expect(md).toContain(d.code)
    }
  })
})
