/**
 * SplitButton — the Figma `SplitButton` set (design-plans/split-button-contract.md): a ButtonGroup of two
 * segments (the action and an icon-only caret) over a DropdownMenu. It paints NOTHING of its own: the
 * segments paint themselves (ButtonGroup · ButtonGroupItem recipes) and the menu is the DropdownMenu
 * recipe. What it owns is the one measure the composition adds: the menu hangs 8px below the group
 * (`Spacing/gap-control`, the file's y = height + 8 at every Size) — the component reads it as the
 * popper's offset, so the recipe, the contract and the story share one token.
 */
import { part, type ComponentRecipe } from './helpers.js'

export const SPLIT_BUTTON_VARIANTS = ['default', 'secondary'] as const
export const SPLIT_BUTTON_SIZES = ['default', 'xs', 'sm', 'lg'] as const
export const SPLIT_BUTTON_OPEN = ['false', 'true'] as const

export const SPLIT_BUTTON: ComponentRecipe = {
  key: 'SplitButton',
  slots: ['root'],
  defaults: { Variant: 'default', Size: 'default', Open: 'false' },
  parts: [
    part({ Variant: SPLIT_BUTTON_VARIANTS, Size: SPLIT_BUTTON_SIZES, Open: SPLIT_BUTTON_OPEN }, () => ({
      root: { gap: 'spacing.gap-control' },
    })),
  ],
}
