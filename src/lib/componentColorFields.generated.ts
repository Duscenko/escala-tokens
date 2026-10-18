// GENERATED — `npm run gen:component-color-fields`. Do not hand-edit.
// See scripts/gen-component-color-fields.ts for what this is and why.

import type { PreviewColorField } from './previewColorFields'

/** Component catalogue key → the PreviewTokens color fields its own
 *  specimen (docs/specimens.tsx) actually reads, transitively through
 *  any shared helper it calls. A key absent from this map has no scoped
 *  color data yet — its agent context falls back to the full palette. */
export const COMPONENT_COLOR_FIELDS: Record<string, PreviewColorField[]> = {
  "Accordion": ['surface', 'neutralFill', 'neutralText', 'borderDefault', 'fgMuted'],
  "AlertBanner": ['brandSolid', 'neutralText', 'errorColor', 'fgMuted', 'successColor', 'warningColor', 'infoColor'],
  "AspectRatio": ['brandSolid', 'brandText', 'neutralText', 'borderDefault'],
  "Avatar": ['brandSolid', 'brandText', 'neutralText', 'selectedSurface'],
  "Badge": ['brandSolid', 'brandText', 'onBrand', 'neutralFill', 'neutralText', 'errorColor', 'fgMuted', 'successColor', 'warningColor', 'infoColor'],
  "Breadcrumb": ['neutralText', 'fgMuted', 'placeholderText'],
  "Chip": ['brandSolid', 'brandText', 'neutralText', 'border', 'selectedSurface', 'borderHover', 'accentBorder'],
  "Command": ['neutralFill', 'neutralText', 'borderDefault', 'fgMuted', 'placeholderText'],
  "ContextMenu": ['neutralText', 'errorColor', 'borderDefault', 'placeholderText', 'ghostNeutralHover'],
  "Divider": ['borderDefault'],
  "DropdownMenu": ['surface', 'neutralFill', 'neutralText', 'errorColor', 'border', 'borderDefault', 'fgMuted', 'placeholderText', 'ghostNeutralHover'],
  "FileFormat": ['surface', 'neutralFill', 'border'],
  "Icon": ['neutralText'],
  "InfoTooltip": ['surface', 'neutralText', 'fgMuted'],
  "InlineAlert": ['brandSolid', 'neutralText', 'errorColor', 'fgMuted', 'successColor', 'warningColor', 'infoColor'],
  "Navbar": ['surface', 'brandSolid', 'brandText', 'neutralFill', 'neutralText', 'borderDefault', 'fgMuted', 'selectedSurface'],
  "Pagination": ['surface', 'brandSolid', 'onBrand', 'neutralFill', 'neutralText', 'borderDefault', 'fgMuted', 'placeholderText'],
  "Popover": ['surface', 'brandSolid', 'onBrand', 'neutralFill', 'neutralText', 'border', 'borderDefault', 'fgMuted'],
  "Progress": ['brandSolid', 'neutralFill', 'neutralText', 'fgMuted'],
  "Rating": ['neutralFill', 'neutralText', 'fgMuted', 'warningColor'],
  "ScrollArea": ['surface', 'neutralFill', 'neutralText', 'borderDefault'],
  "SegmentedControl": ['neutralText', 'fgMuted', 'inputSurface'],
  "Sidebar": ['surface', 'brandText', 'neutralFill', 'neutralText', 'borderDefault', 'fgMuted', 'selectedSurface'],
  "Spinner": ['brandSolid', 'neutralFill'],
  "StatusBadge": ['surface', 'neutralFill', 'neutralText', 'errorColor', 'borderDefault', 'fgMuted', 'successColor', 'warningColor'],
  "Stepper": ['brandSolid', 'onBrand', 'neutralFill', 'neutralText', 'fgMuted'],
  "TabMenu": ['brandText', 'neutralText', 'fgMuted', 'selectedSurface'],
  "Tabs": ['brandSolid', 'brandText', 'neutralText', 'borderDefault', 'fgMuted'],
  "Toast": ['surface', 'neutralText'],
  "Tooltip": ['surface', 'neutralText'],
}

/** Component catalogue key → Categorical role ids its specimen resolves BY
 *  NAME rather than through a `PreviewTokens` field — `archTokenOf(t,
 *  'surface.inverse')` and the `previewTokens` helpers (`overlaySurfaceOf`,
 *  `focusBorderOf`, `statusSoftFillOf`…).
 *
 *  `COMPONENT_COLOR_FIELDS` alone can't express these: it is a list of
 *  FIELDS, and a role reached by id never touches one. Inspect tokens
 *  filters measured colours against the roles a component is allowed to
 *  own, so a role missing from both maps is silently dropped from the
 *  badge even though the component visibly paints it. */
export const COMPONENT_ARCH_ROLES: Record<string, string[]> = {
  "Badge": ['status.critical.surface', 'status.info.surface', 'status.success.surface', 'status.warning.surface'],
  "Chip": ['border.control-hover', 'surface.selected'],
  "Command": ['surface.layer-1', 'surface.layer-2'],
  "ContextMenu": ['action.ghost.hover', 'status.critical.content', 'surface.layer-1', 'surface.layer-2'],
  "DropdownMenu": ['action.ghost.hover', 'status.critical.content', 'surface.layer-1', 'surface.layer-2'],
  "Popover": ['surface.layer-1', 'surface.layer-2'],
  "SegmentedControl": ['surface.input', 'surface.layer-1', 'surface.layer-2'],
  "Sidebar": ['surface.selected'],
  "TabMenu": ['surface.selected'],
  "Toast": ['content.inverse', 'surface.inverse'],
}
