// The package's version stamp — what replaces the hosted MCP's "always live".
//
// An offline package can go stale. It cannot stop that, but it can say WHICH
// system it was written for, and the linter it ships can notice when the repo's
// `variables.css` is a different one:
//  - `systemFingerprint` hashes the payload the package was generated from;
//  - `cssExpectations` is the set of values `variables.css` declares on `:root`
//    for that same payload (light semantic roles + spacing / radius / size
//    steps). `token-lint --check-version` resolves the repo's `variables.css`
//    and compares. Locked against `buildCSS` by agentContextAudit.test.ts.

import { webCodeSyntax } from './names'
import type { TokenJSON } from './types'

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort()
      .map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

/** cyrb53 — a fast 53-bit string hash, as 14 hex digits. Not cryptographic:
 *  it only has to tell two versions of a system apart. */
function hash(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
}

/** Same payload → same fingerprint, whatever the key order. */
export function systemFingerprint(json: TokenJSON): string {
  return hash(stable(json))
}

export interface PackageStamp {
  project: string
  schemaVersion: number | null
  generated: string
  fingerprint: string
}

export function packageStamp(json: TokenJSON, generated: string): PackageStamp {
  const schema = (json as { schemaVersion?: number }).schemaVersion
  return {
    project: json.project?.trim() || 'Design system',
    schemaVersion: typeof schema === 'number' ? schema : null,
    generated,
    fingerprint: systemFingerprint(json),
  }
}

/** The mode `:root` carries: the first shipped theme, else `light`. */
function rootMode(byTheme: Record<string, string>, order: string[] | undefined): string | undefined {
  const first = order?.find((k) => byTheme[k] !== undefined)
  if (first) return first
  if (byTheme.light !== undefined) return 'light'
  return Object.keys(byTheme)[0]
}

/** `--name` → the value `variables.css` resolves it to on `:root` (lowercase). */
export function cssExpectations(json: TokenJSON): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [group, tokens] of Object.entries(json.colors.architecture?.tokens ?? {})) {
    for (const [key, byTheme] of Object.entries(tokens)) {
      const mode = rootMode(byTheme, json.colors.themeOrder)
      const v = mode ? byTheme[mode] : undefined
      if (v && !v.startsWith('{')) out[webCodeSyntax(`${group}.${key}`).slice(4, -1)] = v.toLowerCase()
    }
  }
  const dims: [string, Record<string, string> | undefined][] = [
    ['spacing', json.spacing], ['radius', json.radius], ['size', json.sizes],
  ]
  for (const [ns, map] of dims) {
    for (const [k, v] of Object.entries(map ?? {})) {
      if (/^-?\d+(\.\d+)?px$/.test(v)) out[`--${ns}-${k}`] = v.toLowerCase()
    }
  }
  return out
}
