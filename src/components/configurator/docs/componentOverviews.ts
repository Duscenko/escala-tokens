/**
 * The Preview's "Overview" per component: what the component looks like in a
 * product, its variants side by side, before any single one is picked.
 *
 * The first axis' select offers it as "Overview", first and selected by
 * default. A component with no axes has nothing to pick, so it keeps its
 * single specimen and is not listed here.
 *
 * Rows are laid out centred and wrap. `label` is the specimen's children —
 * only Button, Badge, Card, Alert and Sonner read it; the others draw their
 * own sample content. Every axis value named here must exist in the
 * catalogue (`componentOverviews.test.ts`), so a renamed variant fails a test
 * instead of rendering the default silently.
 */
import type { IconConcept } from '../../../lib/iconLibraries'

export type OverviewItem = {
  v: Record<string, string>
  label?: string
  leading?: IconConcept
  trailing?: IconConcept
  /** Width in px for specimens that otherwise fill their column. */
  w?: number
}
export type Overview = OverviewItem[][]

/** One item per value of `axis`, with `base` held fixed. */
function each(axis: string, values: string[], base: Record<string, string> = {}, w?: number): OverviewItem[] {
  return values.map((value) => ({ v: { ...base, [axis]: value }, w }))
}
/** Same, one row per item (tall or wide specimens read as a stack). */
function stack(axis: string, values: string[], base: Record<string, string> = {}, w?: number): Overview {
  return each(axis, values, base, w).map((item) => [item])
}

