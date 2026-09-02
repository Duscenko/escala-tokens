// ─── Component catalogue (data) ──────────────────────────────────────────────
// Pure data — no JSX — so both the store (default-all selection) and the
// catalogue UI can import it without circular dependencies.
//
// SOURCE OF TRUTH: the Figma plugin (../escala-figma-plugin/src/code.ts).
// Each `key` here equals a CATALOG `gate` in the plugin; `axes` mirrors the
// plugin's SPECS variant matrix and `figmaSets` lists every component set the
// key unlocks in the generated Figma library. When the plugin's CATALOG/SPECS
// change, update this file to match — never the other way around.
//
// Entries with an EMPTY `figmaSets` are catalogue-first: they document + preview
// in the configurator and export in `atoms`, but their plugin gate doesn't exist
// yet (the doc pane labels them "not in the Figma library yet"). When the plugin
// gains the set, fill in `figmaSets` here.
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
      { name: 'Size', values: ['MD', 'SM', 'LG', 'XL'] },
      { name: 'State', values: ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled'] },
    ],
    figmaSets: ['Button'],
    props: [
      { name: 'color', type: '"brand" | "danger" | "success"', description: 'Semantic intent of the action' },
      { name: 'style', type: '"solid" | "outline" | "soft" | "ghost"', description: 'Visual emphasis of the button' },
      { name: 'size', type: '"sm" | "md" | "lg" | "xl"', description: 'Control height — follows the Sizes foundation (sm·md·lg·xl); lg/xl for touch/mobile CTAs' },
      { name: 'label', type: 'string', description: 'Verb-led text content' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction and applies muted styles' },
      { name: 'loading', type: 'boolean', description: 'Replaces label with spinner, blocks clicks' },
      { name: 'leadingIcon', type: 'ReactNode', description: 'Icon before the label' },
    ],
    accessibility: 'Uses native <button>. Requires accessible label. Disabled state uses aria-disabled.',
  },
  {
    key: 'ButtonGroup',
    label: 'Button Group',
    category: 'Button & Actions',
    description: 'A row of attached buttons sharing one border, for related actions or exclusive views.',
    usage: 'Use for 2–4 sibling actions of equal weight. For a single selected view, prefer Segmented Control.',
    axes: [{ name: 'Size', values: ['MD', 'SM', 'LG'] }],
    figmaSets: ['Button Group'],
    props: [
      { name: 'items', type: '{ label: string; onClick: () => void }[]', description: 'Buttons in visual order' },
      { name: 'size', type: '"sm" | "md" | "lg"', description: 'Shared height scale — follows the Sizes foundation' },
    ],
    accessibility: 'Wrapped in role="group" with aria-label. Each item is a native <button>.',
  },
  {
    key: 'CloseButton',
    label: 'Close Button',
    category: 'Button & Actions',
    description: 'Icon-only dismiss affordance shared by modals, banners, chips and toasts.',
    usage: 'Place top-right of the surface it dismisses. Keep a minimum 24px hit area.',
    axes: [
      { name: 'Size', values: ['MD', 'SM'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused'] },
    ],
    figmaSets: ['Button Close'],
    props: [
      { name: 'size', type: '"sm" | "md"', description: 'Hit-area scale — 24 / 32px' },
      { name: 'onClick', type: '() => void', description: 'Dismiss handler' },
    ],
    accessibility: 'aria-label="Close" required — the glyph alone is not accessible.',
  },
  {
    key: 'FABButton',
    label: 'FAB Button',
    category: 'Button & Actions',
    description: 'Floating action button — a circular, elevated CTA for the primary screen action.',
    usage: 'One per screen, anchored to a corner. Reserve for the single most common action.',
    axes: [{ name: 'Size', values: ['MD', 'LG'] }],
    figmaSets: ['Button FAB'],
    props: [
      { name: 'icon', type: 'ReactNode', description: 'Glyph at the center (required)' },
      { name: 'size', type: '"md" | "lg"', description: 'Diameter — 48 / 56px' },
      { name: 'label', type: 'string', description: 'Accessible name for the action' },
    ],
    accessibility: 'aria-label required (icon-only). Elevation communicated via shadow tokens only.',
  },
  {
    key: 'SocialLoginButton',
    label: 'Social Login Button',
    category: 'Button & Actions',
    description: 'Outlined sign-in button carrying a provider mark — Google, Apple, GitHub or Figma.',
    usage: 'Stack vertically above the email form. Keep provider order consistent across screens.',
    axes: [
      { name: 'Provider', values: ['Google', 'Apple', 'GitHub', 'Figma'] },
      { name: 'Size', values: ['MD', 'LG'] },
    ],
    figmaSets: ['Button Social'],
    props: [
      { name: 'provider', type: '"google" | "apple" | "github" | "figma"', description: 'Identity provider' },
      { name: 'size', type: '"md" | "lg"', description: 'Control height — lg for mobile sign-in screens' },
      { name: 'onClick', type: '() => void', description: 'Starts the OAuth flow' },
    ],
    accessibility: 'Native <button> with the full "Continue with …" label — never icon-only.',
  },
  {
    key: 'TextLink',
    label: 'Text Link',
    category: 'Button & Actions',
    description: 'Inline navigational link styled from the brand text token, with hover and disabled states.',
    usage: 'Use for navigation inside copy. For actions, use Button — links navigate, buttons act.',
    axes: [{ name: 'State', values: ['Default', 'Hover', 'Disabled'] }],
    figmaSets: ['Text Link'],
    props: [
      { name: 'href', type: 'string', description: 'Destination URL' },
      { name: 'external', type: 'boolean', description: 'Adds the ↗ affordance and target="_blank"' },
    ],
    accessibility: 'Real <a> element. Underline on hover/focus so color is not the only signal.',
  },
  {
    key: 'AppStoreBadge',
    label: 'App Store Badge',
    category: 'Button & Actions',
    description: 'Marketing download badge for the App Store and Google Play, in the standard dark style.',
    usage: 'Use only on marketing surfaces, at the platform-mandated minimum size.',
    axes: [{ name: 'Store', values: ['App Store', 'Google Play'] }],
    figmaSets: ['Store Badge'],
    props: [
      { name: 'store', type: '"app-store" | "google-play"', description: 'Target store' },
      { name: 'href', type: 'string', description: 'Store listing URL' },
    ],
    accessibility: 'Anchor with descriptive aria-label ("Download on the App Store").',
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
    figmaSets: ['Input'],
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
    key: 'InputGroup',
    label: 'Input Group',
    category: 'Form Controls',
    description: 'An input with attached add-ons — prefix segments, selects or buttons sharing one border.',
    usage: 'Use for values with a fixed context (URLs, amounts, handles). Keep one add-on per side.',
    axes: [],
    figmaSets: ['Input Group'],
    props: [
      { name: 'prefix', type: 'ReactNode', description: 'Leading add-on (text, select)' },
      { name: 'suffix', type: 'ReactNode', description: 'Trailing add-on (button, unit)' },
    ],
    accessibility: 'Add-ons are described to the field via aria-describedby.',
  },
  {
    key: 'Textarea',
    label: 'Textarea',
    category: 'Form Controls',
    description: 'Multi-line text entry sharing the input tokens, with auto-grow and counter support.',
    usage: 'Use for free-form text over one line. Show a character counter when limits apply.',
    axes: [{ name: 'State', values: ['Default', 'Focused', 'Error', 'Disabled'] }],
    figmaSets: ['Input Text Area'],
    props: [
      { name: 'label', type: 'string', description: 'Visible label above the field' },
      { name: 'rows', type: 'number', description: 'Initial visible rows' },
      { name: 'maxLength', type: 'number', description: 'Enables the character counter' },
      { name: 'error', type: 'string', description: 'Validation error message' },
    ],
    accessibility: 'Label linked via htmlFor/id. Counter announced politely via aria-live.',
  },
  {
    key: 'InputOTP',
    label: 'Input OTP',
    category: 'Form Controls',
    description: 'One-time-passcode entry as separate character cells with auto-advance.',
    usage: 'Use 4–6 cells. Autofocus the first cell and submit automatically when complete.',
    axes: [
      { name: 'Size', values: ['MD', 'SM', 'LG'] },
      { name: 'State', values: ['Default', 'Filled', 'Error'] },
    ],
    figmaSets: ['Input OTP'],
    props: [
      { name: 'length', type: 'number', description: 'Number of cells (default 6)' },
      { name: 'size', type: '"sm" | "md" | "lg"', description: 'Cell height — follows the Sizes foundation' },
      { name: 'onComplete', type: '(code: string) => void', description: 'Fires when every cell is filled' },
    ],
    accessibility: 'Single-input semantics via autocomplete="one-time-code"; cells are presentational.',
  },
  {
    key: 'InputStepper',
    label: 'Input Stepper',
    category: 'Form Controls',
    description: 'Numeric input flanked by decrement / increment buttons, clamped to min–max.',
    usage: 'Use for small integer ranges (quantities, counts). For wide ranges, prefer Slider or Input.',
    axes: [],
    figmaSets: ['Input Stepper'],
    props: [
      { name: 'value', type: 'number', description: 'Current value' },
      { name: 'min', type: 'number', description: 'Lower clamp' },
      { name: 'max', type: 'number', description: 'Upper clamp' },
      { name: 'step', type: 'number', description: 'Increment size (default 1)' },
    ],
    accessibility: 'Native number input with aria-valuemin/max. Buttons labelled Increase/Decrease.',
  },
  {
    key: 'InputTag',
    label: 'Input Tag',
    category: 'Form Controls',
    description: 'Free-text input that commits entries as removable tags inside the field.',
    usage: 'Use for open-ended multi-values (emails, labels). For a known list, prefer Combobox.',
    axes: [],
    figmaSets: ['Input Tag'],
    props: [
      { name: 'value', type: 'string[]', description: 'Committed tags' },
      { name: 'onAdd', type: '(tag: string) => void', description: 'Fires on Enter / comma' },
      { name: 'onRemove', type: '(tag: string) => void', description: 'Fires on tag dismiss / Backspace' },
    ],
    accessibility: 'Tags removable via keyboard (Backspace). Each dismiss button labelled "Remove {tag}".',
  },
  {
    key: 'Select',
    label: 'Select',
    category: 'Form Controls',
    description: 'Dropdown trigger that shares the input tokens, with full state coverage for forms and filters.',
    usage: 'Use when options exceed 4 items. For fewer options, prefer Radio or ButtonGroup.',
    axes: [
      { name: 'Size', values: ['MD', 'SM', 'LG'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Error', 'Disabled'] },
    ],
    figmaSets: ['Select'],
    props: [
      { name: 'options', type: 'Option[]', description: 'Array of { label, value } objects' },
      { name: 'size', type: '"sm" | "md" | "lg"', description: 'Field height — matches Input sizes' },
      { name: 'value', type: 'string', description: 'Selected value' },
      { name: 'placeholder', type: 'string', description: 'Label when nothing selected' },
      { name: 'error', type: 'string', description: 'Validation error message' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction' },
    ],
    accessibility: 'Built on Radix Select. Keyboard navigable. Options have role="option".',
  },
  {
    key: 'Combobox',
    label: 'Combobox',
    category: 'Form Controls',
    description: 'Type-ahead select — an input that filters a dropdown list as the user types.',
    usage: 'Use when options exceed ~10 items or need search. For short lists, plain Select is enough.',
    axes: [{ name: 'State', values: ['Default', 'Open'] }],
    figmaSets: ['Combobox'],
    props: [
      { name: 'options', type: 'Option[]', description: 'Filterable list of { label, value }' },
      { name: 'value', type: 'string', description: 'Selected value' },
      { name: 'onSearch', type: '(query: string) => void', description: 'Filter callback' },
    ],
    accessibility: 'ARIA combobox pattern: role="combobox", aria-expanded, aria-activedescendant.',
  },
  {
    key: 'Checkbox',
    label: 'Checkbox',
    category: 'Form Controls',
    description: 'Binary selection control with checked and unchecked matrices across every interaction state.',
    usage: 'Use for lists of independent options. For mutually exclusive options, use Radio.',
    axes: [
      { name: 'Checked', values: ['True', 'False'] },
      { name: 'Size', values: ['MD', 'SM'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Disabled'] },
    ],
    figmaSets: ['Checkbox'],
    props: [
      { name: 'checked', type: 'boolean', description: 'Current state' },
      { name: 'size', type: '"sm" | "md"', description: 'Control scale — sm for dense lists/tables' },
      { name: 'label', type: 'string', description: 'Visible text label' },
      { name: 'description', type: 'string', description: 'Sub-label for context' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction' },
    ],
    accessibility: 'Native checkbox input with aria-checked for indeterminate state.',
  },
  {
    key: 'CheckboxGroup',
    label: 'Checkbox Group',
    category: 'Form Controls',
    description: 'A labelled stack of related checkboxes sharing one group semantic.',
    usage: 'Use for 2–7 independent options under one question. Order by likelihood or alphabet.',
    axes: [],
    figmaSets: ['Checkbox Group'],
    props: [
      { name: 'label', type: 'string', description: 'Group question / heading' },
      { name: 'options', type: '{ label: string; value: string }[]', description: 'Checkbox rows' },
      { name: 'value', type: 'string[]', description: 'Checked values' },
    ],
    accessibility: 'fieldset + legend semantics. Each row is a native checkbox.',
  },
  {
    key: 'Radio',
    label: 'Radio',
    category: 'Form Controls',
    description: 'Single-choice control with checked and unchecked matrices across every interaction state.',
    usage: 'Never render a radio alone — it always belongs to a group of 2+ exclusive options.',
    axes: [
      { name: 'Checked', values: ['True', 'False'] },
      { name: 'Size', values: ['MD', 'SM'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Disabled'] },
    ],
    figmaSets: ['Radio'],
    props: [
      { name: 'checked', type: 'boolean', description: 'Current state' },
      { name: 'size', type: '"sm" | "md"', description: 'Control scale — sm for dense option lists' },
      { name: 'label', type: 'string', description: 'Visible text label' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction' },
    ],
    accessibility: 'Native radio input. Group navigated with arrow keys per the ARIA pattern.',
  },
  {
    key: 'RadioGroup',
    label: 'Radio Group',
    category: 'Form Controls',
    description: 'A labelled stack of exclusive radio options — one value at a time.',
    usage: 'Use for 2–5 visible exclusive options. Beyond that, use Select.',
    axes: [],
    figmaSets: ['Radio Group'],
    props: [
      { name: 'label', type: 'string', description: 'Group question / heading' },
      { name: 'options', type: '{ label: string; value: string }[]', description: 'Radio rows' },
      { name: 'value', type: 'string', description: 'Selected value' },
    ],
    accessibility: 'role="radiogroup" + fieldset/legend. Arrow keys move selection.',
  },
  {
    key: 'Toggle',
    label: 'Switch',
    category: 'Form Controls',
    description: 'On/off switch with token-driven track and knob, covering hover, focus and disabled states.',
    usage: 'Prefer over Checkbox when the change applies without a save action.',
    axes: [
      { name: 'On', values: ['True', 'False'] },
      { name: 'Size', values: ['MD', 'SM'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Disabled'] },
    ],
    figmaSets: ['Toggle'],
    props: [
      { name: 'checked', type: 'boolean', description: 'Active state' },
      { name: 'size', type: '"sm" | "md"', description: 'Track scale — sm for table rows and dense settings' },
      { name: 'label', type: 'string', description: 'Visible label' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction' },
    ],
    accessibility: 'Uses role="switch" with aria-checked. Label associated via aria-labelledby.',
  },
  {
    key: 'SwitchGroup',
    label: 'Switch Group',
    category: 'Form Controls',
    description: 'A settings-style stack of labelled switches, each applying immediately.',
    usage: 'Use for related preferences (notifications, permissions). Lead each row with the benefit.',
    axes: [],
    figmaSets: ['Switch Group'],
    props: [
      { name: 'label', type: 'string', description: 'Group heading' },
      { name: 'items', type: '{ label: string; checked: boolean }[]', description: 'Switch rows' },
    ],
    accessibility: 'Each row uses role="switch" with its own label; group has a heading.',
  },
  {
    key: 'Slider',
    label: 'Slider',
    category: 'Form Controls',
    description: 'Draggable track for picking a value inside a continuous range.',
    usage: 'Use when the precise value matters less than the position in a range. Show the value.',
    axes: [],
    figmaSets: ['Slider'],
    props: [
      { name: 'value', type: 'number', description: 'Current value' },
      { name: 'min', type: 'number', description: 'Range start' },
      { name: 'max', type: 'number', description: 'Range end' },
      { name: 'step', type: 'number', description: 'Snap increment' },
    ],
    accessibility: 'role="slider" with aria-valuenow/min/max. Arrow keys adjust by step.',
  },
  {
    key: 'FileUpload',
    label: 'File Upload',
    category: 'Form Controls',
    description: 'Upload trigger with per-file rows showing name, size, progress and remove.',
    usage: 'List accepted formats and the size limit up front. Allow removing queued files.',
    axes: [],
    figmaSets: ['File Upload'],
    props: [
      { name: 'accept', type: 'string', description: 'Accepted MIME types / extensions' },
      { name: 'multiple', type: 'boolean', description: 'Allows several files' },
      { name: 'onFiles', type: '(files: File[]) => void', description: 'Selection callback' },
    ],
    accessibility: 'Native file input behind the styled trigger. Progress announced via aria-live.',
  },
  {
    key: 'Dropzone',
    label: 'Dropzone',
    category: 'Form Controls',
    description: 'Drag-and-drop target area for files, with active-drag and error states.',
    usage: 'Pair with a click-to-browse fallback — drag alone is not discoverable on touch.',
    axes: [{ name: 'State', values: ['Default', 'Dragging', 'Error'] }],
    figmaSets: ['Dropzone'],
    props: [
      { name: 'accept', type: 'string', description: 'Accepted MIME types / extensions' },
      { name: 'onDrop', type: '(files: File[]) => void', description: 'Drop / browse callback' },
      { name: 'maxSize', type: 'number', description: 'Per-file size limit in bytes' },
    ],
    accessibility: 'Focusable with keyboard; Enter opens the browse dialog. States announced.',
  },
  {
    key: 'Field',
    label: 'Field',
    category: 'Form Controls',
    description: 'The form-row composition — label, control slot, hint and error wired together.',
    usage: 'Wrap every form control in a Field so spacing, labels and errors stay consistent.',
    axes: [],
    figmaSets: ['Field'],
    props: [
      { name: 'label', type: 'string', description: 'Visible label' },
      { name: 'hint', type: 'string', description: 'Helper text below the control' },
      { name: 'error', type: 'string', description: 'Validation message (replaces hint)' },
      { name: 'required', type: 'boolean', description: 'Adds the required marker' },
    ],
    accessibility: 'Generates the htmlFor/id + aria-describedby wiring for whatever control it wraps.',
  },
  {
    key: 'Label',
    label: 'Label',
    category: 'Form Controls',
    description: 'Standalone form label with optional required marker and secondary hint.',
    usage: 'Always visible — placeholder text is not a label. Keep to 1–3 words.',
    axes: [{ name: 'Required', values: ['False', 'True'] }],
    figmaSets: ['Label'],
    props: [
      { name: 'htmlFor', type: 'string', description: 'Id of the labelled control' },
      { name: 'required', type: 'boolean', description: 'Shows the * marker' },
    ],
    accessibility: 'Native <label> element; the required marker also sets aria-required on the control.',
  },
  {
    key: 'PasswordStrength',
    label: 'Password Strength',
    category: 'Form Controls',
    description: 'Segmented meter + caption that scores a password as the user types.',
    usage: 'Update live while typing. Pair the meter with concrete guidance, not just a score.',
    axes: [{ name: 'Strength', values: ['Weak', 'Fair', 'Strong'] }],
    figmaSets: ['Password Strength'],
    props: [
      { name: 'value', type: 'string', description: 'Password to score' },
      { name: 'rules', type: 'Rule[]', description: 'Scoring rules (length, classes…)' },
    ],
    accessibility: 'Score announced politely via aria-live; color is never the only signal.',
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
      { name: 'Size', values: ['MD', 'SM', 'LG'] },
    ],
    figmaSets: ['Badge'],
    props: [
      { name: 'color', type: '"neutral" | "brand" | "success" | "warning" | "error" | "info"', description: 'Semantic status role' },
      { name: 'style', type: '"solid" | "soft" | "outline"', description: 'Visual style' },
      { name: 'size', type: '"sm" | "md" | "lg"', description: 'Text/padding scale — sm inside table cells, lg standalone' },
      { name: 'label', type: 'string', description: 'Badge text' },
    ],
    accessibility: 'Purely presentational. Add sr-only context if color conveys meaning.',
  },
  {
    key: 'StatusBadge',
    label: 'Status Badge',
    category: 'Indicators',
    description: 'Presence indicator — a colored dot plus label for online / away / busy / offline.',
    usage: 'Pair with an Avatar or a row of people. Keep the dot–meaning mapping consistent.',
    axes: [{ name: 'Status', values: ['Online', 'Away', 'Busy', 'Offline'] }],
    figmaSets: ['Status Badge'],
    props: [
      { name: 'status', type: '"online" | "away" | "busy" | "offline"', description: 'Presence state' },
      { name: 'showLabel', type: 'boolean', description: 'Renders the text next to the dot' },
    ],
    accessibility: 'Status conveyed in text (visible or sr-only) — never by the dot color alone.',
  },
  {
    key: 'Chip',
    label: 'Chip',
    category: 'Indicators',
    description: 'Interactive tag for filtering and multi-select — selectable and dismissible.',
    usage: 'Use for filters and applied selections. For static status, use Badge.',
    axes: [
      { name: 'Selected', values: ['False', 'True'] },
      { name: 'Dismissible', values: ['False', 'True'] },
      { name: 'Size', values: ['MD', 'SM'] },
    ],
    figmaSets: ['Chip'],
    props: [
      { name: 'label', type: 'string', description: 'Chip text' },
      { name: 'size', type: '"sm" | "md"', description: 'Padding/text scale — sm for dense filter rows' },
      { name: 'selected', type: 'boolean', description: 'Applied / active state' },
      { name: 'onDismiss', type: '() => void', description: 'Renders the ✕ affordance' },
    ],
    accessibility: 'Selectable chips use aria-pressed; the dismiss button is separately labelled.',
  },
  {
    key: 'Progress',
    label: 'Progress',
    category: 'Indicators',
    description: 'Linear progress indicator; track and bar reference the progress tokens.',
    usage: 'Use for operations over 2s. Show percentage when known. Pair with a label.',
    axes: [],
    figmaSets: ['Progress'],
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
  {
    key: 'Rating',
    label: 'Rating',
    category: 'Indicators',
    description: 'Star row for displaying or collecting a 1–5 score.',
    usage: 'Read-only by default; make interactive only where the user actually rates.',
    axes: [{ name: 'Interactive', values: ['False', 'True'] }],
    figmaSets: ['Rating'],
    props: [
      { name: 'value', type: 'number', description: 'Score 0–5, halves allowed' },
      { name: 'onChange', type: '(value: number) => void', description: 'Makes the row interactive' },
      { name: 'count', type: 'number', description: 'Optional review count label' },
    ],
    accessibility: 'Read-only uses an aria-label ("4 of 5 stars"); interactive follows the radio pattern.',
  },
  {
    key: 'FileFormat',
    label: 'File Format',
    category: 'Indicators',
    description: 'Document glyph with a format plate (PDF, PNG, SVG, ZIP…) for file lists.',
    usage: 'Use inside upload rows and attachment lists so formats scan at a glance.',
    axes: [{ name: 'Format', values: ['PDF', 'PNG', 'SVG', 'ZIP'] }],
    figmaSets: ['File Format'],
    props: [
      { name: 'format', type: 'string', description: 'Extension shown on the plate' },
      { name: 'size', type: '"sm" | "md"', description: 'Glyph scale' },
    ],
    accessibility: 'Decorative next to a visible filename (aria-hidden); labelled when standalone.',
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
    label: 'Separator',
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
    key: 'Accordion',
    label: 'Accordion',
    category: 'Content & Surfaces',
    description: 'Vertically stacked disclosure rows — headers that expand one panel of content each.',
    usage: 'Use for secondary content (FAQs, advanced settings). Never hide critical content inside.',
    axes: [],
    figmaSets: ['Accordion'],
    props: [
      { name: 'items', type: '{ title: string; content: ReactNode }[]', description: 'Disclosure rows' },
      { name: 'type', type: '"single" | "multiple"', description: 'How many panels may open' },
      { name: 'defaultValue', type: 'string', description: 'Initially expanded row' },
    ],
    accessibility: 'Headers are buttons with aria-expanded + aria-controls on their panel.',
  },
  {
    key: 'AspectRatio',
    label: 'Aspect Ratio',
    category: 'Content & Surfaces',
    description: 'Layout primitive that locks its content to a fixed ratio (16:9, 4:3, 1:1…).',
    usage: 'Wrap media (images, embeds, maps) so layouts never shift while content loads.',
    axes: [{ name: 'Ratio', values: ['16:9', '4:3', '1:1'] }],
    figmaSets: ['Aspect Ratio'],
    props: [
      { name: 'ratio', type: 'number', description: 'Width / height (e.g. 16 / 9)' },
      { name: 'children', type: 'ReactNode', description: 'Content clipped to the ratio' },
    ],
    accessibility: 'Purely presentational — semantics come from the wrapped content.',
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
    key: 'Popover',
    label: 'Popover',
    category: 'Content & Surfaces',
    description: 'Anchored floating panel for rich contextual content — richer than a tooltip, lighter than a modal.',
    usage: 'Open on click, not hover. Keep one primary action inside at most.',
    axes: [],
    figmaSets: ['Popover'],
    props: [
      { name: 'trigger', type: 'ReactNode', description: 'Anchor element' },
      { name: 'side', type: '"top" | "bottom" | "left" | "right"', description: 'Preferred placement' },
      { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Visibility callback' },
    ],
    accessibility: 'Trigger gets aria-haspopup + aria-expanded. Esc closes; focus returns to trigger.',
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
  {
    key: 'InfoTooltip',
    label: 'Info Tooltip',
    category: 'Content & Surfaces',
    description: 'The ⓘ affordance + tooltip pairing for inline explanations next to labels.',
    usage: 'Use next to a label that needs one sentence of context. Longer help belongs in hint text.',
    axes: [],
    figmaSets: ['Info Tooltip'],
    props: [
      { name: 'content', type: 'string', description: 'Explanation text (one sentence)' },
      { name: 'side', type: '"top" | "bottom"', description: 'Preferred placement' },
    ],
    accessibility: 'The trigger is a focusable button labelled "More information"; tooltip on focus too.',
  },
  {
    key: 'ScrollArea',
    label: 'Scroll Area',
    category: 'Content & Surfaces',
    description: 'Custom-scrollbar container that keeps overflow styling consistent cross-platform.',
    usage: 'Use inside panels and menus with bounded height. Never trap page scroll.',
    axes: [],
    figmaSets: ['Scroll Area'],
    props: [
      { name: 'maxHeight', type: 'number | string', description: 'Scroll boundary' },
      { name: 'orientation', type: '"vertical" | "horizontal" | "both"', description: 'Scroll axes' },
    ],
    accessibility: 'Container is keyboard-scrollable (tabIndex 0 + arrow keys) with an aria-label.',
  },
  // ── Feedback ────────────────────────────────────────────────────────────────
  {
    key: 'Toast',
    label: 'Toast',
    category: 'Feedback',
    description: 'Transient snackbar notification with status dot, message and action — one variant per semantic status role.',
    usage: 'Auto-dismiss after 4–6s. Offer undo for destructive actions. Max 3 visible at once.',
    axes: [{ name: 'Status', values: ['Success', 'Error', 'Warning', 'Info'] }],
    figmaSets: ['Toast'],
    props: [
      { name: 'status', type: '"success" | "error" | "warning" | "info"', description: 'Semantic status role' },
      { name: 'message', type: 'string', description: 'Short message' },
      { name: 'action', type: '{ label: string; onClick: () => void }', description: 'Inline CTA' },
      { name: 'duration', type: 'number', description: 'Auto-dismiss delay in ms (default 4000)' },
    ],
    accessibility: 'role="status" for default, role="alert" for errors. Live region announced.',
  },
  {
    key: 'AlertBanner',
    label: 'Alert Banner',
    category: 'Feedback',
    description: 'Full-width page or section banner for persistent, prominent messages.',
    usage: 'Use for system-level notices (maintenance, billing). One banner per page at most.',
    axes: [{ name: 'Status', values: ['Info', 'Success', 'Warning', 'Error'] }],
    figmaSets: ['Alert Banner'],
    props: [
      { name: 'status', type: '"info" | "success" | "warning" | "error"', description: 'Semantic status role' },
      { name: 'message', type: 'string', description: 'Banner text' },
      { name: 'action', type: '{ label: string; onClick: () => void }', description: 'Inline CTA' },
      { name: 'dismissible', type: 'boolean', description: 'Renders the close button' },
    ],
    accessibility: 'role="status" (or "alert" for errors). Dismiss button labelled "Dismiss".',
  },
  {
    key: 'InlineAlert',
    label: 'Inline Alert',
    category: 'Feedback',
    description: 'Contextual callout box inside a form or section — icon, title and body on a soft status fill.',
    usage: 'Place directly above the content it concerns. Keep to a title + one sentence.',
    axes: [{ name: 'Status', values: ['Info', 'Success', 'Warning', 'Error'] }],
    figmaSets: ['Inline Alert'],
    props: [
      { name: 'status', type: '"info" | "success" | "warning" | "error"', description: 'Semantic status role' },
      { name: 'title', type: 'string', description: 'Bold first line' },
      { name: 'children', type: 'ReactNode', description: 'Supporting body copy' },
    ],
    accessibility: 'role="status"; errors use role="alert". Icon is decorative (aria-hidden).',
  },
  // ── Navigation ──────────────────────────────────────────────────────────────
  {
    key: 'Tabs',
    label: 'Tabs',
    category: 'Navigation',
    description: 'Tab bar for switchable panels. Indicator → tabs/indicator → action/primary.',
    usage: 'Use when content is parallel, not sequential. Limit to 2–7 tabs visible at once.',
    axes: [],
    figmaSets: ['Tabs'],
    props: [
      { name: 'items', type: 'TabItem[]', description: 'Array of { label, value, content } objects' },
      { name: 'defaultValue', type: 'string', description: 'Initially active tab' },
    ],
    accessibility: 'ARIA tabs pattern: role="tablist", role="tab", role="tabpanel". Arrow key navigation.',
  },
  {
    key: 'TabMenu',
    label: 'Tab Menu',
    category: 'Navigation',
    description: 'Pill-style horizontal menu — the softer sibling of Tabs for page-level sections.',
    usage: 'Use for top-level page sections where an underline bar feels too heavy.',
    axes: [],
    figmaSets: ['Tab Menu'],
    props: [
      { name: 'items', type: '{ label: string; value: string }[]', description: 'Menu entries' },
      { name: 'value', type: 'string', description: 'Active entry' },
    ],
    accessibility: 'Same ARIA tabs pattern as Tabs — role="tablist" with arrow-key navigation.',
  },
  {
    key: 'SegmentedControl',
    label: 'Segmented Control',
    category: 'Navigation',
    description: 'Joined single-choice control — one segment active at a time, iOS-style.',
    usage: 'Use for 2–4 exclusive views of the same data (e.g. List / Board). Not for navigation.',
    axes: [{ name: 'Size', values: ['MD', 'SM'] }],
    figmaSets: ['Segmented Control'],
    props: [
      { name: 'options', type: '{ label: string; value: string }[]', description: 'Segments in order' },
      { name: 'value', type: 'string', description: 'Active segment' },
      { name: 'size', type: '"sm" | "md"', description: 'Segment height — sm for toolbars' },
    ],
    accessibility: 'role="radiogroup" semantics; segments toggle with arrow keys.',
  },
  {
    key: 'Breadcrumb',
    label: 'Breadcrumbs',
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
  {
    key: 'Pagination',
    label: 'Pagination',
    category: 'Navigation',
    description: 'Page switcher with previous/next arrows, numbered pages and overflow ellipsis.',
    usage: 'Use for result sets over one page. Keep the current page visually unmistakable.',
    axes: [],
    figmaSets: ['Pagination'],
    props: [
      { name: 'page', type: 'number', description: 'Current page (1-based)' },
      { name: 'pageCount', type: 'number', description: 'Total pages' },
      { name: 'onPageChange', type: '(page: number) => void', description: 'Navigation callback' },
    ],
    accessibility: 'nav aria-label="Pagination". Current page uses aria-current="page".',
  },
  {
    key: 'Stepper',
    label: 'Stepper',
    category: 'Navigation',
    description: 'Step indicator for multi-stage flows — completed, current and upcoming steps with connectors.',
    usage: 'Use for 3–5 step flows (checkout, onboarding). Label every step.',
    axes: [],
    figmaSets: ['Step Indicator'],
    props: [
      { name: 'steps', type: '{ label: string }[]', description: 'Steps in order' },
      { name: 'current', type: 'number', description: 'Active step index (0-based)' },
    ],
    accessibility: 'Ordered list semantics. Current step marked with aria-current="step".',
  },
  {
    key: 'DropdownMenu',
    label: 'Dropdown Menu',
    category: 'Navigation',
    description: 'Action menu opened from a trigger — items, separators and a destructive zone.',
    usage: 'Use for 3+ secondary actions behind a "⋯" or button. Destructive items go last.',
    axes: [],
    figmaSets: ['Dropdown Menu'],
    props: [
      { name: 'trigger', type: 'ReactNode', description: 'Opening element' },
      { name: 'items', type: 'MenuItem[]', description: 'Actions, separators, groups' },
      { name: 'align', type: '"start" | "end"', description: 'Edge the menu aligns to' },
    ],
    accessibility: 'ARIA menu pattern: role="menu"/"menuitem", arrow keys + typeahead, Esc closes.',
  },
  {
    key: 'ContextMenu',
    label: 'Context Menu',
    category: 'Navigation',
    description: 'Right-click menu with shortcut hints — the pointer-positioned sibling of Dropdown Menu.',
    usage: 'Every context-menu action must also exist somewhere visible — right-click is a shortcut.',
    axes: [],
    figmaSets: ['Context Menu'],
    props: [
      { name: 'items', type: 'MenuItem[]', description: 'Actions with optional shortcut hints' },
      { name: 'children', type: 'ReactNode', description: 'Right-clickable target area' },
    ],
    accessibility: 'Same ARIA menu pattern; also opened via the keyboard Menu key / Shift+F10.',
  },
  {
    key: 'Command',
    label: 'Command',
    category: 'Navigation',
    description: 'Command palette — a searchable action list summoned with ⌘K.',
    usage: 'Index every significant action and destination. Rank recent items first.',
    axes: [],
    figmaSets: ['Command'],
    props: [
      { name: 'items', type: 'CommandItem[]', description: 'Searchable actions with groups + icons' },
      { name: 'open', type: 'boolean', description: 'Controls visibility' },
      { name: 'onSelect', type: '(item: CommandItem) => void', description: 'Run the chosen action' },
    ],
    accessibility: 'Combobox+listbox pattern inside a dialog. Results announced via aria-live.',
  },
  {
    key: 'Navbar',
    label: 'Navbar',
    category: 'Navigation',
    description: 'Top app bar — brand mark, primary destinations and the account cluster.',
    usage: 'Keep to 5±2 destinations. The current page must be visibly marked.',
    axes: [],
    figmaSets: ['Navbar'],
    props: [
      { name: 'items', type: '{ label: string; href: string }[]', description: 'Primary destinations' },
      { name: 'logo', type: 'ReactNode', description: 'Brand slot' },
      { name: 'actions', type: 'ReactNode', description: 'Right-side cluster (search, avatar…)' },
    ],
    accessibility: '<header> + <nav aria-label="Main">. Current page uses aria-current="page".',
  },
  {
    key: 'Sidebar',
    label: 'Sidebar',
    category: 'Navigation',
    description: 'Vertical navigation panel with grouped items and an active state.',
    usage: 'Use for app-level sections when destinations exceed what a navbar holds.',
    axes: [],
    figmaSets: ['Sidebar'],
    props: [
      { name: 'items', type: 'NavItem[]', description: 'Groups + entries with icons' },
      { name: 'value', type: 'string', description: 'Active entry' },
      { name: 'collapsible', type: 'boolean', description: 'Allows rail / expanded modes' },
    ],
    accessibility: '<nav aria-label="Sidebar">; active item uses aria-current. Fully arrow-key navigable.',
  },
]

// Mirrors the plugin's "❖ Category" divider pages, in the same order.
export const CATEGORIES = ['Button & Actions', 'Form Controls', 'Indicators', 'Content & Surfaces', 'Feedback', 'Navigation']

// ── Figma import scope ───────────────────────────────────────────────────────
// `figmaSets` above names the component set(s) a key maps to in the plugin's
// full CATALOG (../escala-figma-plugin/src/code.ts) — the variant matrix the
// plugin CAN build. The default live import builds a FIXED 9-component sample
// sheet ('⬡ Components Overview'). Its explicit Full catalogue option builds
// all 58 component types, using representative source variants that cover each
// axis value instead of materializing the 1,403-combination cartesian product.
//
// Every one of the 58 still ships as a full spec — props, variant axes,
// tokens, accessibility notes — into `tokens.json` (`atoms`) and the agent
// bundle. Only the keys below additionally land as real component nodes in a
// Figma file in the DEFAULT mode. Don't infer this from `figmaSets.length` —
// that field describes full-catalogue capability.
//
// Keep this list in lockstep with the plugin's `SAMPLE` array in code.ts.
export const FIGMA_SAMPLE_KEYS: readonly string[] = [
  'Button', 'Input', 'Select', 'Checkbox', 'Toggle', 'Badge', 'StatusBadge', 'Toast', 'Avatar',
]

/** Does the live Figma import render this key as a real component today —
 *  not just carry its spec? See FIGMA_SAMPLE_KEYS above. */
export function isInFigmaSample(key: string): boolean {
  return FIGMA_SAMPLE_KEYS.includes(key)
}

// All component keys — the full catalogue, offered alongside the curated
// default below (see ESSENTIAL_COMPONENT_KEYS) for anyone who wants everything
// from the start.
export const COMPONENT_KEYS = COMPONENTS.map((c) => c.key)

// The default selection for a brand-new system: one component per basic UI
// need, instead of all 58 at once. A first-time export or Figma import should
// read as a short, reviewable list — not a wall the user has to prune before
// it means anything. The full catalogue is one click away in the picker; this
// only changes what a system starts with.
//
// Deliberately NOT exhaustive — no variants (CloseButton, StatusBadge…), no
// navigation beyond Tabs, no advanced form controls (Combobox, Slider…). Add
// to this list only when it's genuinely a "day one" need for most systems;
// everything else belongs in the full catalogue, selected on purpose.
export const ESSENTIAL_COMPONENT_KEYS = [
  'Button',
  'Input', 'Select', 'Checkbox', 'Toggle',
  'Badge',
  'Card', 'Avatar', 'Modal', 'Tooltip', 'Divider',
  'Toast',
  'Tabs',
] as const
