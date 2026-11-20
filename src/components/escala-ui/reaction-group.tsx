// Escala components: ReactionGroup, ReactionGroupTrigger and ReactionGroupPopover — the Figma sets of the same names
// (design-plans/reaction-group-contract.md; 2381:169 · 2381:124 · 2381:130), 1:1. A lightweight acknowledgement under a
// post or comment: a wrapping row of reaction pills, a trigger that opens the picker, and an optional summary line.
// The pills are the existing Chip (outline · pill, Selected when you reacted, label = count); only the trigger and the
// picker are sets of their own. Radix Popover gives the picker its behaviour. Appearance and motion: recipes
// ReactionGroup, ReactionGroupTrigger and ReactionGroupPopover (lib/recipes/actions.ts, lib/recipes/motion.ts).
import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'
import { Chip, type ChipSize } from './chip'
import { IconButton } from './icon-button'
import { usePortalContainer } from './portal-scope'

export const REACTION_GROUP_TRIGGER_SIZES = ['default', 'xs', 'sm', 'lg', 'xl'] as const
export type ReactionGroupTriggerSize = (typeof REACTION_GROUP_TRIGGER_SIZES)[number]
export const REACTION_GROUP_TRIGGER_STATES = ['Default', 'Hover', 'Focused', 'Open', 'Disabled'] as const
export type ReactionGroupTriggerState = (typeof REACTION_GROUP_TRIGGER_STATES)[number]

/** A reaction a person can pick. */
export interface ReactionOption {
  id: string
  /** Its name: the option's accessible name and the word the pill and the summary use. */
  label: string
  icon: React.ReactNode
}
/** A reaction on the post: how many people chose it and whether you are one of them. */
export interface ReactionValue {
  id: string
  count: number
  reacted?: boolean
}
/** What one interaction did. */
export interface ReactionChange {
  id: string
  /** True when you added the reaction, false when you took it back. */
  reacted: boolean
  count: number
}

/** The file's six options, in its order. */
export const REACTION_OPTIONS: ReactionOption[] = [
  { id: 'like', label: 'Like', icon: glyph('thumbs-up') },
  { id: 'love', label: 'Love', icon: glyph('heart') },
  { id: 'celebrate', label: 'Celebrate', icon: glyph('confetti') },
  { id: 'insightful', label: 'Insightful', icon: glyph('lightbulb') },
  { id: 'question', label: 'Question', icon: glyph('question') },
  { id: 'applause', label: 'Applause', icon: glyph('hands-clapping') },
]

// ── ReactionGroupTrigger ────────────────────────────────────────────────────

export interface ReactionGroupTriggerProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  /** Figma Size: 24 · 32 · 40 · 48 · 56, the pill Chip's heights. */
  size?: ReactionGroupTriggerSize
  /** Pin a State without a pointer (docs, Figma parity). */
  forceState?: ReactionGroupTriggerState
  /** The glyph (the file's Smiley). */
  icon?: React.ReactNode
}

/** The add-reaction button: an icon-only pill that opens ReactionGroupPopover. `aria-expanded` is Figma's State=Open. */
function ReactionGroupTrigger({ size = 'default', forceState, icon, disabled, className, 'aria-label': ariaLabel = 'Add reaction', ...props }: ReactionGroupTriggerProps) {
  const expanded = props['aria-expanded'] === true || props['aria-expanded'] === 'true'
  const isDisabled = disabled || forceState === 'Disabled'
  const state = forceState && forceState !== 'Default' ? forceState : expanded ? 'Open' : undefined
  return (
    <button
      type="button"
      aria-haspopup="true"
      aria-expanded={expanded}
      {...props}
      aria-label={ariaLabel}
      data-slot="reaction-group-trigger"
      data-escala="ReactionGroupTrigger"
      data-size={size}
      data-force-state={state}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      className={cn('inline-flex shrink-0 items-center justify-center outline-none select-none', !isDisabled && 'cursor-pointer', className)}
    >
      <span data-part="ReactionGroupTrigger.icon" aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">
        {icon ?? glyph('smiley')}
      </span>
    </button>
  )
}

// ── ReactionGroupPopover ────────────────────────────────────────────────────

