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

// ── InputTag ───────────────────────────────────────────────────────────────

export const INPUT_TAG: ComponentRecipe = {
  key: 'InputTag',
  slots: ['root', 'tag', 'tagRemove', 'input'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.input'), stroke: c('border.control'), strokeWidth: 'stroke.control',
        radius: 'radius.action', minHeight: 'size.control', paddingX: 'spacing.2_5', paddingY: 'spacing.1_5',
        gap: 'spacing.1_5',
      },
      'root:focus-within': FIELD_FOCUS,
      tag: {
        fill: c('surface.selected'), text: c('content.accent'), radius: 'radius.pill', font: 'type.label',
        paddingX: 'spacing.2', gap: 'spacing.1',
      },
      tagRemove: { text: c('content.accent') },
      'tagRemove:hover': { text: c('content.link.hover') },
      input: { text: c('content.primary'), font: 'type.placeholder' },
    })),
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

// ── InputOTP ───────────────────────────────────────────────────────────────
// shadcn's InputOTP (`input-otp`): a group of slots, the active one ringed.
// No sizes. State is Figma's axis; Error is `aria-invalid` on the wrapper.

export const INPUT_OTP: ComponentRecipe = {
  key: 'InputOTP',
  slots: ['root', 'group', 'slot'],
  defaults: { State: 'Default' },
  parts: [
    part({}, () => ({
      group: { gap: 'spacing.gap-control' },
      slot: {
        fill: c('surface.input'), stroke: c('border.control'), strokeWidth: 'stroke.control',
        radius: 'radius.action', text: c('content.primary'), font: 'type.button',
        height: 'size.control', width: 'size.control',
      },
      'slot[data-active="true"]': FIELD_FOCUS,
    })),
    part({ State: ['Default', 'Filled', 'Error'] as const }, (state) => ({
      slot: state === 'Error' ? { stroke: c('status.critical.border-strong') } : {},
      'slot[data-active="true"]': state === 'Error' ? { stroke: c('status.critical.border-strong'), ring: NONE } : FIELD_FOCUS,
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

const STRENGTH_FILL: Record<string, string> = {
  weak: 'status.critical.surface-solid',
  fair: 'status.warning.surface-solid',
  strong: 'status.success.surface-solid',
}

export const PASSWORD_STRENGTH: ComponentRecipe = {
  key: 'PasswordStrength',
  slots: ['root', 'meter', 'segment', 'segmentOn', 'caption'],
  defaults: { Strength: 'fair' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-control' },
      meter: { gap: 'spacing.gap-tight' },
      segment: { fill: c('surface.muted'), height: 'spacing.1', radius: 'radius.pill' },
      segmentOn: { height: 'spacing.1', radius: 'radius.pill' },
      caption: { text: c('content.secondary'), font: 'type.helper' },
    })),
    part({ Strength: ['weak', 'fair', 'strong'] as const }, (strength) => ({
      segmentOn: { fill: c(STRENGTH_FILL[strength]) },
    })),
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
// shadcn's Calendar (react-day-picker): caption, weekdays and ghost day cells;
// a single or range end day takes the primary action, the range middle and
// today the muted surface, outside days the subtle ink. Nav arrows are ghost
// icon Buttons (their own recipe).

export const CALENDAR: ComponentRecipe = {
  key: 'Calendar',
  slots: ['root', 'caption', 'weekday', 'day'],
  defaults: { Mode: 'single' },
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', radius: 'radius.container',
        paddingX: 'spacing.3', paddingY: 'spacing.3', text: c('content.primary'),
      },
      caption: { text: c('content.primary'), font: 'type.label' },
      weekday: { text: c('content.secondary'), font: 'type.caption' },
      day: { text: c('content.primary'), font: 'type.body-sm', radius: 'radius.action', height: 'size.compact', width: 'size.compact' },
      'day:hover': { fill: c('action.ghost.hover') },
      'day[data-today="true"]': { fill: c('surface.layer-2') },
      'day[data-outside="true"]': { text: c('content.subtle') },
      'day[data-range-middle="true"]': { fill: c('surface.layer-2'), text: c('content.primary') },
      'day[data-selected-single="true"]': { fill: c('action.primary.default'), text: c('content.on-action') },
      'day[data-range-start="true"]': { fill: c('action.primary.default'), text: c('content.on-action') },
      'day[data-range-end="true"]': { fill: c('action.primary.default'), text: c('content.on-action') },
    })),
  ],
}
