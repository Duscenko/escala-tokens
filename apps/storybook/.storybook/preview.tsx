import type { Decorator, Preview } from '@storybook/react-vite'
import './storybook.css'
import type { GridViewport } from '../../../src/lib/layoutTokens'
import { ComponentDocPage } from '../docs/ComponentDocPage'
import { escalaDocsTheme } from './escalaTheme'
import { EscalaScope } from './escalaScope'

/** Every story paints with the system's real tokens for the theme and the viewport picked in the toolbar — the
 *  Figma file's Color Semantics and Dimension Semantics modes. On a Documentation page the story sits in a block of
 *  its own: no full-screen height there, and the page paint grows with a story wider than the block (the block scrolls
 *  sideways; the white would stop at the block's width and show the dark behind). */
const isPlayground = (name: string) => name === 'Playground' || name.endsWith(' · Playground')
const withEscala: Decorator = (Story, ctx) => (
  <EscalaScope
    // A component's Playground is a stage (centred, a minimum height); matrices and blocks keep the page layout.
    stage={isPlayground(ctx.name) && !ctx.title.startsWith('Blocks/')}
    appearance={(ctx.globals.theme ?? 'light') as 'light' | 'dark'}
    viewport={(ctx.globals.dimensions ?? 'desktop') as GridViewport}
    fullHeight={ctx.viewMode !== 'docs'}
    growWidth={ctx.viewMode === 'docs'}
  >
    <Story />
  </EscalaScope>
)

const preview: Preview = {
  decorators: [withEscala],
  // Every component gets a "Documentation" page first in its folder (main.ts names it), drawn by ComponentDocPage
  // from the catalogue and the Figma contract.
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: 'Color Semantics mode',
      toolbar: { title: 'Color Semantics', icon: 'mirror', items: [{ value: 'light', title: 'Escala Light' }, { value: 'dark', title: 'Escala Dark' }], dynamicTitle: true },
    },
    // NOT `viewport`: that is Storybook's own viewport tool. Sharing the key made "Desktop" also emulate a 1280×1024
    // screen, so every story sat in a frame wider and taller than the canvas, cut on the right and at the bottom.
    dimensions: {
      // One mode for both collections: Figma's Dimension Semantics and
      // Typography share the Desktop · Tablet · Mobile modes.
      description: 'Dimension Semantics + Typography mode',
      toolbar: {
        title: 'Dimension Semantics · Typography', icon: 'browser', dynamicTitle: true,
        items: [{ value: 'desktop', title: 'Desktop' }, { value: 'tablet', title: 'Tablet' }, { value: 'mobile', title: 'Mobile' }],
      },
    },
  },
  initialGlobals: { theme: 'light', dimensions: 'desktop' },
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    // Accessibility is a gate, not a hint: a violation fails the story.
    a11y: { test: 'error' },
    docs: { page: ComponentDocPage, theme: escalaDocsTheme, codePanel: true },
    options: {
      // Getting started, then the tokens (Variables), then the components by Figma page. A literal list: storySort must be
      // self-contained (Storybook evaluates it on its own). The Variables names are FOUNDATION_DOCS' labels.
      storySort: {
        order: ['Getting started', ['Introduction'], 'Variables', ['Color', 'Font', 'Radius', 'Spacing', 'Shadow', 'Grid', 'Sizes', 'Stroke', 'Icons', 'Motion'], 'Buttons', 'Forms', 'Indicators', 'Content & Surfaces', 'Feedback', 'Navigation', 'Blocks', 'Screens'],
      },
    },
  },
}
export default preview
