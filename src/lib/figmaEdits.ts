/**
 * Apply a value-only patch produced by the Figma plugin's "Check local edits"
 * (`escala-figma-edits/v1`). Structural changes (new vars, renames, new
 * components) never appear in `supported` — the plugin rejects them with a
 * warning in the report. So does any primitive tone other than a family's
 * anchor (tone 9) — every other step is DERIVED from it, so it has no store
 * field of its own to become.
 */

import { useDesignStore } from '../store/useDesignStore'
import type { StateRole } from './colorActions'

export type FigmaEditsPatch = {
  kind: 'escala-figma-edits/v1'
  project?: string
  supported?: {
    typography?: { fontFamily?: string; headingFontFamily?: string }
    /** Keyed by store field name — see PRIMITIVE_FIELD_ROLE below. */
    primitives?: Record<string, string>
  }
  rejected?: { kind: string; detail: string }[]
  summary?: { supported: number; rejected: number }
}

export function isFigmaEditsPatch(value: unknown): value is FigmaEditsPatch {
  return !!value
    && typeof value === 'object'
    && (value as FigmaEditsPatch).kind === 'escala-figma-edits/v1'
}

/**
 * Applying a primitive base colour has to go through the SAME appliers the
 * live colour pickers use (`useApplyAccentColor`/`useApplyStateColor`), not
 * a raw `setPrimaryColor`/`setErrorColor` — those hooks re-derive the whole
 * ramp (light + dark), cascade the neutral/states links when they're on, and
 * re-anchor the page background exactly like a hand-typed hex would. A plain
 * field write would leave every one of those out of sync with the one value
 * that changed, which is worse than not applying the edit at all. Both
 * appliers are HOOKS (`useCallback`-wrapped), so `figmaEdits.ts` can't call
 * them directly — the caller (`FigmaSyncView`, a component) gets them from
 * the hooks and passes the resulting functions in here.
 */
export interface FigmaEditsAppliers {
  applyAccentColor: (hex: string) => void
  applyStateColor: (role: StateRole, hex: string) => void
}

const PRIMITIVE_FIELD_ROLE: Record<string, StateRole> = {
  errorColor: 'error',
  warningColor: 'warning',
  successColor: 'success',
  infoColor: 'info',
}

/** Apply supported value edits into the live store. Returns how many fields moved. */
export function applyFigmaEditsPatch(
  patch: FigmaEditsPatch,
  appliers: FigmaEditsAppliers,
): { applied: number; skipped: string[] } {
  const skipped: string[] = []
  let applied = 0
  const store = useDesignStore.getState()

  const typo = patch.supported?.typography
  if (typo) {
    const next = { ...store.typography }
    let typoApplied = 0
    if (typeof typo.fontFamily === 'string' && typo.fontFamily && typo.fontFamily !== next.fontFamily) {
      next.fontFamily = typo.fontFamily
      typoApplied++
    }
    if (typeof typo.headingFontFamily === 'string' && typo.headingFontFamily
        && typo.headingFontFamily !== (next.headingFontFamily ?? next.fontFamily)) {
      next.headingFontFamily = typo.headingFontFamily
      typoApplied++
    }
    if (typoApplied > 0) {
      store.setTypography(next)
      applied += typoApplied

      // Single-theme kits: keep themeFoundations in lockstep with root.
      const themes = Object.keys(store.themes)
      if (themes.length === 1) {
        store.patchThemeFoundations(themes[0], {
          typography: {
            ...next,
            fontFamily: next.fontFamily,
            headingFontFamily: next.headingFontFamily ?? next.fontFamily,
          },
        })
      }
    }
  }

  // Primitive family base colours — accent goes through the accent applier
  // (it alone can cascade the linked neutral + linked states + page
  // background); the four status families go through the state applier.
  // Both run the SAME re-derivation a hand-typed hex in the web picker does.
  const prims = patch.supported?.primitives
  if (prims) {
    if (typeof prims.primaryColor === 'string' && prims.primaryColor) {
      appliers.applyAccentColor(`#${prims.primaryColor.replace(/^#/, '')}`)
      applied++
    }
    for (const [field, role] of Object.entries(PRIMITIVE_FIELD_ROLE)) {
      const hex = prims[field]
      if (typeof hex === 'string' && hex) {
        appliers.applyStateColor(role, `#${hex.replace(/^#/, '')}`)
        applied++
      }
    }
  }

  if ((patch.rejected?.length ?? 0) > 0) {
    skipped.push(`${patch.rejected!.length} structural change(s) were rejected by the plugin and were not applied`)
  }
  return { applied, skipped }
}
