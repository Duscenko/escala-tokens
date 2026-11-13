// Escala component: Table and its parts — the Figma page «❖ Table» (design-plans/table-contract.md, 1023:120189), 1:1:
// Table · TableHeader · TableHead · TableRow · TableCell · TableMediaCell · TableTrendCell · TableFooter · TableCaption ·
// TableResizer · TableDropIndicator · TableEmpty · TableLoading · TableLoadMore. A real <table> (header cells are <th>,
// the roles are explicit) laid out as flex rows exactly like the file's frames: cells share the row's width, every row,
// head and cell is 48 / 32 / 40 / 56 tall by Size, Size and Dividers cascade from the Table down to every cell.
// Appearance: recipes (table.ts).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Checkbox } from './checkbox'
import { IconButton } from './icon-button'

export const TABLE_SIZES = ['default', 'xs', 'sm', 'lg'] as const
export type TableSize = (typeof TABLE_SIZES)[number]
export type TableDividers = 'rows' | 'grid'
export type TableAlign = 'start' | 'end'
export type TablePinned = 'none' | 'start' | 'end'
export type TableSort = 'none' | 'ascending' | 'descending'
export type TableRowState = 'Default' | 'Hover' | 'Selected' | 'Focused' | 'Disabled' | 'Dragging'

// Phosphor regular glyphs (the file's icons).
const G = {
  spinner: 'M136,32V64a8,8,0,0,1-16,0V32a8,8,0,0,1,16,0Zm88,88H192a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Zm-45.09,47.6a8,8,0,0,0-11.31,11.31l22.62,22.63a8,8,0,0,0,11.32-11.32ZM128,184a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V192A8,8,0,0,0,128,184ZM77.09,167.6,54.46,190.22a8,8,0,0,0,11.32,11.32L88.4,178.91A8,8,0,0,0,77.09,167.6ZM72,128a8,8,0,0,0-8-8H32a8,8,0,0,0,0,16H64A8,8,0,0,0,72,128ZM65.78,54.46A8,8,0,0,0,54.46,65.78L77.09,88.4A8,8,0,0,0,88.4,77.09Z',
  tray: 'M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,16V152h-28.7A15.86,15.86,0,0,0,168,156.69L148.69,176H107.31L88,156.69A15.86,15.86,0,0,0,76.69,152H48V48Zm0,160H48V168H76.69L96,187.31A15.86,15.86,0,0,0,107.31,192h41.38A15.86,15.86,0,0,0,160,187.31L179.31,168H208v40Z',
  up: 'M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z',
  down: 'M205.66,149.66l-72,72a8,8,0,0,1-11.32,0l-72-72a8,8,0,0,1,11.32-11.32L120,196.69V40a8,8,0,0,1,16,0V196.69l58.34-58.35a8,8,0,0,1,11.32,11.32Z',
  trendUp: 'M240,56v64a8,8,0,0,1-16,0V75.31l-82.34,82.35a8,8,0,0,1-11.32,0L96,123.31,29.66,189.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0L136,140.69,212.69,64H168a8,8,0,0,1,0-16h64A8,8,0,0,1,240,56Z',
  trendDown: 'M240,128v64a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h44.69L136,107.31l-34.34,34.35a8,8,0,0,1-11.32,0l-72-72A8,8,0,0,1,29.66,58.34L96,124.69l34.34-34.35a8,8,0,0,1,11.32,0L224,172.69V128a8,8,0,0,1,16,0Z',
  minus: 'M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z',
  dots: 'M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,196,116ZM60,116a12,12,0,1,0,12,12A12,12,0,0,0,60,116Z',
}
const glyph = (d: string, spin?: boolean) => (
  <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false" className={spin ? 'animate-spin motion-reduce:animate-none' : undefined}><path d={d} /></svg>
)
const ICON = '[&>svg]:size-full inline-flex shrink-0 items-center justify-center'

interface Ctx { size?: TableSize; dividers?: TableDividers; footer?: boolean; disabled?: boolean }
const TableContext = React.createContext<Ctx>({})
const useCtx = () => React.useContext(TableContext)
function Cascade({ value, children }: { value: Ctx; children: React.ReactNode }) {
  const parent = useCtx()
  const merged = React.useMemo(() => ({ ...parent, ...value }), [parent, value.size, value.dividers, value.footer, value.disabled]) // eslint-disable-line react-hooks/exhaustive-deps
  return <TableContext.Provider value={merged}>{children}</TableContext.Provider>
}

