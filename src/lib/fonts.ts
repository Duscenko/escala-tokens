// Font catalogue for the Typography foundation — shared by the picker (Step4)
// and the export (variables.css / README) so the family stack is consistent.

import { useEffect } from 'react'
import { useDesignStore } from '../store/useDesignStore'

// The catalogue and `fontStack` live in `fontStack.ts` (no React, no store),
// so the registry API can resolve a family stack exactly as variables.css does.
export { FONT_PRESETS, fontStack, type FontPreset } from './fontStack'

// Inject a Google Fonts <link> for `family` once. Requests the four standard
// weights + their italics so every weight token renders correctly.
export function loadGoogleFont(family: string) {
  if (!family || typeof document === 'undefined') return
  const id = `gfont-${family.replace(/\s+/g, '-')}`
  if (document.getElementById(id)) return
  const spec = `ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700`
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${spec}&display=swap`
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = url
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
  useEffect(() => {
    loadGoogleFont(fontFamily)
    loadGoogleFont(headingFontFamily ?? fontFamily)
  }, [fontFamily, headingFontFamily])
}
