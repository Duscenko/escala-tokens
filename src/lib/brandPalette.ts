// Curated brand color palette (Figma design system). Single source of truth for
// the brand color choice — used by Foundations · Color and the Components quick
// picker. Color choice is limited to these vetted hues (no free hex) so the
// generated scales keep a correct accessibility profile.

export interface ColorPreset {
  label: string
  hex: string
}

export interface PresetGroup {
  label: string
  colors: ColorPreset[]
}

export const PRESET_GROUPS: PresetGroup[] = [
  {
    label: 'Greens',
    colors: [
      { label: 'Moss',        hex: '#669f2a' },
      { label: 'Green Light', hex: '#66c61c' },
      { label: 'Green',       hex: '#16b364' },
      { label: 'Teal',        hex: '#15b79e' },
      { label: 'Cyan',        hex: '#06aed4' },
    ],
  },
  {
    label: 'Blues',
    colors: [
      { label: 'Blue Light', hex: '#0ba5ec' },
      { label: 'Blue',       hex: '#2e90fa' },
      { label: 'Blue Dark',  hex: '#2970ff' },
      { label: 'Indigo',     hex: '#6172f3' },
      { label: 'Violet',     hex: '#875bf7' },
      { label: 'Purple',     hex: '#7a5af8' },
    ],
  },
  {
    label: 'Pinks',
    colors: [
      { label: 'Fuchsia', hex: '#d444f1' },
      { label: 'Pink',    hex: '#ee46bc' },
      { label: 'Rosé',    hex: '#f63d68' },
    ],
  },
  {
    label: 'Warm',
    colors: [
      { label: 'Orange Dark', hex: '#ff4405' },
      { label: 'Orange',      hex: '#ef6820' },
      { label: 'Yellow',      hex: '#eaaa08' },
    ],
  },
]

// Flat list of every curated brand hex.
export const BRAND_PRESETS: string[] = PRESET_GROUPS.flatMap((g) => g.colors.map((c) => c.hex))
