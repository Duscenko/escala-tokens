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

/** A primitive key that is the DARK twin of a family (`accent-dark-9`,
 *  `teal-dark-3`), as opposed to its light ramp (`accent-9`). The twin is
 *  only a twin when its light family exists too, so a family that is merely
 *  NAMED "…-dark" keeps its own ramp. */
function darkTwinKeys(map: Record<string, string>): Set<string> {
  const out = new Set<string>()
  for (const key of Object.keys(map)) {
    const m = /^(.+)-dark-(\d+)$/.exec(key)
    if (m && `${m[1]}-${m[2]}` in map) out.add(key)
  }
  return out
}

/** Drops what the OTHER appearance ships. `generateTokenJSON` keeps every
 *  family's light ramp and dark twin (and both shadow / gradient maps) as long
 *  as any theme exists, which is right for Figma (one primitive collection
 *  holds both) and wrong for a paste that asked for one appearance: a Light
 *  paste carried the whole dark ramp set, a Dark paste listed light shadows and
 *  light gradients as if they were its own. Every semantic value of the kept
 *  appearance resolves to a primitive that survives this cut (tested). */
export function onlyAppearance(json: TokenJSON, appearance: 'light' | 'dark'): TokenJSON {
  const keep = (map: Record<string, string> | undefined) => {
    if (!map) return map
    const twins = darkTwinKeys(map)
    return Object.fromEntries(Object.entries(map).filter(([k]) => (appearance === 'dark') === twins.has(k)))
  }
  const out: TokenJSON = {
    ...json,
    colors: { ...json.colors, primitive: keep(json.colors.primitive) ?? {}, primitiveAlpha: keep(json.colors.primitiveAlpha) },
  }
  if (appearance === 'dark') {
    if (json.shadowsDark && Object.keys(json.shadowsDark).length) out.shadows = json.shadowsDark
    if (json.gradientsDark && Object.keys(json.gradientsDark).length) out.gradients = json.gradientsDark
  }
  delete out.shadowsDark
  delete out.gradientsDark
  return out
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
