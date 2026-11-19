// Escala blocks · Overlay. The fifteen Figma blocks of the `Overlay` page (1027:146815). Every one is the system's own `Modal`
// (Modal · ModalHeader · Content slot · ModalFooter · CloseButton) filled with escala-ui components; nothing is drawn here
// except the arrangement of the content, in role tokens (CSS variables). The block's motion is the Modal's own choreography
// (`dialog-enter` / exit): inside an overlay a block adds none. `inline` renders in place (docs, previews); without it the
// block is a real dialog with a scrim, a focus trap and Escape.
//
// CartDrawer and FilterDrawer are drawer-named but the file builds both on the Modal, Layout=tray (1074:2954, 1074:3445). Six blocks are Layout=simple (400 wide), the rest Layout=tray (480).
import * as React from 'react'
import { cssVarOf } from '../../../lib/componentRecipes'
import { glyph } from '../../../lib/icons'
import { boxedGlyph, blockType } from './shared'
import { Avatar } from '../avatar'
import { Badge } from '../badge'
import { Button } from '../button'
import { CheckboxItem } from '../checkbox'
import { Chip } from '../chip'
import { Field } from '../field'
import { FeaturedIcon, type FeaturedIconVariant } from '../featured-icon'
import { IconButton } from '../icon-button'
import { Input } from '../input'
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle, type ModalFooterLayout, type ModalLayout } from '../modal'
import { NumberInput } from '../number-input'
import { RadioGroup, RadioGroupItem } from '../radio-group'
import { RatingGroup } from '../rating-group'
import { SegmentedControl, SegmentedControlItem } from '../segmented-control'
import { Separator } from '../separator'
import { Slider } from '../slider'
import { SwitchGroup } from '../switch'
import { Textarea } from '../textarea'

const v = (ref: string) => `var(${cssVarOf(ref)})`
const type = blockType
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
  /** Figma ModalFooter Layout: `inline` (actions at the end), `stacked` (full width, confirm first) or `equal` (two buttons of one width). */
  footerLayout?: ModalFooterLayout
  /** Figma Modal Layout: `tray` (480) or `simple` (400). Every Overlay block states its own. */
  layout: ModalLayout
  /** A dialog of items opens on the panel itself, not on its first control (the cart's quantity stepper lit its focus ring on open). */
  focusPanel?: boolean
  /** No ModalHeader (ReleaseModal draws its own title in the Content slot). */
  headerless?: boolean
  leading?: React.ReactNode
  children?: React.ReactNode
}

/** The Modal every Overlay block is: header · content · footer. `data-block` names the Figma set. */
function OverlayShell({ block, inline = true, open = true, onOpenChange, title, description, icon, iconVariant, align = 'vertical-center', trailing, footer, footerLayout = 'inline', layout, focusPanel, headerless, leading, children }: ShellProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} modal={!inline}>
      <ModalContent
        inline={inline}
        layout={layout}
        data-block={block}
        closeLabel="Close"
        {...(focusPanel ? { onOpenAutoFocus: (e: Event) => { e.preventDefault(); if (!inline) (e.currentTarget as HTMLElement).focus() } } : {})}
        header={headerless ? undefined : <ModalHeader align={align} title={title} description={description} descriptionVisible={Boolean(description)} icon={icon} iconVisible={Boolean(icon)} iconVariant={iconVariant} trailing={trailing} trailingVisible={Boolean(trailing)} closeClearance />}
        footer={footer ? <ModalFooter layout={footerLayout} leading={leading} leadingVisible={Boolean(leading)}>{footer}</ModalFooter> : undefined}
      >
        {children}
      </ModalContent>
    </Modal>
  )
}

// The Modal's `main` already pads the header and the Content slot (Spacing/inset-surface) and puts Spacing/gap-group between
// them; the footer pads itself. The Content slot adds NO padding of its own (Figma 1054:6209), or it doubles.
const body = (children: React.ReactNode, gap = 'spacing.gap-group') => (
  <div data-part="content" style={col(gap)}>{children}</div>
)

