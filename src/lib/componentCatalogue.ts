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
      'Triggers an action or navigation. Variant is the intent — default (brand), secondary (neutral), critical (destructive) — and Appearance the style — solid, outline, ghost, link — in all 12 combinations, four sizes and six states.',
    usage: 'Use default · solid for the single most important action on a surface (one per view); secondary for the rest; critical · solid for an irreversible action and critical · outline for a risky one next to a safe one. Icon-only actions are IconButton.',
    // The Figma file's axes, value for value (spec/figma-components.json). State is
    // a Figma axis only: in code it is pseudo-classes (forceState pins it in docs).
    axes: [
      { name: 'Variant', values: ['default', 'secondary', 'critical'] },
      { name: 'Appearance', values: ['solid', 'outline', 'ghost', 'link'] },
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled'] },
    ],
    figmaSets: ['Button'],
    props: [
      { name: 'variant', type: '"default" | "secondary" | "critical"', description: 'Intent: brand, neutral or destructive.' },
      { name: 'appearance', type: '"solid" | "outline" | "ghost" | "link"', description: 'Style: a fill, an edge, nothing until hover, or an inline link.' },
      { name: 'size', type: '"default" | "xs" | "sm" | "lg"', description: 'Control height from the Size roles (control-xs · sm · md · lg).' },
      { name: 'leading', type: 'ReactNode', description: 'Icon before the label (Figma IconLeadingVisible + IconLeadingIcon).' },
      { name: 'trailing', type: 'ReactNode', description: 'Icon after the label (Figma IconTrailingVisible + IconTrailingIcon).' },
      { name: 'loading', type: 'boolean', description: 'Replaces the leading icon with a spinner and sets aria-busy.' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction and applies the disabled roles.' },
      { name: 'asChild', type: 'boolean', description: 'Render the child element (a link, a router link) with the Button styles — Radix Slot.' },
      { name: 'children', type: 'ReactNode', description: 'The label (Figma Label). Always visible: it is the accessible name.' },
    ],
    accessibility: 'Native <button> (or the child with asChild). Disabled sets aria-disabled; loading sets aria-busy. The label is the accessible name; an icon-only action is IconButton.',
  },
  {
    key: 'IconButton',
    label: 'Icon Button',
    category: 'Button & Actions',
    description:
      'An action with a single icon and no visible label: a square at the Button heights. Same Variant × Appearance grammar as Button, four sizes and six states, with an optional badge for a count or a dot.',
    usage: 'Use in toolbars, table rows and dialog headers where the icon is unambiguous. Always give it an aria-label; an action that needs words is a Button.',
    axes: [
      { name: 'Variant', values: ['default', 'secondary', 'critical'] },
      { name: 'Appearance', values: ['solid', 'outline', 'ghost', 'link'] },
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled'] },
    ],
    figmaSets: ['IconButton'],
    props: [
      { name: 'icon', type: 'ReactNode', description: 'The glyph (Figma Icon).' },
      { name: 'aria-label', type: 'string', description: 'Required: the accessible name, including a count when the badge shows one.' },
      { name: 'variant', type: '"default" | "secondary" | "critical"', description: 'Intent: brand, neutral or destructive.' },
      { name: 'appearance', type: '"solid" | "outline" | "ghost" | "link"', description: 'Style, as Button.' },
      { name: 'size', type: '"default" | "xs" | "sm" | "lg"', description: 'Square side from the Size roles.' },
      { name: 'badge', type: 'ReactNode', description: 'A count or dot on the top-right corner (Figma BadgeVisible).' },
      { name: 'loading', type: 'boolean', description: 'Replaces the icon with a spinner and sets aria-busy.' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction and applies the disabled roles.' },
    ],
    accessibility: 'Native <button> with a required aria-label (there is no visible text). Disabled sets aria-disabled; loading sets aria-busy.',
  },
  {
    key: 'CloseButton',
    label: 'Close Button',
    category: 'Button & Actions',
    description:
      'The dismiss control for alerts, toasts, dialogs and tags: one X in a square. Soft by default, with solid, outline and ghost; rounded, pill or square corners; five sizes; and an inverse variant for a dark chip.',
    usage: 'Use in the corner of anything the person can put away. Always give it an aria-label (it defaults to "Close"); use the inverse variant on an inverse surface such as a tooltip or snackbar. A dismiss that needs words is a Button.',
    // The Figma file's axes, value for value, in the file's own option order
    // (spec/figma-components.json). State is a Figma axis only: in code it is
    // pseudo-classes (forceState pins it in docs). The set has no Loading.
    axes: [
      { name: 'Appearance', values: ['solid', 'outline', 'soft', 'ghost'] },
      { name: 'Shape', values: ['rounded', 'pill', 'square'] },
      { name: 'Size', values: ['sm', 'lg', 'xl', 'xs', 'default'] },
      { name: 'State', values: ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] },
      { name: 'Variant', values: ['default', 'inverse'] },
    ],
    figmaSets: ['CloseButton'],
    props: [
      { name: 'appearance', type: '"solid" | "outline" | "soft" | "ghost"', description: 'Style: an inverse fill, an edge, a soft fill (default), or nothing until hover.' },
      { name: 'shape', type: '"rounded" | "pill" | "square"', description: 'Corner: the action radius, fully round (default), or none.' },
      { name: 'size', type: '"sm" | "lg" | "xl" | "xs" | "default"', description: 'Square side from the Size roles (24 · 32 · 40 · 48 · 56).' },
      { name: 'variant', type: '"default" | "inverse"', description: 'Inverse is for a control sitting on an inverse surface.' },
      { name: 'icon', type: 'ReactNode', description: 'Another glyph for a system on a different icon library. Defaults to Phosphor\'s X.' },
      { name: 'aria-label', type: 'string', description: 'The accessible name; defaults to "Close".' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction and applies the disabled roles.' },
    ],
    accessibility: 'Native <button> with an aria-label (there is no visible text), "Close" by default. Disabled sets aria-disabled. The glyph is decorative (aria-hidden).',
  },
  {
    key: 'TextLink',
    label: 'Text Link',
    category: 'Button & Actions',
    description:
      'An inline link for navigation and in-flow actions: a label with an optional icon on either side and a 1px underline. Six variants (brand, neutral, inverse and three status), four sizes and six states.',
    usage: 'Use inside running copy and next to a field or a card for a destination or a small action. Give it a descriptive label; an icon-only link needs an aria-label. Hover and Pressed always show the underline; the underline can be turned off at rest. An action with its own surface is a Button.',
    // The Figma file's axes, value for value, in the file's own option order
    // (spec/figma-components.json). State is a Figma axis only: in code it is
    // pseudo-classes (forceState pins it in docs). Visited paints as Default.
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Pressed', 'Visited', 'Focused', 'Disabled'] },
      { name: 'Variant', values: ['inverse', 'success', 'info', 'default', 'secondary', 'critical'] },
    ],
    figmaSets: ['TextLink'],
    props: [
      { name: 'variant', type: '"inverse" | "success" | "info" | "default" | "secondary" | "critical"', description: 'Colour: brand link (default), neutral, inverse, or a status.' },
      { name: 'size', type: '"xs" | "sm" | "default" | "lg"', description: 'Label size (body-sm · md · lg and the text-xl step) with the matching icon and gap.' },
      { name: 'underline', type: 'boolean', description: 'The underline (Figma UnderlineVisible); Hover and Pressed always show it.' },
      { name: 'leading', type: 'ReactNode', description: 'Icon before the label (Figma IconLeadingVisible + IconLeadingIcon).' },
      { name: 'trailing', type: 'ReactNode', description: 'Icon after the label (Figma IconTrailingVisible + IconTrailingIcon).' },
      { name: 'disabled', type: 'boolean', description: 'Takes the link out of the tab order, ignores clicks and applies the disabled roles.' },
      { name: 'children', type: 'ReactNode', description: 'The label (Figma Label). It is the accessible name.' },
    ],
    accessibility: 'Native <a>. Disabled sets aria-disabled, tabindex -1 and swallows the click. Focus draws a 2px edge inside and a 2px halo outside (the link grows by the edge, as in the Figma file). An icon-only link needs an aria-label.',
  },
  {
    key: 'FABButton',
    label: 'FAB Button',
    category: 'Button & Actions',
    description:
      'The floating action button: a leading icon and an optional label on a surface that lifts. Brand, neutral or inverse, solid or soft, rounded or pill, at 48 and 56 px, with the elevation rising on hover and settling on press.',
    usage: 'Use for the one primary action of a screen that floats over its content (create, compose, add). Give an icon-only FAB an aria-label. A FAB inside a row of actions is a Button; several floating actions together are a FAB Group.',
    // The Figma file's axes, value for value, in the file's own option order
    // (spec/figma-components.json). State is a Figma axis only: in code it is
    // pseudo-classes (forceState pins it in docs). `inverse` exists in solid only.
    axes: [
      { name: 'Appearance', values: ['solid', 'soft'] },
      { name: 'Shape', values: ['rounded', 'pill'] },
      { name: 'Size', values: ['default', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] },
      { name: 'Variant', values: ['inverse', 'default', 'secondary'] },
    ],
    figmaSets: ['FABButton'],
    props: [
      { name: 'appearance', type: '"solid" | "soft"', description: 'Style: the variant\'s solid fill, or a soft surface.' },
      { name: 'shape', type: '"rounded" | "pill"', description: 'Corner: the action radius (default) or fully round.' },
      { name: 'size', type: '"default" | "lg"', description: 'Height 48 or 56 (the FAB size); the width hugs and never goes below it.' },
      { name: 'variant', type: '"inverse" | "default" | "secondary"', description: 'Brand (default), neutral, or an inverse chip (solid only).' },
      { name: 'icon', type: 'ReactNode', description: 'The leading icon (Figma IconLeadingIcon). Defaults to Phosphor\'s plus.' },
      { name: 'children', type: 'ReactNode', description: 'The label (Figma Label). Leave it out for an icon-only FAB (LabelVisible off).' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction and applies the disabled roles; the lift is gone.' },
    ],
    accessibility: 'Native <button>. With a label that is the accessible name; an icon-only FAB needs an aria-label. Disabled sets aria-disabled. Focus draws a 2px halo outside the button; the elevation stays.',
  },
  {
    key: 'FABGroup',
    label: 'FAB Group',
    category: 'Button & Actions',
    description:
      'A speed-dial: one trigger FABButton that opens up to five action items. Stack lists them vertically with labels; the three fan layouts open them on an arc of icon-only FABs, centered, left or right of the trigger.',
    usage: 'Use where several floating actions share one entry point (create → photo, edit, share…). The trigger\'s icon swaps plus → close when open. Give every icon-only item an accessible name.',
    // The Figma file's axes, value for value, in the file's own option order
    // (spec/figma-components.json). The trigger and every item are fixed FABButton
    // instances (Appearance/Shape/Size/Variant) — there is no State axis of its own.
    axes: [
      { name: 'Layout', values: ['stack', 'fan-center', 'fan-left', 'fan-right'] },
      { name: 'Open', values: ['false', 'true'] },
    ],
    figmaSets: ['FABGroup'],
    props: [
      { name: 'layout', type: '"stack" | "fan-center" | "fan-left" | "fan-right"', description: 'Vertical and labelled, or an icon-only arc centered, left or right of the trigger.' },
      { name: 'items', type: '{ icon: ReactNode; label: string; onSelect?: () => void }[]', description: 'Up to five actions; label is shown in stack, else it is the aria-label.' },
      { name: 'open', type: 'boolean', description: 'Controlled open state.' },
      { name: 'defaultOpen', type: 'boolean', description: 'Uncontrolled initial state.' },
      { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Called when the trigger toggles the menu.' },
      { name: 'triggerIcon', type: 'ReactNode', description: 'The closed trigger icon (Figma IconLeadingIcon). Defaults to Phosphor\'s plus.' },
      { name: 'triggerOpenIcon', type: 'ReactNode', description: 'The open trigger icon. Defaults to Phosphor\'s x.' },
      { name: 'triggerLabel', type: 'string', description: 'The trigger\'s accessible name (Figma Label, "Create") — it is icon-only.' },
      { name: 'disabled', type: 'boolean', description: 'Disables the trigger and every item.' },
    ],
    accessibility: 'role="group" with an aria-label. The trigger is a native <button> with aria-expanded; every item needs an accessible name (its label prop) since fan items are icon-only.',
  },
  {
    key: 'ButtonGroup',
    label: 'Button Group',
    category: 'Button & Actions',
    description:
      'A joined row or column of up to five ButtonGroupItem segments sharing one surface, outer radius and Shadow/xs. The group sets every segment\'s Variant and Size and puts a ButtonGroupDivider between them.',
    usage: 'Use for 2–5 related actions or views that read as one control (Previous · Today · Next, Day · Week · Month). Mark the selected segment with active. Shape pill is horizontal only.',
    // The Figma file's axes, value for value, in the file's option order
    // (spec/figma-components.json, design-plans/button-group-contract.md).
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'lg', 'xl', 'default'] },
      { name: 'Variant', values: ['outline', 'default', 'inverse', 'secondary'] },
      { name: 'Shape', values: ['rounded', 'pill', 'square'] },
      { name: 'Orientation', values: ['horizontal', 'vertical'] },
    ],
    figmaSets: ['ButtonGroup'],
    props: [
      { name: 'size', type: '"xs" | "sm" | "lg" | "xl" | "default"', description: 'Every segment\'s height: Size/control-xs 24 · sm 32 · md 40 · lg 48 · xl 56.' },
      { name: 'variant', type: '"outline" | "default" | "inverse" | "secondary"', description: 'Every segment\'s fill and the dividers between them.' },
      { name: 'shape', type: '"rounded" | "pill" | "square"', description: 'Outer corners: Radius/action · Radius/full · none. pill also widens labelled segments to Spacing/inset-surface.' },
      { name: 'orientation', type: '"horizontal" | "vertical"', description: 'A row, or a column whose segments fill its width.' },
      { name: 'children', type: 'ButtonGroupItem[]', description: 'The segments (Figma Item1…5Visible). The group draws the dividers.' },
    ],
    accessibility: 'role="group" — give it an aria-label. Each segment is a native <button>; a selected one carries aria-pressed. Icon-only segments need an aria-label.',
  },
  {
    key: 'ButtonGroupItem',
    label: 'Button Group Item',
    category: 'Button & Actions',
    description: 'One segment of a ButtonGroup: a selectable action with no radius or border of its own (the group clips the corners and draws the shared edge).',
    usage: 'Only inside a ButtonGroup. active marks the selected segment (aria-pressed); iconOnly makes it square.',
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default', 'lg', 'xl'] },
      { name: 'State', values: ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] },
      { name: 'Variant', values: ['outline', 'default', 'inverse', 'secondary'] },
      { name: 'IconOnly', values: ['false', 'true'] },
      { name: 'Active', values: ['false', 'true'] },
    ],
    figmaSets: ['ButtonGroupItem'],
    props: [
      { name: 'children', type: 'ReactNode', description: 'The label (Figma Label).' },
      { name: 'active', type: 'boolean', description: 'The selected segment (Figma Active) — aria-pressed.' },
      { name: 'iconOnly', type: 'boolean', description: 'A square segment showing only leading (Figma IconOnly). Needs aria-label.' },
      { name: 'leading', type: 'ReactNode', description: 'Icon before the label (Figma IconLeadingVisible + IconLeadingIcon).' },
      { name: 'trailing', type: 'ReactNode', description: 'Icon after the label (Figma IconTrailingVisible + IconTrailingIcon).' },
      { name: 'loading', type: 'boolean', description: 'A spinner after the label (Figma LoadingVisible); sets aria-busy.' },
      { name: 'disabled', type: 'boolean', description: 'Disables the segment.' },
      { name: 'variant / size', type: 'see ButtonGroup', description: 'Taken from the group; set them only for a segment outside one.' },
    ],
    accessibility: 'A native <button> with aria-pressed. Focus draws a 2px ring inside the segment. Icon-only: always an aria-label.',
  },
  {
    key: 'ButtonGroupDivider',
    label: 'Button Group Divider',
    category: 'Button & Actions',
    description: 'The 1px line between two ButtonGroupItems (Stroke/divider), painted per Variant. ButtonGroup inserts it.',
    usage: 'Private to ButtonGroup — the group draws it between segments. Orientation horizontal is the vertical line of a row.',
    axes: [
      { name: 'Variant', values: ['outline', 'default', 'inverse', 'secondary'] },
      { name: 'Orientation', values: ['horizontal', 'vertical'] },
    ],
    figmaSets: ['ButtonGroupDivider'],
    props: [
      { name: 'variant', type: '"outline" | "default" | "inverse" | "secondary"', description: 'Taken from the group.' },
      { name: 'orientation', type: '"horizontal" | "vertical"', description: 'The group\'s orientation (horizontal = a vertical line).' },
    ],
    accessibility: 'Decorative: aria-hidden.',
  },
  {
    key: 'ToggleGroup',
    label: 'Toggle Group',
    category: 'Button & Actions',
    description: 'shadcn/ui Toggle Group: a set of two-state buttons — one or several pressed at a time.',
    usage: 'Use for formatting toggles (bold · italic · underline) or a view filter that can combine. For one exclusive choice among views prefer Segmented Control or Tabs.',
    axes: [
      { name: 'Variant', values: ['default', 'outline'] },
      { name: 'Size', values: ['default', 'sm', 'lg'] },
    ],
    figmaSets: ['Toggle Group'],
    props: [
      { name: 'type', type: '"single" | "multiple"', description: 'One pressed item, or any number.' },
      { name: 'variant', type: '"default" | "outline"', description: 'shadcn\'s toggle variants: no edge, or the control boundary.' },
      { name: 'size', type: '"default" | "sm" | "lg"', description: 'Item height — the Button heights.' },
      { name: 'value / defaultValue / onValueChange', type: 'string | string[]', description: 'The pressed item(s).' },
      { name: 'ToggleGroupItem value', type: 'component', description: 'One toggle; Radix writes data-state="on" when pressed.' },
    ],
    accessibility: 'Radix ToggleGroup: arrow keys move between items (roving tabindex); each item exposes aria-pressed (multiple) or role="radio" (single).',
  },
  {
    key: 'Toggle',
    label: 'Toggle',
    category: 'Button & Actions',
    description: 'shadcn/ui Toggle: a two-state button — on or off.',
    usage: 'Use for one setting that is on or off and acts at once (bold, mute). For a set of them use Toggle Group; for a setting saved later use Switch.',
    axes: [
      { name: 'Variant', values: ['default', 'outline'] },
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'Pressed', values: ['False', 'True'] },
    ],
    figmaSets: ['Toggle'],
    props: [
      { name: 'variant', type: '"default" | "outline"', description: "shadcn's toggle variants: no edge, or the control boundary." },
      { name: 'size', type: '"default" | "sm" | "lg"', description: 'The Button heights.' },
      { name: 'pressed / defaultPressed / onPressedChange', type: 'boolean', description: 'Controlled or uncontrolled state; Radix writes data-state="on".' },
    ],
    accessibility: 'Radix Toggle: a button with aria-pressed. Give an icon-only toggle an aria-label.',
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
    description: 'The text field: a box with the field inside it, at three sizes on the Size roles (sm 32 · default 40 · lg 48). Eleven types compose their own parts — phone and currency-select open a select, currency, url and tag carry a prefix, password a show / hide toggle, upload a Browse button, copy-link a Copy button, search the ⌘ K shortcut.',
    usage: 'Wrap it in a Field with a FieldLabel. Pick the type for the value it holds (phone, currency, password, url…); any other HTML type works on the default layout. For an add-on the types do not cover, use Input Group.',
    // The Figma file's axes, value for value, in the file's own order
    // (spec/figma-components.json). State is a Figma axis only (pseudo-classes in
    // code, `forceState` in docs). Value (placeholder · filled) needs no prop: the
    // field paints its placeholder differently from a typed value.
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled'] },
      { name: 'Type', values: ['default', 'phone', 'currency', 'currency-select', 'password', 'url', 'upload', 'tag', 'copy-link', 'credit-card', 'search'] },
      { name: 'Value', values: ['placeholder', 'filled'] },
    ],
    figmaSets: ['Input'],
    props: [
      { name: 'size', type: "'sm' | 'default' | 'lg'", description: 'Height on the Size roles: compact 32 · control 40 · touch 48.' },
      { name: 'type', type: "'default' | 'phone' | 'currency' | 'currency-select' | 'password' | 'url' | 'upload' | 'tag' | 'copy-link' | 'credit-card' | 'search'", description: 'Figma Type: the parts the field composes. Another value is an HTML input type on the default layout.' },
      { name: 'placeholder', type: 'string', description: 'Figma Placeholder.' },
      { name: 'leading', type: 'ReactNode | null', description: 'Leading icon (IconLeadingVisible + IconLeadingIcon). Types bring their own (search, lock, folder); null hides it.' },
      { name: 'trailing', type: 'ReactNode | null', description: 'Trailing icon (IconTrailingVisible + IconTrailingIcon). Password brings its show / hide toggle.' },
      { name: 'shortcut', type: 'string[] | null', description: 'The search shortcut keys (ShortcutVisible + Shortcut). ⌘ K by default on search.' },
      { name: 'addon', type: 'string', description: 'The prefix or the select value (+01, $, USD, https://, @).' },
      { name: 'addonOptions', type: 'string[]', description: 'The choices of the phone and currency-select select.' },
      { name: 'aria-invalid', type: 'boolean', description: 'Paints the Invalid state.' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction and applies the disabled tokens.' },
    ],
    accessibility: 'The field is a native <input> with its keyboard (inputmode) and autofill hint per type; pair it with a FieldLabel (htmlFor) or an aria-label. The select addon is a native <select> with its own name; Browse, Copy and the password toggle are buttons with names; the shortcut keys are <kbd>.',
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
    description: 'Multi-line text field for free-form input with an optional resize glyph. Invalid shows a warning glyph and Loading a spinner in the top-right corner.',
    usage: 'Use for free-form text over one line (messages, descriptions, notes). Labels, hints and error text come from Field. Show the resize glyph when the expected length varies.',
    // The Figma file's axes, value for value (design-plans/textarea-contract.md).
    axes: [
      { name: 'Size', values: ['sm', 'default', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Invalid', 'Loading', 'Disabled'] },
      { name: 'Value', values: ['placeholder', 'filled'] },
    ],
    figmaSets: ['Textarea'],
    props: [
      { name: 'size', type: '"sm" | "default" | "lg"', description: 'Box 72 · 96 · 128 high; Type/body-sm · md · lg.' },
      { name: 'placeholder', type: 'string', description: 'Figma Placeholder: shown while the value is empty (Value placeholder).' },
      { name: 'value / defaultValue', type: 'string', description: 'Figma Text (Value filled).' },
      { name: 'aria-invalid / loading / disabled', type: 'boolean', description: 'State Invalid (warning glyph), Loading (spinner, aria-busy), Disabled. Hover and Focused come from the pointer and keyboard.' },
      { name: 'resizeGlyph', type: 'boolean', description: 'Figma ResizeGlyphVisible: the corner glyph, which drags the box taller.' },
    ],
    accessibility: 'Give it a visible label (Field, or aria-label). On Invalid set aria-invalid and expose the error text through aria-describedby (Field does both). Loading sets aria-busy.',
  },
  {
    key: 'InputOTP',
    label: 'Input OTP',
    category: 'Form Controls',
    description: 'A one-time code field: a row of InputOTPSlots over one hidden input, with a separator between the halves of a 6- or 8-digit code. Paste fills every slot.',
    usage: 'Use for one-time codes (sign-in, verification). Set length to the code length; labels and the error text come from Field.',
    // The Figma file's axes, value for value (design-plans/input-otp-contract.md).
    axes: [
      { name: 'Size', values: ['sm', 'default', 'lg'] },
      { name: 'Length', values: ['4', '6', '8'] },
      { name: 'State', values: ['Empty', 'Typing', 'Filled', 'Invalid', 'Disabled'] },
      { name: 'Variant', values: ['outline', 'filled', 'underline'] },
    ],
    figmaSets: ['InputOTP'],
    props: [
      { name: 'size', type: '"sm" | "default" | "lg"', description: 'Slots 32×40 · 40×48 · 48×56; Type/body-md · lg · xl.' },
      { name: 'length', type: '4 | 6 | 8', description: 'Figma Length: the number of slots (= maxLength).' },
      { name: 'variant', type: '"outline" | "filled" | "underline"', description: 'The slot style.' },
      { name: 'value / onChange', type: 'string / (value) => void', description: 'The code. Typing and Filled follow it; the active empty slot shows the caret.' },
      { name: 'aria-invalid / disabled', type: 'boolean', description: 'State Invalid / Disabled.' },
      { name: 'children', type: 'InputOTPGroup · InputOTPSlot · InputOTPSeparator', description: 'Optional composition; omit to draw the file\'s layout.' },
    ],
    accessibility: 'One real input with autocomplete="one-time-code"; the slots are presentational. Give it a label (Field, or aria-label); on Invalid expose the error through aria-describedby.',
  },
  {
    key: 'InputOTPSlot',
    label: 'Input OTP Slot',
    category: 'Form Controls',
    description: 'One box of an InputOTP: a digit, or the caret while it is the active empty slot. InputOTP draws it; it reads the code from it.',
    usage: 'Used by InputOTP. Compose it yourself (index) only when you need a custom layout.',
    axes: [
      { name: 'Size', values: ['sm', 'default', 'lg'] },
      { name: 'State', values: ['Default', 'Filled', 'Typing', 'Focused', 'Invalid', 'Disabled'] },
      { name: 'Variant', values: ['outline', 'filled', 'underline'] },
    ],
    figmaSets: ['InputOTPSlot'],
    props: [
      { name: 'index', type: 'number', description: 'Its position inside InputOTP.' },
      { name: 'digit', type: 'string', description: 'Figma Digit, outside InputOTP.' },
      { name: 'forceState', type: 'string', description: 'Pins a state (docs).' },
    ],
    accessibility: 'Presentational: the hidden input inside InputOTP carries the value and the label.',
  },
  {
    key: 'NumberInput',
    label: 'Number Input',
    category: 'Form Controls',
    description: 'A number field with decrement and increment buttons, also a quantity stepper. The value is a spinbutton; the buttons are ghost IconButtons that disable at the min and max.',
    usage: 'Use for small numeric ranges (quantities, counts, seats). For wide ranges prefer Slider or a plain Input. Labels and hints come from Field.',
    // The Figma file's axes, value for value (design-plans/number-input-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled'] },
    ],
    figmaSets: ['NumberInput'],
    props: [
      { name: 'value / defaultValue', type: 'number', description: 'The value (Figma Value).' },
      { name: 'min / max / step', type: 'number', description: 'Bounds and increment; the matching button turns Disabled at a bound.' },
      { name: 'onValueChange', type: '(value: number) => void', description: 'Fires on every step or committed edit.' },
      { name: 'size', type: '"default" | "sm" | "lg"', description: 'Size/control-md 40 · sm 32 · lg 48; the buttons are one IconButton size below.' },
      { name: 'disabled / aria-invalid', type: 'boolean', description: 'State Disabled / Invalid. Hover and Focused come from the pointer and keyboard.' },
      { name: 'decrementIcon / incrementIcon', type: 'ReactNode', description: 'The glyphs (Figma: Minus, Plus).' },
    ],
    accessibility: 'The value is role="spinbutton" with aria-valuenow, aria-valuemin and aria-valuemax; Arrow Up and Down step it. The buttons are labelled Decrease and Increase and are not tab stops. Give the field a label (Field, or aria-label).',
  },
  {
    key: 'InputTag',
    label: 'Input Tag',
    category: 'Form Controls',
    description: 'A multi-value text field that turns entries into removable tag chips, inline or stacked outside the field.',
    usage: 'Use for open-ended multi-values (emails, labels). For a known list, prefer Combobox. Keep a visible label (Field) and expose the error text through aria-describedby.',
    // The Figma file's axes, value for value (design-plans/input-tag-contract.md).
    axes: [
      { name: 'Layout', values: ['inline', 'outside'] },
      { name: 'Size', values: ['sm', 'default', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled', 'Loading'] },
      { name: 'Value', values: ['placeholder', 'filled'] },
    ],
    figmaSets: ['InputTag'],
    props: [
      { name: 'layout', type: '"inline" | "outside"', description: 'inline wraps the chips inside the box; outside puts the box over the chips.' },
      { name: 'size', type: '"sm" | "default" | "lg"', description: 'Box 32 · 40 · 48; the chips are InputTagChip xs · sm · default.' },
      { name: 'value / defaultValue', type: 'string[]', description: 'Committed tags (Figma Value filled). The placeholder stays behind them, as in the file.' },
      { name: 'onValueChange', type: '(value: string[]) => void', description: 'Fires when a tag is added (Enter, comma, blur) or removed (✕, Backspace).' },
      { name: 'placeholder', type: 'string', description: 'Figma Placeholder (default "Add tag…").' },
      { name: 'max', type: 'number', description: 'Tags past this many are drawn critical.' },
      { name: 'aria-invalid / disabled / loading', type: 'boolean', description: 'State Invalid / Disabled / Loading (the chips go Disabled, the Spinner replaces the placeholder). Hover and Focused come from the pointer and keyboard.' },
    ],
    accessibility: 'A real text input; Enter or comma commits a tag, Backspace on an empty draft removes the last one. Each ✕ is named "Remove {tag}". Announce added and removed tags to screen readers and expose the error through aria-describedby.',
  },
  {
    key: 'InputTagChip',
    label: 'Input Tag Chip',
    category: 'Form Controls',
    description: 'One removable tag of an InputTag; the critical variant marks tags past the maximum.',
    usage: 'Used by InputTag. Use it alone only where a removable tag is needed outside the field.',
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default', 'lg', 'xl'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Disabled'] },
      { name: 'Variant', values: ['default', 'critical'] },
    ],
    figmaSets: ['InputTagChip'],
    props: [
      { name: 'size', type: '"xs" | "sm" | "default" | "lg" | "xl"', description: 'Height 18 · 20 · 24 · 28 · 32.' },
      { name: 'variant', type: '"default" | "critical"', description: 'critical marks a tag past the maximum.' },
      { name: 'children', type: 'ReactNode', description: 'Figma Label.' },
      { name: 'removable / onRemove', type: 'boolean / () => void', description: 'Figma RemoveVisible (default on) and its handler.' },
      { name: 'disabled / forceState', type: 'boolean / string', description: 'State Disabled; forceState pins a state (docs).' },
    ],
    accessibility: 'The ✕ is a button named "Remove {label}" (set removeLabel for a non-text label); Focused is drawn on keyboard focus.',
  },
  {
    key: 'InputTagOption',
    label: 'Input Tag Option',
    category: 'Form Controls',
    description: 'A suggestion row of the InputTag dropdown: an existing option or a create-new action.',
    usage: 'Compose the InputTag dropdown from it. Render the list as a listbox with arrow-key navigation.',
    axes: [
      { name: 'Type', values: ['option', 'create'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Disabled'] },
    ],
    figmaSets: ['InputTagOption'],
    props: [
      { name: 'type', type: '"option" | "create"', description: 'create shows the plus and drops the dot and the count.' },
      { name: 'children', type: 'ReactNode', description: 'Figma Label.' },
      { name: 'meta / badge', type: 'ReactNode / boolean', description: 'Figma Meta (MetaVisible) and BadgeVisible.' },
      { name: 'selected / disabled', type: 'boolean', description: 'aria-selected; State Disabled.' },
    ],
    accessibility: 'role="option" with aria-selected; the list that holds it is a listbox with arrow-key navigation.',
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
    key: 'NativeSelect',
    label: 'Native Select',
    category: 'Form Controls',
    description: 'shadcn/ui Native Select: the browser\'s own <select>, drawn as the field box with a chevron.',
    usage: 'Use where the platform picker is the better experience (mobile, long lists, forms that must work without JavaScript). For a styled list with search or rich items use Select or Combobox.',
    axes: [
      { name: 'Size', values: ['default', 'sm'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Disabled'] },
    ],
    figmaSets: ['Select'],
    props: [
      { name: 'size', type: '"default" | "sm"', description: 'The Select heights.' },
      { name: 'NativeSelectOption / NativeSelectOptGroup', type: 'component', description: 'The options, as <option> / <optgroup>.' },
      { name: '…select attributes', type: 'React.ComponentProps<"select">', description: 'value, onChange, disabled, name — a real <select>.' },
    ],
    accessibility: 'A native <select>: keyboard, screen readers and the platform picker come for free. Pair it with a Label (Field).',
  },
  {
    key: 'DatePickerTrigger',
    label: 'Date Picker Trigger',
    category: 'Form Controls',
    description: 'An input-styled button that opens the date picker popover: the calendar glyph and the placeholder or the formatted date.',
    usage: 'Use to pick one date without leaving the form. Pair it with a Label (Field), open DatePickerPopover from it and put the chosen date back as its value.',
    // The Figma file\'s axes, value for value (design-plans/date-picker-trigger-contract.md).
    axes: [
      { name: 'Size', values: ['sm', 'default', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Invalid', 'Disabled', 'Loading'] },
      { name: 'Value', values: ['placeholder', 'filled'] },
    ],
    figmaSets: ['DatePickerTrigger'],
    props: [
      { name: 'size', type: '"sm" | "default" | "lg"', description: 'Box 32 · 40 · 48; the glyph is 16 · 20 · 16.' },
      { name: 'valueText', type: 'Date | ReactNode', description: 'Figma ValueText (Value filled); a Date is formatted as "Nov 12, 2026". Omit it for Value placeholder.' },
      { name: 'placeholderText', type: 'ReactNode', description: 'Figma PlaceholderText (default "Select date").' },
      { name: 'aria-invalid / disabled / loading', type: 'boolean', description: 'State Invalid / Disabled / Loading (the Spinner replaces the glyph). Hover and Focused come from the pointer and keyboard.' },
      { name: 'aria-expanded / aria-controls', type: 'boolean / string', description: 'Set by the popover that opens from it.' },
    ],
    accessibility: 'A real button with aria-haspopup="dialog"; its text is the chosen date, so no separate label is read. Expose the error through aria-describedby.',
  },
  {
    key: 'DatePickerPopover',
    label: 'Date Picker Popover',
    category: 'Form Controls',
    description: 'The panel DatePickerTrigger opens: a Calendar with Radius/overlay and the Shadow/lg lift, 8 px below the trigger. Size default / sm, Mode single / range (range adds the presets rail).',
    usage: 'Use as the content of a Popover whose trigger is DatePickerTrigger. Put the Calendar inside it; use the Calendar alone when the panel is always visible.',
    // The Figma file\'s axes, value for value (design-plans/date-picker-popover-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm'] },
      { name: 'Mode', values: ['single', 'range'] },
    ],
    figmaSets: ['DatePickerPopover'],
    props: [
      { name: 'size', type: '"default" | "sm"', description: 'Figma Size: 322 px (default) or 250 px (sm) wide in single mode; the Calendar inside sets the width.' },
      { name: 'mode', type: '"single" | "range"', description: 'Figma Mode: single date, or a range with the presets rail (482 · 390 px wide).' },
      { name: 'sideOffset / align', type: 'number / "start" | "center" | "end"', description: 'Radix Popover placement (default 8 px below the trigger, aligned to its start).' },
      { name: 'inline', type: 'boolean', description: 'Draw the panel in place instead of in a Portal (docs, previews).' },
    ],
    accessibility: 'Radix Popover: focus moves into the panel, Escape closes it and returns focus to the trigger. The Calendar inside is the grid of dates.',
  },
  {
    key: 'CalendarDay',
    label: 'Calendar Day',
    category: 'Form Controls',
    description: 'One day cell of the Calendar: the date, a ghost cell that fills when selected, the range band behind it and the dash under today or a marked day.',
    usage: 'Use inside Calendar for each date of the month grid. Pin Selected, RangeStart, RangeMiddle or RangeEnd for the chosen days, Today for today and Outside for the neighbouring months.',
    // The Figma file\'s axes, value for value (design-plans/calendar-day-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm'] },
      { name: 'State', values: ['Default', 'Hover', 'Today', 'Selected', 'RangeMiddle', 'RangeStart', 'RangeEnd', 'Outside', 'Disabled', 'Unavailable', 'Focused'] },
      { name: 'Variant', values: ['default', 'secondary'] },
    ],
    figmaSets: ['CalendarDay'],
    props: [
      { name: 'size', type: '"default" | "sm"', description: 'Figma Size: a 40 or 32 px square.' },
      { name: 'variant', type: '"default" | "secondary"', description: 'Figma Variant: the brand fill, or the inverse (neutral) fill.' },
      { name: 'state / forceState', type: 'CalendarDayState', description: 'The data states (Today, Selected, Range…, Outside, Disabled, Unavailable). Hover and Focused come from the pointer and keyboard; forceState pins any state for docs.' },
      { name: 'indicator', type: 'boolean', description: 'Figma IndicatorVisible: the 12×2 dash under the date.' },
      { name: 'children', type: 'ReactNode', description: 'Figma Day (default "15").' },
      { name: 'shape', type: '"rounded" | "pill" | "square"', description: 'The file\'s instance override for the cell corner (Radius/action · Radius/full · none).' },
    ],
    accessibility: 'A real button; Disabled and Unavailable set disabled. Give it the full date as its accessible name when the number alone is not enough.',
  },
  {
    key: 'CalendarHeader',
    label: 'Calendar Header',
    category: 'Form Controls',
    description: 'The row above the days of a Calendar: previous and next month arrows flanking the month and year, as a combined chip, two chips or a plain heading.',
    usage: 'Use at the top of Calendar. single opens one month-and-year picker, multiple opens the month and the year separately, plain is a static heading for a calendar with no picker.',
    // The Figma file\'s axes, value for value (design-plans/calendar-header-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm'] },
      { name: 'Header', values: ['single', 'multiple', 'plain'] },
    ],
    figmaSets: ['CalendarHeader'],
    props: [
      { name: 'size', type: '"default" | "sm"', description: 'Figma Size: the width of seven 40 or 32 px day cells.' },
      { name: 'header', type: '"single" | "multiple" | "plain"', description: 'Figma Header: one combined chip, separate month and year chips, or a static heading.' },
      { name: 'label', type: 'ReactNode', description: 'Figma Label (single and plain), default "November 2026".' },
      { name: 'month / year', type: 'ReactNode', description: 'Figma Month and Year (multiple), default "November" and "2026".' },
      { name: 'onPreviousMonth / onNextMonth', type: '() => void', description: 'The arrows.' },
      { name: 'onLabelClick / onMonthClick / onYearClick', type: '() => void', description: 'The picker chips.' },
    ],
    accessibility: 'The arrows are buttons named "Previous month" and "Next month"; each chip is a button whose visible text is its name.',
  },
  {
    key: 'CalendarMonth',
    label: 'Calendar Month',
    category: 'Form Controls',
    description: 'One visible month of a Calendar: the weekday row over the weeks of day cells, Sunday first.',
    usage: 'Use inside Calendar below the header. single and multiple mark chosen days, range marks a span with its band; secondary swaps the selected look for the inverse one.',
    // The Figma file\'s axes, value for value (design-plans/calendar-month-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm'] },
      { name: 'Mode', values: ['single', 'multiple', 'range'] },
      { name: 'Variant', values: ['default', 'secondary'] },
    ],
    figmaSets: ['CalendarMonth'],
    props: [
      { name: 'size', type: '"default" | "sm"', description: 'Figma Size: seven 40 or 32 px day cells wide.' },
      { name: 'mode', type: '"single" | "multiple" | "range"', description: 'Figma Mode: which days are marked, and how.' },
      { name: 'variant', type: '"default" | "secondary"', description: 'Figma Variant, passed to every CalendarDay.' },
      { name: 'month', type: 'Date', description: 'The month shown. Default: November 2026, the file\'s sample.' },
      { name: 'selected / range', type: 'Date[] · { from, to }', description: 'The marked days; the file\'s sample when omitted.' },
      { name: 'today / disabledDays / unavailableDays', type: 'Date · Date[]', description: 'The Today, Disabled and Unavailable cells.' },
      { name: 'onDayClick', type: '(date: Date) => void', description: 'A day was pressed.' },
    ],
    accessibility: 'Each day is a button (see CalendarDay); Disabled and Unavailable days are disabled. The weekday row is plain text.',
  },
  {
    key: 'CalendarPresets',
    label: 'Calendar Presets',
    category: 'Form Controls',
    description: 'The rail beside a range Calendar: a "PRESETS" label over quick ranges, the one matching the selection tinted like the range.',
    usage: 'Use on the left of a range Calendar for common spans (Today, Last 7 days…). Pick the Variant that matches the CalendarDay cells next to it.',
    // The Figma file\'s axes, value for value (design-plans/calendar-presets-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm'] },
      { name: 'Variant', values: ['default', 'secondary'] },
    ],
    figmaSets: ['CalendarPresets'],
    props: [
      { name: 'size', type: '"default" | "sm"', description: 'Figma Size: a 160 or 140 px rail, 32 or 28 px rows.' },
      { name: 'variant', type: '"default" | "secondary"', description: 'Figma Variant: the selected preset\'s tint, as CalendarDay\'s range.' },
      { name: 'presets', type: 'string[]', description: 'The quick ranges. Default: Today, Yesterday, Last 7 days, Last 30 days, This month.' },
      { name: 'selected', type: 'string | null', description: 'The preset matching the selection. Default "Last 7 days".' },
      { name: 'onSelect', type: '(preset: string) => void', description: 'A preset was pressed.' },
      { name: 'label', type: 'ReactNode', description: 'The heading, default "PRESETS".' },
    ],
    accessibility: 'Each preset is a button whose visible text is its name; the selected one carries aria-pressed.',
  },
  {
    key: 'CalendarFooter',
    label: 'Calendar Footer',
    category: 'Form Controls',
    description: 'The bar under a Calendar: a Today link at the start, Clear and Apply at the end, under a divider.',
    usage: 'Use at the bottom of a Calendar that confirms its choice (a date picker popover). Apply commits the selection, Clear empties it, Today jumps to the current date.',
    // The Figma file\'s axes, value for value (design-plans/calendar-footer-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm'] },
    ],
    figmaSets: ['CalendarFooter'],
    props: [
      { name: 'size', type: '"default" | "sm"', description: 'Figma Size: a 312×72 or 248×56 bar, its Buttons at that size.' },
      { name: 'todayLabel / clearLabel / applyLabel', type: 'ReactNode', description: 'The three labels, default "Today", "Clear" and "Apply".' },
      { name: 'onToday / onClear / onApply', type: '() => void', description: 'The three actions.' },
    ],
    accessibility: 'Three Buttons whose visible text is their name.',
  },
  {
    key: 'Calendar',
    label: 'Calendar',
    category: 'Form Controls',
    description: 'The date panel: a month with its header, an optional presets rail beside it and an optional Today · Clear · Apply footer.',
    usage: 'Use to pick a date when the day of the week matters, several dates, or a range. DatePickerPopover wraps it under a DatePickerTrigger. For a known date (a birthday) a text field with a format is faster.',
    // The Figma file\'s axes, value for value (design-plans/calendar-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm'] },
      { name: 'Mode', values: ['single', 'multiple', 'range'] },
      { name: 'Header', values: ['single', 'multiple', 'plain'] },
    ],
    figmaSets: ['Calendar'],
    props: [
      { name: 'size', type: '"default" | "sm"', description: 'Figma Size: 40 or 32 px day cells.' },
      { name: 'mode', type: '"single" | "multiple" | "range"', description: 'Figma Mode: what a click selects.' },
      { name: 'header', type: '"single" | "multiple" | "plain"', description: 'Figma Header: the month and year as one chip, two chips or plain text.' },
      { name: 'presets', type: 'boolean', description: 'Figma PresetsVisible: the presets rail at the start (default false).' },
      { name: 'footer', type: 'boolean', description: 'Figma FooterVisible: Today, Clear and Apply under the month (default false).' },
      { name: 'value / defaultValue / onValueChange', type: 'Date | Date[] | { from, to }', description: 'The selection, by mode.' },
      { name: 'month / defaultMonth / onMonthChange', type: 'Date', description: 'The month shown.' },
      { name: 'today / disabledDays / unavailableDays', type: 'Date · Date[]', description: 'Today and the days that cannot be picked.' },
      { name: 'onApply', type: '(value) => void', description: 'The footer\'s Apply.' },
    ],
    accessibility: 'Each day is a button named with its full date and pressed when selected; one day takes Tab and the arrow keys move between days. The arrows are named Previous month and Next month.',
  },
  {
    key: 'Combobox',
    label: 'Combobox',
    category: 'Form Controls',
    description: 'Text input trigger that opens a filterable listbox, with optional leading icon, clear button and trailing chevron.',
    usage: 'Use when options exceed ~10 items or need search. For short lists, plain Select is enough. Keep a visible label (Field) and expose the error text through aria-describedby.',
    // The Figma file's axes, value for value (design-plans/combobox-contract.md).
    axes: [
      { name: 'Size', values: ['sm', 'default', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Open', 'Invalid', 'Disabled', 'Loading'] },
      { name: 'Variant', values: ['default', 'compact'] },
      { name: 'Shape', values: ['rounded', 'pill'] },
      { name: 'Value', values: ['placeholder', 'filled'] },
    ],
    figmaSets: ['Combobox'],
    props: [
      { name: 'options', type: '{ label; value; group?; description?; icon?; trailing?; disabled? }[]', description: 'The list. Options with a group are listed under its ComboboxGroupLabel, a rule between groups.' },
      { name: 'size', type: '"sm" | "default" | "lg"', description: 'Box 32 · 40 · 48; the list rows follow (ComboboxItem sm · default · lg).' },
      { name: 'variant', type: '"default" | "compact"', description: 'default fills its width; compact hugs its content.' },
      { name: 'shape', type: '"rounded" | "pill"', description: 'Radius/action or Radius/full.' },
      { name: 'value / defaultValue', type: 'string', description: 'The chosen option (Figma Value filled shows its label, SelectedText).' },
      { name: 'onValueChange', type: '(value: string | undefined) => void', description: 'Fires when an option is chosen or cleared.' },
      { name: 'placeholder', type: 'string', description: 'Figma Placeholder (default "Search framework...").' },
      { name: 'leading', type: 'ReactNode | null', description: 'Figma IconLeadingVisible + IconLeadingIcon (MagnifyingGlass by default; null hides it).' },
      { name: 'clearable / chevron', type: 'boolean', description: 'Figma ClearVisible (off) and ChevronVisible (on).' },
      { name: 'aria-invalid / disabled / loading', type: 'boolean', description: 'State Invalid / Disabled / Loading (the CircleNotch replaces the chevron). Hover, Focused and Open come from the pointer, keyboard and list.' },
      { name: 'emptyText / footer', type: 'ReactNode', description: 'The popover\'s EmptyText and footer.' },
    ],
    accessibility: 'role="combobox" on the input with aria-expanded, aria-controls and aria-activedescendant; arrow keys move through the options, Enter chooses, Escape closes; aria-invalid on Invalid.',
  },
  {
    key: 'ComboboxPopover',
    label: 'Combobox Popover',
    category: 'Form Controls',
    description: 'Floating listbox panel for the Combobox with list, grouped or empty content and an optional footer.',
    usage: 'Opened by Combobox 8px below the trigger, aligned to its start; closes on Escape. Compose it from ComboboxItem and ComboboxGroupLabel.',
    axes: [
      { name: 'Content', values: ['list', 'grouped', 'empty'] },
      { name: 'Size', values: ['sm', 'default', 'lg'] },
    ],
    figmaSets: ['ComboboxPopover'],
    props: [
      { name: 'content', type: '"list" | "grouped" | "empty"', description: 'empty draws EmptyText instead of the rows.' },
      { name: 'size', type: '"sm" | "default" | "lg"', description: 'The rows\' size; empty line and footer padding follow.' },
      { name: 'emptyText', type: 'ReactNode', description: 'Figma EmptyText (default "No match").' },
      { name: 'footer', type: 'ReactNode', description: 'Figma FooterVisible + FooterText (e.g. "3 results").' },
    ],
    accessibility: 'The list is role="listbox", referenced by the trigger\'s aria-controls.',
  },
  {
    key: 'ComboboxItem',
    label: 'Combobox Item',
    category: 'Form Controls',
    description: 'Option row in the Combobox listbox with optional leading icon, description, trailing value and selection indicator.',
    usage: 'Used by Combobox and ComboboxPopover. Keep labels short; put detail in the description.',
    axes: [
      { name: 'Size', values: ['sm', 'default', 'lg'] },
      { name: 'State', values: ['Default', 'Focused', 'Selected', 'Disabled'] },
    ],
    figmaSets: ['ComboboxItem'],
    props: [
      { name: 'children', type: 'ReactNode', description: 'Figma Label.' },
      { name: 'icon / description / trailing', type: 'ReactNode', description: 'Figma IconLeading*, Description*, Trailing* (each shown when given).' },
      { name: 'indicator', type: 'boolean', description: 'Figma IndicatorVisible: the check of the selected row (default on).' },
      { name: 'selected / highlighted / disabled', type: 'boolean', description: 'State Selected / Focused / Disabled; forceState pins one (docs).' },
    ],
    accessibility: 'role="option" with aria-selected; the highlighted row is the trigger\'s aria-activedescendant.',
  },
  {
    key: 'ComboboxGroupLabel',
    label: 'Combobox Group Label',
    category: 'Form Controls',
    description: 'Heading for a group of options inside the Combobox popover.',
    usage: 'One per group in a grouped list, above its options.',
    axes: [{ name: 'Size', values: ['sm', 'default', 'lg'] }],
    figmaSets: ['ComboboxGroupLabel'],
    props: [
      { name: 'children', type: 'ReactNode', description: 'Figma Label.' },
      { name: 'size', type: '"sm" | "default" | "lg"', description: 'Type/caption · label · label.' },
    ],
    accessibility: 'Name the group so screen readers announce it (aria-labelledby on a role="group" wrapper when you compose by hand).',
  },
  {
    key: 'Checkbox',
    label: 'Checkbox',
    category: 'Form Controls',
    description: 'Single checkbox for an independent boolean or a parent row summarising a partial selection (indeterminate). The box alone: label it with CheckboxItem.',
    usage: 'Use for independent on/off choices and multi-select lists; indeterminate for a parent whose children are partly checked. For an instant setting, use Switch. Variant colours the checked box (default accent, secondary neutral, status colours, inverse on dark surfaces).',
    // The Figma file's axes, value for value (design-plans/checkbox-contract.md).
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default'] },
      { name: 'Checked', values: ['false', 'true', 'indeterminate'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Disabled', 'Invalid'] },
      { name: 'Variant', values: ['default', 'secondary', 'critical', 'success', 'info', 'inverse'] },
    ],
    figmaSets: ['Checkbox'],
    props: [
      { name: 'size', type: '"xs" | "sm" | "default"', description: 'Box 16 · 16 · 20 (Size/selector-sm · md), glyph 12 · 12 · 16.' },
      { name: 'checked / defaultChecked', type: 'boolean | "indeterminate"', description: 'Figma Checked false · true · indeterminate (Radix).' },
      { name: 'variant', type: '"default" | "secondary" | "critical" | "success" | "info" | "inverse"', description: 'Colour of the checked box and of its focus ring.' },
      { name: 'onCheckedChange', type: '(checked) => void', description: 'Change handler.' },
      { name: 'disabled / aria-invalid', type: 'boolean', description: 'Disabled mutes the box; aria-invalid turns its edge critical.' },
      { name: 'forceState', type: '"Default" | "Hover" | "Focused" | "Disabled" | "Invalid"', description: 'Pin a state without a pointer (docs).' },
    ],
    accessibility: 'Radix checkbox (role="checkbox", aria-checked mixed for indeterminate, Space toggles). Give it a label: CheckboxItem, or a Label with htmlFor.',
  },
  {
    key: 'CheckboxItem',
    label: 'Checkbox Item',
    category: 'Form Controls',
    description: 'Checkbox with a visible label and optional description; the whole row toggles the checkbox.',
    usage: 'Use standalone (terms, opt-ins) or as a row of a CheckboxGroup. Placement right for settings lists where the label leads. The description explains the consequence; keep the label short.',
    // The Figma file's axes, value for value (design-plans/checkbox-item-contract.md).
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default'] },
      { name: 'Checked', values: ['false', 'true', 'indeterminate'] },
      { name: 'State', values: ['Default', 'Disabled', 'Invalid'] },
      { name: 'Placement', values: ['left', 'right'] },
      { name: 'Variant', values: ['default', 'secondary', 'critical', 'success', 'info', 'inverse'] },
    ],
    figmaSets: ['CheckboxItem'],
    props: [
      { name: 'label', type: 'ReactNode', description: 'Figma Label: the accessible name of the box.' },
      { name: 'description', type: 'ReactNode', description: 'Figma Description (DescriptionVisible when given), wired with aria-describedby.' },
      { name: 'size / variant', type: 'Checkbox size / variant', description: 'Passed to the Checkbox; Size also sets the label type (body-sm · body-md · body-lg).' },
      { name: 'placement', type: '"left" | "right"', description: 'The box before or after the text.' },
      { name: 'checked / defaultChecked / onCheckedChange', type: 'boolean | "indeterminate"', description: 'As Checkbox.' },
      { name: 'disabled / invalid', type: 'boolean', description: 'Disabled mutes the row; invalid turns the box edge critical.' },
    ],
    accessibility: 'The row is a <label> for the box, so a click anywhere toggles it and the label is its name; the description is aria-describedby.',
  },
  {
    key: 'CheckboxGroup',
    label: 'Checkbox Group',
    category: 'Form Controls',
    description: 'Labelled multi-select: group label, CheckboxItem rows and an optional footer (helper or error). Each checkbox stays independent.',
    usage: 'Use for several independent options under one question. Invalid shows the footer as the error; Disabled mutes the whole group. Size, Placement, State and Variant cascade to every row.',
    // The Figma file's axes, value for value (design-plans/checkbox-group-contract.md).
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default'] },
      { name: 'Placement', values: ['left', 'right'] },
      { name: 'State', values: ['Default', 'Invalid', 'Disabled'] },
      { name: 'Variant', values: ['default', 'secondary', 'critical', 'success', 'info', 'inverse'] },
    ],
    figmaSets: ['CheckboxGroup'],
    props: [
      { name: 'label', type: 'ReactNode', description: 'Figma GroupLabel: names the group (aria-labelledby).' },
      { name: 'footer', type: 'ReactNode', description: 'Figma FooterText (FooterVisible when given): helper, or the error when invalid (aria-describedby).' },
      { name: 'size / placement / variant', type: 'CheckboxItem axes', description: 'Cascade to every row unless a row sets its own.' },
      { name: 'invalid / disabled', type: 'boolean', description: 'Figma State: cascade to the rows.' },
      { name: 'children', type: 'ReactNode', description: 'The CheckboxItem rows (the file\'s three sample rows when omitted).' },
    ],
    accessibility: 'role="group" with aria-labelledby on the group label and aria-describedby on the footer; each checkbox stays independent.',
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
    description: 'Binary on/off control for a setting that applies immediately. The track alone: name it with SwitchGroup, a Label or a Field.',
    usage: 'Use for a setting that applies at once. For a choice submitted with a form, use Checkbox. Thumb long makes a wider, pill-shaped thumb; the I / O marks and a thumb glyph help where colour alone is not enough.',
    // The Figma file's axes, value for value (design-plans/switch-contract.md).
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Disabled'] },
      { name: 'Checked', values: ['true', 'false'] },
      { name: 'Thumb', values: ['short', 'long'] },
    ],
    figmaSets: ['Switch'],
    props: [
      { name: 'size', type: '"xs" | "sm" | "default"', description: 'Track 16 · 16 · 20 high (Size/selector-sm · md).' },
      { name: 'checked / defaultChecked / onCheckedChange', type: 'boolean', description: 'Figma Checked true · false (Radix).' },
      { name: 'thumb', type: '"short" | "long"', description: 'Round thumb, or a wider pill one.' },
      { name: 'ioVisible', type: 'boolean', description: 'Figma IoVisible: the I / O marks.' },
      { name: 'thumbIconVisible', type: 'boolean', description: 'Figma ThumbIconVisible: a check / close glyph on the thumb.' },
      { name: 'disabled', type: 'boolean', description: 'Prevents interaction.' },
      { name: 'forceState', type: '"Default" | "Hover" | "Focused" | "Disabled"', description: 'Pin a state without a pointer (docs).' },
    ],
    accessibility: 'Radix switch (role="switch", aria-checked, Space toggles). Give it a visible label (SwitchGroup) or an accessible name.',
  },
  {
    key: 'SwitchGroup',
    label: 'Switch Group',
    category: 'Form Controls',
    description: 'Switch with a label, an optional description and a footer; Placement sets the side the switch sits on, Invalid shows critical helper text and Loading replaces the switch with a spinner.',
    usage: 'Use for one labelled setting. The whole row is a label, so clicking the text toggles the switch.',
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default'] },
      { name: 'State', values: ['Default', 'Disabled', 'Invalid', 'Loading'] },
      { name: 'Placement', values: ['left', 'right'] },
    ],
    figmaSets: ['SwitchGroup'],
    props: [
      { name: 'label / description / footer', type: 'ReactNode', description: 'Figma Label, Description and Footer (the last two are hidden when absent).' },
      { name: 'size', type: '"xs" | "sm" | "default"', description: 'Switch and text sizes.' },
      { name: 'placement', type: '"left" | "right"', description: 'Which side the switch sits on.' },
      { name: 'invalid / loading / disabled', type: 'boolean', description: 'Figma State Invalid (critical footer), Loading (spinner) and Disabled.' },
      { name: 'checked / defaultChecked / onCheckedChange', type: 'boolean', description: 'The switch value (Radix).' },
    ],
    accessibility: 'The row is a <label htmlFor> around the Radix switch; description and footer are linked with aria-describedby.',
  },
  {
    key: 'Slider',
    label: 'Slider',
    category: 'Form Controls',
    description: 'Single or range value with an optional tooltip above the thumbs and tick marks under the track.',
    usage: 'Use when the precise value matters less than the position in a range. Show the value (tooltip) when it matters. Range picks two ends.',
    // The Figma file's axes, value for value (design-plans/slider-contract.md).
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default'] },
      { name: 'Range', values: ['single', 'range'] },
      { name: 'State', values: ['Default', 'Dragging', 'Disabled'] },
      { name: 'Variant', values: ['default', 'secondary'] },
    ],
    figmaSets: ['Slider'],
    props: [
      { name: 'value / defaultValue / onValueChange', type: 'number | number[]', description: 'A number is a single slider, an array a range (Figma Range).' },
      { name: 'min / max / step', type: 'number', description: 'Range and increment.' },
      { name: 'size / variant', type: 'Size / Variant', description: 'Control 32 · 36 · 40 high; edge and fill colour (default accent, secondary neutral).' },
      { name: 'tooltipVisible / marksVisible', type: 'boolean', description: 'Figma TooltipVisible and MarksVisible.' },
      { name: 'tooltipText / tooltipEndText', type: 'string', description: 'Figma TooltipText and TooltipEndText: what the tooltips read (default: the values).' },
      { name: 'forceState', type: '"Default" | "Dragging" | "Disabled"', description: 'Pin a state for docs.' },
    ],
    accessibility: 'role="slider" with aria-valuenow/min/max on each thumb. Arrow keys adjust by step; give the slider an aria-label.',
  },
  {
    key: 'SliderThumb',
    label: 'Slider Thumb',
    category: 'Form Controls',
    description: 'The thumb of a Slider: a white square with an edge in the variant colour; Hover, Focused, Dragging and Disabled states.',
    usage: 'Only inside a Slider.',
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Dragging', 'Disabled'] },
      { name: 'Variant', values: ['default', 'secondary'] },
    ],
    figmaSets: ['SliderThumb'],
    props: [
      { name: 'size / variant', type: 'Size / Variant', description: 'Thumb 14 · 16 · 20; edge colour.' },
      { name: 'forceState', type: 'State', description: 'Pin a state for docs.' },
    ],
    accessibility: 'Presentational: the Slider gives it role="slider" through Radix.',
  },
  {
    key: 'FileUpload',
    label: 'File Upload',
    category: 'Form Controls',
    description: 'Managed file upload: a FileUploadDropzone (or a single trigger Button) above a list of FileUploadItem rows; Size sets row density and cascades to every item.',
    usage: 'Use where people attach several files and need to follow each one. Layout dropzone when files are the task, trigger in a dense form. Keep the live region announcing completed, removed and failed files, and move focus to a neighbouring row when one is removed.',
    // The Figma file's axes, value for value (design-plans/file-upload-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm'] },
      { name: 'Layout', values: ['dropzone', 'trigger'] },
    ],
    figmaSets: ['FileUpload'],
    props: [
      { name: 'size', type: '"default" | "sm"', description: 'Row density: dropzone lg / default, Button default / sm, rows default / sm.' },
      { name: 'layout', type: '"dropzone" | "trigger"', description: 'A FileUploadDropzone, or the secondary Button "Upload files".' },
      { name: 'children', type: 'ReactNode', description: 'Figma Content slot: the FileUploadItem rows (the file\'s three sample rows when omitted).' },
      { name: 'dropzone', type: 'FileUploadDropzoneProps', description: 'Title, description, invalid… for the dropzone.' },
      { name: 'onFiles / accept / multiple', type: '(files: File[]) => void / string / boolean', description: 'Picked or dropped files.' },
      { name: 'announcement', type: 'ReactNode', description: 'Text for the polite live region.' },
    ],
    accessibility: 'The dropzone\'s Button or the trigger opens the native picker. A polite live region announces completed, removed and failed files; move focus to a neighbouring row when one is removed.',
  },
  {
    key: 'FileUploadItem',
    label: 'File Upload Item',
    category: 'Form Controls',
    description: 'One file row in FileUpload with format icon, name, status, size readout, progress and row actions.',
    usage: 'One row per file under a FileUploadDropzone. Status follows the upload: queued, uploading (progress), paused, completed, error (with its reason). sm for dense lists.',
    // The Figma file's axes, value for value (design-plans/file-upload-item-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm'] },
      { name: 'Status', values: ['queued', 'uploading', 'paused', 'completed', 'error'] },
    ],
    figmaSets: ['FileUploadItem'],
    props: [
      { name: 'size', type: '"default" | "sm"', description: 'Two lines with IconButton sm (default) or one line with IconButton xs (sm).' },
      { name: 'status', type: '"queued" | "uploading" | "paused" | "completed" | "error"', description: 'The upload lifecycle: decides the readout colour, the actions and the progress bar.' },
      { name: 'name', type: 'ReactNode', description: 'Figma Name: the file name, truncated.' },
      { name: 'icon', type: 'ReactNode', description: 'Figma Icon: the format glyph (FilePdf).' },
      { name: 'completedActions', type: 'boolean', description: 'Figma CompletedActionsVisible: Change and Download beside Remove.' },
      { name: 'progress', type: 'number', description: '0–100 while uploading or paused.' },
      { name: 'statusText / meta', type: 'ReactNode', description: 'The status and size readouts (the file\'s copy by default).' },
      { name: 'onPause / onResume / onRemove / onRetry / onChange / onDownload', type: '() => void', description: 'The row actions.' },
    ],
    accessibility: 'Every action is an IconButton with its aria-label (Pause, Resume, Remove, Retry, Change, Download). The bar is role="progressbar" with aria-valuenow. Announce completed, removed and failed files from the FileUpload\'s live region.',
  },
  {
    key: 'FileUploadDropzone',
    label: 'File Upload Dropzone',
    category: 'Form Controls',
    description: 'Drop area that opens the file picker on click and accepts dragged files; the Choose file trigger is a Button.',
    usage: 'Use at the top of a FileUpload, or alone where files are the whole task. lg for an empty page, default in a form, sm in a dense row. Dragging tints it accent; Invalid needs a visible message (it replaces the title).',
    // The Figma file's axes, value for value (design-plans/file-upload-dropzone-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Dragging', 'Invalid', 'Disabled'] },
    ],
    figmaSets: ['FileUploadDropzone'],
    props: [
      { name: 'size', type: '"default" | "sm" | "lg"', description: 'Row with Button sm (default), compact row with Button xs and no description (sm), centred column with an OR separator and Button default (lg).' },
      { name: 'title', type: 'ReactNode', description: 'Figma Title ("Drag and drop files"; "Upload failed" when invalid).' },
      { name: 'description', type: 'ReactNode | null', description: 'Figma Description; null hides it (DescriptionVisible).' },
      { name: 'icon', type: 'ReactNode', description: 'Figma Icon (CloudArrowUp).' },
      { name: 'separator', type: 'boolean', description: 'Figma SeparatorVisible: the OR rule above the Button (lg).' },
      { name: 'triggerLabel', type: 'ReactNode', description: 'The Button label ("Choose file" / "Choose again").' },
      { name: 'onFiles / accept / multiple', type: '(files: File[]) => void / string / boolean', description: 'Picked or dropped files, the accepted types, one or many.' },
      { name: 'invalid / disabled', type: 'boolean', description: 'Invalid paints the critical tint; disabled mutes it and the Button.' },
      { name: 'forceState', type: '"Default" | "Hover" | "Dragging" | "Invalid" | "Disabled"', description: 'Pin a state without a pointer (docs).' },
    ],
    accessibility: 'The Button is the keyboard path (Tab, Enter / Space opens the picker); the drop area itself takes no focus. aria-disabled when disabled, aria-invalid with a visible message when invalid.',
  },
  {
    key: 'Field',
    label: 'Field',
    category: 'Form Controls',
    description:
      'A labelled form field: a label with an optional required marker and trailing link, one form control, and helper or error text. Field never draws the control — it wires the Input (or Textarea, Combobox, NumberInput, InputTag, DatePickerTrigger, InputOTP) you give it.',
    usage: 'Wrap a form control that needs a visible label. Use a bare control only where no visible label is needed (search). Match the control to the Field size; Invalid shows the error, Disabled disables the control and dims the texts.',
    // The Figma file's axes, value for value (design-plans/field-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Invalid', 'Disabled'] },
    ],
    figmaSets: ['Field'],
    props: [
      { name: 'label', type: 'ReactNode', description: 'The label (Figma Label) — the control\'s accessible name (htmlFor).' },
      { name: 'required', type: 'boolean', description: 'Shows the * marker (Figma RequiredVisible); sets aria-required on the control.' },
      { name: 'trailing', type: 'ReactNode', description: 'A link at the end of the label row (Figma TrailingVisible), e.g. a TextLink "Forgot password?". Field sizes it (xs, sm at lg).' },
      { name: 'description', type: 'ReactNode', description: 'Helper text (Figma DescriptionVisible + Description), wired with aria-describedby.' },
      { name: 'error', type: 'ReactNode', description: 'Error text (Figma Error), shown when state is Invalid.' },
      { name: 'size', type: '"default" | "sm" | "lg"', description: 'The control\'s size (Size/control-md 40 · sm 32 · lg 48), passed to it.' },
      { name: 'state', type: '"Default" | "Invalid" | "Disabled"', description: 'Invalid sets aria-invalid on the control and shows the error; Disabled disables it and turns the texts to Content/disabled.' },
      { name: 'children', type: 'ReactElement', description: 'The one form control.' },
    ],
    accessibility: 'role="group". The label is a <label htmlFor> on the control; description and error reach it through aria-describedby; aria-invalid on Invalid, disabled on Disabled, aria-required with required.',
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
    description: 'A card that scores a password: the rules checklist, a five-segment PasswordStrengthMeter and the level label (Too Weak · Weak · Fair · Strong · Very Strong).',
    usage: 'Show it under a password field and update it as the user types. Keep the rules visible when the requirements are not obvious; hide them for a compact card.',
    // The Figma file's axes, value for value (design-plans/password-strength-contract.md).
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default'] },
      { name: 'Strength', values: ['0', '1', '2', '3', '4', '5'] },
    ],
    figmaSets: ['PasswordStrength'],
    props: [
      { name: 'value', type: 'string', description: 'The password; Strength = the number of rules it meets.' },
      { name: 'strength', type: '0 | 1 | 2 | 3 | 4 | 5', description: 'Figma Strength, pinned (docs, previews).' },
      { name: 'size', type: '"xs" | "sm" | "default"', description: 'Padding, gaps, meter height and rule type.' },
      { name: 'rulesVisible', type: 'boolean', description: 'Figma RulesVisible (default true).' },
      { name: 'rules / labels', type: 'PasswordRule[] / string[]', description: 'The checklist and the level copy (the file\'s by default).' },
    ],
    accessibility: 'The meter is role="meter"; the level is announced politely (aria-live); each rule says met or not met, so colour is never the only signal.',
  },
  {
    key: 'PasswordStrengthMeter',
    label: 'Password Strength Meter',
    category: 'Form Controls',
    description: 'Five pill segments; Strength n fills the first n — critical, warning, warning pressed, success pressed, success.',
    usage: 'Used by PasswordStrength; on its own where only the bar fits.',
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default'] },
      { name: 'Strength', values: ['0', '1', '2', '3', '4', '5'] },
    ],
    figmaSets: ['PasswordStrengthMeter'],
    props: [
      { name: 'strength', type: '0 | 1 | 2 | 3 | 4 | 5', description: 'Filled segments.' },
      { name: 'size', type: '"xs" | "sm" | "default"', description: 'Segment height 4 · 6 · 8.' },
    ],
    accessibility: 'role="meter" with aria-valuenow 0–5; give it a label when used alone.',
  },
  {
    key: 'PasswordStrengthRule',
    label: 'Password Strength Rule',
    category: 'Form Controls',
    description: 'One requirement of a password: a success check when met, an empty ring when not, and its label.',
    usage: 'Used by PasswordStrength\'s checklist.',
    axes: [
      { name: 'Met', values: ['true', 'false'] },
      { name: 'Size', values: ['xs', 'sm', 'default'] },
    ],
    figmaSets: ['PasswordStrengthRule'],
    props: [
      { name: 'met', type: 'boolean', description: 'Figma Met.' },
      { name: 'label', type: 'ReactNode', description: 'Figma Label.' },
      { name: 'size', type: '"xs" | "sm" | "default"', description: 'Type/caption · body-sm · body-md.' },
    ],
    accessibility: 'Says "met" / "not met" to screen readers, not only by colour.',
  },
  // ── Indicators ──────────────────────────────────────────────────────────────
  {
    key: 'Badge',
    label: 'Badge',
    category: 'Indicators',
    description: 'A small non-interactive label for statuses, counts and categories. Variant is the severity; Appearance soft, solid, outline or ghost; Type default, icon, number or dot.',
    usage: 'Use to label or count (a plan, a status, "+5 more"). For presence (online / away), use Status Badge. Never as a button. An icon-only badge needs an accessible name.',
    // The Figma file's axes, value for value (design-plans/badge-contract.md).
    axes: [
      { name: 'Appearance', values: ['soft', 'solid', 'outline', 'ghost'] },
      { name: 'Shape', values: ['rounded', 'pill'] },
      { name: 'Size', values: ['xs', 'sm', 'default'] },
      { name: 'Type', values: ['default', 'icon', 'number', 'dot'] },
      { name: 'Variant', values: ['success', 'warning', 'info', 'inverse', 'default', 'secondary', 'critical'] },
    ],
    figmaSets: ['Badge'],
    props: [
      { name: 'appearance / shape / size / type / variant', type: 'Figma axes', description: 'Variant is the severity; a dot exists only solid + pill; the badge is 16 · 20 · 24 high.' },
      { name: 'children', type: 'ReactNode', description: 'Figma Label (Type default).' },
      { name: 'iconLeading / iconTrailing', type: 'ReactNode | true', description: 'Figma IconLeadingVisible / IconTrailingVisible + the swaps: when given, the glyph shows (true = the file\'s check / x).' },
      { name: 'icon / count', type: 'ReactNode', description: 'Figma Icon (Type icon) and Count (Type number).' },
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
    description: 'A compact tag for filter, selection or input values with an optional leading icon and close action.',
    usage: 'Use for filters and applied selections. For static status, use Badge. When the close control is on it needs an accessible name (Remove plus the label) and the chip must be keyboard operable.',
    // The Figma file's axes, value for value (design-plans/chip-contract.md).
    axes: [
      { name: 'Variant', values: ['info', 'success', 'default', 'critical'] },
      { name: 'Appearance', values: ['outline', 'soft'] },
      { name: 'Size', values: ['xs', 'sm', 'default', 'lg', 'xl'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Selected', 'Disabled', 'Dragging'] },
      { name: 'Shape', values: ['rounded', 'pill'] },
    ],
    figmaSets: ['Chip'],
    props: [
      { name: 'variant / appearance / size / shape', type: 'Figma axes', description: 'Heights 24 · 32 · 40 · 48 · 56; the radius steps up with the size; pill is Radius/full.' },
      { name: 'selected / dragging / disabled / forceState', type: 'boolean / State', description: 'Figma State: Selected (aria-pressed), Dragging, Disabled; forceState pins any state for docs.' },
      { name: 'onPressedChange', type: '(selected: boolean) => void', description: 'Fires when the chip is toggled.' },
      { name: 'closeVisible / onRemove / closeLabel', type: 'boolean / () => void / string', description: 'Figma CloseVisible: the close control; the handler removes the chip.' },
      { name: 'iconLeading', type: 'ReactNode | true', description: 'Figma IconLeadingVisible + IconLeadingIcon (true = the file\'s plus).' },
      { name: 'children', type: 'ReactNode', description: 'Figma Label.' },
    ],
    accessibility: 'The label is a toggle button (aria-pressed); the close control is its own button named "Remove". Disabled sets aria-disabled and disables both.',
  },
  {
    key: 'ProgressLine',
    label: 'Progress Line',
    category: 'Indicators',
    description: 'A horizontal progress indicator for a value from 0 to 100: a muted track and a bar that is solid or a gradient of the primary action.',
    usage: 'Use for operations that take more than a couple of seconds and report how far along they are. Pair it with a label and the percentage in the surrounding UI. For an unknown duration use Spinner.',
    // The Figma file's axes, value for value (design-plans/progress-contract.md).
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default', 'lg'] },
      { name: 'Appearance', values: ['solid', 'gradient'] },
      { name: 'Value', values: ['0', '25', '50', '75', '100'] },
    ],
    figmaSets: ['ProgressLine'],
    props: [
      { name: 'size / appearance', type: 'Figma axes', description: 'The track is 4 · 6 · 8 · 12 thick; gradient runs Action/primary/default → /hover.' },
      { name: 'value', type: 'number', description: 'Figma Value, 0–100 (any number; the file draws five).' },
    ],
    accessibility: 'role="progressbar" with aria-valuenow, aria-valuemin and aria-valuemax; give it an accessible name (aria-label).',
  },
  {
    key: 'ProgressCircle',
    label: 'Progress Circle',
    category: 'Indicators',
    description: 'A circular progress indicator for a value from 0 to 100: a muted ring and an arc from the top, with round or butt ends.',
    usage: 'Use where a bar does not fit (a button, a card corner, an avatar). Show the percentage next to it when it matters.',
    axes: [
      { name: 'Size', values: ['xs', 'sm', 'default', 'lg'] },
      { name: 'Cap', values: ['round', 'butt'] },
      { name: 'Appearance', values: ['solid', 'gradient'] },
      { name: 'Value', values: ['0', '25', '50', '75', '100'] },
    ],
    figmaSets: ['ProgressCircle'],
    props: [
      { name: 'size / cap / appearance', type: 'Figma axes', description: 'The ring is 24 · 32 · 48 · 56 across; round caps add a half-thickness dot at each end of the arc.' },
      { name: 'value', type: 'number', description: 'Figma Value, 0–100.' },
    ],
    accessibility: 'role="progressbar" with aria-valuenow, aria-valuemin and aria-valuemax; give it an accessible name (aria-label).',
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
      { name: 'size', type: '"sm" | "default" | "lg"', description: 'Icon role: small 16 · medium 20 · large 24 at a 40px control (Size/icon-sm · md · lg).' },
      { name: 'children', type: 'ReactNode', description: 'The glyph, from the system icon set (Phosphor by default).' },
      { name: 'label', type: 'string', description: 'Only for a meaningful standalone icon; omit when decorative.' },
    ],
    accessibility: 'Decorative icons are aria-hidden. A standalone meaningful icon needs role="img" + aria-label, and an icon-only button carries the label on the button.',
  },
  {
    key: 'FeaturedIcon',
    label: 'Featured Icon',
    category: 'Indicators',
    description: 'A decorative glyph in a tinted or solid shape: cards, empty states, dialogs, feature lists.',
    usage: 'Always decorative; the nearby title carries the meaning. A dialog header nests it (default or lg, soft, circle).',
    // The Figma file's axes, value for value (design-plans/featured-icon-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg', 'xl'] },
      { name: 'Variant', values: ['default', 'secondary', 'critical', 'success', 'warning', 'info'] },
      { name: 'Appearance', values: ['soft', 'solid'] },
      { name: 'Shape', values: ['circle', 'rounded'] },
    ],
    figmaSets: ['FeaturedIcon'],
    props: [
      { name: 'size / variant / appearance / shape', type: 'Figma axes', description: '32 · 40 · 48 · 56 container; glyph 20 on sm, 24 above.' },
      { name: 'icon', type: 'ReactNode', description: 'Figma Icon (the swap); default a lightning bolt.' },
    ],
    accessibility: 'aria-hidden: decorative. The title or text beside it carries the meaning.',
  },
  {
    key: 'Kbd',
    label: 'Kbd',
    category: 'Indicators',
    description: 'A keyboard key hint for shortcuts and navigation legends (⌘, K, Esc, ↑, ↓, ↵); KbdGroup spaces several keys.',
    usage: 'Size follows the icon of the control it sits in: xs in menus and a small Input, sm in a default or large Input and in tooltips, default in standalone shortcut lists. One Kbd per key, never a whole shortcut string.',
    // The Figma file's axes, value for value (design-plans/kbd-contract.md).
    axes: [{ name: 'Size', values: ['xs', 'sm', 'default'] }],
    figmaSets: ['Kbd'],
    props: [
      { name: 'size', type: '"xs" | "sm" | "default"', description: 'Key cap 16 · 20 · 24 high (Size/icon-sm · md · lg).' },
      { name: 'children', type: 'ReactNode', description: 'The key (⌘, Shift, K) — Figma Label.' },
      { name: 'KbdGroup', type: 'component', description: 'Spaces several Kbd as one shortcut.' },
    ],
    accessibility: 'Rendered as <kbd>, which assistive tech announces as keyboard input. Spell modifier names in an aria-label when the glyph alone is ambiguous.',
  },
  {
    key: 'RatingGroup',
    label: 'Rating Group',
    category: 'Indicators',
    description: 'Single-choice scale of 5 items. Type star for scores, emoji for sentiment; Size cascades to every item.',
    usage: 'Use to collect a 1–5 score or a sentiment. Use SegmentedControl for labelled options and Slider for a continuous value.',
    // The Figma file's axes, value for value (design-plans/rating-group-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'Type', values: ['star', 'emoji'] },
    ],
    figmaSets: ['RatingGroup'],
    props: [
      { name: 'value / defaultValue / onValueChange', type: 'number', description: 'The chosen score 1–5 (a star group fills every star up to it).' },
      { name: 'size / type', type: 'Size / "star" | "emoji"', description: 'Items 32 · 24 · 40; stars or smileys. Cascade to every item.' },
      { name: 'children', type: 'RatingGroupItem[]', description: 'Figma Content slot. Omitted: the five stars or smileys.' },
    ],
    accessibility: 'role="radiogroup"; each item role="radio" with aria-checked and a label ("4 of 5 stars", "Good"). One tab stop; the arrow keys move and select.',
  },
  {
    key: 'RatingGroupItem',
    label: 'Rating Group Item',
    category: 'Indicators',
    description: 'One option of a RatingGroup. A checked star fills in Content/accent; an emoji keeps its glyph and marks the choice with Surface/selected.',
    usage: 'Always inside a RatingGroup; give every item an aria-label.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'Type', values: ['star', 'emoji'] },
      { name: 'Checked', values: ['false', 'true'] },
      { name: 'State', values: ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] },
    ],
    figmaSets: ['RatingGroupItem'],
    props: [
      { name: 'icon', type: 'ReactNode', description: 'Figma Icon (the swap).' },
      { name: 'value', type: 'number', description: 'The score it picks inside the group.' },
      { name: 'kind / size / checked', type: 'Type / Size / boolean', description: 'Taken from the group when inside one (kind is the Figma Type).' },
      { name: 'disabled / forceState', type: 'boolean / State', description: 'Disabled mutes it; forceState pins a state for docs.' },
    ],
    accessibility: 'role="radio" with aria-checked; the roving tabindex belongs to the group.',
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
    description: 'A person or entity as a photo, initials or an icon, in seven sizes, with an optional selection ring and presence dot.',
    usage: 'Use one size per context. Stack people with AvatarGroup. A photo avatar has no colour variants; initials and icon take Variant and Appearance.',
    // The Figma file's axes, value for value (design-plans/avatar-contract.md).
    axes: [
      { name: 'Type', values: ['image', 'initials', 'icon'] },
      { name: 'Size', values: ['2xs', 'xs', 'sm', 'default', 'lg', 'xl', '2xl'] },
      { name: 'Shape', values: ['circle', 'rounded'] },
      { name: 'Variant', values: ['secondary', 'default', 'info', 'success', 'warning', 'critical'] },
      { name: 'Appearance', values: ['soft', 'solid'] },
    ],
    figmaSets: ['Avatar'],
    props: [
      { name: 'ringVisible', type: 'boolean', description: 'Figma RingVisible: a 2px Border/accent ring 4px outside the avatar.' },
      { name: 'statusVisible / status', type: 'boolean / AvatarStatus value', description: 'Figma StatusVisible: the presence dot on the bottom-right corner (online · busy · away · offline · do-not-disturb).' },
      { name: 'src / alt', type: 'string', description: 'The photo (Figma Photo swap). Type image only.' },
      { name: 'children', type: 'ReactNode', description: 'The initials (Type initials): one letter on 2xs, two otherwise.' },
      { name: 'icon', type: 'ReactNode', description: 'Figma Icon (the swap); default a user glyph.' },
    ],
    accessibility: 'role="img" with an accessible name (aria-label, or the alt of the photo); hide a purely decorative avatar with aria-hidden. The presence dot is announced as text.',
  },
  {
    key: 'AvatarStatus',
    label: 'Avatar Status',
    category: 'Content & Surfaces',
    description: 'The presence dot of an Avatar: online, busy, away, offline or do-not-disturb, with an outside Surface/page edge.',
    usage: 'Always on an Avatar (bottom-right); never rely on colour alone.',
    axes: [
      { name: 'Status', values: ['online', 'busy', 'away', 'offline', 'do-not-disturb'] },
      { name: 'Size', values: ['xs', 'sm', 'default', 'lg'] },
    ],
    figmaSets: ['AvatarStatus'],
    props: [
      { name: 'status / size', type: 'Status / Size', description: 'Dot colour (success · critical · warning · muted · critical with a bar) and 6 · 8 · 10 · 12px.' },
    ],
    accessibility: 'role="img" with the presence as its label ("Online"); give your own aria-label to override.',
  },
  {
    key: 'AvatarGroup',
    label: 'Avatar Group',
    category: 'Content & Surfaces',
    description: 'An overlapping stack of avatars, each in a Surface/page ring, ending in a +N tile.',
    usage: 'Show who is part of something; label the +N tile ("4 more people").',
    axes: [
      { name: 'Size', values: ['2xs', 'xs', 'sm', 'default', 'lg', 'xl', '2xl'] },
      { name: 'Shape', values: ['circle', 'rounded'] },
    ],
    figmaSets: ['AvatarGroup'],
    props: [
      { name: 'size / shape', type: 'Size / Shape', description: 'Cascade to every Avatar in the group.' },
      { name: 'children', type: 'Avatar[]', description: 'The avatars; each is wrapped in its ring.' },
      { name: 'count', type: 'number', description: 'The +N tile (Figma: +3). Omit or 0 for none.' },
    ],
    accessibility: 'role="group" with an accessible name; the +N tile is a labelled image or button.',
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
    description: 'Thin rule that divides content, horizontal or vertical, solid or dashed, with an optional label at its start, centre or end.',
    usage: 'Use sparingly — whitespace is usually sufficient. Add a label only for section breaks (the classic «OR»).',
    axes: [
      { name: 'Align', values: ['none', 'start', 'center', 'end'] },
      { name: 'Orientation', values: ['horizontal', 'vertical'] },
      { name: 'Tone', values: ['default', 'subtle', 'strong'] },
      { name: 'Variant', values: ['dashed', 'default'] },
    ],
    figmaSets: ['Separator'],
    props: [
      { name: 'align / orientation / tone / variant', type: 'string', description: 'Figma Align, Orientation, Tone and Variant.' },
      { name: 'children', type: 'ReactNode', description: 'Figma Label; shown when Align is not none (a label alone centres it).' },
      { name: 'decorative', type: 'boolean', description: 'A purely visual rule (default). Set false to expose role="separator".' },
    ],
    accessibility: 'Decorative by default; role="separator" with aria-orientation only when the rule conveys structure.',
  },
  {
    key: 'Accordion',
    label: 'Accordion',
    category: 'Content & Surfaces',
    description: 'A stack of AccordionItem sharing one Variant. The first item is open by default; items open and close independently.',
    usage: 'Use for several stacked sections (FAQ, settings). For a single expandable region use Collapsible.',
    // The Figma file's axes, value for value (design-plans/accordion-contract.md).
    axes: [{ name: 'Variant', values: ['ghost-default', 'ghost-underline', 'ghost-rounded', 'outline-rounded', 'outline-sharp', 'filled-rounded'] }],
    figmaSets: ['Accordion'],
    props: [
      { name: 'variant', type: 'Figma Variant', description: 'Shared by every item; ghost-default and ghost-underline sit 0 apart, the rest 8.' },
      { name: 'value / defaultValue / onValueChange', type: 'string[]', description: 'The open items (independent).' },
      { name: 'children', type: 'AccordionItem[]', description: 'The items.' },
    ],
    accessibility: 'Each trigger is a button inside a heading with aria-expanded; Enter / Space toggles, arrows move between triggers.',
  },
  {
    key: 'AccordionItem',
    label: 'Accordion Item',
    category: 'Content & Surfaces',
    description: 'One section: a trigger (optional icon, label, a chevron that flips when open) and collapsible content.',
    usage: 'Always inside an Accordion; give every item a value.',
    axes: [
      { name: 'Variant', values: ['ghost-default', 'ghost-underline', 'ghost-rounded', 'outline-rounded', 'outline-sharp', 'filled-rounded'] },
      { name: 'State', values: ['Closed', 'Open', 'Disabled'] },
    ],
    figmaSets: ['AccordionItem'],
    props: [
      { name: 'label / children', type: 'ReactNode', description: 'Figma Label and Content.' },
      { name: 'iconVisible / icon', type: 'boolean / ReactNode', description: 'Figma IconVisible (default true) and the Icon swap.' },
      { name: 'value / variant / disabled', type: 'string / Variant / boolean', description: 'Identity, Figma Variant (from the Accordion) and the Disabled state.' },
    ],
    accessibility: 'A button in a heading with aria-expanded and aria-controls; Disabled sets disabled and mutes icon, label and chevron.',
  },
  {
    key: 'Collapsible',
    label: 'Collapsible',
    category: 'Content & Surfaces',
    description: 'shadcn/ui Collapsible: one trigger that shows or hides a panel of content.',
    usage: 'Use for a single expandable region (more repositories, advanced options). For several stacked sections use Accordion.',
    axes: [{ name: 'Open', values: ['False', 'True'] }],
    figmaSets: ['Collapsible'],
    props: [
      { name: 'open / defaultOpen / onOpenChange', type: 'boolean', description: 'Controlled or uncontrolled visibility.' },
      { name: 'CollapsibleTrigger', type: 'component', description: 'The row that toggles it; the chevron turns when open.' },
      { name: 'CollapsibleContent', type: 'component', description: 'The panel shown when open.' },
      { name: 'CollapsibleItem', type: 'component', description: 'A bordered row inside the panel.' },
    ],
    accessibility: 'Radix Collapsible: the trigger is a button with aria-expanded and aria-controls; Space / Enter toggles.',
  },
  {
    key: 'Image',
    label: 'Image',
    category: 'Content & Surfaces',
    description: 'A photo or illustration cropped to a fixed ratio (object-fit: cover), on Surface/muted while it loads. Ratio auto fills its parent.',
    usage: 'Wrap media so layouts never shift while content loads. Use Shape square inside a slot that already clips its corners. Always give alt text (alt="" when decorative).',
    // The Figma file's axes, value for value (design-plans/image-contract.md).
    axes: [
      { name: 'Ratio', values: ['auto', '16:9', '4:3', '3:2', '1:1', '3:4'] },
      { name: 'Shape', values: ['square', 'rounded'] },
    ],
    figmaSets: ['Image'],
    props: [
      { name: 'ratio', type: '"auto" | "16:9" | "4:3" | "3:2" | "1:1" | "3:4"', description: 'Width / height; auto fills the parent.' },
      { name: 'shape', type: '"square" | "rounded"', description: 'Radius/none or Radius/container.' },
      { name: 'src / alt', type: 'string', description: 'Figma Media (the swap): the picture and its text.' },
      { name: 'children', type: 'ReactNode', description: 'Any media node instead of src.' },
    ],
    accessibility: 'The image needs alt text; alt="" when decorative. Purely presentational otherwise.',
  },
  {
    key: 'Modal',
    label: 'Modal',
    category: 'Content & Surfaces',
    description: 'Dialog card that interrupts the flow for a decision or a short task: a header, a content slot and a footer over a scrim.',
    usage: 'Use for a decision or a short task that needs full attention (a confirmation, a small form). Not for notifications: use a Toast or an Alert.',
    axes: [
      { name: 'Size', values: ['default', 'lg'] },
    ],
    figmaSets: ['Modal'],
    props: [
      { name: 'open / onOpenChange', type: 'boolean / (open) => void', description: 'Controlled visibility (Escape and the scrim close it).' },
      { name: 'size', type: "'default' | 'lg'", description: 'Figma Size: 480 or 640 wide. It cascades to the header and the footer.' },
      { name: 'header / footer', type: 'ReactNode', description: 'A ModalHeader above the content and a ModalFooter under it (Figma FooterVisible).' },
      { name: 'children', type: 'ReactNode', description: 'The Content slot.' },
      { name: 'showCloseButton', type: 'boolean', description: 'Figma CloseVisible: the ghost pill close in the corner (default true).' },
    ],
    accessibility: 'role="dialog", aria-modal="true", labelled by the title (aria-labelledby) and described by the description. Focus is trapped; Escape and the close button dismiss; focus returns to the trigger.',
  },
  {
    key: 'ModalHeader',
    label: 'Modal Header',
    category: 'Content & Surfaces',
    description: 'Header row of the Modal: an optional icon, the title and description, and an optional trailing slot.',
    usage: 'Inside a Modal. Align sets the layout; vertical-center suits confirmations and has no trailing slot. Never hide the title: it is the dialog name.',
    axes: [
      { name: 'Size', values: ['default', 'lg'] },
      { name: 'Align', values: ['horizontal', 'vertical-left', 'vertical-center'] },
    ],
    figmaSets: ['ModalHeader'],
    props: [
      { name: 'title / description', type: 'ReactNode', description: 'Figma Title and Description (DescriptionVisible hides the second).' },
      { name: 'icon / iconVisible', type: 'ReactNode / boolean', description: 'A FeaturedIcon (soft, circle) before the text.' },
      { name: 'trailing / trailingVisible', type: 'ReactNode / boolean', description: 'Header actions or a count (horizontal only).' },
      { name: 'align', type: "'horizontal' | 'vertical-left' | 'vertical-center'", description: 'Figma Align.' },
    ],
    accessibility: 'The title is the Modal\'s accessible name (aria-labelledby) and the description its aria-describedby.',
  },
  {
    key: 'ModalFooter',
    label: 'Modal Footer',
    category: 'Content & Surfaces',
    description: 'Action tray below the Modal content, divided by a Border/subtle rule.',
    usage: 'Inline puts the actions at the end, primary last; stacked gives full-width buttons for narrow viewports.',
    axes: [
      { name: 'Size', values: ['default', 'lg'] },
      { name: 'Layout', values: ['inline', 'stacked'] },
    ],
    figmaSets: ['ModalFooter'],
    props: [
      { name: 'children', type: 'ReactNode', description: 'The Actions slot (Cancel is a ModalClose).' },
      { name: 'leading / leadingVisible', type: 'ReactNode / boolean', description: 'A step counter or link at the start (inline).' },
      { name: 'layout', type: "'inline' | 'stacked'", description: 'Figma Layout.' },
    ],
    accessibility: 'Put the primary action last in inline order; the buttons keep their own focus order.',
  },
  {
    key: 'AlertDialog',
    label: 'Alert Dialog',
    category: 'Content & Surfaces',
    description: 'shadcn/ui Alert Dialog: a modal that interrupts to confirm an important action.',
    usage: 'Use only for a decision that needs an answer now (delete, discard changes). For anything else use Dialog or a Toast.',
    axes: [
      { name: 'Size', values: ['default', 'sm'] },
    ],
    figmaSets: ['Alert Dialog'],
    props: [
      { name: 'AlertDialogContent size', type: '"default" | "sm"', description: 'sm: narrow, centred, two equal buttons.' },
      { name: 'AlertDialogMedia', type: 'component', description: 'An icon above the title.' },
      { name: 'AlertDialogTitle / AlertDialogDescription', type: 'component', description: 'The question and its consequence.' },
      { name: 'AlertDialogAction / AlertDialogCancel', type: 'component', description: 'Buttons (default and outline; any variant).' },
    ],
    accessibility: 'role="alertdialog": focus moves to Cancel, Esc closes, and nothing behind it can be reached until it is answered.',
  },
  {
    key: 'Sheet',
    label: 'Sheet',
    category: 'Content & Surfaces',
    description: 'shadcn/ui Sheet: a panel that slides in from an edge of the screen.',
    usage: 'Use for secondary tasks that keep the page in context (filters, details, settings). For a blocking decision use Alert Dialog.',
    axes: [
      { name: 'Side', values: ['right', 'left', 'top', 'bottom'] },
    ],
    figmaSets: ['Sheet'],
    props: [
      { name: 'SheetContent side', type: '"top" | "right" | "bottom" | "left"', description: 'The edge it slides from.' },
      { name: 'showCloseButton', type: 'boolean', description: 'The ghost icon-sm close (default true).' },
      { name: 'SheetHeader / SheetTitle / SheetDescription / SheetFooter', type: 'component', description: 'The parts.' },
    ],
    accessibility: 'A Radix Dialog: focus is trapped inside, Esc closes and focus returns to the trigger.',
  },
  {
    key: 'Drawer',
    label: 'Drawer',
    category: 'Content & Surfaces',
    description: 'shadcn/ui Drawer: a panel dragged up from the bottom (vaul), with a grab handle.',
    usage: 'Use on touch layouts for short tasks (share, quick actions). On desktop prefer Dialog or Sheet.',
    axes: [
      { name: 'Direction', values: ['bottom', 'top', 'left', 'right'] },
    ],
    figmaSets: ['Drawer'],
    props: [
      { name: 'direction', type: '"bottom" | "top" | "left" | "right"', description: 'The edge it comes from; bottom shows the handle.' },
      { name: 'DrawerHeader / DrawerTitle / DrawerDescription / DrawerFooter', type: 'component', description: 'The parts.' },
      { name: 'DrawerTrigger / DrawerClose', type: 'component', description: 'Open and close.' },
    ],
    accessibility: 'Built on Radix Dialog: focus is trapped and Esc closes; dragging is never the only way to close it.',
  },
  {
    key: 'Popover',
    label: 'Popover',
    category: 'Content & Surfaces',
    description: 'Non-modal floating panel anchored to a trigger for rich, interactive content: optional media, a title, a description, a content slot and a footer.',
    usage: 'Open on click, not hover. Side is the trigger edge it opens from. Keep one primary action inside at most.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'Side', values: ['bottom', 'top', 'left', 'right'] },
    ],
    figmaSets: ['Popover'],
    props: [
      { name: 'Popover', type: 'component', description: 'Radix Popover root: open, defaultOpen, onOpenChange.' },
      { name: 'PopoverTrigger asChild', type: 'boolean', description: 'Use your own button as the anchor.' },
      { name: 'size / side', type: "'default' | 'sm' | 'lg' / 'bottom' | 'top' | 'left' | 'right'", description: 'Figma Size (320 · 256 · 360 wide) and Side (where the arrow sits).' },
      { name: 'title / description / media / footer', type: 'ReactNode', description: 'Figma Title, Description, Media and the PopoverFooter; children is the Content slot.' },
      { name: 'arrow / showCloseButton', type: 'boolean', description: 'Figma ArrowVisible (default true) and CloseVisible (default false).' },
    ],
    accessibility: 'Trigger gets aria-haspopup + aria-expanded. Escape or an outside click closes it and focus returns to the trigger. Label it with aria-labelledby on the title.',
  },
  {
    key: 'PopoverFooter',
    label: 'Popover Footer',
    category: 'Content & Surfaces',
    description: 'Action row below the Popover body, divided by a Border/subtle rule: status text and buttons.',
    usage: 'Inline puts the text first and the buttons at the end; stacked gives full-width buttons. Size follows the Popover.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'Layout', values: ['inline', 'stacked'] },
    ],
    figmaSets: ['PopoverFooter'],
    props: [
      { name: 'children', type: 'ReactNode', description: 'The Actions slot.' },
      { name: 'leading / leadingVisible', type: 'ReactNode / boolean', description: 'Status text that fills the row (default visible).' },
      { name: 'layout', type: "'inline' | 'stacked'", description: 'Figma Layout.' },
    ],
    accessibility: 'Buttons keep their own focus order; the leading text is plain copy.',
  },
  {
    key: 'HoverCard',
    label: 'Hover Card',
    category: 'Content & Surfaces',
    description: 'shadcn/ui Hover Card: a preview card shown when hovering a link.',
    usage: 'Use to preview what a link points to (a profile, a page) for sighted pointer users. Never put the only copy of information or an action in it.',
    axes: [],
    figmaSets: ['Hover Card'],
    props: [
      { name: 'openDelay / closeDelay', type: 'number', description: 'Hover timing.' },
      { name: 'HoverCardTrigger asChild', type: 'component', description: 'The link it previews.' },
      { name: 'HoverCardContent align sideOffset', type: 'component', description: 'The card.' },
    ],
    accessibility: 'Hover-only: keyboard and touch users never see it, so it must only repeat what the link already offers.',
  },
  {
    key: 'TooltipContent',
    label: 'Tooltip',
    category: 'Content & Surfaces',
    description: 'Short hint bubble on hover or focus: an optional title, the text and an arrow on the edge opposite to Side.',
    usage: 'Use for a short label or hint that never carries the only copy of information or an action. Variant must match its trigger.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'Side', values: ['top', 'bottom', 'left', 'right'] },
      { name: 'Align', values: ['start', 'center', 'end'] },
      { name: 'Variant', values: ['default', 'secondary', 'inverse', 'critical', 'info'] },
    ],
    figmaSets: ['TooltipContent'],
    props: [
      { name: 'Tooltip / TooltipTrigger asChild / TooltipProvider', type: 'component', description: 'Radix root, the anchor and the delay provider.' },
      { name: 'size / side / align / variant', type: 'string', description: "Figma Size, Side (the edge it opens from), Align and Variant (the tone)." },
      { name: 'title / arrow', type: 'ReactNode / boolean', description: 'Figma Title (TitleVisible) and ArrowVisible (default true); children is the Text.' },
    ],
    accessibility: 'role="tooltip", referenced from the trigger by aria-describedby; it opens on hover and keyboard focus and closes with Escape.',
  },
  {
    key: 'TooltipInfoTrigger',
    label: 'Tooltip Info Trigger',
    category: 'Content & Surfaces',
    description: 'Info-circle button that opens a tooltip.',
    usage: 'Next to a label or field that needs an explanation. Variant must match the bubble it opens.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Open', 'Focused'] },
      { name: 'Variant', values: ['default', 'secondary', 'inverse', 'critical', 'info'] },
    ],
    figmaSets: ['TooltipInfoTrigger'],
    props: [
      { name: 'size / variant', type: 'string', description: 'Figma Size (glyph 14 · 16 · 20) and Variant.' },
      { name: 'icon', type: 'ReactNode', description: "Another glyph; defaults to Phosphor's Info." },
      { name: 'aria-label', type: 'string', description: 'Required: the button has no visible text.' },
    ],
    accessibility: 'A focusable button with an accessible name (aria-label); the open state follows the tooltip it controls (data-state=open).',
  },
  {
    key: 'ScrollArea',
    label: 'Scroll Area',
    category: 'Content & Surfaces',
    description: 'Scrollable viewport with overlay ScrollBars and an optional fade at the scroll end. Size and Appearance cascade to the bars.',
    usage: 'Use inside panels and menus with bounded height or width. Never trap page scroll; give the viewport an accessible name when it holds primary content.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'Orientation', values: ['vertical', 'horizontal', 'both'] },
      { name: 'Appearance', values: ['filled', 'ghost'] },
    ],
    figmaSets: ['ScrollArea'],
    props: [
      { name: 'size / orientation / appearance', type: 'string', description: 'Figma Size (bar thickness), Orientation (which bars) and Appearance (filled or ghost).' },
      { name: 'fadeVisible', type: 'boolean', description: 'Figma FadeVisible: a fade into the surface at the scroll end.' },
      { name: 'style / className', type: 'CSSProperties | string', description: 'Give it a height (and width); content past it scrolls.' },
    ],
    accessibility: 'The viewport is focusable and scrolls with the arrows, PageUp / PageDown and Home / End; the bars are aria-hidden. Add aria-label when it holds primary content.',
  },
  {
    key: 'ScrollBar',
    label: 'Scroll Bar',
    category: 'Content & Surfaces',
    description: 'Overlay scrollbar of a ScrollArea: a Radius/full thumb on a Surface/muted track (filled) or on nothing (ghost).',
    usage: 'Inside a ScrollArea (it places its own); use it standalone only for custom scrollbar placement.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'Orientation', values: ['vertical', 'horizontal'] },
      { name: 'Appearance', values: ['filled', 'ghost'] },
    ],
    figmaSets: ['ScrollBar'],
    props: [{ name: 'size / orientation / appearance', type: 'string', description: 'Figma axes; Size and Appearance follow the ScrollArea.' }],
    accessibility: 'Decorative and aria-hidden: the viewport carries focus and keyboard scrolling.',
  },
  {
    key: 'Table',
    label: 'Table',
    category: 'Content & Surfaces',
    description: 'Data table root: a header, rows and an optional footer; Size and Dividers cascade to every row and cell.',
    usage: 'Use for tabular data people compare across columns. For a list of items with one action each prefer a list; Pagination sits outside the table.',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'Appearance', values: ['filled', 'ghost'] },
      { name: 'Dividers', values: ['grid', 'rows'] },
    ],
    figmaSets: ['Table'],
    props: [
      { name: 'size / appearance / dividers', type: 'Figma axes', description: 'Rows are 48 · 32 · 40 · 56 tall; filled adds Surface/page, Border/default and Radius/container; grid adds a hairline between columns.' },
      { name: 'children', type: 'ReactNode', description: 'Figma Content: TableHeader, TableBody (TableRow) and an optional TableFooter.' },
    ],
    accessibility: 'A real <table> with explicit roles; give it an aria-label or a TableCaption. Pagination sits outside the table, next to the container.',
  },
  {
    key: 'TableCell',
    label: 'TableCell',
    category: 'Content & Surfaces',
    description: 'Body cell: a label with optional description, a leading slot (Checkbox, Avatar, Badge) and a trailing slot (overflow IconButton or Badge).',
    usage: 'Use inside a TableRow. Align end is the numeric column. For a thumbnail use TableMediaCell, for a value with a delta TableTrendCell.',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'Align', values: ['start', 'end'] },
      { name: 'Pinned', values: ['none', 'start', 'end'] },
      { name: 'State', values: ['Default', 'Disabled'] },
    ],
    figmaSets: ['TableCell'],
    props: [
      { name: 'size / align / pinned / state', type: 'Figma axes', description: 'Size follows the row; pinned draws a 1px edge on the side that meets the scrolling columns.' },
      { name: 'label / description / leading / trailing', type: 'ReactNode', description: 'Figma Label, Description, Leading and Trailing (each with its Visible flag).' },
      { name: 'rowHeader', type: 'boolean', description: 'Renders a <th scope="row">.' },
    ],
    accessibility: 'The row-header column uses th scope="row"; actions in the trailing slot need an aria-label.',
  },
  {
    key: 'TableHead',
    label: 'TableHead',
    category: 'Content & Surfaces',
    description: 'Column header cell: a label, an optional leading slot (select-all Checkbox), a sort arrow and a resizer.',
    usage: 'Use inside a TableHeader, one per column. Make a column sortable with onSort; hover only exists for sortable columns.',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'Align', values: ['start', 'end'] },
      { name: 'Pinned', values: ['none', 'start', 'end'] },
      { name: 'Sort', values: ['none', 'ascending', 'descending'] },
      { name: 'State', values: ['Default', 'Hover'] },
    ],
    figmaSets: ['TableHead'],
    props: [
      { name: 'size / align / pinned / sort / state', type: 'Figma axes', description: 'The arrow shows only on the sorted column; Hover is the sortable column under the pointer.' },
      { name: 'label / leading / resizerVisible', type: 'ReactNode / boolean', description: 'Figma Label, Leading and ResizerVisible.' },
      { name: 'onSort', type: '() => void', description: 'Makes the column a button (Enter and Space).' },
    ],
    accessibility: 'th scope="col"; a sortable column is keyboard operable and sets aria-sort (omitted for none).',
  },
  {
    key: 'TableMediaCell',
    label: 'TableMediaCell',
    category: 'Content & Surfaces',
    description: 'Media cell: a thumbnail at 1:1 or 2:1 with an optional label and description.',
    usage: 'Use for rows that lead with a picture (products, people, files). Give the image alt text, or empty alt when the label already names it.',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'Ratio', values: ['square', 'wide'] },
      { name: 'State', values: ['Default', 'Disabled'] },
    ],
    figmaSets: ['TableMediaCell'],
    props: [
      { name: 'size / ratio / state', type: 'Figma axes', description: 'The thumbnail is 24 · 32 · 40 · 48 tall; wide doubles its width.' },
      { name: 'src / alt / image', type: 'string / ReactNode', description: 'Figma Image (the swap).' },
      { name: 'label / description', type: 'ReactNode', description: 'Figma Label and Description.' },
    ],
    accessibility: 'The image needs alt text, or alt="" when the label already names it.',
  },
  {
    key: 'TableTrendCell',
    label: 'TableTrendCell',
    category: 'Content & Surfaces',
    description: 'Trend cell: a right-aligned value with a delta whose arrow and colour carry the direction.',
    usage: 'Use for metrics that moved (revenue, signups). Direction is never colour alone: the cell reads e.g. "up 12.4%".',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'Trend', values: ['up', 'down', 'neutral'] },
      { name: 'State', values: ['Default', 'Disabled'] },
    ],
    figmaSets: ['TableTrendCell'],
    props: [
      { name: 'size / trend / state', type: 'Figma axes', description: 'up = success, down = critical, neutral = Content/secondary.' },
      { name: 'value / delta / deltaVisible', type: 'ReactNode / boolean', description: 'Figma Value, Delta and DeltaVisible.' },
    ],
    accessibility: 'A visually hidden word (up, down, unchanged) precedes the delta so the direction is not colour alone.',
  },
  {
    key: 'TableResizer',
    label: 'TableResizer',
    category: 'Content & Surfaces',
    description: 'Column resize handle on the end edge of a TableHead.',
    usage: 'Use inside a TableHead (ResizerVisible). Invisible at rest, strong on hover, accent while dragging.',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [
      { name: 'State', values: ['Default', 'Hover', 'Resizing'] },
    ],
    figmaSets: ['TableResizer'],
    props: [
      { name: 'resizing / forceState', type: 'boolean / State', description: 'Figma State Resizing while the handle is dragged.' },
    ],
    accessibility: 'role="separator" aria-orientation="vertical", focusable; resize with the arrow keys in your handler.',
  },
  {
    key: 'TableRow',
    label: 'TableRow',
    category: 'Content & Surfaces',
    description: 'Body row: a strip of TableCell instances with a hairline under it and its own states.',
    usage: 'Use inside a TableBody. Hover and focus exist only on a selectable or actionable row (interactive / onClick).',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Selected', 'Focused', 'Disabled', 'Dragging'] },
      { name: 'Dividers', values: ['grid', 'rows'] },
    ],
    figmaSets: ['TableRow'],
    props: [
      { name: 'size / state / dividers', type: 'Figma axes', description: 'Follow the Table unless set.' },
      { name: 'selected / disabled / dragging / interactive / forceState', type: 'boolean / State', description: 'Selected, Disabled and Dragging are data states; Hover and Focused come from the pointer and the keyboard.' },
    ],
    accessibility: 'Selected rows set aria-selected; disabled rows set aria-disabled and skip their action; focus-visible draws Border/focus inside the row.',
  },
  {
    key: 'TableHeader',
    label: 'TableHeader',
    category: 'Content & Surfaces',
    description: 'Header row of a Table: a strip of TableHead cells on Surface/muted.',
    usage: 'Use once per Table, first. Keep it sticky in scroll containers.',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'Dividers', values: ['grid', 'rows'] },
      { name: 'Scrolled', values: ['true', 'false'] },
    ],
    figmaSets: ['TableHeader'],
    props: [
      { name: 'size / dividers / scrolled', type: 'Figma axes', description: 'Scrolled turns the bottom edge Border/default.' },
    ],
    accessibility: 'One th per column with scope="col".',
  },
  {
    key: 'TableFooter',
    label: 'TableFooter',
    category: 'Content & Surfaces',
    description: 'Totals row of a Table: TableCell values in Type/label on Surface/muted.',
    usage: 'Use for totals and summaries. Dividers follows the Table.',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'Dividers', values: ['rows', 'grid'] },
    ],
    figmaSets: ['TableFooter'],
    props: [
      { name: 'size / dividers', type: 'Figma axes', description: 'A top hairline above the muted strip.' },
    ],
    accessibility: 'Label the totals with a th scope="row" in the first cell; set it sticky in code to pin it.',
  },
  {
    key: 'TableCaption',
    label: 'TableCaption',
    category: 'Content & Surfaces',
    description: 'The title and description of a table.',
    usage: 'Use to name the table for everyone; the visible heading and the accessible name are one.',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [],
    figmaSets: ['TableCaption'],
    props: [
      { name: 'title / description', type: 'ReactNode', description: 'Type/heading-2xs over Type/body-sm.' },
    ],
    accessibility: 'A real <caption>.',
  },
  {
    key: 'TableDropIndicator',
    label: 'TableDropIndicator',
    category: 'Content & Surfaces',
    description: 'The 2px line that shows where a dragged row will land.',
    usage: 'Use between rows while a row is being dragged.',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [],
    figmaSets: ['TableDropIndicator'],
    props: [
      { name: 'className', type: 'string', description: 'A full-width Border/accent line, Stroke/focus tall.' },
    ],
    accessibility: 'Decorative: hidden from assistive technology; announce the move with a live region.',
  },
  {
    key: 'TableEmpty',
    label: 'TableEmpty',
    category: 'Content & Surfaces',
    description: 'The empty state of a table: icon, title, description and an action.',
    usage: 'Use when a table has no rows. Say why and offer the next step.',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [],
    figmaSets: ['TableEmpty'],
    props: [
      { name: 'icon / title / description / action', type: 'ReactNode', description: 'Figma Action is a slot (a secondary outline Button by default); null hides it.' },
    ],
    accessibility: 'role="status" so the empty result is announced.',
  },
  {
    key: 'TableLoading',
    label: 'TableLoading',
    category: 'Content & Surfaces',
    description: 'A spinner and a label shown while rows load.',
    usage: 'Use as the body of a table that is fetching, or under it while more rows load.',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [],
    figmaSets: ['TableLoading'],
    props: [
      { name: 'label', type: 'ReactNode', description: 'Figma Label.' },
    ],
    accessibility: 'role="status" aria-live="polite".',
  },
  {
    key: 'TableLoadMore',
    label: 'TableLoadMore',
    category: 'Content & Surfaces',
    description: 'The Load more row under a table, and its loading state.',
    usage: 'Use when rows are fetched in pages and the end is not reached.',
    // The Figma page «❖ Table», value for value (design-plans/table-contract.md).
    axes: [
      { name: 'State', values: ['Default', 'Loading'] },
    ],
    figmaSets: ['TableLoadMore'],
    props: [
      { name: 'state / onLoadMore', type: 'State / () => void', description: 'Loading swaps the button for a TableLoading row.' },
    ],
    accessibility: 'The button is a real button; the loading row announces itself.',
  },
  {
    key: 'Item',
    label: 'Item',
    category: 'Content & Surfaces',
    description: 'shadcn/ui Item: a list row — media, title, description and actions.',
    usage: 'Use for rows of settings, people, files or results. For tabular data compared across columns use Table.',
    axes: [
      { name: 'Variant', values: ['default', 'outline', 'muted'] },
      { name: 'Size', values: ['default', 'sm', 'xs'] },
    ],
    figmaSets: ['Item'],
    props: [
      { name: 'variant', type: '"default" | "outline" | "muted"', description: 'No edge, a hairline, or the muted surface.' },
      { name: 'size', type: '"default" | "sm" | "xs"', description: 'Padding, gap and media size.' },
      { name: 'ItemMedia variant', type: '"default" | "icon" | "image"', description: 'A glyph, an icon, or a cropped image.' },
      { name: 'ItemContent / ItemTitle / ItemDescription / ItemActions', type: 'component', description: 'The parts.' },
      { name: 'asChild', type: 'boolean', description: 'Render as a link or button.' },
    ],
    accessibility: 'Group items in ItemGroup (role="list"). A clickable item is a real link or button (asChild).',
  },
  {
    key: 'Attachment',
    label: 'Attachment',
    category: 'Content & Surfaces',
    description: 'shadcn/ui Attachment: a file on a message or a form — media, name, size, actions — with an upload state.',
    usage: 'Use to show files attached to a message, a comment or a form. For the drop target itself use File Upload Dropzone or File Upload.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'xs'] },
      { name: 'Orientation', values: ['horizontal', 'vertical'] },
      { name: 'State', values: ['idle', 'uploading', 'processing', 'error', 'done'] },
    ],
    figmaSets: ['Attachment'],
    props: [
      { name: 'state', type: '"idle" | "uploading" | "processing" | "error" | "done"', description: 'The upload state; error paints the media and description critical.' },
      { name: 'size', type: '"default" | "sm" | "xs"', description: 'Padding and media size.' },
      { name: 'orientation', type: '"horizontal" | "vertical"', description: 'A row, or a tile.' },
      { name: 'AttachmentMedia / AttachmentTitle / AttachmentDescription / AttachmentActions / AttachmentAction', type: 'component', description: 'The parts; an action is a ghost icon-xs Button.' },
    ],
    accessibility: 'Announce upload progress and errors in text (the description), not by colour alone.',
  },
  {
    key: 'Message',
    label: 'Message',
    category: 'Content & Surfaces',
    description: 'shadcn/ui Message: one chat message — avatar, header, the bubble and a footer.',
    usage: 'Use for conversation threads (support chat, AI assistants). The body is a Bubble.',
    axes: [
      { name: 'Align', values: ['start', 'end'] },
    ],
    figmaSets: ['Message'],
    props: [
      { name: 'align', type: '"start" | "end"', description: 'Who wrote it: the other party, or you.' },
      { name: 'MessageAvatar / MessageHeader / MessageContent / MessageFooter', type: 'component', description: 'The parts.' },
      { name: 'MessageGroup', type: 'component', description: 'Stacks messages.' },
    ],
    accessibility: "Render a thread as a list with each message's author and time in text; announce new messages with a live region.",
  },
  {
    key: 'Bubble',
    label: 'Bubble',
    category: 'Content & Surfaces',
    description: 'shadcn/ui Bubble: the body of a chat message, in seven variants, with optional reactions.',
    usage: 'Use inside Message. Default for your own messages, muted or outline for the other party, destructive for a failed send.',
    axes: [
      { name: 'Variant', values: ['default', 'secondary', 'muted', 'tinted', 'outline', 'ghost', 'destructive'] },
      { name: 'Align', values: ['start', 'end'] },
    ],
    figmaSets: ['Bubble'],
    props: [
      { name: 'variant', type: '"default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive"', description: 'How the bubble is painted.' },
      { name: 'align', type: '"start" | "end"', description: 'Which side it sits on.' },
      { name: 'BubbleContent asChild', type: 'component', description: 'The text box; a link or button with asChild.' },
      { name: 'BubbleReactions side align', type: 'component', description: 'Emoji reactions pinned to an edge.' },
    ],
    accessibility: "The bubble's colour must not be the only signal of who wrote it — keep the author in the Message header.",
  },
  {
    key: 'Resizable',
    label: 'Resizable',
    category: 'Content & Surfaces',
    description: 'shadcn/ui Resizable: panels split by handles you drag to resize (react-resizable-panels).',
    usage: 'Use for editor layouts where people tune the space (a sidebar, a preview). Not for content that should simply reflow.',
    axes: [
      { name: 'Orientation', values: ['horizontal', 'vertical'] },
    ],
    figmaSets: ['Resizable'],
    props: [
      { name: 'ResizablePanelGroup orientation', type: '"horizontal" | "vertical"', description: 'The split direction.' },
      { name: 'ResizablePanel defaultSize minSize', type: 'number', description: 'Each panel, in percent.' },
      { name: 'ResizableHandle withHandle', type: 'boolean', description: 'A visible grip on the handle.' },
    ],
    accessibility: 'Each handle is a separator you can focus and move with the arrow keys.',
  },
  {
    key: 'Carousel',
    label: 'Carousel',
    category: 'Content & Surfaces',
    description: 'shadcn/ui Carousel: slides you swipe or step through with previous / next (Embla).',
    usage: 'Use for a set of comparable items people browse (images, plans). Do not hide important content in later slides.',
    axes: [
      { name: 'Orientation', values: ['horizontal', 'vertical'] },
    ],
    figmaSets: ['Carousel'],
    props: [
      { name: 'orientation', type: '"horizontal" | "vertical"', description: 'The scroll axis.' },
      { name: 'opts / plugins / setApi', type: 'Embla', description: 'Loop, alignment, autoplay, the API.' },
      { name: 'CarouselContent / CarouselItem', type: 'component', description: 'The track and each slide.' },
      { name: 'CarouselPrevious / CarouselNext', type: 'component', description: 'Outline icon-sm Buttons, round.' },
    ],
    accessibility: 'role="region" aria-roledescription="carousel"; arrow keys step; each slide is a group labelled "slide".',
  },
  {
    key: 'Chart',
    label: 'Chart',
    category: 'Content & Surfaces',
    description: 'shadcn/ui Chart: Recharts with a config of series → colour, a tooltip and a legend in the system.',
    usage: "Use for trends and comparisons. Colour the series with the system's chart palette and pair colour with a second encoding (labels, legend).",
    axes: [
      { name: 'Type', values: ['bar', 'line', 'area'] },
    ],
    figmaSets: ['Chart'],
    props: [
      { name: 'ChartContainer config', type: 'ChartConfig', description: 'Series → label and colour; sets --color-<key>.' },
      { name: 'ChartTooltip / ChartTooltipContent', type: 'component', description: 'The hover readout (indicator dot | line | dashed).' },
      { name: 'ChartLegend / ChartLegendContent', type: 'component', description: 'The legend.' },
      { name: '…Recharts', type: 'BarChart · LineChart · AreaChart', description: 'The chart itself.' },
    ],
    accessibility: 'Give the chart a text alternative (a summary or the table). accessibilityLayer adds keyboard navigation in Recharts.',
  },
  // ── Feedback ────────────────────────────────────────────────────────────────
  {
    key: 'Toast',
    label: 'Toast',
    category: 'Feedback',
    description: 'A short, non-blocking confirmation over the page that dismisses itself: an icon told apart by severity, a title, an optional description, actions, a close and a progress hairline.',
    usage: 'Use for transient feedback (saved, copied, undone). Keep the title under six words; an action such as Undo needs a second way to be reached because the toast times out. For a persistent notice use Alert, for form validation Field.',
    // The Figma file's axes, value for value (design-plans/toast-contract.md).
    axes: [
      { name: 'Appearance', values: ['solid', 'soft', 'filled', 'outline'] },
      { name: 'Variant', values: ['default', 'secondary', 'success', 'info', 'warning', 'critical'] },
    ],
    figmaSets: ['Toast'],
    props: [
      { name: 'appearance / variant', type: 'Figma axes', description: 'Variant is the severity: it picks the icon (Sparkle, Info, CheckCircle, Warning, WarningCircle) and the colour.' },
      { name: 'title / description / descriptionVisible', type: 'ReactNode / boolean', description: 'Figma Title, Description and DescriptionVisible.' },
      { name: 'iconVisible / actionsVisible / closeVisible / progressVisible', type: 'boolean', description: 'The Figma booleans; progress is the time-left hairline (progress = 0–100).' },
      { name: 'showToast(props)', type: 'function', description: 'Puts a Toast in the Toaster queue; mount <Toaster /> once.' },
    ],
    accessibility: 'role="status" (polite), and role="alert" for critical. Do not rely on colour alone: the icon and the text carry the severity. Keep the toast on screen long enough to read.',
  },
  {
    key: 'Alert',
    label: 'Alert',
    category: 'Feedback',
    description: 'A message bar for app-wide notices, subscription warnings, announcements and global errors: an icon, a description, optional actions and a close.',
    usage: 'Use for a message about the product or the page around it. Horizontal is the full-width banner above or below the header, vertical a boxed message in content. For auto-dismissing feedback use Toast, for form validation Field.',
    // The Figma file's axes, value for value (design-plans/alert-contract.md).
    axes: [
      { name: 'Variant', values: ['success', 'info', 'warning', 'default', 'critical', 'secondary'] },
      { name: 'Appearance', values: ['outline', 'solid', 'soft', 'inverse'] },
      { name: 'Layout', values: ['horizontal', 'vertical'] },
      { name: 'Size', values: ['sm', 'default'] },
    ],
    figmaSets: ['Alert'],
    props: [
      { name: 'variant / appearance / layout / size', type: 'Figma axes', description: 'Variant is the severity; horizontal has no radius (a bottom edge when outline), vertical is boxed at Radius/container.' },
      { name: 'description / iconVisible / icon', type: 'ReactNode / boolean', description: 'Figma Description, IconVisible and Icon (the Sparkle by default).' },
      { name: 'actionsVisible / actions', type: 'boolean / ReactNode', description: 'Figma ActionsVisible: a Button beside the text.' },
      { name: 'closeVisible / onClose / closeLabel', type: 'boolean / () => void / string', description: 'Figma CloseVisible: a CloseButton named by closeLabel.' },
      { name: 'children', type: 'ReactNode', description: 'The older composition: AlertTitle + AlertDescription in a boxed alert with no close.' },
    ],
    accessibility: 'role="alert". Convey severity with the icon and the text as well as colour, and give the close button an accessible name.',
  },
  {
    key: 'Skeleton',
    label: 'Skeleton',
    category: 'Feedback',
    description: 'shadcn/ui Skeleton: a placeholder block that pulses while content loads.',
    usage: 'Use in the shape of the content that is coming (a line, an avatar, a card) so the layout does not jump. For an action in progress use Spinner.',
    axes: [],
    figmaSets: ['Skeleton'],
    props: [
      { name: 'className / style', type: 'string | CSSProperties', description: 'The size and shape of the content it stands in for.' },
    ],
    accessibility: 'Decorative: mark the loading region with aria-busy="true" and hide the skeletons with aria-hidden.',
  },
  {
    key: 'Empty',
    label: 'Empty',
    category: 'Feedback',
    description: 'shadcn/ui Empty: the empty state — media, title, description and the actions under them.',
    usage: 'Use when a list, search or page has nothing to show yet; say why and offer the next step. Not for errors — use Alert.',
    axes: [{ name: 'Media', values: ['default', 'icon'] }],
    figmaSets: ['Empty'],
    props: [
      { name: 'EmptyHeader / EmptyTitle / EmptyDescription', type: 'component', description: 'The message.' },
      { name: 'EmptyMedia variant', type: '"default" | "icon"', description: 'An illustration or avatar as is, or a glyph on a muted tile.' },
      { name: 'EmptyContent', type: 'component', description: 'The actions (a Button, a link).' },
    ],
    accessibility: 'Keep the title a real heading when it labels a region; the actions are ordinary buttons and links.',
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
    description: 'Group of buttons that switches between sibling views or routes: a line layout (hairline track and accent bar) or a button layout (selected item filled), horizontal or vertical.',
    usage: 'Use for page-level sections or routes. Exactly one item is selected; use Tabs when the panels swap in place.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'Variant', values: ['horizontal-line', 'horizontal-button', 'vertical-line', 'vertical-button'] },
    ],
    figmaSets: ['TabMenu'],
    props: [
      { name: 'size / variant', type: 'string', description: 'Figma Size and Variant; Size cascades to every item.' },
      { name: 'value / defaultValue / onValueChange', type: 'string', description: 'The selected item.' },
      { name: 'items / fill', type: 'string[] / boolean', description: 'Shortcut for plain items; items share the width.' },
      { name: 'children', type: 'TabMenuItem | TabMenuLineItem', description: 'The Content slot: line items for the line variants, items for the button ones.' },
    ],
    accessibility: 'role="group" of real buttons with aria-pressed; each item is its own tab stop and Space or Enter activates it.',
  },
  {
    key: 'TabMenuItem',
    label: 'Tab Menu Item',
    category: 'Navigation',
    description: 'Button tab of a TabMenu: optional leading icon, label and a trailing count badge. Selected fills Surface/selected.',
    usage: 'Inside a button-variant TabMenu.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Selected', 'Disabled'] },
    ],
    figmaSets: ['TabMenuItem'],
    props: [
      { name: 'value / size / forceState', type: 'string', description: 'The item value (defaults to its text), Size (follows the TabMenu) and a pinned state for docs.' },
      { name: 'iconLeading / trailing / iconTrailing', type: 'ReactNode', description: 'Figma icon slots and the trailing count Badge.' },
    ],
    accessibility: 'A button with aria-pressed; disabled uses the native attribute.',
  },
  {
    key: 'TabMenuLineItem',
    label: 'Tab Menu Line Item',
    category: 'Navigation',
    description: 'Line tab of a TabMenu: the selected item carries a 2px accent bar on its bottom or left edge.',
    usage: 'Inside a line-variant TabMenu.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Selected', 'Disabled'] },
      { name: 'Indicator', values: ['bottom', 'left'] },
    ],
    figmaSets: ['TabMenuLineItem'],
    props: [
      { name: 'value / size / forceState / indicator', type: 'string', description: 'As the item; Indicator defaults to left in a vertical TabMenu.' },
      { name: 'iconLeading / trailing / iconTrailing', type: 'ReactNode', description: 'Figma icon slots and the trailing count Badge.' },
    ],
    accessibility: 'A button with aria-pressed; disabled uses the native attribute.',
  },
  {
    key: 'NavItem',
    label: 'Nav Item',
    category: 'Navigation',
    description: 'Header navigation link or menu trigger: label, optional leading icon, count Badge and trailing caret.',
    usage: 'In a header or navbar. Current marks the page you are on; with a trailing caret it opens a NavigationMenu. Tabs inside a view use TabMenuItem.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Current', 'Disabled'] },
    ],
    figmaSets: ['NavItem'],
    props: [
      { name: 'size / current / disabled / forceState', type: 'string / boolean', description: 'Figma Size and State; Current is aria-current="page".' },
      { name: 'iconLeading / trailing / iconTrailing', type: 'ReactNode', description: 'Figma icon slots and the trailing count Badge.' },
      { name: 'asChild', type: 'boolean', description: 'Use your router link or a button as the element.' },
    ],
    accessibility: 'A link; the current one is aria-current="page". As a menu trigger add aria-expanded.',
  },
  {
    key: 'Brand',
    label: 'Brand',
    category: 'Navigation',
    description: 'Product logo, name and an optional version Badge.',
    usage: 'sm in app headers, default in marketing headers and footers. Wrap it in a link with an accessible name such as "Escala home".',
    axes: [{ name: 'Size', values: ['default', 'sm'] }],
    figmaSets: ['Brand'],
    props: [
      { name: 'size / name / version / versionVisible', type: 'string / boolean', description: 'Figma Size, Name, VersionVisible and the version text.' },
      { name: 'logo', type: 'ReactNode', description: 'Figma Logo slot: an Avatar or an SVG mark.' },
    ],
    accessibility: 'Decorative on its own; the link around it names it.',
  },
  {
    key: 'AccountMenuTrigger',
    label: 'Account Menu Trigger',
    category: 'Navigation',
    description: 'Opens the user menu: an Avatar, an optional name and a caret, on ghost button roles.',
    usage: 'In a header or sidebar footer, as the trigger of a DropdownMenu.',
    axes: [
      { name: 'Size', values: ['default', 'sm'] },
      { name: 'State', values: ['Default', 'Hover', 'Pressed', 'Focused'] },
    ],
    figmaSets: ['AccountMenuTrigger'],
    props: [
      { name: 'size / forceState', type: 'string', description: 'Figma Size and State.' },
      { name: 'name / nameVisible / avatar', type: 'string / boolean / ReactElement', description: 'Figma Name and NameVisible; your own Avatar.' },
    ],
    accessibility: 'A button with aria-haspopup="menu"; named "Account menu for <name>" when the name is hidden. Add aria-expanded.',
  },
  {
    key: 'SegmentedControl',
    label: 'Segmented Control',
    category: 'Navigation',
    description: 'Single choice between 2 to 5 short options shown as one track; the checked segment is raised on it. Size cascades to every segment.',
    usage: 'Use for 2–5 exclusive options of the same data (e.g. Day / Week / Month). Use RadioGroup for long labels or more options, TabMenu to switch views, ButtonGroup for independent actions.',
    // The Figma file's axes, value for value (design-plans/segmented-control-contract.md).
    axes: [{ name: 'Size', values: ['default', 'sm', 'lg'] }],
    figmaSets: ['SegmentedControl'],
    props: [
      { name: 'size', type: '"default" | "sm" | "lg"', description: 'Segment height 32 · 24 · 40; the track is 8 more. Cascades to every item.' },
      { name: 'value / defaultValue / onValueChange', type: 'string', description: 'The checked segment (exactly one).' },
      { name: 'children', type: 'SegmentedControlItem[]', description: 'Figma Content slot. Omitted: Day · Week · Month.' },
      { name: 'options', type: 'string[]', description: 'Shortcut for plain text segments.' },
    ],
    accessibility: 'role="radiogroup"; each segment role="radio" with aria-checked. One tab stop; the arrow keys move and select.',
  },
  {
    key: 'SegmentedControlItem',
    label: 'Segmented Control Item',
    category: 'Navigation',
    description: 'One option of a SegmentedControl. Checked shows a raised Surface/input thumb with Shadow/xs on the Surface/muted track.',
    usage: 'Always inside a SegmentedControl. With LabelVisible false give the segment an aria-label.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'Checked', values: ['false', 'true'] },
      { name: 'State', values: ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] },
    ],
    figmaSets: ['SegmentedControlItem'],
    props: [
      { name: 'label / labelVisible', type: 'ReactNode / boolean', description: 'Figma Label and LabelVisible.' },
      { name: 'iconLeadingVisible / iconLeading', type: 'boolean / ReactNode', description: 'Figma IconLeadingVisible and IconLeadingIcon.' },
      { name: 'value', type: 'string', description: 'What it selects inside the group (defaults to the label).' },
      { name: 'checked / size', type: 'boolean / Size', description: 'Taken from the group when inside one.' },
      { name: 'disabled / forceState', type: 'boolean / State', description: 'Disabled mutes it; forceState pins a state for docs.' },
    ],
    accessibility: 'role="radio" with aria-checked; the roving tabindex belongs to the group.',
  },
  {
    key: 'Breadcrumb',
    label: 'Breadcrumbs',
    category: 'Navigation',
    description: "Navigation trail of items, separators and an optional ellipsis that collapses the start of a long trail.",
    usage: "Only use when hierarchy is 3+ levels deep. Don't duplicate primary navigation. The last item is the current page.",
    axes: [
      { name: 'Appearance', values: ['ghost', 'outline', 'solid'] },
      { name: 'Separator', values: ['chevron', 'slash', 'dot'] },
      { name: 'Size', values: ['xs', 'sm', 'default'] },
    ],
    figmaSets: ['Breadcrumb'],
    props: [
      { name: 'appearance / separator / size', type: 'string', description: 'Figma Appearance, Separator and Size; they cascade to every item, separator and the ellipsis.' },
      { name: 'Breadcrumb / BreadcrumbList', type: 'component', description: 'Landmark (nav) and ordered list.' },
      { name: 'BreadcrumbItem / BreadcrumbEllipsis / BreadcrumbSeparator', type: 'component', description: 'The segments, the collapsed start and the divider (the Figma sets of the same names).' },
    ],
    accessibility: 'nav aria-label="Breadcrumb" over an ordered list. The current page is aria-current="page" and not a link; separators are hidden from assistive technology.',
  },
  {
    key: 'BreadcrumbItem',
    label: 'Breadcrumb Item',
    category: 'Navigation',
    description: 'One segment of a breadcrumb trail, rendered as a link (or the current page).',
    usage: 'Inside a Breadcrumb. Mark the last item current and keep it non-interactive.',
    axes: [
      { name: 'Variant', values: ['default', 'secondary'] },
      { name: 'Appearance', values: ['ghost', 'outline', 'solid'] },
      { name: 'Size', values: ['xs', 'sm', 'default'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Current', 'Disabled'] },
    ],
    figmaSets: ['BreadcrumbItem'],
    props: [
      { name: 'variant / appearance / size', type: 'string', description: 'Figma Variant, Appearance and Size (appearance and size follow the Breadcrumb).' },
      { name: 'current / disabled / forceState', type: 'boolean / State', description: 'Current page (aria-current), disabled, or a pinned state for docs.' },
      { name: 'iconLeading / iconTrailing / asChild', type: 'ReactNode / boolean', description: 'Figma icon slots; use your router link as the element.' },
    ],
    accessibility: 'A link; the current item is aria-current="page" and not interactive.',
  },
  {
    key: 'BreadcrumbEllipsis',
    label: 'Breadcrumb Ellipsis',
    category: 'Navigation',
    description: 'Collapsed middle of a long breadcrumb trail that opens a menu of the hidden segments.',
    usage: 'Replace the first segments of a trail longer than four items.',
    axes: [
      { name: 'Variant', values: ['default', 'secondary'] },
      { name: 'Appearance', values: ['ghost', 'outline', 'solid'] },
      { name: 'Size', values: ['xs', 'sm', 'default'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Disabled'] },
    ],
    figmaSets: ['BreadcrumbEllipsis'],
    props: [
      { name: 'variant / appearance / size / forceState', type: 'string', description: 'Figma axes; appearance and size follow the Breadcrumb.' },
      { name: 'aria-label', type: 'string', description: 'Defaults to "Show hidden breadcrumbs".' },
    ],
    accessibility: 'A button with an accessible name.',
  },
  {
    key: 'BreadcrumbSeparator',
    label: 'Breadcrumb Separator',
    category: 'Navigation',
    description: 'Decorative divider between breadcrumb items: chevron, slash or dot.',
    usage: 'Between items; the same Size as the items.',
    axes: [
      { name: 'Variant', values: ['chevron', 'slash', 'dot'] },
      { name: 'Size', values: ['xs', 'sm', 'default'] },
    ],
    figmaSets: ['BreadcrumbSeparator'],
    props: [
      { name: 'variant / size', type: 'string', description: 'Figma Variant (follows the Breadcrumb Separator) and Size.' },
      { name: 'children', type: 'ReactNode', description: 'Another glyph or text.' },
    ],
    accessibility: 'role="presentation" and aria-hidden: it carries no information.',
  },
  {
    key: 'Pagination',
    label: 'Pagination',
    category: 'Navigation',
    description: 'Page navigation: First / Previous, numbered links with ellipses, Next / Last. Joined like a ButtonGroup or as ghost buttons apart.',
    usage: 'Use for result sets over one page. Disable First / Previous on page 1 and Next / Last on the last page; never mark the current page with colour alone.',
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'Variant', values: ['compact', 'compact-grouped'] },
    ],
    figmaSets: ['Pagination'],
    props: [
      { name: 'size / variant', type: 'string', description: 'Figma Size and Variant (compact-grouped by default).' },
      { name: 'jumpButtons', type: 'boolean', description: 'Figma JumpButtonsVisible: First and Last.' },
      { name: 'pages / page / onPageChange', type: '(number | "…")[] / number / (page) => void', description: 'Shortcut for the Content slot and the arrows.' },
      { name: 'children', type: 'PaginationLink | PaginationEllipsis', description: 'The Content slot.' },
    ],
    accessibility: 'nav aria-label="pagination". The current page is aria-current="page"; the arrows carry aria-labels and disable at the ends.',
  },
  {
    key: 'PaginationLink',
    label: 'Pagination Link',
    category: 'Navigation',
    description: 'Numbered page link: ghost when inactive, outlined (or filled in a grouped Pagination) when Active.',
    usage: 'Inside a Pagination.',
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] },
      { name: 'Active', values: ['false', 'true'] },
    ],
    figmaSets: ['PaginationLink'],
    props: [
      { name: 'active / disabled / forceState / size', type: 'boolean / State', description: 'Active is aria-current="page"; Size follows the Pagination.' },
    ],
    accessibility: 'A button; the active one is aria-current="page".',
  },
  {
    key: 'PaginationEllipsis',
    label: 'Pagination Ellipsis',
    category: 'Navigation',
    description: 'Non-interactive gap marker between page ranges.',
    usage: 'Between two ranges of PaginationLinks.',
    axes: [{ name: 'Size', values: ['default', 'xs', 'sm', 'lg'] }],
    figmaSets: ['PaginationEllipsis'],
    props: [{ name: 'size', type: 'string', description: 'Figma Size; follows the Pagination.' }],
    accessibility: 'role="presentation" with a screen-reader-only "More pages".',
  },
  {
    key: 'Stepper',
    label: 'Stepper',
    category: 'Navigation',
    description: 'Ordered list of steps: a marker joined to the next by a line, with a title and an optional description. Vertical or horizontal.',
    usage: 'Use for a short, linear flow. One step is active; completed and error markers announce themselves.',
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'Orientation', values: ['vertical', 'horizontal'] },
    ],
    figmaSets: ['Stepper'],
    props: [
      { name: 'size / orientation', type: 'string', description: 'Figma Size and Orientation; they cascade to every item.' },
      { name: 'children', type: 'StepperItem', description: 'The Content slot.' },
      { name: 'steps / current / doneIcon / width', type: 'string[] / number / ReactNode / number | string', description: 'Shortcut for plain steps and the width.' },
    ],
    accessibility: 'An ordered list (give it an accessible name); the active step is aria-current="step" and disabled ones aria-disabled.',
  },
  {
    key: 'StepperItem',
    label: 'Stepper Item',
    category: 'Navigation',
    description: 'One step of a Stepper: marker and connector with a title and an optional description, coloured by status.',
    usage: 'Inside a Stepper.',
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'Status', values: ['active', 'completed', 'error', 'locked'] },
      { name: 'State', values: ['Default', 'Disabled'] },
      { name: 'Orientation', values: ['vertical', 'horizontal'] },
    ],
    figmaSets: ['StepperItem'],
    props: [
      { name: 'status / disabled / size / orientation', type: 'string / boolean', description: 'Figma Status, State and the cascaded Size and Orientation.' },
      { name: 'children / description', type: 'ReactNode', description: 'Figma Title and Description (DescriptionVisible).' },
      { name: 'label / icon / lineVisible', type: 'ReactNode / boolean', description: "The marker's number and glyph; the connector line (the last item hides it)." },
    ],
    accessibility: 'An li; the active step carries aria-current="step", disabled ones aria-disabled.',
  },
  {
    key: 'StepperIndicator',
    label: 'Stepper Indicator',
    category: 'Navigation',
    description: 'Marker column or row of a Stepper step: a StepperIcon and the connector line tinted by status.',
    usage: 'Inside a StepperItem; hide the line on the last step.',
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'Status', values: ['active', 'completed', 'error', 'locked'] },
      { name: 'State', values: ['Default', 'Disabled'] },
      { name: 'Orientation', values: ['vertical', 'horizontal'] },
    ],
    figmaSets: ['StepperIndicator'],
    props: [
      { name: 'status / disabled / size / orientation / lineVisible', type: 'string / boolean', description: 'Figma axes and LineVisible.' },
      { name: 'label / icon', type: 'ReactNode', description: "The marker's number and glyph." },
    ],
    accessibility: 'The line is role="presentation"; status is announced by the marker.',
  },
  {
    key: 'StepperIcon',
    label: 'Stepper Icon',
    category: 'Navigation',
    description: 'Round step marker: the number (or an icon) on active and locked steps, an automatic check or warning on completed and error ones.',
    usage: 'Inside a StepperIndicator.',
    axes: [
      { name: 'Size', values: ['default', 'xs', 'sm', 'lg'] },
      { name: 'Status', values: ['active', 'completed', 'error', 'locked'] },
      { name: 'State', values: ['Default', 'Disabled'] },
    ],
    figmaSets: ['StepperIcon'],
    props: [
      { name: 'status / disabled / size', type: 'string / boolean', description: 'Figma Status, State and Size.' },
      { name: 'label / labelVisible / icon', type: 'ReactNode / boolean', description: 'Figma Label, LabelVisible and Icon.' },
    ],
    accessibility: 'Presentational; completed and error markers carry a screen-reader-only "Completed" / "Error".',
  },
  {
    key: 'DropdownMenu',
    label: 'Dropdown Menu',
    category: 'Navigation',
    description: 'Floating menu of commands opened from a trigger (a Button or IconButton): an optional search header, labelled groups of items and an optional footer.',
    usage: 'Use for 3+ secondary actions behind a "⋯" or button. Destructive items go last, after a separator. Size cascades to every label and item.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
    ],
    figmaSets: ['DropdownMenu'],
    props: [
      { name: 'DropdownMenu', type: 'component', description: 'Radix root: open, onOpenChange.' },
      { name: 'DropdownMenuTrigger asChild', type: 'boolean', description: 'Use your own button as the anchor.' },
      { name: 'size', type: "'default' | 'sm' | 'lg'", description: 'Figma Size: 256 wide, rows 32 · 24 · 40. It cascades to labels, items and the footer.' },
      { name: 'header / footer', type: 'ReactNode', description: 'Figma HeaderVisible (a search Input) and FooterVisible (a DropdownMenuFooter).' },
      { name: 'children', type: 'ReactNode', description: 'The Content slot: DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator.' },
    ],
    accessibility: 'ARIA menu pattern: role="menu" / "menuitem" (menuitemcheckbox when selectable), arrow keys and typeahead, Space / Enter opens, Escape closes and returns focus to the trigger. Keep the footer outside the menu role.',
  },
  {
    key: 'DropdownMenuLabel',
    label: 'Dropdown Menu Label',
    category: 'Navigation',
    description: 'Overline heading for a group of items inside the DropdownMenu.',
    usage: 'Label a group of related items. It is skipped by arrow-key navigation.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
    ],
    figmaSets: ['DropdownMenuLabel'],
    props: [
      { name: 'children', type: 'ReactNode', description: 'Figma Label (the file writes it in capitals by hand).' },
      { name: 'size', type: "'default' | 'sm' | 'lg'", description: 'Follows the menu.' },
    ],
    accessibility: 'Render it as the label of a role group (aria-labelledby) so screen readers announce the group name.',
  },
  {
    key: 'DropdownMenuItem',
    label: 'Dropdown Menu Item',
    category: 'Navigation',
    description: 'A command row: optional leading icon, media, description, shortcut, control, caret and a selection check; destructive for irreversible commands.',
    usage: 'One command per row. Put irreversible commands last as a destructive variant.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Focused', 'Selected', 'Disabled'] },
      { name: 'Variant', values: ['default', 'destructive'] },
    ],
    figmaSets: ['DropdownMenuItem'],
    props: [
      { name: 'children', type: 'ReactNode', description: 'Figma Label.' },
      { name: 'description / trailing / iconLeading / iconTrailing / media / control', type: 'ReactNode', description: 'The optional parts of the row, as the file lists them.' },
      { name: 'checked', type: 'boolean', description: 'Selected: shows the check (a menuitemcheckbox).' },
      { name: 'variant', type: "'default' | 'destructive'", description: 'Figma Variant.' },
    ],
    accessibility: 'role menuitem (menuitemcheckbox when selectable); reachable by arrow keys; skipped when disabled.',
  },
  {
    key: 'DropdownMenuFooter',
    label: 'Dropdown Menu Footer',
    category: 'Navigation',
    description: 'Divided action bar pinned below the menu list: status text and buttons.',
    usage: 'Clear / Apply or a single action. Inline puts the text first and the buttons at the end; stacked gives full-width buttons.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'Layout', values: ['inline', 'stacked'] },
    ],
    figmaSets: ['DropdownMenuFooter'],
    props: [
      { name: 'children', type: 'ReactNode', description: 'The Actions slot.' },
      { name: 'leading / leadingVisible', type: 'ReactNode / boolean', description: 'Status text that fills the row (default visible).' },
    ],
    accessibility: 'Keep it outside role menu; its controls are reachable with Tab after the list.',
  },
  {
    key: 'Menubar',
    label: 'Menubar',
    category: 'Navigation',
    description: 'shadcn/ui Menubar: a persistent bar of menus, as in desktop apps (File · Edit · View).',
    usage: 'Use in app-like tools with many commands grouped by menu. For a few actions behind one button use Dropdown Menu.',
    axes: [],
    figmaSets: ['Menubar'],
    props: [
      { name: 'MenubarMenu / MenubarTrigger / MenubarContent', type: 'component', description: 'One menu.' },
      { name: 'MenubarItem variant', type: '"default" | "destructive"', description: 'A command.' },
      { name: 'MenubarSeparator / MenubarShortcut / MenubarLabel', type: 'component', description: 'Grouping and key hints.' },
      { name: 'MenubarSub / MenubarCheckboxItem / MenubarRadioItem', type: 'component', description: 'Submenus and toggles.' },
    ],
    accessibility: 'Radix Menubar: arrow keys move between menus and items, Esc closes, type-ahead finds items.',
  },
  {
    key: 'NavigationMenu',
    label: 'Navigation Menu',
    category: 'Navigation',
    description: 'shadcn/ui Navigation Menu: site navigation whose triggers open panels of links.',
    usage: "Use for marketing and docs sites with grouped destinations. For an app's main navigation use Sidebar or Navbar.",
    axes: [],
    figmaSets: ['Navigation Menu'],
    props: [
      { name: 'NavigationMenuList / NavigationMenuItem', type: 'component', description: 'The bar.' },
      { name: 'NavigationMenuTrigger / NavigationMenuContent', type: 'component', description: 'A trigger and its panel.' },
      { name: 'NavigationMenuLink', type: 'component', description: 'A destination.' },
      { name: 'viewport', type: 'boolean', description: 'Panels share one animated viewport (default true).' },
    ],
    accessibility: 'Radix NavigationMenu: a nav landmark; triggers expose aria-expanded and arrow keys move between them.',
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
    description: 'App navigation rail: a header (SidebarBrand and a trigger), a scrollable content of SidebarGroups and an optional footer. Collapsed is the 48 px icon rail.',
    usage: 'Use for app-level sections when destinations exceed what a navbar holds. Keep at most one row marked as the current page.',
    axes: [{ name: 'Collapsed', values: ['false', 'true'] }],
    figmaSets: ['Sidebar'],
    props: [
      { name: 'collapsed', type: 'boolean', description: 'Figma Collapsed: the 48 px icon rail. It cascades to every part.' },
      { name: 'SidebarHeader / SidebarContent / SidebarFooter', type: 'component', description: 'The panel\'s regions.' },
      { name: 'SidebarBrand / SidebarTrigger', type: 'component', description: 'The header\'s logo block and the ghost IconButton that folds the rail.' },
      { name: 'SidebarGroup / SidebarGroupLabel / SidebarMenu', type: 'component', description: 'A labelled group of rows.' },
    ],
    accessibility: 'Rendered as an aside landmark with an aria-label; the trigger carries aria-expanded and aria-controls; collapsed rows keep an accessible name and want a Tooltip with their label.',
  },
  {
    key: 'SidebarMenuButton',
    label: 'Sidebar Menu Button',
    category: 'Navigation',
    description: 'A navigation row of the Sidebar: leading icon, label, trailing count, trend Badge and trailing icon. Current marks the page you are on.',
    usage: 'One row per destination. Collapsed comes from the Sidebar, not from the row.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'State', values: ['Default', 'Hover', 'Focused', 'Current', 'Disabled'] },
      { name: 'Collapsed', values: ['false', 'true'] },
    ],
    figmaSets: ['SidebarMenuButton'],
    props: [
      { name: 'children', type: 'ReactNode', description: 'Figma Label.' },
      { name: 'icon / trailing / iconTrailing', type: 'ReactNode', description: 'Figma IconLeadingIcon, Trailing, IconTrailingIcon.' },
      { name: 'trend / trendLabel', type: '"up" | "down" / ReactNode', description: 'Figma TrendVisible: an exposed Badge, success for up, critical for down.' },
      { name: 'state', type: 'SidebarMenuButtonState', description: 'Pins a state (docs). `isActive` is the older name of `state="Current"`.' },
    ],
    accessibility: 'A button, or a link with asChild; aria-current="page" on the current row; keep it Tab-reachable; a collapsed row keeps its label for assistive tech.',
  },
  {
    key: 'SidebarGroup',
    label: 'Sidebar Group',
    category: 'Navigation',
    description: 'A labelled section of the Sidebar: a SidebarGroupLabel and a SidebarMenu. Size cascades to every row.',
    usage: 'Group related destinations under one label.',
    axes: [
      { name: 'Size', values: ['default', 'sm', 'lg'] },
      { name: 'Collapsed', values: ['false', 'true'] },
    ],
    figmaSets: ['SidebarGroup'],
    props: [
      { name: 'size', type: '"default" | "sm" | "lg"', description: 'Figma Size: cascades to its SidebarMenu and every SidebarMenuButton.' },
    ],
    accessibility: 'role group with aria-labelledby pointing at its label.',
  },
  {
    key: 'SidebarGroupLabel',
    label: 'Sidebar Group Label',
    category: 'Navigation',
    description: 'The heading of a group of SidebarMenuButtons; hidden while the Sidebar is collapsed. A twin of DropdownMenuLabel.',
    usage: 'Name the group in one or two words.',
    axes: [{ name: 'Size', values: ['default', 'sm', 'lg'] }],
    figmaSets: ['SidebarGroupLabel'],
    props: [{ name: 'children', type: 'ReactNode', description: 'Figma Label.' }],
    accessibility: 'It is the label of the group (aria-labelledby).',
  },
  {
    key: 'SidebarBrand',
    label: 'Sidebar Brand',
    category: 'Navigation',
    description: 'The brand block at the top of the Sidebar: a logo with a title and an optional subtitle; collapses to the logo only.',
    usage: 'Wrap it in a link to the home route.',
    axes: [{ name: 'Collapsed', values: ['false', 'true'] }],
    figmaSets: ['SidebarBrand'],
    props: [
      { name: 'logo', type: 'ReactNode', description: 'Figma Logo (the slot): an Avatar or the product mark.' },
      { name: 'title / subtitle', type: 'ReactNode', description: 'Figma Title, Subtitle (omit the subtitle to hide it).' },
    ],
    accessibility: 'The link around it needs an accessible name equal to the title.',
  },
]

