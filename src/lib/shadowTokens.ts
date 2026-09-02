export const SHADOW_PRESETS = [
  {
    label: 'None',
    description: 'Flat — no elevation anywhere',
    values: { xs: 'none', sm: 'none', md: 'none', lg: 'none', xl: 'none', '2xl': 'none' },
  },
  {
    label: 'Subtle',
    description: 'Barely-there depth — quiet, minimal',
    values: {
      xs: '0 1px 1px rgba(10,13,18,0.03)',
      sm: '0 1px 2px rgba(10,13,18,0.05)',
      md: '0 2px 4px -1px rgba(10,13,18,0.05)',
      lg: '0 6px 8px -2px rgba(10,13,18,0.04)',
      xl: '0 10px 12px -2px rgba(10,13,18,0.04)',
      '2xl': '0 12px 24px -6px rgba(10,13,18,0.08)',
    },
  },
  {
    label: 'Soft',
    description: 'Balanced depth — the default ramp',
    values: {
      xs: '0 1px 2px rgba(10,13,18,0.05)',
      sm: '0 1px 3px rgba(10,13,18,0.10), 0 1px 2px -1px rgba(10,13,18,0.10)',
      md: '0 4px 6px -1px rgba(10,13,18,0.10), 0 2px 4px -2px rgba(10,13,18,0.06)',
      lg: '0 12px 16px -4px rgba(10,13,18,0.08), 0 4px 6px -2px rgba(10,13,18,0.03)',
      xl: '0 20px 24px -4px rgba(10,13,18,0.08), 0 8px 8px -4px rgba(10,13,18,0.03)',
      '2xl': '0 24px 48px -12px rgba(10,13,18,0.18)',
    },
  },
  {
    label: 'Strong',
    description: 'Pronounced depth — bold, high-contrast surfaces',
    values: {
      xs: '0 2px 4px rgba(10,13,18,0.10)',
      sm: '0 2px 6px rgba(10,13,18,0.18), 0 2px 4px -1px rgba(10,13,18,0.16)',
      md: '0 8px 12px -2px rgba(10,13,18,0.18), 0 4px 6px -3px rgba(10,13,18,0.12)',
      lg: '0 20px 26px -6px rgba(10,13,18,0.16), 0 8px 10px -4px rgba(10,13,18,0.08)',
      xl: '0 32px 40px -6px rgba(10,13,18,0.18), 0 14px 14px -6px rgba(10,13,18,0.08)',
      '2xl': '0 40px 72px -16px rgba(10,13,18,0.32)',
    },
  },
] as const

export const SHADOW_STEPS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const

export function matchShadowPreset(shadows: Record<string, string>): string | null {
  const hit = SHADOW_PRESETS.find((preset) =>
    SHADOW_STEPS.every((step) => (shadows[step] ?? '') === preset.values[step]),
  )
  return hit?.label ?? null
}

