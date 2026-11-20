// The brand's own `variables.css`, carried INSIDE the payload the Figma plugin
// receives (`brandCss`), so the plugin's "Save to GitHub" writes the SAME file
// the web's CSS door / Get code / GitHub push write — `buildCSS` on the brand's
// code snapshot. The plugin only has the JSON, and re-deriving the CSS from it
// cannot reproduce the roles, gradients and overrides the editor resolves: its
// hand-built `variables.css` missed every role variable (`--radius-action`,
// `--size-control-md`, `--text-button-*` — the ones recipes.css reads), shipped
// the light primitives only and the system accent's gradients.
//
// Added by the two producers of plugin payloads: the web publish
// (`figmaSync.publishTokens`) and the plugin studio (`pluginStudio`).

import type { DesignSnapshot } from '../store/useDesignStore'
import { captureCodeSnapshot } from './codeScope'
import { buildCSS } from './exporters'
import { themeDisplayName } from './themeSources'
import { packBrandCss } from './brandCssPack'

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

/** /api/tokens refuses a body over this (`MAX_BODY_BYTES`, api/tokens.ts). */
const PUBLISH_LIMIT = 2 * 1024 * 1024
/** Bodies over this stay without `brandCss` (the plugin then builds its own).
 *  The 64 KiB under the limit covers what the server adds before it checks
 *  (the licence stamp, under 100 chars) with room to spare.
 *  Ten brands — `BETA_MAX_BRANDS`, the most a system can hold — measured
 *  1,902,872 chars on 2026-11-20: 1.05 MB of tokens plus 851 KB of CSS (about
 *  83 KB per brand). The old 1.9 MB room (set for the Chart layer, 3b242d9)
 *  already dropped their CSS; this one leaves them about 128 KB. */
const ROOM = PUBLISH_LIMIT - 64 * 1024

/** The payload with `brandCss` for every brand it carries — or unchanged when
 *  that would not fit the publish limit. */
export function withBrandCss<T extends { colors?: { themeOrder?: unknown } }>(json: T, store: DesignSnapshot): T {
  return attachPlain(json, brandCssFor(store, payloadBrandKeys(json)))
}

function attachPlain<T extends object>(json: T, brandCss: BrandCss[], room = ROOM): T {
  if (!brandCss.length) return json
  const out = { ...json, brandCss }
  return JSON.stringify(out).length > room ? json : out
}

/** What the web publish sends: plain `brandCss` when it fits (every plugin
 *  reads it), else the same CSS gzipped in `brandCssGzip` (lib/brandCssPack;
 *  plugins from 0.36 unpack it, older ones build their own CSS), else neither.
 *  `room` is ROOM; a test passes a smaller one to reach the packed path. */
export async function withPublishBrandCss<T extends { colors?: { themeOrder?: unknown } }>(json: T, store: DesignSnapshot, room = ROOM): Promise<T> {
  const brandCss = brandCssFor(store, payloadBrandKeys(json))
  const plain = attachPlain(json, brandCss, room)
  if (plain !== json || !brandCss.length) return plain
  const out = { ...json, brandCssGzip: await packBrandCss(brandCss) }
  return JSON.stringify(out).length > room ? json : out
}
