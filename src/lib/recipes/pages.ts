/**
 * The pieces of the PAGES category (DEC-2026-11-18-011). Figma owns the anatomy:
 * SettingsRow 2225:89, SettingsSection 2224:123, IssueCard 2228:160, BoardColumn 2228:161.
 */
import { c, FOCUS, part, type ComponentRecipe } from './helpers.js'

export const SETTINGS_ROW_LAYOUTS = ['inline', 'stacked'] as const
export const SETTINGS_ROW: ComponentRecipe = {
  key: 'SettingsRow',
  slots: ['root', 'text', 'title', 'description', 'control'],
  defaults: { Layout: 'inline' },
  parts: [
    part({}, () => ({
      root: { paddingY: 'spacing.gap-group', stroke: c('border.subtle'), strokeBottomWidth: 'stroke.divider' },
      text: { gap: 'spacing.gap-tight' },
      title: { text: c('content.primary'), font: 'type.label' },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
    })),
    part({ Layout: SETTINGS_ROW_LAYOUTS }, (layout) => ({ root: { gap: layout === 'inline' ? 'spacing.gap-section' : 'spacing.gap-control' } })),
  ],
}

export const SETTINGS_SECTION: ComponentRecipe = {
  key: 'SettingsSection',
  slots: ['root', 'header', 'title', 'description', 'content'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-control' },
      header: { gap: 'spacing.gap-tight' },
      title: { text: c('content.primary'), font: 'type.heading-2xs' },
      description: { text: c('content.secondary'), font: 'type.body-md' },
    })),
  ],
}

export const ISSUE_CARD_STATES = ['Default', 'Hover', 'Dragging'] as const
export const ISSUE_CARD: ComponentRecipe = {
  key: 'IssueCard',
  slots: ['root', 'header', 'key', 'issueKey', 'pullRequest', 'title', 'meta', 'icon', 'comments', 'due'],
  defaults: { State: 'Default' },
  parts: [
    part({}, () => ({
      // Figma lays the card's 1px stroke out (`strokesIncludedInLayout`): content starts at 13, so 104 = 1 + 12 + 78 + 12 + 1.
      root: { fill: c('surface.layer-2'), radius: 'radius.action', paddingX: 'spacing.inset-control+stroke.divider', paddingY: 'spacing.inset-control+stroke.divider', gap: 'spacing.gap-control', strokeWidth: 'stroke.divider' },
      'root:focus-visible': { ...FOCUS },
      key: { gap: 'spacing.gap-control' },
      issueKey: { text: c('content.secondary'), font: 'type.caption' },
      pullRequest: { gap: 'spacing.gap-tight', text: c('content.secondary'), font: 'type.caption' },
      title: { text: c('content.primary'), font: 'type.label' },
      meta: { gap: 'spacing.gap-control', rowGap: 'spacing.gap-tight' },
      icon: { width: 'icon.small', height: 'icon.small', text: c('content.secondary') },
      comments: { gap: 'spacing.gap-tight', text: c('content.secondary'), font: 'type.caption' },
      due: { gap: 'spacing.gap-tight', text: c('content.secondary'), font: 'type.caption' },
    })),
    part({ State: ISSUE_CARD_STATES }, (state) => ({
      root: state === 'Dragging' ? { stroke: c('border.accent'), shadow: 'shadow.lg' }
        : { stroke: c(state === 'Hover' ? 'border.strong' : 'border.default'), shadow: 'shadow.xs' },
    })),
  ],
}

export const BOARD_COLUMN: ComponentRecipe = {
  key: 'BoardColumn',
  slots: ['root', 'header', 'statusIcon', 'title', 'count', 'addIcon', 'content'],
  defaults: {},
  parts: [
    part({}, () => ({
      root: { fill: c('surface.layer-1'), radius: 'radius.container', paddingX: 'spacing.gap-control', paddingY: 'spacing.gap-control', gap: 'spacing.gap-control' },
      header: { gap: 'spacing.gap-control' },
      statusIcon: { width: 'icon.small', height: 'icon.small', text: c('content.secondary') },
      title: { text: c('content.primary'), font: 'type.label' },
      count: { text: c('content.secondary'), font: 'type.caption' },
      addIcon: { width: 'icon.small', height: 'icon.small' },
      content: { gap: 'spacing.gap-control' },
    })),
  ],
}
