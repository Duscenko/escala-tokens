// Install recipes for a generated system — Cursor / Claude / MCP JSON.
// Pure: no store, no React. `AgentInstallPanel` (wizard + Docs → Use with AI)
// and `@escala/cli` call these so a path printed in Docs cannot drift from
// the zip's `skillName()`, from `/api/mcp`, or from the CLI that writes them.

import { skillName } from './agentBundle/names'
import { MCP_SERVER_NAME } from './agentAccess/mcp'

export { MCP_SERVER_NAME }

export type SkillAgent = 'cursor' | 'claude'
export type McpClient = 'cursor' | 'claude' | 'vscode'

export const CLI_PACKAGE = '@escala/cli'
/** Public site. Vercel is only the host — never put *.vercel.app in user-facing copy. */
export const DEFAULT_PUBLISH_ORIGIN = 'https://www.escalatokens.com'

export function mcpEndpoint(origin: string): string {
  const base = origin.replace(/\/$/, '') || DEFAULT_PUBLISH_ORIGIN
  return `${base}/api/mcp`
}

/** Cursor / Claude Desktop project file: `.cursor/mcp.json`. */
export function mcpCursorConfig(origin: string): string {
  return JSON.stringify(
    { mcpServers: { [MCP_SERVER_NAME]: { url: mcpEndpoint(origin) } } },
    null,
    2,
  )
}

/** VS Code Copilot MCP: `.vscode/mcp.json`. */
export function mcpVscodeConfig(origin: string): string {
  return JSON.stringify(
    { servers: { [MCP_SERVER_NAME]: { url: mcpEndpoint(origin), type: 'http' } } },
    null,
    2,
  )
}

/** Anthropic's CLI — not an Escala installer. */
export function mcpClaudeAddCommand(origin: string): string {
  return `claude mcp add --transport http ${MCP_SERVER_NAME} ${mcpEndpoint(origin)}`
}

export function skillInstallPath(agent: SkillAgent, project: string): string {
  const name = skillName(project)
  return agent === 'cursor' ? `.cursor/skills/${name}/` : `.claude/skills/${name}/`
}

export function skillFolderName(project: string): string {
  return skillName(project)
}

export function mcpConfigPath(client: McpClient): string {
  if (client === 'vscode') return '.vscode/mcp.json'
  if (client === 'claude') return '.mcp.json'
  return '.cursor/mcp.json'
}

export function cliSkillCommand(
  slug: string,
  client: SkillAgent = 'cursor',
  origin: string = DEFAULT_PUBLISH_ORIGIN,
): string {
  const base = `npx ${CLI_PACKAGE} skill --from ${slug} --client ${client}`
  const host = origin.replace(/\/$/, '') || DEFAULT_PUBLISH_ORIGIN
  return host === DEFAULT_PUBLISH_ORIGIN ? base : `${base} --host ${host}`
}

export function cliMcpInitCommand(
  client: McpClient = 'cursor',
  origin: string = DEFAULT_PUBLISH_ORIGIN,
): string {
  return `npx ${CLI_PACKAGE} mcp init --client ${client} --url ${mcpEndpoint(origin)}`
}