// ── Table ────────────────────────────────────────────────────────────────────

export interface TableProps extends Omit<React.ComponentProps<'table'>, 'children'> {
  /** Figma Size: the height of every row and cell (48 · 32 · 40 · 56). */
  size?: TableSize
  /** Figma Appearance: filled (page, edge, Radius/container) or ghost. */
  appearance?: 'filled' | 'ghost'
  /** Figma Dividers: a hairline under each row, or also between the columns. */
  dividers?: TableDividers
  /** Figma Content: a TableHeader and the rows (a TableBody), optionally a TableFooter. */
  children?: React.ReactNode
}

function Table({ size = 'default', appearance = 'filled', dividers = 'rows', className, children, ...props }: TableProps) {
  return (
    <Cascade value={{ size, dividers }}>
      <div
        data-slot="table-container"
        data-escala="Table"
        data-size={size}
        data-appearance={appearance}
        data-dividers={dividers}
        className="relative w-full overflow-x-auto"
      >
        <table role="table" data-slot="table" className={cn('block w-full border-collapse text-left', className)} {...props}>
          {children}
        </table>
      </div>
    </Cascade>
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody role="rowgroup" data-slot="table-body" className={cn('block w-full', className)} {...props} />
}

// ── TableHeader · TableFooter (a row of cells in a flex strip) ───────────────

export interface TableHeaderProps extends Omit<React.ComponentProps<'thead'>, 'children'> {
  size?: TableSize
  dividers?: TableDividers
  /** Figma Scrolled: the bottom edge turns Border/default once the body scrolls under it. */
  scrolled?: boolean
  /** Figma Content: the TableHead cells. */
  children?: React.ReactNode
}

function TableHeader({ size: sizeProp, dividers: dividersProp, scrolled = false, className, children, ...props }: TableHeaderProps) {
  const ctx = useCtx()
  const size = sizeProp ?? ctx.size ?? 'default'
  const dividers = dividersProp ?? ctx.dividers ?? 'rows'
  return (
    <Cascade value={{ size, dividers }}>
      <thead
        role="rowgroup"
        data-slot="table-header"
        data-escala="TableHeader"
        data-size={size}
        data-dividers={dividers}
        data-scrolled={scrolled ? 'true' : 'false'}
        className={cn('flex w-full', className)}
        {...props}
      >
        <tr role="row" className="flex min-w-0 flex-1">{children}</tr>
      </thead>
    </Cascade>
  )
}

export interface TableFooterProps extends Omit<React.ComponentProps<'tfoot'>, 'children'> {
  size?: TableSize
  dividers?: TableDividers
  children?: React.ReactNode
}

function TableFooter({ size: sizeProp, dividers: dividersProp, className, children, ...props }: TableFooterProps) {
  const ctx = useCtx()
  const size = sizeProp ?? ctx.size ?? 'default'
  const dividers = dividersProp ?? ctx.dividers ?? 'rows'
  return (
    <Cascade value={{ size, dividers, footer: true }}>
      <tfoot
        role="rowgroup"
        data-slot="table-footer"
        data-escala="TableFooter"
        data-size={size}
        data-dividers={dividers}
        className={cn('flex w-full', className)}
        {...props}
      >
        <tr role="row" className="flex min-w-0 flex-1">{children}</tr>
      </tfoot>
    </Cascade>
  )
}

// ── TableRow ─────────────────────────────────────────────────────────────────

export interface TableRowProps extends Omit<React.ComponentProps<'tr'>, 'children'> {
  size?: TableSize
  dividers?: TableDividers
  /** Figma State: Selected / Disabled / Dragging are data states; Hover and Focused come from the pointer and the keyboard. */
  selected?: boolean
  disabled?: boolean
  dragging?: boolean
  /** Hover and focus only exist on a selectable or actionable row. */
  interactive?: boolean
  /** Pin a State without a pointer (docs, Figma parity). */
  forceState?: TableRowState
  /** Figma Content: the TableCell instances. */
  children?: React.ReactNode
}

function TableRow({ size: sizeProp, dividers: dividersProp, selected, disabled, dragging, interactive, forceState, className, children, onClick, ...props }: TableRowProps) {
  const ctx = useCtx()
  const size = sizeProp ?? ctx.size ?? 'default'
  const dividers = dividersProp ?? ctx.dividers ?? 'rows'
  const isSelected = selected ?? (props as { 'data-state'?: string })['data-state'] === 'selected'
  const act = interactive ?? !!onClick
  const state: TableRowState | undefined = forceState
    ?? (disabled ? 'Disabled' : dragging ? 'Dragging' : isSelected ? 'Selected' : act ? undefined : 'Default')
  return (
    <Cascade value={{ size, dividers, disabled: state === 'Disabled' }}>
      <tr
        role="row"
        data-slot="table-row"
        data-escala="TableRow"
        data-size={size}
        data-dividers={dividers}
        data-state={isSelected ? 'selected' : undefined}
        data-force-state={state}
        aria-selected={isSelected ? true : undefined}
        aria-disabled={state === 'Disabled' ? true : undefined}
        tabIndex={act && state !== 'Disabled' ? 0 : undefined}
        onClick={state === 'Disabled' ? undefined : onClick}
        className={cn('flex w-full min-w-0', className)}
        {...props}
      >
        {children}
      </tr>
    </Cascade>
  )
}

// ── TableCell family ─────────────────────────────────────────────────────────

type CellState = 'Default' | 'Disabled'
const CELL_BASE = 'relative flex min-w-0 flex-1 items-center'
function pinEdge(pinned: TablePinned) {
  return pinned === 'none' ? null : (
    <span data-part="TableCell.pin" aria-hidden className={cn('pointer-events-none absolute inset-y-0', pinned === 'start' ? 'right-0' : 'left-0')} />
  )
}
const PIN_STICKY = (pinned: TablePinned) => (pinned === 'start' ? 'sticky left-0 z-[1]' : pinned === 'end' ? 'sticky right-0 z-[1]' : '')

export interface TableCellProps extends Omit<React.ComponentProps<'td'>, 'children' | 'align'> {
  size?: TableSize
  /** Figma Align: end is the numeric column (right-aligned, tabular figures). */
  align?: TableAlign
  /** Figma Pinned: a 1px edge on the side that touches the scrolling columns. */
  pinned?: TablePinned
  /** Figma State. */
  state?: CellState
  /** Figma Label / LabelVisible. */
  label?: React.ReactNode
  labelVisible?: boolean
  /** Figma Description / DescriptionVisible. */
  description?: React.ReactNode
  descriptionVisible?: boolean
  /** Figma LeadingVisible / Leading (a slot: a Checkbox by default). */
  leadingVisible?: boolean
  leading?: React.ReactNode
  /** Figma TrailingVisible / Trailing (a slot: an overflow IconButton by default). */
  trailingVisible?: boolean
  trailing?: React.ReactNode
  /** Header cell of the row: <th scope="row">. */
  rowHeader?: boolean
  /** Replaces the label + description (any content). */
  children?: React.ReactNode
}

const SMALL_SIZES: TableSize[] = ['xs', 'sm']

function TableCell({
  size: sizeProp, align = 'start', pinned = 'none', state, label = 'Cell text', labelVisible = true, description = 'Supporting text', descriptionVisible = false,
  leadingVisible = false, leading, trailingVisible = false, trailing, rowHeader, className, children, ...props
}: TableCellProps) {
  const ctx = useCtx()
  const size = sizeProp ?? ctx.size ?? 'default'
  const st: CellState = state ?? (ctx.disabled ? 'Disabled' : 'Default')
  const small = SMALL_SIZES.includes(size)
  const Tag = rowHeader ? 'th' : 'td'
  return (
    <Tag
      role={rowHeader ? 'rowheader' : 'cell'}
      scope={rowHeader ? 'row' : undefined}
      data-slot="table-cell"
      data-escala="TableCell"
      data-size={size}
      data-align={align}
      data-pinned={pinned}
      data-grid={ctx.dividers === 'grid' ? '' : undefined}
      data-force-state={st}
      aria-disabled={st === 'Disabled' ? true : undefined}
      className={cn(CELL_BASE, PIN_STICKY(pinned), 'text-left font-normal', className)}
      {...props}
    >
      {leadingVisible && (
        <span data-part="TableCell.leading" className="flex shrink-0 items-center">
          {leading ?? <Checkbox size={small ? 'sm' : 'default'} aria-label="Select row" disabled={st === 'Disabled'} />}
        </span>
      )}
      <span data-part="TableCell.content" className={cn('flex min-w-0 flex-1 flex-col', align === 'end' ? 'items-end text-right tabular-nums' : 'items-start')}>
        {children ?? (
          <>
            {labelVisible && <span data-part="TableCell.label" data-label-type={ctx.footer ? 'label' : undefined} className="max-w-full truncate">{label}</span>}
            {descriptionVisible && <span data-part="TableCell.description" className="max-w-full truncate">{description}</span>}
          </>
        )}
      </span>
      {trailingVisible && (
        <span data-part="TableCell.trailing" className="flex shrink-0 items-center">
          {trailing ?? <IconButton variant="secondary" appearance="ghost" size={small ? 'xs' : 'sm'} aria-label="Row actions" icon={glyph(G.dots)} disabled={st === 'Disabled'} />}
        </span>
      )}
      {pinEdge(pinned)}
    </Tag>
  )
}

export interface TableMediaCellProps extends Omit<React.ComponentProps<'td'>, 'children'> {
  size?: TableSize
  /** Figma Ratio: a 1:1 or 2:1 thumbnail. */
  ratio?: 'square' | 'wide'
  state?: CellState
  label?: React.ReactNode
  labelVisible?: boolean
  description?: React.ReactNode
  descriptionVisible?: boolean
  /** Figma Image (the swap): the thumbnail. Pass `src` or any media node. */
  src?: string
  alt?: string
  image?: React.ReactNode
}

function TableMediaCell({
  size: sizeProp, ratio = 'square', state, label = 'Studio portrait', labelVisible = true, description = 'media/photo-11', descriptionVisible = false,
  src, alt = '', image, className, ...props
}: TableMediaCellProps) {
  const ctx = useCtx()
  const size = sizeProp ?? ctx.size ?? 'default'
  const st: CellState = state ?? (ctx.disabled ? 'Disabled' : 'Default')
  return (
    <td
      role="cell"
      data-slot="table-media-cell"
      data-escala="TableMediaCell"
      data-size={size}
      data-ratio={ratio}
      data-grid={ctx.dividers === 'grid' ? '' : undefined}
      data-force-state={st}
      aria-disabled={st === 'Disabled' ? true : undefined}
      className={cn(CELL_BASE, 'text-left font-normal', className)}
      {...props}
    >
      <span data-part="TableMediaCell.media" className="relative flex shrink-0 overflow-hidden bg-[var(--color-surface-muted)] [&>*]:size-full [&>img]:object-cover">
        {image ?? (src ? <img src={src} alt={alt} /> : null)}
      </span>
      <span data-part="TableMediaCell.content" className="flex min-w-0 flex-1 flex-col items-start">
        {labelVisible && <span data-part="TableMediaCell.label" className="max-w-full truncate">{label}</span>}
        {descriptionVisible && <span data-part="TableMediaCell.description" className="max-w-full truncate">{description}</span>}
      </span>
    </td>
  )
}

export interface TableTrendCellProps extends Omit<React.ComponentProps<'td'>, 'children'> {
  size?: TableSize
  /** Figma Trend: the arrow and the colour carry the direction. */
  trend?: 'up' | 'down' | 'neutral'
  state?: CellState
  value?: React.ReactNode
  delta?: React.ReactNode
  deltaVisible?: boolean
}

const TREND_GLYPH = { up: G.trendUp, down: G.trendDown, neutral: G.minus } as const
const TREND_WORD = { up: 'up', down: 'down', neutral: 'unchanged' } as const

function TableTrendCell({ size: sizeProp, trend = 'up', state, value = '4,335.50', delta = '12.4%', deltaVisible = true, className, ...props }: TableTrendCellProps) {
  const ctx = useCtx()
  const size = sizeProp ?? ctx.size ?? 'default'
  const st: CellState = state ?? (ctx.disabled ? 'Disabled' : 'Default')
  return (
    <td
      role="cell"
      data-slot="table-trend-cell"
      data-escala="TableTrendCell"
      data-size={size}
      data-trend={trend}
      data-grid={ctx.dividers === 'grid' ? '' : undefined}
      data-force-state={st}
      aria-disabled={st === 'Disabled' ? true : undefined}
      className={cn(CELL_BASE, 'justify-end text-left font-normal tabular-nums', className)}
      {...props}
    >
      <span data-part="TableTrendCell.value">{value}</span>
      {deltaVisible && (
        <span data-part="TableTrendCell.delta" className="flex items-center">
          <span className="sr-only">{`${TREND_WORD[trend]} `}</span>
          <span data-part="TableTrendCell.trendIcon" aria-hidden className={ICON}>{glyph(TREND_GLYPH[trend])}</span>
          <span data-part="TableTrendCell.deltaLabel">{delta}</span>
        </span>
      )}
    </td>
  )
}

// ── TableHead ────────────────────────────────────────────────────────────────

export interface TableHeadProps extends Omit<React.ComponentProps<'th'>, 'children' | 'align'> {
  size?: TableSize
  align?: TableAlign
  pinned?: TablePinned
  /** Figma Sort: the arrow shows only on the sorted column (aria-sort). */
  sort?: TableSort
  /** A sortable column is a button: it hovers, takes the keyboard and calls this. */
  onSort?: () => void
  /** Pin a State without a pointer. */
  forceState?: 'Default' | 'Hover'
  label?: React.ReactNode
  labelVisible?: boolean
  leadingVisible?: boolean
  /** Figma Leading (a slot: the select-all Checkbox by default). */
  leading?: React.ReactNode
  /** Figma ResizerVisible. */
  resizerVisible?: boolean
  resizing?: boolean
  onResizeStart?: React.PointerEventHandler<HTMLDivElement>
  /** Replaces the label. */
  children?: React.ReactNode
}

const ARIA_SORT = { none: undefined, ascending: 'ascending', descending: 'descending' } as const

function TableHead({
  size: sizeProp, align = 'start', pinned = 'none', sort = 'none', onSort, forceState, label = 'Column', labelVisible = true, leadingVisible = false, leading,
  resizerVisible = false, resizing, onResizeStart, className, children, onKeyDown, ...props
}: TableHeadProps) {
  const ctx = useCtx()
  const size = sizeProp ?? ctx.size ?? 'default'
  const small = SMALL_SIZES.includes(size)
  const sortable = !!onSort
  return (
    <th
      scope="col"
      role="columnheader"
      aria-sort={ARIA_SORT[sort]}
      tabIndex={sortable ? 0 : undefined}
      data-slot="table-head"
      data-escala="TableHead"
      data-size={size}
      data-align={align}
      data-pinned={pinned}
      data-sort={sort}
      data-grid={ctx.dividers === 'grid' ? '' : undefined}
      // Hover exists only for sortable columns: any other head is pinned to Default so the pointer does nothing.
      data-force-state={forceState ?? (sortable ? undefined : 'Default')}
      onClick={onSort}
      onKeyDown={(e) => { onKeyDown?.(e); if (sortable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSort?.() } }}
      className={cn(CELL_BASE, PIN_STICKY(pinned), 'text-left font-normal', sortable && 'cursor-pointer outline-none', className)}
      {...props}
    >
      {leadingVisible && (
        <span data-part="TableHead.leading" className="flex shrink-0 items-center">
          {leading ?? <Checkbox size={small ? 'sm' : 'default'} aria-label="Select all rows" />}
        </span>
      )}
      <span data-part="TableHead.content" className={cn('flex min-w-0 flex-1 items-center', align === 'end' && 'justify-end')}>
        {children ?? (labelVisible && <span data-part="TableHead.label" className="min-w-0 truncate">{label}</span>)}
        {sort !== 'none' && <span data-part="TableHead.sortIcon" aria-hidden className={ICON}>{glyph(sort === 'ascending' ? G.up : G.down)}</span>}
      </span>
      {pinEdge(pinned) && <span data-part="TableHead.pin" aria-hidden className={cn('pointer-events-none absolute inset-y-0', pinned === 'start' ? 'right-0' : 'left-0')} />}
      {resizerVisible && (
        <TableResizer resizing={resizing} onPointerDown={onResizeStart} className="absolute top-0 left-[calc(100%-var(--spacing-1))] h-full" />
      )}
    </th>
  )
}

// ── TableResizer ─────────────────────────────────────────────────────────────

export interface TableResizerProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Figma State Resizing: the handle is being dragged. */
  resizing?: boolean
  /** Pin a State without a pointer (docs, Figma parity). */
  forceState?: 'Default' | 'Hover' | 'Resizing'
}

