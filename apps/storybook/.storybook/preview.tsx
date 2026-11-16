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
const withEscala: Decorator = (Story, ctx) => (
  <EscalaScope
    appearance={(ctx.globals.theme ?? 'light') as 'light' | 'dark'}
    viewport={(ctx.globals.viewport ?? 'desktop') as GridViewport}
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
    viewport: {
      // One mode for both collections: Figma's Dimension Semantics and
      // Typography share the Desktop · Tablet · Mobile modes.
      description: 'Dimension Semantics + Typography mode',
      toolbar: {
        title: 'Dimension Semantics · Typography', icon: 'browser', dynamicTitle: true,
        items: [{ value: 'desktop', title: 'Desktop' }, { value: 'tablet', title: 'Tablet' }, { value: 'mobile', title: 'Mobile' }],
      },
    },
  },
  initialGlobals: { theme: 'light', viewport: 'desktop' },
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
        order: ['Getting started', ['Introduction'], 'Variables', ['Color', 'Font', 'Radius', 'Spacing', 'Shadow', 'Grid', 'Sizes', 'Stroke', 'Icons', 'Motion'], 'Buttons', 'Forms', 'Indicators', 'Content & Surfaces', 'Feedback', 'Navigation'],
      },
    },
  },
}
export default preview
