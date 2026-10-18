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

export type TokenRef = string

/** Properties a slot can bind. Colour props hold `color.*`, the rest dimensions. */
export const RECIPE_PROPS = [
  'fill', 'stroke', 'text', 'ring',
  'height', 'radius', 'paddingX', 'paddingY', 'gap', 'strokeWidth', 'font', 'shadow',
] as const
export type RecipeProp = (typeof RECIPE_PROPS)[number]
export type SlotProps = Partial<Record<RecipeProp, TokenRef>>
export type SlotMap = Record<string, SlotProps>

export interface RecipePart {
  /** Axes this part depends on, in catalogue order. `[]` = applies always. */
  axes: string[]
  /** Combination key (`axis values joined by '|'`, `''` for no axes) → slots. */
  values: Record<string, SlotMap>
}

export interface ComponentRecipe {
  key: string
  /** Named parts of the component — the shadcn anatomy (`data-slot`) and, in
   *  Figma, the layer names. The FIRST slot is the root (`data-escala`). */
  slots: string[]
  /** The value used when a render omits an axis. */
  defaults: Record<string, string>
  parts: RecipePart[]
  /** A slot that is a pseudo-element of another (`placeholder` → the value's
   *  `::placeholder`). In Figma it is the placeholder text layer. */
  pseudoSlots?: Record<string, { of: string; pseudo: string }>
  /** Slots rendered OUTSIDE the root (a dialog's overlay is a portal sibling),
   *  matched by their own `data-part`, not as descendants. */
  detachedSlots?: string[]
}

export type AxisValues = Record<string, string | undefined>

// ── Helpers that build the tables (run once, at module load) ───────────────

const c = (role: string): TokenRef => `color.${role}`
const NONE = 'none'

function combos(axes: Record<string, readonly string[]>): string[][] {
  return Object.values(axes).reduce<string[][]>(
    (acc, values) => acc.flatMap((prefix) => values.map((v) => [...prefix, v])),
    [[]],
  )
}

function part(axes: Record<string, readonly string[]>, build: (...values: string[]) => SlotMap): RecipePart {
  const values: Record<string, SlotMap> = {}
  for (const combo of combos(axes)) values[combo.join('|')] = build(...combo)
  return { axes: Object.keys(axes), values }
}

// ── Button ─────────────────────────────────────────────────────────────────

/** Every token one intent of the Button needs. Brand reads the action family,
 *  Danger / Success their severity — one shape, so no style can be missing a
 *  state for one intent and not another. */
interface IntentPalette {
  solid: string; solidHover: string; solidPressed: string; on: string
  soft: string; softPressed: string
  line: string; ink: string; ring: string
}
const BUTTON_INTENTS: Record<string, IntentPalette> = {
  Brand: {
    solid: 'action.primary.default', solidHover: 'action.primary.hover', solidPressed: 'action.primary.pressed',
    on: 'content.on-action',
    soft: 'surface.selected', softPressed: 'surface.selected-pressed',
    line: 'border.accent', ink: 'content.accent', ring: 'border.ring.default',
  },
  Danger: {
    solid: 'status.critical.surface-solid', solidHover: 'status.critical.surface-solid-hover',
    solidPressed: 'status.critical.surface-solid-pressed', on: 'status.critical.on-solid',
    soft: 'status.critical.surface', softPressed: 'status.critical.surface-pressed',
    line: 'status.critical.border-strong', ink: 'status.critical.content', ring: 'status.critical.border',
  },
  Success: {
    solid: 'status.success.surface-solid', solidHover: 'status.success.surface-solid-hover',
    solidPressed: 'status.success.surface-solid-pressed', on: 'status.success.on-solid',
    soft: 'status.success.surface', softPressed: 'status.success.surface-pressed',
    line: 'status.success.border-strong', ink: 'status.success.content', ring: 'status.success.border',
  },
}