/** A token's computed length, in px, where the element lives (Radix takes its offset as a number). */
function useTokenPx(container: HTMLElement | null | undefined, name: string): number {
  const [px, setPx] = React.useState(0)
  React.useEffect(() => {
    const el = container ?? (typeof document === 'undefined' ? null : document.body)
    if (!el) return
    const probe = document.createElement('span')
    probe.style.cssText = `position:absolute;visibility:hidden;width:var(${name})`
    el.appendChild(probe)
    setPx(probe.getBoundingClientRect().width)
    probe.remove()
  }, [container, name])
  return px
}

export interface ReactionGroupPopoverProps extends Omit<React.ComponentProps<typeof PopoverPrimitive.Content>, 'onSelect'> {
  /** The reactions on offer (Figma Content: one ghost IconButton each). */
  options?: ReactionOption[]
  /** Fires with the option a person picks. */
  onSelect?: (id: string) => void
  /** Accessible name of the toolbar. */
  label?: string
  /** Pin one option's Hover without a pointer (docs, the file's "picker open" frame). */
  highlighted?: string
  /** Render in place (no portal, no positioning, no focus steal): docs and previews. */
  inline?: boolean
}

/** The picker: a toolbar of options on an overlay surface. Arrow keys move and wrap, Home and End jump, Escape closes. */
function ReactionGroupPopover({ options = REACTION_OPTIONS, onSelect, label = 'Add reaction', highlighted, inline = false, side = 'top', sideOffset, className, ...props }: ReactionGroupPopoverProps) {
  const container = usePortalContainer()
  // The file's 8px between the trigger and the picker: `Spacing/gap-control`, read where the picker lives.
  const offset = useTokenPx(container, '--spacing-gap-control')
  const [active, setActive] = React.useState(0)
  const row = React.useRef<HTMLDivElement>(null)
  const move = (to: number) => {
    const next = (to + options.length) % options.length
    setActive(next)
    row.current?.querySelectorAll<HTMLElement>('button')[next]?.focus()
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(active + 1) }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(active - 1) }
    else if (e.key === 'Home') { e.preventDefault(); move(0) }
    else if (e.key === 'End') { e.preventDefault(); move(options.length - 1) }
  }
  const toolbar = (
    <div ref={row} data-part="ReactionGroupPopover.content" role="toolbar" aria-label={label} aria-orientation="horizontal" className="flex items-center" onKeyDown={onKeyDown}>
      {options.map((o, i) => (
        <IconButton
          key={o.id}
          variant="secondary"
          appearance="ghost"
          size="sm"
          icon={o.icon}
          aria-label={o.label}
          tabIndex={i === active ? 0 : -1}
          forceState={highlighted === o.id ? 'Hover' : undefined}
          onFocus={() => setActive(i)}
          onClick={() => onSelect?.(o.id)}
        />
      ))}
    </div>
  )
  if (inline) {
    return (
      <div data-slot="reaction-group-popover" data-escala="ReactionGroupPopover" data-inline="" className={cn('inline-flex w-fit', className)} {...(props as React.ComponentProps<'div'>)}>
        {toolbar}
      </div>
    )
  }
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        data-slot="reaction-group-popover"
        data-escala="ReactionGroupPopover"
        side={side}
        sideOffset={sideOffset ?? offset}
        className={cn('z-50 inline-flex w-fit outline-none', className)}
        {...props}
      >
        {toolbar}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

// ── Motion helpers (roles live in the recipe; nothing here names a duration) ──

/** Run `done` when the element's current transition ends, or at once when the system gives it none (reduced motion). */
function afterTransition(el: HTMLElement | null, done: () => void): () => void {
  if (!el) { done(); return () => {} }
  const cs = getComputedStyle(el)
  const longest = (list: string) => Math.max(0, ...list.split(',').map((v) => parseFloat(v) * (v.trim().endsWith('ms') ? 1 : 1000) || 0))
  const total = longest(cs.transitionDuration) + longest(cs.transitionDelay)
  if (total === 0) { done(); return () => {} }
  let fired = false
  const finish = () => { if (fired) return; fired = true; el.removeEventListener('transitionend', onEnd); window.clearTimeout(timer); done() }
  const onEnd = (e: TransitionEvent) => { if (e.target === el) finish() }
  el.addEventListener('transitionend', onEnd)
  // The same time the element computed, as a net under a `transitionend` that never comes (a hidden tab).
  const timer = window.setTimeout(finish, total)
  return () => { fired = true; el.removeEventListener('transitionend', onEnd); window.clearTimeout(timer) }
}

