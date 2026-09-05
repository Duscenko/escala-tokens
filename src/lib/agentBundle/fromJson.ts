import { withAgentEnvelope } from '../aiContext'
import { buildFoundationsMd, buildTokensMd } from './markdownFromJson'
import type { TokenJSON } from './types'

export { buildFoundationsMd, buildTokensMd } from './markdownFromJson'

/**
 * Clipboard / download payload for Get code · Agent.
 * Envelope + the same `references/tokens.md` and `references/foundations.md`
 * the Skill zip already ships — one renderer, not a second catalog.
 */
export function agentMarkdownFromJSON(json: TokenJSON): string {
  const title = json.project?.trim() || 'Design system'
  const body = [buildTokensMd(json), buildFoundationsMd(json)].join('\n')
  return withAgentEnvelope('global', title, body)
}
