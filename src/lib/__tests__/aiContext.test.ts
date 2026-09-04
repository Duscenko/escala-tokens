import { describe, expect, it } from 'vitest'
import {
  AGENT_CONTEXT_FAQ_ID,
  AI_CONTEXT_COPY,
  requestOpenFaq,
  resolveMarkdown,
  takePendingFaqItem,
  withAgentEnvelope,
} from '../aiContext'
import { buildCopyPageContext } from '../skillExport'

describe('AI context contract', () => {
  it('gives every scope a label, hint, toast, and instruction', () => {
    for (const scope of ['global', 'component', 'variable'] as const) {
      const copy = AI_CONTEXT_COPY[scope]
      expect(copy.label).toBe('Copy context to Agents')
      expect(copy.hint.length).toBeGreaterThan(40)
      expect(copy.toast.toLowerCase()).toContain('copied')
      expect(copy.instruction.length).toBeGreaterThan(40)
      expect(copy.toast).toBe(AI_CONTEXT_COPY.global.toast)
    }
    expect(AI_CONTEXT_COPY.global.toast).toMatch(/llm/i)
    expect(AI_CONTEXT_COPY.global.toast).toMatch(/paste/i)
  })

  it('wraps a body in a stable LLM envelope', () => {
    const md = withAgentEnvelope('variable', 'Typography', '## Usage\n\nReach for a text role first.')
    expect(md).toContain('scope: variable')
    expect(md).toContain('title: Typography')
    expect(md).toContain('# Agent context — Typography')
    expect(md).toContain(AI_CONTEXT_COPY.variable.instruction)
    expect(md).toContain('## Usage')
    expect(md).toContain('format: agent-context/v1')
  })

  it('resolves a thunk on demand', () => {
    expect(resolveMarkdown('plain')).toBe('plain')
    expect(resolveMarkdown(() => 'live')).toBe('live')
  })

  it('Copy page clipboard is agent-context, not a page snippet', () => {
    const md = buildCopyPageContext()
    expect(md).toContain('format: agent-context/v1')
    expect(md).toContain('scope: global')
    expect(md).toContain('# Agent context —')
    expect(md).toMatch(/action\.primary\.default|Action\/primary\/default/)
    expect(md).toContain('Token catalog')
  })

  it('See more queues the agent-context FAQ item', () => {
    takePendingFaqItem()
    requestOpenFaq()
    expect(takePendingFaqItem()).toBe(AGENT_CONTEXT_FAQ_ID)
    expect(takePendingFaqItem()).toBeNull()
  })
})
