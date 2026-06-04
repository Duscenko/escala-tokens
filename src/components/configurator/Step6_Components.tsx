import { useState, type ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import ButtonDoc, { type RichDocProps } from './docs/ButtonDoc'
import type { PreviewTokens } from '../preview/ButtonPreview'

// ─── Component catalogue ─────────────────────────────────────────────────────

interface ComponentDef {
  key: string
  label: string
  category: string
  description: string
  usage: string
  variants: string[]
  props: { name: string; type: string; description: string }[]
  accessibility: string
}

const COMPONENTS: ComponentDef[] = [
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

const CATEGORIES = ['Action', 'Form', 'Display', 'Layout', 'Overlay', 'Navigation', 'Feedback']

// ─── Rich-doc registry ───────────────────────────────────────────────────────
// A component is "enriched" when it has a Storybook-style doc here. The right
// panel routes to it; everything else falls back to the simple DocPanel below.
// To enrich component X: create docs/XDoc.tsx and add `X: XDoc`.
const RICH_DOCS: Record<string, ComponentType<RichDocProps>> = {
  Button: ButtonDoc,
}

// ─── Doc panel ───────────────────────────────────────────────────────────────

function DocPanel({ component, tokens }: { component: ComponentDef; tokens: Record<string, string> }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'props' | 'a11y'>('overview')
  const primary = tokens.primary || '#7f56d9'

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-4"
    >
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-neutral-800">
        {(['overview', 'props', 'a11y'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-2 text-xs font-medium transition-all border-b-2 -mb-px capitalize ${
              activeTab === t
                ? 'text-white border-violet-500'
                : 'text-neutral-500 border-transparent hover:text-neutral-300'
            }`}
          >
            {t === 'a11y' ? 'Accessibility' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-300 leading-relaxed">{component.description}</p>
          <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-3">
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">When to use</p>
            <p className="text-xs text-neutral-400 leading-relaxed">{component.usage}</p>
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">Variants</p>
            <div className="flex flex-wrap gap-1.5">
              {component.variants.map((v) => (
                <span
                  key={v}
                  className="text-xs px-2 py-0.5 rounded-full border border-neutral-800 text-neutral-400"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Props */}
      {activeTab === 'props' && (
        <div className="flex flex-col gap-0 divide-y divide-neutral-800/60">
          {component.props.map((prop) => (
            <div key={prop.name} className="py-2.5 flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <code className="text-xs text-violet-400 font-mono">{prop.name}</code>
                <code className="text-[10px] text-neutral-600 font-mono truncate max-w-[180px]">
                  {prop.type}
                </code>
              </div>
              <p className="text-xs text-neutral-500">{prop.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Accessibility */}
      {activeTab === 'a11y' && (
        <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-3">
          <p className="text-xs text-neutral-300 leading-relaxed">{component.accessibility}</p>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function Step6_Components() {
  const {
    selectedComponents,
    toggleComponent,
    setSelectedComponents,
    semanticTokens,
    primaryColor,
    errorColor,
    grayLightScale,
    radius,
    spacing,
    typography,
  } = useDesignStore()
  const [activeComponent, setActiveComponent] = useState<ComponentDef | null>(null)

  const tokens = {
    primary: semanticTokens['text-brand-primary'] || primaryColor || '#7f56d9',
    surface: semanticTokens['bg-primary'] || '#ffffff',
    text: semanticTokens['text-primary'] || '#101828',
    border: semanticTokens['border-primary'] || '#d0d5dd',
  }

  // Resolved tokens for the live previews — fallbacks cover empty semantic tokens.
  const previewTokens: PreviewTokens = {
    surface: semanticTokens['bg-primary'] || '#ffffff',
    brandSolid: semanticTokens['bg-brand-solid'] || primaryColor || '#7f56d9',
    brandText: semanticTokens['text-brand-primary'] || primaryColor || '#7f56d9',
    onBrand: semanticTokens['text-white'] || '#ffffff',
    neutralFill: semanticTokens['bg-secondary'] || grayLightScale[3] || '#f5f5f5',
    neutralText: semanticTokens['text-primary'] || grayLightScale[11] || '#101828',
    errorColor: errorColor || '#f04438',
    disabledBg: semanticTokens['bg-disabled'] || grayLightScale[3] || '#f5f5f5',
    disabledText: semanticTokens['text-disabled'] || grayLightScale[6] || '#a4a7ae',
    radius,
    spacing,
    typography,
  }

  const ActiveRichDoc = activeComponent ? RICH_DOCS[activeComponent.key] : undefined

  function selectAll() {
    setSelectedComponents(COMPONENTS.map((c) => c.key))
  }
  function clearAll() {
    setSelectedComponents([])
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {selectedComponents.length === 0
            ? 'Select the components your system needs.'
            : `${selectedComponents.length} component${selectedComponents.length > 1 ? 's' : ''} selected`}
        </p>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs px-2.5 py-1 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition border border-neutral-700"
          >
            All
          </button>
          <button
            onClick={clearAll}
            className="text-xs px-2.5 py-1 rounded bg-neutral-900 text-neutral-500 hover:text-neutral-300 transition border border-neutral-800"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Two-column layout: list + doc panel */}
      <div className="flex gap-4">
        {/* Left: component list */}
        <div className="flex flex-col gap-4 w-56 flex-shrink-0">
          {CATEGORIES.map((cat) => {
            const catComponents = COMPONENTS.filter((c) => c.category === cat)
            if (!catComponents.length) return null
            return (
              <div key={cat} className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-600 uppercase tracking-widest px-1">
                  {cat}
                </span>
                {catComponents.map((comp) => {
                  const isSelected = selectedComponents.includes(comp.key)
                  const isActive = activeComponent?.key === comp.key
                  return (
                    <button
                      key={comp.key}
                      onClick={() => setActiveComponent(activeComponent?.key === comp.key ? null : comp)}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-sm transition-all ${
                        isActive
                          ? 'bg-neutral-800 text-white'
                          : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                      }`}
                    >
                      <span>{comp.label}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleComponent(comp.key)
                        }}
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? 'bg-violet-600' : 'bg-neutral-800 border border-neutral-700'
                        }`}
                        aria-label={isSelected ? `Remove ${comp.label}` : `Add ${comp.label}`}
                      >
                        {isSelected && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Right: doc panel */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeComponent ? (
              ActiveRichDoc ? (
                <motion.div
                  key={activeComponent.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ActiveRichDoc
                    tokens={previewTokens}
                    selected={selectedComponents.includes(activeComponent.key)}
                    onToggle={() => toggleComponent(activeComponent.key)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={activeComponent.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-xl bg-neutral-900 border border-neutral-800 p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">{activeComponent.label}</h3>
                      <span className="text-[11px] text-neutral-600">{activeComponent.category}</span>
                    </div>
                    <button
                      onClick={() => toggleComponent(activeComponent.key)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                        selectedComponents.includes(activeComponent.key)
                          ? 'bg-violet-600 text-white'
                          : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-neutral-500'
                      }`}
                    >
                      {selectedComponents.includes(activeComponent.key) ? '✓ Selected' : 'Add'}
                    </button>
                  </div>
                  <DocPanel component={activeComponent} tokens={tokens} />
                </motion.div>
              )
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center rounded-xl border border-dashed border-neutral-800 p-8"
              >
                <p className="text-sm text-neutral-600 text-center">
                  Click a component to see its documentation, variants, props and accessibility notes.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Selected summary */}
      <AnimatePresence>
        {selectedComponents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg bg-neutral-900 border border-neutral-800 p-4"
          >
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
              {selectedComponents.length} component{selectedComponents.length > 1 ? 's' : ''} in your system
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedComponents.map((k) => (
                <span key={k} className="text-xs px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 font-medium">
                  {k}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
