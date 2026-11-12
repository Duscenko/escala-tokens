/**
 * Form control recipes. See `componentRecipes.ts` for the rules: every value is
 * a token reference, a state with no role gets a role (never an opacity), and
 * a slot key may carry a `:state` / `[attr]` suffix to give one PART its state.
 *
 * Refs may SUM dimensions (`selector.control+spacing.1`) — `calc()` in CSS.
 */
import { c, NONE, part, PANEL_RADIUS, PANEL_ROW_RADIUS, type ComponentRecipe, type SlotMap, type SlotProps, FOCUS } from './helpers.js'

// ── Shared field chrome ────────────────────────────────────────────────────

/** The box every text-like control draws: fill, edge and focus halo by state.
 *  Measured against the Figma `Input` set (design-plans/input-contract.md): Disabled
 *  keeps the NEUTRAL `border.control` stroke (only the fill mutes) — it does not
 *  switch to the disabled fill colour, as this used to assume. */
export function fieldBox(state: string): SlotProps {
  if (state === 'Disabled') return { fill: c('action.disabled.default'), stroke: c('border.control'), ring: NONE }
  // shadcn: `border-destructive` + a soft destructive ring (`ring-destructive/20`).
  // The stroke is the contrast-bearing boundary (pale in dark — see its role),
  // the halo is `status.critical.border`, the alpha red that carries the hue.
  // Figma's Input calls this state `Invalid`; other sets still say `Error` — both work.
  if (state === 'Error' || state === 'Invalid') return { fill: c('surface.input'), stroke: c('status.critical.border-strong'), ring: c('status.critical.border') }
  if (state === 'Focused' || state === 'Open') return { fill: c('surface.input'), stroke: c('border.focus'), ring: c('border.ring.default') }
  if (state === 'Hover') return { fill: c('surface.input'), stroke: c('border.control-hover'), ring: NONE }
  return { fill: c('surface.input'), stroke: c('border.control'), ring: NONE }
}

const FIELD_FIXED: SlotProps = {
  radius: 'radius.action', strokeWidth: 'stroke.control',
  paddingX: 'spacing.inset-control', gap: 'spacing.gap-control',
}
/** Live focus on a control whose root IS the box (no State axis involved). */
const FIELD_FOCUS: SlotProps = { stroke: c('border.focus'), ring: c('border.ring.default') }

// ── Input ──────────────────────────────────────────────────────────────────
// The Figma `Input` set (design-plans/input-contract.md, 4:12380, 114 variants):
// the box with the text field inside it. `Size` × `State` × `Type` × `Value`, as in
// the file. The box is the root (fill, edge, halo, height, insets); the <input> is
// `text`; `icon` is every glyph (leading, trailing, the 16px chevron of a select
// addon); `addon` is the fixed text (+01, $, USD, https://, @, Browse, Copy);
// `divider` the 1px rule that splits a select or a prefix off the value; `kbd` a
// key of the search shortcut (the file's Kbd sm / xs). `Value` needs no paint of
// its own: `text` is the typed value, `placeholder` the empty one.

const INPUT_STATES = ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled'] as const
export const INPUT_SIZES = ['default', 'sm', 'lg'] as const
export const INPUT_TYPES = [
  'default', 'phone', 'currency', 'currency-select', 'password', 'url', 'upload', 'tag', 'copy-link', 'credit-card', 'search',
] as const
const INPUT_GEOMETRY: Record<string, string> = { sm: 'size.compact', default: 'size.control', lg: 'size.touch' }
/** Glyphs and keys follow the box: Size/icon-sm in sm, Size/icon-md in default and lg. */
const INPUT_GLYPH: Record<string, string> = { sm: 'icon.small', default: 'icon.medium', lg: 'icon.medium' }
/** The Types whose divider runs edge to edge: the file lays their strokes out
 *  (`strokesIncludedInLayout`), so their content starts 1px further in (13, not 12). */
const INPUT_STROKE_IN_LAYOUT = new Set(['currency-select', 'url', 'upload', 'copy-link'])

export const INPUT: ComponentRecipe = {
  key: 'Input',
  slots: ['root', 'text', 'placeholder', 'icon', 'addon', 'divider', 'kbd'],
  pseudoSlots: { placeholder: { of: 'text', pseudo: '::placeholder' } },
  defaults: { Size: 'default', State: 'Default', Type: 'default', Value: 'placeholder' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.action', strokeWidth: 'stroke.control', gap: 'spacing.gap-control', font: 'type.placeholder' },
      divider: { fill: c('border.subtle'), width: 'stroke.control' },
      kbd: {
        fill: c('surface.muted'), stroke: c('border.subtle'), strokeWidth: 'stroke.divider', radius: 'radius.control',
        paddingX: 'spacing.gap-tight', text: c('content.secondary'), font: 'type.caption',
      },
    })),
    part({ Type: INPUT_TYPES }, (type) => ({
      root: { paddingX: INPUT_STROKE_IN_LAYOUT.has(type) ? 'spacing.inset-control+stroke.control' : 'spacing.inset-control' },
    })),
    part({ Size: INPUT_SIZES }, (size) => ({
      root: { height: INPUT_GEOMETRY[size] },
      icon: { width: INPUT_GLYPH[size], height: INPUT_GLYPH[size] },
      // The select addon's caret is Size/icon-sm at every size.
      'icon[data-icon="chevron"]': { width: 'icon.small', height: 'icon.small' },
      kbd: { height: INPUT_GLYPH[size], minWidth: INPUT_GLYPH[size] },
    })),
    part({ State: INPUT_STATES }, (state) => {
      const disabled = state === 'Disabled'
      const ink = c(disabled ? 'content.disabled' : 'content.primary')
      return {
        root: fieldBox(state),
        text: { text: ink },
        placeholder: { text: c(disabled ? 'content.disabled' : 'content.subtle') },
        icon: { text: ink },
        addon: { text: ink },
      }
    }),
  ],
}

// ── Textarea ───────────────────────────────────────────────────────────────
// The Figma `Textarea` set (design-plans/textarea-contract.md, 394:152, 36 variants):
// Size × State × Value. The box is the root (Surface/input, Border/control, Radius/action,
// a fixed height per Size: 72 · 96 · 128) and lays its stroke out, so the text starts at
// the padding + the stroke. The <textarea> is `text` (Type/body-sm · md · lg);
// `placeholder` its empty state. Invalid and Loading reserve 36px on the right and
// show a glyph at the top-right corner, `padding` in from the edge (`adornment`):
// the warning in Status/critical/content, or the Spinner (16px glyph, top-left of a
// 14 · 16 · 18 frame, as the file draws it). Focused and Invalid draw a 2px halo
// fully OUTSIDE the 1px edge. `grip` is the optional resize glyph, 6px in from the
// bottom-right corner (`corner` is its overlay).
export const TEXTAREA_SIZES = ['default', 'sm', 'lg'] as const
export const TEXTAREA_STATES = ['Default', 'Hover', 'Focused', 'Invalid', 'Loading', 'Disabled'] as const
/** Box height per Size (unbound in the file: 72 · 96 · 128). */
const TEXTAREA_HEIGHT: Record<string, string> = { sm: 'size.compact+size.control', default: 'size.touch+size.touch', lg: 'size.2xl+size.2xl' }
/** Padding per Size (Y · X): 6 · 8, gap-control · inset-control, inset-control · gap-group. */
const TEXTAREA_PAD: Record<string, [string, string]> = {
  sm: ['spacing.1_5', 'spacing.gap-control'], default: ['spacing.gap-control', 'spacing.inset-control'], lg: ['spacing.inset-control', 'spacing.gap-group'],
}
const TEXTAREA_FONT: Record<string, string> = { sm: 'type.body-sm', default: 'type.body-md', lg: 'type.body-lg' }
/** The status glyph's frame (unbound: 14 · 16 · 18). */
const TEXTAREA_GLYPH: Record<string, string> = { sm: 'spacing.3+spacing.0_5', default: 'spacing.4', lg: 'spacing.4+spacing.0_5' }

