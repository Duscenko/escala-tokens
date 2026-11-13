/**
 * A photo-less avatar fill: a soft three-stop gradient as an SVG data URI, so it goes through the same
 * `src` the Figma `Photo` swap does (the file's avatars carry photos from its Media library; code has none).
 * Opaque by construction — a translucent tint lets the avatar underneath show through when they overlap.
 * Same lightness / chroma envelope as `avatarHueGradient` (`docs/specimens.tsx`), rotated by `hue`.
 */
import { avatarGradientStops } from '../components/escala-ui/avatar'
const STOPS = avatarGradientStops

export { avatarGradientCss, hueFromText } from '../components/escala-ui/avatar'

export function avatarGradientSrc(hue: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" preserveAspectRatio="none">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(-5 .5 .5)">` +
    `<stop offset="0" stop-color="${STOPS(hue)[0]}"/><stop offset=".52" stop-color="${STOPS(hue)[1]}"/>` +
    `<stop offset="1" stop-color="${STOPS(hue)[2]}"/></linearGradient></defs>` +
    `<rect width="64" height="64" fill="url(#g)"/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** Hue offsets that read as a family, cool → warm (the stack in the file's AvatarGroup). */
export const AVATAR_GRADIENT_HUES = [250, 292, 346, 58, 164, 204]
