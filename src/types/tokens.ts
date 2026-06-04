export interface ColorScale {
  [key: number]: string
}

export interface TypographyTokens {
  fontFamily: string
  sizes: Record<string, string>
  weights: Record<string, number>
}

export interface DesignTokens {
  project: string
  colors: {
    primitive: ColorScale
    semantic: Record<string, string>
  }
  typography: TypographyTokens
  spacing: Record<string, string>
  radius: Record<string, string>
  style: 'ios26' | 'organic' | 'material' | null
  atoms: string[]
}

export type StyleDirection = 'ios26' | 'organic' | 'material'

export type AtomType =
  | 'Button'
  | 'Input'
  | 'Badge'
  | 'Card'
  | 'Avatar'
  | 'Checkbox'
  | 'Toggle'
  | 'Select'
  | 'Tooltip'
  | 'Modal'
  | 'Toast'
  | 'Tabs'