const cancel = (p: OverlayBlockProps, label = 'Cancel', appearance: 'solid' | 'ghost' = 'solid') => <Button variant="secondary" appearance={appearance} onClick={() => p.onOpenChange?.(false)}>{label}</Button>

/** Figma `ConfirmDialog` (1054:6187): Modal simple, centred header, two equal buttons. */
export function ConfirmDialog(p: OverlayBlockProps) {
  return (
    <OverlayShell block="ConfirmDialog" {...p} layout="simple" footerLayout="equal" title="Publish version 1.2?" description="All 12 members will receive the update notice immediately." icon={glyph('info')} iconVariant="info"
      footer={<>{cancel(p)}<Button onClick={p.onConfirm}>Publish</Button></>} />
  )
}

/** Figma `DestructiveConfirm` (1054:6209): typing the workspace name arms the delete (the in-place preview draws it armed, as the file does). */
export function DestructiveConfirm(p: OverlayBlockProps) {
  const [typed, setTyped] = React.useState('')
  const inline = p.inline ?? true
  return (
    <OverlayShell block="DestructiveConfirm" {...p} layout="simple" footerLayout="equal" title="Delete Northwind workspace" description="This removes 14 projects, 428 MB of files and revokes access for every member." icon={glyph('trash')} iconVariant="critical"
      footer={<>{cancel(p)}<Button variant="critical" disabled={!inline && typed !== 'Northwind'} onClick={p.onConfirm}>Delete forever</Button></>}>
      {body(<Field label="Type Northwind to confirm" description="This cannot be undone."><Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Northwind" /></Field>)}
    </OverlayShell>
  )
}

/** One option of the Figma `RadioCard` (Size xs, Placement left): a radio, a label and a hint in a bordered card. Not an escala-ui component yet (finding CMP-007). */
function RadioCardOption({ value, label, hint, checked }: { value: string; label: string; hint: string; checked: boolean }) {
  return (
    <label
      data-part="radio-card"
      data-checked={checked ? '' : undefined}
      style={{
        flex: 1, minWidth: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', gap: v('spacing.gap-control'),
        padding: 'calc(var(--spacing-inset-control) - var(--stroke-control))', borderRadius: v('radius.container'), cursor: 'pointer',
        border: `var(--stroke-control) solid ${v(checked ? 'color.border.accent' : 'color.border.control')}`,
        backgroundColor: v('color.surface.input'), backgroundImage: checked ? `linear-gradient(${v('color.surface.selected')}, ${v('color.surface.selected')})` : undefined,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', height: `var(${cssVarOf('type.body-sm', 'line-height')})` }}><RadioGroupItem value={value} style={{ width: v('selector.compact'), height: v('selector.compact') }} /></span>
      <span style={{ flex: 1, ...col('spacing.gap-tight') }}>
        <span style={{ color: v('color.content.primary'), ...type('body-sm') }}>{label}</span>
        <span style={{ color: v('color.content.secondary'), ...type('caption') }}>{hint}</span>
      </span>
    </label>
  )
}

/** Figma `FormModal` (1055:99): Modal tray; the visibility choice is two RadioCards side by side. */
export function FormModal(p: OverlayBlockProps) {
  const [visibility, setVisibility] = React.useState('private')
  return (
    <OverlayShell block="FormModal" {...p} layout="tray" title="Create project" description="Give it a name and choose who can see it." icon={glyph('folder-plus')} iconVariant="default"
      footer={<>{cancel(p, 'Cancel', 'ghost')}<Button onClick={p.onConfirm}>Create project</Button></>}>
      {body(<>
        <Field label="Project name"><Input defaultValue="Northwind Redesign" /></Field>
        <Field label="Description"><Input placeholder="What is this project for?" /></Field>
        <div data-part="visibility" style={col('spacing.gap-control')}>
          <span style={{ color: v('color.content.primary'), ...type('label') }}>Visibility</span>
          <RadioGroup value={visibility} onValueChange={setVisibility} aria-label="Visibility" style={{ display: 'flex', gap: v('spacing.gap-group') }}>
            <RadioCardOption value="private" label="Private" hint="Invite only" checked={visibility === 'private'} />
            <RadioCardOption value="workspace" label="Workspace" hint="All 12 members" checked={visibility === 'workspace'} />
          </RadioGroup>
        </div>
      </>)}
    </OverlayShell>
  )
}

/** Figma `SuccessModal` (1055:265): a success moment, two equal buttons. */
export function SuccessModal(p: OverlayBlockProps) {
  return (
    <OverlayShell block="SuccessModal" {...p} layout="simple" footerLayout="equal" title="Payment successful" description="Your Scale plan is active. A receipt for $2,988.00 is on its way to your inbox." icon={glyph('check-circle')} iconVariant="success"
      footer={<><Button variant="secondary">Download receipt</Button><Button onClick={p.onConfirm}>Go to dashboard</Button></>} />
  )
}

/** Figma `ErrorModal` (1055:346). */
export function ErrorModal(p: OverlayBlockProps) {
  return (
    <OverlayShell block="ErrorModal" {...p} layout="simple" footerLayout="equal" title="Payment declined" description="Your bank rejected the charge. No money was taken and your plan stays as it is." icon={glyph('x-circle')} iconVariant="critical"
      footer={<>{cancel(p, 'Stay on current plan')}<Button onClick={p.onConfirm}>Try again</Button></>} />
  )
}

/** Figma `FeedbackRating` (1055:404): Modal tray, a title only. */
export function FeedbackRating(p: OverlayBlockProps) {
  return (
    <OverlayShell block="FeedbackRating" {...p} layout="tray" title="How was your experience?"
      footer={<>{cancel(p, 'Not now', 'ghost')}<Button onClick={p.onConfirm}>Send feedback</Button></>}>
      {body(<>
        <div style={{ display: 'flex' }}><RatingGroup type="emoji" aria-label="Rating" /></div>
        <Field label="What could be better?"><Input placeholder="Optional, but it helps a lot" /></Field>
        <CheckboxItem size="xs" variant="secondary" defaultChecked label="You can follow up with me about this" />
      </>)}
    </OverlayShell>
  )
}

/** Figma `WarningDialog` (1055:548): the action stays disabled until the risk is acknowledged. */
export function WarningDialog(p: OverlayBlockProps) {
  const [ok, setOk] = React.useState(true)
  return (
    <OverlayShell block="WarningDialog" {...p} layout="simple" footerLayout="equal" title="Revoking this key breaks 4 integrations" description="GitHub, Slack, Linear and your CI pipeline authenticate with it." icon={glyph('key')} iconVariant="critical"
      footer={<>{cancel(p, 'Keep key')}<Button variant="critical" disabled={!ok} onClick={p.onConfirm}>Revoke anyway</Button></>}>
      {body(<CheckboxItem size="sm" variant="secondary" checked={ok} onCheckedChange={(c) => setOk(c === true)} label="I understand these integrations will need reconnecting" />)}
    </OverlayShell>
  )
}

const PEOPLE = [{ name: 'Liam O’Brien', mail: 'liam@escala.design', role: 'Owner', locked: true }, { name: 'Ayla Karagoz', mail: 'ayla@escala.design', role: 'Can edit', locked: false }]

/** Figma `ShareModal` (1055:613): Modal tray, no footer. `photos` are the people's avatars (the file's `photo-11`); without them the avatar draws its gradient. */
export function ShareModal({ photos, ...p }: OverlayBlockProps & { photos?: string[] }) {
  return (
    <OverlayShell block="ShareModal" {...p} layout="tray" title="Share Northwind Redesign">
      {body(<>
        <div data-part="invite" style={row()}><Input size="sm" placeholder="Add people by email" /><Button size="sm">Invite</Button></div>
        <div data-part="people" style={col('spacing.gap-group')}>
          {PEOPLE.map((person, i) => (
            <div key={person.mail} data-part="person" style={row('spacing.gap-control')}>
              <Avatar size="sm" type="image" alt={person.name} src={photos?.[i % (photos?.length || 1)]} />
              <div style={{ flex: 1, ...col('spacing.none') }}><span style={{ color: v('color.content.primary'), ...type('label') }}>{person.name}</span><span style={secondary}>{person.mail}</span></div>
              <Button size="sm" variant="secondary" appearance="ghost" disabled={person.locked} trailing={boxedGlyph('chevron-down', 'icon.small')}>{person.role}</Button>
            </div>
          ))}
        </div>
        <Separator />
        <div data-part="link-access" style={col('spacing.gap-control')}>
          <div style={row()}>
            {boxedGlyph('globe', 'icon.small')}
            <span style={{ flex: 1, color: v('color.content.primary'), ...type('label') }}>Anyone with the link</span>
            <Button size="sm" variant="secondary" appearance="ghost" trailing={boxedGlyph('chevron-down', 'icon.small')}>Can view</Button>
          </div>
          <div style={row()}><Input size="sm" placeholder="escala.design/s/nw-8f2a1" aria-label="Share link" /><IconButton size="sm" variant="secondary" appearance="outline" aria-label="Copy link" icon={boxedGlyph('copy', 'icon.small')} /></div>
        </div>
      </>)}
    </OverlayShell>
  )
}

/** Figma `SessionTimeoutWarning` (1055:793). */
export function SessionTimeoutWarning(p: OverlayBlockProps) {
  return (
    <OverlayShell block="SessionTimeoutWarning" {...p} layout="simple" footerLayout="equal" title="Still there?" description="For security, you will be signed out after 8 hours of inactivity." icon={glyph('clock')} iconVariant="warning"
      footer={<>{cancel(p, 'Sign out now')}<Button onClick={p.onConfirm}>Stay signed in</Button></>}>
      {body(<div role="timer" aria-live="off" style={{ textAlign: 'center', color: v('color.content.primary'), ...type('heading-lg') }}>01:58</div>)}
    </OverlayShell>
  )
}

const CART = [{ name: 'Escala UI Complete', hint: 'Design + code kit, lifetime', price: '$249', qty: 1 }, { name: 'Dashboard templates', hint: '12 screens', price: '$98', qty: 2 }, { name: 'Icon pack extended', hint: '1,200 icons', price: '$39', qty: 1 }]

/** Figma `CartDrawer` (1074:2954): the Modal, Layout=tray, Footer stacked. Line items, a subtotal and a discount, one Checkout. */
export function CartDrawer(p: OverlayBlockProps) {
  return (
    <OverlayShell block="CartDrawer" {...p} layout="tray" align="horizontal" footerLayout="stacked" focusPanel title="Your cart" trailing={<Badge type="number" appearance="solid" shape="pill" size="sm" count={3} />}
      footer={<Button onClick={p.onConfirm}>Checkout · $328.00</Button>}>
      {body(<>
        <div data-part="items" style={col('spacing.gap-group')}>
          {CART.map((item, i) => (
            <React.Fragment key={item.name}>
              {i > 0 && <Separator tone="subtle" />}
              <div data-part="line-item" style={{ ...row('spacing.gap-group'), alignItems: 'flex-start' }}>
                <Avatar type="icon" shape="rounded" appearance="solid" size="default" icon={glyph('cube')} />
                <div data-part="info" style={{ flex: 1, ...col('spacing.gap-tight') }}>
                  <div data-part="title-row" style={{ ...row(), alignSelf: 'flex-start' }}>
                    <span style={{ color: v('color.content.primary'), ...type('label') }}>{item.name}</span>
                    <Badge size="xs" appearance="soft" shape="rounded" variant="secondary">{item.price}</Badge>
                  </div>
                  <span style={secondary}>{item.hint}</span>
                  <NumberInput size="sm" min={1} defaultValue={item.qty} aria-label={`Quantity of ${item.name}`} />
                </div>
                <IconButton size="xs" variant="secondary" appearance="ghost" aria-label={`Remove ${item.name}`} icon={boxedGlyph('trash', 'icon.small')} />
              </div>
            </React.Fragment>
          ))}
        </div>
        <Separator tone="subtle" />
        <div data-part="summary" style={col('spacing.gap-control')}>
          <div data-part="summary-row" style={{ ...row(), justifyContent: 'space-between', ...type('body-sm') }}>
            <span style={{ color: v('color.content.secondary') }}>Subtotal</span><span style={{ color: v('color.content.primary') }}>$386.00</span>
          </div>
          <div data-part="summary-row" style={{ ...row(), justifyContent: 'space-between', color: v('color.status.success.content'), ...type('body-sm') }}>
            <span>Bundle discount</span><span>{'\u2212'}$58.00</span>
          </div>
        </div>
      </>)}
    </OverlayShell>
  )
}

/** Figma `QuickEditDialog` (1074:3374): Modal tray, 480 wide. */
export function QuickEditDialog(p: OverlayBlockProps) {
  return (
    <OverlayShell block="QuickEditDialog" {...p} layout="tray" title="Rename file" icon={glyph('pencil-simple')} iconVariant="secondary"
      footer={<>{cancel(p, 'Cancel', 'ghost')}<Button onClick={p.onConfirm}>Rename</Button></>}>
      {body(<div data-part="field" style={col('spacing.gap-control')}>
        <Input defaultValue="design-system-v1.1.fig" aria-label="File name" />
        <span style={{ color: v('color.content.secondary'), ...type('helper') }}>Extension stays the same. Links to this file keep working.</span>
      </div>)}
    </OverlayShell>
  )
}

/** Figma `FilterDrawer` (1074:3445): the Modal, Layout=tray (a drawer in name only). */
export function FilterDrawer(p: OverlayBlockProps) {
  const label = (text: string) => <span style={eyebrow}>{text}</span>
  return (
    <OverlayShell block="FilterDrawer" {...p} layout="tray" align="horizontal" title="Filters" trailing={<Button size="sm" variant="secondary" appearance="ghost">Reset</Button>}
      footer={<Button onClick={p.onConfirm}>Show 62 results</Button>}>
      {body(<>
        <div style={col('spacing.gap-control')}>{label('Price range')}<Slider defaultValue={[18.3, 51.2]} tooltipVisible tooltipText="$35" tooltipEndText="$65" aria-label="Price range" className="w-full!" /></div>
        <div style={col('spacing.gap-control')}>{label('Category')}
          <CheckboxItem size="xs" defaultChecked label="Design systems" /><CheckboxItem size="xs" label="Templates" /><CheckboxItem size="xs" defaultChecked label="Component kits" />
        </div>
        <div style={col('spacing.gap-control')}>{label('Availability')}<SwitchGroup label="In stock only" defaultChecked placement="right" rowStyle={{ width: '100%' }} /></div>
      </>)}
    </OverlayShell>
  )
}

/** Figma `FilterModal` (1074:3596): Modal tray; no Clear all in the header. */
export function FilterModal(p: OverlayBlockProps) {
  const facets: [string, string[], string[]][] = [['Role', ['Owner', 'Admin', 'Editor', 'Member'], ['Owner', 'Editor']], ['Status', ['Active', 'Pending', 'Suspended'], ['Active']]]
  const facetLabel = (text: string) => <span style={{ color: v('color.content.primary'), ...type('label') }}>{text}</span>
  return (
    <OverlayShell block="FilterModal" {...p} layout="tray" title="Filter members"
      leading={<span style={secondary}>7 results</span>} footer={<Button onClick={p.onConfirm}>Apply</Button>}>
      {body(<>
        {facets.map(([label, options, on]) => (
          <div key={label} data-part="facet" style={col('spacing.gap-control')}>{facetLabel(label)}
            <div style={{ ...row(), flexWrap: 'wrap' }}>{options.map((o) => <Chip key={o} size="sm" shape="pill" appearance="outline" selected={on.includes(o)}>{o}</Chip>)}</div></div>
        ))}
        <div data-part="facet" style={col('spacing.gap-control')}>{facetLabel('Last active')}
          <SegmentedControl size="sm" defaultValue="Any" aria-label="Last active"><SegmentedControlItem value="Any" label="Any" /><SegmentedControlItem value="7 days" label="7 days" /><SegmentedControlItem value="30 days" label="30 days" /></SegmentedControl></div>
      </>)}
    </OverlayShell>
  )
}

/** Figma `ReleaseModal` (1074:3824): Modal tray with no ModalHeader. A media tile, a badge, the headline and the highlights all sit in the Content slot. */
export function ReleaseModal(p: OverlayBlockProps) {
  const highlights = ['15 overlay blocks built on Modal', 'Desktop and mobile layouts on every section', 'Light and Dark through Color Semantics modes']
  return (
    <OverlayShell block="ReleaseModal" {...p} layout="tray" headerless title="Blocks are here"
      leading={<Button variant="secondary" appearance="ghost">Read the changelog</Button>} footer={<Button onClick={p.onConfirm}>Explore blocks</Button>}>
      {body(<>
        <div data-part="media" style={{ display: 'grid', placeItems: 'center', height: 'calc(var(--spacing-32) + var(--spacing-8))', overflow: 'hidden', borderRadius: v('radius.container'), backgroundColor: v('color.surface.accent') }}>
          <FeaturedIcon size="xl" variant="default" appearance="solid" shape="rounded" icon={glyph('sparkle')} />
        </div>
        <div style={{ display: 'flex' }}><Badge size="sm" variant="info" appearance="soft" shape="rounded">Released today</Badge></div>
        <ModalTitle style={{ color: v('color.content.primary'), ...type('heading-md') }}>Blocks are here</ModalTitle>
        <ModalDescription style={{ color: v('color.content.secondary'), ...type('body-md') }}>Ready-to-use compositions across Auth, Navigation, Overlay and Marketing, all built from component instances.</ModalDescription>
        <ul data-part="highlights" style={{ ...col('spacing.gap-control'), margin: 0, padding: 0, listStyle: 'none' }}>
          {highlights.map((h) => (
            <li key={h} style={{ ...row(), padding: v('spacing.gap-control'), borderRadius: v('radius.action'), backgroundColor: v('color.surface.muted'), color: v('color.content.primary'), ...type('body-sm') }}>
              <span style={{ display: 'inline-flex', color: v('color.content.accent') }}>{boxedGlyph('check', 'icon.small')}</span>{h}
            </li>
          ))}
        </ul>
      </>)}
    </OverlayShell>
  )
}

/** Figma `CookieConsent` (1074:3929): Modal tray; Essential is always on, Analytics starts on, Marketing off. */
export function CookieConsent(p: OverlayBlockProps) {
  const rows: [string, string, boolean, boolean][] = [['Essential', 'Always active', true, true], ['Analytics', 'Anonymous usage data', true, false], ['Marketing', 'Ad measurement', false, false]]
  return (
    <OverlayShell block="CookieConsent" {...p} layout="tray" title="We use cookies" description="Essential cookies keep the app working. Analytics cookies help us improve it."
      leading={<Button variant="secondary" appearance="ghost">Reject all</Button>} footer={<><Button variant="secondary" appearance="ghost">Save choices</Button><Button onClick={p.onConfirm}>Accept all</Button></>}>
      {body(<>
        {rows.map(([label, hint, checked, locked], i) => (
          <React.Fragment key={label}>{i > 0 && <Separator tone="subtle" />}<SwitchGroup label={label} description={hint} defaultChecked={checked} disabled={locked} placement="right" rowStyle={{ width: '100%' }} /></React.Fragment>
        ))}
      </>)}
    </OverlayShell>
  )
}

export const OVERLAY_BLOCKS = {
  ConfirmDialog, DestructiveConfirm, FormModal, SuccessModal, ErrorModal, FeedbackRating, WarningDialog, ShareModal,
  SessionTimeoutWarning, CartDrawer, QuickEditDialog, FilterDrawer, FilterModal, ReleaseModal, CookieConsent,
} as const
