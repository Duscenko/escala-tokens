// Store-bound Skill export. The markdown/zip builders live in `agentBundle/`
// and take a TokenJSON — this file is the configurator adapter so the wizard
// and the copy-context button keep the same import.

import { buildAgentBundle, type SkillPackage } from './agentBundle'
import { generateTokenJSON } from './tokenGenerator'
import { useDesignStore } from '../store/useDesignStore'

export type { SkillPackage }

export function buildSkillExport(_colorFormat: 'hex' | 'rgba' | 'hsl' | 'oklch' = 'hex'): SkillPackage {
  const store = useDesignStore.getState()
  return buildAgentBundle(generateTokenJSON(), {
    projectFallback: store.projectName,
    iconKey: store.iconAiSource,
  })
}
