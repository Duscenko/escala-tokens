// ─── Import-your-design-system: shared pipeline types ────────────────────────
// analyze (heuristic detection over arbitrary JSON) → review (modal report) →
// materialize (a complete DesignSnapshot with defaults filling every gap).

export type TokenKind =
  | 'color'
  | 'dimension'
  | 'percent'
  | 'number'
  | 'shadow'
  | 'fontFamily'
  | 'string'

// One recognized leaf value from the walked JSON, with its value normalized
// (colors → hex, rem/em → px) so every later stage speaks one format.
export interface TokenCandidate {
  /** Ancestor container keys (no leaf), original casing. */
  path: string[]
  /** Full dotted path incl. leaf key, lowercased — the identity used for refs. */
  pathStr: string
  /** Leaf key, original casing. */
  key: string
  kind: TokenKind
  value: string
  typeHint?: string
}

export type ImportFamilyKey = 'accent' | 'neutral' | 'error' | 'warning' | 'success' | 'info'

// A primitive color family the import will seed: either a detected ramp
// (resampled onto our 1–12 taxonomy, detected hexes preserved verbatim) or a
// singleton base color with a fully generated ramp.
export interface FamilyPick {
  /** Name the family had in the source file ("primary", "gray", "red"…). */
  name: string
  scale: Record<number, string>
  baseHex: string
  /** 0–1 — detected tones / 12. */
  coverage: number
  /** Tones (1–12) carrying an exact hex from the file. */
  preservedTones: number[]
  source: 'ramp' | 'singleton'
}

export interface MappedSemantic {
  theme: 'light' | 'dark'
  roleKey: string
  hex: string
  via: 'exact' | 'legacy' | 'alias' | 'pattern'
  /** Where in the file the value came from. */
  sourceKey: string
  /** Whether the hex is a tone of the role's resolved family ramp. */
  onRamp: boolean
}

export type ImportIssueKind =
  | 'off-ramp-semantic'
  | 'partial-ramp'
  | 'non-monotonic-ramp'
  | 'duplicate-family'
  | 'unresolved-reference'
  | 'unmapped-semantic'
  | 'incompatible-type-scale'
  | 'ignored-content'
  | 'merged-variants'

export interface ImportIssue {
  kind: ImportIssueKind
  message: string
}

export type FoundationKey =
  | 'spacing'
  | 'radius'
  | 'shadows'
  | 'grid'
  | 'sizes'
  | 'typography'

export interface FoundationReport {
  status: 'detected' | 'default'
  /** Number of keys adopted from the file (0 when status is 'default'). */
  count: number
  /** The record materialize will adopt (empty when status is 'default'). */
  values: Record<string, string>
}

// Structured typography pieces (weights are numbers, so they can't ride in the
// generic FoundationReport values record).
export interface TypographyPick {
  fontFamily?: string
  headingFontFamily?: string
  weights?: Record<string, number>
  sizes?: Record<string, string>
  lineHeights?: Record<string, string>
}

export interface ImportAnalysis {
  /** json.project ?? json.name — prefills the system name in the review step. */
  sourceName: string | null
  fastPath: 'escala' | null
  families: {
    accent?: FamilyPick
    neutral?: FamilyPick
    error?: FamilyPick
    warning?: FamilyPick
    success?: FamilyPick
    info?: FamilyPick
    /** Dark-appearance neutral ramp (Escala fast-path `neutral-dark-*`). */
    grayDark?: FamilyPick
    custom: FamilyPick[]
  }
  semantics: {
    themesDetected: ('light' | 'dark')[]
    mapped: MappedSemantic[]
    unmapped: { pathStr: string; hex: string }[]
  }
  foundations: Record<FoundationKey, FoundationReport>
  typography: TypographyPick
  /** Authoritative page backgrounds when the file declares them (Escala export). */
  backgrounds?: { page?: string; dark?: string }
  /**
   * What the merge/fix pass did (present only when it changed something):
   * light/dark/alpha ramp variants collapsed into single families.
   */
  merge?: { variantsMerged: number; alphaDropped: number; families: number }
  issues: ImportIssue[]
  stats: { totalTokens: number; colors: number }
}

export type AnalyzeResult =
  | { ok: true; analysis: ImportAnalysis }
  | { ok: false; error: string }
