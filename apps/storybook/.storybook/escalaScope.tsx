import type { ReactNode } from 'react'
import { RecipeScope } from '../../../src/components/configurator/docs/skeleton/scope'
import { resolvePreviewTokens } from '../../../src/lib/previewTokens'
import { useDesignStore } from '../../../src/store/useDesignStore'
import type { GridViewport } from '../../../src/lib/layoutTokens'
import { BRAND } from './escalaSystem'

/** The system's real tokens for one Color Semantics mode and one Dimension Semantics · Typography mode: the recipe
 *  stylesheet reads `var(--…)`, RecipeScope supplies the values. Shared by every story (preview.tsx's decorator) and
 *  by the family Documentation's Anatomy previews, so a part reads the same values in both places. */
export function EscalaScope({ appearance, viewport, fullHeight, growWidth, padding = 32, children }: {
  appearance: 'light' | 'dark'; viewport: GridViewport; fullHeight?: boolean; growWidth?: boolean; padding?: number; children: ReactNode
}) {
  const t = resolvePreviewTokens(useDesignStore.getState(), BRAND, appearance, viewport)
  return (
    <div className={appearance} style={{ background: t.surface, padding, minHeight: fullHeight ? '100vh' : undefined, minWidth: growWidth ? 'min-content' : undefined }}>
      <RecipeScope t={t}>{children}</RecipeScope>
    </div>
  )
}
