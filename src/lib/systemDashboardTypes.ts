// Types the design system dashboard stores. Kept apart from
// `systemDashboard.ts` so the store can import them without pulling in the
// catalogue, the token generator and the audit (which import the store).

/** Proposed → In review → Approved → Live, or Deprecated. */
export type ElementStatus = 'proposed' | 'review' | 'approved' | 'live' | 'deprecated'

export const ELEMENT_STATUSES: readonly ElementStatus[] = ['proposed', 'review', 'approved', 'live', 'deprecated']

export interface ElementDecision {
  status: ElementStatus
  /** ISO time of the decision. */
  at: string
}

export type ReleaseBump = 'major' | 'minor' | 'patch'

export type ReleaseChangeKind = 'added' | 'changed' | 'removed'

export interface ReleaseChange {
  /** Token path, e.g. `colors.architecture.tokens.action.primary.default.light`. */
  path: string
  kind: ReleaseChangeKind
  before?: string
  after?: string
}

export interface ReleaseRecord {
  version: string
  /** ISO time the release was published. */
  at: string
  bump: ReleaseBump
  note: string
  counts: { added: number; changed: number; removed: number }
  /** The first `RELEASE_CHANGE_LIMIT` changes; `counts` holds the real totals. */
  changes: ReleaseChange[]
}

/** Releases kept per design system. Older ones drop off the end. */
export const RELEASE_HISTORY_LIMIT = 30

/** Changes listed inside one stored release. */
export const RELEASE_CHANGE_LIMIT = 120