function textareaPaint(state: string): SlotMap {
  const disabled = state === 'Disabled'
  const out: SlotMap = {
    text: { text: c(disabled ? 'content.disabled' : 'content.primary') },
    placeholder: { text: c(disabled ? 'content.disabled' : 'content.subtle') },
    grip: { text: c(disabled ? 'content.disabled' : 'content.subtle') },
  }
  if (disabled) out.root = { fill: c('action.disabled.default'), stroke: c('border.control'), halo: NONE }
  else if (state === 'Invalid') out.root = { fill: c('surface.input'), stroke: c('status.critical.border-strong'), halo: c('status.critical.border') }
  else if (state === 'Focused') out.root = { fill: c('surface.input'), stroke: c('border.focus'), halo: c('border.ring.default') }
  else if (state === 'Hover') out.root = { fill: c('surface.input'), stroke: c('border.control-hover') }
  else out.root = { fill: c('surface.input'), stroke: c('border.control') }
  // Invalid and Loading keep 36px free on the right for the corner glyph.
  if (state === 'Invalid' || state === 'Loading') out.root.paddingRight = 'spacing.8+spacing.1'
  return out
}

export const TEXTAREA: ComponentRecipe = {
  key: 'Textarea',
  slots: ['root', 'text', 'placeholder', 'adornment', 'status', 'spinner', 'corner', 'grip'],
  pseudoSlots: { placeholder: { of: 'text', pseudo: '::placeholder' } },
  defaults: { Size: 'default', State: 'Default', Value: 'placeholder' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.action', strokeWidth: 'stroke.control' },
      status: { text: c('status.critical.content') },
      spinner: { text: c('content.secondary') },
      // The resize glyph: 8×8, 6px in from the bottom-right corner at every Size.
      corner: { paddingX: 'spacing.1_5', paddingY: 'spacing.1_5' },
      grip: { width: 'spacing.2', height: 'spacing.2' },
    })),
    part({ Size: TEXTAREA_SIZES }, (size) => {
      const [y, x] = TEXTAREA_PAD[size]
      const glyph = TEXTAREA_GLYPH[size]
      return {
        root: { height: TEXTAREA_HEIGHT[size], paddingX: `${x}+stroke.control`, paddingY: `${y}+stroke.control` },
        text: { font: TEXTAREA_FONT[size] },
        adornment: { paddingX: x, paddingY: y },
        status: { width: glyph, height: glyph },
        spinner: { width: glyph, height: glyph },
      }
    }),
    part({ State: TEXTAREA_STATES }, (state) => textareaPaint(state)),
  ],
}

// ── DatePickerTrigger ──────────────────────────────────────────────────────
// The Figma `DatePickerTrigger` set (design-plans/date-picker-trigger-contract.md, 425:199,
// 36 variants): an input-styled button that opens the DatePickerPopover. `Size` × `State` ×
// `Value`. The ROOT is the box: Surface/input, a Border/control edge the file lays out
// (content starts at padding + stroke), Radius/action, 32 · 40 · 48 tall, 12px insets, 8px
// gap. In it, in order: the calendar glyph (16 · 20 · 16 — the file's numbers; Loading swaps
// it for the Spinner) and the text, which fills the rest (Type/body-sm · body-md · body-md).
// Hover: Border/control-hover. Focused: a 2px Border/focus edge laid out (content moves 1px)
// + a 2px Border/ring/default halo OUTSIDE. Invalid: Status/critical/border-strong and NO halo
// (unlike the inputs). Disabled: Surface/muted fill, the ordinary Border/control edge, every
// ink Content/disabled. The placeholder is Content/subtle, the date Content/primary.
export const DATE_PICKER_TRIGGER_SIZES = ['default', 'sm', 'lg'] as const
export const DATE_PICKER_TRIGGER_STATES = ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled', 'Loading'] as const
export const DATE_PICKER_TRIGGER_VALUES = ['placeholder', 'filled'] as const
const DPT_GEOMETRY: Record<string, { h: string; font: string; icon: string }> = {
  sm: { h: 'size.compact', font: 'type.body-sm', icon: 'icon.small' },
  default: { h: 'size.control', font: 'type.body-md', icon: 'icon.medium' },
  lg: { h: 'size.touch', font: 'type.body-md', icon: 'icon.small' },
}

function datePickerTriggerPaint(state: string): SlotMap {
  const disabled = state === 'Disabled'
  const out: SlotMap = {
    icon: { text: c(disabled ? 'content.disabled' : 'content.secondary') },
    spinner: { text: c('content.secondary') },
    text: { text: c(disabled ? 'content.disabled' : 'content.primary') },
    placeholder: { text: c(disabled ? 'content.disabled' : 'content.subtle') },
  }
  if (disabled) out.root = { fill: c('surface.muted'), stroke: c('border.control'), halo: NONE }
  else if (state === 'Invalid') out.root = { fill: c('surface.input'), stroke: c('status.critical.border-strong'), halo: NONE }
  else if (state === 'Focused') {
    // The 2px edge is laid out: the padding takes it instead of the 1px control edge.
    out.root = { fill: c('surface.input'), stroke: c('border.focus'), strokeWidth: 'stroke.focus', halo: c('border.ring.default'), paddingX: 'spacing.inset-control+stroke.focus' }
  } else if (state === 'Hover') out.root = { fill: c('surface.input'), stroke: c('border.control-hover'), halo: NONE }
  else out.root = { fill: c('surface.input'), stroke: c('border.control'), halo: NONE }
  return out
}

export const DATE_PICKER_TRIGGER: ComponentRecipe = {
  key: 'DatePickerTrigger',
  slots: ['root', 'icon', 'spinner', 'text', 'placeholder'],
  defaults: { Size: 'default', State: 'Default', Value: 'placeholder' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.action', strokeWidth: 'stroke.control', paddingX: 'spacing.inset-control+stroke.control', gap: 'spacing.gap-control' },
    })),
    part({ Size: DATE_PICKER_TRIGGER_SIZES }, (size) => {
      const g = DPT_GEOMETRY[size]
      return {
        root: { height: g.h },
        text: { font: g.font },
        placeholder: { font: g.font },
        icon: { width: g.icon, height: g.icon },
        spinner: { width: g.icon, height: g.icon },
      }
    }),
    part({ State: DATE_PICKER_TRIGGER_STATES }, (state) => datePickerTriggerPaint(state)),
  ],
}

// ── DatePickerPopover ──────────────────────────────────────────────────────
// The Figma `DatePickerPopover` set (design-plans/date-picker-popover-contract.md, 425:2276,
// 4 variants: Size default · sm × Mode single · range): a THIN SHELL — a frame with no fill,
// stroke or padding, Radius/overlay and the Shadow/lg effect, around one Calendar. Everything
// visible (Surface/layer-1, Border/default, the header, the days, Clear / Apply, the presets rail
// of Mode=range, the 322 · 250 · 482 · 390 widths) belongs to the Calendar. The shadow is what
// Figma PAINTS: key 0 12 16 + ambient 0 4 6, no ring and no spread (the frame does not clip), the
// FABButton's `lift: rest`.
export const DATE_PICKER_POPOVER_SIZES = ['default', 'sm'] as const
export const DATE_PICKER_POPOVER_MODES = ['single', 'range'] as const
export const DATE_PICKER_POPOVER: ComponentRecipe = {
  key: 'DatePickerPopover',
  slots: ['root'],
  defaults: { Size: 'default', Mode: 'single' },
  parts: [
    part({}, () => ({ root: { radius: 'radius.overlay', lift: 'rest' } })),
  ],
}

// ── CalendarDay ────────────────────────────────────────────────────────────
// The Figma `CalendarDay` set (design-plans/calendar-day-contract.md, 421:309, 44 variants):
// Size default 40 · sm 32 × State (Default · Hover · Today · Selected · RangeMiddle · RangeStart ·
// RangeEnd · Outside · Disabled · Unavailable · Focused) × Variant default · secondary. A
// transparent square (Size/control · Size/compact) holding, from back to front, the range band
// (Surface/selected, or Surface/muted for secondary; the whole square, or its right / left half for
// the range ends), the `cell` (Radius/action, the fill, the 1px Today edge or the 2px Focused edge
// stroked INSIDE with the 2px halo OUTSIDE) and the `day` number; the indicator dash (12×2) sits
// 4px above the bottom edge. Disabled and Unavailable are drawn identically (Content/disabled).
export const CALENDAR_DAY_SIZES = ['default', 'sm'] as const
export const CALENDAR_DAY_STATES = ['Default', 'Hover', 'Today', 'Selected', 'RangeMiddle', 'RangeStart', 'RangeEnd', 'Outside', 'Disabled', 'Unavailable', 'Focused'] as const
export const CALENDAR_DAY_VARIANTS = ['default', 'secondary'] as const
const CALENDAR_DAY_GEOMETRY: Record<string, { box: string; font: string }> = {
  default: { box: 'size.control', font: 'type.body-md' },
  sm: { box: 'size.compact', font: 'type.body-sm' },
}

