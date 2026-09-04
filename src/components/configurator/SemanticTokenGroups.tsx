// Token Details for a role picked from Theme Preview's inspector.
//
// The quick column used to LIST the roles in five accordion groups. Inspector
// mode made that list a second map of the same tokens — point at a specimen
// and the role is already named — so the groups went, and this file is now
// only the drawer they opened.
//
// It docks exactly like `ThemePanel` (New theme): flush to the Themes Library
// column, measuring the same `aside[aria-label="Themes library"]` box, so the
// two drawers never occupy two different slots. `contained` (fly-out beside
// the quick rail) was the old groups-column language and does not apply here.

import { AnimatePresence, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { useArchitectureTokens } from './architectureTokens'
import { ArchModeEditor, parseRef } from './Step3_SemanticTokens'
import { TokenDetailsModal } from './colorControls'
import { THEME_LIBRARY_WIDTH } from './themeWorkspaceLayout'
import type { ThemeAppearance } from '../../lib/themeModes'
import { stylePreviewStore, type StylePreview } from '../../lib/stylePreviewOverlay'

export default function SemanticTokenDrawer({
  previewTheme,
  previewAppearance,
  tokenId,
  onClose,
  onOpenPrimitiveFamily,
  onOpenInVariables,
  stylePreview,
  inspectedCss,
  onTryOnEdit,
}: {
  previewTheme: string
  previewAppearance: ThemeAppearance
  tokenId: string | null
  onClose: () => void
  onOpenPrimitiveFamily?: (family: string) => void
  onOpenInVariables?: (tokenId: string) => void
  /** Same try-on the artefacts board is painted from. */
  stylePreview?: StylePreview | null
  /** Colour sampled on the canvas for this token — the grid rings the
   *  primitive that matches THIS hex, not a stale stored ref. */
  inspectedCss?: string | null
  /** Session pick on a try-on. Live-store writes are skipped while a style
   *  is tried on — `resetThemeSemantics` would drop them, and they would
   *  also leak onto the committed theme the moment the try-on closed. */
  onTryOnEdit?: (tokenId: string, mode: string, ref: string | null) => void
}) {
  const reduce = useReducedMotion() ?? false
  const live = useDesignStore()
  const overlay = useMemo(
    () => (stylePreview ? stylePreviewStore(live, stylePreview, previewTheme) : null),
    [stylePreview, live, previewTheme],
  )
  const setArchitectureOverride = useDesignStore((s) => s.setArchitectureOverride)
  const {
    archView, scales, resolvedPalettes, kindOf, archModeKeys, previewedMode,
    pageBackground, darkBackground, semanticArchitecture, activeAppearance,
  } = useArchitectureTokens(previewTheme, previewAppearance, overlay)

  const modeLabel = (mode: string) => (kindOf(mode) === 'dark' ? 'Dark' : 'Light')

  const token = tokenId && archView
    ? archView.categories
        .flatMap((c) => c.tokens.map((t) => ({ ...t, id: `${c.key}.${t.key}`, description: c.description })))
        .find((t) => t.id === tokenId)
    : null

  return (
    <AnimatePresence>
      {token && (
        <TokenDetailsModal
          key={token.id}
          name={token.id}
          cssVarName={token.id.replace(/\./g, '-')}
          description={token.description}
          dockLeft={THEME_LIBRARY_WIDTH}
          dockToSelector={'aside[aria-label="Themes library"]'}
          onOpenInTable={onOpenInVariables ? () => onOpenInVariables(token.id) : undefined}
          onReset={() => {
            if (stylePreview && onTryOnEdit) {
              for (const mode of archModeKeys) onTryOnEdit(token.id, mode, null)
              return
            }
            for (const mode of archModeKeys) setArchitectureOverride(semanticArchitecture, token.id, mode, null)
          }}
          resetDisabled={
            stylePreview
              ? !archModeKeys.some((m) => stylePreview.edits?.[token.id]?.[m])
              : !archModeKeys.some((m) => token.edited?.[m])
          }
          onClose={onClose}
          reduce={reduce}
          initialOpenKey={previewedMode}
          sections={archModeKeys
            .filter((mode) => parseRef(token.modes[mode]?.label ?? '') || token.modes[mode]?.css)
            .map((mode) => ({
              key: mode,
              label: modeLabel(mode),
              kind: kindOf(mode),
              content: (
                <ArchModeEditor
                  value={token.modes[mode]}
                  scales={scales}
                  palette={resolvedPalettes[mode]}
                  kind={kindOf(mode)}
                  pageBackground={pageBackground}
                  darkBackground={darkBackground}
                  label={modeLabel(mode)}
                  onPick={(refStr) => {
                    if (stylePreview && onTryOnEdit) {
                      onTryOnEdit(token.id, mode, refStr)
                      return
                    }
                    setArchitectureOverride(semanticArchitecture, token.id, mode, refStr)
                  }}
                  onOpenFamily={onOpenPrimitiveFamily}
                  preferCss={kindOf(mode) === activeAppearance ? inspectedCss : undefined}
                />
              ),
            }))}
        />
      )}
    </AnimatePresence>
  )
}
