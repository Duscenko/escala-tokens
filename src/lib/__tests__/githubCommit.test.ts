import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { commitFiles, gitBlobSha, GitHubVerifyError, verifyBranch } from '../github'

// A push is only "done" once the branch is read back and holds every file,
// byte for byte. These tests drive `commitFiles` against a scripted GitHub.

type Call = { method: string; path: string; body?: Record<string, unknown>; init: RequestInit }
const calls: Call[] = []

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

const FILES = [
  { path: 'tokens.json', content: '{"a":1}' },
  { path: 'README.md', content: 'hello\n' },
]

async function blobsOf(files: { path: string; content: string }[]) {
  return Promise.all(files.map(async (f) => ({ path: f.path, type: 'blob', sha: await gitBlobSha(f.content) })))
}

function script(route: (c: Call) => Response | Promise<Response>) {
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    const path = url.replace('https://api.github.com', '')
    const c: Call = { method: init.method ?? 'GET', path, init, body: init.body ? JSON.parse(init.body as string) : undefined }
    calls.push(c)
    return route(c)
  })
}

beforeEach(() => { calls.length = 0 })
afterEach(() => { vi.unstubAllGlobals() })

describe('gitBlobSha', () => {
  it("is git's blob id", async () => {
    // `git hash-object` of an empty file and of "hello\n"
    expect(await gitBlobSha('')).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391')
    expect(await gitBlobSha('hello\n')).toBe('ce013625030ba8dba906f756967f9e9ca394464a')
    // multi-byte content counts bytes, not characters
    expect(await gitBlobSha('é')).toBe(await gitBlobSha('é'))
    expect(await gitBlobSha('é')).not.toBe(await gitBlobSha('e'))
  })
})

