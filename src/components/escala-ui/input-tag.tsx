// Escala components: InputTag · InputTagChip · InputTagOption — the Figma `InputTag` page
// (design-plans/input-tag-contract.md).
//  · InputTag (390:744): a multi-value text field that turns entries into removable chips.
//    `layout` inline (the chips wrap inside the box) · outside (the box over the chips),
//    `size` sm · default · lg, State Default · Hover · Focused · Invalid · Disabled · Loading
//    (Hover and Focused come from the pointer and keyboard; `aria-invalid`, `disabled` and
//    `loading` pin the others; `forceState` pins one for docs). Value (placeholder · filled)
//    needs no prop: `value` with or without tags — and, as in the file, the <input> keeps its
//    placeholder behind the chips. Enter or "," commits a tag, Backspace on an empty draft
//    takes the last one back. Tags past `max` are drawn critical.
//  · InputTagChip (388:235): one removable tag. `size` xs · sm · default · lg · xl, State
//    Default · Hover · Focused · Disabled, `variant` default · critical.
//  · InputTagOption (390:793): a row of the suggestion list, `type` option · create.
// Paint: the InputTag, InputTagChip and InputTagOption recipes.
import * as React from 'react'
import { cn } from '../../lib/utils'
import { Spinner } from './spinner'

export const INPUT_TAG_LAYOUTS = ['inline', 'outside'] as const
export const INPUT_TAG_SIZES = ['sm', 'default', 'lg'] as const
export const INPUT_TAG_CHIP_SIZES = ['xs', 'sm', 'default', 'lg', 'xl'] as const
export const INPUT_TAG_CHIP_VARIANTS = ['default', 'critical'] as const
export const INPUT_TAG_OPTION_TYPES = ['option', 'create'] as const
export type InputTagLayout = (typeof INPUT_TAG_LAYOUTS)[number]
export type InputTagSize = (typeof INPUT_TAG_SIZES)[number]
export type InputTagChipSize = (typeof INPUT_TAG_CHIP_SIZES)[number]
export type InputTagChipVariant = (typeof INPUT_TAG_CHIP_VARIANTS)[number]
export type InputTagOptionType = (typeof INPUT_TAG_OPTION_TYPES)[number]
export type InputTagState = 'Default' | 'Hover' | 'Focused' | 'Invalid' | 'Disabled' | 'Loading'
export type InputTagChipState = 'Default' | 'Hover' | 'Focused' | 'Disabled'
export type InputTagOptionState = 'Default' | 'Hover' | 'Focused' | 'Disabled'

/** Which chip the file nests per box size: xs in sm, sm in default, default in lg. */
const CHIP_FOR_SIZE: Record<InputTagSize, InputTagChipSize> = { sm: 'xs', default: 'sm', lg: 'default' }

/** Phosphor `x` (regular) — the glyph the file's `icon/close` draws. */
function CloseGlyph() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false" className="size-full">
      <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
    </svg>
  )
}

/** Phosphor `plus` (regular) — the glyph of the create row. */
function PlusGlyph() {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false" className="size-full">
      <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z" />
    </svg>
  )
}

// ── InputTagChip ────────────────────────────────────────────────────────────

export interface InputTagChipProps extends Omit<React.ComponentProps<'span'>, 'onClick'> {
  size?: InputTagChipSize
  variant?: InputTagChipVariant
  /** Pin a state without a pointer (docs, Storybook, Figma parity). */
  forceState?: InputTagChipState
  disabled?: boolean
  /** Figma RemoveVisible: the ✕ (default on). */
  removable?: boolean
  onRemove?: () => void
  /** The ✕'s accessible name; default "Remove" + the label. */
  removeLabel?: string
}

function InputTagChip({
  size = 'default', variant = 'default', forceState, disabled, removable, onRemove, removeLabel, children, className, ...props
}: InputTagChipProps) {
  const isDisabled = !!disabled || forceState === 'Disabled'
  const showRemove = removable ?? true
  const label = typeof children === 'string' ? children : undefined
  return (
    <span
      data-slot="input-tag-chip"
      data-escala="InputTagChip"
      data-size={size}
      data-variant={variant}
      data-force-state={forceState && forceState !== 'Default' ? forceState : isDisabled ? 'Disabled' : undefined}
      aria-disabled={isDisabled || undefined}
      className={cn('inline-flex shrink-0 items-center', className)}
      {...props}
    >
      <span data-part="InputTagChip.label" className="whitespace-nowrap">{children}</span>
      {showRemove ? (
        <button
          type="button"
          data-part="InputTagChip.remove"
          disabled={isDisabled}
          aria-label={removeLabel ?? (label ? `Remove ${label}` : 'Remove')}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed"
          onClick={(e) => { e.stopPropagation(); onRemove?.() }}
        >
          <CloseGlyph />
        </button>
      ) : null}
    </span>
  )
}

// ── InputTagOption ──────────────────────────────────────────────────────────

export interface InputTagOptionProps extends React.ComponentProps<'div'> {
  type?: InputTagOptionType
  /** Pin a state without a pointer (docs, Storybook, Figma parity). */
  forceState?: InputTagOptionState
  disabled?: boolean
  /** Figma BadgeVisible: the green dot of an existing option. */
  badge?: boolean
  /** Figma Meta / MetaVisible: the count at the end of the row. */
  meta?: React.ReactNode
  /** The listbox's `aria-selected`. */
  selected?: boolean
}

