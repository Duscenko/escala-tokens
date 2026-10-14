// The store half of `contextRequest.ts`: which TokenJSON a brand's agent
// context is cut from. Kept apart so `contextRequest` stays pure and testable
// from a fixture JSON.

import type { DesignSnapshot } from '../store/useDesignStore'
import type { TokenJSON } from './agentBundle/types'
import { captureCodeSnapshot } from './codeScope'
import { freeDownloadStore } from './freeFigmaScope'
import { generateTokenJSON } from './tokenGenerator'
import type { ContextAppearance } from './contextRequest'

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
  return generateTokenJSON(narrowed) as unknown as TokenJSON
}
