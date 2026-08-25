// The color-carrying subset of `PreviewTokens` — the fixed vocabulary a
// specimen can bind to, and the mapping back to the flat semantic role each
// field resolves from (`resolvePreviewTokens` in `previewTokens.ts` is the
// authority; this is a hand-verified mirror of its `resolveRole(...)` calls,
// not a re-derivation, so it can only drift by someone editing one file and
// forgetting the other — the same risk every hand-mirrored table in this
// codebase carries and accepts).
//
// Two consumers read this list:
// - `scripts/gen-component-color-fields.ts` — which of these fields a given
//   component's specimen (in `docs/specimens.tsx`) actually reads, statically.
// - `lib/agentContext.ts` — the label/CSS-var shown for each field in a
//   component's scoped "Color" section.
//
// `errorColor`/`warningColor`/`infoColor`/`successColor` have `role: null`:
// they resolve from a STATE FAMILY's tone 9 (`pal?.error?.[9] || …`), not a
// flat semantic role — and which family backs "error" can be re-pointed by a
// theme (`themeSources`), so there is no single CSS var name that's always
// correct. Printing one anyway is exactly the "invented parallel name" this
// codebase refuses to do elsewhere; these four are labeled without one.
export type PreviewColorField =
  | 'surface' | 'brandSolid' | 'brandText' | 'onBrand' | 'neutralFill' | 'neutralText'
  | 'errorColor' | 'disabledBg' | 'disabledText' | 'border' | 'borderDefault'
  | 'fgMuted' | 'placeholderText' | 'successColor' | 'warningColor' | 'infoColor'

export const PREVIEW_COLOR_FIELDS: PreviewColorField[] = [
  'surface', 'brandSolid', 'brandText', 'onBrand', 'neutralFill', 'neutralText',
  'errorColor', 'disabledBg', 'disabledText', 'border', 'borderDefault',
  'fgMuted', 'placeholderText', 'successColor', 'warningColor', 'infoColor',
]

export interface ColorFieldInfo {
  /** Flat semantic role key this field resolves from, or `null` for a
   *  state-family primitive (see file header). */
  role: string | null
  /** `--color-<role>` when `role` is set; `null` otherwise. */
  cssVar: string | null
  label: string
}

export const COLOR_FIELD_INFO: Record<PreviewColorField, ColorFieldInfo> = {
  surface:         { role: 'background-primary',    cssVar: '--color-background-primary',    label: 'Page / canvas surface' },
  brandSolid:      { role: 'background-brand-solid', cssVar: '--color-background-brand-solid', label: 'Brand solid fill' },
  brandText:       { role: 'content-brand',          cssVar: '--color-content-brand',          label: 'Brand-coloured text' },
  onBrand:         { role: 'content-inverse',         cssVar: '--color-content-inverse',         label: 'Ink on the brand fill (contrast-solved)' },
  neutralFill:     { role: 'background-secondary',   cssVar: '--color-background-secondary',   label: 'Secondary / raised fill' },
  neutralText:     { role: 'content-primary',         cssVar: '--color-content-primary',         label: 'Primary text' },
  disabledBg:      { role: 'background-disabled',    cssVar: '--color-background-disabled',    label: 'Disabled fill' },
  disabledText:    { role: 'content-disabled',        cssVar: '--color-content-disabled',        label: 'Disabled text' },
  border:          { role: 'border-primary',          cssVar: '--color-border-primary',          label: 'Control border' },
  borderDefault:   { role: 'border-secondary',        cssVar: '--color-border-secondary',        label: 'Container border' },
  fgMuted:         { role: 'content-tertiary',        cssVar: '--color-content-tertiary',        label: 'Secondary / muted text' },
  placeholderText: { role: 'content-quaternary',      cssVar: '--color-content-quaternary',      label: 'Placeholder / hint text' },
  errorColor:      { role: null, cssVar: null, label: 'Error accent (state family, anchor tone)' },
  warningColor:    { role: null, cssVar: null, label: 'Warning accent (state family, anchor tone)' },
  successColor:    { role: null, cssVar: null, label: 'Success accent (state family, anchor tone)' },
  infoColor:       { role: null, cssVar: null, label: 'Info accent (state family, anchor tone)' },
}
