/**
 * A theme made in the Figma plugin, sent to the account so the file and the
 * web share one publish id.
 *
 * The plugin POSTs the tokens it already stored (choices ride on `studio`).
 * The web, opened on that id, rebuilds the editor from those choices and
 * publishes back — the file's live sync then pulls the web's edits.
 * DOM-free: the API and the tests share this. The store write lives in
 * `pluginBridgeOpen.ts`.
 */

import type { StudioChoices } from './pluginStudio'
import { stripLicence } from './licenceGate.js'

const MAX_BODY_BYTES = 2 * 1024 * 1024
const HEX = /^#[0-9a-f]{6}$/i

export function studioChoicesOf(tokens: unknown): StudioChoices | null {
  if (!tokens || typeof tokens !== 'object') return null
  const studio = (tokens as { studio?: unknown }).studio
  if (!studio || typeof studio !== 'object' || Array.isArray(studio)) return null
  const choices = studio as StudioChoices
  if (typeof choices.style === 'string' && choices.style.trim()) return choices
  if (typeof choices.accent === 'string' && HEX.test(choices.accent)) return choices
  return null
}

function cleanName(value: unknown, fallback: string): string {
  const raw = typeof value === 'string' ? value : ''
  const name = raw.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80)
  return name || fallback
}

/** The body the plugin may publish. The licence stamp is ours to write. */
export function bridgePayload(
  body: unknown,
): { name: string; tokens: Record<string, unknown> } | { error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Missing tokens.' }
  const raw = (body as { tokens?: unknown }).tokens
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Missing tokens.' }
  const tokens = stripLicence(raw) as Record<string, unknown>
  if (!tokens.colors || typeof tokens.colors !== 'object') return { error: 'Missing "colors" field in tokens.' }
  if (JSON.stringify(tokens).length > MAX_BODY_BYTES) return { error: 'Payload too large.' }
  const studio = tokens.studio && typeof tokens.studio === 'object'
    ? (tokens.studio as { name?: unknown }).name
    : ''
  const named = (body as { name?: unknown }).name
  const name = cleanName(named, cleanName(studio, cleanName(tokens.project, 'Untitled')))
  return { name, tokens }
}
