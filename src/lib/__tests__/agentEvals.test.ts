import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildAgentProductBundle, type TokenJSON } from '../agentBundle'

const here = dirname(fileURLToPath(import.meta.url))
const evalDir = join(here, '../../../evals/agent-output')

const fixture = JSON.parse(readFileSync(join(evalDir, 'system.json'), 'utf8')) as TokenJSON

function runLint(checkerSource: string, target: string) {
  const dir = mkdtempSync(join(tmpdir(), 'escala-eval-'))
  const lint = join(dir, 'token-lint.mjs')
  writeFileSync(lint, checkerSource)
  return spawnSync(process.execPath, [lint, target], { encoding: 'utf8' })
}

describe('agent-bundle evals (generated token-lint vs corpus)', () => {
  const pack = buildAgentProductBundle(fixture)
  const checker = pack.files.find((f) => f.path === 'checkers/token-lint.mjs')?.text
  if (!checker) throw new Error('bundle missing checkers/token-lint.mjs')

  it('pass.semantic-button.tsx is clean', () => {
    const result = runLint(checker, join(evalDir, 'pass.semantic-button.tsx'))
    expect(result.status, result.stdout + result.stderr).toBe(0)
  })

  it('fail.hex-button.tsx is caught and pointed at the semantic CSS var', () => {
    const result = runLint(checker, join(evalDir, 'fail.hex-button.tsx'))
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('#7f56d9')
    expect(result.stdout).toContain('var(--color-action-primary-default)')
  })

  it('fail.raw-px.tsx is caught for spacing and radius tokens', () => {
    const result = runLint(checker, join(evalDir, 'fail.raw-px.tsx'))
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('16px')
    expect(result.stdout).toContain('var(--spacing-4)')
    expect(result.stdout).toContain('8px')
    expect(result.stdout).toContain('var(--radius-md)')
  })

  it('AGENTS.md in the bundle forbids inventing names', () => {
    expect(pack.skillMd).toMatch(/Do not invent/i)
    expect(pack.files.some((f) => f.path === 'AGENTS.md')).toBe(true)
  })
})
