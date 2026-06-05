// Font catalogue for the Typography foundation — shared by the picker (Step4)
// and the export (variables.css / README) so the family stack is consistent.

export interface FontPreset {
  label: string
  value: string
  category: 'Sans-serif' | 'Serif' | 'Mono'
}

export const FONT_PRESETS: FontPreset[] = [
  { label: 'Inter',        value: 'Inter',             category: 'Sans-serif' },
  { label: 'Geist',        value: 'Geist',             category: 'Sans-serif' },
  { label: 'DM Sans',      value: 'DM Sans',           category: 'Sans-serif' },
  { label: 'Plus Jakarta', value: 'Plus Jakarta Sans', category: 'Sans-serif' },
  { label: 'Sora',         value: 'Sora',              category: 'Sans-serif' },
  { label: 'Outfit',       value: 'Outfit',            category: 'Sans-serif' },
  { label: 'Fraunces',     value: 'Fraunces',          category: 'Serif'      },
  { label: 'Playfair',     value: 'Playfair Display',  category: 'Serif'      },
  { label: 'Libre Bask.',  value: 'Libre Baskerville', category: 'Serif'      },
  { label: 'JetBrains',    value: 'JetBrains Mono',    category: 'Mono'       },
  { label: 'Fira Code',    value: 'Fira Code',         category: 'Mono'       },
]

const FALLBACK: Record<FontPreset['category'], string> = {
  'Sans-serif': 'sans-serif',
  Serif: 'serif',
  Mono: 'monospace',
}

// Full CSS font-family stack with a category-appropriate generic fallback —
// e.g. fontStack('Fraunces') → "'Fraunces', serif" (not sans-serif).
export function fontStack(family: string): string {
  const preset = FONT_PRESETS.find((f) => f.value === family)
  return `'${family}', ${preset ? FALLBACK[preset.category] : 'sans-serif'}`
}