// Mirrors the plugin's "❖ Category" divider pages, in the same order.
export const CATEGORIES = ['Button & Actions', 'Form Controls', 'Indicators', 'Content & Surfaces', 'Feedback', 'Navigation']

// ── Figma import scope ───────────────────────────────────────────────────────
// `figmaSets` above names the component set(s) a key maps to in the plugin's
// full CATALOG (../escala-figma-plugin/src/code.ts) — the variant matrix the
// plugin CAN build. The default live import builds a FIXED 9-component sample
// sheet ('⬡ Components Overview'), each of the nine with every variant — the
// same set the Full catalogue builds for it. The explicit Full catalogue option
// builds every component type, using representative source variants that cover
// each axis value instead of materializing the 1,403-combination cartesian product.
//
// Every one still ships as a full spec — props, variant axes,
// tokens, accessibility notes — into `tokens.json` (`atoms`) and the agent
// bundle. Only the keys below additionally land as real component nodes in a
// Figma file in the DEFAULT mode. Don't infer this from `figmaSets.length` —
// that field describes full-catalogue capability.
//
// Keep this list in lockstep with the plugin's `SAMPLE_SETS` array in code.ts.
export const FIGMA_SAMPLE_KEYS: readonly string[] = [
  'Button', 'Input', 'Select', 'Checkbox', 'Switch', 'Badge', 'StatusBadge', 'Toast', 'Avatar',
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
  'Button', 'IconButton',
  'Input', 'Select', 'Checkbox', 'Switch',
  'Badge',
  'Card', 'Avatar', 'Modal', 'TooltipContent', 'Separator',
  'Toast',
  'Tabs',
] as const

/** The components a system SELECTED (`atoms` / `selectedComponents`), known to
 *  the catalogue; none selected = the essentials. Documentation (Design skills,
 *  templates, contracts) covers the WHOLE catalogue and uses this only to mark
 *  "in this system": shipping 13 of 73 left people asking where the rest were. */
export function selectedComponentKeys(atoms: readonly string[] | undefined): string[] {
  const known = new Set(COMPONENT_KEYS)
  const picked = (atoms ?? []).filter((k) => known.has(k))
  return picked.length ? picked : [...ESSENTIAL_COMPONENT_KEYS]
}
