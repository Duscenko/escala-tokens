import { describe, expect, it } from 'vitest'
import { gitBlobSha } from '../github'
import { diffPush, groupPushChanges, describeCounts } from '../githubPlan'

const none = async () => { throw new Error('should not download') }
const remoteOf = async (files: Record<string, string>) =>
  new Map(await Promise.all(Object.entries(files).map(async ([p, c]) => [p, await gitBlobSha(c)] as const)))

describe('push change review', () => {
  it('reports new, modified and removed, and counts what is already there', async () => {
    const remote = await remoteOf({ 'a.css': 'one', 'b.css': 'two', 'skills/old.md': 'x', 'keep/me.md': 'mine' })
    const plan = await diffPush(
      [{ path: 'a.css', content: 'one' }, { path: 'b.css', content: 'TWO' }, { path: 'c.css', content: 'three' }],
      remote, ['skills/'], none,
    )
    expect(plan.unchanged).toBe(1)
    expect(plan.changes).toEqual([
      { path: 'b.css', kind: 'modified' },
      { path: 'c.css', kind: 'new' },
      { path: 'skills/old.md', kind: 'removed' },
    ])
  })

  it('treats an empty repo as all new', async () => {
    const plan = await diffPush([{ path: 'a', content: '1' }], null, [], none)
    expect(plan).toEqual({ changes: [{ path: 'a', kind: 'new' }], unchanged: 0, emptyRepo: true })
  })

  it('does not count a date as a change', async () => {
    const old = '{"savedAt":"2026-10-30T10:00:00.000Z","a":1}'
    const remote = await remoteOf({ '.escala/system.json': old })
    const same = await diffPush(
      [{ path: '.escala/system.json', content: '{"savedAt":"2026-10-31T09:15:00.000Z","a":1}' }],
      remote, [], async () => old,
    )
    expect(same.changes).toEqual([])
    expect(same.unchanged).toBe(1)
    const changed = await diffPush(
      [{ path: '.escala/system.json', content: '{"savedAt":"2026-10-31T09:15:00.000Z","a":2}' }],
      remote, [], async () => old,
    )
    expect(changed.changes).toEqual([{ path: '.escala/system.json', kind: 'modified' }])
  })

  it('groups into a few lines: root files one by one, owned folders as one row', () => {
    const rows = groupPushChanges([
      { path: 'tokens.json', kind: 'modified' },
      { path: 'contracts/components/a.json', kind: 'modified' },
      { path: 'contracts/components/b.json', kind: 'new' },
      { path: '.claude/skills/x/SKILL.md', kind: 'modified' },
    ], ['contracts/', '.claude/skills/x/'])
    expect(rows.map((r) => r.label)).toEqual(['.claude/skills/x/SKILL.md', 'tokens.json', 'contracts/'])
    const contracts = rows.find((r) => r.label === 'contracts/')!
    expect(describeCounts(contracts.counts)).toBe('1 modified · 1 new')
  })
})
