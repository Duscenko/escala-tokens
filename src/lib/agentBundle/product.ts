import { zipStore } from '../zipStore'
import { buildAgentSkillFiles } from './skill'
import { buildContextFiles } from './productContext'
import { buildTaskSkillFiles } from './productSkills'
import { buildDesignSkillFiles } from './productDesignSkills'
import { buildTemplateFiles } from './productTemplates'
import { buildCheckerFile } from './productChecker'
import { skillName } from './names'
import { packageStamp } from './stamp'
import type { AgentBundleFile, AgentBundleOptions, SkillPackage, TokenJSON } from './types'

export interface ProductPackage extends SkillPackage {
  files: AgentBundleFile[]
}

function pack(files: AgentBundleFile[]): Uint8Array {
  const encoder = new TextEncoder()
  return zipStore(files.map((f) => ({ path: f.path, data: encoder.encode(f.text) })))
}

/** Five-layer agent package. Reuses the Figma Skill files — does not rebuild them. */
export function buildAgentProductFiles(json: TokenJSON, opts: AgentBundleOptions = {}): {
  name: string
  files: AgentBundleFile[]
} {
  const skill = buildAgentSkillFiles(json, opts)
  const project = json.project?.trim() || opts.projectFallback?.trim() || 'Design system'
  const stamp = packageStamp(json, opts.generatedAt ?? new Date().toISOString().slice(0, 10))
  const files = [
    ...buildContextFiles(json, stamp),
    ...skill.files,
    ...buildTaskSkillFiles(json),
    ...buildDesignSkillFiles(json),
    ...buildTemplateFiles(),
    buildCheckerFile(json, stamp),
  ]
  return { name: skillName(project), files }
}

export function buildAgentProductBundle(json: TokenJSON, opts: AgentBundleOptions = {}): ProductPackage {
  const { name, files } = buildAgentProductFiles(json, opts)
  const preview = files.find((f) => f.path === 'AGENTS.md')?.text ?? ''
  return { name, skillMd: preview, zip: pack(files), files }
}
