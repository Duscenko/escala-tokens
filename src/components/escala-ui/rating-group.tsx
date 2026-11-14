// Escala component: RatingGroup + RatingGroupItem — the Figma sets of the same names
// (design-plans/rating-group-contract.md, design-plans/rating-group-item-contract.md), 1:1. A
// single-choice scale of 5 items (role="radiogroup", each item role="radio" with aria-checked and
// a label such as "4 of 5 stars"): Type star for scores, emoji for sentiment; Size cascades to
// every item. One tab stop; the arrow keys move and select. Appearance: recipes (RatingGroup,
// RatingGroupItem).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'

export const RATING_GROUP_SIZES = ['default', 'sm', 'lg'] as const
export type RatingGroupSize = (typeof RATING_GROUP_SIZES)[number]
export const RATING_GROUP_TYPES = ['star', 'emoji'] as const
export type RatingGroupType = (typeof RATING_GROUP_TYPES)[number]
export const RATING_GROUP_ITEM_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] as const
export type RatingGroupItemState = (typeof RATING_GROUP_ITEM_STATES)[number]

// Phosphor glyphs (regular; the star also in fill, the checked star's `Style=Filled`).
const GLYPH = {
  star: 'star',
  starFill: 'star-fill',
  smiley: 'smiley',
  sad: 'smiley-sad',
  nervous: 'smiley-nervous',
  meh: 'smiley-meh',
  wink: 'smiley-wink',
} as const
/** The file's five emoji, sad → wink (the fourth, Smiley, is the checked sample). */
const EMOJI = [GLYPH.sad, GLYPH.nervous, GLYPH.meh, GLYPH.smiley, GLYPH.wink]
const EMOJI_LABELS = ['Very bad', 'Bad', 'Okay', 'Good', 'Great']

const GroupContext = React.createContext<{
  size: RatingGroupSize
  type: RatingGroupType
  value: number
  select: (value: number) => void
} | null>(null)

export interface RatingGroupItemProps extends Omit<React.ComponentProps<'button'>, 'value'> {
  /** The score this item picks inside a RatingGroup (1 – 5). */
  value?: number
  /** Figma Icon (the swap): the glyph. Default: a star (filled when checked) or a smiley. */
  icon?: React.ReactNode
  size?: RatingGroupSize
  /** Figma Type (`kind`: `type` is the button's own attribute). */
  kind?: RatingGroupType
  /** Figma Checked (inside a star group every item up to the value is checked; aria-checked marks the chosen one). */
  checked?: boolean
  /** Pin a State without a pointer (docs playground, Figma parity). */
  forceState?: RatingGroupItemState
}

function RatingGroupItem({
  value, icon, size: sizeProp, kind: kindProp, checked: checkedProp, forceState, disabled, className, onClick, ...props
}: RatingGroupItemProps) {
  const group = React.useContext(GroupContext)
  const size = sizeProp ?? group?.size ?? 'default'
  const kind = kindProp ?? group?.type ?? 'star'
  const chosen = group && value !== undefined ? group.value === value : checkedProp ?? false
  // A star group fills every star up to the value; emoji marks only the chosen one.
  const checked = checkedProp ?? (group && value !== undefined ? (kind === 'star' ? value <= group.value : group.value === value) : false)
  const isDisabled = disabled || forceState === 'Disabled'
  const state = forceState && forceState !== 'Default' ? forceState : undefined
  return (
    <button
      type="button"
      role="radio"
      aria-checked={chosen}
      tabIndex={group ? (chosen || (group.value === 0 && value === 1) ? 0 : -1) : undefined}
      data-slot="rating-group-item"
      data-escala="RatingGroupItem"
      data-size={size}
      data-type={kind}
      data-checked={String(checked)}
      data-force-state={state ?? (isDisabled ? 'Disabled' : undefined)}
      aria-disabled={isDisabled || undefined}
      disabled={disabled}
      onClick={(e) => { onClick?.(e); if (!e.defaultPrevented && !isDisabled && group && value !== undefined) group.select(value) }}
      className={cn('relative inline-flex shrink-0 items-center justify-center border-0 p-0 outline-none select-none aria-disabled:cursor-not-allowed', !isDisabled && 'cursor-pointer', className)}
      {...props}
    >
      <span data-part="RatingGroupItem.icon" className="inline-flex items-center justify-center [&>svg]:size-full">
        {icon ?? glyph(kind === 'star' ? (checked ? GLYPH.starFill : GLYPH.star) : GLYPH.smiley)}
      </span>
    </button>
  )
}

export interface RatingGroupProps extends Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue'> {
  /** Figma Size: items 32 · 24 · 40, icons 20 · 16 · 24. */
  size?: RatingGroupSize
  /** Figma Type: star for scores, emoji for sentiment. */
  type?: RatingGroupType
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** Figma Content slot: RatingGroupItem × 5. Omitted → the file's five (stars, or the five smileys). */
  children?: React.ReactNode
}

function RatingGroup({
  size = 'default', type = 'star', value, defaultValue = 4, onValueChange, children, className, onKeyDown, ...props
}: RatingGroupProps) {
  const [inner, setInner] = React.useState(defaultValue)
  const current = value ?? inner
  const select = React.useCallback((v: number) => { setInner(v); onValueChange?.(v) }, [onValueChange])
  const content = children ?? [1, 2, 3, 4, 5].map((n) => (
    <RatingGroupItem
      key={n}
      value={n}
      icon={type === 'emoji' ? glyph(EMOJI[n - 1]) : undefined}
      aria-label={type === 'star' ? `${n} of 5 stars` : EMOJI_LABELS[n - 1]}
    />
  ))
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
    const radios = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([aria-disabled="true"])'))
    if (!radios.length) return
    const at = radios.findIndex((r) => r === document.activeElement)
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? radios.length - 1
      : (at + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + radios.length) % radios.length
    e.preventDefault()
    radios[next].focus()
    radios[next].click()
  }
  return (
    <GroupContext.Provider value={{ size, type, value: current, select }}>
      <div
        role="radiogroup"
        data-slot="rating-group"
        data-escala="RatingGroup"
        data-size={size}
        data-type={type}
        className={cn('relative inline-flex', className)}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <div data-part="RatingGroup.content" className="flex">{content}</div>
      </div>
    </GroupContext.Provider>
  )
}

export { RatingGroup, RatingGroupItem }
