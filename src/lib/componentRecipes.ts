/**
 * Component recipes — the ONE answer to "which token paints which part of a
 * component", read by the web, the Figma plugin and the agents.
 *
 * Before this file every component had two hand-written recipes that never
 * read each other: `docs/specimens.tsx` on the web and a `buildX` in the
 * plugin's `code.ts`. They had already drifted (a Danger button's hover was its
 * rest fill at 88 % opacity in Figma and a chroma darken on the web; Outline's
 * hover was a 60 % tint in Figma and a 10 % one here). See E15 in
 * design-plans/shadcn-component-skeleton.md.
 *
 * Rules:
 *  - **Every value is a token reference**, never a number. A state with no role
 *    gets a role (`status.*.surface-solid-hover` was added for exactly this),
 *    not an opacity. `recipeTokenRefs` + the recipe test enforce it.
 *  - **Pure data, serialisable.** `tokens.json` ships `serializeRecipes()` as
 *    `componentRecipes`, so the plugin reads the same table the web generates
 *    its stylesheet from. Nothing here imports React or the store.
 *  - **Axes come from the catalogue.** A part lists the axes it depends on; the
 *    recipe test asserts every combination of those axes has an entry.
 *
 * A reference is `<namespace>.<name>`:
 *   color.<categorical role id>  → `--color-<id with dashes>`  · Figma `Action/primary/default`
 *   size.<role|step>             → `--size-<name>`
 *   radius.<role>                → `--radius-<name>`
 *   spacing.<role|step>          → `--spacing-<name>`
 *   stroke.<role>                → `--stroke-<name>`
 *   type.<role>                  → `--text-<name>-font-size|line-height|font-weight|font-family|letter-spacing`
 *   shadow.<step>                → `--shadow-<name>`
 *   none                         → nothing painted
 */

import { BUTTON, BUTTON_GROUP, CLOSE_BUTTON, FAB_BUTTON, SOCIAL_LOGIN_BUTTON, TEXT_LINK, APP_STORE_BADGE } from './recipes/actions'
import {
  INPUT, TEXTAREA, INPUT_GROUP, INPUT_STEPPER, INPUT_TAG, SELECT, COMBOBOX, INPUT_OTP,
  CHECKBOX, RADIO, TOGGLE, SLIDER, FIELD, LABEL, PASSWORD_STRENGTH, FILE_UPLOAD, DROPZONE,
  CHECKBOX_GROUP, RADIO_GROUP, SWITCH_GROUP,
} from './recipes/forms'
import { CARD, MODAL } from './recipes/surfaces'
import { BADGE, STATUS_BADGE, CHIP, PROGRESS, SPINNER, ICON, RATING, FILE_FORMAT, AVATAR } from './recipes/indicators'
export {
  RECIPE_PROPS,
  type TokenRef, type RecipeProp, type SlotProps, type SlotMap, type RecipePart, type ComponentRecipe, type AxisValues,
} from './recipes/helpers'
import { NONE, type ComponentRecipe, type AxisValues, type SlotMap, type TokenRef, type RecipeProp } from './recipes/helpers'

export const COMPONENT_RECIPES: Record<string, ComponentRecipe> = {
  Button: BUTTON,
  ButtonGroup: BUTTON_GROUP,
  CloseButton: CLOSE_BUTTON,
  FABButton: FAB_BUTTON,
  SocialLoginButton: SOCIAL_LOGIN_BUTTON,
  TextLink: TEXT_LINK,
  AppStoreBadge: APP_STORE_BADGE,
  Input: INPUT,
  Textarea: TEXTAREA,
  InputGroup: INPUT_GROUP,
  InputStepper: INPUT_STEPPER,
  InputTag: INPUT_TAG,
  Select: SELECT,
  Combobox: COMBOBOX,
  InputOTP: INPUT_OTP,
  Checkbox: CHECKBOX,
  CheckboxGroup: CHECKBOX_GROUP,
  Radio: RADIO,
  RadioGroup: RADIO_GROUP,
  Toggle: TOGGLE,
  SwitchGroup: SWITCH_GROUP,
  Slider: SLIDER,
  FileUpload: FILE_UPLOAD,
  Dropzone: DROPZONE,
  Field: FIELD,
  Label: LABEL,
  PasswordStrength: PASSWORD_STRENGTH,
  Badge: BADGE,
  StatusBadge: STATUS_BADGE,
  Chip: CHIP,
  Progress: PROGRESS,
  Spinner: SPINNER,
  Icon: ICON,
  Rating: RATING,
  FileFormat: FILE_FORMAT,
  Avatar: AVATAR,
  Card: CARD,
  Modal: MODAL,
}