function calendarDayPaint(variant: string, state: string): SlotMap {
  const secondary = variant === 'secondary'
  const solid = secondary ? c('surface.inverse') : c('action.primary.default')
  const solidInk = secondary ? c('content.inverse') : c('content.on-action')
  const out: SlotMap = {
    band: { fill: c(secondary ? 'surface.muted' : 'surface.selected') },
    indicator: { fill: c(secondary ? 'border.strong' : 'border.accent') },
    cell: {},
    day: { text: c('content.primary') },
  }
  switch (state) {
    case 'Hover': out.cell = { fill: c('action.ghost.hover') }; break
    case 'Today': out.cell = { stroke: c(secondary ? 'border.strong' : 'border.accent'), strokeWidth: 'stroke.control' }; break
    case 'Selected': case 'RangeStart': case 'RangeEnd': out.cell = { fill: solid }; out.day = { text: solidInk }; break
    case 'RangeMiddle': out.day = { text: c(secondary ? 'content.primary' : 'content.accent') }; break
    case 'Outside': out.day = { text: c('content.secondary') }; break
    case 'Disabled': case 'Unavailable': out.day = { text: c('content.disabled') }; break
    case 'Focused':
      out.cell = secondary
        ? { stroke: c('border.strong'), strokeWidth: 'stroke.focus', halo: c('border.subtle') }
        : { stroke: c('border.focus'), strokeWidth: 'stroke.focus', halo: c('border.ring.default') }
      break
  }
  return out
}

export const CALENDAR_DAY: ComponentRecipe = {
  key: 'CalendarDay',
  slots: ['root', 'band', 'cell', 'day', 'indicator'],
  defaults: { Size: 'default', State: 'Default', Variant: 'default' },
  parts: [
    part({}, () => ({
      cell: { radius: 'radius.action' },
      // The shape is an instance override in the file: rounded (Radius/action) · pill · square.
      'cell[data-shape="pill"]': { radius: 'radius.pill' },
      'cell[data-shape="square"]': { radius: 'radius.none' },
      indicator: { width: 'spacing.3', height: 'spacing.0_5' },
    })),
    part({ Size: CALENDAR_DAY_SIZES }, (size) => {
      const g = CALENDAR_DAY_GEOMETRY[size]
      return { root: { width: g.box, height: g.box }, day: { font: g.font } }
    }),
    part({ Variant: CALENDAR_DAY_VARIANTS, State: CALENDAR_DAY_STATES }, (variant, state) => calendarDayPaint(variant, state)),
  ],
}

// ── CalendarHeader ─────────────────────────────────────────────────────────
// The Figma `CalendarHeader` set (design-plans/calendar-header-contract.md, 422:355, 6 variants:
// Size default · sm × Header single · multiple · plain). A row as wide as seven day cells
// (7 × Size/control · 7 × Size/compact), the title centred between two outlined arrow buttons
// (32 · 28 square, Radius/action, a 1px Border/control edge inside, no fill, Content/secondary glyph).
// The title is one chip with the combined "Month Year" label (single), a month chip and a year chip
// (multiple) or the bare label (plain). A chip is hugging: 4px × 8px padding, gap-tight, Radius/action,
// no fill or stroke, Type/body-md · body-sm label in Content/primary and a 16px chevron-down in
// Content/secondary. The file draws no hover or focus for any of them.
export const CALENDAR_HEADER_SIZES = ['default', 'sm'] as const
export const CALENDAR_HEADER_HEADERS = ['single', 'multiple', 'plain'] as const
const CALENDAR_HEADER_GEOMETRY: Record<string, { cell: string; nav: string; navIcon: string; font: string }> = {
  default: { cell: 'size.control', nav: 'size.compact', navIcon: 'icon.medium', font: 'type.body-md' },
  sm: { cell: 'size.compact', nav: 'spacing.6+spacing.1', navIcon: 'icon.small', font: 'type.body-sm' },
}
const SEVEN = (ref: string) => Array.from({ length: 7 }, () => ref).join('+')

export const CALENDAR_HEADER: ComponentRecipe = {
  key: 'CalendarHeader',
  slots: ['root', 'nav', 'navIcon', 'title', 'chip', 'label', 'chevron'],
  defaults: { Size: 'default', Header: 'single' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.none' },
      nav: { radius: 'radius.action', stroke: c('border.control'), strokeWidth: 'stroke.control', text: c('content.secondary') },
      title: { gap: 'spacing.gap-tight' },
      chip: { radius: 'radius.action', paddingX: 'spacing.2', paddingY: 'spacing.1', gap: 'spacing.gap-tight' },
      label: { text: c('content.primary') },
      chevron: { width: 'icon.small', height: 'icon.small', text: c('content.secondary') },
    })),
    part({ Size: CALENDAR_HEADER_SIZES }, (size) => {
      const g = CALENDAR_HEADER_GEOMETRY[size]
      return {
        root: { width: SEVEN(g.cell), height: g.nav },
        nav: { width: g.nav, height: g.nav },
        navIcon: { width: g.navIcon, height: g.navIcon },
        label: { font: g.font },
      }
    }),
  ],
}

// ── CalendarMonth ──────────────────────────────────────────────────────────
// The Figma `CalendarMonth` set (design-plans/calendar-month-contract.md, 422:1713, 12 variants:
// Size default · sm × Mode single · multiple · range × Variant default · secondary). One visible month,
// Sunday first, a column of 7 day cells wide: a `weekdays` row of seven squares (the day cell's size,
// Type/caption in Content/secondary, centred) over the weeks, each a row of seven CalendarDay cells with
// no gap. The month frame has no fill, stroke, padding or gap. Mode and Variant only change which
// CalendarDay states and variant the cells carry; the geometry is Size's alone.
export const CALENDAR_MONTH_SIZES = ['default', 'sm'] as const
export const CALENDAR_MONTH_MODES = ['single', 'multiple', 'range'] as const
export const CALENDAR_MONTH_VARIANTS = ['default', 'secondary'] as const

export const CALENDAR_MONTH: ComponentRecipe = {
  key: 'CalendarMonth',
  slots: ['root', 'weekdays', 'weekday', 'week'],
  defaults: { Size: 'default', Mode: 'single', Variant: 'default' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.none' },
      weekday: { text: c('content.secondary'), font: 'type.caption' },
    })),
    part({ Size: CALENDAR_DAY_SIZES }, (size) => {
      const g = CALENDAR_DAY_GEOMETRY[size]
      return {
        root: { width: SEVEN(g.box) },
        weekdays: { height: g.box },
        weekday: { width: g.box, height: g.box },
        week: { height: g.box },
      }
    }),
  ],
}

// ── CalendarPresets ────────────────────────────────────────────────────────
// The Figma `CalendarPresets` set (design-plans/calendar-presets-contract.md, 423:988, 4 variants:
// Size default · sm × Variant default · secondary). The rail beside a range Calendar: a column 160
// (default) · 140 (sm) wide, padded Spacing/inset-surface · inset-control, with a Stroke/divider edge
// in Border/default on its RIGHT side only, 2px between rows. The "PRESETS" label (Type/caption,
// Content/secondary) over the presets: rows as wide as the rail, 32 · 28 tall, 8px inline padding,
// Radius/action, Type/body-sm in Content/primary. The preset whose range is the selection takes the
// range tint: Surface/selected + Content/accent, or Surface/muted + Content/primary for secondary
// (the CalendarDay RangeMiddle pair). The file draws no hover or focus.
export const CALENDAR_PRESETS_SIZES = ['default', 'sm'] as const
export const CALENDAR_PRESETS_VARIANTS = ['default', 'secondary'] as const
const CALENDAR_PRESETS_GEOMETRY: Record<string, { width: string; inset: string; row: string }> = {
  // No token is 160 or 140 wide: summed spacing steps (128 + 32 · 128 + 12).
  default: { width: 'spacing.32+spacing.8', inset: 'spacing.inset-surface', row: 'size.compact' },
  sm: { width: 'spacing.32+spacing.3', inset: 'spacing.inset-control', row: 'spacing.6+spacing.1' },
}

export const CALENDAR_PRESETS: ComponentRecipe = {
  key: 'CalendarPresets',
  slots: ['root', 'label', 'preset'],
  defaults: { Size: 'default', Variant: 'default' },
  parts: [
    part({}, () => ({
      root: { stroke: c('border.default'), strokeRightWidth: 'stroke.divider', gap: 'spacing.0_5' },
      label: { text: c('content.secondary'), font: 'type.caption' },
      preset: { radius: 'radius.action', paddingX: 'spacing.2', text: c('content.primary'), font: 'type.body-sm' },
    })),
    part({ Size: CALENDAR_PRESETS_SIZES }, (size) => {
      const g = CALENDAR_PRESETS_GEOMETRY[size]
      return { root: { width: g.width, paddingX: g.inset, paddingY: g.inset }, preset: { height: g.row } }
    }),
    part({ Variant: CALENDAR_PRESETS_VARIANTS }, (variant) => ({
      'preset[data-selected="true"]': variant === 'secondary'
        ? { fill: c('surface.muted'), text: c('content.primary') }
        : { fill: c('surface.selected'), text: c('content.accent') },
    })),
  ],
}

