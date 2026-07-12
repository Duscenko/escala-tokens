import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import type { ComponentDef, VariantAxis } from '../../lib/componentCatalogue'
import { usePreviewTokens } from '../../lib/previewTokens'
import { getIconLibrary } from '../../lib/iconLibraries'
import { withAlpha } from '../../lib/colorUtils'
import type { PreviewTokens } from '../preview/ButtonPreview'
import { SPECIMENS, snippetFor, ICON_SLOTS, PANEL_COMPONENTS, type AxisValues } from './docs/specimens'

// ─── Small controls ───────────────────────────────────────────────────────────

function AxisControl({ axis, value, onChange }: { axis: VariantAxis; value: string; onChange: (v: string) => void }) {
  // Boolean-shaped axes (True/False) read better as a switch-like pill pair.
  const isBool = axis.values.length === 2 && axis.values.includes('True') && axis.values.includes('False')
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-line/50 last:border-b-0">
      <span className="text-xs text-fg-muted">{axis.name}</span>
      {isBool ? (
        <button
          role="switch"
          aria-checked={value === 'True'}
          aria-label={axis.name}
          onClick={() => onChange(value === 'True' ? 'False' : 'True')}
          className={`relative w-9 h-5 rounded-full transition-colors ${value === 'True' ? 'bg-fg' : 'bg-line-strong'}`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-app shadow transition-all ${value === 'True' ? 'left-[18px]' : 'left-0.5'}`}
          />
        </button>
      ) : (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={axis.name}
            className="appearance-none text-xs font-medium text-fg bg-surface border border-line rounded-lg pl-2.5 pr-7 py-1.5 outline-none focus:border-line-strong cursor-pointer"
          >
            {axis.values.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-fg-faint"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      )}
    </div>
  )
}

// A boolean option toggle (icon slots) — matches AxisControl's switch styling.
function OptionSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-line/50 last:border-b-0">
      <span className="text-xs text-fg-muted">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-fg' : 'bg-line-strong'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-app shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

// ─── Playground (canvas + controls + snippet) ─────────────────────────────────

function Playground({ component, tokens }: { component: ComponentDef; tokens: PreviewTokens }) {
  // First value of each axis = the plugin's default variant.
  const [values, setValues] = useState<AxisValues>(() =>
    Object.fromEntries(component.axes.map((a) => [a.name, a.values[0]])),
  )
  const [leadingIcon, setLeadingIcon] = useState(false)
  const [trailingIcon, setTrailingIcon] = useState(false)
  const [copied, setCopied] = useState(false)

  // Icon slots (Button/Input) render live glyphs from the Foundations library.
  const iconLibrary = useDesignStore((s) => s.iconLibrary)
  const slots = ICON_SLOTS[component.key]
  const lib = getIconLibrary(iconLibrary)
  const icons = slots
    ? { prefix: lib?.iconifyPrefix ?? iconLibrary, leading: leadingIcon, trailing: trailingIcon }
    : undefined

  const Specimen = SPECIMENS[component.key]
  const snippet = snippetFor(component, values, icons)
  const variantCount = component.axes.reduce((n, a) => n * a.values.length, 1)
  const hasControls = component.axes.length > 0 || Boolean(slots)

  // A colored blob backdrop so the translucent panel treatment (blur + alpha)
  // has something behind it to visibly soften — a flat canvas can't show it.
  // `backgroundColor`/`backgroundImage` (not the `background` shorthand) so
  // toggling the pattern on/off never mixes shorthand and longhand styles.
  const showPattern = tokens.panelBackground === 'translucent' && PANEL_COMPONENTS.has(component.key)
  const canvasStyle = {
    backgroundColor: tokens.surface,
    backgroundImage: showPattern
      ? [
          `radial-gradient(circle at 15% 20%, ${withAlpha(tokens.brandSolid, 0.55)}, transparent 42%)`,
          `radial-gradient(circle at 85% 15%, ${withAlpha(tokens.successColor ?? '#17b26a', 0.5)}, transparent 40%)`,
          `radial-gradient(circle at 75% 85%, ${withAlpha(tokens.warningColor ?? '#f79009', 0.45)}, transparent 45%)`,
          `radial-gradient(circle at 20% 85%, ${withAlpha(tokens.infoColor ?? '#2e90fa', 0.4)}, transparent 40%)`,
        ].join(', ')
      : 'none',
  }

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Canvas + snippet */}
      <div className="flex-1 min-w-0 flex flex-col gap-0">
        <div
          className="min-h-[300px] rounded-t-xl border border-line flex items-center justify-center p-10 relative overflow-hidden"
          style={canvasStyle}
        >
          {Specimen ? (
            <Specimen t={tokens} v={values} icons={icons} />
          ) : (
            <span className="text-xs text-fg-faint">No live preview for this component yet.</span>
          )}
          {variantCount > 1 && (
            <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-elevated/80 text-fg-faint border border-line">
              1 of {variantCount} variants
            </span>
          )}
        </div>

        {/* Code snippet bar */}
        <div className="rounded-b-xl border border-t-0 border-line bg-surface/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-line/60">
            <span className="text-[11px] font-mono text-fg-faint">{component.key.toLowerCase()}.tsx</span>
            <button
              onClick={copySnippet}
              className="flex items-center gap-1.5 text-[11px] text-fg-muted hover:text-fg transition-colors"
            >
              {copied ? (
                <><span className="text-emerald-500">✓</span> Copied</>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden><rect x="1" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M3 3V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H8" stroke="currentColor" strokeWidth="1.2" /></svg>
                  Copy snippet
                </>
              )}
            </button>
          </div>
          <pre className="px-4 py-3 text-[11px] font-mono leading-relaxed text-fg-muted overflow-x-auto whitespace-pre">{snippet}</pre>
        </div>
      </div>

      {/* Controls rail */}
      {hasControls && (
        <div className="lg:w-60 flex-shrink-0">
          <div className="rounded-xl border border-line bg-surface/40 px-4 py-2">
            {component.axes.map((axis) => (
              <AxisControl
                key={axis.name}
                axis={axis}
                value={values[axis.name]}
                onChange={(v) => setValues((prev) => ({ ...prev, [axis.name]: v }))}
              />
            ))}
            {slots && (
              <>
                {component.axes.length > 0 && <div className="border-t border-line/70 my-1" />}
                <OptionSwitch label="Leading icon" checked={leadingIcon} onChange={setLeadingIcon} />
                <OptionSwitch label="Trailing icon" checked={trailingIcon} onChange={setTrailingIcon} />
              </>
            )}
          </div>
          {slots ? (
            <p className="text-[10px] text-fg-faint leading-relaxed px-1 pt-2">
              Icons come live from your Foundations set — <span className="font-medium text-fg-muted">{lib?.label ?? iconLibrary}</span>. Switch the library and these update.
            </p>
          ) : (
            <p className="text-[10px] text-fg-faint leading-relaxed px-1 pt-2">
              Same axes as the Figma variant set the plugin generates.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sections below the playground ───────────────────────────────────────────

function PropTable({ component }: { component: ComponentDef }) {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[1fr_auto] gap-4 pb-2 border-b border-line text-[10px] uppercase tracking-wider text-fg-faint">
        <span>Prop</span>
        <span>Type</span>
      </div>
      <div className="divide-y divide-line/60">
        {component.props.map((prop) => (
          <div key={prop.name} className="py-2.5 grid grid-cols-[1fr_auto] gap-4 items-start">
            <div className="flex flex-col gap-0.5 min-w-0">
              <code className="text-xs text-[#5AADFF] font-mono">{prop.name}</code>
              <p className="text-xs text-fg-faint leading-snug">{prop.description}</p>
            </div>
            <code className="text-[10px] text-fg-faint font-mono text-right max-w-[220px] truncate" title={prop.type}>{prop.type}</code>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FigmaShipList({ component }: { component: ComponentDef }) {
  const variantCount = component.axes.reduce((n, a) => n * a.values.length, 1)
  // Catalogue-first components — documented + exported, but their component set
  // hasn't landed in the Figma plugin's CATALOG yet.
  if (component.figmaSets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/40 p-4 flex items-center gap-2.5">
        <svg width="10" height="14" viewBox="0 0 38 57" fill="currentColor" className="text-fg-faint flex-shrink-0" aria-hidden>
          <path d="M9.5 57C14.7467 57 19 52.7467 19 47.5V38H9.5C4.25329 38 0 42.2533 0 47.5C0 52.7467 4.25329 57 9.5 57Z" />
          <path d="M0 28.5C0 23.2533 4.25329 19 9.5 19H19V38H9.5C4.25329 38 0 33.7467 0 28.5Z" />
          <path d="M0 9.5C0 4.25329 4.25329 0 9.5 0H19V19H9.5C4.25329 19 0 14.7467 0 9.5Z" />
          <path d="M19 0H28.5C33.7467 0 38 4.25329 38 9.5C38 14.7467 33.7467 19 28.5 19H19V0Z" />
          <path d="M38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5Z" />
        </svg>
        <p className="text-[11px] text-fg-faint leading-relaxed">
          Not in the Figma library yet — it exports in <code className="font-mono">tokens.json</code> and documents here; its Figma component set is on the plugin roadmap.
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-line bg-surface/40 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <svg width="10" height="14" viewBox="0 0 38 57" fill="currentColor" className="text-fg-muted" aria-hidden>
          <path d="M9.5 57C14.7467 57 19 52.7467 19 47.5V38H9.5C4.25329 38 0 42.2533 0 47.5C0 52.7467 4.25329 57 9.5 57Z" />
          <path d="M0 28.5C0 23.2533 4.25329 19 9.5 19H19V38H9.5C4.25329 38 0 33.7467 0 28.5Z" />
          <path d="M0 9.5C0 4.25329 4.25329 0 9.5 0H19V19H9.5C4.25329 19 0 14.7467 0 9.5Z" />
          <path d="M19 0H28.5C33.7467 0 38 4.25329 38 9.5C38 14.7467 33.7467 19 28.5 19H19V0Z" />
          <path d="M38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5Z" />
        </svg>
        <p className="text-xs font-semibold text-fg">Ships in Figma</p>
        <span className="text-[10px] text-fg-faint ml-auto">
          {component.figmaSets.length} {component.figmaSets.length === 1 ? 'set' : 'sets'}
          {variantCount > 1 && ` · ${variantCount} variants`}
        </span>
      </div>
      <p className="text-[11px] text-fg-faint leading-relaxed">
        Including this component, the sync plugin generates {component.figmaSets.length === 1 ? 'this component set' : 'this family of component sets'} — every fill, stroke and radius bound to your variables (component → semantic → primitive):
      </p>
      <div className="flex flex-wrap gap-1.5">
        {component.figmaSets.map((s) => (
          <span key={s} className="text-[11px] px-2 py-0.5 rounded-md bg-elevated/80 text-fg-muted border border-line">
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ComponentDocPane({ component, previewTheme = 'light' }: { component: ComponentDef | null; previewTheme?: string }) {
  const { selectedComponents, toggleComponent } = useDesignStore()
  const tokens = usePreviewTokens(previewTheme)

  if (!component) {
    return (
      <div className="h-full flex items-center justify-center rounded-2xl border border-dashed border-line p-8">
        <p className="text-sm text-fg-faint text-center max-w-xs">
          Pick a component from the left to try it live, tweak its variants and read its documentation.
        </p>
      </div>
    )
  }

  const selected = selectedComponents.includes(component.key)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={component.key}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="flex flex-col gap-6 max-w-5xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold text-fg">{component.label}</h2>
              <span className="text-[10px] uppercase tracking-widest text-fg-faint mt-1">{component.category}</span>
            </div>
            <p className="text-sm text-fg-muted mt-1 max-w-xl leading-relaxed">{component.description}</p>
          </div>
          <button
            onClick={() => toggleComponent(component.key)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 whitespace-nowrap ${
              selected ? 'bg-fg text-app' : 'bg-elevated text-fg-muted border border-line-strong'
            }`}
          >
            {selected ? '✓ Added to system' : 'Add to system'}
          </button>
        </div>

        {/* Playground — keyed so axis state resets per component */}
        <Playground key={component.key} component={component} tokens={tokens} />

        {/* Ships in Figma */}
        <FigmaShipList component={component} />

        {/* Props */}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-fg">Props</h3>
          <PropTable component={component} />
        </section>

        {/* Usage + a11y */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-surface/40 p-4">
            <p className="text-[10px] uppercase tracking-wider text-fg-faint mb-1.5">When to use</p>
            <p className="text-xs text-fg-muted leading-relaxed">{component.usage}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface/40 p-4">
            <p className="text-[10px] uppercase tracking-wider text-fg-faint mb-1.5">Accessibility</p>
            <p className="text-xs text-fg-muted leading-relaxed">{component.accessibility}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
