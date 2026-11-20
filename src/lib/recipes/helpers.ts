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
  'height', 'minHeight', 'minWidth', 'width', 'travel', 'paint', 'strokeTop', 'strokeTopWidth', 'strokeBottomWidth', 'strokeRightWidth', 'strokeLeftWidth', 'radius', 'radiusTop', 'radiusBottom', 'radiusLeft', 'radiusRight', 'maxWidth', 'paddingTop', 'paddingX', 'paddingY', 'paddingBottom', 'paddingRight', 'gap', 'rowGap', 'strokeWidth', 'font', 'shadow', 'hit',
  // A label the file binds to a scale step while it keeps its role's family and weight (SocialLoginButton:
  // `size/text-md` with `role/button/weight`). Size, line height and tracking of the step, over `font`.
  'fontStep',
  // The top highlight of a solid control (Figma `Highlight/solid`: an inner shadow 0 · 1 · 0
  // painted `Elevation/highlight`). Its value is a colour role.
  'highlight',
  // Fills stacked OVER `fill` (Figma draws a CloseButton's hover / pressed as
  // the same translucent fill laid on top once or twice). Each is a colour
  // role; `overlay` sits on `fill`, `overlay2` on `overlay`.
  'overlay', 'overlay2',
  // A three-stop gradient fill (Figma: GRADIENT_LINEAR at 45°, stops at 0 · 52 · 100 %). `fill` is the first
  // stop, `fillMid` and `fillEnd` the others — each a colour ROLE, never a raw colour (A4, FeaturedIcon).
  'fillMid', 'fillEnd',
  // A focus ring fully OUTSIDE the control, `stroke.focus` wide, with no edge
  // of its own (Figma's CloseButton · soft / solid · Focused). A colour role.
  'halo',
  // The focus ring of a Button / IconButton (owner decision 2026-11-17): `stroke.focus` wide, set 1px OFF the
  // control's edge so the page shows in the gap (Figma: the `focus-ring` frame 1px larger than the button, stroked
  // OUTSIDE, radius + 1). A colour role; CSS draws it as an outline with a 1px offset, so the corners stay concentric.
  'gapRing',
  // A node opacity the Figma file sets by hand (TextLink's underline is drawn at
  // 40% until Hover). The ONE prop that is not a token reference: its value is a
  // plain number string (`'0.4'`), so every table that walks refs skips it
  // (`NON_TOKEN_PROPS`). Prefer a role; use this only where the file does.
  'opacity',
  // A named elevation (`rest` · `hover` · `pressed`): the key + ambient drop shadows
  // Figma's FAB lifts on (`Elevation/shadow-key`, `shadow-ambient`). The geometry
  // lives in `recipeStyles.ts` (the file hand-sets it per state, there is no token
  // for it); only the two colours are roles. Not a token reference.
  'lift',
  // A glyph's text style the Figma file leaves UNBOUND (Avatar: Type/avatar-2xs … 2xl are literal
  // 8 · 10 · 12 · 14 · 16 · 18 · 20 px, Medium, line height 100%). The value is the px as a plain
  // number string (`'14'`); `recipeStyles.ts` writes the CSS. Not a token reference.
  'fontLiteral',
  // A hand-set hairline the file leaves unbound (Avatar's 0.5px edge on the 2xs / xs sizes): px as a
  // plain number string. Not a token reference.
  'hairline',
  // The top highlight's offset when the file hand-sets it instead of using `Highlight/solid` (0 · 1 · 0): FABButton
  // and FeaturedIcon `gradient` keep an unbound inner shadow 0 · 2 · 0. px as a plain number string. Not a token reference.
  'highlightWidth',
  // A stroke drawn OUTSIDE the frame (Figma AvatarStatus: Surface/page, `strokeAlign` OUTSIDE): a colour
  // role plus its width (a stroke ref). CSS draws it as a 0-blur spread so the box does not grow.
  'outerStroke', 'outerStrokeWidth',
  // The label's shadow on a solid fill (`Shadow/text-2xs` in the Figma file: 0 1px 0.5px, `Elevation/shadow-ambient`). A named
  // step (`text-2xs`), not a token reference. Only the Button label carries it.
  'textShadow',
  // A negative overlap between a row's items (AvatarGroup): a spacing role (`spacing.overlap-md`). CSS has no
  // negative gap, so it is a custom property (`--escala-overlap`) the component lays out as a margin.
  'overlap',
] as const
export const NON_TOKEN_PROPS: readonly string[] = ['opacity', 'lift', 'fontLiteral', 'hairline', 'highlightWidth', 'textShadow']
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
  /** A component a queue mounts and unmounts: these ancestor states play `enter` and `exit` instead of Radix's. */
  host?: { enter: string[]; exit: string[] }
  /** A choreography that runs while it is shown and stops under these ancestor states. */
  timer?: RecipeChoreo & { attr: string; pausedBy: string[] }
  /** The queue's own item: how neighbours move, in place of the library's timing. */
  queue?: { item: string; reflow: string; release: string }
  /** A live press (`:active`, never a pinned Pressed state in docs) sinks the slot to the `shrink` transform role
   *  (0.98 in Standard, 1 under reduced motion) on `use-press`; it springs back on release. */
  press?: { slot?: string }
  /** Items that arrive one after another: while `when` holds, each `slot` waits its place in the row (`--escala-index`,
   *  set by the component) times the system's stagger (`--motion-stagger`, 0 under reduced motion). */
  stagger?: { slot: string; when: string }
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
  /** Where the live `Hover` state comes from. `pointer` (default): CSS `:hover`. `highlight`: a row of a menu or a
   *  listbox, whose ONE highlighted row (`[data-highlighted]`, set by Radix or the listbox for the pointer AND the arrow
   *  keys) carries the fill — a `:hover` there would light a second row whenever the keys move away from the pointer. */
  hover?: 'pointer' | 'highlight'
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

