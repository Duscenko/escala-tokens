import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../../lib/utils'
import {
  ButtonPreview,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  resolvePx,
  type ButtonLabelType,
  type ButtonSize,
  type ButtonVariant,
  type ButtonVisualState,
  type PreviewTokens,
} from '../../preview/ButtonPreview'

export interface RichDocProps {
  tokens: PreviewTokens
  selected: boolean
  onToggle: () => void
}

// ─── Static content ───────────────────────────────────────────────────────────

const TAGLINE = 'Triggers an action or event — the primary way users act on a screen.'

const WHEN_TO_USE = [
  'Submitting a form or confirming a choice.',
  'The main call-to-action on a page or card.',
  'Inline triggers inside toolbars, rows or dialogs.',
]
const WHEN_NOT_TO_USE = [
  'Navigating between pages — use a Link instead.',
  'Toggling a setting on/off — use a Toggle.',
  'Many low-priority actions — collapse them into a menu.',
]

const STATES: { key: ButtonVisualState | 'disabled' | 'loading'; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'hover', label: 'Hover' },
  { key: 'pressed', label: 'Pressed' },
  { key: 'focused', label: 'Focused' },
  { key: 'disabled', label: 'Disabled' },
  { key: 'loading', label: 'Loading' },
]

const ANATOMY = [
  { dot: '#3b82f6', part: 'Container', desc: 'Capsule surface — fill comes from the chosen variant + radius.full.' },
  { dot: '#22c55e', part: 'Label', desc: 'Verb-led text in the semibold weight; colour follows the variant.' },
  { dot: '#eab308', part: 'Leading / trailing icon', desc: 'Optional symbol; sized per the button size and tinted to match the label.' },
  { dot: '#a855f7', part: 'Focus ring', desc: '2px ring offset from the surface, shown on keyboard focus.' },
]

const PROPS: { name: string; type: string; desc: string }[] = [
  { name: 'variant', type: `'primary' | 'secondary' | 'tinted' | 'plain'`, desc: 'Visual emphasis of the button.' },
  { name: 'size', type: `'sm' | 'md' | 'lg'`, desc: 'Height, padding and type scale.' },
  { name: 'label', type: 'string', desc: 'Text content. Omit when labelType is "icon".' },
  { name: 'labelType', type: `'icon' | 'text' | 'icon-text'`, desc: 'Show a symbol, text, or both.' },
  { name: 'leadingIcon', type: 'ReactNode', desc: 'Icon rendered before the label.' },
  { name: 'trailingIcon', type: 'ReactNode', desc: 'Icon rendered after the label.' },
  { name: 'destructive', type: 'boolean', desc: 'Swaps the accent for the error colour for dangerous actions.' },
  { name: 'disabled', type: 'boolean', desc: 'Blocks interaction; muted styles + aria-disabled.' },
  { name: 'loading', type: 'boolean', desc: 'Shows a spinner, hides the label and sets aria-busy.' },
  { name: 'fullWidth', type: 'boolean', desc: 'Stretches the button to fill its container.' },
  { name: 'type', type: `'button' | 'submit' | 'reset'`, desc: 'Native button type. Defaults to "button".' },
  { name: 'onClick', type: '(e) => void', desc: 'Click handler.' },
]

const A11Y = [
  'Renders a native <button> — focusable and operable with Enter and Space.',
  'Icon-only buttons need an accessible name via aria-label (set automatically here).',
  'Focus shows a visible 2px ring offset from the surface — never remove it without a replacement.',
  'While loading, the button sets aria-busy and preserves its width to avoid layout shift.',
  'Keep a touch target of at least 44×44px — the Large size satisfies this.',
  'Never rely on colour alone — a destructive action should read as destructive from its label.',
]

const DO = [
  'Use one Primary per view or section.',
  'Lead labels with a verb: “Save changes”, “Delete”.',
  'Reserve Destructive for irreversible actions.',
]
const DONT = [
  'Don’t stack several Primaries that compete.',
  'Don’t use a Button for navigation — use a link.',
  'Don’t bury critical actions in Plain style.',
]

const TOKENS_USED = [
  'action-primary',
  'text-on-brand',
  'surface-1',
  'text-primary',
  'text-brand',
  'errorColor',
  'radius.full',
  'spacing.3 / 4 / 6',
  'typography.fontFamily',
  'typography.sizes',
  'typography.weights.semibold',
]

// ─── Layout primitives ─────────────────────────────────────────────────────────

