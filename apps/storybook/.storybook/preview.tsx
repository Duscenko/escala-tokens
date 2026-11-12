import type { Decorator, Preview } from '@storybook/react-vite'
import '../../../src/index.css'
import { RecipeScope } from '../../../src/components/configurator/docs/skeleton/scope'
import { resolvePreviewTokens } from '../../../src/lib/previewTokens'
import { ensureColorScales } from '../../../src/lib/colorActions'
import { useDesignStore } from '../../../src/store/useDesignStore'
import type { GridViewport } from '../../../src/lib/layoutTokens'

// The default Escala system, with its ramps generated (a fresh store ships them
// empty until the first colour edit).
ensureColorScales()

/** Every story paints with the system's real tokens: the recipe stylesheet
 *  reads `var(--…)`, RecipeScope supplies the values for the theme and the
 *  viewport picked in the toolbar — the Figma file's Color Semantics and
 *  Dimension Semantics modes. */
const withEscala: Decorator = (Story, ctx) => {
  const appearance = (ctx.globals.theme ?? 'light') as 'light' | 'dark'
  const viewport = (ctx.globals.viewport ?? 'desktop') as GridViewport
  const t = resolvePreviewTokens(useDesignStore.getState(), appearance, appearance, viewport)
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
      toolbar: { title: 'Theme', icon: 'mirror', items: [{ value: 'light', title: 'Escala Light' }, { value: 'dark', title: 'Escala Dark' }], dynamicTitle: true },
    },
    viewport: {
      description: 'Dimension Semantics + Typography mode',
      toolbar: { title: 'Viewport', icon: 'browser', items: ['desktop', 'tablet', 'mobile'], dynamicTitle: true },
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
