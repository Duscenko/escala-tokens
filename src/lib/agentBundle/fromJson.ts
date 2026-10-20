import { withAgentEnvelope } from '../aiContext'
import { escalaPayloadSection } from '../escalaPayloadFence'
import { buildFoundationsMd, buildTokensMd } from './markdownFromJson'
import type { TokenJSON } from './types'

export { buildFoundationsMd, buildTokensMd } from './markdownFromJson'

/**
 * Clipboard / download payload for Get code · Agent.
 * Envelope + the same `references/tokens.md` and `references/foundations.md`
 * the Skill zip already ships — one renderer, not a second catalog.
 *
 * Ends with the complete Escala JSON (`escalaPayloadSection`), like the web's
 * All foundations Copy context: the Figma plugin copies this, and the paste
 * goes back into escalatokens.com, another Figma file or any agent.
 */
export function agentMarkdownFromJSON(json: TokenJSON): string {
  const title = json.project?.trim() || 'Design system'
  const body = [buildTokensMd(json), buildFoundationsMd(json), '---', '', escalaPayloadSection(JSON.stringify(json))].join('\n')
  return withAgentEnvelope('global', title, body)
}