// ── CalendarFooter ─────────────────────────────────────────────────────────
// The Figma `CalendarFooter` set (design-plans/calendar-footer-contract.md, 423:963, 2 variants:
// Size default · sm). The bottom bar of the Calendar body: as wide as seven day cells plus its padding
// (312 · 248), 72 · 56 tall, a Stroke/divider edge in Border/default on its TOP side only, padding
// 16 · 12 on the sides, "Today" (a link Button) at the start and the actions (an outline secondary
// "Clear" and a solid "Apply", 8 apart) at the end. The buttons are the system's Button at the
// footer's size; this recipe only lays out the bar.
export const CALENDAR_FOOTER_SIZES = ['default', 'sm'] as const
const CALENDAR_FOOTER_GEOMETRY: Record<string, { width: string; height: string; inset: string }> = {
  // 7 day cells + both side paddings · the button height + both block paddings (no token is 312 / 72).
  default: { width: `${SEVEN('size.control')}+spacing.4+spacing.4`, height: 'size.control+spacing.4+spacing.4', inset: 'spacing.4' },
  sm: { width: `${SEVEN('size.compact')}+spacing.3+spacing.3`, height: 'size.compact+spacing.3+spacing.3', inset: 'spacing.3' },
}

export const CALENDAR_FOOTER: ComponentRecipe = {
  key: 'CalendarFooter',
  slots: ['root', 'actions'],
  defaults: { Size: 'default' },
  parts: [
    part({}, () => ({
      root: { stroke: c('border.default'), strokeTopWidth: 'stroke.divider' },
      actions: { gap: 'spacing.2' },
    })),
    part({ Size: CALENDAR_FOOTER_SIZES }, (size) => {
      const g = CALENDAR_FOOTER_GEOMETRY[size]
      return { root: { width: g.width, height: g.height, paddingX: g.inset } }
    }),
  ],
}

// ── InputGroup ─────────────────────────────────────────────────────────────

// The group IS the field box, so it paints what the bare Input paints in each
// state — shadcn moves the control's focus / invalid styling onto the group
// with `has-[…]`. Selectors, not a State axis: the catalogue (= the plugin's
// Figma set) ships Input Group with no variants. Same specificity ladder as the
// recipe's own state suffixes, emitted in order Hover < Focused < Error < Disabled.
const GROUP_LIVE = ':not([data-force-state]):not([aria-disabled="true"]):not(:has(:disabled))'
const GROUP_CONTROL = '[data-slot="input-group-control"]'

export const INPUT_GROUP: ComponentRecipe = {
  key: 'InputGroup',
  slots: ['root', 'addon', 'input', 'button', 'separator'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { ...fieldBox('Default'), strokeWidth: 'stroke.control', radius: 'radius.action', height: 'size.control' },
      [`root:hover${GROUP_LIVE}`]: fieldBox('Hover'),
      'root[data-force-state="Hover"]': fieldBox('Hover'),
      [`root:has(${GROUP_CONTROL}:focus-visible)${GROUP_LIVE}`]: fieldBox('Focused'),
      'root[data-force-state="Focused"]': fieldBox('Focused'),
      [`root:has(${GROUP_CONTROL}[aria-invalid="true"])`]: fieldBox('Error'),
      'root[data-force-state="Error"]': fieldBox('Error'),
      'root:has(:disabled)': fieldBox('Disabled'),
      'root[aria-disabled="true"]': fieldBox('Disabled'),
      // shadcn's addon is transparent: it holds an icon, text, kbd or button.
      addon: { text: c('content.secondary'), font: 'type.placeholder', paddingX: 'spacing.inset-control', gap: 'spacing.gap-control' },
      input: { text: c('content.primary'), font: 'type.placeholder', paddingX: 'spacing.inset-control' },
      'input::placeholder': { text: c('content.subtle') },
      'input:disabled': { text: c('content.disabled') },
      'input:disabled::placeholder': { text: c('content.disabled') },
      button: { text: c('content.accent'), font: 'type.button', paddingX: 'spacing.4' },
      'button:hover': { fill: c('action.ghost.hover') },
      'button:active': { fill: c('action.ghost.pressed') },
      separator: { fill: c('border.control'), width: 'stroke.control' },
    })),
  ],
}

// ── NumberInput ────────────────────────────────────────────────────────────
// The Figma `NumberInput` set (design-plans/number-input-contract.md, 1107:243,
// 15 variants): Size × State. A field box (Surface/input, Border/control, Radius/action)
// holding a ghost secondary IconButton either side (the IconButton recipe paints them)
// and the value, centred, in Type/placeholder. The box is three control heights wide
// (96 · 120 · 144) and lays its stroke out: content starts at gap-tight + the stroke.
// Focused and Invalid draw a 2px halo fully OUTSIDE the 1px edge (the file's
// focus-ring is stroked OUTSIDE), Invalid always.
export const NUMBER_INPUT_SIZES = ['default', 'sm', 'lg'] as const
export const NUMBER_INPUT_STATES = ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled'] as const
const NUMBER_BOX: Record<string, string> = { sm: 'size.compact', default: 'size.control', lg: 'size.touch' }

function numberInputPaint(state: string): SlotMap {
  if (state === 'Disabled') return { root: { fill: c('action.disabled.default'), stroke: c('border.control'), halo: NONE }, value: { text: c('content.disabled') } }
  if (state === 'Invalid') return { root: { fill: c('surface.input'), stroke: c('status.critical.border-strong'), halo: c('status.critical.border') } }
  if (state === 'Focused') return { root: { fill: c('surface.input'), stroke: c('border.focus'), halo: c('border.ring.default') } }
  if (state === 'Hover') return { root: { fill: c('surface.input'), stroke: c('border.control-hover') } }
  return { root: { fill: c('surface.input'), stroke: c('border.control') } }
}

export const NUMBER_INPUT: ComponentRecipe = {
  key: 'NumberInput',
  slots: ['root', 'value', 'caret'],
  defaults: { Size: 'default', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.action', strokeWidth: 'stroke.control', gap: 'spacing.none', paddingX: 'spacing.gap-tight+stroke.control' },
      value: { text: c('content.primary'), font: 'type.placeholder' },
      // The file's Focused caret: 1px (Stroke/control) × the placeholder line, Content/primary.
      caret: { fill: c('content.primary'), width: 'stroke.control', font: 'type.placeholder' },
    })),
    part({ Size: NUMBER_INPUT_SIZES }, (size) => {
      const box = NUMBER_BOX[size]
      return { root: { height: box, width: `${box}+${box}+${box}` } }
    }),
    part({ State: NUMBER_INPUT_STATES }, (state) => numberInputPaint(state)),
  ],
}

// ── InputTag · InputTagChip · InputTagOption ───────────────────────────────
// The Figma `InputTag` page (design-plans/input-tag-contract.md): InputTag (390:744,
// Layout × Size × State × Value, 72 variants), InputTagChip (388:235, Size × State ×
// Variant, 40) and InputTagOption (390:793, Type × State, 8).
// InputTag, inline: the ROOT is the box (Surface/input, Border/control, Radius/action,
// a min-height 32 · 40 · 48, padding gap-control × gap-tight, gap gap-tight) and the
// stroke is laid out (content starts at padding + stroke); the chips, the <input> (`text`)
// and the Spinner wrap inside it. Outside: the root stacks `field` (the box, fixed 32 ·
// 40 · 48 tall, padding inset-control, stroke laid out) over `tags` (the chips, only
// with a value). The state paints the box: root inline, `field` outside. Invalid and
// Focused draw a 2px halo fully OUTSIDE the 1px edge (`halo`); Loading swaps the
// placeholder for a 16px Spinner and the chips go Disabled.
export const INPUT_TAG_LAYOUTS = ['inline', 'outside'] as const
export const INPUT_TAG_SIZES = ['sm', 'default', 'lg'] as const
export const INPUT_TAG_STATES = ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled', 'Loading'] as const
export const INPUT_TAG_VALUES = ['placeholder', 'filled'] as const
/** Box height per Size (32 · 40 · 48, unbound in the file; Size/control-sm · md · lg). */
const TAG_BOX: Record<string, string> = { sm: 'size.compact', default: 'size.control', lg: 'size.touch' }

