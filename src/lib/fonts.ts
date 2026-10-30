// Font catalogue for the Typography foundation — shared by the picker (Step4)
// and the export (variables.css / README) so the family stack is consistent.

import { useEffect } from 'react'
import { isSystemFontFamily } from './platformAxis'
import { useDesignStore } from '../store/useDesignStore'

// The catalogue and `fontStack` live in `fontStack.ts` (no React, no store),
// so the registry API can resolve a family stack exactly as variables.css does.
export { FONT_PRESETS, fontStack, type FontPreset } from './fontStack'
import { findFontSource, fontSourceUrl, googleFontUrl } from './customFonts'

// Inject the stylesheet for `family` once. A family the system ADDED from a
// provider stylesheet (lib/customFonts) loads from that URL; every other name
// is a Google family. Google requests the four standard weights + italics so
// every weight token renders; a static family that lacks one answers 400, so
// the link then falls back to the plain family request (its default weights)
// instead of silently never loading.
export function loadGoogleFont(family: string) {
  if (!family || typeof document === 'undefined' || isSystemFontFamily(family)) return
  const id = `gfont-${family.replace(/\s+/g, '-')}`
  const source = findFontSource(useDesignStore.getState().fontSources, family)
  const css = source?.kind === 'css' && source.url ? source.url : null
  // An added Google family knows the weights it has (customFonts `spec`).
  const want = css ?? (source ? fontSourceUrl(source) : googleFontUrl(family, 'ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700'))
  const existing = document.getElementById(id) as HTMLLinkElement | null
  // Same source already requested → done. A different one (the system added
  // this family from a provider after a Google guess) replaces it.
  if (existing?.dataset.src === want) return
  existing?.remove()
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.dataset.src = want
  link.href = want
  if (!css && !source) {
    link.onerror = () => {
      link.onerror = null
      link.href = googleFontUrl(family)
    }
  }
  document.head.appendChild(link)
}

// Popular Google Fonts for the family picker. Free-text entry in the picker
// loads any other family on demand via loadGoogleFont().
export const POPULAR_GOOGLE_FONTS: string[] = [
  'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Poppins', 'Source Sans 3',
  'Raleway', 'Nunito', 'Nunito Sans', 'Work Sans', 'Rubik', 'Mukta', 'Noto Sans',
  'DM Sans', 'Manrope', 'Karla', 'Mulish', 'Heebo', 'PT Sans', 'Quicksand',
  'Josefin Sans', 'Barlow', 'Barlow Condensed', 'Cabin', 'Hind', 'Fira Sans',
  'Titillium Web', 'Oxygen', 'Kanit', 'Libre Franklin', 'Archivo', 'Archivo Narrow',
  'Public Sans', 'IBM Plex Sans', 'IBM Plex Serif', 'IBM Plex Mono', 'Plus Jakarta Sans',
  'Sora', 'Outfit', 'Geist', 'Onest', 'Figtree', 'Schibsted Grotesk', 'Bricolage Grotesque',
  'Space Grotesk', 'Lexend', 'Lexend Deca', 'Red Hat Display', 'Red Hat Text',
  'Albert Sans', 'Be Vietnam Pro', 'Epilogue', 'Hanken Grotesk', 'Instrument Sans',
  'Anek Latin', 'Sarabun', 'Prompt', 'Chivo', 'Assistant', 'Asap', 'Catamaran',
  'Dosis', 'Exo 2', 'Jost', 'Khand', 'Maven Pro', 'Overpass', 'Saira', 'Signika',
  'Teko', 'Urbanist', 'Varela Round', 'Yantramanav', 'Zen Kaku Gothic New',
  // Serif
  'Playfair Display', 'Merriweather', 'Lora', 'PT Serif', 'Noto Serif', 'Source Serif 4',
  'Roboto Slab', 'Bitter', 'Crimson Text', 'Crimson Pro', 'EB Garamond', 'Cormorant',
  'Cormorant Garamond', 'Libre Baskerville', 'Spectral', 'Domine', 'Frank Ruhl Libre',
  'Zilla Slab', 'Bodoni Moda', 'DM Serif Display', 'DM Serif Text', 'Fraunces',
  'Newsreader', 'Petrona', 'Vollkorn', 'Alegreya', 'Cardo', 'Gelasio', 'Lustria',
  // Display / handwriting
  'Oswald', 'Bebas Neue', 'Anton', 'Abril Fatface', 'Pacifico', 'Caveat', 'Lobster',
  'Dancing Script', 'Comfortaa', 'Righteous', 'Permanent Marker', 'Shadows Into Light',
  'Satisfy', 'Sacramento', 'Great Vibes', 'Cinzel', 'Kalam', 'Patrick Hand',
  // Mono
  'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Space Mono', 'Roboto Mono',
  'Inconsolata', 'Ubuntu Mono', 'PT Mono', 'Courier Prime', 'DM Mono', 'Martian Mono',
]

// Loads the system's active body + heading fonts. Mount this ONCE at the app
// shell, not inside the Typography foundation — `font-family: Inter` (the
// default) is written into every preview atom's inline style from the
// moment the app boots, but nothing actually fetches Inter's webfont until
// this runs. Step4_Typography used to be the only caller (via its own local
// effect), which loaded the fonts only once the user visited that ONE
// foundation — every other foundation's PreviewPanel rendered with the
// browser's fallback font until then, silently failing to look like the
// configured typeface for anyone who never opened Font.
export function useLoadActiveFonts() {
  const fontFamily = useDesignStore((s) => s.typography.fontFamily)
  const headingFontFamily = useDesignStore((s) => s.typography.headingFontFamily)
  // Added families can arrive after the first paint (the account's cloud copy
  // loads later), so re-check whenever the list changes.
  const fontSources = useDesignStore((s) => s.fontSources)
  useEffect(() => {
    loadGoogleFont(fontFamily)
    loadGoogleFont(headingFontFamily ?? fontFamily)
    for (const source of fontSources ?? []) loadGoogleFont(source.family)
  }, [fontFamily, headingFontFamily, fontSources])
}

/** Load `family` again from its CURRENT source — after the system adds or
 *  changes where it comes from, a link injected earlier (a Google guess that
 *  never resolved) must not keep the slot. */
export function reloadFont(family: string) {
  if (!family || typeof document === 'undefined') return
  document.getElementById(`gfont-${family.replace(/\s+/g, '-')}`)?.remove()
  loadGoogleFont(family)
}
