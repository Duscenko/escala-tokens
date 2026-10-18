/**
 * Feedback recipes: InlineAlert, AlertBanner, Toast. Rules as in `componentRecipes.ts`.
 * A severity reads its OWN roles (`status.<sev>.*`); the catalogue's `Error` is `critical` here.
 */
import { c, part, type ComponentRecipe, type SlotProps } from './helpers'

const SEV: Record<string, string> = { Info: 'info', Success: 'success', Warning: 'warning', Error: 'critical' }
const STATUSES = ['Info', 'Success', 'Warning', 'Error'] as const

function box(status: string): SlotProps {
  const s = SEV[status]
  return {
    fill: c(`status.${s}.surface`), stroke: c(`status.${s}.border`), strokeWidth: 'stroke.control',
    radius: 'radius.container', text: c('content.primary'),
  }
}

export const INLINE_ALERT: ComponentRecipe = {
  key: 'InlineAlert',
  slots: ['root', 'icon', 'body', 'title', 'description'],
  defaults: { Status: 'Info' },
  parts: [
    part({}, () => ({
      root: { paddingX: 'spacing.4', paddingY: 'spacing.4', gap: 'spacing.2_5' },
      body: { gap: 'spacing.1' },
      title: { font: 'type.button' },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
    })),
    part({ Status: STATUSES }, (status) => ({
      root: box(status),
      icon: { text: c(`status.${SEV[status]}.content`) },
    })),
  ],
}

export const ALERT_BANNER: ComponentRecipe = {
  key: 'AlertBanner',
  slots: ['root', 'icon', 'message', 'action', 'close'],
  defaults: { Status: 'Info' },
  parts: [
    part({}, () => ({
      root: { paddingX: 'spacing.4', paddingY: 'spacing.2_5', gap: 'spacing.2_5' },
      message: { font: 'type.body-sm' },
      action: { font: 'type.button' },
      close: { text: c('content.secondary') },
    })),
    part({ Status: STATUSES }, (status) => ({
      root: box(status),
      icon: { text: c(`status.${SEV[status]}.content`) },
      action: { text: c(`status.${SEV[status]}.content`) },
    })),
  ],
}

export const TOAST: ComponentRecipe = {
  key: 'Toast',
  slots: ['root', 'message', 'action', 'close'],
  defaults: { Status: 'Success' },
  parts: [
    // The inverse snackbar: `surface.inverse` with `content.inverse` ink, so it
    // reads in both appearances. Status picks the message, not the colours.
    part({}, () => ({
      root: {
        fill: c('surface.inverse'), text: c('content.inverse'), radius: 'radius.container', shadow: 'shadow.xl',
        paddingX: 'spacing.gap-group', paddingY: 'spacing.gap-control', gap: 'spacing.2',
      },
      message: { font: 'type.body-sm' },
      action: { font: 'type.button' },
      close: { font: 'type.button' },
    })),
  ],
}
