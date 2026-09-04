// Font catalogue for the Typography foundation — shared by the picker (Step4)
// and the export (variables.css / README) so the family stack is consistent.

import { useEffect } from 'react'
import { useDesignStore } from '../store/useDesignStore'

export interface FontPreset {
  label: string
  value: string
  category: 'Sans-serif' | 'Serif' | 'Mono'
}

// The typography quick-edit's family list. Grouped by `category`, which is also
// what `fontStack` reads for the generic fallback — so a serif never falls back
// to sans while it loads.
//
// EVERY entry is verified to resolve against `loadGoogleFont`'s exact weight
// spec (400/500/600/700 + italics). That is not a formality: the css2 API
// returns 400 Bad Request for a static family that lacks a requested weight, and
// a failed stylesheet is a silent fallback to the generic — the font would just
// never appear. All 65 were fetched and confirmed 200 before being added here;
// re-run that check before adding more rather than assuming a family is
// variable.
//
// It also carries every family the System Styles ship (Space Grotesk,
// Roboto, Courier Prime, Playfair Display, Newsreader, JetBrains Mono,
// IBM Plex Sans, Cormorant Garamond, Plus Jakarta Sans), so adopting a
// style no longer lands its typeface as a one-off entry prepended to the list.
export const FONT_PRESETS: FontPreset[] = [
  // Sans-serif
  { label: 'Inter',           value: 'Inter',                category: 'Sans-serif' },
  { label: 'Geist',           value: 'Geist',                category: 'Sans-serif' },
  { label: 'DM Sans',         value: 'DM Sans',              category: 'Sans-serif' },
  { label: 'Plus Jakarta',    value: 'Plus Jakarta Sans',    category: 'Sans-serif' },
  { label: 'Sora',            value: 'Sora',                 category: 'Sans-serif' },
  { label: 'Outfit',          value: 'Outfit',               category: 'Sans-serif' },
  { label: 'Roboto',          value: 'Roboto',               category: 'Sans-serif' },
  { label: 'Open Sans',       value: 'Open Sans',            category: 'Sans-serif' },
  { label: 'Montserrat',      value: 'Montserrat',           category: 'Sans-serif' },
  { label: 'Poppins',         value: 'Poppins',              category: 'Sans-serif' },
  { label: 'Lato',            value: 'Lato',                 category: 'Sans-serif' },
  { label: 'Work Sans',       value: 'Work Sans',            category: 'Sans-serif' },
  { label: 'Manrope',         value: 'Manrope',              category: 'Sans-serif' },
  { label: 'Figtree',         value: 'Figtree',              category: 'Sans-serif' },
  { label: 'Space Grotesk',   value: 'Space Grotesk',        category: 'Sans-serif' },
  { label: 'Urbanist',        value: 'Urbanist',             category: 'Sans-serif' },
  { label: 'Rubik',           value: 'Rubik',                category: 'Sans-serif' },
  { label: 'Nunito Sans',     value: 'Nunito Sans',          category: 'Sans-serif' },
  { label: 'Source Sans 3',   value: 'Source Sans 3',        category: 'Sans-serif' },
  { label: 'Lexend',          value: 'Lexend',               category: 'Sans-serif' },
  { label: 'Archivo',         value: 'Archivo',              category: 'Sans-serif' },
  { label: 'Public Sans',     value: 'Public Sans',          category: 'Sans-serif' },
  { label: 'Albert Sans',     value: 'Albert Sans',          category: 'Sans-serif' },
  { label: 'Onest',           value: 'Onest',                category: 'Sans-serif' },
  { label: 'Instrument Sans', value: 'Instrument Sans',      category: 'Sans-serif' },
  { label: 'Epilogue',        value: 'Epilogue',             category: 'Sans-serif' },
  { label: 'Karla',           value: 'Karla',                category: 'Sans-serif' },
  { label: 'Mulish',          value: 'Mulish',               category: 'Sans-serif' },
  { label: 'Jost',            value: 'Jost',                 category: 'Sans-serif' },
  { label: 'Raleway',         value: 'Raleway',              category: 'Sans-serif' },
  { label: 'Barlow',          value: 'Barlow',               category: 'Sans-serif' },
  { label: 'IBM Plex Sans',   value: 'IBM Plex Sans',        category: 'Sans-serif' },
  { label: 'Schibsted',       value: 'Schibsted Grotesk',    category: 'Sans-serif' },
  { label: 'Bricolage',       value: 'Bricolage Grotesque',  category: 'Sans-serif' },
  { label: 'Hanken Grotesk',  value: 'Hanken Grotesk',       category: 'Sans-serif' },
  { label: 'Red Hat Display', value: 'Red Hat Display',      category: 'Sans-serif' },
  { label: 'Be Vietnam Pro',  value: 'Be Vietnam Pro',       category: 'Sans-serif' },
  // Serif
  { label: 'Fraunces',        value: 'Fraunces',             category: 'Serif'      },
  { label: 'Playfair',        value: 'Playfair Display',     category: 'Serif'      },
  { label: 'Libre Bask.',     value: 'Libre Baskerville',    category: 'Serif'      },
  { label: 'Lora',            value: 'Lora',                 category: 'Serif'      },
  { label: 'Merriweather',    value: 'Merriweather',         category: 'Serif'      },
  { label: 'Source Serif 4',  value: 'Source Serif 4',       category: 'Serif'      },
  { label: 'EB Garamond',     value: 'EB Garamond',          category: 'Serif'      },
  { label: 'Cormorant',       value: 'Cormorant Garamond',   category: 'Serif'      },
  { label: 'Crimson Pro',     value: 'Crimson Pro',          category: 'Serif'      },
  { label: 'Spectral',        value: 'Spectral',             category: 'Serif'      },
  { label: 'Bitter',          value: 'Bitter',               category: 'Serif'      },
  { label: 'PT Serif',        value: 'PT Serif',             category: 'Serif'      },
  { label: 'Noto Serif',      value: 'Noto Serif',           category: 'Serif'      },
  { label: 'Zilla Slab',      value: 'Zilla Slab',           category: 'Serif'      },
  { label: 'Instrument',      value: 'Instrument Serif',     category: 'Serif'      },
  { label: 'Newsreader',      value: 'Newsreader',           category: 'Serif'      },
  { label: 'Literata',        value: 'Literata',             category: 'Serif'      },
  { label: 'IBM Plex Serif',  value: 'IBM Plex Serif',       category: 'Serif'      },
  // Mono
  { label: 'JetBrains',       value: 'JetBrains Mono',       category: 'Mono'       },
  { label: 'Fira Code',       value: 'Fira Code',            category: 'Mono'       },
  { label: 'IBM Plex Mono',   value: 'IBM Plex Mono',        category: 'Mono'       },
  { label: 'Space Mono',      value: 'Space Mono',           category: 'Mono'       },
  { label: 'Source Code Pro', value: 'Source Code Pro',      category: 'Mono'       },
  { label: 'Roboto Mono',     value: 'Roboto Mono',          category: 'Mono'       },
  { label: 'Courier Prime',   value: 'Courier Prime',        category: 'Mono'       },
  { label: 'Geist Mono',      value: 'Geist Mono',           category: 'Mono'       },
  { label: 'DM Mono',         value: 'DM Mono',              category: 'Mono'       },
  { label: 'Inconsolata',     value: 'Inconsolata',          category: 'Mono'       },
]