const BUTTON_COLORS = ['Brand', 'Danger', 'Success'] as const
const BUTTON_STYLES = ['Solid', 'Outline', 'Soft', 'Ghost'] as const
const BUTTON_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled'] as const
const BUTTON_SIZES = ['MD', 'SM', 'LG', 'XL'] as const

function buttonPaint(color: string, style: string, state: string): SlotMap {
  const k = BUTTON_INTENTS[color]
  if (state === 'Disabled') {
    return {
      root: {
        fill: style === 'Solid' || style === 'Soft' ? c('action.disabled.default') : NONE,
        stroke: style === 'Outline' ? c('action.disabled.default') : NONE,
        text: c('content.disabled'),
      },
    }
  }
  const hover = state === 'Hover'
  const pressed = state === 'Pressed'
  const ring = state === 'Focused' ? c(k.ring) : NONE
  if (style === 'Solid') {
    return {
      root: { fill: c(pressed ? k.solidPressed : hover ? k.solidHover : k.solid), stroke: NONE, ring, text: c(k.on) },
    }
  }
  if (style === 'Soft') {
    // Two tones only: a soft fill has no third step that is not the border.
    return {
      root: { fill: c(hover || pressed ? k.softPressed : k.soft), stroke: NONE, ring, text: c(k.ink) },
    }
  }
  if (style === 'Outline') {
    return {
      root: { fill: pressed ? c(k.softPressed) : hover ? c(k.soft) : NONE, stroke: c(k.line), ring, text: c(k.ink) },
    }
  }
  // Ghost — the neutral wash both renderers already used.
  return {
    root: { fill: pressed ? c('action.ghost.pressed') : hover ? c('action.ghost.hover') : NONE, stroke: NONE, ring, text: c(k.ink) },
  }
}

/** Heights bind the SIZE ROLES the plugin already bound (compact · control ·
 *  touch); XL has no role at 56 (the only one is `fab`, another component's),
 *  so it reads the static `size.xl` step. Padding sits on spacing steps. */
const BUTTON_GEOMETRY: Record<string, SlotProps> = {
  SM: { height: 'size.compact', paddingX: 'spacing.3', gap: 'spacing.1_5' },
  MD: { height: 'size.control', paddingX: 'spacing.4', gap: 'spacing.gap-control' },
  LG: { height: 'size.touch', paddingX: 'spacing.5', gap: 'spacing.gap-control' },
  XL: { height: 'size.xl', paddingX: 'spacing.6', gap: 'spacing.2_5' },
}

// `text` sits on the ROOT: label and icons share it (`currentColor`), which is
// also what the plugin does — one ink fills the label and the icon slots.
const BUTTON: ComponentRecipe = {
  key: 'Button',
  slots: ['root', 'label', 'icon'],
  defaults: { Color: 'Brand', Style: 'Solid', Size: 'MD', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.action', strokeWidth: 'stroke.control', font: 'type.button' },
    })),
    part({ Size: BUTTON_SIZES }, (size) => ({ root: BUTTON_GEOMETRY[size] })),
    part({ Color: BUTTON_COLORS, Style: BUTTON_STYLES, State: BUTTON_STATES }, buttonPaint),
  ],
}

// ── Input ──────────────────────────────────────────────────────────────────

const INPUT_SIZES = ['MD', 'SM', 'XS'] as const
const INPUT_STATES = ['Default', 'Hover', 'Focused', 'Filled', 'Error', 'Loading', 'Disabled'] as const

function inputPaint(state: string): SlotMap {
  const disabled = state === 'Disabled'
  const error = state === 'Error'
  const stroke = disabled ? 'action.disabled.default'
    : error ? 'status.critical.border-strong'
    : state === 'Focused' ? 'border.focus'
    : state === 'Hover' ? 'border.control-hover'
    : 'border.strong'
  return {
    label: { text: c(disabled ? 'content.disabled' : 'content.primary') },
    field: {
      fill: c(disabled ? 'action.disabled.default' : 'surface.input'),
      stroke: c(stroke),
      ring: state === 'Focused' ? c('border.ring.default') : NONE,
    },
    value: { text: c(disabled ? 'content.disabled' : 'content.primary') },
    placeholder: { text: c(disabled ? 'content.disabled' : 'content.subtle') },
    icon: { text: c(disabled ? 'content.disabled' : 'content.secondary') },
    hint: { text: c(error ? 'status.critical.content' : 'content.secondary') },
    spinner: { text: c(state === 'Loading' ? 'action.primary.default' : 'content.secondary') },
  }
}