function TableResizer({ resizing, forceState, className, ...props }: TableResizerProps) {
  const state = forceState ?? (resizing ? 'Resizing' : undefined)
  // A focusable separator is a slider-like widget: it reports the width of the column it resizes.
  const ref = React.useRef<HTMLDivElement>(null)
  const [width, setWidth] = React.useState<number | undefined>(undefined)
  React.useLayoutEffect(() => {
    const col = ref.current?.parentElement
    if (!col) return
    const read = () => setWidth(Math.round(col.getBoundingClientRect().width))
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(col)
    return () => ro.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-valuemin={0}
      aria-label="Resize column"
      tabIndex={0}
      data-slot="table-resizer"
      data-escala="TableResizer"
      data-force-state={state}
      className={cn('flex cursor-col-resize items-center justify-center self-stretch outline-none', className)}
      {...props}
    >
      <span data-part="TableResizer.handle" className="block h-full" />
    </div>
  )
}

// ── Caption · DropIndicator · Empty · Loading · LoadMore ─────────────────────

export interface TableCaptionProps extends Omit<React.ComponentProps<'caption'>, 'title'> {
  title?: React.ReactNode
  description?: React.ReactNode
}

function TableCaption({ title, description, className, children, ...props }: TableCaptionProps) {
  const bare = title === undefined && description === undefined && children === undefined
  return (
    <caption data-slot="table-caption" data-escala="TableCaption" className={cn('flex w-full flex-col text-left', className)} {...props}>
      {(title ?? (bare ? 'Team billing' : undefined)) !== undefined && <span data-part="TableCaption.title">{title ?? 'Team billing'}</span>}
      {(description ?? children ?? (bare ? 'Invoices for the current billing period, in EUR.' : undefined)) !== undefined && (
        <span data-part="TableCaption.description">{description ?? children ?? 'Invoices for the current billing period, in EUR.'}</span>
      )}
    </caption>
  )
}

function TableDropIndicator({ className, ...props }: Omit<React.ComponentProps<'div'>, 'children'>) {
  return (
    <div role="presentation" aria-hidden data-slot="table-drop-indicator" data-escala="TableDropIndicator" className={cn('flex w-full', className)} {...props}>
      <span data-part="TableDropIndicator.line" className="block w-full" />
    </div>
  )
}

export interface TableEmptyProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  icon?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  /** Figma Action (a slot: a secondary outline Button by default); `null` hides it. */
  action?: React.ReactNode
}

