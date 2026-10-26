/** Shared building blocks for the per-category recipe files. Pure data + tiny
 *  builders — nothing here imports React, the store or a recipe. */

export type TokenRef = string

/** Properties a slot can bind. Colour props hold `color.*`, the rest dimensions.
 *  `focus` is the contrast-bearing focus indicator (a solid ring set off from
 *  the control); `ring` is the translucent halo a field adds around it.
 *  `hit` is a minimum TARGET size (`size.hit`, WCAG 2.5.8): a transparent area
 *  centred on a glyph smaller than 24px — the glyph itself does not grow. */
export const RECIPE_PROPS = [
  'fill', 'stroke', 'text', 'ring', 'focus',
  'height', 'minHeight', 'width', 'travel', 'paint', 'strokeTop', 'strokeTopWidth', 'strokeBottomWidth', 'radius', 'paddingX', 'paddingY', 'paddingBottom', 'gap', 'rowGap', 'strokeWidth', 'font', 'shadow', 'hit',
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

/** A choreography a component plays when it opens or closes (`lib/motion.ts`). */
export interface RecipeChoreo {
  /** Choreography name (`dialog-enter`, `accordion-expand`). */
  name: string
  /** Where a slot-less choreography or track plays (a disclosure's
   *  `content`, a Select's portaled `content`). Tracks that name their own
   *  slot keep it; `undefined` everywhere is the root. */
  slot?: string
  /** A disclosure: the variable its library publishes the content height in. */
  heightVar?: string
}

/** How a component MOVES — motion roles and choreographies by NAME, never a
 *  duration (lib/motion.ts holds the values; `lib/recipes/motion.ts` the table). */
export interface RecipeMotion {
  /** Slot key (a slot, or one with a state suffix) → CSS property → motion role. */
  transitions?: Record<string, Record<string, string>>
  enter?: RecipeChoreo
  exit?: RecipeChoreo
  /** Where a scale grows from (a Radix popper publishes it). Set on the slot
   *  the entrance plays on. */
  origin?: string
  /** The root attribute naming the edge a panel slides from (`side` → `data-side`). */
  sideAttr?: string
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
  /** The DOM a third-party library renders (Sonner's toast), when the root
   *  and parts cannot carry `data-escala` / `data-part`: `root` replaces
   *  `[data-escala="<key>"]`, `slots` replace `[data-part="<key>.<slot>"]`. */
  dom?: { root: string; slots?: Record<string, string> }
  /** Transitions and choreographies (merged from `lib/recipes/motion.ts`). */
  motion?: RecipeMotion
}

export type AxisValues = Record<string, string | undefined>


// ── Helpers that build the tables (run once, at module load) ───────────────

export const c = (role: string): TokenRef => `color.${role}`
export const NONE = 'none'

/** The keyboard-focus paint of everything that is not a text field — shadcn's
 *  `focus-visible:border-ring ring-[3px] ring-ring/50`: the edge turns to
 *  `border.focus` and a translucent halo (`border.ring.default`) sits outside it. */
export const FOCUS: { focus: string; ring: string } = { focus: 'color.border.focus', ring: 'color.border.ring.default' }

export function combos(axes: Record<string, readonly string[]>): string[][] {
  return Object.values(axes).reduce<string[][]>(
    (acc, values) => acc.flatMap((prefix) => values.map((v) => [...prefix, v])),
    [[]],
  )
}

export function part(axes: Record<string, readonly string[]>, build: (...values: string[]) => SlotMap): RecipePart {
  const values: Record<string, SlotMap> = {}
  for (const combo of combos(axes)) values[combo.join('|')] = build(...combo)
  return { axes: Object.keys(axes), values }
}


/** The Fields radius for a box taller than one line, never rounder than 16px
 *  (the `2xl` step): a textarea, an attachment card. A pill one-line field
 *  (Fields at its roundest) would otherwise turn these boxes into blobs. */
export const TALL_FIELD_RADIUS = 'min(radius.action,radius.2xl)'

/** A box that holds content (a menu, a list panel, a bar): the Boxes radius. */
export const PANEL_RADIUS = 'radius.container'
/** A row inside a panel inset by `spacing.1` (a menu item, a bar's trigger):
 *  concentric with the panel, its radius minus that inset. */
export const PANEL_ROW_RADIUS = 'sub(radius.container,spacing.1)'
