// Escala blocks · Overlay. The fifteen Figma blocks of the `Overlay` page (1027:146815). Every one is the system's own `Modal`
// (Modal · ModalHeader · Content slot · ModalFooter · CloseButton) filled with escala-ui components; nothing is drawn here
// except the arrangement of the content, in role tokens (CSS variables). The block's motion is the Modal's own choreography
// (`dialog-enter` / exit): inside an overlay a block adds none. `inline` renders in place (docs, previews); without it the
// block is a real dialog with a scrim, a focus trap and Escape.
//
// Drawer-named blocks (CartDrawer, FilterDrawer) are built on Sheet (Sheet 1648:1577): side right on desktop, bottom on a phone.
// Same header, footer and Content slot as every other block; the panel's own choreography (`sheet-enter` / `sheet-exit`) is the motion.
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
import { glyph } from '../../../lib/icons'
import { boxedGlyph } from './shared'
import { Avatar } from '../avatar'
import { Badge } from '../badge'
import { Button } from '../button'
import { CheckboxItem } from '../checkbox'
import { Chip } from '../chip'
import { Field } from '../field'
import { FeaturedIcon, type FeaturedIconVariant } from '../featured-icon'
import { IconButton } from '../icon-button'
import { Input } from '../input'
import { Modal, ModalContent, ModalFooter, ModalHeader } from '../modal'
import { Sheet, SheetContent, SheetFooter, SheetHeader, type SheetSide } from '../sheet'
import { NumberInput } from '../number-input'
import { RadioGroup, RadioGroupItem } from '../radio-group'
import { RatingGroup } from '../rating-group'
import { SegmentedControl, SegmentedControlItem } from '../segmented-control'
import { Separator } from '../separator'
import { Slider } from '../slider'
import { SwitchGroup } from '../switch'
import { Textarea } from '../textarea'

const v = (ref: string) => `var(${cssVarOf(ref)})`
const type = (role: string): React.CSSProperties => ({
  fontFamily: `var(--text-${role}-font-family)`, fontSize: `var(--text-${role}-font-size)`, lineHeight: `var(--text-${role}-line-height)`,
  fontWeight: `var(--text-${role}-font-weight)`, letterSpacing: `var(--text-${role}-letter-spacing)`,
})
const col = (gap = 'spacing.gap-group'): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', gap: v(gap) })
const row = (gap = 'spacing.gap-control'): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: v(gap) })
const secondary: React.CSSProperties = { color: v('color.content.secondary'), ...type('body-sm') }
const eyebrow: React.CSSProperties = { color: v('color.content.secondary'), ...type('caption'), textTransform: 'uppercase' }

export interface OverlayBlockProps {
  /** Render in place (docs, previews) instead of as a dialog over the page. */
  inline?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** The primary action. */
  onConfirm?: () => void
}

interface ShellProps extends OverlayBlockProps {
  block: string
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  iconVariant?: FeaturedIconVariant
  align?: 'horizontal' | 'vertical-left' | 'vertical-center'
  trailing?: React.ReactNode
  footer?: React.ReactNode
  stacked?: boolean
  leading?: React.ReactNode
  children?: React.ReactNode
  media?: boolean
}

/** The Modal every Overlay block is: header · content · footer. `data-block` names the Figma set. */
function OverlayShell({ block, inline = true, open = true, onOpenChange, title, description, icon, iconVariant, align = 'horizontal', trailing, footer, stacked, leading, children }: ShellProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} modal={!inline}>
      <ModalContent
        inline={inline}
        data-block={block}
        closeLabel="Close"
        header={<ModalHeader align={align} title={title} description={description} descriptionVisible={Boolean(description)} icon={icon} iconVisible={Boolean(icon)} iconVariant={iconVariant} trailing={trailing} trailingVisible={Boolean(trailing)} closeClearance />}
        footer={footer ? <ModalFooter layout={stacked ? 'stacked' : 'inline'} leading={leading} leadingVisible={Boolean(leading)}>{footer}</ModalFooter> : undefined}
      >
        {children}
      </ModalContent>
    </Modal>
  )
}
interface DrawerProps extends OverlayBlockProps {
  /** Figma Sheet Side: `right` on desktop, `bottom` on a phone. */
  side?: SheetSide
}

