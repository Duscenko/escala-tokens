import { FOUNDATION_KEYS } from './foundationKeys'

export type VariablesNavFoundation = (typeof FOUNDATION_KEYS)[number]

// Variables' left column (design-plans/generator-left-nav.md): every
// foundation by name, the Dimension family apart — its five roles all alias
// the one Dimension scale. A test keeps it covering FOUNDATION_KEYS exactly
// once, so a new foundation cannot be missing from the column.
export const VARIABLES_NAV_GROUPS: { label: string; keys: VariablesNavFoundation[] }[] = [
  { label: 'Foundations', keys: ['color', 'typography', 'shadow', 'motion', 'icons'] },
  { label: 'Dimensions', keys: ['dimensions', 'radius', 'spacing', 'sizes', 'grid', 'stroke'] },
]

/** Names the column shows where the rail's short label would be cryptic
 *  ("Font", a bare "Dimensions" under the Dimensions heading). */
export const VARIABLES_NAV_LABEL: Partial<Record<VariablesNavFoundation, string>> = {
  typography: 'Typography',
  dimensions: 'Scale',
}
