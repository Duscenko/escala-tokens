// THE chrome of a token table — one definition, every table in the Primitives
// workspace. Nothing here is new design; it is the classes eight files were
// already hand-copying, reconciled after an audit found them drifted.
//
// LINE HIERARCHY (chrome-wide, not table-only) — two roles, 1px always:
//   `--line`         structure. Columns, header bands, this lattice, section
//                    seams. `border-line` / `divide-line` / `bg-line`.
//   `--line-strong`  control outline, only when fill is not the separator.
// Ad-hoc `border-line/40`…`/80` are forbidden: a /60 header meeting a full
// `--line` column is two colours on one T-junction, which is how the lattice
// read as chaos. Draw a seam ONCE — left owns `border-r`, top owns `border-b`.
//
// WHAT THE ORIGINAL AUDIT FOUND (measured in the running app, dark chrome):
//
// 1. **The lattice had two weights.** A row rule was `border-line/40`
//    (OKLab ΔL 0.047 against `--app`) while the COLUMN rule beside it was a
//    full `border-line` (ΔL 0.1126) — the vertical lines were 2.4× the
//    perceptual weight of the horizontal ones inside the same grid. Nothing
//    justified the split; they do the same job.
// 2. **The header seam drew two rules on top of each other.** The header
//    carried `border-b border-line` and the first row carried
//    `border-t border-line/40` — measured landing at exactly the same y
//    (224.5px, 0px apart), i.e. a 2px double rule in two different colours,
//    at every header and every sticky group label.
// 3. **Three of nine tables had BROKEN column rules.** Semantics and Gradients
//    used `items-center` instead of `items-stretch`, so cells are sized to
//    content inside a taller row: measured 41 / 45 / 45px cells in a 46px row,
//    which chops 1–5px out of every vertical rule on every one of 41 rows.
// 4. **`border-line/60` and `border-line/40` were both in use for the same
//    seam**, sometimes twenty lines apart in one file. A later pass then
//    made `/60` the table token while workspace columns stayed full `--line`,
//    which reintroduced finding 1 at the T-junction between table and rail.
// 5. **`TableHeader`, `GroupLabel` and `rowClass` were duplicated verbatim**
//    between `VariablesTable` and `Step4_Typography`, and the row class string
//    appeared nine times across eight files — which is how 1–4 happened, and
//    how they would happen again.
//
// THE RULE, from here on: a token table's lattice is ONE weight (`--line`),
// drawn ONCE, the same weight as every other structural seam in the app.
// Import these; do not re-type the classes.

/** Row-2 height, shared with `CenterHeader` / `PreviewPanel` / `SaveSidePanel`
 *  so a table's column header lands on the app's one header line. */
export const TABLE_HEADER_PX = 52
export const TABLE_HEADER_H = 'h-[52px]'

/**
 * THE divider weight for every structural rule in a token table — row, column
 * and header seam alike. Full `--line`, matching workspace columns and header
 * bands: a quieter `/60` next to a full-weight rail is two colours on one
 * junction, which is the defect this constant exists to close.
 */
export const TABLE_DIVIDER = 'border-line'

/** Column rule — every cell except the last in a row. */
export const TABLE_CELL_DIVIDER = `border-r ${TABLE_DIVIDER}`
/** Row rule. Suppressed on the first row by `tableRowClass` — see below. */
export const TABLE_ROW_DIVIDER = `border-t ${TABLE_DIVIDER}`
/** The seam under a column header or a sticky group label. */
export const TABLE_HEADER_DIVIDER = `border-b ${TABLE_DIVIDER}`

/** Zebra + hover. Split out because Semantics paints the zebra on a WRAPPER
 *  (its rows can expand into an editor) while every other table paints it on
 *  the grid row itself. */
export const TABLE_ZEBRA = 'bg-black/[0.018] dark:bg-white/[0.02]'
export const TABLE_HOVER = 'transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04]'

/**
 * A token row.
 *
 * `items-stretch` is load-bearing, not cosmetic: it is what makes each cell as
 * tall as the row so its `border-r` runs the full height. Under `items-center`
 * the column rules stop short of the row edge and the vertical lines read as
 * dashed all the way down the table (finding 3 above).
 *
 * `index === 0` drops the top rule so the header's own `border-b` is the only
 * line at that seam (finding 2). It is done by index rather than a `first:`
 * variant because the header is a SIBLING of the rows — `:first-child` matches
 * the header, not row 0.
 */
export function tableRowClass(index: number, grid: string, opts: { zebra?: boolean } = {}) {
  const { zebra = true } = opts
  return [
    grid,
    'items-stretch group',
    index === 0 ? '' : TABLE_ROW_DIVIDER,
    TABLE_HOVER,
    zebra && index % 2 === 1 ? TABLE_ZEBRA : '',
  ].filter(Boolean).join(' ')
}

/**
 * A table's column header.
 *
 * `items-stretch` for the same reason the row uses it: the cells carry the
 * column rule, and a stretched cell only draws it full-bleed if the row has a
 * height to stretch to. That is also why `height` is not optional in practice
 * — under content height the header's rules stop short of its own bottom edge.
 *
 * `stacked` is the "All" view, where a sticky group label sits above the header
 * and it pins below that instead of at the top.
 *
 * The height is NOT overridable. Color's quick-edit strip used to sit ABOVE
 * this band (and the header then pinned under it), which is why Color and
 * Text drifted from Radius: Radius's `TOKEN NAME` row IS the 52px that lines
 * up with “Radius variables”. The strip now sits BELOW the header. If a table
 * ever earns a different band, give it a reason in writing before adding the
 * parameter back.
 */
export function tableHeaderClass(
  grid: string,
  { stacked = false }: { stacked?: boolean } = {},
) {
  return [
    grid,
    TABLE_HEADER_H,
    'items-stretch',
    TABLE_HEADER_DIVIDER,
    'bg-app text-[10px] font-semibold uppercase tracking-widest text-fg-faint sticky z-10',
    stacked ? 'top-[34px]' : 'top-0',
  ].join(' ')
}

/** A cell in that header. */
export const TABLE_HEAD_CELL = `flex items-center ${TABLE_CELL_DIVIDER}`

/** The sticky group label above a header in the "All" view. */
export const TABLE_GROUP_LABEL = `flex items-center gap-2 px-4 py-2.5 bg-app ${TABLE_HEADER_DIVIDER} sticky top-0 z-20`