// ── Reading a recipe ───────────────────────────────────────────────────────

/** The slots of one render: every part merged for the given axis values. */
export function resolveRecipe(recipe: ComponentRecipe, v: AxisValues = {}): SlotMap {
  const out: SlotMap = {}
  for (const p of recipe.parts) {
    const key = p.axes.map((a) => v[a] ?? recipe.defaults[a] ?? '').join('|')
    const entry = p.values[key]
    if (!entry) continue
    for (const [slot, props] of Object.entries(entry)) out[slot] = { ...out[slot], ...props }
  }
  return out
}

/** Every token reference the recipe can use, deduplicated. A sum
 *  (`selector.control+spacing.1`) contributes each of its terms. */
export function recipeTokenRefs(recipe: ComponentRecipe): string[] {
  const refs = new Set<string>()
  for (const p of recipe.parts) {
    for (const slots of Object.values(p.values)) {
      for (const props of Object.values(slots)) {
        for (const ref of Object.values(props)) {
          if (!ref || ref === NONE) continue
          for (const term of ref.split('+')) refs.add(term)
        }
      }
    }
  }
  return [...refs].sort()
}

/** The categorical role ids a recipe paints with. */
export function recipeColorRoles(recipe: ComponentRecipe): string[] {
  return recipeTokenRefs(recipe).filter((r) => r.startsWith('color.')).map((r) => r.slice(6))
}

/** One (slot, property, token) triple, deduplicated across every variant. */
export interface RecipeRow { slot: string; prop: RecipeProp; ref: TokenRef }
export function recipeRows(recipe: ComponentRecipe): RecipeRow[] {
  const seen = new Set<string>()
  const rows: RecipeRow[] = []
  for (const p of recipe.parts) {
    for (const slots of Object.values(p.values)) {
      for (const [slot, props] of Object.entries(slots)) {
        for (const [prop, ref] of Object.entries(props)) {
          if (!ref || ref === NONE) continue
          const k = `${slot}|${prop}|${ref}`
          if (seen.has(k)) continue
          seen.add(k)
          rows.push({ slot, prop: prop as RecipeProp, ref })
        }
      }
    }
  }
  return rows
}

/** The colour roles ONE render paints (its axes resolved), in slot order. */
export function recipeRolesFor(recipe: ComponentRecipe, v: AxisValues = {}): string[] {
  const ids: string[] = []
  for (const props of Object.values(resolveRecipe(recipe, v))) {
    for (const ref of Object.values(props)) {
      if (ref && ref.startsWith('color.') && !ids.includes(ref.slice(6))) ids.push(ref.slice(6))
    }
  }
  return ids
}

// ── Names ──────────────────────────────────────────────────────────────────

/** Split `color.action.primary.default` → `['color', 'action.primary.default']`. */
export function splitRef(ref: TokenRef): [string, string] {
  const i = ref.indexOf('.')
  return i < 0 ? [ref, ''] : [ref.slice(0, i), ref.slice(i + 1)]
}

/** The `variables.css` custom property a reference resolves to. For `type.*`
 *  pass the facet (`font-size`, `line-height`, …). */
export function cssVarOf(ref: TokenRef, facet = 'font-size'): string {
  const [ns, name] = splitRef(ref)
  if (ns === 'color') return `--color-${name.replace(/\./g, '-')}`
  if (ns === 'type') return `--text-${name}-${facet}`
  return `--${ns}-${name}`
}

/** `tokens.json` payload: the recipes as plain data (they already are). */
export function serializeRecipes(): Record<string, ComponentRecipe> {
  return JSON.parse(JSON.stringify(COMPONENT_RECIPES)) as Record<string, ComponentRecipe>
}
