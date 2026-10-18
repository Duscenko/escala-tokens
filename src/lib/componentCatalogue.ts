// ─── Component catalogue (data) ──────────────────────────────────────────────
// Pure data — no JSX — so both the store (default-all selection) and the
// catalogue UI can import it without circular dependencies.
//
// Each `key` here equals a CATALOG `gate` in the Figma plugin
// (../escala-figma-plugin/src/code.ts); `axes` is the variant matrix the plugin's
// "Full catalogue" import must build for it (every value, every combination) and
// `figmaSets` lists every component set the key unlocks in the generated Figma
// library. The plugin may carry EXTRA axes/values (e.g. Chip State, Badge Icon),
// never fewer: if an axis or value is added or changed here, change the plugin's
// SPECS to match in the same change, and re-check a Full catalogue import.
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
      'shadcn/ui Button: six variants (default, secondary, outline, ghost, destructive, link) and eight sizes, four of them square icon buttons. An icon-only ghost button is the dismiss control; a link button is an inline link.',
    usage: 'Use default for the single most important action on a surface (1–2 per section); secondary/outline/ghost for the rest; destructive for an action that removes data. An icon-only button needs an aria-label.',
    // Variant and Size are shadcn's own, value for value. State is a Figma
    // axis only: in code it is pseudo-classes (forceState pins it in docs).
    axes: [
      { name: 'Variant', values: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] },
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled'] },
    ],
    figmaSets: ['Button'],
    props: [
      { name: 'variant', type: '"default" | "secondary" | "outline" | "ghost" | "destructive" | "link"', description: 'Visual emphasis — shadcn\'s variants.' },
      { name: 'size', type: '"default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"', description: 'Control height from the Sizes foundation (hit · compact · control · touch). icon* are square.' },
      { name: 'asChild', type: 'boolean', description: 'Render the child element (a link, a router link) with the Button styles — Radix Slot.' },
      { name: 'loading', type: 'boolean', description: 'Escala: replaces the leading icon with a spinner and sets aria-busy.' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction and applies the disabled tokens.' },
      { name: 'children', type: 'ReactNode', description: 'Label, with optional icons before / after it as plain children.' },
    ],
    accessibility: 'Native <button> (or the child with asChild). Disabled sets aria-disabled; loading sets aria-busy. Icon-only buttons (size icon*) need an aria-label.',
  },
  {
    key: 'ButtonGroup',
    label: 'Button Group',
    category: 'Button & Actions',
    description: 'shadcn/ui Button Group: Buttons attached edge to edge, with an optional text segment and separator.',
    usage: 'Use for 2–4 related actions that read as one control. For a single selected view, use Segmented Control or Tabs.',
    axes: [{ name: 'Orientation', values: ['horizontal', 'vertical'] }],
    figmaSets: ['Button Group'],
    props: [
      { name: 'orientation', type: '"horizontal" | "vertical"', description: 'Direction the buttons attach in.' },
      { name: 'ButtonGroupText', type: 'component', description: 'A non-interactive segment (a label, a unit).' },
      { name: 'ButtonGroupSeparator', type: 'component', description: 'A divider between two buttons of the same variant.' },
    ],
    accessibility: 'role="group" on the container — add an aria-label. Each item is a real Button.',
  },
  {
    key: 'SocialLoginButton',
    label: 'Social Login Button',
    category: 'Button & Actions',
    description: 'Outlined sign-in button carrying a provider mark — Google, Apple, GitHub or Figma.',
    usage: 'Stack vertically above the email form. Keep provider order consistent across screens.',
    axes: [
      { name: 'Provider', values: ['google', 'apple', 'github', 'figma'] },
      { name: 'Size', values: ['default', 'lg'] },
    ],
    figmaSets: ['Button Social'],
    props: [
      { name: 'provider', type: '"google" | "apple" | "github" | "figma"', description: 'Identity provider — picks the mark.' },
      { name: 'size', type: '"default" | "lg"', description: 'Control height — lg for mobile sign-in screens.' },
      { name: 'label', type: 'ReactNode', description: 'Defaults to "Continue with <provider>". Never icon-only.' },
      { name: 'onClick', type: '() => void', description: 'Starts the OAuth flow.' },
    ],
    accessibility: 'Native <button> with the full "Continue with …" label — never icon-only.',
  },
  {
    key: 'AppStoreBadge',
    label: 'App Store Badge',
    category: 'Button & Actions',
    description: 'Marketing download badge for the App Store and Google Play, in the standard dark style.',
    usage: 'Use only on marketing surfaces, at the platform-mandated minimum size.',
    axes: [{ name: 'Store', values: ['app-store', 'google-play'] }],
    figmaSets: ['Store Badge'],
    props: [
      { name: 'store', type: '"app-store" | "google-play"', description: 'Target store — picks the artwork.' },
      { name: 'href', type: 'string', description: 'Store listing URL.' },
    ],
    accessibility: 'Anchor with descriptive aria-label ("Download on the App Store").',
  },
  // ── Form Controls ───────────────────────────────────────────────────────────
  {
    key: 'Input',
    label: 'Input',
    category: 'Form Controls',
    description: 'shadcn/ui Input: the bare text control — the box is the <input>. No sizes or types: a label and a hint come from Field, icons and add-ons from Input Group.',
    usage: 'Wrap it in a Field with a FieldLabel. For a prefix, an icon or a button inside the box, use Input Group. Set the type (email, password, search) on the element.',
    // No variant axis, as in shadcn. State is a Figma axis only (pseudo-classes in code).
    axes: [{ name: 'State', values: ['Default', 'Hover', 'Focused', 'Error', 'Disabled'] }],
    figmaSets: ['Input'],
    props: [
      { name: 'type', type: 'string', description: 'The HTML input type (text, email, password, search…).' },
      { name: 'aria-invalid', type: 'boolean', description: 'Paints the error state.' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction and applies the disabled tokens.' },
    ],
    accessibility: 'Native <input>. Pair it with a FieldLabel (htmlFor) or an aria-label; describe errors with FieldError and aria-invalid.',
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
      { name: 'InputGroup', type: 'component', description: 'The bordered row: add-ons, control and action share one edge and one focus halo.' },
      { name: 'InputGroupAddon', type: 'component', description: 'Static text or icon before / after the control (https://, @, .com).' },
      { name: 'InputGroupInput', type: 'component', description: 'The text control.' },
      { name: 'InputGroupButton', type: 'component', description: 'An action inside the field ("Copy").' },
      { name: 'InputGroupSeparator', type: 'component', description: 'Hairline between parts.' },
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
      { name: 'label', type: 'ReactNode', description: 'Visible label above the field.' },
      { name: 'hint', type: 'ReactNode', description: 'Helper text under the field.' },
      { name: 'maxLength', type: 'number', description: 'Shows the live n/max counter.' },
      { name: 'invalid', type: 'boolean', description: 'Error state: critical edge and aria-invalid.' },
      { name: 'rows', type: 'number', description: 'Initial visible lines; the field resizes vertically.' },
    ],
    accessibility: 'Label linked via htmlFor/id. Counter announced politely via aria-live.',
  },
  {
    key: 'InputOTP',
    label: 'Input OTP',
    category: 'Form Controls',
    description: 'shadcn/ui Input OTP (the input-otp package): one hidden control, a group of slots, the active slot ringed.',
    usage: 'Use for one-time codes. Paste fills every slot; set maxLength to the code length.',
    axes: [{ name: 'State', values: ['Default', 'Filled', 'Error'] }],
    figmaSets: ['Input OTP'],
    props: [
      { name: 'maxLength', type: 'number', description: 'Code length (the number of slots).' },
      { name: 'value / onChange', type: 'string / (value) => void', description: 'Controlled value.' },
      { name: 'InputOTPGroup · InputOTPSlot index · InputOTPSeparator', type: 'component', description: 'The slots, laid out as you need them.' },
    ],
    accessibility: 'One real input with autocomplete="one-time-code"; the slots are presentational. Give it an aria-label.',
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
      { name: 'value / defaultValue', type: 'number', description: 'Current value.' },
      { name: 'min / max / step', type: 'number', description: 'Bounds and increment; the buttons disable at the bounds.' },
      { name: 'onValueChange', type: '(value: number) => void', description: 'Fires on every step.' },
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
      { name: 'value / defaultValue', type: 'string[]', description: 'Committed tags.' },
      { name: 'onValueChange', type: '(value: string[]) => void', description: 'Fires when a tag is added or removed.' },
      { name: 'placeholder', type: 'string', description: 'Shown while there are no tags.' },
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
      { name: 'Size', values: ['default', 'sm'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Error', 'Disabled'] },
    ],
    figmaSets: ['Select'],
    props: [
      { name: 'Select', type: 'component', description: 'Radix Select root: value, defaultValue, onValueChange, disabled.' },
      { name: 'SelectTrigger size', type: '"md" | "sm" | "lg"', description: 'Field height — follows the Sizes foundation.' },
      { name: 'SelectValue placeholder', type: 'string', description: 'Shown until an option is chosen.' },
      { name: 'SelectContent / SelectItem', type: 'component', description: 'The list; it portals into the theme scope.' },
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
      { name: 'options', type: '{ label: string; value: string }[]', description: 'Filterable list.' },
      { name: 'value / defaultValue', type: 'string', description: 'Selected option value.' },
      { name: 'onValueChange', type: '(value: string) => void', description: 'Fires when an option is chosen.' },
      { name: 'placeholder', type: 'string', description: 'Shown in the empty field.' },
    ],
    accessibility: 'ARIA combobox pattern: role="combobox", aria-expanded, aria-activedescendant.',
  },
  {
    key: 'Checkbox',
    label: 'Checkbox',
    category: 'Form Controls',
    description: 'shadcn/ui Checkbox: the box alone. Label it with a horizontal Field and a FieldLabel.',
    usage: 'Use for independent on/off choices and multi-select lists. For an instant setting, use Switch.',
    axes: [
      { name: 'Checked', values: ['True', 'False'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Disabled'] },
    ],
    figmaSets: ['Checkbox'],
    props: [
      { name: 'checked / defaultChecked', type: 'boolean | "indeterminate"', description: 'Value (Radix).' },
      { name: 'onCheckedChange', type: '(checked) => void', description: 'Change handler.' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction.' },
    ],
    accessibility: 'Radix checkbox (role="checkbox", Space toggles). Associate a FieldLabel with htmlFor.',
  },
  {
    key: 'RadioGroup',
    label: 'Radio Group',
    category: 'Form Controls',
    description: 'shadcn/ui Radio Group: RadioGroup with RadioGroupItems, each labelled by a horizontal Field. A checked item is filled with the primary colour.',
    usage: 'Use for one choice among 2–5 visible options. For more, use Select.',
    axes: [],
    figmaSets: ['Radio Group'],
    props: [
      { name: 'value / defaultValue / onValueChange', type: 'string', description: 'The selected item (Radix).' },
      { name: 'RadioGroupItem value', type: 'string', description: 'One option.' },
    ],
    accessibility: 'Radix radio group: arrow keys move the selection, one tab stop. Wrap it in a FieldSet with a FieldLegend.',
  },
  {
    key: 'Switch',
    label: 'Switch',
    category: 'Form Controls',
    description: 'shadcn/ui Switch: an instant on/off setting in two sizes. Label it with a horizontal Field.',
    usage: 'Use for a setting that applies at once. For a choice submitted with a form, use Checkbox.',
    axes: [
      { name: 'Checked', values: ['True', 'False'] },
      { name: 'Size', values: ['default', 'sm'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Disabled'] },
    ],
    figmaSets: ['Switch'],
    props: [
      { name: 'size', type: '"default" | "sm"', description: 'shadcn\'s sizes.' },
      { name: 'checked / defaultChecked / onCheckedChange', type: 'boolean', description: 'Value (Radix).' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction.' },
    ],
    accessibility: 'Radix switch (role="switch", Space toggles). Associate a FieldLabel with htmlFor.',
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
      { name: 'label', type: 'ReactNode', description: 'Name shown with the live value.' },
      { name: 'value / defaultValue', type: 'number', description: 'Current value.' },
      { name: 'min / max / step', type: 'number', description: 'Range and increment.' },
      { name: 'onValueChange', type: '(value: number) => void', description: 'Fires while dragging.' },
      { name: 'format', type: '(value: number) => string', description: 'How the live value reads (default "60%").' },
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
      { name: 'FileUpload', type: 'component', description: 'Container for the trigger and its files.' },
      { name: 'FileUploadFile name / kind / progress', type: 'string / string / number', description: 'A file row: name, extension badge, 0–100 progress.' },
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
      { name: 'title / hint', type: 'ReactNode', description: 'Instruction and constraint copy.' },
      { name: 'icon', type: 'ReactNode', description: 'Glyph in the circle.' },
      { name: 'onFiles', type: '(files: File[]) => void', description: 'Fires with the dropped files.' },
      { name: 'forceState', type: '"Default" | "Dragging" | "Error"', description: 'Pin a state without a pointer.' },
    ],
    accessibility: 'Focusable with keyboard; Enter opens the browse dialog. States announced.',
  },
  {
    key: 'Field',
    label: 'Field',
    category: 'Form Controls',
    description: 'shadcn/ui Field: a control with its label, description and error, laid out vertically, horizontally or responsively; with FieldSet, FieldLegend and FieldGroup for whole forms.',
    usage: 'Wrap every form control in a Field. Use horizontal for checkboxes and switches, FieldSet + FieldLegend for a group of them.',
    axes: [{ name: 'Orientation', values: ['vertical', 'horizontal', 'responsive'] }],
    figmaSets: ['Field'],
    props: [
      { name: 'orientation', type: '"vertical" | "horizontal" | "responsive"', description: 'shadcn\'s layouts.' },
      { name: 'FieldLabel · FieldDescription · FieldError', type: 'component', description: 'The parts around the control.' },
      { name: 'FieldSet · FieldLegend · FieldGroup · FieldContent · FieldSeparator', type: 'component', description: 'Grouping and layout.' },
    ],
    accessibility: 'Field is role="group"; FieldLabel is a <label> (htmlFor); FieldError is role="alert".',
  },
  {
    key: 'Label',
    label: 'Label',
    category: 'Form Controls',
    description: 'shadcn/ui Label: accessible text for a control (Radix Label).',
    usage: 'Inside a form, prefer FieldLabel. Mark required fields in the text, not with colour alone.',
    axes: [],
    figmaSets: ['Label'],
    props: [
      { name: 'htmlFor', type: 'string', description: 'The id of the control it names.' },
    ],
    accessibility: 'A real <label>: clicking it focuses or toggles its control.',
  },
  {
    key: 'PasswordStrength',
    label: 'Password Strength',
    category: 'Form Controls',
    description: 'Segmented meter + caption that scores a password as the user types.',
    usage: 'Update live while typing. Pair the meter with concrete guidance, not just a score.',
    axes: [{ name: 'Strength', values: ['weak', 'fair', 'strong'] }],
    figmaSets: ['Password Strength'],
    props: [
      { name: 'value', type: 'string', description: 'Password to score (typed live).' },
      { name: 'strength', type: '"weak" | "fair" | "strong"', description: 'Show a level without typing (docs, previews).' },
      { name: 'children', type: 'ReactNode', description: 'The password field, so the meter sits under any Input.' },
    ],
    accessibility: 'Score announced politely via aria-live; color is never the only signal.',
  },
  // ── Indicators ──────────────────────────────────────────────────────────────
  {
    key: 'Badge',
    label: 'Badge',
    category: 'Indicators',
    description: 'shadcn/ui Badge: a small label in six variants — default, secondary, destructive, outline, ghost and link.',
    usage: 'Use to label or count (a plan, a status, "+5 more"). For presence (online / away), use Status Badge. Never as a button.',
    axes: [{ name: 'Variant', values: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] }],
    figmaSets: ['Badge'],
    props: [
      { name: 'variant', type: '"default" | "secondary" | "destructive" | "outline" | "ghost" | "link"', description: 'Visual weight — shadcn\'s variants.' },
      { name: 'asChild', type: 'boolean', description: 'Render the child (a link) with the Badge styles — Radix Slot.' },
      { name: 'children', type: 'ReactNode', description: 'Label, with an optional icon before / after it.' },
    ],
    accessibility: 'Static text — not focusable. Colour is never the only signal: the label says what it means.',
  },
  {
    key: 'StatusBadge',
    label: 'Status Badge',
    category: 'Indicators',
    description: 'Presence indicator — a colored dot plus label for online / away / busy / offline.',
    usage: 'Pair with an Avatar or a row of people. Keep the dot–meaning mapping consistent.',
    axes: [{ name: 'Status', values: ['online', 'away', 'busy', 'offline'] }],
    figmaSets: ['Status Badge'],
    props: [
      { name: 'status', type: '"online" | "away" | "busy" | "offline"', description: 'Presence state — picks the dot colour.' },
      { name: 'children', type: 'ReactNode', description: 'Label text; defaults to the status name.' },
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
      { name: 'Size', values: ['default', 'sm'] },
    ],
    figmaSets: ['Chip'],
    props: [
      { name: 'selected', type: 'boolean', description: 'Selected state (aria-pressed).' },
      { name: 'onPressedChange', type: '(selected: boolean) => void', description: 'Fires when the chip is toggled.' },
      { name: 'onRemove', type: '() => void', description: 'Shows the remove control and calls this when it is pressed.' },
      { name: 'size', type: '"default" | "sm"', description: 'Height and padding.' },
      { name: 'removeIcon', type: 'ReactNode', description: 'The remove glyph from the system icon set.' },
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
      { name: 'value', type: 'number', description: '0–100.' },
      { name: 'label', type: 'ReactNode', description: 'Name shown beside the percentage.' },
      { name: 'showValue', type: 'boolean', description: 'Show the percentage (default on).' },
    ],
    accessibility: 'role="progressbar" with aria-valuenow, aria-valuemin, aria-valuemax.',
  },
  {
    key: 'Spinner',
    label: 'Spinner',
    category: 'Indicators',
    description: 'shadcn/ui Spinner: a spinning loader glyph in the ink of the text around it. No variants; size it with a class.',
    usage: 'Prefer skeleton screens for content loading. Use Spinner for action feedback.',
    axes: [],
    figmaSets: ['Spinner'],
    props: [
      { name: 'className', type: 'string', description: 'size-4 by default; size it with a class (size-6, size-8), as in shadcn.' },
      { name: 'aria-label', type: 'string', description: 'Screen-reader label (default "Loading").' },
    ],
    accessibility: 'role="status" with aria-label. Animated via CSS, respects prefers-reduced-motion.',
  },
  {
    key: 'Icon',
    label: 'Icon',
    category: 'Indicators',
    description: 'A glyph from the system icon set, at one of three sizes that follow the control height (16 · 20 · 24 at a 40px control).',
    usage: 'Small inside a compact control, medium on a default button, large on a large control or as a feature glyph. The same px on Desktop, Tablet and Mobile. Pair an icon-only control with an accessible label; a decorative icon next to text is aria-hidden.',
    axes: [{ name: 'Size', values: ['sm', 'default', 'lg'] }],
    figmaSets: ['Icon'],
    props: [
      { name: 'size', type: '"sm" | "default" | "lg"', description: 'Icon role: small 16 · medium 20 · large 24 at a 40px control (Icon/role/small · medium · large).' },
      { name: 'children', type: 'ReactNode', description: 'The glyph, from the system icon set (Phosphor by default).' },
      { name: 'label', type: 'string', description: 'Only for a meaningful standalone icon; omit when decorative.' },
    ],
    accessibility: 'Decorative icons are aria-hidden. A standalone meaningful icon needs role="img" + aria-label, and an icon-only button carries the label on the button.',
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
      { name: 'value', type: 'number', description: 'Score 0–5.' },
      { name: 'onValueChange', type: '(value: number) => void', description: 'Makes the row interactive.' },
      { name: 'star', type: 'ReactNode', description: 'The star glyph, rendered five times.' },
      { name: 'label', type: 'ReactNode', description: 'Count label ("4.0 · 128 reviews").' },
    ],
    accessibility: 'Read-only uses an aria-label ("4 of 5 stars"); interactive follows the radio pattern.',
  },
  {
    key: 'FileFormat',
    label: 'File Format',
    category: 'Indicators',
    description: 'Document glyph with a format plate (PDF, PNG, SVG, ZIP…) for file lists.',
    usage: 'Use inside upload rows and attachment lists so formats scan at a glance.',
    axes: [{ name: 'Format', values: ['pdf', 'png', 'svg', 'zip'] }],
    figmaSets: ['File Format'],
    props: [
      { name: 'format', type: '"pdf" | "png" | "svg" | "zip"', description: 'Extension shown on the plate; the plate colour follows it.' },
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
    axes: [{ name: 'Size', values: ['default', 'sm', 'lg'] }],
    figmaSets: ['Avatar'],
    props: [
      { name: 'size', type: '"default" | "sm" | "lg"', description: 'Diameter — shadcn\'s sizes: 32 / 24 / 40px (the Sizes foundation).' },
      { name: 'AvatarImage src', type: 'string', description: 'Image URL; the fallback shows while it loads or if it fails.' },
      { name: 'AvatarFallback', type: 'ReactNode', description: 'Initials.' },
    ],
    accessibility: 'img alt generated from name. Decorative images use alt="".',
  },
  {
    key: 'Card',
    label: 'Card',
    category: 'Content & Surfaces',
    description: 'Contained surface for grouping related content and actions. Fill → card/bg → surface/1.',
    usage: 'Use consistent padding within a layout. Avoid nesting cards more than 1 level.',
    axes: [{ name: 'Size', values: ['default', 'sm'] }],
    figmaSets: ['Card'],
    props: [
      { name: 'size', type: '"default" | "sm"', description: 'shadcn\'s sizes: sm tightens the padding and the gap between parts.' },
      { name: 'CardHeader / CardTitle / CardDescription', type: 'component', description: 'Heading block.' },
      { name: 'CardAction', type: 'component', description: 'An action pinned to the header\'s top-right corner.' },
      { name: 'CardContent / CardFooter', type: 'component', description: 'Body and the actions row (a link is <Button variant="link">).' },
    ],
    accessibility: 'Clickable cards use role="button" or wrapping <a>. Focus ring visible.',
  },
  {
    key: 'Separator',
    label: 'Separator',
    category: 'Content & Surfaces',
    description: 'Rule between sections or list items. Fill → divider/color token.',
    usage: 'Use sparingly — whitespace is usually sufficient. Add label only for section breaks.',
    axes: [{ name: 'Orientation', values: ['horizontal', 'vertical'] }],
    figmaSets: ['Separator'],
    props: [
      { name: 'orientation', type: '"horizontal" | "vertical"', description: 'Direction.' },
      { name: 'decorative', type: 'boolean', description: 'A purely visual rule (default). Set false to expose role="separator".' },
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
      { name: 'type', type: '"single" | "multiple"', description: 'One open row, or several.' },
      { name: 'collapsible', type: 'boolean', description: 'Allow the open row to close (single).' },
      { name: 'AccordionTrigger icon', type: 'ReactNode', description: 'The chevron; it rotates when open.' },
      { name: 'AccordionItem value', type: 'string', description: 'Identifies the row.' },
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
      { name: 'ratio', type: '"16:9" | "4:3" | "1:1" | number', description: 'Width / height.' },
      { name: 'children', type: 'ReactNode', description: 'Media or placeholder, centred in the box.' },
    ],
    accessibility: 'Purely presentational — semantics come from the wrapped content.',
  },
  {
    key: 'Dialog',
    label: 'Dialog',
    category: 'Content & Surfaces',
    description: 'Modal window with footer actions for critical flows that require full attention.',
    usage: "Reserve for destructive confirmations or multi-step flows. Don't use for notifications.",
    axes: [],
    figmaSets: ['Dialog'],
    props: [
      { name: 'open / onOpenChange', type: 'boolean / (open) => void', description: 'Controlled visibility (Esc and the overlay close it).' },
      { name: 'DialogTrigger / DialogClose', type: 'component', description: 'Open and close buttons (asChild).' },
      { name: 'DialogHeader / DialogTitle / DialogDescription / DialogFooter', type: 'component', description: 'The parts; the close × is a ghost icon-sm Button.' },
      { name: 'showCloseButton', type: 'boolean', description: 'Hide the corner × (default true).' },
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
      { name: 'Popover', type: 'component', description: 'Radix Popover root: open, defaultOpen, onOpenChange.' },
      { name: 'PopoverTrigger asChild', type: 'boolean', description: 'Use your own button as the anchor.' },
      { name: 'PopoverContent align / sideOffset', type: '"start" | "center" | "end" / number', description: 'Placement; it portals into the theme scope.' },
      { name: 'PopoverTitle / PopoverDescription', type: 'component', description: 'Heading and body copy.' },
    ],
    accessibility: 'Trigger gets aria-haspopup + aria-expanded. Esc closes; focus returns to trigger.',
  },
  {
    key: 'Tooltip',
    label: 'Tooltip',
    category: 'Content & Surfaces',
    description: 'Contextual label on hover or focus. Fill → tooltip/bg → surface/inverse.',
    usage: 'Only use for icon-only buttons or truncated text (an info ⓘ next to a label is a ghost icon Button as the trigger). Never put interactive content inside.',
    axes: [],
    figmaSets: ['Tooltip'],
    props: [
      { name: 'TooltipProvider', type: 'component', description: 'Wrap once near the root; sets the open delay.' },
      { name: 'TooltipTrigger asChild', type: 'boolean', description: 'Use your own element as the anchor.' },
      { name: 'TooltipContent side / sideOffset', type: '"top" | "right" | "bottom" | "left" / number', description: 'Placement of the bubble.' },
    ],
    accessibility: 'role="tooltip" linked via aria-describedby. Appears on focus and hover.',
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
      { name: 'style / className', type: 'CSSProperties | string', description: 'Give it a height; content past it scrolls with a themed scrollbar.' },
      { name: 'ScrollAreaRow', type: 'component', description: 'A list row inside the viewport.' },
    ],
    accessibility: 'Container is keyboard-scrollable (tabIndex 0 + arrow keys) with an aria-label.',
  },
  // ── Feedback ────────────────────────────────────────────────────────────────
  {
    key: 'Sonner',
    label: 'Sonner',
    category: 'Feedback',
    description: 'shadcn/ui Sonner: the toaster. A toast has a type — default, success, info, warning, error or loading — told apart by its icon.',
    usage: 'Mount <Toaster /> once; call toast() / toast.success() … from anywhere. Use for transient confirmations, not for errors the user must act on (use Alert).',
    axes: [{ name: 'Type', values: ['default', 'success', 'info', 'warning', 'error', 'loading'] }],
    figmaSets: ['Sonner'],
    props: [
      { name: 'toast(message, options)', type: 'function', description: 'Shows a toast; toast.success / .info / .warning / .error / .loading set its type.' },
      { name: 'description', type: 'ReactNode', description: 'Second line under the message.' },
      { name: 'action', type: '{ label, onClick }', description: 'One action button ("Undo").' },
      { name: 'Toaster position', type: '"top-left" | … | "bottom-right"', description: 'Where toasts stack (default bottom-right).' },
    ],
    accessibility: 'Sonner renders an aria-live region; toasts pause on hover and are dismissable with Escape.',
  },
  {
    key: 'Alert',
    label: 'Alert',
    category: 'Feedback',
    description: 'shadcn/ui Alert: a callout with an icon, a title and a description, in default and destructive.',
    usage: 'Use for a message about the content around it. For a transient notice, use Sonner.',
    axes: [{ name: 'Variant', values: ['default', 'destructive'] }],
    figmaSets: ['Alert'],
    props: [
      { name: 'variant', type: '"default" | "destructive"', description: 'shadcn\'s variants: the card\'s ink, or the critical ink.' },
      { name: 'AlertTitle / AlertDescription', type: 'component', description: 'First line and supporting copy.' },
      { name: 'AlertAction', type: 'component', description: 'An action pinned to the top-right corner.' },
      { name: 'children (icon)', type: 'ReactNode', description: 'An <svg> (or AlertIcon) as the first child takes the icon column.' },
    ],
    accessibility: 'role="alert". The icon is decorative; the title carries the meaning.',
  },
  // ── Navigation ──────────────────────────────────────────────────────────────
  {
    key: 'Tabs',
    label: 'Tabs',
    category: 'Navigation',
    description: 'Tab bar for switchable panels: a muted track (default) or an underline (line).',
    usage: 'Use when content is parallel, not sequential. Limit to 2–7 tabs visible at once.',
    axes: [{ name: 'Variant', values: ['default', 'line'] }],
    figmaSets: ['Tabs'],
    props: [
      { name: 'Tabs value / defaultValue', type: 'string', description: 'The open tab.' },
      { name: 'TabsList variant', type: '"default" | "line"', description: 'A muted track with a raised active tab, or an underline strip.' },
      { name: 'TabsTrigger', type: 'component', description: 'One tab (arrow keys move between them).' },
      { name: 'TabsContent value', type: 'string', description: 'The panel for a tab.' },
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
      { name: 'items', type: 'string[]', description: 'Tab labels, in order.' },
      { name: 'value / defaultValue', type: 'string', description: 'The selected tab.' },
      { name: 'onValueChange', type: '(value: string) => void', description: 'Fires on selection.' },
      { name: 'fill', type: 'boolean', description: 'Items share the width equally.' },
    ],
    accessibility: 'Same ARIA tabs pattern as Tabs — role="tablist" with arrow-key navigation.',
  },
  {
    key: 'SegmentedControl',
    label: 'Segmented Control',
    category: 'Navigation',
    description: 'Joined single-choice control — one segment active at a time, iOS-style.',
    usage: 'Use for 2–4 exclusive views of the same data (e.g. List / Board). Not for navigation.',
    axes: [{ name: 'Size', values: ['default', 'sm'] }],
    figmaSets: ['Segmented Control'],
    props: [
      { name: 'options', type: 'string[]', description: 'Segment labels.' },
      { name: 'value / defaultValue', type: 'string', description: 'The selected segment.' },
      { name: 'onValueChange', type: '(value: string) => void', description: 'Fires on selection.' },
      { name: 'size', type: '"default" | "sm"', description: 'Segment padding.' },
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
      { name: 'Breadcrumb / BreadcrumbList', type: 'component', description: 'Landmark and list.' },
      { name: 'BreadcrumbLink asChild', type: 'boolean', description: 'Use your router link.' },
      { name: 'BreadcrumbPage', type: 'component', description: 'The current page (aria-current).' },
      { name: 'BreadcrumbSeparator', type: 'ReactNode', description: 'Divider between items (default "/").' },
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
      { name: 'pages', type: '(number | "…")[]', description: 'Page numbers to show.' },
      { name: 'page', type: 'number', description: 'The current page.' },
      { name: 'onPageChange', type: '(page: number) => void', description: 'Fires on selection.' },
      { name: 'prevIcon / nextIcon', type: 'ReactNode', description: 'Arrow glyphs.' },
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
      { name: 'steps', type: 'string[]', description: 'Step labels.' },
      { name: 'current', type: 'number', description: '1-based current step; earlier steps are done.' },
      { name: 'doneIcon', type: 'ReactNode', description: 'Glyph for a finished step.' },
      { name: 'width', type: 'number | string', description: 'Stretch the stepper to this width.' },
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
      { name: 'DropdownMenu', type: 'component', description: 'Radix root: open, onOpenChange.' },
      { name: 'DropdownMenuTrigger asChild', type: 'boolean', description: 'Use your own button as the anchor.' },
      { name: 'DropdownMenuItem variant', type: '"danger"', description: 'Destructive row.' },
      { name: 'DropdownMenuContent / Separator / Shortcut', type: 'component', description: 'The panel (portals into the theme scope), a rule and a key hint.' },
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
      { name: 'ContextMenu', type: 'component', description: 'Radix root.' },
      { name: 'ContextMenuTrigger', type: 'component', description: 'The area that opens it on right-click.' },
      { name: 'ContextMenuContent / Item / Separator / Shortcut', type: 'component', description: 'The panel and its rows.' },
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
      { name: 'Command', type: 'component', description: 'Container; holds the search text.' },
      { name: 'CommandInput icon / shortcut', type: 'ReactNode', description: 'Search field with a glyph and a key hint.' },
      { name: 'CommandGroup heading', type: 'ReactNode', description: 'Caption over a set of items.' },
      { name: 'CommandItem onSelect', type: '() => void', description: 'A result row; hidden when it does not match the search.' },
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
      { name: 'links', type: '{ label; href?; current? }[]', description: 'Primary links; the current one is marked.' },
      { name: 'logo', type: 'ReactNode', description: 'Brand mark.' },
      { name: 'trailing', type: 'ReactNode', description: 'Right-hand slot (an avatar).' },
    ],
    accessibility: '<header> + <nav aria-label="Main">. Current page uses aria-current="page".',
  },
  {
    key: 'Sidebar',
    label: 'Sidebar',
    category: 'Navigation',
    description: 'Vertical navigation panel with grouped items and an active state.',
    usage: 'Use for app-level sections when destinations exceed what a navbar holds.',
    axes: [{ name: 'Variant', values: ['sidebar', 'floating', 'inset'] }],
    figmaSets: ['Sidebar'],
    props: [
      { name: 'variant / side', type: '"sidebar" | "floating" | "inset" / "left" | "right"', description: 'shadcn\'s variants: flush panel, floating card, or inset.' },
      { name: 'SidebarHeader / SidebarContent / SidebarFooter', type: 'component', description: 'The panel\'s regions.' },
      { name: 'SidebarGroup / SidebarGroupLabel / SidebarMenu', type: 'component', description: 'A labelled group of rows.' },
      { name: 'SidebarMenuButton isActive / variant / size', type: 'boolean / "default" | "outline" / "default" | "sm" | "lg"', description: 'One row; isActive marks the current page.' },
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
// Every one still ships as a full spec — props, variant axes,
// tokens, accessibility notes — into `tokens.json` (`atoms`) and the agent
// bundle. Only the keys below additionally land as real component nodes in a
// Figma file in the DEFAULT mode. Don't infer this from `figmaSets.length` —
// that field describes full-catalogue capability.
//
// Keep this list in lockstep with the plugin's `SAMPLE` array in code.ts.
export const FIGMA_SAMPLE_KEYS: readonly string[] = [
  'Button', 'Input', 'Select', 'Checkbox', 'Switch', 'Badge', 'StatusBadge', 'Sonner', 'Avatar',
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
  'Input', 'Select', 'Checkbox', 'Switch',
  'Badge',
  'Card', 'Avatar', 'Dialog', 'Tooltip', 'Separator',
  'Sonner',
  'Tabs',
] as const