/** The Sheet every drawer block is: header · content · footer on an edge panel. `data-block` names the Figma set. */
function SheetShell({ block, side = 'right', inline = true, open = true, onOpenChange, title, trailing, footer, leading, children }: Pick<ShellProps, 'block' | 'title' | 'trailing' | 'footer' | 'leading' | 'children'> & DrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={!inline}>
      <SheetContent
        inline={inline}
        side={side}
        data-block={block}
        closeLabel="Close"
        header={<SheetHeader title={title} descriptionVisible={false} iconVisible={false} trailing={trailing} trailingVisible={Boolean(trailing)} closeClearance />}
        footer={footer ? <SheetFooter leading={leading} leadingVisible={Boolean(leading)}>{footer}</SheetFooter> : undefined}
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}

// The Modal's `main` already pads the header and the Content slot (Spacing/inset-surface) and puts Spacing/gap-group between
// them; the footer pads itself. The Content slot adds NO padding of its own (Figma 1054:6209), or it doubles.
const body = (children: React.ReactNode, gap = 'spacing.gap-group') => (
  <div data-part="content" style={col(gap)}>{children}</div>
)

/** Figma `ConfirmDialog`. */
export function ConfirmDialog(p: OverlayBlockProps) {
  return (
    <OverlayShell block="ConfirmDialog" {...p} title="Publish version 1.2?" description="All 12 members will receive the update notice immediately." icon={glyph('info')} iconVariant="secondary"
      footer={<><Button variant="secondary" onClick={() => p.onOpenChange?.(false)}>Cancel</Button><Button onClick={p.onConfirm}>Publish</Button></>} />
  )
}

