// ─── Component catalogue (data) ──────────────────────────────────────────────
// Pure data — no JSX — so both the store (default-all selection) and the
// catalogue UI can import it without circular dependencies.
//
// SOURCE OF TRUTH: the Figma plugin (../scalable-designs-figma-plugin/src/code.ts).
// Each `key` here equals a CATALOG `gate` in the plugin; `axes` mirrors the
// plugin's SPECS variant matrix and `figmaSets` lists every component set the
// key unlocks in the generated Figma library. When the plugin's CATALOG/SPECS
// change, update this file to match — never the other way around.
//
// To add a component: add its gate + spec in the plugin first, then mirror it
// here. The UI renders it automatically.

/** One variant axis exactly as the plugin builds it (e.g. State: Default…Disabled). */
export interface VariantAxis {
  name: string
  values: string[]
}

export interface ComponentDef {
  key: string
  label: string
  /** Category — mirrors the plugin's "❖ Category" divider pages in Figma. */
  category: string
  description: string
  usage: string
  /** Variant matrix as generated in Figma. Empty array = single component. */
  axes: VariantAxis[]
  /** Every Figma component set this key unlocks (plugin CATALOG entries). */
  figmaSets: string[]
  props: { name: string; type: string; description: string }[]
  accessibility: string
}

