// Store-bound Skill export. The markdown/zip builders live in `agentBundle/`
// and take a TokenJSON — this file is the configurator adapter so the wizard
// and the copy-context button keep the same import.

import { withAgentEnvelope } from './aiContext'
import { buildAgentBundle, buildAgentProductBundle, type ProductPackage, type SkillPackage } from './agentBundle'
import { generateTokenJSON } from './tokenGenerator'
import { useDesignStore, type DesignSnapshot } from '../store/useDesignStore'

export type { ProductPackage, SkillPackage }

function storeOpts() {
  const store = useDesignStore.getState()
  return {
    projectFallback: store.projectName,
    iconKey: store.iconAiSource,
  }
}

export function buildSkillExport(
  _colorFormat: 'hex' | 'rgba' | 'hsl' | 'oklch' = 'hex',
  source?: DesignSnapshot | ReturnType<typeof useDesignStore.getState>,
): SkillPackage {
  const json = generateTokenJSON(source)
  const opts = source
    ? { projectFallback: source.projectName, iconKey: source.iconAiSource }
    : storeOpts()
  return buildAgentBundle(json, opts)
}

/** Clipboard payload for Copy page — Skill markdown inside the agent-context envelope. */
export function buildCopyPageContext(): string {
  const json = generateTokenJSON()
  const pack = buildAgentBundle(json, storeOpts())
  const title = json.project?.trim() || storeOpts().projectFallback?.trim() || 'Design system'
  return withAgentEnvelope('global', title, pack.skillMd)
}

/** Five-layer zip (AGENTS.md + Skill + task skills + templates + checker). */
export function buildAgentProductExport(_colorFormat: 'hex' | 'rgba' | 'hsl' | 'oklch' = 'hex'): ProductPackage {
  return buildAgentProductBundle(generateTokenJSON(), storeOpts())
}
