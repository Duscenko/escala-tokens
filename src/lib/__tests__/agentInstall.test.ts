import { describe, expect, it } from 'vitest'
import { skillName } from '../agentBundle/names'
import {
  CLI_PACKAGE,
  DEFAULT_PUBLISH_ORIGIN,
  canonicalOrigin,
  cliSkillCommand,
  skillFolderName,
  skillInstallPath,
} from '../agentInstall'
import {
  CLI_USAGE,
  isPublishedTokens,
  originFromHost,
  parseCliArgs,
  planSkillInstall,
  runCli,
  tokensUrl,
} from '../cliInstall'
import type { TokenJSON } from '../agentBundle'

const FIXTURE: TokenJSON = {
  project: 'Acme App',
  colors: {
    primitive: { 'accent-6': '#7f56d9' },
    themeOrder: ['light'],
    architecture: { kind: 'categorical', tokens: {} },
  },
  typography: { fontFamily: 'Inter', sizes: { 'text-md': '16px' }, weights: { medium: 500 } },
  spacing: { '4': '16px' },
  radius: { md: '8px' },
}

describe('agentInstall recipes', () => {
  // Copied URLs stay on the apex so they never depend on a www→apex redirect.
  it('defaults the public origin to the apex host, not www and not a Vercel preview host', () => {
    expect(DEFAULT_PUBLISH_ORIGIN).toBe('https://escalatokens.com')
    expect(DEFAULT_PUBLISH_ORIGIN).not.toMatch(/vercel\.app/)
    expect(DEFAULT_PUBLISH_ORIGIN).not.toMatch(/\/\/www\./)
  })

  it('rewrites www to the apex and passes preview hosts through', () => {
    expect(canonicalOrigin('https://www.escalatokens.com')).toBe('https://escalatokens.com')
    expect(canonicalOrigin('https://www.escalatokens.com/')).toBe('https://escalatokens.com')
    expect(canonicalOrigin('https://preview.example')).toBe('https://preview.example')
    expect(canonicalOrigin('')).toBe(DEFAULT_PUBLISH_ORIGIN)
  })

  it('installs the skill under the zip folder name', () => {
    const project = 'Acme App'
    expect(skillFolderName(project)).toBe(skillName(project))
    expect(skillInstallPath('cursor', project)).toBe(`.cursor/skills/${skillName(project)}/`)
    expect(skillInstallPath('claude', project)).toBe(`.claude/skills/${skillName(project)}/`)
  })

  it('prints npx commands that match the parser', () => {
    const slug = 'acme-app'
    expect(cliSkillCommand(slug, 'cursor')).toBe(`npx ${CLI_PACKAGE} skill --from acme-app --client cursor`)
    expect(parseCliArgs(['skill', '--from', 'acme-app', '--client', 'cursor'])).toMatchObject({
      kind: 'skill',
      slug: 'acme-app',
      client: 'cursor',
      origin: DEFAULT_PUBLISH_ORIGIN,
    })
    expect(cliSkillCommand(slug, 'claude', 'https://preview.example')).toBe(
      `npx ${CLI_PACKAGE} skill --from acme-app --client claude --host https://preview.example`,
    )
  })
})

describe('cliInstall', () => {
  it('normalizes --host to the publish origin', () => {
    expect(originFromHost('https://www.escalatokens.com/')).toBe('https://escalatokens.com')
    expect(originFromHost('https://preview.example')).toBe('https://preview.example')
  })

  it('points token fetch at the frozen /api/tokens contract', () => {
    expect(tokensUrl('https://escalatokens.com', 'acme-app')).toBe(
      'https://escalatokens.com/api/tokens?project=acme-app',
    )
  })

  it('slugifies --from the same way Figma Sync does', () => {
    const parsed = parseCliArgs(['skill', '--from', 'Acme App'])
    expect(parsed).toMatchObject({ kind: 'skill', slug: 'acme-app' })
  })

  it('rejects unknown skill clients and missing --from', () => {
    expect(parseCliArgs(['skill'])).toMatchObject({ kind: 'error' })
    expect(parseCliArgs(['skill', '--from', 'acme', '--client', 'make'])).toMatchObject({ kind: 'error' })
    expect(parseCliArgs(['wat'])).toMatchObject({ kind: 'error' })
    expect(parseCliArgs(['mcp', 'init'])).toMatchObject({ kind: 'error' })
    expect(parseCliArgs(['--help'])).toEqual({ kind: 'help' })
  })

  it('plans skill files under the same folder the zip uses', () => {
    const { relativeDir, files } = planSkillInstall(FIXTURE, 'cursor')
    expect(relativeDir).toBe(skillInstallPath('cursor', 'Acme App').replace(/\/$/, ''))
    expect(files.some((f) => f.path === 'SKILL.md')).toBe(true)
    expect(files.some((f) => f.path === 'AGENTS.md')).toBe(true)
  })

  it('rejects payloads that are not published tokens', () => {
    expect(isPublishedTokens({ error: 'No tokens published yet.' })).toBe(false)
    expect(isPublishedTokens(FIXTURE)).toBe(true)
  })

  it('writes skill files from a fetched payload', async () => {
    const written = new Map<string, string>()
    const code = await runCli(['skill', '--from', 'acme-app', '--client', 'cursor'], {
      cwd: '/repo',
      fetch: async (url) => {
        expect(url).toBe(tokensUrl(DEFAULT_PUBLISH_ORIGIN, 'acme-app'))
        return { ok: true, status: 200, json: async () => FIXTURE }
      },
      readFile: () => null,
      writeFile: (path, text) => { written.set(path, text) },
      mkdirp: () => {},
      log: () => {},
      error: () => {},
    })
    expect(code).toBe(0)
    const skillMd = [...written.keys()].find((p) => p.endsWith('SKILL.md'))
    expect(skillMd).toBe(`/repo/${skillInstallPath('cursor', 'Acme App')}SKILL.md`)
    expect(written.get(skillMd!)?.startsWith('---')).toBe(true)
  })

  it('returns 1 when the blob is missing', async () => {
    let err = ''
    const code = await runCli(['skill', '--from', 'missing'], {
      cwd: '.',
      fetch: async () => ({ ok: false, status: 404, json: async () => ({ error: 'No tokens published yet.' }) }),
      readFile: () => null,
      writeFile: () => {},
      mkdirp: () => {},
      log: () => {},
      error: (msg) => { err = msg },
    })
    expect(code).toBe(1)
    expect(err).toContain('/api/tokens?project=missing')
    expect(err).toContain('unzip')
  })

  it('prints usage on --help', async () => {
    let out = ''
    const code = await runCli(['--help'], {
      cwd: '.',
      fetch: async () => ({ ok: false, status: 0, json: async () => ({}) }),
      readFile: () => null,
      writeFile: () => {},
      mkdirp: () => {},
      log: (msg) => { out = msg },
      error: () => {},
    })
    expect(code).toBe(0)
    expect(out).toBe(CLI_USAGE)
  })
})
