// Escala blocks · CardStack and CardStackCard. The Figma page `❖ CardStack (PRO)` (2397:84): CardStack (State Default ·
// Dragging · Empty, 2403:312) and its part CardStackCard (State Default · Dragging, 2403:104). A decision deck: the top card is
// dragged, or the arrow keys or the buttons skip or shortlist it. Every gesture has a button and each decision is announced.
// Arrangement of escala-ui components (Image, Badge, Button, IconButton) in role tokens; sample brand: Ohmewn Travel.
//
// Behaviour (Storybook owns it): the stage is focusable (`aria-roledescription="card stack"`); ← skips, → shortlists,
// Backspace or Cmd/Ctrl+Z undoes; a polite live region announces each decision; only the top four cards are rendered; Undo
// shows as an icon alone under 22.5rem. Motion (contract in cardStack.contract.json): the drag follows the pointer (never
// timed), the throw-off travels on `use-travel-out`, the deck rising and an undo return on `use-travel-in`, the empty state
// enters on `use-disclosure-in`; reduced motion fades in place.
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
import { glyph, type IconName } from '../../../lib/icons'
import { blockType, boxedGlyph } from './shared'
import { Badge } from '../badge'
import { Button } from '../button'
import { IconButton } from '../icon-button'
import { Image } from '../image'
import { TRAVEL } from './mediaSamples'

const v = (ref: string) => `var(${cssVarOf(ref)})`
const type = blockType
const motion = (role: string) => `var(--motion-${role}-duration) var(--motion-${role}-easing)`
const primary = v('color.content.primary')
const secondary = v('color.content.secondary')

export interface CardStackFact { icon: IconName; text: string }
export interface CardStackItem {
  id: string
  city: string
  country: string
  /** The airport code in the badge. */
  code: string
  description: string
  photo: string
  facts: [CardStackFact, CardStackFact, CardStackFact]
}

export const CARD_STACK_ITEMS: CardStackItem[] = [
  { id: 'lisbon', city: 'Lisbon', country: 'Portugal', code: 'LIS', photo: TRAVEL.lisbon, description: 'Tiled hills, late light and seafood by the river. Easy to walk in a long weekend.',
    facts: [{ icon: 'airplane', text: '2 h 35 min direct' }, { icon: 'sun', text: '24 °C, mostly sunny' }, { icon: 'currency-eur', text: '€640 per person' }] },
  { id: 'kyoto', city: 'Kyoto', country: 'Japan', code: 'KIX', photo: TRAVEL.kyoto, description: 'Temples at dawn, quiet lanes and a tea house on every corner. Best in autumn.',
    facts: [{ icon: 'airplane', text: '13 h 20 min, 1 stop' }, { icon: 'sun', text: '19 °C, clear' }, { icon: 'currency-eur', text: '€1,180 per person' }] },
  { id: 'copenhagen', city: 'Copenhagen', country: 'Denmark', code: 'CPH', photo: TRAVEL.copenhagen, description: 'Painted harbour fronts, bikes everywhere and long summer evenings by the water.',
    facts: [{ icon: 'airplane', text: '2 h 05 min direct' }, { icon: 'sun', text: '17 °C, light breeze' }, { icon: 'currency-eur', text: '€580 per person' }] },
  { id: 'porto', city: 'Porto', country: 'Portugal', code: 'OPO', photo: TRAVEL.porto, description: 'Port cellars across the river, tiled churches and the Dom Luís bridge at sunset.',
    facts: [{ icon: 'airplane', text: '2 h 20 min direct' }, { icon: 'sun', text: '22 °C, sunny' }, { icon: 'currency-eur', text: '€520 per person' }] },
]

// ── CardStackCard ────────────────────────────────────────────────────────────

export const CARD_STACK_CARD_STATES = ['Default', 'Dragging'] as const
export type CardStackCardState = (typeof CARD_STACK_CARD_STATES)[number]

export interface CardStackCardProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  item?: CardStackItem
  /** Figma State. Dragging lifts the card (Shadow/md) and shows the stamp. */
  state?: CardStackCardState
  /** The stamp's word while dragging: Shortlist (the file's) or Skip. */
  stamp?: 'Shortlist' | 'Skip'
  /** Show the stamp (default: while dragging). A live drag hides it until the card has moved. */
  stampVisible?: boolean
}

