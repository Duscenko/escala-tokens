// The agent package as it lands in a product repo on a GitHub push: the same
// files the Export zip carries, under each agent's skills folder — exactly
// where `unzipSkillCommand` would unzip them (`agentInstall.skillInstallPath`,
// asserted equal in agentContextAudit.test.ts). Each push rewrites both
// folders, and files a previous push left there that the package no longer
// carries are removed (`prefixes`), so the folder always IS the package.

import { buildAgentProductFiles } from './product'
import { skillName } from './names'
import type { AgentBundleFile, AgentBundleOptions, TokenJSON } from './types'

export const REPO_SKILL_ROOTS = ['.claude/skills', '.cursor/skills'] as const

export interface RepoSkillFiles {
  /** Folders this push owns, with a trailing slash. */
  prefixes: string[]
  files: { path: string; content: string }[]
}

export function repoSkillFolders(project: string): string[] {
  const name = skillName(project)
  return REPO_SKILL_ROOTS.map((root) => `${root}/${name}/`)
}

export function repoSkillFiles(json: TokenJSON, opts: AgentBundleOptions = {}): RepoSkillFiles {
  const project = json.project?.trim() || opts.projectFallback?.trim() || 'Design system'
  const { files } = buildAgentProductFiles(json, opts)
  const prefixes = repoSkillFolders(project)
  return {
    prefixes,
    files: prefixes.flatMap((prefix) => files.map((f: AgentBundleFile) => ({ path: `${prefix}${f.path}`, content: f.text }))),
  }
}
