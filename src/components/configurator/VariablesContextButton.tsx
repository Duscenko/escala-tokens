import { useDesignStore } from '../../store/useDesignStore'
import { useFreeTier } from '../../lib/access'
import {
  CONTEXT_FOUNDATIONS,
  buildSystemContext,
  isContextFoundation,
  type ContextScope,
} from '../../lib/contextRequest'
import { contextTokenJson } from '../../lib/contextSource'
import type { ThemeAppearance } from '../../lib/themeModes'
import { AIContextButton } from '../ui/AIContextButton'

const SCOPES: ContextScope[] = ['all', ...CONTEXT_FOUNDATIONS.map((f) => f.key)]

/**
 * Copy context from the Variables card: the brand on screen, starting on the
 * foundation being edited. This replaced the preview panel's `.MD` tab — same
 * idea (the section's markdown, one click away), but it's where you actually
 * are, and it asks what to send instead of always sending everything.
 */
export function VariablesContextButton({
  brand, appearance, foundation,
}: {
  brand: string
  appearance: ThemeAppearance
  foundation: string
}) {
  const free = useFreeTier()
  const scope: ContextScope = isContextFoundation(foundation) ? foundation : 'all'
  return (
    <AIContextButton
      scope="variable"
      label="Copy context"
      agentLimit
      filters={{
        scope,
        scopes: SCOPES,
        lockedAppearance: free ? appearance : null,
        fallbackAppearance: appearance,
        build: (opts) => {
          const store = useDesignStore.getState()
          const json = contextTokenJson(store, brand, opts.appearance)
          return buildSystemContext(json, { scope: opts.scope, detail: opts.detail }, store.projectName)
        },
      }}
    />
  )
}