/** Figma CardStackCard (2403:104): a travel card, 320 wide: photo 4:3, code, city, description and three facts. */
export const CardStackCard = React.forwardRef<HTMLDivElement, CardStackCardProps>(function CardStackCard(
  { item = CARD_STACK_ITEMS[0], state = 'Default', stamp = 'Shortlist', stampVisible, style, ...props }, ref,
) {
  const dragging = state === 'Dragging'
  return (
    <div
      ref={ref} data-escala="CardStackCard" data-state={state}
      style={{
        position: 'relative', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: v('spacing.gap-group'), width: `calc(${v('spacing.32')} * 2.5)`,
        padding: v('spacing.inset-surface'), background: v('color.surface.layer-2'), border: `${v('stroke.divider')} solid ${v('color.border.default')}`,
        borderRadius: v('radius.container'), boxShadow: dragging ? v('shadow.md') : v('shadow.sm'), ...style,
      }}
      {...props}
    >
      <div style={{ borderRadius: v('radius.action'), overflow: 'hidden', background: v('color.surface.muted') }}>
        <Image ratio="4:3" src={item.photo} alt={`${item.city}, ${item.country}`} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Badge variant="secondary" appearance="soft" shape="rounded">{item.code}</Badge>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-tight'), whiteSpace: 'nowrap' }}>
        <span style={{ ...type('heading-sm'), color: primary }}>{item.city}</span>
        <span style={{ ...type('body-sm'), color: secondary }}>{item.country}</span>
      </div>
      <p style={{ ...type('body-md'), color: secondary, margin: 0 }}>{item.description}</p>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: v('spacing.gap-control'), margin: 0, padding: 0, listStyle: 'none' }}>
        {item.facts.map((f) => (
          <li key={f.text} style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-control') }}>
            <span aria-hidden style={{ display: 'inline-flex', width: v('icon.small'), height: v('icon.small'), flexShrink: 0, color: v('color.content.subtle') }}>{glyph(f.icon)}</span>
            <span style={{ ...type('body-sm'), color: secondary, whiteSpace: 'nowrap' }}>{f.text}</span>
          </li>
        ))}
      </ul>
      {(stampVisible ?? dragging) && (
        <span aria-hidden style={{ position: 'absolute', top: `calc(${v('spacing.8')} * 1)`, right: `calc(${v('spacing.8')} * 1)`, transform: 'rotate(-8deg)' }}>
          <Badge variant={stamp === 'Skip' ? 'critical' : 'success'} appearance="solid" shape="rounded">{stamp}</Badge>
        </span>
      )}
    </div>
  )
})

// ── CardStack ────────────────────────────────────────────────────────────────

export const CARD_STACK_STATES = ['Default', 'Dragging', 'Empty'] as const
export type CardStackState = (typeof CARD_STACK_STATES)[number]

type Decision = { id: string; choice: 'skip' | 'shortlist' }
const THRESHOLD = 96 // px of drag that decides
/** The deck layers step 8 down and in per layer (Figma deck-2 at 8, deck-3 at 16). */
const DECK_STEP = v('spacing.2')

export interface CardStackProps extends Omit<React.ComponentProps<'div'>, 'children' | 'onChange'> {
  items?: CardStackItem[]
  /** Figma State. Dragging pins the top card mid-throw and Empty the finished deck (docs); the live deck needs neither. */
  forceState?: CardStackState
  onDecision?: (item: CardStackItem, choice: 'skip' | 'shortlist') => void
}

