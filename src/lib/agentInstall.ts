// Install recipes for the offline agent package (Export → AI assistant).
// Pure: no store, no React. `AgentInstallPanel` and `@escala/cli` call these so
// a path printed in the app cannot drift from the zip's `skillName()` or from
// the CLI that writes it.

import { skillName } from './agentBundle/names'
import { CLI_PUBLISHED } from './featureFlags'

export type SkillAgent = 'cursor' | 'claude'

export const CLI_PACKAGE = '@escala/cli'
/**
 * Public site. Vercel is only the host — never put *.vercel.app in user-facing copy.
 *
 * APEX, not `www.`: copied URLs stay on one host. Both `escalatokens.com` and
 * `www.escalatokens.com` have valid certificates; both are in
 * `publishTrust.KNOWN_HOSTS`.
 */
export const DEFAULT_PUBLISH_ORIGIN = 'https://escalatokens.com'

/**
 * The host a copied URL should name. `www` is rewritten to the apex so a
 * pasted URL never depends on a redirect. Preview hosts and the apex pass
 * through unchanged.
 */
export function canonicalOrigin(origin: string): string {
  const raw = (origin || '').trim()
  if (!raw) return DEFAULT_PUBLISH_ORIGIN
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const u = new URL(withProto)
    if (u.hostname === 'www.escalatokens.com') return DEFAULT_PUBLISH_ORIGIN
    return `${u.protocol}//${u.host}`
  } catch {
    return DEFAULT_PUBLISH_ORIGIN
  }
}

export function skillInstallPath(agent: SkillAgent, project: string): string {
  const name = skillName(project)
  return agent === 'cursor' ? `.cursor/skills/${name}/` : `.claude/skills/${name}/`
}

export function skillFolderName(project: string): string {
  return skillName(project)
}

export function cliSkillCommand(
  slug: string,
  client: SkillAgent = 'cursor',
  origin: string = DEFAULT_PUBLISH_ORIGIN,
): string {
  const base = `npx ${CLI_PACKAGE} skill --from ${slug} --client ${client}`
  const host = origin.replace(/\/$/, '') || DEFAULT_PUBLISH_ORIGIN
  return host === DEFAULT_PUBLISH_ORIGIN ? base : `${base} --host ${host}`
}

/** The file Export → AI assistant downloads (`exportWizard`, `agent-bundle`). */
export function agentBundleZipName(project: string): string {
  return `${skillName(project)}-agent-bundle.zip`
}

/** Installs the offline package from the Export zip — no npm, no network. */
export function unzipSkillCommand(agent: SkillAgent, project: string): string {
  return `unzip -o ${agentBundleZipName(project)} -d ${skillInstallPath(agent, project).replace(/\/$/, '')}`
}

/** The command a surface shows for "install the offline package": the CLI once
 *  it is on npm (`CLI_PUBLISHED`), the unzip until then. */
export function offlineSkillCommand(
  agent: SkillAgent,
  slug: string,
  project: string,
  origin: string = DEFAULT_PUBLISH_ORIGIN,
): string {
  return CLI_PUBLISHED ? cliSkillCommand(slug, agent, origin) : unzipSkillCommand(agent, project)
}
