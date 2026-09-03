/**
 * Apply a value-only patch produced by the Figma plugin's "Check local edits"
 * (`escala-figma-edits/v1`). Structural changes (new vars, renames, new
 * components) never appear in `supported` — the plugin rejects them with a
 * warning in the report.
 */

import { useDesignStore } from '../store/useDesignStore'

export type FigmaEditsPatch = {
  kind: 'escala-figma-edits/v1'
  project?: string
  supported?: {
    typography?: { fontFamily?: string; headingFontFamily?: string }
  }
  rejected?: { kind: string; detail: string }[]
  summary?: { supported: number; rejected: number }
}

export function isFigmaEditsPatch(value: unknown): value is FigmaEditsPatch {
  return !!value
    && typeof value === 'object'
    && (value as FigmaEditsPatch).kind === 'escala-figma-edits/v1'
}

/** Apply supported value edits into the live store. Returns how many fields moved. */
export function applyFigmaEditsPatch(patch: FigmaEditsPatch): { applied: number; skipped: string[] } {
  const skipped: string[] = []
  let applied = 0
  const typo = patch.supported?.typography
  if (!typo) {
    return { applied: 0, skipped: ['No supported value edits in this patch'] }
  }
  const store = useDesignStore.getState()
  const next = { ...store.typography }
  if (typeof typo.fontFamily === 'string' && typo.fontFamily && typo.fontFamily !== next.fontFamily) {
    next.fontFamily = typo.fontFamily
    applied++
  }
  if (typeof typo.headingFontFamily === 'string' && typo.headingFontFamily
      && typo.headingFontFamily !== (next.headingFontFamily ?? next.fontFamily)) {
    next.headingFontFamily = typo.headingFontFamily
    applied++
  }
  if (applied > 0) store.setTypography(next)

  // Single-theme kits: keep themeFoundations in lockstep with root.
  const themes = Object.keys(store.themes)
  if (themes.length === 1 && applied > 0) {
    store.patchThemeFoundations(themes[0], {
      typography: {
        ...store.typography,
        fontFamily: next.fontFamily,
        headingFontFamily: next.headingFontFamily ?? next.fontFamily,
      },
    })
  }

  if ((patch.rejected?.length ?? 0) > 0) {
    skipped.push(`${patch.rejected!.length} structural change(s) were rejected by the plugin and were not applied`)
  }
  return { applied, skipped }
}