export const COMPONENTS: ComponentDef[] = [
  // ── Button & Actions ────────────────────────────────────────────────────────
  {
    key: 'Button',
    label: 'Button',
    category: 'Button & Actions',
    description:
      'The core action component of the system. It covers primary, destructive and success intents across four visual styles and the full interaction lifecycle, so a generic button never has to be rebuilt.',
    usage: 'Use for the single most important action on a surface. Limit to 1–2 per section.',
    axes: [
      { name: 'Color', values: ['Brand', 'Danger', 'Success'] },
      { name: 'Style', values: ['Solid', 'Outline', 'Soft', 'Ghost'] },
      { name: 'State', values: ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled'] },
    ],
    figmaSets: ['Button', 'Button Close', 'Button FAB', 'Button Group', 'Button Social', 'Text Link', 'Store Badge'],
    props: [
      { name: 'color', type: '"brand" | "danger" | "success"', description: 'Semantic intent of the action' },
      { name: 'style', type: '"solid" | "outline" | "soft" | "ghost"', description: 'Visual emphasis of the button' },
      { name: 'label', type: 'string', description: 'Verb-led text content' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction and applies muted styles' },
      { name: 'loading', type: 'boolean', description: 'Replaces label with spinner, blocks clicks' },
      { name: 'leadingIcon', type: 'ReactNode', description: 'Icon before the label' },
    ],
    accessibility: 'Uses native <button>. Requires accessible label. Disabled state uses aria-disabled.',
  },
  // ── Form Controls ───────────────────────────────────────────────────────────
  {
    key: 'Input',
    label: 'Input',
    category: 'Form Controls',
    description:
      'The core text entry component. It covers every common input context out of the box — plain text, e-mail, password, search, phone number and website — across three sizes and the full input lifecycle.',
    usage: 'Always pair with a visible label. Use hint text for format guidance, error text for validation.',
    axes: [
      { name: 'Size', values: ['MD', 'SM', 'XS'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Filled', 'Error', 'Loading', 'Disabled'] },
      { name: 'Type', values: ['Default', 'E-Mail', 'Password', 'Search', 'Phone Number', 'Website'] },
    ],
    figmaSets: ['Input', 'Input Text Area', 'Input OTP', 'Input Stepper', 'Input Tag', 'File Upload', 'Slider'],
    props: [
      { name: 'label', type: 'string', description: 'Visible label above the field' },
      { name: 'type', type: '"text" | "email" | "password" | "search" | "tel" | "url"', description: 'Input context — drives the inner layout' },
      { name: 'size', type: '"xs" | "sm" | "md"', description: 'Field height scale' },
      { name: 'placeholder', type: 'string', description: 'Ghost text when empty' },
      { name: 'hint', type: 'string', description: 'Helper text below the field' },
      { name: 'error', type: 'string', description: 'Validation error message' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction' },
    ],
    accessibility: 'Label linked via htmlFor/id. Error uses aria-describedby + role="alert".',
  },
  {
    key: 'Select',
    label: 'Select',
    category: 'Form Controls',
    description: 'Dropdown trigger that shares the input tokens, with full state coverage for forms and filters.',
    usage: 'Use when options exceed 4 items. For fewer options, prefer Radio or ButtonGroup.',
    axes: [{ name: 'State', values: ['Default', 'Hover', 'Focused', 'Error', 'Disabled'] }],
    figmaSets: ['Select'],
    props: [
      { name: 'options', type: 'Option[]', description: 'Array of { label, value } objects' },
      { name: 'value', type: 'string', description: 'Selected value' },
      { name: 'placeholder', type: 'string', description: 'Label when nothing selected' },
      { name: 'error', type: 'string', description: 'Validation error message' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction' },
    ],
    accessibility: 'Built on Radix Select. Keyboard navigable. Options have role="option".',
  },
  {
    key: 'Checkbox',
    label: 'Checkbox',
    category: 'Form Controls',
    description: 'Binary selection control with checked and unchecked matrices across every interaction state.',
    usage: 'Use for lists of independent options. For mutually exclusive options, use Radio.',
    axes: [
      { name: 'Checked', values: ['True', 'False'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Disabled'] },
    ],
    figmaSets: ['Checkbox', 'Checkbox Group', 'Radio', 'Radio Group'],
    props: [
      { name: 'checked', type: 'boolean', description: 'Current state' },
      { name: 'label', type: 'string', description: 'Visible text label' },
      { name: 'description', type: 'string', description: 'Sub-label for context' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction' },
    ],
    accessibility: 'Native checkbox input with aria-checked for indeterminate state.',
  },
  {
    key: 'Toggle',
    label: 'Toggle',
    category: 'Form Controls',
    description: 'On/off switch with token-driven track and knob, covering hover, focus and disabled states.',
    usage: 'Prefer over Checkbox when the change applies without a save action.',
    axes: [
      { name: 'On', values: ['True', 'False'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Disabled'] },
    ],
    figmaSets: ['Toggle', 'Switch Group'],
    props: [
      { name: 'checked', type: 'boolean', description: 'Active state' },
      { name: 'label', type: 'string', description: 'Visible label' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction' },
    ],
    accessibility: 'Uses role="switch" with aria-checked. Label associated via aria-labelledby.',
  },
  // ── Indicators ──────────────────────────────────────────────────────────────
  {
    key: 'Badge',
    label: 'Badge',
    category: 'Indicators',
    description: 'Compact label for statuses and metadata — three visual styles across the semantic status roles.',
    usage: "Keep text short (1–2 words). Don't use for interactive filtering — use Chip instead.",
    axes: [
      { name: 'Style', values: ['Solid', 'Soft', 'Outline'] },
      { name: 'Color', values: ['Neutral', 'Brand', 'Success', 'Warning', 'Error', 'Info'] },
    ],
    figmaSets: ['Badge', 'Chip', 'Status Badge'],
    props: [
      { name: 'color', type: '"neutral" | "brand" | "success" | "warning" | "error" | "info"', description: 'Semantic status role' },
      { name: 'style', type: '"solid" | "soft" | "outline"', description: 'Visual style' },
      { name: 'label', type: 'string', description: 'Badge text' },
    ],
    accessibility: 'Purely presentational. Add sr-only context if color conveys meaning.',
  },
  {
    key: 'Progress',
    label: 'Progress',
    category: 'Indicators',
    description: 'Linear progress indicator; track and bar reference the progress tokens.',
    usage: 'Use for operations over 2s. Show percentage when known. Pair with a label.',
    axes: [],
    figmaSets: ['Progress', 'Step Indicator'],
    props: [
      { name: 'value', type: 'number | null', description: '0–100 for determinate, null for indeterminate' },
      { name: 'label', type: 'string', description: 'Accessible description' },
      { name: 'showValue', type: 'boolean', description: 'Renders percentage label' },
    ],
    accessibility: 'role="progressbar" with aria-valuenow, aria-valuemin, aria-valuemax.',
  },
  {
    key: 'Spinner',
    label: 'Spinner',
    category: 'Indicators',
    description: 'Loading indicator in three sizes, tinted by the spinner color token.',
    usage: 'Prefer skeleton screens for content loading. Use Spinner for action feedback.',
    axes: [{ name: 'Size', values: ['SM', 'MD', 'LG'] }],
    figmaSets: ['Spinner'],
    props: [
      { name: 'size', type: '"sm" | "md" | "lg"', description: 'Diameter — 16 / 24 / 32px' },
      { name: 'label', type: 'string', description: 'sr-only accessible label (required)' },
    ],
    accessibility: 'role="status" with sr-only label. Animated via CSS, respects prefers-reduced-motion.',
  },
  // ── Content & Surfaces ──────────────────────────────────────────────────────
  {
    key: 'Avatar',
    label: 'Avatar',
    category: 'Content & Surfaces',
    description: 'Avatar with initials fallback for identity representation — XS to XL sizes.',
    usage: 'Use consistently at the same size in a given context. Stack for teams.',
    axes: [{ name: 'Size', values: ['XS', 'SM', 'MD', 'LG', 'XL'] }],
    figmaSets: ['Avatar'],
    props: [
      { name: 'src', type: 'string', description: 'Image URL' },
      { name: 'name', type: 'string', description: 'Used for initials and alt text' },
      { name: 'size', type: '"xs" | "sm" | "md" | "lg" | "xl"', description: 'Diameter — 24 / 32 / 40 / 48 / 56px' },
    ],
    accessibility: 'img alt generated from name. Decorative images use alt="".',
  },
  {
    key: 'Card',
    label: 'Card',
    category: 'Content & Surfaces',
    description: 'Contained surface for grouping related content and actions. Fill → card/bg → surface/1.',
    usage: 'Use consistent padding within a layout. Avoid nesting cards more than 1 level.',
    axes: [],
    figmaSets: ['Card'],
    props: [
      { name: 'padding', type: '"sm" | "md" | "lg"', description: 'Internal spacing' },
      { name: 'shadow', type: '"none" | "sm" | "md" | "lg"', description: 'Elevation level' },
      { name: 'onClick', type: '() => void', description: 'Makes the card interactive' },
    ],
    accessibility: 'Clickable cards use role="button" or wrapping <a>. Focus ring visible.',
  },
  {
    key: 'Divider',
    label: 'Divider',
    category: 'Content & Surfaces',
    description: 'Rule between sections or list items. Fill → divider/color token.',
    usage: 'Use sparingly — whitespace is usually sufficient. Add label only for section breaks.',
    axes: [{ name: 'Orientation', values: ['Horizontal', 'Vertical'] }],
    figmaSets: ['Divider'],
    props: [
      { name: 'orientation', type: '"horizontal" | "vertical"', description: 'Direction' },
      { name: 'label', type: 'string', description: 'Optional center text' },
    ],
    accessibility: 'role="separator". Decorative dividers use aria-hidden="true".',
  },
  {
    key: 'Modal',
    label: 'Modal',
    category: 'Content & Surfaces',
    description: 'Dialog with footer actions for critical flows that require full attention.',
    usage: "Reserve for destructive confirmations or multi-step flows. Don't use for notifications.",
    axes: [],
    figmaSets: ['Modal'],
    props: [
      { name: 'open', type: 'boolean', description: 'Controls visibility' },
      { name: 'onClose', type: '() => void', description: 'Called on backdrop click or Esc' },
      { name: 'title', type: 'string', description: 'Dialog heading' },
    ],
    accessibility: 'role="dialog", aria-modal="true". Focus trapped inside. Returns focus on close.',
  },
  {
    key: 'Tooltip',
    label: 'Tooltip',
    category: 'Content & Surfaces',
    description: 'Contextual label on hover or focus. Fill → tooltip/bg → surface/inverse.',
    usage: 'Only use for icon-only buttons or truncated text. Never put interactive content inside.',
    axes: [],
    figmaSets: ['Tooltip'],
    props: [
      { name: 'content', type: 'string', description: 'Tooltip text' },
      { name: 'side', type: '"top" | "bottom" | "left" | "right"', description: 'Preferred placement' },
    ],
    accessibility: 'role="tooltip" linked via aria-describedby. Appears on focus and hover.',
  },
  // ── Feedback ────────────────────────────────────────────────────────────────
  {
    key: 'Toast',
    label: 'Toast',
    category: 'Feedback',
    description: 'Transient snackbar notification with status dot, message and action — one variant per semantic status role.',
    usage: 'Auto-dismiss after 4–6s. Offer undo for destructive actions. Max 3 visible at once.',
    axes: [{ name: 'Status', values: ['Success', 'Error', 'Warning', 'Info'] }],
    figmaSets: ['Toast', 'Alert Banner', 'Inline Alert'],
    props: [
      { name: 'status', type: '"success" | "error" | "warning" | "info"', description: 'Semantic status role' },
      { name: 'message', type: 'string', description: 'Short message' },
      { name: 'action', type: '{ label: string; onClick: () => void }', description: 'Inline CTA' },
      { name: 'duration', type: 'number', description: 'Auto-dismiss delay in ms (default 4000)' },
    ],
    accessibility: 'role="status" for default, role="alert" for errors. Live region announced.',
  },
  // ── Navigation ──────────────────────────────────────────────────────────────
  {
    key: 'Tabs',
    label: 'Tabs',
    category: 'Navigation',
    description: 'Tab bar for switchable panels. Indicator → tabs/indicator → action/primary.',
    usage: 'Use when content is parallel, not sequential. Limit to 2–7 tabs visible at once.',
    axes: [],
    figmaSets: ['Tabs', 'Segmented Control'],
    props: [
      { name: 'items', type: 'TabItem[]', description: 'Array of { label, value, content } objects' },
      { name: 'defaultValue', type: 'string', description: 'Initially active tab' },
    ],
    accessibility: 'ARIA tabs pattern: role="tablist", role="tab", role="tabpanel". Arrow key navigation.',
  },
  {
    key: 'Breadcrumb',
    label: 'Breadcrumb',
    category: 'Navigation',
    description: "Breadcrumb trail showing the user's location within a multi-level structure.",
    usage: "Only use when hierarchy is 3+ levels deep. Don't duplicate primary navigation.",
    axes: [],
    figmaSets: ['Breadcrumb'],
    props: [
      { name: 'items', type: '{ label: string; href?: string }[]', description: 'Path segments' },
      { name: 'separator', type: 'ReactNode', description: 'Custom separator element' },
    ],
    accessibility: 'nav aria-label="Breadcrumb". Current page has aria-current="page".',
  },
]

// Mirrors the plugin's "❖ Category" divider pages, in the same order.
export const CATEGORIES = ['Button & Actions', 'Form Controls', 'Indicators', 'Content & Surfaces', 'Feedback', 'Navigation']

// All component keys — used to seed the store so the system ships with every
// component included by default (the user removes what they don't want).
export const COMPONENT_KEYS = COMPONENTS.map((c) => c.key)
