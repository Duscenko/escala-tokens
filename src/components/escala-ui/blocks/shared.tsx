// Helpers every block file shares: a glyph in a box of the icon role, so a Button's leading / trailing slot is sized by a token.
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
import { glyph } from '../../../lib/icons'

export function boxedGlyph(name: Parameters<typeof glyph>[0], role: 'icon.small' | 'icon.medium' | 'icon.large' = 'icon.medium'): React.ReactElement {
  const size = `var(${cssVarOf(role)})`
  return <span aria-hidden style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>{glyph(name)}</span>
}
