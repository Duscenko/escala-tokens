import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { usePreviewTokens, fontFamilyOf } from '../../lib/previewTokens'
import type { PreviewTokens } from '../preview/ButtonPreview'
import { SPECIMENS } from './docs/specimens'
import { QuickEditSections } from './QuickFoundationsPanel'
import { useDesignStore } from '../../store/useDesignStore'
import { COMPONENTS, CATEGORIES, type ComponentDef } from '../../lib/componentCatalogue'

// ── Layout F — the live workbench (the "Generator" section) ──────────────────
// Renders the two workspace columns under the global TopNav; each opens with a
// row-2 section header that lines up across the divider.
// Left column: the token controls as expandable accordions.
// Right column: the design system's living documentation — every included
//           component rendered across its variants from the current tokens, so
//           editing a token on the left repaints the whole system live.

// One documented component — its label + a row of the primary-axis variants,
// each rendered live from the tokens. The card surface uses the DS's own
// background so on-surface contrast reads exactly as it will ship.
function DocComponent({ comp, tokens }: { comp: ComponentDef; tokens: PreviewTokens }) {
  const Spec = SPECIMENS[comp.key]
  if (!Spec) return null
  const axis = comp.axes[0]
  const values: (string | null)[] = axis ? axis.values.slice(0, 6) : [null]
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: tokens.surface, borderColor: tokens.borderDefault || 'rgba(0,0,0,0.08)', fontFamily: fontFamilyOf(tokens) }}
    >
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h4 className="text-[14px] font-semibold" style={{ color: tokens.neutralText }}>{comp.label}</h4>
        {axis && <span className="text-[10px] uppercase tracking-widest" style={{ color: tokens.fgMuted }}>{axis.name}</span>}
      </div>
      <div className="flex flex-wrap items-start gap-x-7 gap-y-5">
        {values.map((val, i) => (
          <div key={i} className="flex flex-col items-start gap-2 min-w-0 max-w-full">
            <Spec t={tokens} v={axis && val ? { [axis.name]: val } : {}} />
            {val && <span className="text-[10px] uppercase tracking-wide" style={{ color: tokens.fgMuted }}>{val}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionHead({ title, note, tokens }: { title: string; note?: string; tokens: PreviewTokens }) {
  return (
    <div className="flex items-baseline gap-2 pt-1">
      <h3 className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: tokens.fgMuted }}>{title}</h3>
      {note && <span className="text-[11px]" style={{ color: tokens.fgMuted, opacity: 0.75 }}>{note}</span>}
    </div>
  )
}

// The Playground IS the design system's living documentation: every included
// component rendered across its variants, grouped by catalogue category — all
// painted from the live tokens.
function Playground({ previewTheme }: { previewTheme: string }) {
  const tokens = usePreviewTokens(previewTheme)
  const selected = useDesignStore((s) => s.selectedComponents)
  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-9 pb-10">
      {CATEGORIES.map((cat) => {
        const comps = COMPONENTS.filter(
          (c) => c.category === cat && SPECIMENS[c.key] && selected.includes(c.key),
        )
        if (!comps.length) return null
        return (
          <section key={cat} className="flex flex-col gap-4">
            <SectionHead title={cat} tokens={tokens} />
            <div className="flex flex-col gap-4">
              {comps.map((c) => <DocComponent key={c.key} comp={c} tokens={tokens} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// Row-2 section header — "<title> | <subtitle>", matching the shell's
// CenterHeader height so both columns line up under the global top bar.
function ColumnHeader({ title, subtitle, right }: { title: string; subtitle: string; right?: ReactNode }) {
  return (
    <div className="px-4 lg:px-6 h-[52px] flex items-center gap-2.5 flex-shrink-0 border-b border-line/60">
      <h2 className="text-sm font-semibold text-fg flex-shrink-0">{title}</h2>
      <span className="text-line-strong flex-shrink-0">|</span>
      <p className="text-sm text-fg-faint truncate">{subtitle}</p>
      {right && <div className="ml-auto flex-shrink-0">{right}</div>}
    </div>
  )
}

// ── Shell ────────────────────────────────────────────────────────────────────
export default function WorkbenchLayout({
  previewTheme, onThemeChange, onOpenFoundations, onAddTheme, actions,
}: {
  previewTheme: string
  onThemeChange: (theme: string) => void
  onOpenFoundations: () => void
  onAddTheme: () => void
  /** Header pill row (New · Import JSON · Share · Kits · Reset). */
  actions?: ReactNode
}) {
  return (
    // No bg on the wrapper: the controls column sits on the brand gradient
    // exactly like SectionRail does elsewhere; only the canvas is opaque.
    <div className="flex-1 min-w-0 flex min-h-0">
      {/* Left column — token controls. Width matches the top bar's brand block
          so the divider runs unbroken from the very top. */}
      <aside className="w-[356px] flex-shrink-0 flex flex-col border-r border-line min-h-0">
        <ColumnHeader title="Preset" subtitle="Quick edit" />
        {/* shrink-0 on every child: a flex column would otherwise compress the
            collapsed accordions instead of scrolling, clipping their labels. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pt-1 pb-5 flex flex-col gap-0.5 [&>*]:shrink-0">
          <QuickEditSections
            accordion
            onOpenFoundations={onOpenFoundations}
            previewTheme={previewTheme}
            onThemeChange={onThemeChange}
            onAddTheme={onAddTheme}
            showPresets
          />
        </div>
      </aside>

      {/* Right column — live playground */}
      <main className="flex-1 min-w-0 flex flex-col min-h-0 bg-app">
        <ColumnHeader title="Preview" subtitle="Quick edit" right={actions} />
        <motion.div
          key={previewTheme}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1 min-h-0 overflow-y-auto p-6"
        >
          <Playground previewTheme={previewTheme} />
        </motion.div>
      </main>
    </div>
  )
}