/** Figma `DestructiveConfirm`: typing the workspace name arms the delete. */
export function DestructiveConfirm(p: OverlayBlockProps) {
  const [typed, setTyped] = React.useState('')
  return (
    <OverlayShell block="DestructiveConfirm" {...p} title="Delete Northwind workspace" description="This removes 14 projects, 428 MB of files and revokes access for every member." icon={glyph('trash')} iconVariant="critical"
      footer={<><Button variant="secondary" onClick={() => p.onOpenChange?.(false)}>Cancel</Button><Button variant="critical" disabled={typed !== 'Northwind'} onClick={p.onConfirm}>Delete forever</Button></>}>
      {body(<Field label="Type Northwind to confirm" description="This cannot be undone."><Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Northwind" /></Field>)}
    </OverlayShell>
  )
}

/** Figma `FormModal`. The visibility choice is a RadioGroup: the Figma RadioCard is not built in code yet (finding CMP-007). */
export function FormModal(p: OverlayBlockProps) {
  return (
    <OverlayShell block="FormModal" {...p} title="Create project" description="Give it a name and choose who can see it." icon={glyph('plus')} iconVariant="secondary"
      footer={<><Button variant="secondary" onClick={() => p.onOpenChange?.(false)}>Cancel</Button><Button onClick={p.onConfirm}>Create project</Button></>}>
      {body(<>
        <Field label="Project name" required><Input placeholder="Northwind Redesign" /></Field>
        <Field label="Description"><Textarea placeholder="What is this project about?" /></Field>
        <div data-part="visibility" style={col('spacing.gap-control')}>
          <span style={{ ...type('label') }}>Visibility</span>
          <RadioGroup defaultValue="private" aria-label="Visibility" style={col('spacing.gap-control')}>
            {[['private', 'Private', 'Invite only'], ['workspace', 'Workspace', 'All 12 members']].map(([value, label, hint]) => (
              <label key={value} style={{ ...row(), ...type('body-sm') }}><RadioGroupItem value={value} /><span><strong>{label}</strong> · <span style={secondary}>{hint}</span></span></label>
            ))}
          </RadioGroup>
        </div>
      </>)}
    </OverlayShell>
  )
}

/** Figma `SuccessModal`: a success moment, stacked actions. */
export function SuccessModal(p: OverlayBlockProps) {
  return (
    <OverlayShell block="SuccessModal" {...p} align="vertical-center" stacked title="Payment successful" description="Your Scale plan is active. A receipt for $2,988.00 is on its way to your inbox." icon={glyph('check-circle')} iconVariant="success"
      footer={<><Button onClick={p.onConfirm}>Go to dashboard</Button><Button variant="secondary">Download receipt</Button></>} />
  )
}

/** Figma `ErrorModal`. */
export function ErrorModal(p: OverlayBlockProps) {
  return (
    <OverlayShell block="ErrorModal" {...p} align="vertical-center" stacked title="Payment declined" description="Your bank rejected the charge. No money was taken and your plan stays as it is." icon={glyph('warning-circle')} iconVariant="critical"
      footer={<><Button onClick={p.onConfirm}>Try again</Button><Button variant="secondary" onClick={() => p.onOpenChange?.(false)}>Stay on current plan</Button></>} />
  )
}

/** Figma `FeedbackRating`. */
export function FeedbackRating(p: OverlayBlockProps) {
  return (
    <OverlayShell block="FeedbackRating" {...p} title="How was your experience?"
      footer={<><Button variant="secondary" appearance="ghost" onClick={() => p.onOpenChange?.(false)}>Not now</Button><Button onClick={p.onConfirm}>Send feedback</Button></>}>
      {body(<>
        <RatingGroup type="emoji" aria-label="Rating" />
        <Field label="Tell us more"><Textarea placeholder="What worked, what did not?" /></Field>
        <CheckboxItem size="xs" defaultChecked label="You can follow up with me about this" />
      </>)}
    </OverlayShell>
  )
}

/** Figma `WarningDialog`: the action stays disabled until the risk is acknowledged. */
export function WarningDialog(p: OverlayBlockProps) {
  const [ok, setOk] = React.useState(true)
  return (
    <OverlayShell block="WarningDialog" {...p} title="Revoking this key breaks 4 integrations" description="GitHub, Slack, Linear and your CI pipeline authenticate with it." icon={glyph('warning')} iconVariant="warning"
      footer={<><Button variant="secondary" appearance="ghost" onClick={() => p.onOpenChange?.(false)}>Keep key</Button><Button variant="critical" appearance="outline" disabled={!ok} onClick={p.onConfirm}>Revoke anyway</Button></>}>
      {body(<CheckboxItem size="xs" checked={ok} onCheckedChange={(c) => setOk(c === true)} label="I understand these integrations will need reconnecting" />)}
    </OverlayShell>
  )
}

const PEOPLE = [{ name: 'Liam O’Brien', mail: 'liam@escala.design', role: 'Owner', locked: true }, { name: 'Ayla Karagoz', mail: 'ayla@escala.design', role: 'Can edit', locked: false }]

/** Figma `ShareModal`: no footer. */
export function ShareModal(p: OverlayBlockProps) {
  return (
    <OverlayShell block="ShareModal" {...p} title="Share Northwind Redesign">
      {body(<>
        <div data-part="invite" style={row()}><Input size="sm" placeholder="Add people by email" /><Button size="sm">Invite</Button></div>
        <div data-part="people" style={col('spacing.gap-control')}>
          {PEOPLE.map((person) => (
            <div key={person.mail} data-part="person" style={row('spacing.gap-control')}>
              <Avatar size="sm" type="image" alt={person.name} />
              <div style={{ flex: 1, ...col('spacing.none') }}><span style={type('label')}>{person.name}</span><span style={secondary}>{person.mail}</span></div>
              <Button size="sm" variant="secondary" appearance="ghost" disabled={person.locked} trailing={boxedGlyph('chevron-down')}>{person.role}</Button>
            </div>
          ))}
        </div>
        <Separator>OR</Separator>
        <div data-part="link-access" style={col('spacing.gap-control')}>
          <div style={{ ...row(), justifyContent: 'space-between' }}><span style={{ ...type('body-sm') }}>Anyone with the link</span><Button size="sm" variant="secondary" appearance="ghost" trailing={boxedGlyph('chevron-down')}>Can view</Button></div>
          <div style={row()}><Input size="sm" readOnly value="escala.design/s/nw-8f2a1" aria-label="Share link" /><IconButton size="sm" variant="secondary" appearance="outline" aria-label="Copy link" icon={boxedGlyph('file')} /></div>
        </div>
      </>)}
    </OverlayShell>
  )
}

/** Figma `SessionTimeoutWarning`. */
export function SessionTimeoutWarning(p: OverlayBlockProps) {
  return (
    <OverlayShell block="SessionTimeoutWarning" {...p} align="vertical-center" title="Still there?" description="For security, you will be signed out after 8 hours of inactivity." icon={glyph('warning')} iconVariant="warning"
      footer={<><Button variant="secondary" appearance="ghost" onClick={() => p.onOpenChange?.(false)}>Sign out now</Button><Button onClick={p.onConfirm}>Stay signed in</Button></>}>
      {body(<div role="timer" aria-live="off" style={{ textAlign: 'center', ...type('display-sm') }}>01:58</div>)}
    </OverlayShell>
  )
}

const CART = [{ name: 'Escala UI Complete', hint: 'Design + code kit, lifetime', price: '$249', qty: 1 }, { name: 'Dashboard templates', hint: '12 screens', price: '$98', qty: 2 }, { name: 'Icon pack extended', hint: '1,200 icons', price: '$39', qty: 1 }]

/** Figma `CartDrawer`, on Sheet. */
export function CartDrawer(p: DrawerProps) {
  return (
    <SheetShell block="CartDrawer" {...p} title="Your cart" trailing={<Badge type="number" shape="pill" count={3} />}
      footer={<Button onClick={p.onConfirm}>Checkout</Button>}>
      {body(<>
        <div data-part="items" style={col('spacing.gap-group')}>
          {CART.map((item, i) => (
            <React.Fragment key={item.name}>
              {i > 0 && <Separator tone="subtle" />}
              <div data-part="line-item" style={{ ...row('spacing.gap-group'), alignItems: 'flex-start' }}>
                <Avatar type="icon" shape="rounded" appearance="solid" size="default" />
                <div style={{ flex: 1, ...col('spacing.gap-tight') }}>
                  <div style={{ ...row(), justifyContent: 'space-between' }}><span style={type('label')}>{item.name}</span><Badge size="xs">{item.price}</Badge></div>
                  <span style={secondary}>{item.hint}</span>
                  <NumberInput size="sm" defaultValue={item.qty} aria-label={`Quantity of ${item.name}`} />
                </div>
                <IconButton size="xs" variant="secondary" appearance="ghost" aria-label={`Remove ${item.name}`} icon={boxedGlyph('trash')} />
              </div>
            </React.Fragment>
          ))}
        </div>
        <Separator tone="subtle" />
        <div data-part="summary" style={{ ...row(), justifyContent: 'space-between', ...type('label') }}><span>Subtotal</span><span>$386.00</span></div>
      </>)}
    </SheetShell>
  )
}

/** Figma `QuickEditDialog` (400 wide in the file). */
export function QuickEditDialog(p: OverlayBlockProps) {
  return (
    <OverlayShell block="QuickEditDialog" {...p} title="Rename file"
      footer={<><Button variant="secondary" appearance="ghost" onClick={() => p.onOpenChange?.(false)}>Cancel</Button><Button onClick={p.onConfirm}>Rename</Button></>}>
      {body(<Field label="File name" description="Extension stays the same. Links to this file keep working."><Input defaultValue="northwind-brief" /></Field>)}
    </OverlayShell>
  )
}

/** Figma `FilterDrawer`, on Sheet. */
export function FilterDrawer(p: DrawerProps) {
  return (
    <SheetShell block="FilterDrawer" {...p} title="Filters" trailing={<Button size="sm" variant="secondary" appearance="ghost">Reset</Button>}
      footer={<Button onClick={p.onConfirm}>Show 62 results</Button>}>
      {body(<>
        <div style={col('spacing.gap-control')}><span style={eyebrow}>Price range</span><Slider range tooltipVisible aria-label="Price range" /></div>
        <div style={col('spacing.gap-control')}><span style={eyebrow}>Category</span>
          <CheckboxItem size="xs" defaultChecked label="Design systems" /><CheckboxItem size="xs" label="Templates" /><CheckboxItem size="xs" defaultChecked label="Component kits" />
        </div>
        <div style={col('spacing.gap-control')}><span style={eyebrow}>Availability</span><SwitchGroup label="In stock only" description="Hide items that are sold out." /></div>
      </>)}
    </SheetShell>
  )
}

/** Figma `FilterModal`. */
export function FilterModal(p: OverlayBlockProps) {
  const facets: [string, string[], string[]][] = [['Role', ['Owner', 'Admin', 'Editor', 'Member'], ['Owner', 'Editor']], ['Status', ['Active', 'Pending', 'Suspended'], ['Active']]]
  return (
    <OverlayShell block="FilterModal" {...p} title="Filter members" trailing={<Button size="sm" variant="secondary" appearance="ghost">Clear all</Button>}
      leading={<span style={secondary}>7 results</span>} footer={<Button onClick={p.onConfirm}>Apply</Button>}>
      {body(<>
        {facets.map(([label, options, on]) => (
          <div key={label} data-part="facet" style={col('spacing.gap-control')}><span style={type('label')}>{label}</span>
            <div style={{ ...row(), flexWrap: 'wrap' }}>{options.map((o) => <Chip key={o} size="sm" shape="pill" appearance="outline" selected={on.includes(o)}>{o}</Chip>)}</div></div>
        ))}
        <div data-part="facet" style={col('spacing.gap-control')}><span style={type('label')}>Last active</span>
          <SegmentedControl defaultValue="Any" aria-label="Last active"><SegmentedControlItem value="Any" label="Any" /><SegmentedControlItem value="7 days" label="7 days" /><SegmentedControlItem value="30 days" label="30 days" /></SegmentedControl></div>
      </>)}
    </OverlayShell>
  )
}

/** Figma `ReleaseModal`: a media header, a badge, a headline and highlights. */
export function ReleaseModal(p: OverlayBlockProps) {
  const highlights = ['15 overlay blocks built on Modal', 'Desktop and mobile layouts on every section', 'Light and Dark through Color Semantics modes']
  return (
    <OverlayShell block="ReleaseModal" {...p} title="Blocks are here" description="Ready-to-use compositions across Auth, Navigation, Overlay and Marketing."
      leading={<Button variant="secondary" appearance="ghost">Read the changelog</Button>} footer={<Button onClick={p.onConfirm}>Explore blocks</Button>}>
      {body(<>
        <div data-part="media" style={{ display: 'flex', justifyContent: 'center' }}><FeaturedIcon size="xl" appearance="solid" shape="rounded" icon={glyph('sparkle')} /></div>
        <div style={{ display: 'flex', justifyContent: 'center' }}><Badge size="sm">Released today</Badge></div>
        <ul data-part="highlights" style={{ ...col('spacing.gap-control'), margin: 0, padding: 0, listStyle: 'none' }}>
          {highlights.map((h) => <li key={h} style={{ ...row(), ...type('body-sm') }}>{boxedGlyph('check')}{h}</li>)}
        </ul>
      </>)}
    </OverlayShell>
  )
}

/** Figma `CookieConsent`. */
export function CookieConsent(p: OverlayBlockProps) {
  const rows: [string, string, boolean][] = [['Essential', 'Always active', true], ['Analytics', 'Anonymous usage data', false], ['Marketing', 'Ad measurement', false]]
  return (
    <OverlayShell block="CookieConsent" {...p} title="We use cookies" description="Essential cookies keep the app working. Analytics cookies help us improve it."
      leading={<Button variant="secondary" appearance="ghost">Reject all</Button>} footer={<><Button variant="secondary">Save choices</Button><Button onClick={p.onConfirm}>Accept all</Button></>}>
      {body(<>
        {rows.map(([label, hint, locked], i) => (
          <React.Fragment key={label}>{i > 0 && <Separator tone="subtle" />}<SwitchGroup label={label} description={hint} defaultChecked={locked} disabled={locked} placement="right" /></React.Fragment>
        ))}
      </>)}
    </OverlayShell>
  )
}

export const OVERLAY_BLOCKS = {
  ConfirmDialog, DestructiveConfirm, FormModal, SuccessModal, ErrorModal, FeedbackRating, WarningDialog, ShareModal,
  SessionTimeoutWarning, CartDrawer, QuickEditDialog, FilterDrawer, FilterModal, ReleaseModal, CookieConsent,
} as const