function inputTagPaint(layout: string, state: string): SlotMap {
  const box = layout === 'outside' ? 'field' : 'root'
  const disabled = state === 'Disabled'
  const out: SlotMap = {
    text: { text: c('content.primary') },
    placeholder: { text: c(disabled ? 'content.disabled' : 'content.subtle') },
  }
  if (disabled) out[box] = { fill: c('action.disabled.default'), stroke: c('border.control'), halo: NONE }
  else if (state === 'Invalid') out[box] = { fill: c('surface.input'), stroke: c('status.critical.border-strong'), halo: c('status.critical.border') }
  else if (state === 'Focused') out[box] = { fill: c('surface.input'), stroke: c('border.focus'), halo: c('border.ring.default') }
  else if (state === 'Hover') out[box] = { fill: c('surface.input'), stroke: c('border.control-hover') }
  else out[box] = { fill: c('surface.input'), stroke: c('border.control') }
  return out
}

export const INPUT_TAG: ComponentRecipe = {
  key: 'InputTag',
  slots: ['root', 'field', 'tags', 'text', 'placeholder', 'spinner'],
  pseudoSlots: { placeholder: { of: 'text', pseudo: '::placeholder' } },
  defaults: { Layout: 'inline', Size: 'default', State: 'Default', Value: 'placeholder' },
  parts: [
    part({}, () => ({
      text: { font: 'type.placeholder' },
      spinner: { width: 'icon.small', height: 'icon.small' },
    })),
    part({ Layout: INPUT_TAG_LAYOUTS, Size: INPUT_TAG_SIZES }, (layout, size): SlotMap => (layout === 'inline'
      ? {
        root: {
          radius: 'radius.action', strokeWidth: 'stroke.control', minHeight: TAG_BOX[size],
          paddingX: 'spacing.gap-control+stroke.control', paddingY: 'spacing.gap-tight+stroke.control',
          gap: 'spacing.gap-tight', rowGap: 'spacing.gap-tight',
        },
      }
      : {
        root: { gap: 'spacing.gap-control' },
        field: {
          radius: 'radius.action', strokeWidth: 'stroke.control', height: TAG_BOX[size],
          paddingX: 'spacing.inset-control+stroke.control', gap: 'spacing.gap-control',
        },
        tags: { gap: 'spacing.gap-tight', rowGap: 'spacing.gap-tight' },
      })),
    part({ Layout: INPUT_TAG_LAYOUTS, State: INPUT_TAG_STATES }, (layout, state) => inputTagPaint(layout, state)),
  ],
}

// InputTagChip: a removable tag. Fixed height per Size (18 · 20 · 24 · 28 · 32), Radius/control,
// the label and the ✕ (an `icon/close` instance) gap apart. Default carries no stroke;
// Focused and critical draw a 1px edge that the file lays out (a Focused chip grows 2px).
export const INPUT_TAG_CHIP_SIZES = ['xs', 'sm', 'default', 'lg', 'xl'] as const
export const INPUT_TAG_CHIP_STATES = ['Default', 'Hover', 'Focused', 'Disabled'] as const
export const INPUT_TAG_CHIP_VARIANTS = ['default', 'critical'] as const
/** Per Size: height · padding X · gap · ✕ · label type (unbound numbers as sums of steps). */
const CHIP_GEOMETRY: Record<string, { h: string; padX: string; gap: string; icon: string; font: string }> = {
  xs: { h: 'spacing.4+spacing.0_5', padX: 'spacing.1_5', gap: 'spacing.gap-tight', icon: 'spacing.2_5', font: 'type.caption' },
  sm: { h: 'spacing.5', padX: 'spacing.gap-control', gap: 'spacing.gap-tight', icon: 'spacing.3', font: 'type.label' },
  default: { h: 'size.hit', padX: 'spacing.gap-control', gap: 'spacing.1_5', icon: 'spacing.3+spacing.0_5', font: 'type.label' },
  lg: { h: 'spacing.6+spacing.1', padX: 'spacing.2_5', gap: 'spacing.1_5', icon: 'icon.small', font: 'type.body-md' },
  xl: { h: 'size.compact', padX: 'spacing.inset-control', gap: 'spacing.gap-control', icon: 'spacing.4+spacing.0_5', font: 'type.body-lg' },
}

function chipPaint(size: string, variant: string, state: string): SlotMap {
  const g = CHIP_GEOMETRY[size]
  const critical = variant === 'critical'
  const disabled = state === 'Disabled'
  const ink = disabled ? c('content.disabled') : c(critical ? 'status.critical.content' : 'content.primary')
  const edge = !disabled && (critical || state === 'Focused')
  const root: SlotProps = {
    height: g.h, radius: 'radius.control', gap: g.gap, font: g.font, text: ink,
    // The stroke is laid out in the file: the content starts at padding + stroke.
    paddingX: edge ? `${g.padX}+stroke.control` : g.padX,
    strokeWidth: edge ? 'stroke.control' : 'stroke.none',
  }
  if (disabled) root.fill = c('action.disabled.default')
  else if (critical) {
    root.fill = c(state === 'Hover' ? 'status.critical.surface-pressed' : 'status.critical.surface')
    root.stroke = c(state === 'Focused' ? 'status.critical.border-strong' : 'status.critical.border')
    root.halo = state === 'Focused' ? c('status.critical.border') : NONE
  } else {
    root.fill = c(state === 'Hover' ? 'surface.muted-hover' : 'surface.muted')
    if (state === 'Focused') { root.stroke = c('border.focus'); root.halo = c('border.ring.default') }
  }
  return { root, label: { text: ink }, remove: { text: ink, width: g.icon, height: g.icon } }
}

export const INPUT_TAG_CHIP: ComponentRecipe = {
  key: 'InputTagChip',
  slots: ['root', 'label', 'remove'],
  defaults: { Size: 'default', State: 'Default', Variant: 'default' },
  parts: [
    part({ Size: INPUT_TAG_CHIP_SIZES, Variant: INPUT_TAG_CHIP_VARIANTS, State: INPUT_TAG_CHIP_STATES }, (size, variant, state) => chipPaint(size, variant, state)),
  ],
}

// InputTagOption: a suggestion row of the dropdown (Type option · create). One size: 32 tall
// (Size/control-sm), padding and gap gap-control, Radius/control, Type/body-md. At rest it
// wears the FIELD's fill and edge (Surface/input + Border/control); Hover drops the edge,
// Focused takes Border/focus with the 2px halo. The option's `badge` is an 8px dot
// (Status/success/content), `meta` a Type/caption count, `icon` the 14px plus of create.
export const INPUT_TAG_OPTION_TYPES = ['option', 'create'] as const
export const INPUT_TAG_OPTION_STATES = ['Default', 'Hover', 'Focused', 'Disabled'] as const

function optionPaint(state: string): SlotMap {
  if (state === 'Disabled') {
    const ink = { text: c('content.disabled') }
    return {
      root: { fill: c('action.disabled.default'), stroke: c('border.control'), strokeWidth: 'stroke.control', halo: NONE, text: c('content.disabled') },
      label: ink, meta: ink, icon: ink, badge: { fill: c('content.disabled') },
    }
  }
  const ink = c('content.primary')
  const rest = { label: { text: ink }, meta: { text: c('content.subtle') }, icon: { text: ink }, badge: { fill: c('status.success.content') } }
  if (state === 'Hover') return { ...rest, root: { fill: c('surface.muted-hover'), strokeWidth: 'stroke.none', halo: NONE, text: ink } }
  if (state === 'Focused') return { ...rest, root: { fill: c('surface.muted-hover'), stroke: c('border.focus'), strokeWidth: 'stroke.control', halo: c('border.ring.default'), text: ink } }
  return { ...rest, root: { fill: c('surface.input'), stroke: c('border.control'), strokeWidth: 'stroke.control', halo: NONE, text: ink } }
}

export const INPUT_TAG_OPTION: ComponentRecipe = {
  key: 'InputTagOption',
  slots: ['root', 'badge', 'icon', 'label', 'meta'],
  defaults: { Type: 'option', State: 'Default' },
  parts: [
    part({}, () => ({
      root: {
        height: 'size.compact', radius: 'radius.control', paddingX: 'spacing.gap-control', gap: 'spacing.gap-control', font: 'type.body-md',
      },
      badge: { width: 'spacing.2', height: 'spacing.2', radius: 'radius.pill' },
      icon: { width: 'spacing.3+spacing.0_5', height: 'spacing.3+spacing.0_5' },
      meta: { font: 'type.caption' },
    })),
    part({ State: INPUT_TAG_OPTION_STATES }, (state) => optionPaint(state)),
  ],
}

