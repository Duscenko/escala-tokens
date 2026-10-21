// The store half of `contextRequest.ts`: which TokenJSON a brand's agent
// context is cut from. Kept apart so `contextRequest` stays pure and testable
// from a fixture JSON.

import type { DesignSnapshot } from '../store/useDesignStore'
import type { TokenJSON } from './agentBundle/types'
import { captureCodeSnapshot } from './codeScope'
import { freeDownloadStore } from './freeFigmaScope'
import { generateTokenJSON } from './tokenGenerator'
import { escalaPayloadSection } from './escalaPayloadFence'
import { brandThemeDef, shippedThemes } from './brandThemes'
import { normalizeFigmaViewports, type FigmaSyncMode } from './figmaSyncModes'
import { buildSystemContext, type ContextAppearance, type SystemContextRequest } from './contextRequest'
import { onlyAppearance } from './agentBundle/narrow'

export { onlyAppearance }

/** One brand's tokens, in one appearance or both. Built from the SAME
 *  snapshot Get code uses (`captureCodeSnapshot`), and narrowed with the SAME
 *  cut a Free download uses (`freeDownloadStore`), so a "Light" paste names
 *  exactly the tokens a light-only export ships. */
export function contextTokenJson(store: DesignSnapshot, brand: string, appearance: ContextAppearance): TokenJSON {
  const snapshot = captureCodeSnapshot(store, brand)
  if (appearance === 'both') return generateTokenJSON(snapshot) as unknown as TokenJSON
  // Narrow the STORE, not the generator: `generateTokenJSON`'s `modes` option
  // is the Figma-sync shape and keys columns `light::light`, which must never
  // reach a paste. With the store narrowed to one theme, the payload names one
  // plain column and gates the other appearance's primitives on its own.
  const narrowed = freeDownloadStore(snapshot, { modes: [{ theme: appearance, appearance }] })
  return onlyAppearance(generateTokenJSON(narrowed) as unknown as TokenJSON, appearance)
}

/** The paste itself: one brand, cut to the request. The ONE entry point every
 *  "context for agents" surface calls (Variables' Copy context, Code's Agent
 *  context and its appearance menu), so the JSON narrowing and the renderer's
 *  appearance labels cannot be paired wrongly at a call site.
 *
 *  At scope `all` it ends with the brand's complete Escala JSON in the
 *  plugin's fence, the same block the Figma page's context carries: ONE
 *  context for Figma and agents, so All foundations pastes into the plugin's
 *  context card. A single foundation stays light (no JSON: ~32k tokens would
 *  make a Radius paste 50x heavier, and the plugin cannot import a fragment;
 *  it tells the person to copy All foundations instead). */
export function brandContext(
  store: DesignSnapshot,
  brand: string,
  req: SystemContextRequest & { appearance: ContextAppearance },
  projectFallback?: string,
): string {
  const json = contextTokenJson(store, brand, req.appearance)
  const md = buildSystemContext(json, req, projectFallback)
  if (req.scope !== 'all') return md
  return md.trimEnd() + '\n\n---\n\n' + escalaPayloadSection(JSON.stringify(pluginPayload(store, brand, req.appearance, json.project?.trim() || projectFallback)))
}

/** The JSON a paste hands the Figma plugin: generated exactly like the Figma
 *  page's context (`buildFigmaContext`) — the brand's themes as
 *  `brand::appearance` columns, every viewport. The prose's JSON
 *  (`contextTokenJson`) names plain `light` / `dark` columns, which the plugin
 *  reads as two brands called "Light" and "Dark". */
export function pluginPayload(store: DesignSnapshot, brand: string, appearance: ContextAppearance, project?: string) {
  const ids = appearance === 'both' ? shippedThemes((store as { brandThemes?: Parameters<typeof shippedThemes>[0] }).brandThemes, brand) : []
  const modes: FigmaSyncMode[] = appearance === 'both'
    ? ids.map((id) => ({ theme: brand, appearance: brandThemeDef(id)?.base ?? 'light' }))
    : [{ theme: brand, appearance }]
  return generateTokenJSON(store, {
    theme: brand,
    modes: modes.length ? modes : [{ theme: brand, appearance: 'light' }],
    viewports: normalizeFigmaViewports(undefined),
    ...(project ? { project } : {}),
  })
}
