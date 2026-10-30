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

async function gh<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: headers(token) })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `GitHub API error (${res.status})`)
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
    const existing = await gh<{ sha: string }>(token, `/repos/${repo}/contents/${file.path}`)
    sha = existing.sha
  } catch {
    // 404 — new file
  }
  await gh(token, `/repos/${repo}/contents/${file.path}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: toBase64(file.content), ...(sha ? { sha } : {}) }),
  })
}

function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

/**
 * Reads a file from the repo. Returns null on 404.
 */
export async function getFile(token: string, repo: string, path: string): Promise<string | null> {
  try {
    const data = await gh<{ content?: string }>(token, `/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`)
    if (!data.content) return null
    return fromBase64(data.content)
  } catch {
    return null
  }
}

/** A repo with no commit yet: the Git Data API has no branch to build on. */
function isEmptyRepoError(e: unknown): boolean {
  return e instanceof Error && /empty|not found/i.test(e.message)
}

/**
 * Writes every file in ONE commit (Git Data API: tree → commit → ref), so a
 * push of the agent package (~80 files) is a handful of requests and one
 * commit, not one commit per file. Files under `prune` prefixes that this push
 * does not carry are deleted in the same commit — those folders mirror the
 * package. An empty repo (no branch yet) falls back to `pushFiles`, which
 * creates it.
 *
 * Resolves to the new commit's sha, or null when nothing changed (or the
 * empty-repo fallback wrote the files one by one).
 */
export async function commitFiles(
  token: string,
  repo: string,
  files: RepoFile[],
  message: string,
  prune: string[] = [],
): Promise<string | null> {
  const { default_branch: branch } = await gh<GitHubRepo>(token, `/repos/${repo}`)
  let head: string
  try {
    head = (await gh<{ object: { sha: string } }>(token, `/repos/${repo}/git/ref/heads/${branch}`)).object.sha
  } catch (e) {
    if (!isEmptyRepoError(e)) throw e
    await pushFiles(token, repo, files, message)
    return null
  }
  const base = (await gh<{ tree: { sha: string } }>(token, `/repos/${repo}/git/commits/${head}`)).tree.sha
  const keep = new Set(files.map((f) => f.path))
  let stale: string[] = []
  if (prune.length) {
    const tree = await gh<{ tree: { path: string; type: string }[] }>(token, `/repos/${repo}/git/trees/${base}?recursive=1`)
    stale = tree.tree
      .filter((t) => t.type === 'blob' && prune.some((p) => t.path.startsWith(p)) && !keep.has(t.path))
      .map((t) => t.path)
  }
  const entries = [
    ...files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })),
    ...stale.map((path) => ({ path, mode: '100644', type: 'blob', sha: null })),
  ]
  const tree = await gh<{ sha: string }>(token, `/repos/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: base, tree: entries }),
  })
  if (tree.sha === base) return null // nothing changed: no empty commit
  const commit = await gh<{ sha: string }>(token, `/repos/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [head] }),
  })
  await gh(token, `/repos/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  })
  return commit.sha
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
