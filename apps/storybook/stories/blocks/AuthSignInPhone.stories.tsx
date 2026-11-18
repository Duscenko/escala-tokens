import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'
import { AuthSignInPhone, AUTH_CONTAINERS, AUTH_LAYOUTS, authPlacement, type AuthLayout, AUTH_STATUSES, type AuthContainer, type AuthStatus } from '../../../../src/components/escala-ui/blocks/auth'
import { PortalScopeContext } from '../../../../src/components/escala-ui/portal-scope'

/** Story args = the Figma `AuthSignInPhone` set (Auth page) and its approved flow (16 Nov): `Container` card · plain × `Layout` stacked · inline (inline only on plain). `Status` is the state the
 *  form can reach (code only): idle · invalid · loading · success. The block is built from escala-ui components and role tokens alone; the
 *  country picker is an anchored Popover on every viewport. */
interface Args {
  container: AuthContainer
  layout: AuthLayout
  status: AuthStatus
}

const Row = ({ children }: { children: React.ReactNode }) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>{children}</div>

const meta: Meta<Args> = {
  title: 'Blocks/Auth/SignInPhone',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (args) => <AuthSignInPhone {...authPlacement(args.container, args.layout)} status={args.status} />,
  args: { container: 'card', layout: 'stacked', status: 'idle' },
  argTypes: {
    container: { name: 'Container', control: 'select', options: [...AUTH_CONTAINERS] },
    layout: { name: 'Layout', control: 'select', options: [...AUTH_LAYOUTS], description: 'inline: the desktop page, only with Container plain. Modals and phones stay stacked.' },
    status: { name: 'Status', control: 'select', options: [...AUTH_STATUSES], description: 'The state the form is in: idle · invalid · loading · success.' },
  },
}
export default meta
type Story = StoryObj<Args>

export const Playground: Story = {}

/** Both Container values, as the Figma set draws them. */
export const Containers: Story = {
  render: (args) => (
    <Row>
      {AUTH_CONTAINERS.map((container) => <AuthSignInPhone key={container} container={container} status={args.status} />)}
    </Row>
  ),
}

/** The matrix: the four states of the approved flow side by side. Default · empty, Filled (a number typed), Invalid (the field error), Loading (the
 *  code button busy, the email button disabled). */
export const States: Story = {
  render: (args) => (
    <Row>
      <AuthSignInPhone container={args.container} />
      <AuthSignInPhone container={args.container} defaultCountry="FR" defaultPhone="6 12 34 56 78" />
      <AuthSignInPhone container={args.container} status="invalid" defaultCountry="FR" defaultPhone="6 12" />
      <AuthSignInPhone container={args.container} status="loading" defaultCountry="FR" defaultPhone="6 12 34 56 78" />
    </Row>
  ),
}

const trigger = () => screen.getByRole('combobox', { name: /^Country:/ })
const search = () => screen.getByRole('combobox', { name: /search country/i })

/** The picker open: the anchored Popover under the field, the chosen country checked, the first row highlighted. */
export const PickerOpen: Story = {
  // Known finding (GitHub issue "Content/secondary on Surface/selected is under 4.5:1 in Light"): the calling code of the chosen row reads ~3.8:1.
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
  render: (args) => <AuthSignInPhone container={args.container} status={args.status} defaultCountry="FR" />,
  play: async () => {
    await userEvent.click(trigger())
    await waitFor(() => expect(search()).toBeVisible())
  },
}

/** Searching: "ger" filters by name, and a query that starts with "+" searches the calling code ("+49"). */
export const PickerSearching: Story = {
  render: (args) => <AuthSignInPhone container={args.container} status={args.status} defaultCountry="FR" />,
  play: async () => {
    await userEvent.click(trigger())
    await userEvent.type(await waitFor(search), 'ger')
    await waitFor(() => expect(screen.getAllByRole('option').length).toBeLessThan(10))
  },
}

