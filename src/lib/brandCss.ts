// The brand's own `variables.css`, carried INSIDE the payload the Figma plugin
// receives (`brandCss`), so the plugin's "Save to GitHub" writes the SAME file
// the web's CSS door / Get code / GitHub push write — `buildCSS` on the brand's
// code snapshot. The plugin only has the JSON, and re-deriving the CSS from it
// cannot reproduce the roles, gradients and overrides the editor resolves: its
// hand-built `variables.css` missed every role variable (`--radius-action`,
// `--size-control`, `--text-button-*` — the ones recipes.css reads), shipped
// the light primitives only and the system accent's gradients.
//
// Added by the two producers of plugin payloads: the web publish
// (`figmaSync.publishTokens`) and the plugin studio (`pluginStudio`).

import type { DesignSnapshot } from '../store/useDesignStore'
import { captureCodeSnapshot } from './codeScope'
import { buildCSS } from './exporters'
import { themeDisplayName } from './themeSources'

export interface BrandCss {
  /** Library brand key (a payload column is `<key>::<appearance>`). */
  key: string
  name: string
  css: string
}

/** The library brands a payload carries, in its column order. */
export function payloadBrandKeys(json: { colors?: { themeOrder?: unknown } }): string[] {
  const order = Array.isArray(json.colors?.themeOrder) ? (json.colors!.themeOrder as unknown[]).map(String) : []
  return [...new Set(order.map((id) => id.split('::')[0]))]
}

export function brandCssFor(store: DesignSnapshot, keys: string[]): BrandCss[] {
  const labels = (store as { themeLabels?: Record<string, string> }).themeLabels ?? {}
  return keys
    .filter((key) => store.themeOrder.includes(key))
    .map((key) => ({
      key,
      name: themeDisplayName(key, labels),
      css: buildCSS(captureCodeSnapshot(store, key) as never),
    }))
}

/** Bodies over this stay without `brandCss` (the plugin then builds its own):
 *  /api/tokens refuses anything over 2 MB. */
const ROOM = 1_800_000

/** The payload with `brandCss` for every brand it carries — or unchanged when
 *  that would not fit the publish limit. */
export function withBrandCss<T extends { colors?: { themeOrder?: unknown } }>(json: T, store: DesignSnapshot): T {
  const brandCss = brandCssFor(store, payloadBrandKeys(json))
  if (!brandCss.length) return json
  const out = { ...json, brandCss }
  return JSON.stringify(out).length > ROOM ? json : out
}
