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

/** A Table overview item this wide is the Figma «Table Prototype» (people, select-all, sort, pinned…), not the plain sample. */
export const TABLE_PROTOTYPE_W = 1040

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
  FABButton: [
    [
      { v: { Variant: 'default', Appearance: 'solid' }, label: 'Create' },
      { v: { Variant: 'default', Appearance: 'soft' }, label: 'Create' },
      { v: { Variant: 'secondary', Appearance: 'solid' }, label: 'Create' },
      { v: { Variant: 'secondary', Appearance: 'soft' }, label: 'Create' },
    ],
    [
      { v: { Shape: 'rounded' }, label: 'Create' },
      { v: { Shape: 'pill' }, label: 'Create' },
      { v: { Size: 'lg' }, label: 'Create' },
      { v: { State: 'Disabled' }, label: 'Create' },
    ],
  ],
  FABGroup: [
    each('Layout', ['stack', 'fan-center', 'fan-left', 'fan-right'], { Open: 'true' }),
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
  ButtonGroup: [
    each('Variant', ['default', 'secondary', 'outline', 'inverse']),
    each('Shape', ['rounded', 'pill', 'square']),
    each('Size', ['xs', 'sm', 'default', 'lg', 'xl']),
    each('Orientation', ['horizontal', 'vertical']),
  ],
  ButtonGroupItem: [
    each('Variant', ['default', 'secondary', 'outline', 'inverse']),
    each('Variant', ['default', 'secondary', 'outline', 'inverse'], { Active: 'true' }),
    each('State', ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled']),
    each('Size', ['xs', 'sm', 'default', 'lg', 'xl'], { IconOnly: 'true' }),
  ],
  ButtonGroupDivider: [
    each('Variant', ['default', 'secondary', 'outline', 'inverse']),
    each('Orientation', ['horizontal', 'vertical']),
  ],
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
    each('State', ['Default', 'Focused'], { Type: 'default' }, 240),
    each('State', ['Invalid', 'Disabled'], { Type: 'default' }, 240),
    each('Type', ['search', 'phone', 'currency'], {}, 240),
    each('Type', ['password', 'url', 'upload'], {}, 240),
    each('Type', ['tag', 'copy-link', 'currency-select', 'credit-card'], {}, 240),
  ],
  Textarea: [
    each('State', ['Default', 'Hover', 'Focused', 'Invalid', 'Loading', 'Disabled'], {}, 240),
    each('Size', ['sm', 'default', 'lg'], {}, 240),
    each('Value', ['placeholder', 'filled'], {}, 240),
  ],
  DatePickerTrigger: [
    each('State', ['Default', 'Hover', 'Focused'], { Value: 'filled' }, 280),
    each('State', ['Invalid', 'Disabled', 'Loading'], { Value: 'filled' }, 280),
    each('Size', ['sm', 'default', 'lg'], { Value: 'filled' }, 280),
    each('Value', ['placeholder', 'filled'], {}, 280),
  ],
  DatePickerPopover: [
    ...stack('Size', ['default', 'sm'], { Mode: 'single' }),
    ...stack('Mode', ['range'], { Size: 'default' }),
  ],
  CalendarDay: [
    each('State', ['Default', 'Hover', 'Today', 'Selected', 'Focused', 'Outside'], {}, 64),
    each('State', ['RangeStart', 'RangeMiddle', 'RangeEnd', 'Disabled', 'Unavailable'], {}, 64),
    each('State', ['Default', 'Hover', 'Today', 'Selected', 'Focused', 'Outside'], { Variant: 'secondary' }, 64),
    each('State', ['RangeStart', 'RangeMiddle', 'RangeEnd', 'Disabled', 'Unavailable'], { Variant: 'secondary' }, 64),
    each('Size', ['default', 'sm'], { State: 'Selected' }, 64),
  ],
  CalendarFooter: [
    each('Size', ['default', 'sm'], {}, 320),
  ],
  CalendarPresets: [
    each('Variant', ['default', 'secondary'], { Size: 'default' }, 180),
    each('Variant', ['default', 'secondary'], { Size: 'sm' }, 160),
  ],
  CalendarMonth: [
    ...stack('Mode', ['single', 'multiple', 'range'], { Size: 'default', Variant: 'default' }),
    ...stack('Variant', ['default', 'secondary'], { Size: 'default', Mode: 'range' }),
    ...stack('Size', ['default', 'sm'], { Mode: 'single', Variant: 'default' }),
  ],
  CalendarHeader: [
    ...stack('Header', ['single', 'multiple', 'plain'], { Size: 'default' }),
    ...stack('Header', ['single', 'multiple', 'plain'], { Size: 'sm' }),
  ],
  InputOTP: [
    ...stack('State', ['Empty', 'Typing', 'Filled', 'Invalid', 'Disabled'], { Length: '6' }),
    ...stack('Variant', ['outline', 'filled', 'underline'], { Length: '6', State: 'Filled' }),
  ],
  InputOTPSlot: [
    each('State', ['Default', 'Filled', 'Typing', 'Focused', 'Invalid', 'Disabled']),
    each('Variant', ['outline', 'filled', 'underline'], { State: 'Filled' }),
    each('Size', ['sm', 'default', 'lg'], { State: 'Filled' }),
  ],
  InputTag: [
    each('State', ['Default', 'Hover', 'Focused'], { Value: 'filled' }, 360),
    each('State', ['Invalid', 'Disabled', 'Loading'], { Value: 'filled' }, 360),
    each('Layout', ['inline', 'outside'], { Value: 'filled' }, 360),
    each('Size', ['sm', 'default', 'lg'], { Value: 'filled' }, 360),
  ],
  InputTagChip: [
    each('State', ['Default', 'Hover', 'Focused', 'Disabled']),
    each('Variant', ['default', 'critical']),
    each('Size', ['xs', 'sm', 'default', 'lg', 'xl']),
  ],
  InputTagOption: [
    each('State', ['Default', 'Hover', 'Focused', 'Disabled'], {}, 240),
    each('Type', ['option', 'create'], {}, 240),
  ],
  Select: [
    each('State', ['Default', 'Focused'], {}, 220),
    each('State', ['Error', 'Disabled'], {}, 220),
  ],
  NativeSelect: [each('State', ['Default', 'Focused', 'Disabled'], {}, 200)],
  Calendar: [
    ...stack('Mode', ['single', 'multiple', 'range'], { Size: 'default', Header: 'single' }),
    ...stack('Header', ['multiple', 'plain'], { Size: 'default', Mode: 'single' }),
    ...stack('Size', ['sm'], { Mode: 'single', Header: 'single' }),
  ],
  Combobox: [each('State', ['Default', 'Focused']), each('State', ['Open'])],
  // A row of labelled controls repeats the label; two short columns read as
  // the on/off pair, then the same pair disabled.
  Checkbox: [
    each('Checked', ['false', 'true', 'indeterminate']),
    each('Variant', ['default', 'secondary', 'critical', 'success', 'info', 'inverse'], { Checked: 'true' }),
    each('State', ['Default', 'Hover', 'Focused', 'Disabled', 'Invalid'], { Checked: 'true' }),
    each('Size', ['xs', 'sm', 'default'], { Checked: 'true' }),
  ],
  CheckboxItem: [
    each('Checked', ['false', 'true', 'indeterminate']),
    each('State', ['Default', 'Disabled', 'Invalid'], { Checked: 'true' }),
    each('Placement', ['left', 'right'], { Checked: 'true' }),
    each('Size', ['xs', 'sm', 'default'], { Checked: 'true' }),
  ],
  CheckboxGroup: [
    each('State', ['Default', 'Invalid', 'Disabled']),
    each('Placement', ['left', 'right']),
    each('Size', ['xs', 'sm', 'default']),
  ],
  Slider: [
    each('Range', ['single', 'range']),
    each('State', ['Default', 'Dragging', 'Disabled']),
    each('Size', ['xs', 'sm', 'default']),
    each('Variant', ['default', 'secondary']),
  ],
  SliderThumb: [
    each('State', ['Default', 'Hover', 'Focused', 'Dragging', 'Disabled']),
    each('Size', ['xs', 'sm', 'default']),
    each('Variant', ['default', 'secondary']),
  ],
  Switch: [
    each('Checked', ['true', 'false']),
    each('State', ['Default', 'Hover', 'Focused', 'Disabled'], { Checked: 'true' }),
    each('Size', ['xs', 'sm', 'default'], { Checked: 'true' }),
    each('Thumb', ['short', 'long'], { Checked: 'true' }),
  ],
  SwitchGroup: [
    each('State', ['Default', 'Disabled', 'Invalid', 'Loading']),
    each('Placement', ['left', 'right']),
    each('Size', ['xs', 'sm', 'default']),
  ],
  FileUpload: [
    each('Layout', ['dropzone', 'trigger']),
    each('Size', ['default', 'sm']),
  ],
  FileUploadItem: [
    each('Status', ['queued', 'uploading', 'paused', 'completed', 'error']),
    each('Size', ['default', 'sm']),
  ],
  FileUploadDropzone: [
    each('State', ['Default', 'Hover', 'Dragging', 'Invalid', 'Disabled']),
    each('Size', ['sm', 'default', 'lg']),
  ],
  NumberInput: [
    each('State', ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled']),
    each('Size', ['sm', 'default', 'lg']),
  ],
  Field: [
    each('State', ['Default', 'Invalid', 'Disabled']),
    each('Size', ['sm', 'default', 'lg']),
  ],
  PasswordStrength: [each('Strength', ['0', '1', '2', '3', '4', '5'], {}, 350)],
  PasswordStrengthMeter: [
    ...stack('Strength', ['0', '1', '2', '3', '4', '5'], {}, 280),
    ...stack('Size', ['xs', 'sm', 'default'], { Strength: '3' }, 280),
  ],
  PasswordStrengthRule: [each('Met', ['true', 'false']), each('Size', ['xs', 'sm', 'default'])],

  // ── Indicators ─────────────────────────────────────────────────────────────
  Badge: [
    each('Variant', ['success', 'warning', 'info', 'inverse', 'default', 'secondary', 'critical'], { Appearance: 'solid' }),
    each('Appearance', ['soft', 'solid', 'outline', 'ghost'], { Variant: 'info' }),
    each('Size', ['xs', 'sm', 'default']),
    each('Type', ['default', 'icon', 'number', 'dot'], { Variant: 'success', Appearance: 'solid', Shape: 'pill' }),
    each('Shape', ['rounded', 'pill']),
  ],
  StatusBadge: [each('Status', ['online', 'away', 'busy', 'offline'])],
  Chip: [
    each('State', ['Default', 'Hover', 'Focused', 'Selected', 'Disabled', 'Dragging']),
    each('Variant', ['info', 'success', 'default', 'critical'], { Appearance: 'soft' }),
    each('Appearance', ['outline', 'soft'], { Variant: 'info' }),
    each('Size', ['xs', 'sm', 'default', 'lg', 'xl']),
    each('Shape', ['rounded', 'pill']),
  ],
  Icon: [each('Size', ['sm', 'default', 'lg'])],
  Kbd: [each('Size', ['xs', 'sm', 'default'])],
  FeaturedIcon: [
    each('Size', ['default', 'sm', 'lg', 'xl']),
    each('Variant', ['default', 'secondary', 'critical', 'success', 'warning', 'info']),
    each('Appearance', ['soft', 'solid'], { Variant: 'info' }),
    each('Shape', ['circle', 'rounded']),
  ],
  RatingGroup: [
    each('Type', ['star', 'emoji']),
    each('Size', ['default', 'sm', 'lg']),
  ],
  RatingGroupItem: [
    each('State', ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'], { Checked: 'false' }),
    each('Checked', ['false', 'true']),
    each('Type', ['star', 'emoji'], { Checked: 'true' }),
    each('Size', ['default', 'sm', 'lg'], { Checked: 'true' }),
  ],
  FileFormat: [each('Format', ['pdf', 'png', 'svg', 'zip'])],
  Avatar: [
    each('Size', ['2xs', 'xs', 'sm', 'default', 'lg', 'xl', '2xl'], { Type: 'initials' }),
    each('Type', ['image', 'initials', 'icon']),
    each('Variant', ['secondary', 'default', 'info', 'success', 'warning', 'critical'], { Type: 'initials' }),
    each('Appearance', ['soft', 'solid'], { Type: 'initials', Variant: 'default' }),
    each('Shape', ['circle', 'rounded'], { Type: 'initials' }),
  ],
  AvatarStatus: [
    each('Status', ['online', 'busy', 'away', 'offline', 'do-not-disturb']),
    each('Size', ['xs', 'sm', 'default', 'lg']),
  ],
  AvatarGroup: [
    each('Size', ['2xs', 'xs', 'sm', 'default', 'lg', 'xl', '2xl']),
    each('Shape', ['circle', 'rounded']),
  ],

  // ── Content & Surfaces ─────────────────────────────────────────────────────
  Card: [each('Size', ['default', 'sm'])],
  Separator: [each('Orientation', ['horizontal', 'vertical'])],
  Collapsible: [each('Open', ['False', 'True'])],
  Accordion: [each('Variant', ['ghost-default', 'ghost-underline', 'ghost-rounded', 'outline-rounded', 'outline-sharp', 'filled-rounded'])],
  AccordionItem: [
    each('State', ['Closed', 'Open', 'Disabled'], { Variant: 'outline-rounded' }),
    each('Variant', ['ghost-default', 'ghost-underline', 'ghost-rounded', 'outline-rounded', 'outline-sharp', 'filled-rounded'], { State: 'Open' }),
  ],
  Table: [
    // The file's two prototype examples: Dividers rows = «Example Light» (resting · hover · selected · disabled),
    // Dividers grid = «Example Dark» (grid · pinned · sorted · resizing · scrolled header).
    [{ v: { Dividers: 'rows' }, w: TABLE_PROTOTYPE_W }],
    [{ v: { Dividers: 'grid' }, w: TABLE_PROTOTYPE_W }],
    each('Size', ['default', 'xs', 'sm', 'lg'], { Appearance: 'filled' }, 800),
    each('Appearance', ['filled', 'ghost'], {}, 800),
    each('Dividers', ['rows', 'grid'], {}, 800),
  ],
  TableCell: [
    each('Size', ['default', 'xs', 'sm', 'lg']),
    each('Align', ['start', 'end']),
    each('Pinned', ['none', 'start', 'end']),
    each('State', ['Default', 'Disabled']),
  ],
  TableHead: [
    each('Size', ['default', 'xs', 'sm', 'lg']),
    each('Sort', ['none', 'ascending', 'descending']),
    each('Pinned', ['none', 'start', 'end']),
    each('State', ['Default', 'Hover'], { Sort: 'ascending' }),
  ],
  TableMediaCell: [each('Size', ['default', 'xs', 'sm', 'lg']), each('Ratio', ['square', 'wide']), each('State', ['Default', 'Disabled'])],
  TableTrendCell: [each('Size', ['default', 'xs', 'sm', 'lg']), each('Trend', ['up', 'down', 'neutral']), each('State', ['Default', 'Disabled'])],
  TableResizer: [each('State', ['Default', 'Hover', 'Resizing'])],
  TableRow: [
    each('State', ['Default', 'Hover', 'Selected', 'Focused', 'Disabled', 'Dragging'], {}, 800),
    each('Size', ['default', 'xs', 'sm', 'lg'], {}, 800),
    each('Dividers', ['rows', 'grid'], {}, 800),
  ],
  TableHeader: [each('Size', ['default', 'xs', 'sm', 'lg'], {}, 800), each('Scrolled', ['false', 'true'], {}, 800), each('Dividers', ['rows', 'grid'], {}, 800)],
  TableFooter: [each('Size', ['default', 'xs', 'sm', 'lg'], {}, 800), each('Dividers', ['rows', 'grid'], {}, 800)],
  TableLoadMore: [each('State', ['Default', 'Loading'], {}, 800)],
  ProgressLine: [each('Size', ['xs', 'sm', 'default', 'lg'], {}, 240), each('Appearance', ['solid', 'gradient'], {}, 240), each('Value', ['0', '25', '50', '75', '100'], {}, 240)],
  ProgressCircle: [each('Size', ['xs', 'sm', 'default', 'lg']), each('Cap', ['round', 'butt'], { Value: '75' }), each('Appearance', ['solid', 'gradient'], { Value: '75' }), each('Value', ['0', '25', '50', '75', '100'])],
  Alert: [
    each('Variant', ['success', 'info', 'warning', 'default', 'critical', 'secondary'], { Layout: 'vertical' }, 320),
    each('Appearance', ['outline', 'solid', 'soft', 'inverse'], {}, 800),
    each('Layout', ['horizontal', 'vertical']),
    each('Size', ['sm', 'default'], {}, 800),
  ],
  Image: [each('Ratio', ['auto', '16:9', '4:3', '3:2', '1:1', '3:4']), each('Shape', ['square', 'rounded'])],
  Popover: [each('Side', ['bottom', 'top', 'left', 'right'], {}, 340), each('Size', ['default', 'sm', 'lg'], {}, 380)],
  PopoverFooter: [each('Layout', ['inline', 'stacked'], {}, 256), each('Size', ['default', 'sm', 'lg'], {}, 256)],
  DropdownMenu: [each('Size', ['default', 'sm', 'lg'], {}, 256)],
  DropdownMenuLabel: [each('Size', ['default', 'sm', 'lg'], {}, 256)],
  DropdownMenuItem: [each('State', ['Default', 'Focused', 'Selected', 'Disabled'], {}, 256), each('State', ['Default', 'Focused', 'Disabled'], { Variant: 'destructive' }, 256), each('Size', ['default', 'sm', 'lg'], {}, 256)],
  DropdownMenuFooter: [each('Layout', ['inline', 'stacked'], {}, 256), each('Size', ['default', 'sm', 'lg'], {}, 256)],
  Breadcrumb: [each('Appearance', ['ghost', 'outline', 'solid'], {}, 460), each('Separator', ['chevron', 'slash', 'dot'], {}, 460), each('Size', ['xs', 'sm', 'default'], {}, 460)],
  BreadcrumbItem: [each('State', ['Default', 'Hover', 'Focused', 'Current', 'Disabled']), each('Appearance', ['ghost', 'outline', 'solid']), each('Variant', ['default', 'secondary']), each('Size', ['xs', 'sm', 'default'])],
  BreadcrumbEllipsis: [each('State', ['Default', 'Hover', 'Focused', 'Disabled']), each('Appearance', ['ghost', 'outline', 'solid']), each('Size', ['xs', 'sm', 'default'])],
  BreadcrumbSeparator: [each('Variant', ['chevron', 'slash', 'dot']), each('Size', ['xs', 'sm', 'default'])],
  TooltipContent: [each('Variant', ['default', 'secondary', 'inverse', 'critical', 'info'], {}, 260), each('Side', ['top', 'bottom', 'left', 'right'], {}, 260), each('Size', ['sm', 'default', 'lg'], {}, 300)],
  TooltipInfoTrigger: [each('Variant', ['default', 'secondary', 'inverse', 'critical', 'info']), each('State', ['Default', 'Hover', 'Open', 'Focused'])],
  Modal: [each('Size', ['default', 'lg'], {}, 640)],
  ModalHeader: [each('Align', ['horizontal', 'vertical-left', 'vertical-center'], {}, 440), each('Size', ['default', 'lg'], {}, 600)],
  ModalFooter: [each('Layout', ['inline', 'stacked'], {}, 480), each('Size', ['default', 'lg'], {}, 640)],
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
  Toast: [
    each('Variant', ['default', 'secondary', 'success', 'info', 'warning', 'critical'], { Appearance: 'filled' }, 360),
    each('Appearance', ['solid', 'soft', 'filled', 'outline'], {}, 360),
  ],
  Empty: [each('Media', ['default', 'icon'])],

  // ── Navigation ─────────────────────────────────────────────────────────────
  Tabs: stack('Variant', ['default', 'line']),
  SegmentedControl: stack('Size', ['default', 'sm', 'lg']),
  SegmentedControlItem: [
    each('Checked', ['false', 'true']),
    each('State', ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'], { Checked: 'false' }),
    each('Size', ['default', 'sm', 'lg'], { Checked: 'true' }),
  ],
  Sidebar: [each('Variant', ['sidebar', 'floating', 'inset'])],
}

export const OVERVIEW_VALUE = 'Overview'
export function hasOverview(key: string): boolean { return key in OVERVIEWS }
