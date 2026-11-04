// The context the Figma page hands to the Escala plugin, by copy and paste.
//
// There is no hosted sync to sign in to any more, so the system travels the
// way an agent context does: one message on the clipboard. It is written for
// two readers at once — the plugin (its context card → Import into this file) and any AI
// agent the person pastes it into — so it is Markdown with the complete Escala
// JSON payload in ONE fenced block. The plugin reads only that block
// (`extractEscalaPayload`, mirrored in escala-figma-plugin/src/ui.html); the
// prose above it is for people and agents.
//
// The payload is `generateTokenJSON` scoped exactly like a publish was —
// File & modes' brands × themes, and its viewports — so what lands in Figma
// is what the page says it is.

import { withAgentEnvelope } from './aiContext'
import { generateTokenJSON } from './tokenGenerator'
import { brandThemesFromSyncModes, FIGMA_VIEWPORT_LABEL, normalizeFigmaViewports, type FigmaSyncMode, type FigmaViewport } from './figmaSyncModes'
import { brandThemesSummary } from './brandThemes'

import { escalaPayloadFence } from './escalaPayloadFence'
export { FIGMA_CONTEXT_FENCE, escalaPayloadFence, escalaPayloadSection } from './escalaPayloadFence'

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

/** "Copy this element": one component, as the variant on screen. The plugin
 *  builds that component (and what it is built from) and places an instance
 *  on the page you are on — nothing else in the file is drawn. The payload is
 *  the brand's full one plus `copy`: the variables a component binds to come
 *  as a whole, because a partial set would be recreated, bindings and all, the
 *  next time anything else is pasted into the file. `copy` is additive (an
 *  older plugin ignores it and imports the brand as usual). */
export interface ElementCopy {
  /** Catalogue key (the plugin's gate). */
  component: string
  /** Display name, for the plugin's "<label> added to this page". */
  label: string
  variant: Record<string, string>
}

export function buildElementFigmaContext(input: FigmaContextInput & { element: ElementCopy }): FigmaContext {
  const viewports = normalizeFigmaViewports(input.viewports)
  const project = input.project.trim() || 'Escala'
  const payload = {
    ...generateTokenJSON(undefined, {
      ...(input.theme ? { theme: input.theme } : {}),
      ...(input.modes.length ? { modes: input.modes } : {}),
      viewports,
      project,
    }),
    copy: { kind: 'element' as const, ...input.element },
  }
  const brands = Object.keys(brandThemesFromSyncModes(input.modes))
  const text = elementContextMarkdown({
    project,
    label: input.element.label,
    brand: brands.map(input.brandName).join(' · '),
    json: JSON.stringify(payload),
  })
  return { text, bytes: new TextEncoder().encode(text).length, brands: brands.length, themes: input.modes.length }
}

export function elementContextMarkdown(parts: { project: string; label: string; brand: string; json: string }): string {
  const body = [
    `Paste this into the Escala plugin in Figma (⌘V on any screen): it builds ${parts.label} and places it on the page you are on.`,
    'Only this component is drawn (plus the ones it is built from). A file with no Escala variables gets this brand\'s first, so the element stays bound to tokens.',
    '',
    `- Element: ${parts.label}`,
    `- Brand: ${parts.brand || '—'}`,
    '',
    escalaPayloadFence(parts.json),
  ].join('\n')
  return withAgentEnvelope('global', parts.project, body)
}

/** Pure: the message around a payload. Split out so tests need no store.
 *  Same `agent-context/v1` envelope as Copy context elsewhere, plus the Escala
 *  JSON fence the plugin imports. */
export function figmaContextMarkdown(parts: { project: string; brandLines: string[]; viewports: string[]; json: string }): string {
  const body = [
    'Paste this whole message into the Escala plugin in Figma: the context card (⌘V) → Import into this file.',
    'An AI agent can read it too — the JSON block below is the complete token system (primitives, semantic roles, typography, dimensions, components).',
    '',
    `- Brands: ${parts.brandLines.join(' · ') || '—'}`,
    `- Viewports: ${parts.viewports.join(' · ')}`,
    '',
    escalaPayloadFence(parts.json),
  ].join('\n')
  return withAgentEnvelope('global', parts.project, body)
}

/** The JSON a pasted context carries: prefer the `json escala-tokens` fence,
 *  else any ```json fence, else the paste itself (a bare tokens.json).
 *  Same rule as the plugin's reader, kept here so it is tested. */
export function extractEscalaPayload(text: string): string {
  const prefer = /```json\s+escala-tokens\s*\n([\s\S]*?)\n```/.exec(text)
  if (prefer) return prefer[1].trim()
  const fence = /```json[^\n]*\n([\s\S]*?)\n```/.exec(text)
  if (fence) return fence[1].trim()
  return text.trim()
}
