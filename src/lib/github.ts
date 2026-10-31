// Minimal GitHub REST client for the "Save to GitHub" flow. Browser-direct
// (api.github.com sends CORS headers), authenticated with a user-provided
// Personal Access Token. The token lives ONLY in localStorage — never in the
// zustand store, so it can't leak into token exports or the /api/tokens blob.

const API = 'https://api.github.com'
const TOKEN_KEY = 'sd-github-token'

export interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
}

export interface GitHubRepo {
  full_name: string // "owner/repo"
  private: boolean
  default_branch: string
  html_url: string
}

export interface RepoFile {
  path: string
  content: string
}

/** Ephemeral UI state for an explicit repository push. Never persist this:
 * a page reload must not claim that a previous request is still running. */
export type GitHubPushState = 'idle' | 'pushing' | 'done' | 'error'

// ── Token storage ───────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  // Ask the browser not to evict this site's storage (Safari drops sites
  // unvisited for 7 days). Best effort: a refusal changes nothing.
  navigator.storage?.persist?.().catch(() => {})
}
export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// ── Requests ────────────────────────────────────────────────────────────────

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  }
}

/** A GitHub answer that was not OK. `status` is what decides whether the
 *  token is dead (401) or GitHub was only unreachable / rate-limited. */
export class GitHubError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
  }
}

/** True only when GitHub itself refused the token (expired or revoked).
 *  A network failure, a 403 rate limit or a 5xx is NOT this: the token may be
 *  fine, so it must never be deleted on those. */
export function isRejectedTokenError(e: unknown): boolean {
  return e instanceof GitHubError && e.status === 401
}

// Every request bypasses the browser's HTTP cache. GitHub answers GETs with
// `Cache-Control: private, max-age=60`, which a browser honours for `fetch`:
// for a minute after a push, the branch head, a file's sha and a file's body
// could all come back as they were BEFORE it. That made a second push fail as
// "not a fast forward", a Contents PUT 409 on a stale sha, and a repo picked
// right after a push restore the editor from the previous save.
async function gh<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, cache: 'no-store', headers: headers(token) })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new GitHubError(body.message || `GitHub API error (${res.status})`, res.status)
  }
  return res.json() as Promise<T>
}

/** GET /user — validates the token and returns who it belongs to. */
export function validateToken(token: string): Promise<GitHubUser> {
  return gh<GitHubUser>(token, '/user')
}

/** The user's most recently pushed repos (owner affiliation only). */
export function listRepos(token: string): Promise<GitHubRepo[]> {
  return gh<GitHubRepo[]>(token, '/user/repos?per_page=100&sort=pushed&affiliation=owner')
}

/** Creates a private repo to hold the design system. */
export function createRepo(token: string, name: string, description: string): Promise<GitHubRepo> {
  return gh<GitHubRepo>(token, '/user/repos', {
    method: 'POST',
    body: JSON.stringify({ name, description, private: true, auto_init: true }),
  })
}

// Base64 for unicode content (btoa alone throws on non-Latin-1). The bytes go
// through fromCharCode in chunks: spreading a whole large file as arguments
// overflows the call stack.
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000) as unknown as number[])
  }
  return btoa(bin)
}

