// Curated brand color palette (Figma design system). Single source of truth for
// the brand color choice — used by Foundations · Color and the Components quick
// picker. Color choice is limited to these vetted hues (no free hex) so the
// generated scales keep a correct accessibility profile.
//
// Mid-chroma, mid-lightness (~2026 product UI: cobalt, aqua, coral, grape) —
// they still work as `accent.solid` with solved on-accent ink.

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
      { label: 'Moss',    hex: '#669f2a' },
      { label: 'Forest',  hex: '#15803d' },
      { label: 'Lime',    hex: '#66c61c' },
      { label: 'Green',   hex: '#16b364' },
      { label: 'Mint',    hex: '#34d399' },
      { label: 'Teal',    hex: '#15b79e' },
      { label: 'Emerald', hex: '#0d9488' },
      { label: 'Aqua',    hex: '#2dd4bf' },
      { label: 'Cyan',    hex: '#06aed4' },
      { label: 'Ice',     hex: '#22d3ee' },
    ],
  },
  {
    label: 'Blues',
    colors: [
      { label: 'Sky',        hex: '#0ba5ec' },
      { label: 'Blue',       hex: '#2e90fa' },
      { label: 'Blue Dark',  hex: '#2970ff' },
      { label: 'Cobalt',     hex: '#1d4ed8' },
      { label: 'Electric',   hex: '#4f46e5' },
      { label: 'Indigo',     hex: '#6172f3' },
      { label: 'Periwinkle', hex: '#818cf8' },
      { label: 'Violet',     hex: '#875bf7' },
      { label: 'Purple',     hex: '#7a5af8' },
      { label: 'Grape',      hex: '#a855f7' },
    ],
  },
  {
    label: 'Pinks',
    colors: [
      { label: 'Magenta', hex: '#c026d3' },
      { label: 'Fuchsia', hex: '#d444f1' },
      { label: 'Pink',    hex: '#ee46bc' },
      { label: 'Rosé',    hex: '#f63d68' },
      { label: 'Coral',   hex: '#fb542b' },
    ],
  },
  {
    label: 'Warm',
    colors: [
      { label: 'Flame',  hex: '#ff4405' },
      { label: 'Orange', hex: '#ef6820' },
      { label: 'Amber',  hex: '#f59e0b' },
      { label: 'Yellow', hex: '#eaaa08' },
    ],
  },
]

// Flat list of every curated brand hex.
export const BRAND_PRESETS: string[] = PRESET_GROUPS.flatMap((g) => g.colors.map((c) => c.hex))

// The same presets, reordered into ONE hue-continuous run — Blues → Pinks →
// Warm → Greens — for dropdown sections and `INDUSTRY_SPECTRUM` (the picker
// bar's rainbow order; same hexes as the scale-guide agent).
export const BRAND_SPECTRUM: ColorPreset[] = ['Blues', 'Pinks', 'Warm', 'Greens'].flatMap(
  (label) => PRESET_GROUPS.find((g) => g.label === label)?.colors ?? [],
)
