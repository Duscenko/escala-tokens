import { describe, expect, it } from 'vitest'
import { handleMcpMessage } from '../agentAccess/mcp'
import { TOOL_SPECS } from '../agentAccess/types'

const noTokens = async () => {
  throw new Error('this tool must not need a published payload')
}

const call = (name: string, args: Record<string, unknown> = {}) =>
  handleMcpMessage(
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
    noTokens,
  ) as Promise<any>

describe('tools/call result shape', () => {
  // structuredContent MUST be a JSON object per the MCP spec. list_components
  // returns an array; sending it verbatim made every client reject the response
  // with "expected record", so the tool failed before the caller saw anything.
  it('omits structuredContent when the tool returns an array', async () => {
    const res = await call('list_components')
    expect(res.error).toBeUndefined()
    expect(res.result.isError).toBeFalsy()
    expect(Array.isArray(res.result.structuredContent)).toBe(false)

    const parsed = JSON.parse(res.result.content[0].text)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(10)
  })

  it('still sends structuredContent when the tool returns an object', async () => {
    const res = await call('get_component', { key: 'Button' })
    expect(res.result.structuredContent?.key).toBe('Button')
  })

  it('every tool that needs no project answers without an isError result', async () => {
    const projectless = TOOL_SPECS.filter(
      (t) => !(t.inputSchema.required ?? []).includes('project'),
    ).map((t) => t.name)
    expect(projectless).toContain('list_components')

    for (const name of projectless) {
      const args =
        name === 'get_component'
          ? { key: 'Button' }
          : name === 'check_contrast'
            ? { foreground: '#000000', background: '#ffffff' }
            : {}
      const res = await call(name, args)
      expect(res.error, name).toBeUndefined()
      expect(res.result.isError, name).toBeFalsy()
      expect(Array.isArray(res.result.structuredContent), name).toBe(false)
    }
  })
})
