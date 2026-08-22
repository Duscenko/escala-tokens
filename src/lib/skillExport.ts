// Store-bound Skill export. The markdown/zip builders live in `agentBundle/`
// and take a TokenJSON — this file is the configurator adapter so the wizard
// and the copy-context button keep the same import.

import { buildAgentBundle, buildAgentProductBundle, type ProductPackage, type SkillPackage } from './agentBundle'
import { generateTokenJSON } from './tokenGenerator'
import { useDesignStore } from '../store/useDesignStore'

export type { ProductPackage, SkillPackage }

function storeOpts() {
  const store = useDesignStore.getState()
  return {
    projectFallback: store.projectName,
    iconKey: store.iconAiSource,
  }
}

export function buildSkillExport(_colorFormat: 'hex' | 'rgba' | 'hsl' | 'oklch' = 'hex'): SkillPackage {
  return buildAgentBundle(generateTokenJSON(), storeOpts())
}

/** Five-layer zip (AGENTS.md + Skill + task skills + templates + checker). */
export function buildAgentProductExport(_colorFormat: 'hex' | 'rgba' | 'hsl' | 'oklch' = 'hex'): ProductPackage {
  return buildAgentProductBundle(generateTokenJSON(), storeOpts())
}