function Section({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-fg-faint">{kicker}</p>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function Stage({
  surface,
  children,
  className,
}: {
  surface: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('flex items-center justify-center rounded-xl border border-line p-8', className)}
      style={{ background: surface }}
    >
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-lg bg-elevated/50 p-0.5 border border-line">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-2.5 py-1 text-xs rounded-md transition-all whitespace-nowrap',
            value === o.value ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'px-2.5 py-1 text-xs rounded-md border transition-all',
        active
          ? 'bg-[#0088FF]/15 border-[#0088FF]/40 text-[#8FC8FF]'
          : 'bg-surface border-line text-fg-muted hover:text-fg',
      )}
    >
      {label}
    </button>
  )
}

function ControlRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-fg-faint">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function ButtonDoc({ tokens, selected, onToggle }: RichDocProps) {
  const [variant, setVariant] = useState<ButtonVariant>('primary')
  const [size, setSize] = useState<ButtonSize>('lg')
  const [labelType, setLabelType] = useState<ButtonLabelType>('icon-text')
  const [destructive, setDestructive] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [loading, setLoading] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-fg">Button</h2>
            <span className="text-[10px] uppercase tracking-widest text-fg-faint mt-1">Action</span>
          </div>
          <p className="text-sm text-fg-muted mt-1 max-w-md leading-relaxed">{TAGLINE}</p>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            'text-xs px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 whitespace-nowrap',
            selected
              ? 'bg-[#0088FF] text-white'
              : 'bg-elevated text-fg-muted border border-line-strong hover:border-line-strong',
          )}
        >
          {selected ? '✓ Added to system' : 'Add to system'}
        </button>
      </div>

      {/* Playground */}
      <Section kicker="Try it" title="Playground">
        <div className="flex flex-col gap-4">
          <Stage surface={tokens.surface} className="min-h-[200px]">
            <ButtonPreview
              variant={variant}
              size={size}
              labelType={labelType}
              destructive={destructive}
              disabled={disabled}
              loading={loading}
              label="Play"
              tokens={tokens}
            />
          </Stage>
          <div className="rounded-xl border border-line bg-surface/40 p-4 flex flex-wrap gap-x-8 gap-y-4">
            <ControlRow label="Style">
              <Segmented
                value={variant}
                onChange={setVariant}
                options={BUTTON_VARIANTS.map((v) => ({ value: v.key, label: v.label }))}
              />
            </ControlRow>
            <ControlRow label="Size">
              <Segmented
                value={size}
                onChange={setSize}
                options={BUTTON_SIZES.map((s) => ({ value: s.key, label: s.label }))}
              />
            </ControlRow>
            <ControlRow label="Label">
              <Segmented
                value={labelType}
                onChange={setLabelType}
                options={[
                  { value: 'text', label: 'Text' },
                  { value: 'icon', label: 'Icon' },
                  { value: 'icon-text', label: 'Both' },
                ]}
              />
            </ControlRow>
            <ControlRow label="State">
              <TogglePill label="Destructive" active={destructive} onClick={() => setDestructive((v) => !v)} />
              <TogglePill label="Disabled" active={disabled} onClick={() => setDisabled((v) => !v)} />
              <TogglePill label="Loading" active={loading} onClick={() => setLoading((v) => !v)} />
            </ControlRow>
          </div>
        </div>
      </Section>

      {/* Variants */}
      <Section kicker="Styles" title="Variants">
        <div className="grid grid-cols-2 gap-3">
          {BUTTON_VARIANTS.map((v) => (
            <div key={v.key} className="flex flex-col gap-2">
              <Stage surface={tokens.surface} className="p-6">
                <ButtonPreview variant={v.key} size="md" labelType="icon-text" label="Play" tokens={tokens} />
              </Stage>
              <div>
                <p className="text-xs font-medium text-fg-muted">{v.label}</p>
                <p className="text-[11px] text-fg-faint leading-snug">{v.when}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Sizes */}
      <Section kicker="Scale" title="Sizes">
        <Stage surface={tokens.surface} className="gap-4">
          {BUTTON_SIZES.map((s) => (
            <ButtonPreview key={s.key} variant="primary" size={s.key} labelType="text" label="Play" tokens={tokens} />
          ))}
        </Stage>
        <div className="rounded-xl border border-line overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface/60 text-fg-faint">
              <tr>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 font-medium">Height</th>
                <th className="px-3 py-2 font-medium">Padding X</th>
                <th className="px-3 py-2 font-medium">Font</th>
                <th className="px-3 py-2 font-medium">Icon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {BUTTON_SIZES.map((s) => (
                <tr key={s.key} className="text-fg-muted">
                  <td className="px-3 py-2">{s.label}</td>
                  <td className="px-3 py-2 font-mono text-fg-muted">{s.height}px</td>
                  <td className="px-3 py-2 font-mono text-fg-muted">
                    {resolvePx(tokens.spacing, s.paddingKey, s.padPx)}px
                  </td>
                  <td className="px-3 py-2 font-mono text-fg-muted">
                    {resolvePx(tokens.typography?.sizes, s.fontKey, s.fontPx)}px
                  </td>
                  <td className="px-3 py-2 font-mono text-fg-muted">{s.icon}px</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* States */}
      <Section kicker="Interaction" title="States">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {STATES.map((st) => (
            <div key={st.key} className="flex flex-col items-center gap-2">
              <Stage surface={tokens.surface} className="w-full p-4">
                <ButtonPreview
                  variant="primary"
                  size="md"
                  labelType="text"
                  label="Play"
                  tokens={tokens}
                  disabled={st.key === 'disabled'}
                  loading={st.key === 'loading'}
                  forceState={
                    st.key === 'hover' || st.key === 'pressed' || st.key === 'focused' ? st.key : undefined
                  }
                />
              </Stage>
              <span className="text-[11px] text-fg-faint">{st.label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Anatomy */}
      <Section kicker="Structure" title="Anatomy">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Stage surface={tokens.surface} className="sm:w-64 shrink-0">
            <ButtonPreview variant="primary" size="lg" labelType="icon-text" label="Play" tokens={tokens} forceState="focused" />
          </Stage>
          <ul className="flex flex-col gap-2.5 flex-1">
            {ANATOMY.map((a) => (
              <li key={a.part} className="flex items-start gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: a.dot }} />
                <div>
                  <p className="text-xs font-medium text-fg-muted">{a.part}</p>
                  <p className="text-[11px] text-fg-faint leading-snug">{a.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* Props */}
      <Section kicker="API" title="Props">
        <div className="flex flex-col divide-y divide-line/60">
          {PROPS.map((p) => (
            <div key={p.name} className="py-2.5 flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs text-[#5AADFF] font-mono">{p.name}</code>
                <code className="text-[10px] text-fg-faint font-mono">{p.type}</code>
              </div>
              <p className="text-xs text-fg-faint">{p.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Accessibility */}
      <Section kicker="Inclusive" title="Accessibility">
        <ul className="rounded-xl bg-surface/50 border border-line p-4 flex flex-col gap-2">
          {A11Y.map((a) => (
            <li key={a} className="text-xs text-fg-muted leading-relaxed flex gap-2">
              <span className="text-[#5AADFF] shrink-0">•</span>
              {a}
            </li>
          ))}
        </ul>
      </Section>

      {/* Do / Don't */}
      <Section kicker="Guidance" title="Do & Don’t">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-green-900/40 bg-green-950/20 p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
              <span>✓</span> Do
            </p>
            <Stage surface={tokens.surface} className="gap-2 p-5">
              <ButtonPreview variant="primary" size="md" labelType="text" label="Save" tokens={tokens} />
              <ButtonPreview variant="plain" size="md" labelType="text" label="Cancel" tokens={tokens} />
            </Stage>
            <ul className="flex flex-col gap-1.5">
              {DO.map((d) => (
                <li key={d} className="text-[11px] text-fg-muted leading-snug">
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
              <span>✕</span> Don’t
            </p>
            <Stage surface={tokens.surface} className="gap-2 p-5">
              <ButtonPreview variant="primary" size="md" labelType="text" label="Save" tokens={tokens} />
              <ButtonPreview variant="primary" size="md" labelType="text" label="Cancel" tokens={tokens} />
            </Stage>
            <ul className="flex flex-col gap-1.5">
              {DONT.map((d) => (
                <li key={d} className="text-[11px] text-fg-muted leading-snug">
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* When to use */}
      <Section kicker="Usage" title="When to use">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-surface/40 p-4">
            <p className="text-[11px] uppercase tracking-wider text-fg-faint mb-2">Use it for</p>
            <ul className="flex flex-col gap-1.5">
              {WHEN_TO_USE.map((w) => (
                <li key={w} className="text-xs text-fg-muted leading-snug">
                  {w}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-surface/40 p-4">
            <p className="text-[11px] uppercase tracking-wider text-fg-faint mb-2">Reach for something else</p>
            <ul className="flex flex-col gap-1.5">
              {WHEN_NOT_TO_USE.map((w) => (
                <li key={w} className="text-xs text-fg-muted leading-snug">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Tokens used */}
      <Section kicker="Theming" title="Tokens used">
        <div className="flex flex-wrap gap-1.5">
          {TOKENS_USED.map((t) => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded bg-elevated/80 text-fg-muted font-mono">
              {t}
            </span>
          ))}
        </div>
      </Section>
    </motion.div>
  )
}
