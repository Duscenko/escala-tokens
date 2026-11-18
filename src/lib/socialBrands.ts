// Social-login colours — the provider's own brand fill, its hover and pressed
// steps, and the fixed ink and focus ring that sit on it. The same for every
// system (a Google button is Google's red in every brand), so this is data,
// not a foundation anyone edits. Values are the Escala Figma file's
// `Social Media Brands` collection.
//
// tokens.json ships it as `socialBrands` (additive): the plugin writes the
// ramps as `Social/<Label>/<step>` primitives (plus `Social/Base/white|black`)
// and the roles as `<Label>/Action/default|hover|pressed`,
// `<Label>/Content/on-action`, `<Label>/Border/focus`. variables.css ships the
// roles as `--social-<id>-action-default` … `--social-<id>-border-focus`.

export type SocialInk = 'white' | 'black'
export interface SocialBrand {
  label: string
  /** step → #rrggbb */
  ramp: Record<string, string>
  /** Which ramp step each state uses. */
  action: { default: string; hover: string; pressed: string }
  onAction: SocialInk
  focus: SocialInk
  /** The focus ring the file binds to `<Label>/Border/focus`: the brand at 31 %, or `neutral` (`Border/ring/neutral`). */
  focusRing: string
}

export const SOCIAL_INK: Record<SocialInk, string> = { white: '#ffffff', black: '#000000' }

// Dark brands (Apple, GitHub, X, Slack) lighten on hover; the rest darken.
const darkens = { default: '500', hover: '600', pressed: '700' }
const lightens = { default: '500', hover: '400', pressed: '300' }

export const SOCIAL_BRANDS: Record<string, SocialBrand> = {
  google: { label: 'Google', ramp: { 500: '#db4437', 600: '#c53d32', 700: '#af362c' }, action: darkens, onAction: 'white', focus: 'black', focusRing: '#db44374f' },
  apple: { label: 'Apple', ramp: { 500: '#000000', 400: '#1f1f1f', 300: '#333333' }, action: lightens, onAction: 'white', focus: 'white', focusRing: 'neutral' },
  discord: { label: 'Discord', ramp: { 500: '#5865f2', 600: '#4f5bda', 700: '#4651c2' }, action: darkens, onAction: 'white', focus: 'white', focusRing: '#5865f24f' },
  dribbble: { label: 'Dribbble', ramp: { 500: '#ea4c89', 600: '#d3447b', 700: '#bb3d6e' }, action: darkens, onAction: 'white', focus: 'black', focusRing: '#ea4c894f' },
  facebook: { label: 'Facebook', ramp: { 500: '#1877f2', 600: '#166bda', 700: '#135fc2' }, action: darkens, onAction: 'white', focus: 'black', focusRing: '#1877f24f' },
  github: { label: 'GitHub', ramp: { 500: '#24292f', 400: '#3e4348', 300: '#505459' }, action: lightens, onAction: 'white', focus: 'white', focusRing: 'neutral' },
  linkedin: { label: 'LinkedIn', ramp: { 500: '#0a66c2', 600: '#095caf', 700: '#08529b' }, action: darkens, onAction: 'white', focus: 'white', focusRing: '#0a66c24f' },
  slack: { label: 'Slack', ramp: { 500: '#4a154b', 400: '#603161', 300: '#6e446f' }, action: lightens, onAction: 'white', focus: 'white', focusRing: '#4a154b4f' },
  x: { label: 'X', ramp: { 500: '#000000', 400: '#1f1f1f', 300: '#333333' }, action: lightens, onAction: 'white', focus: 'white', focusRing: 'neutral' },
}

/** The value of `--social-<id>-border-focus`. */
export function socialFocusRing(b: SocialBrand): string {
  return b.focusRing === 'neutral' ? 'var(--color-border-ring-neutral)' : b.focusRing
}

/** tokens.json `socialBrands` — a copy, so a consumer cannot edit the table. */
export function socialBrandTokens(): Record<string, SocialBrand> {
  return structuredClone(SOCIAL_BRANDS)
}

/** `--social-<id>-action-default` … for `:root`. */
export function socialCssVars(): string[] {
  const out: string[] = []
  for (const [id, b] of Object.entries(SOCIAL_BRANDS)) {
    for (const state of ['default', 'hover', 'pressed'] as const) {
      out.push(`--social-${id}-action-${state}: ${b.ramp[b.action[state]]};`)
    }
    out.push(`--social-${id}-content-on-action: ${SOCIAL_INK[b.onAction]};`)
    out.push(`--social-${id}-border-focus: ${socialFocusRing(b)};`)
  }
  return out
}
