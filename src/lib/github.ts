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

// Base64 for unicode content (btoa alone throws on non-Latin-1).
function toBase64(str: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)))
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
