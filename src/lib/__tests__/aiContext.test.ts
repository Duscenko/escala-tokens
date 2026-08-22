import { describe, expect, it } from 'vitest'
import { AI_CONTEXT_COPY, resolveMarkdown, withAgentEnvelope } from '../aiContext'

describe('AI context contract', () => {
  it('gives every scope a label, hint, toast, and instruction', () => {
    for (const scope of ['global', 'component', 'variable'] as const) {
      const copy = AI_CONTEXT_COPY[scope]
      expect(copy.label).toBe('Copy context to Agents')
      expect(copy.hint.length).toBeGreaterThan(40)
      expect(copy.toast.toLowerCase()).toContain('copied')
      expect(copy.instruction.length).toBeGreaterThan(40)
    }
    expect(AI_CONTEXT_COPY.global.toast).toMatch(/system/i)
    expect(AI_CONTEXT_COPY.component.toast).toMatch(/component/i)
    expect(AI_CONTEXT_COPY.variable.toast).toMatch(/variable/i)
  })

  it('wraps a body in a stable LLM envelope', () => {
    const md = withAgentEnvelope('variable', 'Typography', '## Usage\n\nReach for a text role first.')
    expect(md).toContain('scope: variable')
    expect(md).toContain('title: Typography')
    expect(md).toContain('# Agent context — Typography')
    expect(md).toContain(AI_CONTEXT_COPY.variable.instruction)
    expect(md).toContain('## Usage')
  })

  it('resolves a thunk on demand', () => {
    expect(resolveMarkdown('plain')).toBe('plain')
    expect(resolveMarkdown(() => 'live')).toBe('live')
  })
})
