// Token Details for a role picked from Theme Preview's inspector.
//
// The quick column used to LIST the roles in five accordion groups. Inspector
// mode made that list a second map of the same tokens — point at a specimen
// and the role is already named — so the groups went, and this file is now
// only the drawer they opened.
//
// It covers Color edition (`#theme-quick-settings`): the library column is
// optional now, and docking to it left Token Details slicing through the
// edition rail. Sitting on that panel is one slot, not two overlapping ones.

import { AnimatePresence, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { captureSnapshot, useDesignStore, type DesignSnapshot } from '../../store/useDesignStore'
import { recordEdit } from '../../lib/editHistory'
import { useArchitectureTokens } from './architectureTokens'
import { ArchModeEditor, parseRef } from './Step3_SemanticTokens'
import { TokenDetailsModal } from './colorControls'
import { QUICK_SETTINGS_ID } from './ThemeQuickSettingsRail'
import type { ThemeAppearance } from '../../lib/themeModes'
import { stylePreviewStore, type StylePreview } from '../../lib/stylePreviewOverlay'
import DimensionSelect from '../ui/DimensionSelect'
import LayoutTokenDetails, { layoutTokenKind } from './LayoutTokenDetails'
import VariableSelect from '../ui/VariableSelect'
import { parseDimension } from '../../lib/dimensions'
import { useDimensions } from '../../lib/useDimensions'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
import { resolveThemeFoundations, type ThemeFoundationOverride } from '../../lib/themeFoundations'
import {
  dimensionRoleValue,
  layoutRoleIsDefault,
  mergeLayoutRoles,
  radiusPickerOptions,
  radiusRoleAt,
  roleValuePx,
  setRadiusRoleViewport,
  LAYOUT_ROLES,
  type GridViewport,
} from '../../lib/layoutTokens'
import {
  aliasesEqual,
  asTypeViewport,
  mergeTypeRoles,
  TYPE_ROLE_BY_KEY,
  typeRoleVar,
  type TypeAlias,
  type TypeWeightKey,
} from '../../lib/typeRoles'
import { FONT_WEIGHT_BASES, TYPE_SCALE_KEYS, type TypeScaleKey } from '../../lib/typographyStandard'

type GeometryKind = 'radius' | 'text' | 'size'

function geometryKind(id: string | null): GeometryKind | null {
  if (!id) return null
  if (id.startsWith('radius.')) return 'radius'
  if (id.startsWith('text.')) return 'text'
  if (id.startsWith('size.')) return 'size'
  return null
}

const PLATFORM_LABEL: Record<GridViewport, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
}

/**
 * Token Details for a radius, text or size role. The colour drawer edits a
 * ramp ref; these roles alias a primitive (`dimension-16`, `text-sm`,
 * `medium`), the same pick Variables already writes.
 */
