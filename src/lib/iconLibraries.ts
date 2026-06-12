// Icon Library standard — the curated icon sets a design system can adopt.
// Pure data (mirrors componentCatalogue.ts / typographyStandard.ts), imported by
// the IconLibrary section UI, the store default, and the token/markdown export.

export interface IconLibraryDef {
  key: string // unique id — stored in `iconLibrary` and exported
  label: string // display name
  description: string // one-liner
  npm: string // install package
  site: string // homepage
  count: string // approx. icon count (display only)
  style: string // visual style note
  iconifyPrefix: string // collection prefix on api.iconify.design (powers the live browser)
}

export const ICON_LIBRARIES: IconLibraryDef[] = [
  {
    key: 'lucide',
    iconifyPrefix: 'lucide',
    label: 'Lucide',
    description: 'Clean, consistent open-source line icons. The community-driven fork of Feather.',
    npm: 'lucide-react',
    site: 'https://lucide.dev',
    count: '1,500+',
    style: 'Stroke · 24px',
  },
  {
    key: 'heroicons',
    iconifyPrefix: 'heroicons',
    label: 'Heroicons',
    description: 'Hand-crafted icons from the makers of Tailwind CSS, in outline and solid.',
    npm: '@heroicons/react',
    site: 'https://heroicons.com',
    count: '300+',
    style: 'Outline / Solid · 24px',
  },
  {
    key: 'phosphor',
    iconifyPrefix: 'ph',
    label: 'Phosphor',
    description: 'A flexible icon family spanning six weights, from thin to fill.',
    npm: '@phosphor-icons/react',
    site: 'https://phosphoricons.com',
    count: '9,000+',
    style: '6 weights',
  },
  {
    key: 'radix',
    iconifyPrefix: 'radix-icons',
    label: 'Radix Icons',
    description: 'A crisp 15×15 set designed specifically for UI, by the Radix team.',
    npm: '@radix-ui/react-icons',
    site: 'https://www.radix-ui.com/icons',
    count: '300+',
    style: 'Stroke · 15px',
  },
  {
    key: 'material',
    iconifyPrefix: 'material-symbols',
    label: 'Material Symbols',
    description: 'Google’s system icons with adjustable weight, fill and grade axes.',
    npm: '@mui/icons-material',
    site: 'https://fonts.google.com/icons',
    count: '3,000+',
    style: 'Variable axes',
  },
]

export const ICON_LIBRARY_KEYS = ICON_LIBRARIES.map((l) => l.key)

export function getIconLibrary(key: string): IconLibraryDef | undefined {
  return ICON_LIBRARIES.find((l) => l.key === key)
}

// Generic line glyphs (24×24, stroke = currentColor) shown as decorative
// previews on the selector cards — they convey the "line icon" feel, not the
// exact per-library set.
export const SAMPLE_GLYPHS: { name: string; path: string }[] = [
  { name: 'home', path: 'M3 10.5 12 3l9 7.5M5 9.5V20h4.5v-5.5h5V20H19V9.5' },
  { name: 'search', path: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35' },
  { name: 'heart', path: 'M12 21s-7-4.5-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.5-9.3 9-9.3 9Z' },
  { name: 'bell', path: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0' },
  { name: 'settings', path: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9.5A1.7 1.7 0 0 0 10.6 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9.5a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z' },
  { name: 'check', path: 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3' },
]