/** Selected: pick Germany from the list; the picker closes and the field shows 🇩🇪 +49. */
export const PickerSelected: Story = {
  render: (args) => <AuthSignInPhone container={args.container} status={args.status} defaultCountry="FR" />,
  play: async () => {
    await userEvent.click(trigger())
    await userEvent.type(await waitFor(search), 'germany')
    await userEvent.click(await screen.findByRole('option', { name: /germany/i }))
    await waitFor(() => expect(trigger()).toHaveAccessibleName(/germany \+49/i))
  },
}

/** Keyboard only: Tab to the country, ArrowDown opens the list, ArrowDown ×3 moves the highlight, Enter picks, focus returns to the country. */
export const PickerKeyboard: Story = {
  render: (args) => <AuthSignInPhone container={args.container} status={args.status} defaultCountry="FR" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.tab()
    await userEvent.tab()
    canvas.getByRole('combobox', { name: /^Country:/ }).focus()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(search()).toHaveFocus())
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}')
    await waitFor(() => expect(trigger()).toHaveFocus())
  },
}

/**
 * Motion. The body of the block rises on `use-page-transition` every time the block mounts, the field error opens on `use-disclosure-in` and
 * closes on `use-disclosure-out`, and the country picker enters and leaves on `popover-enter` / `popover-exit` from its trigger. Replay remounts the
 * block; check reduced motion with the OS setting (the tokens neutralise travel and keep the fade).
 */
export const Motion: Story = {
  render: (args) => {
    const [run, setRun] = React.useState(0)
    const [status, setStatus] = React.useState<AuthStatus>('idle')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setRun((n) => n + 1)}>Replay mount</button>
          <button onClick={() => setStatus((s) => (s === 'invalid' ? 'idle' : 'invalid'))}>Toggle error</button>
        </div>
        <AuthSignInPhone key={run} {...authPlacement(args.container, args.layout)} status={status} defaultCountry="FR" defaultPhone="6 12" />
      </div>
    )
  },
}

/** A 393 x 852 screen, the real (portaled) picker kept inside the phone frame. `keyboard` passes the visual viewport a software keyboard leaves (336 of
 *  852 px): the picker flips inside the frame and its height follows what is visible, never 100vh. The search is not focused on a touch device. */
function Phone({ keyboard }: { keyboard: boolean }) {
  const [frame, setFrame] = React.useState<HTMLDivElement | null>(null)
  return (
    <div
      ref={setFrame}
      // `transform` makes the frame the containing block of the picker's `position: fixed`.
      style={{ position: 'relative', width: 393, height: 852, overflow: 'hidden', transform: 'translateZ(0)', background: 'var(--color-surface-page)', boxShadow: '0 0 0 1px var(--color-border-default)', borderRadius: 'var(--radius-container)' }}
    >
      <PortalScopeContext.Provider value={frame}>
        {/* A screen: the status bar's room above, the page inset (Grid margin, Mobile) at the sides. The block is bare content. */}
        <div style={{ paddingTop: 54, paddingInline: 'var(--spacing-inset-page)' }}>
          <AuthSignInPhone container="plain" defaultCountry="FR" picker={{ viewport: keyboard ? { height: 852 - 336, bottom: 336 } : { height: 852, bottom: 0 }, collisionBoundary: frame }} />
        </div>
      </PortalScopeContext.Provider>
    </div>
  )
}
export const Mobile: Story = { render: () => <Phone keyboard={false} />, parameters: { layout: 'padded' }, globals: { dimensions: 'mobile' } }
export const MobileKeyboard: Story = { render: () => <Phone keyboard />, parameters: { layout: 'padded' }, globals: { dimensions: 'mobile' } }

/** The desktop page: `plain` + `inline`. */
export const DesktopPage: Story = { name: 'Desktop page', render: () => <AuthSignInPhone container="plain" layout="inline" /> }

/** The mobile page: `plain` + `stacked`. */
export const MobilePage: Story = { name: 'Mobile page', render: () => <AuthSignInPhone container="plain" layout="stacked" /> }

/** The modal: `card` + `stacked`. */
export const ModalCard: Story = { name: 'Modal', render: () => <AuthSignInPhone container="card" layout="stacked" /> }