function GeometryTokenDetails({
  kind,
  tokenId,
  previewTheme,
  previewPlatform,
  stylePreview,
  onClose,
  onOpenInVariables,
}: {
  kind: GeometryKind
  tokenId: string
  previewTheme: string
  previewPlatform: GridViewport
  stylePreview?: StylePreview | null
  onClose: () => void
  onOpenInVariables?: (tokenId: string) => void
}) {
  const reduce = useReducedMotion() ?? false
  const roleKey = tokenId.slice(kind.length + 1)
  const { foundations: liveFoundations, patch } = useThemeFoundations(previewTheme)
  const live = useDesignStore()
  const overlay = useMemo(
    () => (stylePreview ? stylePreviewStore(live, stylePreview, previewTheme) : null),
    [stylePreview, live, previewTheme],
  )
  const foundations = overlay ? resolveThemeFoundations(overlay, previewTheme) : liveFoundations
  const { scale: dimensionScale } = useDimensions(previewTheme)
  const viewport = previewPlatform
  const typeCut = asTypeViewport(viewport)

  const spec = kind === 'text'
    ? TYPE_ROLE_BY_KEY[roleKey]
    : LAYOUT_ROLES[kind === 'radius' ? 'radius' : 'size'].find((role) => role.key === roleKey)

  const write = (partial: ThemeFoundationOverride, label: string) => {
    // A try-on is an overlay. Writing the live theme would leak onto the
    // committed brand, and the overlay has no foundation-edit channel.
    if (stylePreview || !spec) return
    recordEdit(captureSnapshot(useDesignStore.getState() as unknown as DesignSnapshot), label)
    patch(partial)
    const state = useDesignStore.getState()
    if (Object.keys(state.themes).length !== 1) return
    if (partial.radiusRoles) state.setRadiusRoles(partial.radiusRoles)
    if (partial.sizeRoles) state.setSizeRoles(partial.sizeRoles)
    if (partial.typography) state.setTypography(partial.typography)
    if (partial.radiusRoleViewports) useDesignStore.setState({ radiusRoleViewports: partial.radiusRoleViewports })
  }

  if (!spec) return null

  const radiusRoles = mergeLayoutRoles('radius', foundations.radiusRoles)
  const sizeRoles = mergeLayoutRoles('size', foundations.sizeRoles)
  const lengthRaw = kind === 'radius'
    ? radiusRoleAt(foundations.radiusRoles, foundations.radiusRoleViewports, roleKey, viewport)
    : kind === 'size'
      ? sizeRoles[roleKey]
      : null
  const lengthPx = lengthRaw === null ? null : roleValuePx(lengthRaw, kind === 'radius' ? foundations.radius : foundations.sizes)
  const typeRoles = mergeTypeRoles(foundations.typography.roles)
  const alias: TypeAlias | null = kind === 'text' && 'desktop' in spec
    ? (typeRoles[roleKey]?.[typeCut] ?? spec[typeCut])
    : null

  const resetDisabled = kind === 'text'
    ? alias !== null && 'desktop' in spec && aliasesEqual(alias, spec[typeCut])
    : kind === 'radius' && viewport !== 'desktop'
      ? !foundations.radiusRoleViewports?.[viewport]?.[roleKey]
      : layoutRoleIsDefault(
          kind === 'radius' ? 'radius' : 'size',
          roleKey,
          (kind === 'radius' ? radiusRoles : sizeRoles)[roleKey] ?? '',
          kind === 'radius' ? foundations.radius : foundations.sizes,
        )

  const onReset = () => {
    if (kind === 'text' && 'desktop' in spec) {
      const nextModes = { ...typeRoles[roleKey], [typeCut]: spec[typeCut] }
      write({
        typography: { ...foundations.typography, roles: { ...typeRoles, [roleKey]: nextModes } },
      }, `Reset ${tokenId}`)
      return
    }
    if (kind === 'radius' && viewport !== 'desktop') {
      write({
        radiusRoleViewports: setRadiusRoleViewport(foundations.radiusRoleViewports, foundations.radiusRoles, roleKey, viewport, null),
      }, `Reset ${tokenId}`)
      return
    }
    const family = kind === 'radius' ? 'radius' : 'size'
    const current = kind === 'radius' ? radiusRoles : sizeRoles
    const primitive = LAYOUT_ROLES[family].find((role) => role.key === roleKey)?.primitive
    if (!primitive) return
    write(
      family === 'radius'
        ? { radiusRoles: { ...current, [roleKey]: primitive } }
        : { sizeRoles: { ...current, [roleKey]: primitive } },
      `Reset ${tokenId}`,
    )
  }

  const pickRadius = (stored: string) => {
    if (viewport === 'desktop') {
      write({ radiusRoles: { ...radiusRoles, [roleKey]: stored } }, `${tokenId} → ${stored}`)
      return
    }
    write({
      radiusRoleViewports: setRadiusRoleViewport(foundations.radiusRoleViewports, foundations.radiusRoles, roleKey, viewport, stored),
    }, `${tokenId} → ${stored}`)
  }

  const pickLength = (px: string) => {
    const n = parseDimension(px)
    if (n === null || kind !== 'size') return
    const stored = dimensionRoleValue(n)
    write({ sizeRoles: { ...sizeRoles, [roleKey]: stored } }, `${tokenId} → ${stored}`)
  }

  const pickAlias = (next: TypeAlias) => {
    const modes = typeRoles[roleKey] ?? (spec && 'desktop' in spec ? { desktop: spec.desktop, tablet: spec.tablet, mobile: spec.mobile } : null)
    if (!modes) return
    write({
      typography: {
        ...foundations.typography,
        roles: { ...typeRoles, [roleKey]: { ...modes, [typeCut]: next } },
      },
    }, `${tokenId} → ${next.size}`)
  }

  const cssVarName = kind === 'text'
    ? typeRoleVar(roleKey, 'size', typeCut).replace(/^--/, '')
    : `${kind}-${roleKey}`

  return (
    <AnimatePresence>
      <TokenDetailsModal
        key={tokenId}
        name={tokenId}
        cssVarName={cssVarName}
        description={spec.description}
        dockToSelector={`#${QUICK_SETTINGS_ID}`}
        coverAnchor
        inInspector
        onOpenInTable={onOpenInVariables ? () => onOpenInVariables(tokenId) : undefined}
        onReset={onReset}
        resetDisabled={resetDisabled}
        onClose={onClose}
        reduce={reduce}
        initialOpenKey={viewport}
        sections={[{
          key: viewport,
          label: PLATFORM_LABEL[viewport],
          content: kind === 'text' && alias ? (
            <div className="flex flex-col gap-3 px-3 py-3">
              <div className="flex flex-col gap-1">
                <span className="text-nano text-fg-faint">Size</span>
                <VariableSelect
                  ariaLabel={`${tokenId} size primitive`}
                  value={alias.size}
                  onChange={(size) => pickAlias({ ...alias, size: size as TypeScaleKey })}
                >
                  {TYPE_SCALE_KEYS.map((step) => (
                    <option key={step} value={step}>
                      {step}{foundations.typography.sizes[step] ? `  ${foundations.typography.sizes[step]}` : ''}
                    </option>
                  ))}
                </VariableSelect>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-nano text-fg-faint">Weight</span>
                <VariableSelect
                  ariaLabel={`${tokenId} weight primitive`}
                  value={alias.weight}
                  onChange={(weight) => pickAlias({ ...alias, weight: weight as TypeWeightKey })}
                >
                  {FONT_WEIGHT_BASES.map((base) => (
                    <option key={base.key} value={base.key}>{base.key}  {base.weight}</option>
                  ))}
                </VariableSelect>
              </div>
            </div>
          ) : (
            <div className="px-3 py-3">
              {kind === 'radius' ? (
                <VariableSelect
                  ariaLabel={`${tokenId} primitive`}
                  value={lengthRaw ?? ''}
                  onChange={pickRadius}
                >
                  {radiusPickerOptions(foundations.radius, lengthRaw).map((option) => (
                    <option key={option.value} value={option.value} title={`${option.px}px`}>
                      {option.value === 'full' ? 'full' : `${option.value}  ${option.px}px`}
                    </option>
                  ))}
                </VariableSelect>
              ) : (
                <DimensionSelect
                  ariaLabel={`${tokenId} primitive`}
                  value={lengthPx === null ? '0px' : `${lengthPx}px`}
                  scale={dimensionScale}
                  onChange={pickLength}
                />
              )}
            </div>
          ),
        }]}
      />
    </AnimatePresence>
  )
}