/** One digit of a count. When it changes, the new digit rolls in from the side the count moved to and the old one leaves the other way. */
function RollingDigit({ digit, direction }: { digit: string; direction: number }) {
  const [shown, setShown] = React.useState(digit)
  const [leaving, setLeaving] = React.useState<{ digit: string; out: boolean } | null>(null)
  const [arriving, setArriving] = React.useState(false)
  const dir = React.useRef(direction)
  const exit = React.useRef<HTMLSpanElement>(null)
  if (digit !== shown) {
    // A changed digit: keep the old one to roll out, and start the new one off its mark.
    dir.current = direction
    setLeaving(direction === 0 ? null : { digit: shown, out: false })
    setArriving(direction !== 0)
    setShown(digit)
  }
  React.useEffect(() => {
    if (!arriving) return
    const frame = requestAnimationFrame(() => {
      setArriving(false)
      setLeaving((l) => (l ? { ...l, out: true } : l))
    })
    return () => cancelAnimationFrame(frame)
  }, [arriving, shown])
  React.useEffect(() => {
    if (!leaving?.out) return
    return afterTransition(exit.current, () => setLeaving(null))
  }, [leaving?.out])
  const up = dir.current > 0
  return (
    <span className="relative inline-grid overflow-hidden">
      <span data-part="ReactionGroup.digit" data-roll={arriving ? (up ? 'below' : 'above') : undefined} className="data-[roll=above]:-translate-y-full data-[roll=below]:translate-y-full data-[roll]:opacity-0">
        {shown}
      </span>
      {leaving && (
        <span ref={exit} data-part="ReactionGroup.digit" aria-hidden data-roll={leaving.out ? (up ? 'above' : 'below') : undefined} className="absolute inset-0 data-[roll=above]:-translate-y-full data-[roll=below]:translate-y-full data-[roll]:opacity-0">
          {leaving.digit}
        </span>
      )}
    </span>
  )
}

/** A count whose changed digits roll in the direction of the change. Columns are keyed from the right, so 9 → 10 rolls the units and grows a ten. */
function RollingCount({ value }: { value: number }) {
  const last = React.useRef(value)
  const direction = React.useRef(0)
  if (value !== last.current) {
    direction.current = value > last.current ? 1 : -1
    last.current = value
  }
  const digits = String(value).split('')
  return (
    <span className="inline-flex">
      {digits.map((d, i) => <RollingDigit key={digits.length - i} digit={d} direction={direction.current} />)}
    </span>
  )
}

// ── ReactionGroup ───────────────────────────────────────────────────────────

export interface ReactionGroupProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  /** The reactions on offer, in the picker's order. */
  options?: ReactionOption[]
  /** The reactions on the post (controlled), in the row's order. */
  value?: ReactionValue[]
  defaultValue?: ReactionValue[]
  /** Fires with the next list and what changed. */
  onValueChange?: (next: ReactionValue[], change: ReactionChange) => void
  /** Accessible name of the group. */
  label?: string
  /** Figma Summary: the line under the row. Omitted, it is written from the value. */
  summary?: React.ReactNode
  /** Figma SummaryVisible. */
  summaryVisible?: boolean
  /** The pills' and the trigger's size (Chip Size). */
  size?: ChipSize
  disabled?: boolean
  /** The picker open (controlled); docs use it to show the open state. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Pin one option's Hover in the picker (docs). */
  highlighted?: string
}

