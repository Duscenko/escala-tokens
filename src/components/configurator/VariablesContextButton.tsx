import { useDesignStore } from '../../store/useDesignStore'
import {
  CONTEXT_FOUNDATIONS,
  isContextFoundation,
  type ContextScope,
} from '../../lib/contextRequest'
import { brandContext } from '../../lib/contextSource'
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
  const scope: ContextScope = isContextFoundation(foundation) ? foundation : 'all'
  return (
    <AIContextButton
      scope="variable"
      label="Copy context"
      filters={{
        scope,
        scopes: SCOPES,
        fallbackAppearance: appearance,
        build: (opts) => {
          const store = useDesignStore.getState()
          return brandContext(store, brand, opts, store.projectName)
        },
      }}
    />
  )
}
