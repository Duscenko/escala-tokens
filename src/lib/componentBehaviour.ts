/**
 * Behaviour an Escala component adds on top of (or without) a library primitive — the keys and focus
 * model written in its own source, which `contractBehaviour.ts` cannot derive from an import
 * (design-plans/agent-ready-contracts.md, Phase 3). Storybook / code owns behaviour
 * (DEC-2026-11-16-007): each entry restates what the component file does, names that file's handler
 * in `source`, and the story that shows it in `story`. Static components say so explicitly
 * (`pattern: null`, no keys), so "not interactive" is a decision, not a gap.
 *
 * Pure data, no imports: `componentContracts.ts` reads it into `behaviour.authored`.
 * Change it when the component's key handling changes; `componentBehaviour.test.ts` checks every key,
 * file and story named here exists.
 */

export interface AuthoredBehaviour {
  /** WAI-ARIA APG pattern the component implements, or null when it is not interactive. */
  pattern: string | null
  /** Key (or chord) → what it does, as the source handles it. */
  keyboard: Record<string, string>
  /** Focus model in one line. */
  focus: string
  /** The component file (repo path) and the handler or attribute that implements it. */
  source: string
  /** The story export that shows it (in the contract's story file). */
  story: string
}

const STATIC = (what: string, source: string, story = 'Playground'): AuthoredBehaviour => ({
  pattern: null,
  keyboard: {},
  focus: `Not focusable: ${what}`,
  source,
  story,
})

const CALENDAR_GRID: Omit<AuthoredBehaviour, 'story'> = {
  pattern: 'grid (date picker dialog, APG)',
  keyboard: {
    'ArrowLeft / ArrowRight': 'moves focus one day back / forward, skipping disabled days',
    'ArrowUp / ArrowDown': 'moves focus one week back / forward, skipping disabled days',
    'Enter / Space': 'selects the focused day (native button)',
  },
  focus: 'One day is the tab stop (the selection, else today, else the first enabled day of the month); the arrows move between the others (roving tabindex).',
  source: 'src/components/escala-ui/calendar.tsx · CalendarMonth onKeyDown + tabbable',
}

const RADIO_ROVING = (source: string): Omit<AuthoredBehaviour, 'story'> => ({
  pattern: 'radio group',
  keyboard: {
    'ArrowRight / ArrowDown': 'moves to the next option and selects it (wraps)',
    'ArrowLeft / ArrowUp': 'moves to the previous option and selects it (wraps)',
    'Home / End': 'moves to the first / last option and selects it',
  },
  focus: 'One tab stop (the checked option); disabled options are skipped.',
  source,
})

export const COMPONENT_BEHAVIOUR: Record<string, AuthoredBehaviour> = {
  Calendar: { ...CALENDAR_GRID, story: 'Playground' },
  CalendarMonth: { ...CALENDAR_GRID, story: 'CalendarMonthPlayground' },
  Combobox: {
    pattern: 'combobox (editable, list autocomplete)',
    keyboard: {
      'ArrowDown / ArrowUp': 'opens the list when closed; moves the active option when open',
      Enter: 'picks the active option',
      Escape: 'closes the list and clears the typed query',
      'Typing': 'filters the list and opens it',
    },
    focus: 'Focus stays in the text field; the active option is aria-activedescendant. Leaving the field closes the list.',
    source: 'src/components/escala-ui/combobox.tsx · the input onKeyDown / onBlur',
    story: 'Playground',
  },
  NumberInput: {
    pattern: 'spinbutton',
    keyboard: {
      ArrowUp: 'adds one step',
      ArrowDown: 'subtracts one step',
      Enter: 'commits the typed value',
    },
    focus: 'The value is the only tab stop; the Decrease / Increase buttons are not tab stops and turn disabled at min / max.',
    source: 'src/components/escala-ui/number-input.tsx · the spinbutton onKeyDown',
    story: 'Playground',
  },
  InputTag: {
    pattern: null,
    keyboard: {
      'Enter / ,': 'commits the draft as a tag',
      Backspace: 'on an empty draft, takes the last tag back',
    },
    focus: 'The text input is the tab stop; clicking anywhere in the box focuses it. Each chip\'s remove button is its own tab stop.',
    source: 'src/components/escala-ui/input-tag.tsx · the input onKeyDown',
    story: 'Playground',
  },
  RatingGroup: { ...RADIO_ROVING('src/components/escala-ui/rating-group.tsx · handleKeyDown (focus + click)'), story: 'Playground' },
  SegmentedControl: { ...RADIO_ROVING('src/components/escala-ui/segmented-control.tsx · handleKeyDown'), story: 'Playground' },
  ReactionGroup: {
    pattern: 'toolbar (inside a non-modal Popover)',
    keyboard: {
      'ArrowRight / ArrowDown': 'moves to the next reaction in the picker',
      'ArrowLeft / ArrowUp': 'moves to the previous reaction',
      'Home / End': 'moves to the first / last reaction',
      'Enter / Space': 'picks the focused reaction',
      Escape: 'closes the picker and returns focus to the trigger (Radix Popover)',
    },
    focus: 'The picker is a role="toolbar" with one roving tab stop; each reaction pill outside it is its own button.',
    source: 'src/components/escala-ui/reaction-group.tsx · ReactionGroupPopover onKeyDown',
    story: 'Playground',
  },
  ActivityHeatmap: {
    pattern: 'grid (data grid)',
    keyboard: {
      'ArrowLeft / ArrowRight': 'moves one week back / forward',
      'ArrowUp / ArrowDown': 'moves one day up / down within the week',
      'Home / End': 'moves to the first / last day of the week',
      'Ctrl+Home / Ctrl+End': 'moves to the first / last day of the grid',
    },
    focus: 'One roving tab stop in a role="grid"; every cell names its day and count, so the level never relies on colour.',
    source: 'src/components/escala-ui/activity-heatmap.tsx · onKeyDown → lib/activityHeatmap.ts moveActivityFocus',
    story: 'Playground',
  },
  Table: {
    pattern: 'table (static; sortable column headers are buttons)',
    keyboard: { 'Enter / Space': 'on a sortable column header (one with onSort), calls onSort; the header shows aria-sort' },
    focus: 'Only interactive content (sortable headers, controls in cells) takes focus; rows and cells do not.',
    source: 'src/components/escala-ui/table.tsx · TableHead onKeyDown (sortable)',
    story: 'Playground',
  },
  Badge: STATIC('a label; text and colour carry no action.', 'src/components/escala-ui/badge.tsx'),
  FeaturedIcon: STATIC('a decorative icon tile (the icon is aria-hidden; the text next to it carries the meaning).', 'src/components/escala-ui/featured-icon.tsx'),
  Kbd: STATIC('a keyboard key rendered as <kbd>.', 'src/components/escala-ui/kbd.tsx'),
  Card: STATIC('a surface; its content brings its own controls.', 'src/components/escala-ui/card.tsx'),
  Image: STATIC('an image; its alt text is the accessible name (empty alt when decorative).', 'src/components/escala-ui/image.tsx'),
  Brand: STATIC('a logo with its name; wrap it in a link to make it navigate.', 'src/components/escala-ui/brand.tsx'),
}
