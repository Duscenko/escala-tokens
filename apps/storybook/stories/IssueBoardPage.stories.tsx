import type { Meta, StoryObj } from '@storybook/react-vite'
import { DESKTOP_FRAME } from '../../../src/components/escala-ui/blocks/frames'
import { ScreenPrototype } from '../../../src/components/escala-ui/screens/prototype'
import { IssueBoardPage } from '../../../src/components/escala-ui/screens/screens'
import { SCREEN_SITEMAP } from '../../../src/components/escala-ui/screens/sitemap'
import { AVATAR_PHOTOS } from './avatarPhotos'
import { EscalaScope } from '../.storybook/escalaScope'

/** The Figma `IssueBoardPage · Prototype` section (2231:182): the 1440 build in `DocWindow` (Light · window 2266:5962,
 *  Dark · window 2266:8016) and the 390 mobile frame (2231:16964). A screen composed from components only; its pieces,
 *  BoardColumn and IssueCard, are parts of this entry. The window walks the sitemap: the account menu opens Settings.
 *  Below `breakpoint.md` (768) the screen draws its mobile build. Motion: none beyond the components. */
interface Args { path: string }
const PATHS = SCREEN_SITEMAP.map((e) => e.path)
/** The mobile frame paints in the Mobile mode of Dimension Semantics · Typography, as the file's 390 frames do,
 *  whatever the toolbar says: a nested scope, so the window beside it keeps Desktop. */
const phone = (path: string, theme: unknown) => (
  <EscalaScope appearance={theme === 'dark' ? 'dark' : 'light'} viewport="mobile" padding={0}>
    <ScreenPrototype layout="mobile" initialPath={path} photos={AVATAR_PHOTOS} />
  </EscalaScope>
)
const centred = { display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 48, gap: 48, flexWrap: 'wrap' } as const

const meta: Meta<Args> = {
  title: 'Screens/IssueBoardPage',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  args: { path: '/payments/board' },
  argTypes: { path: { name: 'Path (sitemap)', control: 'select', options: PATHS } },
  render: ({ path }) => <div style={centred}><ScreenPrototype initialPath={path} photos={AVATAR_PHOTOS} /></div>,
}
export default meta
type Story = StoryObj<Args>

/** `Light · window`: the desktop build at 0.75 in DocWindow, its address pill showing the path. */
export const Playground: Story = { name: 'Prototype' }
/** `Dark · window`. */
export const PrototypeDark: Story = { name: 'Prototype · Dark', globals: { theme: 'dark' } }
/** `Light · IssueBoardPage · mobile`: one lane in view, the next peeking. */
export const Mobile: Story = { render: ({ path }, ctx) => <div style={centred}>{phone(path, ctx.globals.theme)}</div> }
/** `Dark · IssueBoardPage · mobile`. */
export const MobileDark: Story = { ...Mobile, name: 'Mobile · Dark', globals: { theme: 'dark' } }
/** Both breakpoints side by side, as the Prototype section lays them out. */
export const Breakpoints: Story = {
  render: ({ path }, ctx) => (
    <div style={centred}>
      <ScreenPrototype initialPath={path} photos={AVATAR_PHOTOS} />
      {phone(path, ctx.globals.theme)}
    </div>
  ),
}
/** `_Screen / IssueBoardPage · desktop`: the 1440 × 900 build at true size. */
export const Desktop: Story = { render: () => <div style={{ width: DESKTOP_FRAME.width, height: DESKTOP_FRAME.height }}><IssueBoardPage photos={AVATAR_PHOTOS} /></div> }
/** The screen on the whole canvas, `layout="auto"`: narrow the canvas below 768 and it switches to the mobile build. */
export const Responsive: Story = { render: () => <div style={{ height: '100vh' }}><IssueBoardPage layout="auto" photos={AVATAR_PHOTOS} /></div> }
