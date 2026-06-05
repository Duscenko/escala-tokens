// ─── Component catalogue (data) ──────────────────────────────────────────────
// Pure data — no JSX — so both the store (default-all selection) and the
// catalogue UI can import it without circular dependencies.
// To add a component: append to COMPONENTS. The UI renders it automatically.

export interface ComponentDef {
  key: string
  label: string
  category: string
  description: string
  usage: string
  variants: string[]
  props: { name: string; type: string; description: string }[]
  accessibility: string
}

export const COMPONENTS: ComponentDef[] = [
  {
    key: 'Button',
    label: 'Button',
    category: 'Action',
    description: 'Interactive control for primary actions, form submission, and inline triggers.',
    usage: 'Use for the single most important action on a surface. Limit to 1–2 per section.',
    variants: ['Primary', 'Secondary', 'Tertiary', 'Destructive', 'Ghost', 'Link'],
    props: [
      { name: 'variant', type: '"primary" | "secondary" | "tertiary" | "destructive" | "ghost" | "link"', description: 'Visual style of the button' },
      { name: 'size', type: '"sm" | "md" | "lg" | "xl"', description: 'Height and padding scale' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction and applies muted styles' },
      { name: 'loading', type: 'boolean', description: 'Replaces label with spinner, blocks clicks' },
      { name: 'leadingIcon', type: 'ReactNode', description: 'Icon before the label' },
      { name: 'trailingIcon', type: 'ReactNode', description: 'Icon after the label' },
    ],
    accessibility: 'Uses native <button>. Requires accessible label. Disabled state uses aria-disabled.',
  },
  {
    key: 'Input',
    label: 'Input',
    category: 'Form',
    description: 'Single-line text field for user data entry — names, emails, search queries.',
    usage: 'Always pair with a visible label. Use hint text for format guidance, error text for validation.',
    variants: ['Default', 'With icon', 'With prefix', 'Error state', 'Disabled'],
    props: [
      { name: 'label', type: 'string', description: 'Visible label above the field' },
      { name: 'placeholder', type: 'string', description: 'Ghost text when empty' },
      { name: 'hint', type: 'string', description: 'Helper text below the field' },
      { name: 'error', type: 'string', description: 'Validation error message' },
      { name: 'leadingIcon', type: 'ReactNode', description: 'Icon inside the left edge' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction' },
    ],
    accessibility: 'Label linked via htmlFor/id. Error uses aria-describedby + role="alert".',
  },
  {
    key: 'Select',
    label: 'Select',
    category: 'Form',
    description: 'Dropdown for choosing one option from a list of 5+ items.',
    usage: 'Use when options exceed 4 items. For fewer options, prefer Radio or ButtonGroup.',
    variants: ['Default', 'With search', 'Multi-select', 'Grouped options', 'Error state'],
    props: [
      { name: 'options', type: 'Option[]', description: 'Array of { label, value } objects' },
      { name: 'value', type: 'string | string[]', description: 'Selected value(s)' },
      { name: 'placeholder', type: 'string', description: 'Label when nothing selected' },
      { name: 'multiple', type: 'boolean', description: 'Allows multi-selection' },
      { name: 'searchable', type: 'boolean', description: 'Adds filter input to dropdown' },
    ],
    accessibility: 'Built on Radix Select. Keyboard navigable. Options have role="option".',
  },
  {
    key: 'Checkbox',
    label: 'Checkbox',
    category: 'Form',
    description: 'Binary toggle for independent on/off options. Supports indeterminate state.',
    usage: 'Use for lists of independent options. For mutually exclusive options, use Radio.',
    variants: ['Unchecked', 'Checked', 'Indeterminate', 'Disabled'],
    props: [
      { name: 'checked', type: 'boolean | "indeterminate"', description: 'Current state' },
      { name: 'label', type: 'string', description: 'Visible text label' },
      { name: 'description', type: 'string', description: 'Sub-label for context' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction' },
    ],
    accessibility: 'Native checkbox input with aria-checked for indeterminate state.',
  },
  {
    key: 'Toggle',
    label: 'Toggle',
    category: 'Form',
    description: 'Instant on/off switch for settings that take effect immediately.',
    usage: 'Prefer over Checkbox when the change applies without a save action.',
    variants: ['Off', 'On', 'Disabled off', 'Disabled on'],
    props: [
      { name: 'checked', type: 'boolean', description: 'Active state' },
      { name: 'label', type: 'string', description: 'Visible label' },
      { name: 'size', type: '"sm" | "md"', description: 'Physical size of the switch' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction' },
    ],
    accessibility: 'Uses role="switch" with aria-checked. Label associated via aria-labelledby.',
  },
  {
    key: 'Badge',
    label: 'Badge',
    category: 'Display',
    description: 'Non-interactive label for status, category, or count.',
    usage: 'Keep text short (1–2 words). Don\'t use for interactive filtering — use Tag instead.',
    variants: ['Default', 'Success', 'Warning', 'Error', 'Info', 'With dot', 'With icon'],
    props: [
      { name: 'variant', type: '"default" | "success" | "warning" | "error" | "info"', description: 'Semantic color' },
      { name: 'size', type: '"sm" | "md" | "lg"', description: 'Size scale' },
      { name: 'dot', type: 'boolean', description: 'Shows colored dot before label' },
      { name: 'icon', type: 'ReactNode', description: 'Optional leading icon' },
    ],
    accessibility: 'Purely presentational. Add sr-only context if color conveys meaning.',
  },
  {
    key: 'Avatar',
    label: 'Avatar',
    category: 'Display',
    description: 'User photo or initials fallback for identity representation.',
    usage: 'Use consistently at the same size in a given context. Stack with AvatarGroup for teams.',
    variants: ['Image', 'Initials', 'Icon fallback', 'With badge', 'Group stack'],
    props: [
      { name: 'src', type: 'string', description: 'Image URL' },
      { name: 'name', type: 'string', description: 'Used for initials and alt text' },
      { name: 'size', type: '"xs" | "sm" | "md" | "lg" | "xl"', description: 'Diameter scale' },
      { name: 'badge', type: 'ReactNode', description: 'Status dot overlay' },
    ],
    accessibility: 'img alt generated from name. Decorative images use alt="".',
  },
  {
    key: 'Card',
    label: 'Card',
    category: 'Layout',
    description: 'Contained surface for grouping related content and actions.',
    usage: 'Use consistent padding within a layout. Avoid nesting cards more than 1 level.',
    variants: ['Default', 'With header', 'With footer', 'Clickable', 'Skeleton'],
    props: [
      { name: 'padding', type: '"sm" | "md" | "lg"', description: 'Internal spacing' },
      { name: 'shadow', type: '"none" | "sm" | "md" | "lg"', description: 'Elevation level' },
      { name: 'border', type: 'boolean', description: 'Shows border stroke' },
      { name: 'onClick', type: '() => void', description: 'Makes the card interactive' },
    ],
    accessibility: 'Clickable cards use role="button" or wrapping <a>. Focus ring visible.',
  },
  {
    key: 'Modal',
    label: 'Modal',
    category: 'Overlay',
    description: 'Focused dialog for critical actions or content that requires full attention.',
    usage: 'Reserve for destructive confirmations or multi-step flows. Don\'t use for notifications.',
    variants: ['Default', 'With header', 'Destructive', 'Full-screen mobile', 'Drawer variant'],
    props: [
      { name: 'open', type: 'boolean', description: 'Controls visibility' },
      { name: 'onClose', type: '() => void', description: 'Called on backdrop click or Esc' },
      { name: 'title', type: 'string', description: 'Dialog heading' },
      { name: 'size', type: '"sm" | "md" | "lg" | "fullscreen"', description: 'Width constraint' },
      { name: 'preventClose', type: 'boolean', description: 'Disables Esc and backdrop dismiss' },
    ],
    accessibility: 'role="dialog", aria-modal="true". Focus trapped inside. Returns focus on close.',
  },
  {
    key: 'Toast',
    label: 'Toast',
    category: 'Overlay',
    description: 'Transient notification for non-critical feedback after an action.',
    usage: 'Auto-dismiss after 4–6s. Offer undo for destructive actions. Max 3 visible at once.',
    variants: ['Default', 'Success', 'Warning', 'Error', 'With action', 'With icon'],
    props: [
      { name: 'variant', type: '"default" | "success" | "warning" | "error"', description: 'Semantic type' },
      { name: 'title', type: 'string', description: 'Short message' },
      { name: 'description', type: 'string', description: 'Optional detail' },
      { name: 'duration', type: 'number', description: 'Auto-dismiss delay in ms (default 4000)' },
      { name: 'action', type: '{ label: string; onClick: () => void }', description: 'Inline CTA' },
    ],
    accessibility: 'role="status" for default, role="alert" for errors. Live region announced.',
  },
  {
    key: 'Tooltip',
    label: 'Tooltip',
    category: 'Overlay',
    description: 'Contextual label that appears on hover or focus for unlabeled controls.',
    usage: 'Only use for icon-only buttons or truncated text. Never put interactive content inside.',
    variants: ['Top', 'Bottom', 'Left', 'Right', 'With shortcut'],
    props: [
      { name: 'content', type: 'string | ReactNode', description: 'Tooltip text' },
      { name: 'side', type: '"top" | "bottom" | "left" | "right"', description: 'Preferred placement' },
      { name: 'delay', type: 'number', description: 'Open delay in ms (default 400)' },
      { name: 'shortcut', type: 'string', description: 'Optional keyboard shortcut label' },
    ],
    accessibility: 'role="tooltip" linked via aria-describedby. Appears on focus and hover.',
  },
  {
    key: 'Tabs',
    label: 'Tabs',
    category: 'Navigation',
    description: 'Organizes related content into switchable panels within the same context.',
    usage: 'Use when content is parallel, not sequential. Limit to 2–7 tabs visible at once.',
    variants: ['Line', 'Pill', 'Enclosed', 'Vertical', 'With badge', 'With icon'],
    props: [
      { name: 'items', type: 'TabItem[]', description: 'Array of { label, value, content } objects' },
      { name: 'defaultValue', type: 'string', description: 'Initially active tab' },
      { name: 'variant', type: '"line" | "pill" | "enclosed"', description: 'Visual style' },
      { name: 'orientation', type: '"horizontal" | "vertical"', description: 'Layout direction' },
    ],
    accessibility: 'ARIA tabs pattern: role="tablist", role="tab", role="tabpanel". Arrow key navigation.',
  },
  {
    key: 'Breadcrumb',
    label: 'Breadcrumb',
    category: 'Navigation',
    description: 'Hierarchical path showing the user\'s location within a multi-level structure.',
    usage: 'Only use when hierarchy is 3+ levels deep. Don\'t duplicate primary navigation.',
    variants: ['Default', 'With icons', 'Collapsed', 'Custom separator'],
    props: [
      { name: 'items', type: '{ label: string; href?: string }[]', description: 'Path segments' },
      { name: 'separator', type: 'ReactNode', description: 'Custom separator element' },
      { name: 'maxItems', type: 'number', description: 'Collapse middle items beyond this count' },
    ],
    accessibility: 'nav aria-label="Breadcrumb". Current page has aria-current="page".',
  },
  {
    key: 'Progress',
    label: 'Progress',
    category: 'Feedback',
    description: 'Visual indicator of task completion — percentage or indeterminate.',
    usage: 'Use for operations over 2s. Show percentage when known. Pair with a label.',
    variants: ['Determinate', 'Indeterminate', 'Stepped', 'Circular', 'With label'],
    props: [
      { name: 'value', type: 'number | null', description: '0–100 for determinate, null for indeterminate' },
      { name: 'size', type: '"sm" | "md" | "lg"', description: 'Track height' },
      { name: 'label', type: 'string', description: 'Accessible description' },
      { name: 'showValue', type: 'boolean', description: 'Renders percentage label' },
    ],
    accessibility: 'role="progressbar" with aria-valuenow, aria-valuemin, aria-valuemax.',
  },
  {
    key: 'Spinner',
    label: 'Spinner',
    category: 'Feedback',
    description: 'Indeterminate loading indicator for operations with unknown duration.',
    usage: 'Prefer skeleton screens for content loading. Use Spinner for action feedback.',
    variants: ['Default', 'Sm', 'Lg', 'With label', 'Overlay'],
    props: [
      { name: 'size', type: '"sm" | "md" | "lg"', description: 'Diameter' },
      { name: 'label', type: 'string', description: 'sr-only accessible label (required)' },
      { name: 'color', type: 'string', description: 'Override with CSS var token' },
    ],
    accessibility: 'role="status" with sr-only label. Animated via CSS, respects prefers-reduced-motion.',
  },
  {
    key: 'Divider',
    label: 'Divider',
    category: 'Layout',
    description: 'Visual separator between sections or list items.',
    usage: 'Use sparingly — whitespace is usually sufficient. Add label only for section breaks.',
    variants: ['Horizontal', 'Vertical', 'With label', 'Dashed'],
    props: [
      { name: 'orientation', type: '"horizontal" | "vertical"', description: 'Direction' },
      { name: 'label', type: 'string', description: 'Optional center text' },
      { name: 'dashed', type: 'boolean', description: 'Dashed stroke style' },
    ],
    accessibility: 'role="separator". Decorative dividers use aria-hidden="true".',
  },
]

export const CATEGORIES = ['Action', 'Form', 'Display', 'Layout', 'Overlay', 'Navigation', 'Feedback']

// All component keys — used to seed the store so the system ships with every
// component included by default (the user removes what they don't want).
export const COMPONENT_KEYS = COMPONENTS.map((c) => c.key)