export const OVERVIEWS: Record<string, Overview> = {
  // ── Button & Actions ───────────────────────────────────────────────────────
  Button: [
    [
      { v: { Variant: 'default', Appearance: 'solid' }, label: 'Download all', leading: 'download' },
      { v: { Variant: 'default', Appearance: 'outline' }, label: 'Preview', leading: 'eye' },
      { v: { Variant: 'default', Appearance: 'ghost' }, label: 'Add new', leading: 'plus' },
      { v: { Variant: 'default', Appearance: 'link' }, label: 'Open', trailing: 'external-link' },
    ],
    [
      { v: { Variant: 'secondary', Appearance: 'solid' }, label: 'Share', leading: 'share' },
      { v: { Variant: 'secondary', Appearance: 'outline' }, label: 'Options', leading: 'filter' },
      { v: { Variant: 'secondary', Appearance: 'ghost' }, label: 'Cancel' },
      { v: { Variant: 'secondary', Appearance: 'link' }, label: 'Learn more' },
    ],
    [
      { v: { Variant: 'critical', Appearance: 'solid' }, label: 'Delete', leading: 'trash' },
      { v: { Variant: 'critical', Appearance: 'outline' }, label: 'Remove', leading: 'trash' },
      { v: { Variant: 'critical', Appearance: 'ghost' }, label: 'Discard' },
      { v: { Variant: 'critical', Appearance: 'link' }, label: 'Revoke' },
    ],
    [
      { v: { Variant: 'default', Size: 'xs' }, label: 'Extra small' },
      { v: { Variant: 'default', Size: 'sm' }, label: 'Continue', trailing: 'arrow-right' },
      { v: { Variant: 'default', Size: 'lg' }, label: 'Get started', trailing: 'arrow-right' },
      { v: { Variant: 'default', State: 'Disabled' }, label: 'Locked', leading: 'lock' },
      { v: { Variant: 'default', State: 'Loading' }, label: 'Saving' },
    ],
  ],
  IconButton: [
    [
      { v: { Variant: 'default', Appearance: 'solid' }, label: 'Add', leading: 'plus' },
      { v: { Variant: 'default', Appearance: 'outline' }, label: 'Favourite', leading: 'star' },
      { v: { Variant: 'secondary', Appearance: 'outline' }, label: 'Settings', leading: 'settings' },
      { v: { Variant: 'secondary', Appearance: 'ghost' }, label: 'More', leading: 'more' },
      { v: { Variant: 'critical', Appearance: 'solid' }, label: 'Delete', leading: 'trash' },
      { v: { Variant: 'critical', Appearance: 'ghost' }, label: 'Remove', leading: 'trash' },
    ],
    each('Size', ['xs', 'sm', 'default', 'lg'], { Variant: 'secondary', Appearance: 'outline' }),
  ],
  TextLink: [
    each('Variant', ['default', 'secondary', 'success', 'info', 'critical']),
    each('Size', ['xs', 'sm', 'default', 'lg']),
    each('State', ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled']),
  ],
  CloseButton: [
    each('Appearance', ['soft', 'solid', 'outline', 'ghost']),
    each('Shape', ['pill', 'rounded', 'square']),
    each('Size', ['xs', 'sm', 'default', 'lg', 'xl']),
  ],
  ButtonGroup: [each('Orientation', ['horizontal', 'vertical'])],
  ToggleGroup: [
    each('Variant', ['default', 'outline']),
    each('Size', ['sm', 'default', 'lg'], { Variant: 'outline' }),
  ],
  Toggle: [
    [
      { v: { Variant: 'default', Pressed: 'False' } },
      { v: { Variant: 'default', Pressed: 'True' } },
      { v: { Variant: 'outline', Pressed: 'False' } },
      { v: { Variant: 'outline', Pressed: 'True' } },
    ],
    each('Size', ['sm', 'default', 'lg'], { Variant: 'outline', Pressed: 'True' }),
  ],
  SocialLoginButton: [
    each('Provider', ['google', 'apple'], {}, 260),
    each('Provider', ['github', 'figma'], {}, 260),
  ],
  AppStoreBadge: [each('Store', ['app-store', 'google-play'])],

  // ── Form Controls ──────────────────────────────────────────────────────────
  Input: [
    each('State', ['Default', 'Focused'], {}, 240),
    each('State', ['Error', 'Disabled'], {}, 240),
  ],
  Textarea: [each('State', ['Default', 'Focused', 'Error'], {}, 240)],
  InputOTP: stack('State', ['Default', 'Filled', 'Error']),
  Select: [
    each('State', ['Default', 'Focused'], {}, 220),
    each('State', ['Error', 'Disabled'], {}, 220),
  ],
  NativeSelect: [each('State', ['Default', 'Focused', 'Disabled'], {}, 200)],
  Calendar: [each('Mode', ['single', 'range'])],
  Combobox: [each('State', ['Default', 'Focused']), each('State', ['Open'])],
  // A row of labelled controls repeats the label; two short columns read as
  // the on/off pair, then the same pair disabled.
  Checkbox: [
    [{ v: { Checked: 'True' } }, { v: { Checked: 'False' } }],
    [{ v: { Checked: 'True', State: 'Disabled' } }, { v: { Checked: 'False', State: 'Disabled' } }],
  ],
  Switch: [
    [{ v: { Checked: 'True' } }, { v: { Checked: 'False' } }],
    [{ v: { Checked: 'True', State: 'Disabled' } }, { v: { Checked: 'False', State: 'Disabled' } }],
  ],
  Dropzone: [each('State', ['Default', 'Dragging', 'Error'])],
  Field: [each('Orientation', ['vertical', 'horizontal'])],
  PasswordStrength: stack('Strength', ['weak', 'fair', 'strong']),

  // ── Indicators ─────────────────────────────────────────────────────────────
  Badge: [
    [
      { v: { Variant: 'default' }, label: 'New' },
      { v: { Variant: 'secondary' }, label: 'Draft' },
      { v: { Variant: 'destructive' }, label: 'Failed' },
      { v: { Variant: 'outline' }, label: 'v2.4' },
      { v: { Variant: 'ghost' }, label: 'Beta' },
      { v: { Variant: 'link' }, label: 'Docs' },
    ],
  ],
  StatusBadge: [each('Status', ['online', 'away', 'busy', 'offline'])],
  Chip: [
    [
      { v: { Selected: 'False', Dismissible: 'False' } },
      { v: { Selected: 'True', Dismissible: 'False' } },
      { v: { Selected: 'False', Dismissible: 'True' } },
      { v: { Selected: 'True', Dismissible: 'True' } },
    ],
    each('Size', ['sm', 'default'], { Selected: 'True', Dismissible: 'True' }),
  ],
  Icon: [each('Size', ['sm', 'default', 'lg'])],
  Rating: stack('Interactive', ['False', 'True']),
  FileFormat: [each('Format', ['pdf', 'png', 'svg', 'zip'])],
  Avatar: [each('Size', ['sm', 'default', 'lg'])],

  // ── Content & Surfaces ─────────────────────────────────────────────────────
  Card: [each('Size', ['default', 'sm'])],
  Separator: [each('Orientation', ['horizontal', 'vertical'])],
  Collapsible: [each('Open', ['False', 'True'])],
  AspectRatio: [each('Ratio', ['16:9', '4:3', '1:1'])],
  AlertDialog: [each('Size', ['default', 'sm'])],
  // Drawn inline, left/right and top/bottom look alike: one of each shape.
  Sheet: [each('Side', ['right', 'bottom'])],
  Drawer: [each('Direction', ['bottom', 'right'])],
  Item: [
    ...stack('Variant', ['default', 'outline', 'muted'], {}, 360),
    [{ v: { Variant: 'outline', Size: 'sm' }, w: 360 }],
  ],
  Attachment: [
    each('State', ['idle', 'uploading', 'processing']),
    each('State', ['error', 'done']),
    each('Orientation', ['vertical'], { State: 'done' }),
  ],
  Message: stack('Align', ['start', 'end']),
  Bubble: [
    each('Variant', ['default', 'secondary', 'muted', 'tinted']),
    each('Variant', ['outline', 'ghost', 'destructive']),
    each('Align', ['end'], { Variant: 'default' }),
  ],
  Resizable: [each('Orientation', ['horizontal', 'vertical'])],
  Carousel: [each('Orientation', ['horizontal', 'vertical'])],
  Chart: [each('Type', ['bar', 'line', 'area'], {}, 260)],

  // ── Feedback ───────────────────────────────────────────────────────────────
  Sonner: [
    ...stack('Type', ['default', 'success', 'info'], {}, 340),
    ...stack('Type', ['warning', 'error', 'loading'], {}, 340),
  ],
  Alert: stack('Variant', ['default', 'destructive'], {}, 380),
  Empty: [each('Media', ['default', 'icon'])],

  // ── Navigation ─────────────────────────────────────────────────────────────
  Tabs: stack('Variant', ['default', 'line']),
  SegmentedControl: stack('Size', ['default', 'sm']),
  Sidebar: [each('Variant', ['sidebar', 'floating', 'inset'])],
}

export const OVERVIEW_VALUE = 'Overview'
export function hasOverview(key: string): boolean { return key in OVERVIEWS }
