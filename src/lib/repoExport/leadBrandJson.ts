// A tokens.json whose ROOT foundations are the lead brand's, for files that read
// the root (README, Design skills, the plugin's variables.css). A payload's root
// typography / radius / spacing / … is the system default kept for older
// consumers; the brand's real values live in `foundationsByTheme[brand]`. A repo
// saved from a web-born system used to open on Inter and the default radius
// while the brand was Roboto with pill buttons.
//
// The lead brand is the first `colors.themeOrder` entry that has foundations
// (the web push's rule: the first of My brands), else `colors.activeTheme`.
// Pure: returns a copy; a payload with no per-brand foundations comes back as is.

import type { TokenJSON } from '../agentBundle/types'

type Foundations = NonNullable<TokenJSON['foundationsByTheme']>[string]

export function leadBrandKey(json: TokenJSON): string | null {
  const by = json.foundationsByTheme
  if (!by || !Object.keys(by).length) return null
  const order = (json.colors as { themeOrder?: string[]; activeTheme?: string } | undefined)?.themeOrder ?? []
  const first = order.find((k) => by[k])
  if (first) return first
  const active = (json.colors as { activeTheme?: string } | undefined)?.activeTheme
  if (active && by[active]) return active
  return Object.keys(by)[0]
}

export function leadBrandJson(json: TokenJSON, brand: string | null = leadBrandKey(json)): TokenJSON {
  const f = brand ? json.foundationsByTheme?.[brand] : undefined
  if (!f) {
    if (!json.brandCss) return json
    const rest: Record<string, unknown> = { ...json }
    delete rest.brandCss
    return rest as unknown as TokenJSON
  }
  const out: Record<string, unknown> = { ...json }
  // CSS strings for the plugin's save; a repo's tokens.json never carries them.
  delete out.brandCss
  for (const [key, value] of Object.entries(f as Foundations & Record<string, unknown>)) {
    if (value == null) continue
    if (key === 'iconWeight') {
      out.icons = { ...(json.icons as object | undefined), weight: value }
    } else if (key === 'iconSizes') {
      out.icons = { ...(out.icons as object | undefined ?? json.icons as object | undefined), sizes: value }
    } else if (key === 'panelBackground') {
      out.colors = { ...(json.colors as object | undefined), panelBackground: value }
    } else if (key === 'typography') {
      out.typography = { ...(json.typography as object | undefined), ...(value as object) }
    } else {
      out[key] = value
    }
  }
  return out as unknown as TokenJSON
}

/** The lead brand's own variables.css from the payload (`brandCss`, attached by
 *  the web publish and the plugin studio), or null when the payload has none
 *  (an older file) — the caller then builds its own. */
export function leadBrandCss(json: TokenJSON): string | null {
  const list = json.brandCss ?? []
  if (!list.length) return null
  const lead = leadBrandKey(json)?.split('::')[0]
  return (list.find((b) => b.key === lead) ?? list[0]).css
}