const INPUT_GEOMETRY: Record<string, SlotProps> = {
  MD: { height: 'size.control', font: 'type.placeholder' },
  SM: { height: 'size.compact', font: 'type.body-sm' },
  XS: { height: 'size.xs', font: 'type.body-sm' },
}

const INPUT: ComponentRecipe = {
  key: 'Input',
  slots: ['root', 'label', 'field', 'value', 'placeholder', 'icon', 'hint', 'spinner'],
  pseudoSlots: { placeholder: { of: 'value', pseudo: '::placeholder' } },
  defaults: { Size: 'MD', State: 'Default', Type: 'Default' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-tight' },
      label: { font: 'type.label' },
      field: { radius: 'radius.action', strokeWidth: 'stroke.control', paddingX: 'spacing.inset-control', gap: 'spacing.gap-control' },
      hint: { font: 'type.helper' },
    })),
    part({ Size: INPUT_SIZES }, (size) => ({ field: INPUT_GEOMETRY[size] })),
    part({ State: INPUT_STATES }, inputPaint),
  ],
}

// ── Card ───────────────────────────────────────────────────────────────────

const CARD: ComponentRecipe = {
  key: 'Card',
  slots: ['root', 'header', 'title', 'description', 'content', 'footer', 'link'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control',
        radius: 'radius.container', paddingX: 'spacing.inset-surface', paddingY: 'spacing.inset-surface',
        gap: 'spacing.gap-control', shadow: 'shadow.sm',
      },
      header: { gap: 'spacing.gap-tight' },
      title: { text: c('content.primary'), font: 'type.heading-sm' },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
      content: { text: c('content.primary'), font: 'type.body-md' },
      footer: { gap: 'spacing.gap-control' },
      link: { text: c('content.accent'), font: 'type.button' },
    })),
  ],
}

// ── Dialog (catalogue key `Modal`) ─────────────────────────────────────────

const MODAL: ComponentRecipe = {
  key: 'Modal',
  slots: ['content', 'overlay', 'header', 'title', 'description', 'footer', 'close'],
  detachedSlots: ['overlay'],
  defaults: {},
  parts: [
    part({}, () => ({
      overlay: { fill: c('surface.overlay') },
      content: {
        fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control',
        radius: 'radius.overlay', paddingX: 'spacing.inset-surface', paddingY: 'spacing.inset-surface',
        gap: 'spacing.gap-group', shadow: 'shadow.2xl',
      },
      header: { gap: 'spacing.gap-tight' },
      title: { text: c('content.primary'), font: 'type.heading-sm' },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
      footer: { gap: 'spacing.gap-control' },
      close: { text: c('content.secondary'), radius: 'radius.control', height: 'size.xs' },
    })),
  ],
}

export const COMPONENT_RECIPES: Record<string, ComponentRecipe> = {
  Button: BUTTON,
  Input: INPUT,
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

/** Every token reference the recipe can use, deduplicated. */
export function recipeTokenRefs(recipe: ComponentRecipe): string[] {
  const refs = new Set<string>()
  for (const p of recipe.parts) {
    for (const slots of Object.values(p.values)) {
      for (const props of Object.values(slots)) {
        for (const ref of Object.values(props)) if (ref && ref !== NONE) refs.add(ref)
      }
    }
  }
  return [...refs].sort()
}

/** The categorical role ids a recipe paints with. */
export function recipeColorRoles(recipe: ComponentRecipe): string[] {
  return recipeTokenRefs(recipe).filter((r) => r.startsWith('color.')).map((r) => r.slice(6))
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