const listOf = (words: string[]) => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`)
const plural = (n: number) => `${n} ${n === 1 ? 'reaction' : 'reactions'}`

/** "27 reactions · You reacted with Celebrate and Like", as the file writes it. */
function summaryOf(value: ReactionValue[], nameOf: (id: string) => string): string {
  const total = value.reduce((sum, v) => sum + v.count, 0)
  const mine = value.filter((v) => v.reacted).map((v) => nameOf(v.id))
  return mine.length ? `${plural(total)} · You reacted with ${listOf(mine)}` : plural(total)
}

function ReactionGroup({
  options = REACTION_OPTIONS, value: controlled, defaultValue, onValueChange, label = 'Reactions', summary, summaryVisible = true, size = 'default',
  disabled = false, open: openProp, defaultOpen = false, onOpenChange, highlighted, className, ...props
}: ReactionGroupProps) {
  const [inner, setInner] = React.useState<ReactionValue[]>(defaultValue ?? [])
  const value = controlled ?? inner
  const [openInner, setOpenInner] = React.useState(defaultOpen)
  const open = openProp ?? openInner
  const setOpen = (next: boolean) => { if (openProp === undefined) setOpenInner(next); onOpenChange?.(next) }
  const optionOf = (id: string) => options.find((o) => o.id === id)
  const nameOf = (id: string) => optionOf(id)?.label ?? id

  const content = React.useRef<HTMLDivElement>(null)
  const [announcement, setAnnouncement] = React.useState('')
  // First render only: the pills start off their mark, then arrive one after another.
  const [phase, setPhase] = React.useState<'pre' | 'enter' | 'rest'>('pre')
  // A pill whose count reached zero stays for its exit before it leaves the row.
  const [leaving, setLeaving] = React.useState<ReactionValue[]>([])
  // A pill that arrives after the first render starts off its mark for one frame.
  const [arriving, setArriving] = React.useState<string[]>([])
  const known = React.useRef(new Set(value.map((v) => v.id)))

  React.useEffect(() => {
    if (phase !== 'pre') return
    const frame = requestAnimationFrame(() => setPhase('enter'))
    return () => cancelAnimationFrame(frame)
  }, [phase])

  // Once the last item has arrived the row is at rest: from then on an item travels, it does not stagger.
  React.useEffect(() => {
    if (phase !== 'enter') return
    const items = content.current?.querySelectorAll<HTMLElement>('[data-part="ReactionGroup.item"]')
    return afterTransition(items?.[items.length - 1] ?? null, () => setPhase('rest'))
  }, [phase])

  // Pills that are new since the last render (a reaction picked, or one a controlled parent added).
  const fresh = phase === 'pre' ? [] : value.filter((v) => !known.current.has(v.id)).map((v) => v.id)
  React.useLayoutEffect(() => {
    known.current = new Set(value.map((v) => v.id))
    if (!fresh.length) return
    setArriving(fresh)
    const frame = requestAnimationFrame(() => setArriving([]))
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.map((v) => v.id).join('|')])

  // Reflow: every item that changed place travels from where it was (FLIP), on the item's own transition.
  const boxes = React.useRef(new Map<string, DOMRect>())
  const rendered = [...value.map((v) => v.id), ...leaving.map((v) => v.id)].join('|')
  React.useLayoutEffect(() => {
    const items = [...(content.current?.querySelectorAll<HTMLElement>('[data-part="ReactionGroup.item"]') ?? [])]
    const before = boxes.current
    const after = new Map(items.map((el) => [el.dataset.key ?? '', el.getBoundingClientRect()] as const))
    const moved: HTMLElement[] = []
    for (const el of items) {
      const was = before.get(el.dataset.key ?? '')
      const now = after.get(el.dataset.key ?? '')
      if (!was || !now || el.dataset.motion) continue
      const dx = was.left - now.left
      const dy = was.top - now.top
      if (!dx && !dy) continue
      el.style.transition = 'none'
      el.style.translate = `${dx}px ${dy}px`
      moved.push(el)
    }
    boxes.current = after
    if (!moved.length) return
    // Read once so the start position is committed, then let the recipe's transition bring each item home.
    void content.current?.offsetWidth
    const frame = requestAnimationFrame(() => { for (const el of moved) { el.style.transition = ''; el.style.translate = '' } })
    return () => { cancelAnimationFrame(frame); for (const el of moved) { el.style.transition = ''; el.style.translate = '' } }
  }, [rendered])

  const commit = (next: ReactionValue[], change: ReactionChange) => {
    if (phase !== 'rest') setPhase('rest')
    if (controlled === undefined) setInner(next)
    onValueChange?.(next, change)
    const name = nameOf(change.id)
    setAnnouncement(change.reacted ? `You reacted with ${name}. ${plural(change.count)}.` : `You removed your ${name} reaction. ${plural(change.count)}.`)
  }

  const focusAfterRemoval = (id: string) => {
    const pills = [...(content.current?.querySelectorAll<HTMLElement>('[data-part="ReactionGroup.item"]:not([data-motion="exit"]) button[aria-pressed]') ?? [])]
    const ids = value.map((v) => v.id)
    const at = ids.indexOf(id)
    const rest = ids.filter((x) => x !== id)
    const neighbour = rest[Math.min(at, rest.length - 1)]
    const target = pills.find((b) => b.closest<HTMLElement>('[data-part="ReactionGroup.item"]')?.dataset.key === neighbour)
      ?? content.current?.querySelector<HTMLElement>('[data-escala="ReactionGroupTrigger"]')
    target?.focus()
  }

  const toggle = (id: string) => {
    const hit = value.find((v) => v.id === id)
    if (!hit) {
      commit([...value, { id, count: 1, reacted: true }], { id, reacted: true, count: 1 })
      setLeaving((l) => l.filter((v) => v.id !== id))
      return
    }
    const reacted = !hit.reacted
    const count = Math.max(0, hit.count + (reacted ? 1 : -1))
    if (count === 0) {
      // Focus first, while the pill is still there to leave from.
      focusAfterRemoval(id)
      // It leaves as it was: a count that rolls to 0 on its way out is noise.
      setLeaving((l) => [...l.filter((v) => v.id !== id), { ...hit }])
      commit(value.filter((v) => v.id !== id), { id, reacted, count })
      return
    }
    commit(value.map((v) => (v.id === id ? { ...v, count, reacted } : v)), { id, reacted, count })
  }

  // A leaving pill plays its exit, then goes.
  const [exiting, setExiting] = React.useState<string[]>([])
  React.useEffect(() => {
    const waiting = leaving.filter((v) => !exiting.includes(v.id)).map((v) => v.id)
    if (!waiting.length) return
    const frame = requestAnimationFrame(() => setExiting((e) => [...e, ...waiting]))
    return () => cancelAnimationFrame(frame)
  }, [leaving, exiting])
  React.useEffect(() => {
    if (!exiting.length) return
    const stops = exiting.map((id) => afterTransition(
      content.current?.querySelector<HTMLElement>(`[data-part="ReactionGroup.item"][data-key="${CSS.escape(id)}"]`) ?? null,
      () => { setLeaving((l) => l.filter((v) => v.id !== id)); setExiting((e) => e.filter((x) => x !== id)) },
    ))
    return () => stops.forEach((stop) => stop())
  }, [exiting])

  const pose = 'data-[motion=pre]:translate-y-[var(--motion-transform-enter,0px)] data-[motion=pre]:opacity-0 data-[motion=exit]:opacity-0'
  const pill = (v: ReactionValue, index: number, gone: boolean) => {
    const option = optionOf(v.id)
    const motion = gone ? (exiting.includes(v.id) ? 'exit' : undefined) : arriving.includes(v.id) ? 'pre' : phase === 'rest' ? undefined : phase
    return (
      <span
        key={v.id}
        data-part="ReactionGroup.item"
        data-key={v.id}
        data-motion={motion}
        aria-hidden={gone || undefined}
        className={cn('inline-flex', pose, gone && 'pointer-events-none')}
        style={{ '--escala-index': index } as React.CSSProperties}
      >
        <Chip
          appearance="outline"
          shape="pill"
          size={size}
          selected={!!v.reacted}
          disabled={disabled || gone}
          iconLeading={option?.icon}
          toggleLabel={`${nameOf(v.id)}, ${plural(v.count)}${v.reacted ? ', you reacted' : ''}`}
          onPressedChange={() => toggle(v.id)}
        >
          <RollingCount value={v.count} />
        </Chip>
      </span>
    )
  }

  // The row in order: a leaving pill keeps the place it had.
  const order = [...value.map((v) => ({ v, gone: false })), ...leaving.filter((l) => !value.some((v) => v.id === l.id)).map((v) => ({ v, gone: true }))]
  return (
    <div data-slot="reaction-group" data-escala="ReactionGroup" role="group" aria-label={label} className={cn('flex flex-col', className)} {...props}>
      <div ref={content} data-part="ReactionGroup.content" className="flex flex-wrap items-center">
        {order.map(({ v, gone }, i) => pill(v, i, gone))}
        <span
          data-part="ReactionGroup.item"
          data-key="__trigger"
          data-motion={phase === 'rest' ? undefined : phase}
          className={cn('inline-flex', pose)}
          style={{ '--escala-index': order.length } as React.CSSProperties}
        >
          <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
            <PopoverPrimitive.Trigger asChild>
              <ReactionGroupTrigger size={size} disabled={disabled} />
            </PopoverPrimitive.Trigger>
            <ReactionGroupPopover options={options} highlighted={highlighted} onSelect={(id) => { setOpen(false); toggle(id) }} />
          </PopoverPrimitive.Root>
        </span>
      </div>
      {summaryVisible && <p data-part="ReactionGroup.summary" className="m-0">{summary ?? summaryOf(value, nameOf)}</p>}
      <span role="status" className="sr-only">{announcement}</span>
    </div>
  )
}

export { ReactionGroup, ReactionGroupPopover, ReactionGroupTrigger }