/** Creates or updates one file via the Contents API (fetches the sha first). */
async function putFile(token: string, repo: string, file: RepoFile, message: string): Promise<void> {
  let sha: string | undefined
  try {
    const existing = await gh<{ sha: string }>(token, `/repos/${repo}/contents/${encodePath(file.path)}`)
    sha = existing.sha
  } catch {
    // 404 — new file
  }
  await gh(token, `/repos/${repo}/contents/${encodePath(file.path)}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: toBase64(file.content), ...(sha ? { sha } : {}) }),
  })
}

function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

/**
 * Reads a file from the repo. Returns null ONLY when GitHub says it is not
 * there (404). Any other failure (offline, 403, rate limit, 5xx) throws: a
 * caller that read "absent" from a failed request would overwrite a file it
 * never saw (a user's README) or report "no snapshot" for a repo that has one.
 * Files over 1 MB come back from the Contents API without a body; those are
 * read through the blob API by their sha.
 */
export async function getFile(token: string, repo: string, path: string): Promise<string | null> {
  let data: { content?: string; encoding?: string; sha?: string; size?: number }
  try {
    data = await gh(token, `/repos/${repo}/contents/${encodePath(path)}`)
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) return null
    throw e
  }
  if (data.content && data.encoding !== 'none') return fromBase64(data.content)
  if (data.sha && (data.size ?? 0) > 0) {
    const blob = await gh<{ content: string }>(token, `/repos/${repo}/git/blobs/${data.sha}`)
    return fromBase64(blob.content)
  }
  return data.size === 0 ? '' : null
}

/** A repo with no commit yet: the Git Data API has no branch to build on. */
function isEmptyRepoError(e: unknown): boolean {
  return e instanceof GitHubError && (e.status === 409 || e.status === 404) && /empty|not found/i.test(e.message)
}

/** Git's own id for a file's content — sha1("blob <bytes>\0" + bytes). Computed
 *  locally so a pushed file can be checked against the commit's tree without
 *  downloading it back. */
export async function gitBlobSha(content: string): Promise<string> {
  const body = new TextEncoder().encode(content)
  const head = new TextEncoder().encode(`blob ${body.length}\0`)
  const buf = new Uint8Array(head.length + body.length)
  buf.set(head, 0)
  buf.set(body, head.length)
  const digest = await crypto.subtle.digest('SHA-1', buf)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** What a push that reached GitHub looks like. `sha` is null when the repo
 *  already held every file byte for byte (no commit was made). `verified` is
 *  the number of files whose blob id in the branch's tree equals the content
 *  that was sent — always every file, or `commitFiles` threw. */
export interface CommitResult {
  sha: string | null
  branch: string
  verified: number
}

/** GitHub accepted the commit but the branch does not show what was sent. */
export class GitHubVerifyError extends GitHubError {
  constructor(message: string) {
    super(message, 0)
    this.name = 'GitHubVerifyError'
  }
}

type TreeEntry = { path: string; type: string; sha: string }
type TreeResponse = { sha: string; tree: TreeEntry[]; truncated?: boolean }

/** Blob ids on a branch, keyed by path. A truncated recursive tree (GitHub stops
 *  at ~100k entries) is completed path by path through the Contents API, so a
 *  file is never reported missing because the listing was cut short. */
async function branchBlobs(token: string, repo: string, ref: string, wanted: string[]): Promise<Map<string, string>> {
  const tree = await gh<TreeResponse>(token, `/repos/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`)
  const blobs = new Map(tree.tree.filter((t) => t.type === 'blob').map((t) => [t.path, t.sha]))
  if (tree.truncated) {
    for (const path of wanted) {
      if (blobs.has(path)) continue
      try {
        const file = await gh<{ sha: string }>(token, `/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`)
        blobs.set(path, file.sha)
      } catch {
        // 404: genuinely absent
      }
    }
  }
  return blobs
}

function encodePath(path: string): string {
  return encodeURIComponent(path).replace(/%2F/g, '/')
}

/**
 * Reads the branch back and proves it carries exactly what was pushed: the
 * head is `expectHead` (when known), every file's blob id equals the sha of
 * the content sent, and no pruned path survived. Throws `GitHubVerifyError`
 * naming the first path that disagrees.
 */
export async function verifyBranch(
  token: string,
  repo: string,
  branch: string,
  files: RepoFile[],
  pruned: string[] = [],
  expectHead?: string,
): Promise<number> {
  const head = (await gh<{ object: { sha: string } }>(token, `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`)).object.sha
  if (expectHead && head !== expectHead) {
    throw new GitHubVerifyError(`GitHub recorded the commit, but ${branch} now points at ${head.slice(0, 7)}, not ${expectHead.slice(0, 7)}. Something else pushed at the same time — push again.`)
  }
  const blobs = await branchBlobs(token, repo, head, files.map((f) => f.path))
  for (const file of files) {
    const got = blobs.get(file.path)
    if (!got) throw new GitHubVerifyError(`${file.path} is not on ${branch} after the push.`)
    const want = await gitBlobSha(file.content)
    if (got !== want) throw new GitHubVerifyError(`${file.path} on ${branch} does not match what was pushed.`)
  }
  for (const path of pruned) {
    if (blobs.has(path)) throw new GitHubVerifyError(`${path} should have been removed from ${branch} but is still there.`)
  }
  return files.length
}

function isNotFastForward(e: unknown): boolean {
  return e instanceof GitHubError && (e.status === 422 || e.status === 409) && /fast.forward|conflict|reference/i.test(e.message)
}

/**
 * Writes every file in ONE commit (Git Data API: tree → commit → ref), so a
 * push of the agent package (~80 files) is a handful of requests and one
 * commit, not one commit per file. Files under `prune` prefixes that this push
 * does not carry are deleted in the same commit — those folders mirror the
 * package. An empty repo (no branch yet) falls back to `pushFiles`, which
 * creates it.
 *
 * Then it READS THE BRANCH BACK (`verifyBranch`) and resolves only when every
 * file is there with the content that was sent. A push that resolves is a push
 * that happened; "GitHub said 200" is not the bar.
 *
 * A ref update refused as not-a-fast-forward (another push landed between
 * reading the head and moving it, or a stale head) is rebuilt once on the new
 * head before giving up.
 */
export async function commitFiles(
  token: string,
  repo: string,
  files: RepoFile[],
  message: string,
  prune: string[] = [],
): Promise<CommitResult> {
  const { default_branch: branch } = await gh<GitHubRepo>(token, `/repos/${repo}`)
  for (let attempt = 0; ; attempt++) {
    try {
      return await commitOnce(token, repo, branch, files, message, prune)
    } catch (e) {
      if (attempt === 0 && isNotFastForward(e)) continue
      throw e
    }
  }
}

async function commitOnce(
  token: string,
  repo: string,
  branch: string,
  files: RepoFile[],
  message: string,
  prune: string[],
): Promise<CommitResult> {
  let head: string
  try {
    head = (await gh<{ object: { sha: string } }>(token, `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`)).object.sha
  } catch (e) {
    if (!isEmptyRepoError(e)) throw e
    await pushFiles(token, repo, files, message)
    const verified = await verifyBranch(token, repo, branch, files)
    const newHead = (await gh<{ object: { sha: string } }>(token, `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`)).object.sha
    return { sha: newHead, branch, verified }
  }
  const base = (await gh<{ tree: { sha: string } }>(token, `/repos/${repo}/git/commits/${head}`)).tree.sha
  const keep = new Set(files.map((f) => f.path))
  let stale: string[] = []
  if (prune.length) {
    const blobs = await branchBlobs(token, repo, head, [])
    stale = [...blobs.keys()].filter((path) => prune.some((p) => path.startsWith(p)) && !keep.has(path))
  }
  const entries = [
    ...files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })),
    ...stale.map((path) => ({ path, mode: '100644', type: 'blob', sha: null })),
  ]
  const tree = await gh<{ sha: string }>(token, `/repos/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: base, tree: entries }),
  })
  if (tree.sha === base) {
    // Nothing changed: no empty commit — but still prove the branch holds it.
    const verified = await verifyBranch(token, repo, branch, files, stale, head)
    return { sha: null, branch, verified }
  }
  const commit = await gh<{ sha: string }>(token, `/repos/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [head] }),
  })
  await gh(token, `/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  })
  const verified = await verifyBranch(token, repo, branch, files, stale, commit.sha)
  return { sha: commit.sha, branch, verified }
}

/**
 * Every file path on the default branch, or null when the repo has no commit
 * yet. One request (recursive tree) — what a review screen needs to say which
 * files a save adds and which it updates.
 */
export async function listRepoPaths(token: string, repo: string): Promise<Set<string> | null> {
  const { default_branch: branch } = await gh<GitHubRepo>(token, `/repos/${repo}`)
  try {
    const tree = await gh<{ tree: { path: string; type: string }[] }>(token, `/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`)
    return new Set(tree.tree.filter((t) => t.type === 'blob').map((t) => t.path))
  } catch (e) {
    if (isEmptyRepoError(e)) return null
    throw e
  }
}

/**
 * Pushes the design-system files sequentially (the Contents API rejects
 * concurrent writes to the same branch with 409s).
 */
export async function pushFiles(
  token: string,
  repo: string,
  files: RepoFile[],
  message: string,
  onProgress?: (path: string) => void,
): Promise<void> {
  for (const file of files) {
    onProgress?.(file.path)
    await putFile(token, repo, file, message)
  }
}