// ── Select ─────────────────────────────────────────────────────────────────

// shadcn's trigger sizes: default (control 40) · sm (compact 32).
const SELECT_GEOMETRY: Record<string, string> = { default: 'size.control', sm: 'size.compact' }
const MENU_ITEM: SlotMap = {
  item: { text: c('content.primary'), font: 'type.body-sm', radius: PANEL_ROW_RADIUS, paddingX: 'spacing.2_5', paddingY: 'spacing.1_5', gap: 'spacing.2' },
  'item[data-highlighted]': { fill: c('action.ghost.hover') },
  'item[data-state="checked"]': { fill: c('surface.selected'), text: c('content.accent') },
  'item[data-disabled]': { text: c('content.disabled') },
}
// The list panel is a box (`radius.container`) with a `spacing.1` inset: its
// rows take its radius minus that inset (the menus' rule, `navigation.ts`).
const MENU_CONTENT: SlotProps = {
  fill: c('surface.layer-2'), stroke: c('border.subtle'), strokeWidth: 'stroke.control',
  radius: PANEL_RADIUS, shadow: 'shadow.lg', paddingX: 'spacing.1', paddingY: 'spacing.1',
}

export const SELECT: ComponentRecipe = {
  key: 'Select',
  slots: ['root', 'icon', 'content', 'item'],
  // Radix portals the list: it is a sibling of the trigger, not inside it.
  detachedSlots: ['content', 'item'],
  defaults: { Size: 'default', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { ...FIELD_FIXED, font: 'type.placeholder', text: c('content.primary') },
      'root[data-placeholder]': { text: c('content.subtle') },
      icon: { text: c('content.secondary') },
      content: MENU_CONTENT,
      ...MENU_ITEM,
    })),
    part({ Size: ['default', 'sm'] as const }, (size) => ({ root: { height: SELECT_GEOMETRY[size] } })),
    part({ State: ['Default', 'Hover', 'Focused', 'Error', 'Disabled'] as const }, (state) => ({
      root: { ...fieldBox(state), ...(state === 'Disabled' ? { text: c('content.disabled') } : {}) },
      icon: { text: c(state === 'Disabled' ? 'content.disabled' : 'content.secondary') },
    })),
  ],
}

// ── Combobox ───────────────────────────────────────────────────────────────

export const COMBOBOX: ComponentRecipe = {
  key: 'Combobox',
  slots: ['root', 'input', 'icon', 'content', 'item'],
  pseudoSlots: {},
  defaults: { State: 'Default' },
  parts: [
    part({}, () => ({
      root: { ...FIELD_FIXED, height: 'size.control', paddingX: 'spacing.inset-control' },
      // shadcn's ComboboxInput is an InputGroup: the field box takes the
      // control's live states (hover, focus, invalid, disabled).
      [`root:hover:not(:focus-within)${GROUP_LIVE}`]: fieldBox('Hover'),
      'root:focus-within': FIELD_FOCUS,
      'root:has([aria-invalid="true"])': fieldBox('Error'),
      'root:has(:disabled)': fieldBox('Disabled'),
      input: { text: c('content.primary'), font: 'type.placeholder' },
      'input::placeholder': { text: c('content.subtle') },
      'input:disabled': { text: c('content.disabled') },
      icon: { text: c('content.secondary') },
      content: { ...MENU_CONTENT },
      ...MENU_ITEM,
    })),
    part({ State: ['Default', 'Focused', 'Open'] as const }, (state) => ({ root: fieldBox(state) })),
  ],
}

// ── InputOTP · InputOTPSlot ───────────────────────────────────────────────
// The Figma `InputOTP` page (design-plans/input-otp-contract.md): InputOTP (416:994,
// Size × Length × State × Variant, 135 variants) is a row of InputOTPSlot instances
// (416:108, Size × State × Variant, 54 variants) gap-control apart, with an 8×2
// separator (Content/subtle; Content/disabled when Disabled) between the halves of a
// 6- or 8-digit code. A slot is a fixed box (control-sm × control-md · md × lg · lg ×
// xl) holding the digit (Type/body-md · lg · xl) or, Typing, a 1px caret. outline:
// Surface/input + Border/control; filled: Surface/muted + Border/subtle; underline:
// Surface/page, a bottom edge only, square. Typing / Focused: a 2px Border/focus edge
// (bottom only on underline) + a 2px Border/ring/default halo OUTSIDE. Invalid:
// Status/critical/border-strong, no halo. Disabled: Content/disabled digit;
// outline and underline turn Surface/muted.
export const INPUT_OTP_SIZES = ['sm', 'default', 'lg'] as const
export const INPUT_OTP_VARIANTS = ['outline', 'filled', 'underline'] as const
export const INPUT_OTP_STATES = ['Empty', 'Typing', 'Filled', 'Invalid', 'Disabled'] as const
export const INPUT_OTP_SLOT_STATES = ['Default', 'Filled', 'Typing', 'Focused', 'Invalid', 'Disabled'] as const

export const INPUT_OTP: ComponentRecipe = {
  key: 'InputOTP',
  slots: ['root', 'group', 'separator'],
  defaults: { Size: 'default', Length: '4', State: 'Empty', Variant: 'outline' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-control' },
      group: { gap: 'spacing.gap-control' },
      separator: { fill: c('content.subtle'), width: 'spacing.2', height: 'spacing.0_5' },
    })),
    part({ State: INPUT_OTP_STATES }, (state): SlotMap => (state === 'Disabled' ? { separator: { fill: c('content.disabled') } } : {})),
  ],
}

const OTP_SLOT_BOX: Record<string, [string, string]> = {
  sm: ['size.compact', 'size.control'], default: ['size.control', 'size.touch'], lg: ['size.touch', 'size.fab'],
}
const OTP_SLOT_FONT: Record<string, string> = { sm: 'type.body-md', default: 'type.body-lg', lg: 'type.text-xl' }
/** The Typing caret: 1px (Stroke/control) × 18 · 20 · 22 (unbound in the file). */
const OTP_CARET: Record<string, string> = { sm: 'spacing.4+spacing.0_5', default: 'spacing.5', lg: 'spacing.5+spacing.0_5' }

function otpSlotRoot(variant: string, state: string): SlotProps {
  const underline = variant === 'underline'
  const rest = variant === 'filled'
    ? { fill: c('surface.muted'), stroke: c('border.subtle') }
    : { fill: c(underline ? 'surface.page' : 'surface.input'), stroke: c('border.control') }
  if (state === 'Disabled') return { ...rest, ...(variant === 'filled' ? {} : { fill: c('surface.muted') }), halo: NONE }
  if (state === 'Invalid') return { ...rest, stroke: c('status.critical.border-strong'), halo: NONE }
  if (state === 'Typing' || state === 'Focused') {
    return underline
      ? { ...rest, stroke: c('border.focus'), strokeBottomWidth: 'stroke.focus', halo: c('border.ring.default') }
      : { ...rest, stroke: c('border.focus'), strokeWidth: 'stroke.focus', halo: c('border.ring.default') }
  }
  return { ...rest, halo: NONE }
}

export const INPUT_OTP_SLOT: ComponentRecipe = {
  key: 'InputOTPSlot',
  slots: ['root', 'digit', 'caret'],
  defaults: { Size: 'default', State: 'Default', Variant: 'outline' },
  parts: [
    part({}, () => ({
      digit: { text: c('content.primary') },
      caret: { fill: c('content.primary'), width: 'stroke.control' },
    })),
    part({ Size: INPUT_OTP_SIZES }, (size) => {
      const [w, h] = OTP_SLOT_BOX[size]
      return { root: { width: w, height: h }, digit: { font: OTP_SLOT_FONT[size] }, caret: { height: OTP_CARET[size] } }
    }),
    part({ Variant: INPUT_OTP_VARIANTS }, (variant) => (variant === 'underline'
      ? { root: { radius: 'radius.none', strokeWidth: 'stroke.none', strokeBottomWidth: 'stroke.control' } }
      : { root: { radius: 'radius.action', strokeWidth: 'stroke.control' } })),
    part({ Variant: INPUT_OTP_VARIANTS, State: INPUT_OTP_SLOT_STATES }, (variant, state): SlotMap => ({
      root: otpSlotRoot(variant, state),
      ...(state === 'Disabled' ? { digit: { text: c('content.disabled') } } : {}),
    })),
  ],
}