/** Figma CardStack (2403:312): the stage (top card + two deck layers) over the actions row, on Spacing/gap-section. */
export function CardStack({ items = CARD_STACK_ITEMS, forceState, onDecision, style, ...props }: CardStackProps) {
  const [decided, setDecided] = React.useState<Decision[]>(() => (forceState === 'Empty' ? items.map((i, n) => ({ id: i.id, choice: n % 2 ? 'shortlist' : 'skip' })) : []))
  const [drag, setDrag] = React.useState<{ x: number; y: number; on: boolean }>({ x: 0, y: 0, on: false })
  const [throwing, setThrowing] = React.useState<null | 'skip' | 'shortlist'>(null)
  const [live, setLive] = React.useState('')
  const start = React.useRef<{ x: number; y: number } | null>(null)
  const done = new Set(decided.map((d) => d.id))
  const left = items.filter((i) => !done.has(i.id))
  const top = left[0]
  const empty = !top
  const pinned = forceState === 'Dragging' && !empty
  const shortlisted = decided.filter((d) => d.choice === 'shortlist').length

  const decide = (choice: 'skip' | 'shortlist') => {
    if (!top || throwing) return
    setThrowing(choice)
    window.setTimeout(() => {
      setDecided((d) => [...d, { id: top.id, choice }])
      setThrowing(null); setDrag({ x: 0, y: 0, on: false })
      setLive(`${choice === 'skip' ? 'Skipped' : 'Shortlisted'} ${top.city}. ${left.length - 1} cards left.`)
      onDecision?.(top, choice)
    }, 180)
  }
  const undo = () => {
    const last = decided[decided.length - 1]
    if (!last) return
    setDecided((d) => d.slice(0, -1))
    setLive(`Back to ${items.find((i) => i.id === last.id)?.city}.`)
  }
  const reset = () => { setDecided([]); setLive('Starting over.') }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); decide('skip') }
    else if (e.key === 'ArrowRight') { e.preventDefault(); decide('shortlist') }
    else if (e.key === 'Backspace' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z')) { e.preventDefault(); undo() }
  }
  const onPointerDown = (e: React.PointerEvent) => { if (!top) return; start.current = { x: e.clientX, y: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDrag({ x: 0, y: 0, on: true }) }
  const onPointerMove = (e: React.PointerEvent) => { if (start.current) setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, on: true }) }
  const onPointerUp = () => {
    if (!start.current) return
    start.current = null
    if (Math.abs(drag.x) >= THRESHOLD) decide(drag.x > 0 ? 'shortlist' : 'skip')
    else setDrag({ x: 0, y: 0, on: false })
  }

  const dx = throwing ? (throwing === 'shortlist' ? 1 : -1) * 480 : pinned ? 56 : drag.x
  const dy = pinned ? -8 : drag.y
  const rot = pinned ? 8 : dx / 24
  const lifted = pinned || drag.on || !!throwing
  const stamp = dx >= 0 ? 'Shortlist' : 'Skip'

  return (
    <div
      data-escala="CardStack" data-state={empty ? 'Empty' : lifted ? 'Dragging' : 'Default'}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: v('spacing.gap-section'), width: 'fit-content', ...style }}
      {...props}
    >
      <div
        role="group" aria-roledescription="card stack" aria-label={`Destinations, ${left.length} left`} tabIndex={0} onKeyDown={onKeyDown}
        className="outline-none focus-visible:outline-solid focus-visible:[outline-width:var(--stroke-focus)] focus-visible:[outline-color:var(--color-border-ring-default)] focus-visible:[outline-offset:var(--stroke-divider)]"
        style={{ position: 'relative', width: `calc(${v('spacing.32')} * 2.5)`, height: `calc(${v('spacing.32')} * 4.05078125)`, borderRadius: v('radius.container') }}
      >
        {empty ? (
          <div
            style={{
              position: 'absolute', inset: 0, bottom: DECK_STEP, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: v('spacing.gap-control'),
              border: `${v('stroke.divider')} dashed ${v('color.border.default')}`, borderRadius: v('radius.container'), animation: `escala-cs-in ${motion('use-disclosure-in')} both`,
            }}
          >
            <span style={{ ...type('heading-2xs'), color: primary }}>That’s every card</span>
            <span style={{ ...type('body-sm'), color: secondary }}>{decided.length} decided · {shortlisted} shortlisted</span>
            <Button variant="secondary" appearance="outline" onClick={reset}>Start over</Button>
          </div>
        ) : (
          <>
            {[2, 1].map((n) => left[n] && (
              <div key={left[n].id} aria-hidden style={{
                position: 'absolute', top: `calc(${DECK_STEP} * ${n})`, left: `calc(${DECK_STEP} * ${n})`, right: `calc(${DECK_STEP} * ${n})`, bottom: `calc(${DECK_STEP} * ${2 - n})`, boxSizing: 'border-box',
                background: v('color.surface.layer-2'), border: `${v('stroke.divider')} solid ${v('color.border.default')}`, borderRadius: v('radius.container'), boxShadow: v('shadow.sm'),
                transition: `top ${motion('use-travel-in')}, left ${motion('use-travel-in')}, right ${motion('use-travel-in')}`,
              }} />
            ))}
            <div
              key={top.id} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
              style={{
                position: 'absolute', top: 0, left: 0, touchAction: 'none', cursor: drag.on ? 'grabbing' : 'grab',
                transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
                transition: drag.on && !throwing ? 'none' : `transform ${motion(throwing ? 'use-travel-out' : 'use-travel-in')}, opacity ${motion('use-travel-out')}`,
                opacity: throwing ? 0 : 1,
              }}
            >
              <CardStackCard item={top} state={lifted ? 'Dragging' : 'Default'} stamp={stamp} stampVisible={pinned || (lifted && Math.abs(dx) > 24)} aria-label={`${top.city}, card ${items.indexOf(top) + 1} of ${items.length}`} />
            </div>
          </>
        )}
      </div>
      <div className="[container-type:inline-size]" style={{ display: 'flex', alignItems: 'center', gap: v('spacing.gap-control') }}>
        <Button variant="secondary" appearance="outline" leading={boxedGlyph('close')} disabled={empty} onClick={() => decide('skip')}>Skip</Button>
        <IconButton variant="secondary" appearance="ghost" aria-label="Undo" icon={glyph('arrow-counter-clockwise')} disabled={decided.length === 0} onClick={undo} />
        <Button leading={boxedGlyph('heart')} disabled={empty} onClick={() => decide('shortlist')}>Shortlist</Button>
      </div>
      <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{live}</div>
      <style>{'@keyframes escala-cs-in{from{opacity:0;transform:translateY(var(--motion-transform-enter,4px))}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){[data-escala="CardStack"] *{transition-property:opacity!important}}'}</style>
    </div>
  )
}