// ── Box guards (design-plans/component-box-classification.md) ─────────────
// A Black box's shape carries meaning by convention, so it never follows a
// generator axis past the point where it would read as another component.
// The roles stay the Figma bindings; the cap is compilation (code owns it).

/** Checkbox: square = many. Never rounder than ~25 % of its side, so no axis
 *  pick can turn it into a circle (a radio). 20px box → ≤ 6 (`md`); the
 *  16px compact box → ≤ 4 (`sm`). Sharp still gives 0. */
export const SELECTOR_SQUARE_RADIUS = { default: 'min(radius.control,radius.md)', compact: 'min(radius.control,radius.sm)' } as const

/** A small key cap (Kbd): on the Items axis since DEC-2026-11-17-002, never
 *  rounder than the file's 8px (`lg`), so no Items pick turns it into a pill. */
export const KEYCAP_RADIUS = 'min(radius.item,radius.lg)'

/** A rounded Badge: never as round as its pill. The file binds `Radius/control`
 *  on xs · sm and `Radius/item` on default (DEC-2026-11-17-003); each size also
 *  caps at ~25-33 % of its height: xs 16 → ≤ 4 (`sm`), sm 20 → ≤ 6 (`md`),
 *  default 24 → ≤ 8 (`lg`, the file's value). */
export const TAG_ROUNDED_RADIUS: Record<string, string> = {
  xs: 'min(radius.control,radius.sm)',
  sm: 'min(radius.control,radius.md)',
  default: 'min(radius.item,radius.lg)',
}

/** A Gray box whose `Shape=rounded` must stay distinct from its `Shape=circle`
 *  (Avatar, FeaturedIcon) or a slot that must stay a box (InputOTPSlot): the
 *  Fields radius, never rounder than its Rounded default (12, `xl`). */
export const ROUNDED_SHAPE_RADIUS = 'min(radius.action,radius.xl)'

/** A box that holds content (a menu, a list panel, a bar): the Boxes radius. */
export const PANEL_RADIUS = 'radius.container'
/** A row inside a panel inset by `spacing.1` (a menu item, a bar's trigger):
 *  concentric with the panel, its radius minus that inset. */
export const PANEL_ROW_RADIUS = 'sub(radius.container,spacing.1)'
