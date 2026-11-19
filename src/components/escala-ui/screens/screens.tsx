// Escala screens: the Figma file's `SettingsPage` (2223:838) and `IssueBoardPage` (2223:839) — whole screens composed
// from components only, nothing drawn of their own. Each screen keeps its pieces: SettingsSection and SettingsRow live
// on SettingsPage, BoardColumn and IssueCard on IssueBoardPage. Storybook (`Screens/<Name>`) and the platform's Screens
// tab render these same functions. Motion: none beyond the components'.
import { Avatar } from '../avatar'
import { Badge } from '../badge'
import { BoardColumn } from '../board-column'
import { Input } from '../input'
import { IssueCard } from '../issue-card'
import { SettingsRow } from '../settings-row'
import { SettingsSection } from '../settings-section'
import { Switch } from '../switch'

export type ScreenLayout = 'desktop' | 'mobile'

/** Figma `SettingsPage`: two sections of rows. On a phone the switch rows stack, as the file's Mobile frame has them. */
export function SettingsPage({ layout = 'desktop' }: { layout?: ScreenLayout }) {
  const rows = layout === 'mobile' ? 'stacked' : 'inline'
  return (
    <main style={{ background: 'var(--color-surface-page)', padding: 'var(--spacing-inset-page)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-section)' }}>
        <SettingsSection title="Profile" description="How you appear across Ohmewn.">
          <SettingsRow layout="stacked" title="Display name" description="Shown on your issues and comments." control={<Input defaultValue="Inès Moreau" />} />
          <SettingsRow layout="stacked" title="Email" control={<Input type="email" defaultValue="ines@ohmewn.app" />} />
        </SettingsSection>
        <SettingsSection title="Notifications" description="Choose what reaches your inbox.">
          <SettingsRow layout={rows} title="Email notifications" description="Send a summary of activity every morning." control={<Switch defaultChecked />} />
          <SettingsRow layout={rows} title="Product updates" description="Tell me when a new feature ships." control={<Switch />} />
        </SettingsSection>
      </div>
    </main>
  )
}

const LANES = [
  { title: 'Backlog', issues: [{ k: 'PAY-312', t: 'Support split payments across two cards', tag: 'Payments' }, { k: 'PAY-298', t: 'Retry failed webhooks with backoff', tag: 'Platform' }] },
  { title: 'In progress', issues: [{ k: 'PAY-305', t: 'Show tax on the order summary', tag: 'Checkout' }] },
  { title: 'In review', issues: [{ k: 'PAY-287', t: 'Refund to the original payment method', tag: 'Payments' }] },
  { title: 'Done', issues: [{ k: 'PAY-271', t: 'Export invoices as PDF', tag: 'Billing' }] },
]

/** Figma `IssueBoardPage`: four BoardColumns of IssueCards, scrolling sideways when they do not fit. `photos` are the
 *  assignees' faces (the file's `photo-*`); without them each Avatar draws its gradient. */
export function IssueBoardPage({ photos = [] }: { photos?: readonly string[] }) {
  return (
    <main style={{ background: 'var(--color-surface-page)', padding: 'var(--spacing-inset-page)', display: 'flex', gap: 'var(--spacing-gap-group)', overflowX: 'auto', alignItems: 'flex-start' }}>
      {LANES.map((lane, li) => (
        <div key={lane.title} style={{ width: 272, flexShrink: 0 }}>
          <BoardColumn title={lane.title} count={lane.issues.length}>
            {lane.issues.map((i, ii) => (
              <IssueCard key={i.k} href="#" issueKey={i.k} title={i.t} comments="3" due="Nov 20"
                assignee={<Avatar type="image" size="xs" shape="circle" src={photos.length ? photos[(li * 2 + ii) % photos.length] : undefined} aria-label="Assignee" />}
                tag={<Badge appearance="soft" shape="rounded" size="sm" type="default" variant="info">{i.tag}</Badge>} />
            ))}
          </BoardColumn>
        </div>
      ))}
    </main>
  )
}
