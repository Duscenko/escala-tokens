// What a push would change, read BEFORE it happens: the files Escala is about to
// write set against the blobs already on the repo's default branch. Web and
// Figma plugin show the same review (a badge with the count, the changes one
// click away) and both build it here — never a second diff.
//
// A file is "modified" only when its bytes differ. Two files carry a date by
// design (`.escala/system.json` → savedAt, the agent package's stamp): a date
// alone is not a design change, so those are compared with dates masked.

import { gitBlobSha, listRepoBlobs, readBlob, type RepoFile } from './github'

export type ChangeKind = 'new' | 'modified' | 'removed'

export interface PushChange {
  path: string
  kind: ChangeKind
}

export interface PushPlan {
  /** Only what differs, sorted by path. */
  changes: PushChange[]
  /** Files the push writes that the repo already holds byte for byte. */
  unchanged: number
  /** The repo has no commit yet: everything is new. */
  emptyRepo: boolean
}

// A calendar date, optionally with a time — the only thing masked.
const DATE = /\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?/g
const maskDates = (s: string) => s.replace(DATE, '·')
/** More dated files than this and the rest count as modified: never hang a review on downloads. */
const MAX_DATE_CHECKS = 40

/** Pure: the diff of `files` (+ pruned folders) against a repo's blobs. */
export async function diffPush(
  files: RepoFile[],
  remote: Map<string, string> | null,
  prune: string[],
  readRemote: (sha: string) => Promise<string>,
): Promise<PushPlan> {
  if (!remote) {
    return { changes: files.map((f) => ({ path: f.path, kind: 'new' as const })).sort(byPath), unchanged: 0, emptyRepo: true }
  }
  const changes: PushChange[] = []
  let unchanged = 0
  let checks = 0
  for (const file of files) {
    const have = remote.get(file.path)
    if (!have) { changes.push({ path: file.path, kind: 'new' }); continue }
    if (have === (await gitBlobSha(file.content))) { unchanged++; continue }
    // Differs. If our text carries no date, that difference is real.
    if (maskDates(file.content) === file.content || checks >= MAX_DATE_CHECKS) {
      changes.push({ path: file.path, kind: 'modified' })
      continue
    }
    checks++
    let same = false
    try { same = maskDates(await readRemote(have)) === maskDates(file.content) } catch { /* unreadable: report it */ }
    if (same) unchanged++
    else changes.push({ path: file.path, kind: 'modified' })
  }
  const keep = new Set(files.map((f) => f.path))
  for (const path of remote.keys()) {
    if (!keep.has(path) && prune.some((p) => path.startsWith(p))) changes.push({ path, kind: 'removed' })
  }
  return { changes: changes.sort(byPath), unchanged, emptyRepo: false }
}

const byPath = (a: PushChange, b: PushChange) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)

/** Reads the repo and diffs. Throws what the GitHub client throws. */
export async function planPush(token: string, repo: string, files: RepoFile[], prune: string[] = []): Promise<PushPlan> {
  const remote = await listRepoBlobs(token, repo)
  return diffPush(files, remote, prune, (sha) => readBlob(token, repo, sha))
}

/** One line of the review: a file, or a folder the push owns. */
export interface PushChangeRow {
  label: string
  /** Folder rows end in `/`. */
  folder: boolean
  changes: PushChange[]
  counts: Record<ChangeKind, number>
}

/**
 * The review is a few lines, not 500: root files one by one, each folder the
 * push owns (`prefixes`) as one line with its counts, any other folder grouped
 * by its first segment. A folder with a single change reads as that file.
 */
export function groupPushChanges(changes: PushChange[], prefixes: string[] = []): PushChangeRow[] {
  const owned = [...prefixes].sort((a, b) => b.length - a.length)
  const groups = new Map<string, PushChange[]>()
  for (const c of changes) {
    const prefix = owned.find((p) => c.path.startsWith(p))
    const slash = c.path.indexOf('/')
    const key = prefix ?? (slash > 0 ? c.path.slice(0, slash + 1) : c.path)
    const list = groups.get(key)
    if (list) list.push(c)
    else groups.set(key, [c])
  }
  const rows: PushChangeRow[] = []
  for (const [key, list] of groups) {
    const counts: Record<ChangeKind, number> = { new: 0, modified: 0, removed: 0 }
    for (const c of list) counts[c.kind]++
    const single = list.length === 1
    rows.push({ label: single ? list[0].path : key, folder: !single && key.endsWith('/'), changes: list, counts })
  }
  return rows.sort((a, b) => rank(a) - rank(b) || (a.label < b.label ? -1 : 1))
}
/** Root files first, then folders. */
const rank = (r: PushChangeRow) => (r.changes.length === 1 || !r.folder ? 0 : 1)

/** "3 modified · 2 new" — the counts a row or the whole plan shows. */
export function describeCounts(counts: Record<ChangeKind, number>): string {
  const parts: string[] = []
  if (counts.modified) parts.push(`${counts.modified} modified`)
  if (counts.new) parts.push(`${counts.new} new`)
  if (counts.removed) parts.push(`${counts.removed} removed`)
  return parts.join(' · ')
}