// ── Checkbox ───────────────────────────────────────────────────────────────
// shadcn's Checkbox: the box alone (label it with Label / a horizontal Field).
// Checked is shadcn's `data-checked`: bg-primary + primary-foreground check.

function checkPaint(checked: string, state: string): SlotMap {
  const on = checked === 'True'
  const disabled = state === 'Disabled'
  const hover = state === 'Hover'
  const focus = state === 'Focused' ? c('border.focus') : NONE
  const ring = state === 'Focused' ? c('border.ring.default') : NONE
  let root: SlotProps
  if (disabled) root = { fill: c('action.disabled.default'), stroke: c('action.disabled.default'), focus, ring }
  else if (on) {
    const fill = c(hover ? 'action.primary.hover' : 'action.primary.default')
    root = { fill, stroke: fill, focus, ring }
  } else root = { fill: c('surface.input'), stroke: c(hover ? 'border.control-hover' : 'border.control'), focus, ring }
  return { root, indicator: { text: c(disabled ? 'content.disabled' : 'content.on-action') } }
}

export const CHECKBOX: ComponentRecipe = {
  key: 'Checkbox',
  slots: ['root', 'indicator'],
  defaults: { Checked: 'True', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.control', strokeWidth: 'stroke.control', height: 'selector.control', width: 'selector.control', hit: 'size.hit' },
    })),
    part({ Checked: ['True', 'False'] as const, State: ['Default', 'Hover', 'Focused', 'Disabled'] as const }, checkPaint),
  ],
}

// ── RadioGroup ─────────────────────────────────────────────────────────────
// shadcn's RadioGroup: a grid of items; a checked item is bg-primary with a
// primary-foreground dot (Radix's `data-state="checked"`).

export const RADIO_GROUP: ComponentRecipe = {
  key: 'RadioGroup',
  slots: ['root', 'item', 'indicator'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.3' },
      item: {
        fill: c('surface.input'), stroke: c('border.control'), strokeWidth: 'stroke.control',
        radius: 'radius.pill', height: 'selector.control', width: 'selector.control', hit: 'size.hit',
      },
      'item:hover': { stroke: c('border.control-hover') },
      'item:focus-visible': FOCUS,
      'item[data-state="checked"]': { fill: c('action.primary.default'), stroke: c('action.primary.default') },
      'item:disabled': { fill: c('action.disabled.default'), stroke: c('action.disabled.default') },
      indicator: { fill: c('content.on-action'), radius: 'radius.pill', height: 'spacing.2', width: 'spacing.2' },
    })),
  ],
}

// ── Switch ─────────────────────────────────────────────────────────────────
// shadcn's Switch, `size` default | sm: primary track when checked, the input
// colour when not.

const SWITCH_GEOMETRY: Record<string, { knob: string; trackH: string; trackW: string; travel: string }> = {
  // Track = knob + 2px inset each side; the knob travels width − knob − inset.
  default: { knob: 'selector.control', trackH: 'selector.control+spacing.1', trackW: 'selector.control+spacing.5', travel: 'spacing.4' },
  sm: { knob: 'selector.compact', trackH: 'selector.compact+spacing.1', trackW: 'selector.compact+spacing.4', travel: 'spacing.3' },
}

function switchPaint(checked: string, state: string): SlotMap {
  const on = checked === 'True'
  const disabled = state === 'Disabled'
  const hover = state === 'Hover'
  const focus = state === 'Focused' ? c('border.focus') : NONE
  const ring = state === 'Focused' ? c('border.ring.default') : NONE
  const track = disabled ? 'action.disabled.default'
    : on ? (hover ? 'action.primary.hover' : 'action.primary.default')
    : (hover ? 'surface.muted-hover' : 'surface.muted')
  return {
    root: { fill: c(track), focus, ring },
    thumb: { fill: c(on && !disabled ? 'content.on-action' : 'surface.input') },
  }
}

export const SWITCH: ComponentRecipe = {
  key: 'Switch',
  slots: ['root', 'thumb'],
  defaults: { Checked: 'True', Size: 'default', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { radius: 'radius.pill', hit: 'size.hit' },
      thumb: { radius: 'radius.pill', shadow: 'shadow.xs' },
    })),
    part({ Size: ['default', 'sm'] as const }, (size) => ({
      root: { height: SWITCH_GEOMETRY[size].trackH, width: SWITCH_GEOMETRY[size].trackW, travel: SWITCH_GEOMETRY[size].travel },
      thumb: { height: SWITCH_GEOMETRY[size].knob, width: SWITCH_GEOMETRY[size].knob },
    })),
    part({ Checked: ['True', 'False'] as const, State: ['Default', 'Hover', 'Focused', 'Disabled'] as const }, switchPaint),
  ],
}

// ── Slider ─────────────────────────────────────────────────────────────────

export const SLIDER: ComponentRecipe = {
  key: 'Slider',
  slots: ['root', 'label', 'value', 'track', 'range', 'thumb'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-control' },
      label: { text: c('content.secondary'), font: 'type.caption' },
      value: { text: c('content.primary'), font: 'type.caption' },
      track: { fill: c('surface.muted'), height: 'spacing.1_5', radius: 'radius.pill' },
      range: { fill: c('action.primary.default'), radius: 'radius.pill' },
      thumb: {
        fill: c('surface.page'), stroke: c('action.primary.default'), strokeWidth: 'stroke.md',
        height: 'selector.control', width: 'selector.control', radius: 'radius.pill', shadow: 'shadow.sm', hit: 'size.hit',
      },
      'thumb:focus-visible': FOCUS,
    })),
  ],
}

// ── Field · Label · PasswordStrength ───────────────────────────────────────
// shadcn's Field: `orientation` vertical | horizontal | responsive, gap-3, a
// muted description, a destructive error. Label: medium text-sm, no variants.

// ── Field ──────────────────────────────────────────────────────────────────
// The Figma `Field` set (design-plans/field-contract.md): a column, gap
// `Spacing/gap-control`; a label row, gap `Spacing/gap-tight`; label and `*` in
// `Type/label`, description and error in `Type/helper`. Disabled turns the label,
// the `*` and the description to `Content/disabled`. Size only sizes the control
// (and the trailing link) — the component passes it on, no paint of its own.
export const FIELD_SIZES = ['default', 'sm', 'lg'] as const
export const FIELD_STATES = ['Default', 'Invalid', 'Disabled'] as const

export const FIELD: ComponentRecipe = {
  key: 'Field',
  slots: ['root', 'labelRow', 'label', 'required', 'description', 'error', 'legend'],
  defaults: { Size: 'default', State: 'Default' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-control' },
      // MIGRATION ONLY: shadcn's horizontal rows (a checkbox beside its label) keep their 12px.
      'root[data-orientation="horizontal"]': { gap: 'spacing.3' },
      labelRow: { gap: 'spacing.gap-tight' },
      label: { text: c('content.primary'), font: 'type.label' },
      required: { text: c('content.secondary'), font: 'type.label' },
      description: { text: c('content.secondary'), font: 'type.helper' },
      error: { text: c('status.critical.content'), font: 'type.helper' },
      legend: { text: c('content.primary'), font: 'type.label' },
    })),
    part({ State: FIELD_STATES }, (state): SlotMap => (state === 'Disabled'
      ? { label: { text: c('content.disabled') }, required: { text: c('content.disabled') }, description: { text: c('content.disabled') } }
      : {})),
  ],
}

export const LABEL: ComponentRecipe = {
  key: 'Label',
  slots: ['root'],
  defaults: {},
  parts: [
    part({}, () => ({ root: { text: c('content.primary'), font: 'type.label' } })),
  ],
}

// ── PasswordStrength · Meter · Rule ────────────────────────────────────────
// The Figma `PasswordStrength` page (design-plans/password-strength-contract.md).
// PasswordStrength (417:679, Size xs · sm · default × Strength 0–5, RulesVisible) is a
// card (Surface/layer-1, Border/subtle, Radius/container, stroke laid out) holding the
// rules checklist, the meter and the level label (Type/label, coloured by strength,
// hidden at 0). PasswordStrengthMeter (417:131) is five pill segments gap-tight apart,
// 4 · 6 · 8 high; Strength n fills the first n (1 critical, 2 warning, 3 warning
// pressed, 4 success pressed, 5 success). PasswordStrengthRule (417:156, Met × Size) is
// a check (Status/success/content) or an empty ring (Border/control) and the label
// (Content/primary met, Content/secondary not), Type/caption · body-sm · body-md.
export const PASSWORD_STRENGTH_SIZES = ['xs', 'sm', 'default'] as const
export const PASSWORD_STRENGTHS = ['0', '1', '2', '3', '4', '5'] as const
const STRENGTH_SEGMENT: Record<string, string> = {
  '1': 'status.critical.surface-solid', '2': 'status.warning.surface-solid', '3': 'status.warning.surface-solid-pressed',
  '4': 'status.success.surface-solid-pressed', '5': 'status.success.surface-solid',
}
const STRENGTH_LEVEL: Record<string, string> = {
  '0': 'status.critical.content', '1': 'status.critical.content', '2': 'status.warning.content', '3': 'status.warning.content',
  '4': 'status.success.content', '5': 'status.success.content',
}