function InputTagOption({
  type = 'option', forceState, disabled, badge = true, meta, selected, children, className, ...props
}: InputTagOptionProps) {
  const isDisabled = !!disabled || forceState === 'Disabled'
  return (
    <div
      role="option"
      aria-selected={selected ?? false}
      aria-disabled={isDisabled || undefined}
      data-slot="input-tag-option"
      data-escala="InputTagOption"
      data-type={type}
      data-force-state={forceState && forceState !== 'Default' ? forceState : isDisabled ? 'Disabled' : undefined}
      className={cn('flex w-full shrink-0 cursor-pointer items-center aria-disabled:cursor-not-allowed', className)}
      {...props}
    >
      {type === 'create' ? (
        <span data-part="InputTagOption.icon" aria-hidden className="inline-flex shrink-0"><PlusGlyph /></span>
      ) : badge ? (
        <span data-part="InputTagOption.badge" aria-hidden className="shrink-0" />
      ) : null}
      <span data-part="InputTagOption.label" className="min-w-0 flex-1 truncate">{children}</span>
      {type === 'option' && meta != null ? <span data-part="InputTagOption.meta" className="shrink-0">{meta}</span> : null}
    </div>
  )
}

// ── InputTag ────────────────────────────────────────────────────────────────

export interface InputTagProps extends Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue' | 'placeholder'> {
  layout?: InputTagLayout
  size?: InputTagSize
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  placeholder?: string
  /** Pin a state without a pointer (docs, Storybook, Figma parity). */
  forceState?: InputTagState
  /** State Loading: the Spinner replaces the placeholder and the chips go Disabled. */
  loading?: boolean
  disabled?: boolean
  /** Tags past this many are drawn critical (the file's chip Variant). */
  max?: number
  'aria-invalid'?: boolean | 'true' | 'false'
  /** Field wires these onto the control. */
  name?: string
  /** The width the file leaves to its user (a 360 frame). */
  width?: number | string
}

function InputTag({
  layout = 'inline', size = 'default', value, defaultValue = [], onValueChange, placeholder = 'Add tag…',
  forceState, loading, disabled, max, width, name, id, className, style, onClick, ...props
}: InputTagProps) {
  const {
    'aria-invalid': ariaInvalid, 'aria-describedby': describedBy, 'aria-label': ariaLabel, 'aria-labelledby': labelledBy, ...rest
  } = props as React.ComponentProps<'div'> & { 'aria-invalid'?: boolean | 'true' | 'false' }
  const [inner, setInner] = React.useState(defaultValue)
  const tags = value ?? inner
  const [draft, setDraft] = React.useState('')
  const input = React.useRef<HTMLInputElement>(null)

  const isDisabled = !!disabled || forceState === 'Disabled'
  const isLoading = !!loading || forceState === 'Loading'
  const invalid = forceState === 'Invalid' || ariaInvalid === true || ariaInvalid === 'true'
  // A live disabled, loading or invalid field pins its look (as Input does).
  const pinned = forceState && forceState !== 'Default'
    ? forceState
    : isDisabled ? 'Disabled' : isLoading ? 'Loading' : invalid ? 'Invalid' : undefined
  const inert = isDisabled || isLoading

  const commit = (next: string[]) => { setInner(next); onValueChange?.(next) }
  const add = () => {
    const tag = draft.trim()
    setDraft('')
    if (tag && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) commit([...tags, tag])
  }
  const chipSize = CHIP_FOR_SIZE[size]
  const chips = tags.map((tag, i) => (
    <InputTagChip
      key={tag}
      size={chipSize}
      variant={max != null && i >= max ? 'critical' : 'default'}
      forceState={inert ? 'Disabled' : undefined}
      onRemove={() => commit(tags.filter((x) => x !== tag))}
    >
      {tag}
    </InputTagChip>
  ))
  const spinner = isLoading ? (
    <span data-part="InputTag.spinner" aria-hidden className="relative inline-flex shrink-0">
      <Spinner aria-hidden role={undefined} aria-label={undefined} className="size-full" />
    </span>
  ) : null
  const control = (
    <input
      ref={input}
      id={id}
      name={name}
      data-part="InputTag.text"
      value={draft}
      placeholder={isLoading ? undefined : placeholder}
      disabled={isDisabled}
      readOnly={isLoading || undefined}
      aria-invalid={invalid || undefined}
      aria-busy={isLoading || undefined}
      aria-describedby={describedBy}
      aria-label={ariaLabel ?? (labelledBy ? undefined : 'Add tag')}
      aria-labelledby={labelledBy}
      className={cn('border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed', isLoading && layout === 'inline' ? 'w-0 min-w-0 flex-none' : 'min-w-12 flex-[1_1_3rem]')}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={add}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
        else if (e.key === 'Backspace' && !draft && tags.length) commit(tags.slice(0, -1))
      }}
    />
  )
  const focusInput = (e: React.MouseEvent<HTMLDivElement>) => { onClick?.(e); if (!inert) input.current?.focus() }
  const root = {
    'data-slot': 'input-tag',
    'data-size': size,
    'data-layout': layout,
    'data-force-state': pinned,
    'aria-disabled': isDisabled || undefined,
    className: cn('flex', layout === 'outside' ? 'flex-col' : 'cursor-text flex-wrap items-center', isDisabled && 'cursor-not-allowed', className),
    style: { width, ...style },
  }

  if (layout === 'outside') {
    return (
      <div data-escala="InputTag" {...root} {...rest}>
        <div data-part="InputTag.field" onClick={focusInput} className="flex cursor-text items-center">
          {control}
          {spinner}
        </div>
        {tags.length ? <div data-part="InputTag.tags" className="flex flex-wrap items-center">{chips}</div> : null}
      </div>
    )
  }
  return (
    <div data-escala="InputTag" {...root} {...rest} onClick={focusInput}>
      {chips}
      {control}
      {spinner}
    </div>
  )
}

export { InputTag, InputTagChip, InputTagOption }
