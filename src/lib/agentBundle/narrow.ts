// Narrowing a TokenJSON to one appearance. Pure (no store), so the Figma
// plugin's bundle can import it; `contextSource.ts` re-exports it.

import type { TokenJSON } from './types'

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