export const PASSWORD_STRENGTH: ComponentRecipe = {
  key: 'PasswordStrength',
  slots: ['root', 'rules', 'level'],
  defaults: { Size: 'default', Strength: '0' },
  parts: [
    part({}, () => ({
      root: { fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: 'radius.container' },
      level: { font: 'type.label' },
    })),
    part({ Size: PASSWORD_STRENGTH_SIZES }, (size) => (size === 'xs'
      ? { root: { paddingX: 'spacing.inset-control+stroke.control', paddingY: 'spacing.inset-control+stroke.control', gap: 'spacing.gap-control' }, rules: { gap: 'spacing.gap-tight' } }
      : { root: { paddingX: 'spacing.inset-surface+stroke.control', paddingY: 'spacing.inset-surface+stroke.control', gap: 'spacing.gap-group' }, rules: { gap: 'spacing.gap-control' } })),
    part({ Strength: PASSWORD_STRENGTHS }, (strength) => ({ level: { text: c(STRENGTH_LEVEL[strength]) } })),
  ],
}

const METER_HEIGHT: Record<string, string> = { xs: 'spacing.1', sm: 'spacing.1_5', default: 'spacing.2' }

export const PASSWORD_STRENGTH_METER: ComponentRecipe = {
  key: 'PasswordStrengthMeter',
  slots: ['root', 'segment'],
  defaults: { Size: 'default', Strength: '0' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-tight' },
      segment: { fill: c('surface.muted'), radius: 'radius.pill' },
    })),
    part({ Size: PASSWORD_STRENGTH_SIZES }, (size) => ({ segment: { height: METER_HEIGHT[size] } })),
    part({ Strength: PASSWORD_STRENGTHS }, (strength): SlotMap => (strength === '0' ? {} : { 'segment[data-on="true"]': { fill: c(STRENGTH_SEGMENT[strength]) } })),
  ],
}

const RULE_ICON: Record<string, string> = { xs: 'spacing.3', sm: 'spacing.3+spacing.0_5', default: 'spacing.4' }
const RULE_MARKER: Record<string, string> = { xs: 'spacing.2', sm: 'spacing.2_5', default: 'spacing.3' }
const RULE_FONT: Record<string, string> = { xs: 'type.caption', sm: 'type.body-sm', default: 'type.body-md' }

export const PASSWORD_STRENGTH_RULE: ComponentRecipe = {
  key: 'PasswordStrengthRule',
  slots: ['root', 'icon', 'marker', 'label'],
  defaults: { Met: 'true', Size: 'default' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-tight' },
      icon: { text: c('status.success.content') },
      marker: { stroke: c('border.control'), strokeWidth: 'stroke.control', radius: 'radius.pill' },
    })),
    part({ Size: PASSWORD_STRENGTH_SIZES }, (size) => ({
      icon: { width: RULE_ICON[size], height: RULE_ICON[size] },
      marker: { width: RULE_MARKER[size], height: RULE_MARKER[size] },
      label: { font: RULE_FONT[size] },
    })),
    part({ Met: ['true', 'false'] as const }, (met) => ({ label: { text: c(met === 'true' ? 'content.primary' : 'content.secondary') } })),
  ],
}

// ── FileUpload · Dropzone ──────────────────────────────────────────────────

export const FILE_UPLOAD: ComponentRecipe = {
  key: 'FileUpload',
  slots: ['root', 'file', 'badge', 'name', 'meta', 'track', 'progress'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.2_5' },
      file: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control',
        radius: 'radius.action', paddingX: 'spacing.inset-control', paddingY: 'spacing.2_5', gap: 'spacing.2_5',
      },
      badge: { fill: c('surface.selected'), text: c('content.accent'), font: 'type.caption', radius: 'radius.control', paddingX: 'spacing.1_5' },
      name: { text: c('content.primary'), font: 'type.caption' },
      meta: { text: c('content.secondary'), font: 'type.caption' },
      track: { fill: c('surface.muted'), height: 'spacing.1_5', radius: 'radius.pill' },
      progress: { fill: c('action.primary.default'), radius: 'radius.pill' },
    })),
  ],
}

export const DROPZONE: ComponentRecipe = {
  key: 'Dropzone',
  slots: ['root', 'icon', 'title', 'link', 'hint'],
  defaults: { State: 'Default' },
  parts: [
    part({}, () => ({
      root: {
        strokeWidth: 'stroke.control', radius: 'radius.container',
        paddingX: 'spacing.5', paddingY: 'spacing.8', gap: 'spacing.gap-control',
      },
      icon: { height: 'size.control', width: 'size.control', radius: 'radius.pill' },
      title: { text: c('content.primary'), font: 'type.body-sm' },
      link: { font: 'type.label' },
      hint: { font: 'type.helper' },
    })),
    part({ State: ['Default', 'Dragging', 'Error'] as const }, (state) => {
      const error = state === 'Error'
      return {
        root: {
          fill: state === 'Dragging' ? c('surface.accent') : error ? c('status.critical.surface') : NONE,
          stroke: c(error ? 'status.critical.border-strong' : state === 'Dragging' ? 'border.accent' : 'border.control'),
        },
        icon: { fill: c(error ? 'status.critical.surface' : 'surface.selected'), text: c(error ? 'status.critical.content' : 'content.accent') },
        link: { text: c('content.link.default') },
        hint: { text: c(error ? 'status.critical.content' : 'content.secondary') },
      }
    }),
  ],
}

// ── NativeSelect ───────────────────────────────────────────────────────────
// shadcn's NativeSelect: a real <select> drawn as the field box, `size` default
// | sm (the Select heights). The wrapper is the root, so the State axis reads
// off it like every other field.

const NATIVE_SELECT_STATES = ['Default', 'Hover', 'Focused', 'Disabled'] as const

export const NATIVE_SELECT: ComponentRecipe = {
  key: 'NativeSelect',
  slots: ['root', 'select', 'icon'],
  defaults: { Size: 'default', State: 'Default' },
  parts: [
    part({}, () => ({
      select: { ...FIELD_FIXED, font: 'type.placeholder' },
    })),
    part({ Size: ['default', 'sm'] as const }, (size) => ({ select: { height: SELECT_GEOMETRY[size] } })),
    part({ State: NATIVE_SELECT_STATES }, (state) => {
      const disabled = state === 'Disabled'
      return {
        select: { ...fieldBox(state), text: c(disabled ? 'content.disabled' : 'content.primary') },
        icon: { text: c(disabled ? 'content.disabled' : 'content.secondary') },
      }
    }),
  ],
}

// ── Calendar ───────────────────────────────────────────────────────────────
// The Figma `Calendar` set (design-plans/calendar-contract.md, 424:4667, 18 variants: Size default ·
// sm × Mode single · multiple · range × Header single · multiple · plain, + PresetsVisible and
// FooterVisible). A Surface/layer-1 card, a Stroke/divider edge in Border/default on every side,
// Radius/container, clipping its content. Beside the optional presets rail, a column: the body
// (padding 16 · 12, bound to Dimension primitives, 8 between header and month) and the optional
// footer. Header, month, presets and footer paint themselves (their own recipes).
export const CALENDAR_SIZES = ['default', 'sm'] as const

export const CALENDAR: ComponentRecipe = {
  key: 'Calendar',
  slots: ['root', 'column', 'body'],
  defaults: { Size: 'default', Mode: 'single', Header: 'single' },
  parts: [
    part({}, () => ({
      root: { fill: c('surface.layer-1'), stroke: c('border.default'), strokeWidth: 'stroke.divider', radius: 'radius.container' },
      body: { gap: 'spacing.2' },
    })),
    part({ Size: CALENDAR_SIZES }, (size) => {
      const inset = size === 'sm' ? 'spacing.3' : 'spacing.4'
      return { body: { paddingX: inset, paddingY: inset } }
    }),
  ],
}
