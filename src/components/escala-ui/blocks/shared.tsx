// Helpers every block file shares: a glyph in a box of the icon role, so a Button's leading / trailing slot is sized by a token.
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
import { glyph } from '../../../lib/icons'

export function boxedGlyph(name: Parameters<typeof glyph>[0], role: 'icon.small' | 'icon.medium' | 'icon.large' = 'icon.medium'): React.ReactElement {
  const size = `var(${cssVarOf(role)})`
  return <span aria-hidden style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>{glyph(name)}</span>
}

/** A block's text style by Figma name: a type ROLE (`label`, `body-sm`) or a scale STEP (`display-lg`). The variable names
 *  come from `cssVarOf`, as in the recipes: a role is `--text-<role>-*`, a step its primitives (`--font-size-display-lg`).
 *  Hand-writing `--text-${role}-*` named variables that do not exist for a step, and the hero's headline fell to 18px. */
export function blockType(role: string): React.CSSProperties {
  const ref = `type.${role}`
  return {
    fontFamily: `var(${cssVarOf(ref, 'font-family')})`,
    fontSize: `var(${cssVarOf(ref, 'font-size')})`,
    lineHeight: `var(${cssVarOf(ref, 'line-height')})`,
    fontWeight: `var(${cssVarOf(ref, 'font-weight')})`,
    letterSpacing: `var(${cssVarOf(ref, 'letter-spacing')})`,
  }
}