function TableEmpty({ icon, title = 'No invoices yet', description = 'Invoices appear here once a billing period closes.', action, className, ...props }: TableEmptyProps) {
  return (
    <div role="status" data-slot="table-empty" data-escala="TableEmpty" className={cn('flex w-full flex-col items-center justify-center text-center', className)} {...props}>
      <span data-part="TableEmpty.icon" aria-hidden className={ICON}>{icon ?? glyph(G.tray)}</span>
      <span data-part="TableEmpty.text" className="flex flex-col items-center">
        <span data-part="TableEmpty.title">{title}</span>
        <span data-part="TableEmpty.description">{description}</span>
      </span>
      {action !== null && (
        <span data-part="TableEmpty.action" className="flex">
          {action ?? <Button variant="secondary" appearance="outline" size="sm">Clear filters</Button>}
        </span>
      )}
    </div>
  )
}

export interface TableLoadingProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Figma Label. */
  label?: React.ReactNode
}

function TableLoading({ label = 'Loading data…', className, ...props }: TableLoadingProps) {
  return (
    <div role="status" aria-live="polite" data-slot="table-loading" data-escala="TableLoading" className={cn('flex w-full items-center justify-center', className)} {...props}>
      <span data-part="TableLoading.spinner" aria-hidden className={ICON}>{glyph(G.spinner, true)}</span>
      <span data-part="TableLoading.label">{label}</span>
    </div>
  )
}

export interface TableLoadMoreProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Figma State: Loading swaps the button for a TableLoading row. */
  state?: 'Default' | 'Loading'
  label?: React.ReactNode
  loadingLabel?: React.ReactNode
  onLoadMore?: () => void
}

function TableLoadMore({ state = 'Default', label = 'Load more', loadingLabel = 'Loading more…', onLoadMore, className, ...props }: TableLoadMoreProps) {
  return (
    <div data-slot="table-load-more" data-escala="TableLoadMore" data-state={state} data-force-state={state} className={cn('flex w-full items-center justify-center', className)} {...props}>
      {state === 'Loading'
        ? <TableLoading label={loadingLabel} />
        : <Button variant="secondary" appearance="ghost" size="sm" onClick={onLoadMore}>{label}</Button>}
    </div>
  )
}

export {
  Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableMediaCell, TableTrendCell, TableResizer,
  TableCaption, TableDropIndicator, TableEmpty, TableLoading, TableLoadMore,
}
