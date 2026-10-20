/** Shared building blocks for the per-category recipe files. Pure data + tiny
 *  builders — nothing here imports React, the store or a recipe. */

export type TokenRef = string

/** Properties a slot can bind. Colour props hold `color.*`, the rest dimensions. */
export const RECIPE_PROPS = [
  'fill', 'stroke', 'text', 'ring',
  'height', 'minHeight', 'width', 'travel', 'paint', 'strokeTop', 'strokeTopWidth', 'strokeBottomWidth', 'radius', 'paddingX', 'paddingY', 'paddingBottom', 'gap', 'strokeWidth', 'font', 'shadow',
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
  /** The DOM a third-party library renders (Sonner's toast), when the root
   *  and parts cannot carry `data-escala` / `data-part`: `root` replaces
   *  `[data-escala="<key>"]`, `slots` replace `[data-part="<key>.<slot>"]`. */
  dom?: { root: string; slots?: Record<string, string> }
}

export type AxisValues = Record<string, string | undefined>


// ── Helpers that build the tables (run once, at module load) ───────────────

export const c = (role: string): TokenRef => `color.${role}`
export const NONE = 'none'

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
