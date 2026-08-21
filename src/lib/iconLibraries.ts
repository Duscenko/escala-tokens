// Icon library standard.
//
// Escala embeds ONE set: Untitled UI Icons (pre-built from `@untitledui/icons`).
// The other GitHub repos are AI-context recommendations — they are not bundled
// and do not drive the live browser. See `ICON_AI_SOURCES`.

export interface IconLibraryDef {
  key: string
  label: string
  description: string
  npm: string
  site: string
  repo: string
  count: string
  style: string
  license: string
}

export const UNTITLED_LIBRARY: IconLibraryDef = {
  key: 'untitled',
  label: 'Untitled UI Icons',
  description: 'Clean, consistent line icons for modern UI. The set this system ships and previews.',
  npm: '@untitledui/icons',
  site: 'https://www.untitledui.com/icons',
  repo: 'https://github.com/untitleduico/icons',
  count: '1,100+',
  style: 'Stroke · 24px',
  license: 'Untitled UI (use in products; do not redistribute the set)',
}

/** The only bundled library. `ICON_LIBRARIES` stays as an array so existing callers keep working. */
export const ICON_LIBRARIES: IconLibraryDef[] = [UNTITLED_LIBRARY]

export const ICON_LIBRARY_KEYS = ICON_LIBRARIES.map((l) => l.key)

const LEGACY_ICONIFY_KEYS = new Set(['lucide', 'heroicons', 'phosphor', 'radix', 'material'])

/** Any persisted Iconify key resolves to Untitled — the catalog no longer switches. */
export function getIconLibrary(_key?: string): IconLibraryDef {
  return UNTITLED_LIBRARY
}

export function isLegacyIconLibrary(key: string): boolean {
  return LEGACY_ICONIFY_KEYS.has(key)
}

export type IconAiSourceKey = 'untitled' | 'mage' | 'tabler' | 'heroicons'

export interface IconAiSource {
  key: IconAiSourceKey
  label: string
  description: string
  npm: string
  repo: string
  default?: boolean
}

/** Repos the Skill / README tell an AI to use when generating UI. Not live catalogs. */
export const ICON_AI_SOURCES: IconAiSource[] = [
  {
    key: 'untitled',
    label: 'Untitled UI Icons',
    description: 'Same set Escala embeds — best default for generated UI.',
    npm: '@untitledui/icons',
    repo: 'https://github.com/untitleduico/icons',
    default: true,
  },
  {
    key: 'mage',
    label: 'Mage Icons',
    description: 'Open-source icon family. Point the AI here if the product already uses Mage.',
    npm: 'mage-icons-react',
    repo: 'https://github.com/Mage-Icons/mage-icons',
  },
  {
    key: 'tabler',
    label: 'Tabler Icons',
    description: 'Stroke icons from Tabler. A common pick for dashboards and admin UIs.',
    npm: '@tabler/icons-react',
    repo: 'https://github.com/tabler/tabler-icons',
  },
  {
    key: 'heroicons',
    label: 'Heroicons',
    description: 'Icons from the Tailwind team. Use when the generated UI is Tailwind-first.',
    npm: '@heroicons/react',
    repo: 'https://github.com/tailwindlabs/heroicons',
  },
]

export const DEFAULT_ICON_AI_SOURCE: IconAiSourceKey = 'untitled'

export function getIconAiSource(key: string | undefined): IconAiSource {
  return ICON_AI_SOURCES.find((s) => s.key === key) ?? ICON_AI_SOURCES[0]
}

/** If a returning user had Heroicons selected, keep it as their AI source. */
export function aiSourceFromLegacyLibrary(iconLibrary: string | undefined): IconAiSourceKey {
  return iconLibrary === 'heroicons' ? 'heroicons' : DEFAULT_ICON_AI_SOURCE
}

/** Instruction block for Skill / README / Get MD — the repo generated UI must use. */
export function iconAiContext(aiSourceKey?: string): {
  source: IconAiSource
  instruction: string
  markdown: string
} {
  const source = getIconAiSource(aiSourceKey)
  const instruction =
    `When generating UI for this product, use icons from ${source.repo} (${source.label}, \`${source.npm}\`). Do not mix another icon family.`
  const markdown = [
    '## Icons',
    '',
    instruction,
    '',
    `- **Set:** ${source.label}`,
    `- **Repo:** ${source.repo}`,
    `- **Package:** \`${source.npm}\``,
    '- Import per-icon from that package. Do not invent glyphs from Lucide, Phosphor, Material, or any set that is not this repo.',
  ].join('\n')
  return { source, instruction, markdown }
}

/** Canonical UI concepts → Untitled UI export names (specimens, Figma core set). */
export const UNTITLED_CORE: Record<string, string> = {
  star: 'Star01',
  arrow: 'ArrowRight',
  search: 'SearchLg',
  eye: 'Eye',
  plus: 'Plus',
  upload: 'Upload01',
  info: 'InfoCircle',
  success: 'CheckCircle',
  warning: 'AlertTriangle',
  error: 'XCircle',
  home: 'Home01',
  box: 'Cube01',
  grid: 'Grid01',
  image: 'Image01',
  text: 'Type01',
  settings: 'Settings01',
  palette: 'Palette',
  bookmark: 'Bookmark',
  heart: 'Heart',
  share: 'Share01',
  user: 'User01',
  users: 'Users01',
  zap: 'Zap',
  check: 'Check',
}

// Generic line glyphs shown as decorative previews — not the Untitled set.
export const SAMPLE_GLYPHS: { name: string; path: string }[] = [
  { name: 'home', path: 'M3 10.5 12 3l9 7.5M5 9.5V20h4.5v-5.5h5V20H19V9.5' },
  { name: 'search', path: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35' },
  { name: 'heart', path: 'M12 21s-7-4.5-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.5-9.3 9-9.3 9Z' },
  { name: 'bell', path: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0' },
  { name: 'settings', path: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9.5A1.7 1.7 0 0 0 10.6 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9.5a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z' },
  { name: 'check', path: 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3' },
]
