/**
 * The brand plan: the checklist the create studio floats on its Board
 * (`BrandPlanCard`). It is the accordion seen as a list — the same rows, in
 * the same order — with how far the person got. Not a stepper: every item
 * opens its row in any order, nothing waits on another, and the ship doors
 * work from the first frame (no wizard, no Continue; see CLAUDE.md "Do not
 * bring back"). An item is done once its row was edited or the person chose
 * Keep. Lives only as long as the studio session: nothing is persisted.
 */

/** A row of the create studio's accordion (`ThemeQuickSettingsRail`). */
export type PlanRow = 'color' | 'typography' | 'radius' | 'shadow' | 'sizes' | 'icons' | 'motion'
/** An item of the plan: a row, or Themes (which lives inside the Color row). */
export type PlanItemKey = PlanRow | 'themes'

export interface PlanItem {
  key: PlanItemKey
  /** The accordion row this item opens. */
  row: PlanRow
  /** English label, translated at display. */
  label: string
  /** The value comes from the system's first brand until changed here. */
  inherited: boolean
  done: boolean
}

const LABEL: Record<PlanItemKey, string> = {
  color: 'Color',
  themes: 'Themes',
  typography: 'Font',
  radius: 'Radius',
  shadow: 'Shadow',
  sizes: 'Spacing',
  icons: 'Icons',
  motion: 'Motion',
}

/** The first brand of a system sets every foundation, in the accordion's order. */
const FIRST_BRAND: PlanItemKey[] = ['color', 'typography', 'radius', 'shadow', 'sizes', 'icons', 'motion']
/** A brand added to a system owns its colour and the themes it ships; font,
 *  radius and spacing start as the system's (lib/brandFoundations.ts). */
const ADDED_BRAND: PlanItemKey[] = ['color', 'themes', 'typography', 'radius', 'sizes']
const INHERITED: ReadonlySet<PlanItemKey> = new Set(['typography', 'radius', 'sizes'])

export function brandPlan({ addBrand, changed, kept, shipsPicked }: {
  /** Adding a brand to a system that already has one. */
  addBrand: boolean
  /** Rows edited since the studio opened. */
  changed: ReadonlySet<string>
  /** Items the person chose to keep as they are. */
  kept: ReadonlySet<string>
  /** The person picked which themes the brand ships. */
  shipsPicked: boolean
}): PlanItem[] {
  return (addBrand ? ADDED_BRAND : FIRST_BRAND).map((key) => ({
    key,
    row: key === 'themes' ? 'color' : key,
    label: LABEL[key],
    inherited: addBrand && INHERITED.has(key),
    done: kept.has(key) || (key === 'themes' ? shipsPicked : changed.has(key)),
  }))
}

/** The item the open row stands for. Color holds Themes too: once the colour
 *  is done and the themes are not, the open Color row is the Themes item. */
export function activePlanItem(items: readonly PlanItem[], openRow: string): PlanItemKey | undefined {
  const themes = items.find((item) => item.key === 'themes')
  if (openRow === 'color' && themes && !themes.done && items.find((item) => item.key === 'color')?.done) return 'themes'
  return items.find((item) => item.key === openRow)?.key
}

/**
 * Where to look on the Board while an item is open: the tiles
 * (`data-collage-tile` in `SystemCollage`) that show that foundation most
 * plainly. Every tile reads every foundation; these are the ones a person
 * should glance at first.
 */
export const PLAN_FOCUS_TILES: Record<PlanItemKey, readonly string[]> = {
  color: ['colorStyle', 'buttons', 'notifications', 'gauge'],
  themes: ['colorStyle', 'signIn', 'metric'],
  typography: ['typeStyle', 'signIn', 'metric'],
  radius: ['buttons', 'verify', 'signIn', 'inputTag'],
  shadow: ['toasts', 'calendar', 'calendarPanel'],
  sizes: ['buttons', 'stepper', 'notifications', 'calendarPanel'],
  icons: ['buttons', 'fileUpload', 'stepper'],
  motion: ['toasts', 'gauge', 'nowPlaying'],
}

/**
 * How the plan moves. The platform's chrome motion (lib/inspectorMotion.ts):
 * `--ease-out-quint`, no overshoot, leaving quicker than arriving — except the
 * board's spotlight, which lets go slower than it grabs, so the board settles
 * back instead of snapping. Seconds. Reduced motion: none of it travels.
 */
export const PLAN_MOTION = {
  /** The card opening from its pill, or the pill from the card. */
  unfold: 0.2,
  /** The one leaving while the other arrives. */
  fold: 0.14,
  /** The ring that marks the open item, sliding between rows. */
  current: 0.22,
  /** A tick landing on an item, and the progress ring filling. */
  done: 0.24,
  /** Tiles fading back and rings appearing when the plan points. */
  focusIn: 0.2,
  /** The board letting go. */
  focusOut: 0.32,
  /** How long opening a row points at its tiles, ms. */
  flashMs: 2200,
} as const
