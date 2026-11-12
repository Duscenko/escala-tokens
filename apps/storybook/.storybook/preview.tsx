import type { Decorator, Preview } from '@storybook/react-vite'
import './storybook.css'
import { RecipeScope } from '../../../src/components/configurator/docs/skeleton/scope'
import { resolvePreviewTokens } from '../../../src/lib/previewTokens'
import { buildStudioTokens } from '../../../src/lib/pluginStudio'
import { useDesignStore } from '../../../src/store/useDesignStore'
import type { GridViewport } from '../../../src/lib/layoutTokens'

/** The brand of the Figma file `Escala Design System (Real)` — its
 *  `Action/primary/default` in Escala Light. */
export const FIGMA_FILE_ACCENT = '#874fff'

// The system the Figma file holds, built exactly as the plugin's ground-truth
// check builds it (`check-ground-truth.mjs --values` is green against the
// file): a BRAND minted from the accent, with its own neutral and pages. A
// retint of the default system is not the same thing — its ramp solves tone 11
// against another page (Action/primary/pressed came out #7252c9, not #6945c1).
const built = buildStudioTokens({ accent: FIGMA_FILE_ACCENT, name: 'Escala' }, 'pro')
if ('error' in built) throw new Error(`Storybook: could not build the Figma file's system — ${built.error}`)
const { themeOrder, themeSources } = useDesignStore.getState()
/** The brand the stories paint with: the one the studio just minted. */
const BRAND = themeOrder.find((k) => themeSources?.[k]) ?? themeOrder[0]

/** Every story paints with the system's real tokens: the recipe stylesheet
 *  reads `var(--…)`, RecipeScope supplies the values for the theme and the
 *  viewport picked in the toolbar — the Figma file's Color Semantics and
 *  Dimension Semantics modes. */
const withEscala: Decorator = (Story, ctx) => {
  const appearance = (ctx.globals.theme ?? 'light') as 'light' | 'dark'
  const viewport = (ctx.globals.viewport ?? 'desktop') as GridViewport
  const t = resolvePreviewTokens(useDesignStore.getState(), BRAND, appearance, viewport)
  return (
    <div className={appearance} style={{ background: t.surface, padding: 32, minHeight: '100vh' }}>
      <RecipeScope t={t}>
        <Story />
      </RecipeScope>
    </div>
  )
}

const preview: Preview = {
  decorators: [withEscala],
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
  },
}
export default preview
