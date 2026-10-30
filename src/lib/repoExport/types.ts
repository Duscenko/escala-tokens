// Shapes for the design-system repo export. Pure data: the plugin and the web
// both build the same files from a `TokenJSON` (see buildRepoFiles.ts).

export interface RepoFile {
  path: string
  content: string
}

/** One component (set) the Figma plugin actually built in a file. */
export interface FigmaComponentEntry {
  /** Figma node name — equals a catalogue `figmaSets` entry for Escala-built sets. */
  name: string
  type: 'COMPONENT_SET' | 'COMPONENT'
  /** Component (set) key. Stable across renames inside the same file. */
  key: string
  nodeId: string
  /** Page the node lives on (`❖ Components · <Category>`). */
  page: string
  /** Variant axis → values, read off the set's property definitions. */
  variants?: Record<string, string[]>
}

export const FIGMA_MANIFEST_FORMAT = 'escala-figma/v1' as const

/** `figma/manifest.json` — written by the plugin, never by the web. */
export interface FigmaManifest {
  format: typeof FIGMA_MANIFEST_FORMAT
  /** `figma.fileKey` is only exposed to private plugins; null otherwise. */
  fileKey: string | null
  fileName?: string
  generatedAt: string
  pluginVersion?: string
  components: FigmaComponentEntry[]
}

export interface RepoBuildOptions {
  /** Used when `json.project` is empty. */
  projectFallback?: string
  /** Overrides `json.icons.aiSource.key` for the skills. */
  iconKey?: string
  /** `variables.css`, rendered by the caller (web: `buildCSS`; plugin: its own). Omitted = no file. */
  css?: string
  /** What the Figma file holds. Omitted = no `figma/manifest.json`. */
  figma?: FigmaManifest | null
  /** Write `README.md`. The caller decides with `shouldWriteReadme`. Default true. */
  readme?: boolean
  /** `YYYY-MM-DD` stamp for generated files. Defaults to today. */
  generatedAt?: string
  /** Who built the export — shown in the README. */
  source?: 'web' | 'figma-plugin'
}

export interface RepoBuild {
  files: RepoFile[]
  /** Folders this export owns (trailing slash): files there that it no longer carries are removed on commit. */
  prefixes: string[]
}