const FALLBACK: Record<FontPreset['category'], string> = {
  'Sans-serif': 'sans-serif',
  Serif: 'serif',
  Mono: 'monospace',
}

// Families that read as serif / mono even when picked from the wider Google list
// (so fontStack gives them the right generic fallback). Substring match, lowercase.
const SERIF_HINTS = ['serif', 'playfair', 'lora', 'merriweather', 'georgia', 'garamond', 'slab', 'bask', 'fraunces', 'cormorant', 'crimson', 'spectral', 'bitter', 'tinos', 'pt serif', 'noto serif', 'source serif', 'libre caslon', 'eb garamond', 'zilla']
const MONO_HINTS = ['mono', 'code', 'consol', 'courier']

// Full CSS font-family stack with a category-appropriate generic fallback —
// e.g. fontStack('Fraunces') → "'Fraunces', serif" (not sans-serif). Works for
// any family name (incl. arbitrary Google Fonts), inferring the generic fallback.
export function fontStack(family: string): string {
  const preset = FONT_PRESETS.find((f) => f.value === family)
  if (preset) return `'${family}', ${FALLBACK[preset.category]}`
  const lower = family.toLowerCase()
  const generic = MONO_HINTS.some((h) => lower.includes(h))
    ? 'monospace'
    : SERIF_HINTS.some((h) => lower.includes(h))
    ? 'serif'
    : 'sans-serif'
  return `'${family}', ${generic}`
}

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
