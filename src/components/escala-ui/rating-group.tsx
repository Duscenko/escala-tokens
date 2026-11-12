// Escala component: RatingGroup + RatingGroupItem — the Figma sets of the same names
// (design-plans/rating-group-contract.md, design-plans/rating-group-item-contract.md), 1:1. A
// single-choice scale of 5 items (role="radiogroup", each item role="radio" with aria-checked and
// a label such as "4 of 5 stars"): Type star for scores, emoji for sentiment; Size cascades to
// every item. One tab stop; the arrow keys move and select. Appearance: recipes (RatingGroup,
// RatingGroupItem).
import * as React from 'react'
import { cn } from '../../lib/utils'

export const RATING_GROUP_SIZES = ['default', 'sm', 'lg'] as const
export type RatingGroupSize = (typeof RATING_GROUP_SIZES)[number]
export const RATING_GROUP_TYPES = ['star', 'emoji'] as const
export type RatingGroupType = (typeof RATING_GROUP_TYPES)[number]
export const RATING_GROUP_ITEM_STATES = ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] as const
export type RatingGroupItemState = (typeof RATING_GROUP_ITEM_STATES)[number]

// Phosphor glyphs (regular; the star also in fill, the checked star's `Style=Filled`).
const GLYPH = {
  star: 'M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z',
  starFill: 'M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z',
  smiley: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM80,108a12,12,0,1,1,12,12A12,12,0,0,1,80,108Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,176,108Zm-1.07,48c-10.29,17.79-27.4,28-46.93,28s-36.63-10.2-46.92-28a8,8,0,1,1,13.84-8c7.47,12.91,19.21,20,33.08,20s25.61-7.1,33.07-20a8,8,0,0,1,13.86,8Z',
  sad: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM80,108a12,12,0,1,1,12,12A12,12,0,0,1,80,108Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,176,108Zm-1.08,64a8,8,0,1,1-13.84,8c-7.47-12.91-19.21-20-33.08-20s-25.61,7.1-33.08,20a8,8,0,1,1-13.84-8c10.29-17.79,27.39-28,46.92-28S164.63,154.2,174.92,172Z',
  nervous: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM80,108a12,12,0,1,1,12,12A12,12,0,0,1,80,108Zm72,0a12,12,0,1,1,12,12A12,12,0,0,1,152,108Zm32,60a8,8,0,0,1-8,8c-10,0-15.06-6.74-18.4-11.2-3-4-3.92-4.8-5.6-4.8s-2.57.76-5.6,4.8C143.06,169.26,138,176,128,176s-15.06-6.74-18.4-11.2c-3-4-3.92-4.8-5.6-4.8s-2.57.76-5.6,4.8C95.06,169.26,90,176,80,176a8,8,0,0,1,0-16c1.68,0,2.57-.76,5.6-4.8C88.94,150.74,94,144,104,144s15.06,6.74,18.4,11.2c3,4,3.92,4.8,5.6,4.8s2.57-.76,5.6-4.8c3.34-4.46,8.4-11.2,18.4-11.2s15.06,6.74,18.4,11.2c3,4,3.92,4.8,5.6,4.8A8,8,0,0,1,184,168Z',
  meh: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-56a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,160ZM80,108a12,12,0,1,1,12,12A12,12,0,0,1,80,108Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,176,108Z',
  wink: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM80,108a12,12,0,1,1,12,12A12,12,0,0,1,80,108Zm104,0a8,8,0,0,1-8,8H152a8,8,0,0,1,0-16h24A8,8,0,0,1,184,108Zm-9.08,48c-10.29,17.79-27.39,28-46.92,28s-36.63-10.2-46.93-28a8,8,0,1,1,13.86-8c7.46,12.91,19.2,20,33.07,20s25.61-7.1,33.08-20a8,8,0,1,1,13.84,8Z',
}
const glyph = (d: string) => <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false"><path d={d} /></svg>
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
