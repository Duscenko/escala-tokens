// The context the Figma page hands to the Escala plugin, by copy and paste.
//
// There is no hosted sync to sign in to any more, so the system travels the
// way an agent context does: one message on the clipboard. It is written for
// two readers at once — the plugin (Home → Agent Context → Import) and any AI
// agent the person pastes it into — so it is Markdown with the complete Escala
// JSON payload in ONE fenced block. The plugin reads only that block
// (`extractEscalaPayload`, mirrored in escala-figma-plugin/src/ui.html); the
// prose above it is for people and agents.
//
// The payload is `generateTokenJSON` scoped exactly like a publish was —
// File & modes' brands × themes, and its viewports — so what lands in Figma
// is what the page says it is.

import { generateTokenJSON } from './tokenGenerator'
import { brandThemesFromSyncModes, FIGMA_VIEWPORT_LABEL, normalizeFigmaViewports, type FigmaSyncMode, type FigmaViewport } from './figmaSyncModes'
import { brandThemesSummary } from './brandThemes'

/** The fence info string. The plugin also accepts a plain ```json fence and a
 *  bare JSON paste, so this is a label, not a contract. */
export const FIGMA_CONTEXT_FENCE = 'json escala-tokens'

export interface FigmaContextInput {
  /** Name the system takes in Figma (`project`). */
  project: string
  /** Brand × theme columns to ship. Empty = nothing to ship. */
  modes: FigmaSyncMode[]
  viewports: FigmaViewport[]
  /** Theme on screen — the payload's active theme. */
  theme?: string
  /** Brand display name for the summary line. */
  brandName: (key: string) => string
}

export interface FigmaContext {
  text: string
  /** Bytes of the whole message — shown so a large paste is not a surprise. */
  bytes: number
  brands: number
  themes: number
}

export function buildFigmaContext(input: FigmaContextInput): FigmaContext {
  const viewports = normalizeFigmaViewports(input.viewports)
  const project = input.project.trim() || 'Escala'
  const payload = generateTokenJSON(undefined, {
    ...(input.theme ? { theme: input.theme } : {}),
    ...(input.modes.length ? { modes: input.modes } : {}),
    viewports,
    project,
  })
  const byBrand = brandThemesFromSyncModes(input.modes)
  const brands = Object.keys(byBrand)
  const text = figmaContextMarkdown({
    project,
    brandLines: brands.map((key) => `${input.brandName(key)} (${brandThemesSummary(byBrand[key]).replace(/ only$/, '')})`),
    viewports: viewports.map((v) => FIGMA_VIEWPORT_LABEL[v]),
    json: JSON.stringify(payload),
  })
  return { text, bytes: new TextEncoder().encode(text).length, brands: brands.length, themes: input.modes.length }
}

/** Pure: the message around a payload. Split out so tests need no store. */
export function figmaContextMarkdown(parts: { project: string; brandLines: string[]; viewports: string[]; json: string }): string {
  return [
    `# ${parts.project} — Escala design system`,
    '',
    'Paste this whole message into the Escala plugin in Figma: Home → Agent Context → Import.',
    'An AI agent can read it too — the JSON block below is the complete token system (primitives, semantic roles, typography, dimensions, components).',
    '',
    `- Brands: ${parts.brandLines.join(' · ') || '—'}`,
    `- Viewports: ${parts.viewports.join(' · ')}`,
    '',
    '```' + FIGMA_CONTEXT_FENCE,
    parts.json,
    '```',
    '',
  ].join('\n')
}

/** The JSON a pasted context carries: the fenced block, else the paste itself.
 *  Same rule as the plugin's reader, kept here so it is tested. */
export function extractEscalaPayload(text: string): string {
  const fence = /```json[^\n]*\n([\s\S]*?)\n```/.exec(text)
  return (fence ? fence[1] : text).trim()
}