export default function SemanticTokenDrawer({
  previewTheme,
  previewAppearance,
  previewPlatform = 'desktop',
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
  /** The board's viewport. Radius and text roles step down on Tablet and Mobile. */
  previewPlatform?: GridViewport
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

  const layoutKind = layoutTokenKind(tokenId)
  if (layoutKind && tokenId) {
    return (
      <LayoutTokenDetails
        kind={layoutKind}
        tokenId={tokenId}
        previewTheme={previewTheme}
        previewPlatform={previewPlatform}
        stylePreview={stylePreview}
        onClose={onClose}
        onOpenInVariables={onOpenInVariables}
      />
    )
  }

  const geometry = geometryKind(tokenId)
  if (geometry && tokenId) {
    return (
      <GeometryTokenDetails
        kind={geometry}
        tokenId={tokenId}
        previewTheme={previewTheme}
        previewPlatform={previewPlatform}
        stylePreview={stylePreview}
        onClose={onClose}
        onOpenInVariables={onOpenInVariables}
      />
    )
  }

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
          dockToSelector={`#${QUICK_SETTINGS_ID}`}
          coverAnchor
          inInspector
          onOpenInTable={onOpenInVariables ? () => onOpenInVariables(token.id) : undefined}
          onReset={() => {
            if (stylePreview && onTryOnEdit) {
              for (const mode of archModeKeys) onTryOnEdit(token.id, mode, null)
              return
            }
            recordEdit(captureSnapshot(useDesignStore.getState() as unknown as DesignSnapshot), `Reset ${token.id}`)
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
                  homeLabel={token.schema?.[mode]?.label}
                  lockScope={`${token.id}:${mode}`}
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
                    recordEdit(captureSnapshot(useDesignStore.getState() as unknown as DesignSnapshot), `${token.id} → ${refStr}`)
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