describe('commitFiles', () => {
  it('reads with no-store, commits once, moves the ref and verifies the branch', async () => {
    const good = await blobsOf(FILES)
    let head = 'head0'
    script((c) => {
      if (c.path === '/repos/o/r') return json({ default_branch: 'main' })
      if (c.path === '/repos/o/r/git/ref/heads/main') return json({ object: { sha: head } })
      if (c.path === '/repos/o/r/git/commits/head0') return json({ tree: { sha: 'tree0' } })
      if (c.path === '/repos/o/r/git/trees' && c.method === 'POST') return json({ sha: 'tree1' })
      if (c.path === '/repos/o/r/git/commits' && c.method === 'POST') return json({ sha: 'commit1' })
      if (c.path === '/repos/o/r/git/refs/heads/main' && c.method === 'PATCH') { head = 'commit1'; return json({}) }
      if (c.path === '/repos/o/r/git/trees/commit1?recursive=1') return json({ sha: 'tree1', tree: good })
      return json({ message: `unexpected ${c.method} ${c.path}` }, 500)
    })
    const result = await commitFiles('t', 'o/r', FILES, 'msg')
    expect(result).toEqual({ sha: 'commit1', branch: 'main', verified: 2 })
    expect(calls.every((c) => c.init.cache === 'no-store')).toBe(true)
    const commit = calls.find((c) => c.path === '/repos/o/r/git/commits' && c.method === 'POST')!
    expect(commit.body).toMatchObject({ tree: 'tree1', parents: ['head0'], message: 'msg' })
    const tree = calls.find((c) => c.path === '/repos/o/r/git/trees' && c.method === 'POST')!
    expect(tree.body).toMatchObject({ base_tree: 'tree0' })
    expect((tree.body!.tree as unknown[]).length).toBe(2)
  })

  it('fails loudly when the branch does not show the pushed content', async () => {
    const wrong = [...(await blobsOf([FILES[0]])), { path: 'README.md', type: 'blob', sha: 'deadbeef' }]
    script((c) => {
      if (c.path === '/repos/o/r') return json({ default_branch: 'main' })
      if (c.path === '/repos/o/r/git/ref/heads/main') return json({ object: { sha: 'commit1' } })
      if (c.path === '/repos/o/r/git/commits/commit1') return json({ tree: { sha: 'tree0' } })
      if (c.path === '/repos/o/r/git/trees' && c.method === 'POST') return json({ sha: 'tree1' })
      if (c.path === '/repos/o/r/git/commits' && c.method === 'POST') return json({ sha: 'commit2' })
      if (c.method === 'PATCH') return json({})
      if (c.path.startsWith('/repos/o/r/git/trees/')) return json({ sha: 'x', tree: wrong })
      return json({}, 500)
    })
    // head stays commit1 after the PATCH → the ref did not move
    await expect(commitFiles('t', 'o/r', FILES, 'msg')).rejects.toBeInstanceOf(GitHubVerifyError)
  })

  it('names the file whose content differs', async () => {
    const wrong = [...(await blobsOf([FILES[0]])), { path: 'README.md', type: 'blob', sha: 'deadbeef' }]
    script((c) => {
      if (c.path === '/repos/o/r/git/ref/heads/main') return json({ object: { sha: 'c' } })
      if (c.path.startsWith('/repos/o/r/git/trees/')) return json({ sha: 'x', tree: wrong })
      return json({}, 500)
    })
    await expect(verifyBranch('t', 'o/r', 'main', FILES, [], 'c')).rejects.toThrow(/README\.md on main does not match/)
  })

  it('reports a pruned path that survived', async () => {
    const tree = [...(await blobsOf(FILES)), { path: '.claude/skills/x/old.md', type: 'blob', sha: 'aa' }]
    script((c) => {
      if (c.path === '/repos/o/r/git/ref/heads/main') return json({ object: { sha: 'c' } })
      if (c.path.startsWith('/repos/o/r/git/trees/')) return json({ sha: 'x', tree })
      return json({}, 500)
    })
    await expect(verifyBranch('t', 'o/r', 'main', FILES, ['.claude/skills/x/old.md'], 'c')).rejects.toThrow(/should have been removed/)
  })

  it('makes no commit when the tree is unchanged, and still verifies', async () => {
    const good = await blobsOf(FILES)
    script((c) => {
      if (c.path === '/repos/o/r') return json({ default_branch: 'main' })
      if (c.path === '/repos/o/r/git/ref/heads/main') return json({ object: { sha: 'head0' } })
      if (c.path === '/repos/o/r/git/commits/head0') return json({ tree: { sha: 'tree0' } })
      if (c.path === '/repos/o/r/git/trees' && c.method === 'POST') return json({ sha: 'tree0' })
      if (c.path === '/repos/o/r/git/trees/head0?recursive=1') return json({ sha: 'tree0', tree: good })
      return json({ message: `unexpected ${c.method} ${c.path}` }, 500)
    })
    const result = await commitFiles('t', 'o/r', FILES, 'msg')
    expect(result).toEqual({ sha: null, branch: 'main', verified: 2 })
    expect(calls.some((c) => c.method === 'PATCH' || (c.method === 'POST' && c.path.endsWith('/git/commits')))).toBe(false)
  })

  it('rebuilds once on the new head when the ref update is not a fast forward', async () => {
    const good = await blobsOf(FILES)
    let head = 'head0'
    let patches = 0
    script((c) => {
      if (c.path === '/repos/o/r') return json({ default_branch: 'main' })
      if (c.path === '/repos/o/r/git/ref/heads/main') return json({ object: { sha: head } })
      if (c.path.startsWith('/repos/o/r/git/commits/head')) return json({ tree: { sha: `tree-${c.path.slice(-5)}` } })
      if (c.path === '/repos/o/r/git/trees' && c.method === 'POST') return json({ sha: `new-${c.body!.base_tree}` })
      if (c.path === '/repos/o/r/git/commits' && c.method === 'POST') return json({ sha: `commit-from-${(c.body!.parents as string[])[0]}` })
      if (c.method === 'PATCH') {
        patches++
        if (patches === 1) { head = 'head1'; return json({ message: 'Update is not a fast forward' }, 422) }
        head = c.body!.sha as string
        return json({})
      }
      if (c.path.startsWith('/repos/o/r/git/trees/commit-from-head1')) return json({ sha: 'x', tree: good })
      return json({ message: `unexpected ${c.method} ${c.path}` }, 500)
    })
    const result = await commitFiles('t', 'o/r', FILES, 'msg')
    expect(result.sha).toBe('commit-from-head1')
    expect(patches).toBe(2)
  })

  it('deletes stale files under pruned prefixes in the same commit', async () => {
    const good = await blobsOf(FILES)
    script((c) => {
      if (c.path === '/repos/o/r') return json({ default_branch: 'main' })
      if (c.path === '/repos/o/r/git/ref/heads/main') return json({ object: { sha: 'head0' } })
      if (c.path === '/repos/o/r/git/commits/head0') return json({ tree: { sha: 'tree0' } })
      if (c.path === '/repos/o/r/git/trees/head0?recursive=1') return json({ sha: 'tree0', tree: [...good, { path: '.claude/skills/x/old.md', type: 'blob', sha: 'aa' }, { path: 'src/keep.ts', type: 'blob', sha: 'bb' }] })
      if (c.path === '/repos/o/r/git/trees' && c.method === 'POST') return json({ sha: 'tree1' })
      if (c.path === '/repos/o/r/git/commits' && c.method === 'POST') return json({ sha: 'commit1' })
      if (c.method === 'PATCH') return json({})
      if (c.path === '/repos/o/r/git/trees/commit1?recursive=1') return json({ sha: 'tree1', tree: [...good, { path: 'src/keep.ts', type: 'blob', sha: 'bb' }] })
      return json({ message: `unexpected ${c.method} ${c.path}` }, 500)
    })
    // the verify re-reads the ref: after the PATCH it must be commit1
    calls.length = 0
    let moved = false
    const inner = globalThis.fetch
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') moved = true
      if (url.endsWith('/git/ref/heads/main') && moved) return json({ object: { sha: 'commit1' } })
      return inner(url, init)
    })
    const result = await commitFiles('t', 'o/r', FILES, 'msg', ['.claude/skills/x/'])
    expect(result.sha).toBe('commit1')
    const tree = calls.find((c) => c.path === '/repos/o/r/git/trees' && c.method === 'POST')!
    expect(tree.body!.tree).toContainEqual({ path: '.claude/skills/x/old.md', mode: '100644', type: 'blob', sha: null })
    expect((tree.body!.tree as { path: string }[]).map((t) => t.path)).not.toContain('src/keep.ts')
  })

  it('starts an empty repo with one file, then commits everything at once', async () => {
    // A repo made on GitHub without a README: no branch until the first write.
    // A save is ~500 files, and one Contents PUT per file trips GitHub's limit
    // of ~80 content writes a minute.
    const many = Array.from({ length: 120 }, (_, i) => ({ path: `f/${i}.txt`, content: `${i}\n` }))
    const files = [...many, ...FILES]
    const good = await blobsOf(files)
    let head: string | null = null
    script((c) => {
      if (c.path === '/repos/o/r') return json({ default_branch: 'main' })
      if (c.path === '/repos/o/r/git/ref/heads/main') return head ? json({ object: { sha: head } }) : json({ message: 'Git Repository is empty.' }, 409)
      if (c.path === '/repos/o/r/contents/README.md' && c.method === 'GET') return json({ message: 'This repository is empty.' }, 404)
      if (c.path === '/repos/o/r/contents/README.md' && c.method === 'PUT') { head = 'seed'; return json({ commit: { sha: 'seed' } }, 201) }
      if (c.path === '/repos/o/r/git/commits/seed') return json({ tree: { sha: 'tree0' } })
      if (c.path === '/repos/o/r/git/trees' && c.method === 'POST') return json({ sha: 'tree1' })
      if (c.path === '/repos/o/r/git/commits' && c.method === 'POST') return json({ sha: 'commit1' })
      if (c.path === '/repos/o/r/git/refs/heads/main' && c.method === 'PATCH') { head = 'commit1'; return json({}) }
      if (c.path === '/repos/o/r/git/trees/commit1?recursive=1') return json({ sha: 'tree1', tree: good })
      return json({ message: `unexpected ${c.method} ${c.path}` }, 500)
    })
    const result = await commitFiles('t', 'o/r', files, 'msg')
    expect(result).toEqual({ sha: 'commit1', branch: 'main', verified: files.length })
    expect(calls.filter((c) => c.method === 'PUT').map((c) => c.path)).toEqual(['/repos/o/r/contents/README.md'])
    const tree = calls.find((c) => c.path === '/repos/o/r/git/trees' && c.method === 'POST')!
    expect(tree.body).toMatchObject({ base_tree: 'tree0' })
    expect((tree.body!.tree as unknown[]).length).toBe(files.length)
    const commit = calls.find((c) => c.path === '/repos/o/r/git/commits' && c.method === 'POST')!
    expect(commit.body).toMatchObject({ parents: ['seed'] })
  })
})

