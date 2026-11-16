import type { ReactNode } from 'react'
import { RecipeScope } from '../../../src/components/configurator/docs/skeleton/scope'
import { resolvePreviewTokens } from '../../../src/lib/previewTokens'
import { useDesignStore } from '../../../src/store/useDesignStore'
import type { GridViewport } from '../../../src/lib/layoutTokens'
import { BRAND } from './escalaSystem'

/** The system's real tokens for one Color Semantics mode and one Dimension Semantics · Typography mode: the recipe
 *  stylesheet reads `var(--…)`, RecipeScope supplies the values. Shared by every story (preview.tsx's decorator) and
 *  by the family Documentation's Anatomy previews, so a part reads the same values in both places.
 *
 *  `stage` (a component's Playground): the component sits in the middle of the frame, not pinned to its top-left
 *  corner, and the frame keeps a minimum height (`stageMinHeight`, the full window in the canvas) so a small control
 *  does not read as a 100 px strip. The centring is `margin: auto` on a flex child, never `justify-content: center`:
 *  a component wider or taller than the frame then starts at the edge and scrolls, instead of being cut on both sides. */
export function EscalaScope({ appearance, viewport, fullHeight, growWidth, stage, stageMinHeight = 280, padding = 32, children }: {
  appearance: 'light' | 'dark'; viewport: GridViewport; fullHeight?: boolean; growWidth?: boolean
  stage?: boolean; stageMinHeight?: number; padding?: number; children: ReactNode
}) {
  const t = resolvePreviewTokens(useDesignStore.getState(), BRAND, appearance, viewport)
  const minHeight = fullHeight ? '100vh' : stage ? stageMinHeight : undefined
  return (
    <div
      className={appearance}
      style={{
        background: t.surface, padding, minHeight, minWidth: growWidth ? 'min-content' : undefined,
        boxSizing: 'border-box', ...(stage ? { display: 'flex', flexDirection: 'column' } : null),
      }}
    >
      <RecipeScope t={t}>
        {stage ? <div data-escala-stage="" style={{ margin: 'auto' }}>{children}</div> : children}
      </RecipeScope>
    </div>
  )
}
