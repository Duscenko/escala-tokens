import chroma from 'chroma-js'

export function generateColorScale(baseHex: string): Record<number, string> {
  const scale: Record<number, string> = {}

  // Genera 12 tonos desde casi blanco hasta casi negro
  // Tono 6 = color base
  const light = chroma.mix(baseHex, '#ffffff', 0.95).hex()
  const dark = chroma.mix(baseHex, '#0a0a0a', 0.85).hex()

  const colors = chroma.scale([light, baseHex, dark]).colors(12)

  colors.forEach((color, i) => {
    scale[i + 1] = color
  })

  return scale
}

export function checkContrast(fg: string, bg: string): number {
  return chroma.contrast(fg, bg)
}

export function isAccessible(fg: string, bg: string, level: 'AA' | 'AAA' = 'AA'): boolean {
  const contrast = checkContrast(fg, bg)
  return level === 'AA' ? contrast >= 4.5 : contrast >= 7
}

// Lightest brand tone (>= start) whose WHITE text passes WCAG AA (4.5:1).
// Keeps the solid brand button accessible even for bright hues where the design
// system's default tone (8) is too light for white text. Falls back to 12.
export function accessibleSolidTone(scale: Record<number, string>, start = 8): number {
  for (let t = start; t <= 12; t++) {
    const hex = scale[t]
    if (hex && checkContrast('#ffffff', hex) >= 4.5) return t
  }
  return 12
}