describe('getFile', () => {
  it('is null only on a 404, and throws on any other failure', async () => {
    const { getFile } = await import('../github')
    script(() => json({ message: 'Not Found' }, 404))
    expect(await getFile('t', 'o/r', 'README.md')).toBeNull()
    script(() => json({ message: 'API rate limit exceeded' }, 403))
    await expect(getFile('t', 'o/r', 'README.md')).rejects.toThrow(/rate limit/)
    script(() => json({ message: 'Server Error' }, 502))
    await expect(getFile('t', 'o/r', 'README.md')).rejects.toThrow()
  })

  it('decodes unicode and reads a file over 1 MB through its blob', async () => {
    const { getFile } = await import('../github')
    const b64 = (str: string) => btoa(String.fromCharCode(...new TextEncoder().encode(str)))
    script(() => json({ content: b64('# Café ✓\n'), encoding: 'base64', size: 12, sha: 's' }))
    expect(await getFile('t', 'o/r', 'README.md')).toBe('# Café ✓\n')
    script((c) => c.path.includes('/git/blobs/big')
      ? json({ content: b64('{"big":true}') })
      : json({ content: '', encoding: 'none', size: 2_000_000, sha: 'big' }))
    expect(await getFile('t', 'o/r', '.escala/system.json')).toBe('{"big":true}')
  })
})
