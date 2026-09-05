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

/**
 * The "paste this to your agent" alternative to the numbered steps — one
 * message that connects the server and then PROVES it connected.
 *
 * Every claim in it is checked against something real: the endpoint is
 * `mcpEndpoint`, the transport is what `/api/mcp` actually speaks (plain
 * streamable HTTP, no auth — do NOT add a sign-in line here), and the two tool
 * names are entries in `agentAccess/types.ts`. Step 3 exists because "did it
 * work" is otherwise unanswerable until the agent gets a token wrong: asking
 * for the role's resolved value makes a silent mis-connection visible
 * immediately.
 */
export function agentSetupPrompt(
  origin: string = DEFAULT_PUBLISH_ORIGIN,
  slug?: string,
): string {
  const withProject = slug ? ` with project "${slug}"` : ''
  return [
    'Set up my Escala design system.',
    `1. Add the MCP server ${mcpEndpoint(origin)}. It's streamable HTTP with no auth, so use whichever config my editor expects, and name it ${MCP_SERVER_NAME}.`,
    `2. Call get_tokens${withProject} and tell me how many semantic roles the system ships.`,
    '3. From now on resolve every colour, size and radius through resolve_token instead of writing a hex or a px value, and run check_contrast before you pair an ink with a fill.',
  ].join('\n')
}

/** Claude web chat. Query is the same prompt Docs' PROMPT pane copies —
 *  connect MCP, then prove it. Never the catalog: URL length, and a pasted
 *  snapshot can go stale the way Live exists to prevent. */
export function claudeChatUrl(prompt: string): string {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`
}

/** Cursor prompt deeplink (web → app). Same prompt as Claude. */
export function cursorPromptUrl(prompt: string): string {
  const url = new URL('https://cursor.com/link/prompt')
  url.searchParams.set('text', prompt)
  return url.toString()
}

/** Figma Make has no query-handoff and no MCP. Open the Make surface; the
 *  clipboard carries the Skill. Variables still sync through the plugin. */
export const FIGMA_MAKE_URL = 'https://www.figma.com/make'

/** Lead-in pasted above SKILL.md for Figma Make / Figma Agent. */
export function figmaAgentLead(project: string): string {
  const name = project.trim() || 'Design system'
  return [
    `Use the Escala skill for ${name} in Figma Make.`,
    'Load figma-use before any use_figma call. Bind paints to semantic Figma names only (Action/primary/default), never a hex.',
    'Figma Make cannot hold a live MCP connection. Token names and bindings are in the skill below. Figma variables still sync through the Escala plugin.',
    '',
  ].join('\n')
}
