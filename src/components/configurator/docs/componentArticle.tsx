// The component article — one canonical page per catalogue component, rendered
// by the docs site beside the foundation pages (`foundationArticle.tsx`).
//
// This is the merge of what used to be two top-level sections: Documentation
// (DocsView + DocArticle) and Components (ComponentDocPane + an inline master
// list). Both rendered the SAME `ComponentDef` from the SAME `SPECIMENS`
// registry through two independent trees, with two search states, two master
// lists, two prop tables, two copy buttons and two active-item states — so
// switching sections lost your place, and each side had capabilities the other
// lacked (docs had Examples/TOC/Copy-Page/Related, the catalogue had the live
// axis controls, icon slots and "Add to system"). All of it survives here.
//
// The HERO is the merge's one structural change: it is the interactive
// playground AND the doc's preview/code block at once, so the snippet you copy
// is the snippet for the variant on screen — which neither half could claim.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SELECT_LIST, SELECT_OPTION, SELECT_OPTION_OFF } from '../themeWorkspaceLayout'
import { PickerField, FIELD_SHELL, FIELD_SHELL_REST, FIELD_CHIP } from '../../ui/PickerField'
import {
  COMPONENTS, COMPONENT_KEYS, FIGMA_SAMPLE_KEYS, isInFigmaSample,
  type ComponentDef, type VariantAxis,
} from '../../../lib/componentCatalogue'
import { useI18n } from '../../../lib/i18n'
import { agentContextMarkdown } from '../../../lib/agentContext'
import { contextSize, cutComponentContext, formatApproxTokens } from '../../../lib/contextRequest'
import { contextTokenJson } from '../../../lib/contextSource'
import { resolvePreviewTokens } from '../../../lib/previewTokens'
import { useDesignStore } from '../../../store/useDesignStore'
import { ContextFilters, useContextOptions, type ContextOptions } from '../../ui/ContextControls'
import { AIContextButton } from '../../ui/AIContextButton'
import { AnchoredPopover } from '../../ui/ContextControls'
import { showToast } from '../../ui/Toast'
import { buildElementFigmaContext, buildFigmaContext } from '../../../lib/figmaContext'
import { defaultFigmaSyncModes, type FigmaSyncMode, type FigmaViewport } from '../../../lib/figmaSyncModes'
import { HintTip } from '../../ui/HintTip'
import { PhIcon } from '../../ui/PhIcon'
import { InspectorPortal } from '../WorkspaceInspector'
import SemanticTokenDrawer from '../SemanticTokenGroups'
import ThemeQuickSettingsRail, { type QuickPanelFoundation } from '../ThemeQuickSettingsRail'
import { PHOSPHOR_LIBRARY } from '../../../lib/iconLibraries'
import { withAlpha } from '../../../lib/colorUtils'
import type { PreviewTokens } from '../../preview/ButtonPreview'
import type { ThemeAppearance } from '../../../lib/themeModes'
import { InspectorModeProvider, InspectorOverlay, TokenInspector } from '../../preview/artefacts/TokenInspector'
import { InspectGlyph, SparkleCircleIcon } from '../../ui/icons'
import { OVERVIEWS, OVERVIEW_VALUE, hasOverview } from './componentOverviews'
import { SPECIMENS, snippetFor, ICON_SLOTS, PANEL_COMPONENTS, type AxisValues, type IconOpts } from './specimens'
import {
  Prose, DocSection, SectionHeading, BlockChrome,
  Pager,
  type TocEntry,
} from './blocks'

// Categories whose components respond to pointer/keyboard — they get the
// standard keyboard-interaction table in Accessibility.
const INTERACTIVE_CATEGORIES = new Set(['Button & Actions', 'Form Controls', 'Navigation'])

const KEYBOARD_ROWS: { key: string; description: string }[] = [
  { key: 'Tab', description: 'Moves focus to the component (and between its focusable parts).' },
  { key: 'Space', description: 'Activates the focused control.' },
  { key: 'Enter', description: 'Activates the focused control.' },
]

/** First value of each axis = the plugin's default variant. One definition —
 *  the two merged files each carried their own copy of this expression. */
export function axisDefaults(def: ComponentDef): AxisValues {
  return Object.fromEntries(def.axes.map((a) => [a.name, a.values[0]]))
}

/** Which combination of the variant matrix `values` is, 1-based, in the same
 *  row-major order the Figma plugin generates the set in. The old catalogue
 *  badge always said "1 of N" no matter what you had selected. */
function variantIndex(def: ComponentDef, values: AxisValues): number {
  return def.axes.reduce((acc, a) => acc * a.values.length + Math.max(0, a.values.indexOf(values[a.name])), 0) + 1
}

// ── Axis controls (the catalogue playground's rail) ──────────────────────────

/** One variant axis, in the edition panel's field (`PickerField`): the name
 *  in the filled chip, the value beside it, the list under the whole field —
 *  the same row the Theme panel's Font and Radius use. A True/False axis is a
 *  switch in that same shell. */
function AxisControl({ axis, value, onChange, lead }: { axis: VariantAxis; value: string; onChange: (v: string) => void; /** An extra first option (Overview). */ lead?: string }) {
  const isBool = axis.values.length === 2 && axis.values.includes('True') && axis.values.includes('False')
  if (isBool) return <OptionSwitch label={axis.name} checked={value === 'True'} onChange={(on) => onChange(on ? 'True' : 'False')} />
  const options = [...(lead ? [lead] : []), ...axis.values].map((v) => ({ value: v, label: v }))
  return <PickerField label={axis.name} value={value} options={options} onChange={onChange} searchable={false} />
}

/** An on/off option in the same field shell: the whole row is the switch. */
function OptionSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`group ${FIELD_SHELL} ${FIELD_SHELL_REST} text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
    >
      <span className={`${FIELD_CHIP} ${checked ? 'text-fg' : 'text-fg-muted group-hover:text-fg'}`}>
        <span className="min-w-0 truncate">{label}</span>
      </span>
      <span className={`min-w-0 flex-1 truncate text-ui ${checked ? 'text-fg' : 'text-fg-faint'}`}>{checked ? t('On') : t('Off')}</span>
      <span aria-hidden className={`relative h-4 w-7 flex-shrink-0 rounded-full transition-colors duration-150 ${checked ? 'bg-accent-solid' : 'bg-line-strong'}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-[left] duration-150 ease-[var(--ease-out-quint)] ${checked ? 'left-[14px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}
// ── Playground canvas controls ──────────────────────────────────────────────

const INSPECT_PREF_KEY = 'sd-playground-inspect'

function readInspectPref(): boolean {
  try { return localStorage.getItem(INSPECT_PREF_KEY) !== 'off' } catch { return true }
}

function writeInspectPref(on: boolean) {
  try { localStorage.setItem(INSPECT_PREF_KEY, on ? 'on' : 'off') } catch { /* private mode: this session only */ }
}

/** Inspector on / off. The name stays "Inspect" and `aria-pressed` carries
 *  the state, so a screen reader hears one answer, not two. */
type CanvasPanel = 'theme' | 'settings' | 'context'

const BAR_ICON = 'relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui motion-reduce:transition-none'
// Pressed: full white glyph on the raised pill, so "on" can't be mistaken
// for a hover. Off: faint, warming on hover. Never both colours at once.
const BAR_ICON_ON = 'text-white bg-[linear-gradient(126deg,color-mix(in_srgb,var(--fg)_15%,transparent)_18%,color-mix(in_srgb,var(--fg)_9%,transparent)_71%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
const BAR_ICON_OFF = 'text-fg-faint hover:bg-fg/[0.06] hover:text-fg'

function PaletteGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 1.75a6.25 6.25 0 1 0 0 12.5c.9 0 1.35-.6 1.35-1.25 0-.55-.35-.9-.35-1.4 0-.6.5-1.1 1.1-1.1h1.3a2.8 2.8 0 0 0 2.8-2.8C14.2 4.4 11.4 1.75 8 1.75Z" />
      <circle cx="4.9" cy="7.3" r=".9" fill="currentColor" stroke="none" />
      <circle cx="6.9" cy="4.7" r=".9" fill="currentColor" stroke="none" />
      <circle cx="10.1" cy="4.9" r=".9" fill="currentColor" stroke="none" />
    </svg>
  )
}


function CodeGlyphSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5.5 4.5-3.5 3.5 3.5 3.5" />
      <path d="m10.5 4.5 3.5 3.5-3.5 3.5" />
    </svg>
  )
}

/** The stage's tools, docked at its foot like the Board's toolbar (same black
 *  well, same raised pill): Settings and Code open the right-hand panel,
 *  Inspector arms the token inspector, then Light · Dark for this stage. One
 *  bar instead of controls scattered over the canvas and the header. */
// ── Copy for Figma ───────────────────────────────────────────────────────────

/** What a Figma copy ships: the File & modes selection the Figma page uses. */
export interface FigmaCopyScope {
  modes: FigmaSyncMode[]
  viewports: FigmaViewport[]
  project: string
  brandName: (key: string) => string
}

const COPY_BTN = 'flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-caption font-medium tracking-[0.18px] text-fg transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-surface active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

const FIGMA_MENU_W = 240
const FIGMA_COPY_ROWS: { id: 'element' | 'system'; label: string; icon: ReactNode }[] = [
  {
    id: 'element',
    label: 'This element',
    // The Components rail mark: four diamonds, one component.
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden>
        <path d="M8 1.8 10.2 4 8 6.2 5.8 4zM12 5.8 14.2 8 12 10.2 9.8 8zM4 5.8 6.2 8 4 10.2 1.8 8zM8 9.8l2.2 2.2L8 14.2 5.8 12z" />
      </svg>
    ),
  },
  {
    id: 'system',
    label: 'Whole design system',
    // The Board's stack: every layer of the system.
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M8 2 14 5.2 8 8.4 2 5.2z" /><path d="m2 8 6 3.2L14 8" /><path d="m2 10.8 6 3.2 6-3.2" />
      </svg>
    ),
  },
]

/** The click copies THIS element; the ⌄ offers the whole design system. Both
 *  are pasted with ⌘V in the Escala plugin, which reads which one it got. */
function FigmaCopyButton({ label, build }: { label: string; build: (what: 'element' | 'system') => string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  // A callback ref into state: the popover anchors to the node, read at render.
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null)
  async function copy(what: 'element' | 'system') {
    try {
      await navigator.clipboard.writeText(build(what))
      setOpen(false)
      setDone(true)
      window.setTimeout(() => setDone(false), 2000)
      showToast(what === 'element'
        ? t('{name} copied for Figma — open the Escala plugin and press ⌘V', { name: label })
        : t('Design system copied for Figma — open the Escala plugin and press ⌘V'))
    } catch {
      showToast(t('Couldn’t copy — try again'))
    }
  }
  // The row in reach, so the one line under the list can say what it does.
  const [active, setActive] = useState<'element' | 'system' | null>(null)
  return (
    <>
      <div ref={setAnchor} className="flex h-8 items-center rounded-lg border border-line p-0.5">
        <button type="button" onClick={() => copy('element')} className={COPY_BTN} title={t('Copy this element for the Escala plugin in Figma')}>
          {done
            ? <><span className="text-caption leading-none text-status-success">✓</span>{t('Copied')}</>
            : <><FigmaGlyph className="flex-shrink-0" />{t('Copy for Figma')}</>}
        </button>
        <span aria-hidden className="mx-0.5 h-4 w-px bg-line" />
        <button
          type="button"
          aria-label={t('Figma copy options')}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className={`${COPY_BTN} px-1.5 ${open ? 'bg-surface' : ''}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 4.5 6 7.5l3-3" />
          </svg>
        </button>
      </div>
      <AnchoredPopover
        anchor={anchor}
        open={open}
        onClose={() => { setOpen(false); setActive(null) }}
        label={t('Figma copy options')}
        width={FIGMA_MENU_W}
        shell={SELECT_LIST}
      >
        {/* The Random level menu's shape: icon · two words · the row's own
            line underneath, so the list stays short and the explanation
            follows the pointer instead of sitting under every row. */}
        <div role="menu" className="flex flex-col gap-0.5" onPointerLeave={() => setActive(null)}>
          {FIGMA_COPY_ROWS.map((r) => (
            <button
              key={r.id}
              type="button"
              role="menuitem"
              onClick={() => copy(r.id)}
              onPointerEnter={() => setActive(r.id)}
              onFocus={() => setActive(r.id)}
              className={`${SELECT_OPTION} ${SELECT_OPTION_OFF} grid grid-cols-[auto_1fr] items-center gap-x-2 focus-visible:outline-none focus-visible:bg-surface focus-visible:text-fg`}
            >
              <span className="text-fg-faint">{r.icon}</span>
              <span className="min-w-0 truncate text-ui">{t(r.label)}</span>
            </button>
          ))}
          <p aria-live="polite" className="mt-0.5 min-h-[calc(2lh+1rem)] border-t border-line px-2.5 py-2 text-caption leading-snug text-fg-muted">
            {active === 'element'
              ? t('Only {name}, on the page you are on', { name: label })
              : active === 'system'
                ? t('Every variable, style and page')
                : t('Paste with ⌘V in the Escala plugin')}
          </p>
        </div>
      </AnchoredPopover>
    </>
  )
}

/** Bar glyphs drawn like the others in it: 16px, 1.4 stroke, round caps. The
 *  shared sun/moon assets are filled masks and read heavier beside them. */
function SunGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.75v1.1M8 13.15v1.1M1.75 8h1.1M13.15 8h1.1M3.58 3.58l.78.78M11.64 11.64l.78.78M3.58 12.42l.78-.78M11.64 4.36l.78-.78" />
    </svg>
  )
}
function MoonGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13.25 9.6A5.5 5.5 0 0 1 6.4 2.75a5.5 5.5 0 1 0 6.85 6.85Z" />
    </svg>
  )
}
function ZoomGlyph({ plus }: { plus?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
      <path d={plus ? 'M3.5 8h9M8 3.5v9' : 'M3.5 8h9'} />
    </svg>
  )
}

/** The stage's 100 %: the component drawn at 2/3 of its true pixel size.
 *  Why 2/3 and not 1:1 — the stage is a view of the system INSIDE the
 *  platform's chrome, and at true size the specimen outweighs everything
 *  around it: a default control (`size-control`, 40px) towered over the
 *  tool bar's 31.5px buttons beneath it (h-7 at the 18px root), and the
 *  Overview wrapped onto four rows. At 2/3 that control measures 26.7px, a
 *  step UNDER the chrome, and the Overview fits in two rows (measured at
 *  1440px). It is also the Board's family: the Board
 *  draws the same components at 156/260 = 0.6; a single-component close-up
 *  is one step larger (0.67), not a different scale. True size is still one
 *  click away: 150 % = 1:1 pixels (2/3 × 1.5 = 1). */
const STAGE_BASE = 2 / 3
/** Zoom levels RELATIVE to `STAGE_BASE` — what the bar shows and steps through.
 *  150 % is the true pixel size. */
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

function CanvasBar({
  panel, onPanel, inspecting, onInspect, appearance, onAppearance, hasSettings, zoom, onZoom,
}: {
  /** The stage's scale: − / + step it, the readout puts it back to 100 %. */
  zoom: number
  onZoom: (z: number) => void
  panel: CanvasPanel | null
  onPanel: (p: CanvasPanel | null) => void
  inspecting: boolean
  onInspect: () => void
  appearance: ThemeAppearance
  onAppearance: (a: ThemeAppearance) => void
  hasSettings: boolean
}) {
  const { t } = useI18n()
  // Settings is home: the other panels toggle back to it, and Settings itself
  // only ever opens (a component without settings falls back to the list).
  const home: CanvasPanel | null = hasSettings ? 'settings' : null
  const toggle = (p: CanvasPanel) => onPanel(p === 'settings' ? 'settings' : panel === p ? home : p)
  const sep = <span aria-hidden className="mx-0.5 h-5 w-px flex-shrink-0 bg-line" />
  return (
    // Sticky to the bottom of the page's scroll view: the bar stays on screen
    // while any part of the stage is, instead of sinking below the fold.
    <div data-inspect-exempt="" className="pointer-events-none sticky bottom-4 z-30 -mt-14 mb-4 flex items-center justify-center px-4">
      <div
        role="toolbar"
        aria-label={t('Component tools')}
        className="dark pointer-events-auto flex h-10 items-center gap-0.5 rounded-xl border border-white/[0.12] bg-[#050506] p-1 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45),0_2px_6px_-2px_rgba(0,0,0,0.3)]"
      >
        <HintTip label={t('Edit theme')}>
          <button
            type="button"
            onClick={() => toggle('theme')}
            aria-pressed={panel === 'theme'}
            aria-label={t('Edit theme')}
            className={`${BAR_ICON} ${panel === 'theme' ? BAR_ICON_ON : BAR_ICON_OFF}`}
          >
            <PaletteGlyph />
          </button>
        </HintTip>
        {sep}
        {hasSettings && (
          <HintTip label={t('Component settings')}>
            <button
              type="button"
              onClick={() => toggle('settings')}
              aria-pressed={panel === 'settings'}
              aria-label={t('Component settings')}
              className={`${BAR_ICON} ${panel === 'settings' ? BAR_ICON_ON : BAR_ICON_OFF}`}
            >
              <PhIcon id="faders" size={16} />
            </button>
          </HintTip>
        )}
        <HintTip label={t('Agent context')}>
          <button
            type="button"
            onClick={() => toggle('context')}
            aria-pressed={panel === 'context'}
            aria-label={t('Agent context')}
            className={`${BAR_ICON} ${panel === 'context' ? BAR_ICON_ON : BAR_ICON_OFF}`}
          >
            <CodeGlyphSmall />
          </button>
        </HintTip>
        {sep}
        <HintTip label={inspecting ? t('Exit inspector') : t('Inspect tokens')} shortcut={inspecting ? 'Esc' : undefined}>
          <button
            type="button"
            onClick={onInspect}
            aria-pressed={inspecting}
            aria-keyshortcuts={inspecting ? 'Escape' : undefined}
            className={`flex h-7 flex-shrink-0 items-center gap-1.5 rounded-md px-2 text-caption transition-[color,background-color,box-shadow] duration-150 ease-[var(--ease-out-quint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui ${
              inspecting
                ? 'bg-accent-solid font-semibold text-accent-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.4)]'
                : 'font-medium text-fg-faint hover:bg-fg/[0.06] hover:text-fg'
            }`}
          >
            <InspectGlyph size={16} />
            <span>{inspecting ? t('Exit inspector') : t('Inspector')}</span>
          </button>
        </HintTip>
        {sep}
        <div role="group" aria-label={t('Preview appearance')} className="flex items-center gap-0.5">
          {(['light', 'dark'] as const).map((a) => {
            const name = t('Preview in {appearance}', { appearance: a === 'light' ? t('Light') : t('Dark') })
            return (
              <HintTip key={a} label={name}>
                <button
                  type="button"
                  onClick={() => onAppearance(a)}
                  aria-pressed={appearance === a}
                  aria-label={name}
                  className={`${BAR_ICON} ${appearance === a ? BAR_ICON_ON : BAR_ICON_OFF}`}
                >
                  {a === 'light' ? <SunGlyph /> : <MoonGlyph />}
                </button>
              </HintTip>
            )
          })}
        </div>
        {sep}
        <div role="group" aria-label={t('Zoom')} className="flex items-center gap-0.5">
          <HintTip label={t('Zoom out')}>
            <button
              type="button"
              onClick={() => onZoom([...ZOOM_STEPS].reverse().find((z) => z < zoom - 0.001) ?? zoom)}
              aria-disabled={zoom <= ZOOM_STEPS[0] || undefined}
              aria-label={t('Zoom out')}
              className={`${BAR_ICON} ${BAR_ICON_OFF} aria-disabled:opacity-40`}
            >
              <ZoomGlyph />
            </button>
          </HintTip>
          <HintTip label={t('Reset zoom')}>
            <button
              type="button"
              onClick={() => onZoom(1)}
              aria-label={t('Reset zoom')}
              className="flex h-7 w-11 flex-shrink-0 items-center justify-center rounded-md text-caption font-medium tabular-nums text-fg-faint transition-colors duration-150 hover:bg-fg/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui"
            >
              {Math.round(zoom * 100)}%
            </button>
          </HintTip>
          <HintTip label={t('Zoom in')}>
            <button
              type="button"
              onClick={() => onZoom(ZOOM_STEPS.find((z) => z > zoom + 0.001) ?? zoom)}
              aria-disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1] || undefined}
              aria-label={t('Zoom in')}
              className={`${BAR_ICON} ${BAR_ICON_OFF} aria-disabled:opacity-40`}
            >
              <ZoomGlyph plus />
            </button>
          </HintTip>
        </div>
      </div>
    </div>
  )
}

/** What the bar opens: a layer over the Components rail. Component settings
 *  is HOME — the panel you see and control the element from — so it has no
 *  way out of its own; Theme and Agent context return to it (‹ back, ✕, Esc). */
function CanvasSidePanel({ title, back, children, footer }: {
  title: string
  /** Where ‹ / ✕ / Esc land. Omit for the home panel (no back, no close). */
  back?: { label: string; onBack: () => void }
  children: ReactNode
  footer?: ReactNode
}) {
  const { t } = useI18n()
  const onBack = back?.onBack
  useEffect(() => {
    if (!onBack) return
    // Esc with a pinned token list open closes only that list (the inspector
    // handles it); the panel underneath stays.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (document.querySelector('[data-inspector-pin]')) return
      onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])
  return (
    <InspectorPortal>
      <div role="region" aria-label={title} className="absolute inset-0 z-[5] flex flex-col overflow-hidden bg-side-panel">
        <div className={`flex h-11 flex-shrink-0 items-center gap-2 border-b border-line ${back ? 'px-2' : 'px-4'}`}>
          {back && (
            <button
              type="button"
              onClick={back.onBack}
              className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-lg px-2 text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10 3.5 5.5 8l4.5 4.5" />
              </svg>
              <span className="truncate">{back.label}</span>
            </button>
          )}
          {/* With a back link the header is "‹ Component settings · ✕": the
              panel's own title would only truncate beside it. */}
          {back ? <span className="ml-auto" /> : <span className="min-w-0 truncate text-caption font-medium text-fg">{title}</span>}
          {back && (
            <button
              type="button"
              onClick={back.onBack}
              aria-label={t('Close')}
              title={t('Close')}
              className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-fg-faint transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex-shrink-0 border-t border-line p-3">{footer}</div>}
      </div>
    </InspectorPortal>
  )
}

// ── Overview (the Preview's default for a component that has one) ───────────

function OverviewStage({ def, tokens, prefix }: { def: ComponentDef; tokens: PreviewTokens; prefix: string }) {
  const { t } = useI18n()
  const Specimen = SPECIMENS[def.key]
  const rows = OVERVIEWS[def.key]
  if (!Specimen || !rows) return null
  const base = axisDefaults(def)
  return (
    <div className="flex flex-col items-center gap-5">
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center justify-center gap-4">
          {row.map((item, j) => {
            const v = { ...base, ...item.v }
            const icons: IconOpts = {
              prefix,
              leading: Boolean(item.leading),
              trailing: Boolean(item.trailing),
              leadingConcept: item.leading,
              trailingConcept: item.trailing,
            }
            return (
              <TokenInspector key={j} component={def.key} variant={v}>
                <Specimen t={tokens} v={v} w={item.w} icons={item.leading || item.trailing ? icons : undefined}>
                  {item.label ? t(item.label) : undefined}
                </Specimen>
              </TokenInspector>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Hero: the live playground, with the doc block's Preview/Code toggle ──────
//
// `values`/icon toggles and the `snippet` they produce are OWNED by
// `ComponentArticle`, not by this component — see the note there. Hero used
// to hold all of it locally, which is exactly how "the snippet you copy is
// the snippet on screen" stopped being true: `ComponentArticle` had no way to
// reach Hero's internal state, so `heroCode` (the string handed to Usage,
// "Use it", and the "Copy context to Agents" button) was computed from
// `axisDefaults(def)` instead — always Brand/Solid/MD/Default, regardless of
// what the playground actually showed. Verified live: setting Color=Danger,
// Style=Ghost repainted the Preview correctly (measured computed style:
// transparent fill, `#be3a2f` ink) while every one of those three consumers
// kept printing `color="brand" style="solid"`. One shared snippet, computed
// once by the parent and passed down, is what makes that impossible again.
export function ComponentCatalogueHero({
  def, tokens, values, onValuesChange, icons, leadingIcon, onLeadingIconChange, trailingIcon, onTrailingIconChange, snippet,
  headerTrailing, appearance: appearanceProp, onInspectRole, previewTheme, buildContext, onOpenFoundation, figmaCopy,
}: {
  /** What Copy for Figma ships; omitted = no Figma button. */
  figmaCopy?: FigmaCopyScope
  def: ComponentDef
  tokens: PreviewTokens
  values: AxisValues
  onValuesChange: (v: AxisValues) => void
  icons?: IconOpts
  leadingIcon: boolean
  onLeadingIconChange: (v: boolean) => void
  trailingIcon: boolean
  onTrailingIconChange: (v: boolean) => void
  /** Computed once by `ComponentArticle` from these same `values`/`icons` —
   *  Hero never recomputes its own copy. */
  snippet: string
  /** Replaces the default Copy snippet control — e.g. Theme preview's link to
   *  the full Components destination. */
  headerTrailing?: ReactNode
  /** The previewed brand's appearance — the inspector resolves roles against it. */
  appearance?: ThemeAppearance
  /** A role named by the hover badge. Opens that token in Variables. */
  onInspectRole?: (roleId: string) => void
  /** The brand on screen — the canvas resolves its OTHER appearance from it. */
  previewTheme?: string
  /** The agent brief for this page, cut to the chosen options. The panel's
   *  Agent context tab SHOWS it and its Copy context button copies it. */
  buildContext: (opts: ContextOptions) => string
  /** The Theme panel's "Go to advanced edition": Variables on that foundation. */
  onOpenFoundation?: (key: string) => void
}) {
  const { t } = useI18n()
  // Preview · Agent context. There is no Code tab: owner's call (2026-11-04),
  // a bare `<Button>Button</Button>` told people nothing, while the agent
  // context is what they act on. The snippet still ships inside the brief, in
  // Use it → Code and in Usage.
  const view = 'preview' as 'preview' | 'agent'
  const canvasRef = useRef<HTMLDivElement>(null)
  const appearance = appearanceProp ?? 'light'
  // One set of options for the tab and the button, so what is on screen is
  // exactly what Copy context puts on the clipboard.
  const [contextOpts, setContextOpts] = useContextOptions('all', appearance)
  // What the bar has open in the right panel (settings or the agent brief).
  // Settings open by default: working on a component means its controls are
  // beside it. The catalogue is one step back (the panel's ‹ Components, or
  // the header breadcrumb).
  // The token being edited from the inspector's list, and what was pinned.
  const [editing, setEditing] = useState<{ id: string; css: string; appearance: ThemeAppearance } | null>(null)
  const [selection, setSelection] = useState<string | null>(null)
  // The Theme panel's open foundation row (Color, Font, Radius…).
  const [quickPanel, setQuickPanel] = useState<QuickPanelFoundation>('color')
  const [panel, setPanel] = useState<CanvasPanel | null>(() => (def.axes.length > 0 || ICON_SLOTS[def.key] ? 'settings' : null))
  const homePanel: CanvasPanel | null = def.axes.length > 0 || ICON_SLOTS[def.key] ? 'settings' : null
  const closePanel = useCallback(() => setPanel(homePanel), [homePanel])
  const backToHome = homePanel
    ? { label: t('Component settings'), onBack: closePanel }
    : { label: t('Components'), onBack: closePanel }
  // The canvas can show the brand's other appearance without changing the
  // brand on screen: only this stage repaints, the rest of the page does not.
  const [canvasAppearance, setCanvasAppearance] = useState<ThemeAppearance>(appearance)
  const store = useDesignStore()
  const canvasTokens = canvasAppearance === appearance
    ? tokens
    : resolvePreviewTokens(store, previewTheme ?? 'light', canvasAppearance)
  // Inspecting captures the pointer, so the specimen cannot be used while it
  // is on. Off = a normal, interactive component. Remembered per browser.
  const [inspecting, setInspecting] = useState(readInspectPref)
  const toggleInspecting = () => {
    const next = !inspecting
    setInspecting(next)
    writeInspectPref(next)
  }

  const slots = ICON_SLOTS[def.key]
  // Built only while the tab is open: the brief resolves the whole payload.
  const agentMarkdown = useMemo(
    () => (panel === 'context' ? buildContext(contextOpts) : ''),
    // `snippet` and `tokens` change the brief; `buildContext` is a fresh closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, panel, contextOpts, snippet, tokens],
  )
  const Specimen = SPECIMENS[def.key]
  const variantCount = def.axes.reduce((n, a) => n * a.values.length, 1)
  const hasControls = def.axes.length > 0 || Boolean(slots)
  // Overview first: the curated row is what the page opens on. Picking a
  // variant in Settings switches the stage to that single specimen.
  const [overview, setOverview] = useState(() => hasOverview(def.key))
  // The stage's scale (the bar's − / +): a wide Overview can be shrunk to fit,
  // a small control enlarged to read its details.
  // Relative to `STAGE_BASE` (1 = the stage's 100 %, 2/3 of true size).
  const [zoom, setZoom] = useState(1)
  // Copy for Figma. The element is the brand on screen only (its own themes),
  // as the variant the settings show; the whole system is the Figma page's
  // File & modes selection.
  const buildFigma = (what: 'element' | 'system') => {
    if (!figmaCopy) return ''
    const theme = previewTheme ?? 'light'
    if (what === 'system') {
      return buildFigmaContext({ ...figmaCopy, theme }).text
    }
    const st = useDesignStore.getState()
    const own = figmaCopy.modes.filter((m) => m.theme === theme)
    const modes = own.length ? own : defaultFigmaSyncModes([theme], st.themeKinds, st.brandThemes)
    return buildElementFigmaContext({
      ...figmaCopy,
      project: figmaCopy.brandName(theme),
      modes,
      theme,
      element: { component: def.key, label: def.label, variant: values },
    }).text
  }

  // A colored blob backdrop so the translucent panel treatment (blur + alpha)
  // has something behind it to visibly soften — a flat canvas can't show it.
  // `backgroundColor`/`backgroundImage` (not the `background` shorthand) so
  // toggling the pattern on/off never mixes shorthand and longhand styles.
  const showPattern = canvasTokens.panelBackground === 'translucent' && PANEL_COMPONENTS.has(def.key)
  const canvasStyle = {
    backgroundColor: canvasTokens.surface,
    backgroundImage: showPattern
      ? [
          `radial-gradient(circle at 15% 20%, ${withAlpha(canvasTokens.brandSolid, 0.55)}, transparent 42%)`,
          `radial-gradient(circle at 85% 15%, ${withAlpha(canvasTokens.successColor ?? '#17b26a', 0.5)}, transparent 40%)`,
          `radial-gradient(circle at 75% 85%, ${withAlpha(canvasTokens.warningColor ?? '#f79009', 0.45)}, transparent 45%)`,
          `radial-gradient(circle at 20% 85%, ${withAlpha(canvasTokens.infoColor ?? '#2e90fa', 0.4)}, transparent 40%)`,
        ].join(', ')
      : 'none',
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex-1 min-w-0 flex flex-col gap-2">
      <div className="border-b border-line overflow-clip">
        <BlockChrome
          left={
            // The stage's name, not a tab: the agent context lives in the right
            // panel (the bar's Code icon), so there is nothing to switch to.
            <span className="flex items-center gap-2">
              <span className="rounded-md bg-elevated px-2.5 py-1 text-caption font-medium text-fg">{t('{name} preview', { name: def.label })}</span>
              {variantCount > 1 && (
                <span className="text-mini text-fg-faint tabular-nums">
                  {overview
                    ? t('{total} variants', { total: variantCount })
                    : t('{index} of {total} variants', { index: variantIndex(def, values), total: variantCount })}
                </span>
              )}
            </span>
          }
        >
          <div className="flex items-center gap-1.5">
            {!headerTrailing && figmaCopy && <FigmaCopyButton label={def.label} build={buildFigma} />}
            {headerTrailing ?? (
              // Agent context lives in the right panel (filters, preview and
              // Copy there): this icon opens it, the same door as the bar's
              // code icon — not a second copy button with its own options.
              <HintTip label={t('Agent context')}>
                <button
                  type="button"
                  onClick={() => setPanel(panel === 'context' ? homePanel : 'context')}
                  aria-pressed={panel === 'context'}
                  aria-label={t('Agent context')}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                    panel === 'context' ? 'border-line-strong bg-surface text-fg' : 'border-line text-fg-muted hover:bg-surface hover:text-fg'
                  }`}
                >
                  <SparkleCircleIcon size={15} />
                </button>
              </HintTip>
            )}
          </div>
        </BlockChrome>

        {view === 'preview' ? (
          <InspectorModeProvider active={inspecting}>
            <div
              ref={canvasRef}
              // `overflow-clip`, not `hidden`: a hidden overflow is a scroll
              // container, and the tool bar's `sticky` would pin to it instead
              // of to the page.
              className="relative flex flex-col overflow-clip transition-colors duration-200 ease-[var(--ease-out-quint)]"
              style={{ ...canvasStyle, cursor: inspecting ? 'crosshair' : undefined }}
            >
              <div className="flex min-h-[300px] flex-1 items-center justify-center px-10 pb-20 pt-10">
                {/* The empty canvas is not a page to inspect. Only the specimen
                    answers; pointing at the padding clears the badge. */}
                {inspecting && <div data-inspect-exempt="" className="absolute inset-0" aria-hidden />}
                {/* `zoom`, not a transform: the stage keeps the scaled size in
                    the layout, so it grows and shrinks with it. */}
                {overview ? (
                  <div className="relative" style={{ zoom: zoom * STAGE_BASE }}>
                    <OverviewStage def={def} tokens={canvasTokens} prefix={PHOSPHOR_LIBRARY.key} />
                  </div>
                ) : Specimen ? (
                  <div className="relative" style={{ zoom: zoom * STAGE_BASE }}>
                    <TokenInspector component={def.key} variant={values}>
                      <Specimen t={canvasTokens} v={values} icons={icons} />
                    </TokenInspector>
                  </div>
                ) : (
                  <span className="text-xs text-fg-faint">{t('No live preview for this component yet.')}</span>
                )}
              </div>
              {/* The stage paints the BRAND's appearance, not the site's. The
                  switch names which one is on screen and flips only this stage. */}
              <CanvasBar
                panel={panel}
                onPanel={setPanel}
                inspecting={inspecting}
                onInspect={toggleInspecting}
                appearance={canvasAppearance}
                onAppearance={setCanvasAppearance}
                hasSettings={hasControls}
                zoom={zoom}
                onZoom={setZoom}
              />
            </div>
            <InspectorOverlay
              active={inspecting}
              rootRef={canvasRef}
              tokensByAppearance={{ light: canvasTokens, dark: canvasTokens }}
              defaultAppearance={canvasAppearance}
              // A row edits the token HERE (Token Details over the right
              // panel, its ramp beside the component), never by leaving for
              // Variables — that lost the component page. Variables stays one
              // explicit link away (the drawer's "Open in table").
              onPick={(roleId, css, a) => setEditing({ id: roleId, css, appearance: a })}
              onOpenTable={onInspectRole}
              editing={editing != null}
              onSelectionChange={setSelection}
              onExitMode={() => { setInspecting(false); writeInspectPref(false) }}
            />
            <SemanticTokenDrawer
              previewTheme={previewTheme ?? 'light'}
              previewAppearance={editing?.appearance ?? canvasAppearance}
              tokenId={editing?.id ?? null}
              inspectedCss={editing?.css ?? null}
              onClose={() => setEditing(null)}
              onOpenInVariables={onInspectRole}
              backLabel={inspecting ? selection : null}
            />
          </InspectorModeProvider>
        ) : null}
      </div>
      <p className="px-6 lg:px-8 text-mini text-fg-faint">
        {inspecting
            ? t('Hover the component to see its borders and the tokens that paint it.')
            : t('Inspector off — the component responds to clicks and typing.')}
      </p>
      </div>

      {hasControls && panel === 'settings' && (
        <CanvasSidePanel title={t('Component settings')}>
          <div className="flex flex-col gap-2 p-[var(--inspector-inset,12px)]">
            {def.axes.map((axis) => (
              <AxisControl
                key={axis.name}
                axis={axis}
                lead={axis === def.axes[0] && hasOverview(def.key) ? OVERVIEW_VALUE : undefined}
                value={axis === def.axes[0] && overview ? OVERVIEW_VALUE : values[axis.name]}
                onChange={(v) => {
                  if (v === OVERVIEW_VALUE) { setOverview(true); return }
                  setOverview(false)
                  onValuesChange({ ...values, [axis.name]: v })
                }}
              />
            ))}
            {slots && (
              <>
                <OptionSwitch label={t('Leading icon')} checked={leadingIcon} onChange={onLeadingIconChange} />
                <OptionSwitch label={t('Trailing icon')} checked={trailingIcon} onChange={onTrailingIconChange} />
              </>
            )}
          </div>
          <p className="px-[var(--inspector-inset,12px)] pb-4 text-mini leading-relaxed text-fg-faint">
            {slots
              ? <>{t('Icons come from')} <span className="font-medium text-fg-muted">{PHOSPHOR_LIBRARY.label}</span>.</>
              : t('Same axes as the Figma variant set the plugin generates.')}
          </p>
        </CanvasSidePanel>
      )}
      {panel === 'theme' && (
        // Quick edition of the brand on screen, the Board's own rail, so a
        // colour, font or radius can change without leaving the component.
        <CanvasSidePanel title={t('Edit theme')} back={backToHome}>
          <ThemeQuickSettingsRail
            embed
            previewTheme={previewTheme ?? 'light'}
            previewAppearance={canvasAppearance}
            colorAppearance={canvasAppearance}
            onColorAppearanceChange={setCanvasAppearance}
            activePanel={quickPanel}
            onSelectPanel={setQuickPanel}
            onOpenAdvanced={(key) => onOpenFoundation?.(key)}
          />
        </CanvasSidePanel>
      )}
      {panel === 'context' && (
        <CanvasSidePanel
          title={t('Agent context')}
          back={backToHome}
          footer={
            <div className="flex items-center justify-between gap-2">
              <span className="text-mini text-fg-faint">
                {formatApproxTokens(contextSize(agentMarkdown).approxTokens)} · {t('{n} lines', { n: contextSize(agentMarkdown).lines })}
              </span>
              {/* The filters are on screen above, so the button only copies:
                  no chevron, no popover (it opened past the window's foot). */}
              <AIContextButton scope="component" label="Copy context" markdown={() => agentMarkdown} />
            </div>
          }
        >
          <div className="flex flex-col gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="text-ui font-semibold text-fg">{t('Copy context for agents')}</p>
              <p className="mt-0.5 text-caption text-fg-muted">{t('Pick what the agent needs. Less context, better answers.')}</p>
            </div>
            <ContextFilters opts={contextOpts} onChange={setContextOpts} />
          </div>
          <pre className="whitespace-pre-wrap break-words px-4 py-3 font-mono text-caption leading-relaxed text-fg-muted">{agentMarkdown}</pre>
        </CanvasSidePanel>
      )}
    </div>
  )
}
// ── Doc sections ─────────────────────────────────────────────────────────────
function KeyboardTable() {
  const { t } = useI18n()
  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <div className="grid grid-cols-[100px_1fr] gap-4 px-4 py-2 border-b border-line bg-surface/60 text-mini uppercase tracking-wider text-fg-faint">
        <span>{t('Key')}</span>
        <span>{t('Description')}</span>
      </div>
      <div className="divide-y divide-line">
        {KEYBOARD_ROWS.map((row) => (
          <div key={row.key} className="grid grid-cols-[100px_1fr] gap-4 px-4 py-2.5 items-center">
            <kbd className="justify-self-start text-mini font-mono px-1.5 py-0.5 rounded border border-line-strong bg-elevated text-fg-muted">
              {row.key}
            </kbd>
            <span className="text-xs text-fg-muted leading-relaxed">{t(row.description)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** The one props table. The catalogue's own 2-column variant is gone: same
 *  data, fewer columns, so keeping it only created a place to drift. */
function ApiPropsTable({ def }: { def: ComponentDef }) {
  const { t } = useI18n()
  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1.6fr] gap-4 px-4 py-2 border-b border-line bg-surface/60 text-mini uppercase tracking-wider text-fg-faint">
        <span>{t('Prop')}</span>
        <span>{t('Type')}</span>
        <span>{t('Description')}</span>
      </div>
      <div className="divide-y divide-line">
        {def.props.map((prop) => (
          <div key={prop.name} className="grid grid-cols-[1fr_1fr_1.6fr] gap-4 px-4 py-2.5 items-start">
            <code className="text-xs text-[#5AADFF] font-mono break-all">{prop.name}</code>
            <code className="text-mini text-fg-faint font-mono break-all" title={prop.type}>{prop.type}</code>
            <p className="text-xs text-fg-muted leading-snug">{prop.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ApiVariantsTable({ def }: { def: ComponentDef }) {
  const { t } = useI18n()
  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <div className="grid grid-cols-[1fr_2fr_1fr] gap-4 px-4 py-2 border-b border-line bg-surface/60 text-mini uppercase tracking-wider text-fg-faint">
        <span>{t('Variant')}</span>
        <span>{t('Options')}</span>
        <span>{t('Default')}</span>
      </div>
      <div className="divide-y divide-line">
        {def.axes.map((axis) => (
          <div key={axis.name} className="grid grid-cols-[1fr_2fr_1fr] gap-4 px-4 py-2.5 items-start">
            <code className="text-xs text-[#5AADFF] font-mono">{axis.name}</code>
            <div className="flex flex-wrap gap-1">
              {axis.values.map((v) => (
                <code key={v} className="text-mini font-mono px-1.5 py-0.5 rounded bg-elevated/80 border border-line text-fg-muted">
                  "{v}"
                </code>
              ))}
            </div>
            <code className="text-mini font-mono text-fg-muted">"{axis.values[0]}"</code>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FigmaShipList({ component }: { component: ComponentDef }) {
  const { t } = useI18n()
  const variantCount = component.axes.reduce((n, a) => n * a.values.length, 1)
  // Every key ships a full spec — props, axes, tokens, accessibility — into
  // tokens.json and the agent bundle regardless of this check. This block is
  // only about whether the LIVE Figma import additionally renders it as a
  // real component node today. See FIGMA_SAMPLE_KEYS in componentCatalogue.ts.
  if (!isInFigmaSample(component.key)) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/40 p-4 flex items-center gap-2.5">
        <FigmaGlyph className="text-fg-faint flex-shrink-0" />
        <p className="text-caption text-fg-faint leading-relaxed">
          {/* Both counts are DERIVED. They were hardcoded "58" and "9" —
              correct on the day they were typed and one catalogue entry away
              from being a lie, which is the same drift that left the About
              page claiming 39 semantic roles against a real 64. */}
          {t("Not rendered in Figma yet — building all {count} specs as real variants locks the file on import, so today this one ships as a full spec (props, tokens, accessibility) in", { count: COMPONENT_KEYS.length })} <code className="font-mono">tokens.json</code> {t("and your coding agent's context, not as a component node in the file.")}
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-line bg-surface/40 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <FigmaGlyph className="text-fg-muted" />
        <p className="text-xs font-semibold text-fg">{t('Ships in Figma')}</p>
        <span className="text-mini text-fg-faint ml-auto">
          {component.figmaSets.length === 1
            ? t('{count} set', { count: component.figmaSets.length })
            : t('{count} sets', { count: component.figmaSets.length })}
          {variantCount > 1 && ` · ${t('{count} variants', { count: variantCount })}`}
        </span>
      </div>
      <p className="text-caption text-fg-faint leading-relaxed">
        {t("One of the {count} components on the '⬡ Components Overview' sample sheet every import builds — every fill, stroke and radius bound to your variables (component → semantic → primitive):", { count: FIGMA_SAMPLE_KEYS.length })}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {component.figmaSets.map((s) => (
          <span key={s} className="text-caption px-2 py-0.5 rounded-md bg-elevated/80 text-fg-muted border border-line">
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

function FigmaGlyph({ className }: { className?: string }) {
  return (
    <svg width="10" height="14" viewBox="0 0 38 57" fill="currentColor" className={className} aria-hidden>
      <path d="M9.5 57C14.7467 57 19 52.7467 19 47.5V38H9.5C4.25329 38 0 42.2533 0 47.5C0 52.7467 4.25329 57 9.5 57Z" />
      <path d="M0 28.5C0 23.2533 4.25329 19 9.5 19H19V38H9.5C4.25329 38 0 33.7467 0 28.5Z" />
      <path d="M0 9.5C0 4.25329 4.25329 0 9.5 0H19V19H9.5C4.25329 19 0 14.7467 0 9.5Z" />
      <path d="M19 0H28.5C33.7467 0 38 4.25329 38 9.5C38 14.7467 33.7467 19 28.5 19H19V0Z" />
      <path d="M38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5Z" />
    </svg>
  )
}

function RelatedComponents({ def, onOpen }: { def: ComponentDef; onOpen: (c: ComponentDef) => void }) {
  const { t } = useI18n()
  const related = COMPONENTS.filter((c) => c.category === def.category && c.key !== def.key).slice(0, 4)
  if (!related.length) return null
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading id="related">{t('Related Components')}</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {related.map((c) => (
          <button
            key={c.key}
            onClick={() => onOpen(c)}
            className="text-left rounded-xl border border-line bg-surface/40 p-4 hover:border-line-strong transition-colors"
          >
            <p className="text-xs font-semibold text-fg">{c.label}</p>
            <p className="text-caption text-fg-faint leading-relaxed mt-1 line-clamp-2">{t(c.description)}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
// ── "On this page" TOC (right rail) ──────────────────────────────────────────

type Translate = (source: string, vars?: Record<string, string | number>) => string

export function componentToc(def: ComponentDef, t: Translate = (s) => s): TocEntry[] {
  const entries: TocEntry[] = [
    { id: 'description', label: t('Description') },
    { id: 'usage', label: t('Usage') },
  ]
  entries.push(
    { id: 'accessibility', label: t('Accessibility') },
    { id: 'figma', label: t('Figma') },
    { id: 'related', label: t('Related Components') },
    { id: 'api', label: t('API Reference') },
  )
  return entries
}
// ── Copy context ─────────────────────────────────────────────────────────────

/** The component brief, cut to what the person asked for. The appearance on
 *  screen reuses the page's own tokens; the other one is resolved on demand,
 *  only when Dark (or Both) is actually copied. */
function componentContext(
  def: ComponentDef,
  snippet: string,
  theme: string,
  current: ThemeAppearance,
  currentTokens: PreviewTokens,
  opts: ContextOptions,
): string {
  const tokensFor = (a: ThemeAppearance) => (
    a === current ? currentTokens : resolvePreviewTokens(useDesignStore.getState(), theme, a)
  )
  const first: ThemeAppearance = opts.appearance === 'both' ? 'light' : opts.appearance
  // The brand's own payload names the Figma variable of every part; built
  // only when something is copied.
  const json = contextTokenJson(useDesignStore.getState(), theme, opts.appearance)
  const primary = agentContextMarkdown(def, snippet, tokensFor(first), json)
  const dark = opts.appearance === 'both' ? agentContextMarkdown(def, snippet, tokensFor('dark'), json) : undefined
  return cutComponentContext(primary, opts, dark)
}

// ── The page ─────────────────────────────────────────────────────────────────

export function ComponentArticle({
  def, tokens, onOpen, appearance, onInspectRole, previewTheme = 'light', onOpenFoundation, figmaCopy,
}: {
  figmaCopy?: FigmaCopyScope
  /** The Theme panel's "Go to advanced edition". */
  onOpenFoundation?: (key: string) => void
  def: ComponentDef
  tokens: PreviewTokens
  onOpen: (c: ComponentDef) => void
  appearance?: ThemeAppearance
  onInspectRole?: (roleId: string) => void
  /** Brand the page is painted in — Copy context resolves the OTHER
   *  appearance of it when the person asks for Light, Dark or both. */
  previewTheme?: string
}) {
  const { t } = useI18n()
  // The live playground's own selection — OWNED here, not inside `Hero` (see
  // that component's note). This is what makes "the snippet you copy is the
  // snippet on screen" actually true: every downstream consumer of
  // `heroCode` — Usage's import block, "Use it"'s Code tab, and the
  // Copy-context-to-Agents markdown — reads the SAME `values`/`icons` the
  // Preview panel renders from, computed once, below.
  const [values, setValues] = useState<AxisValues>(() => axisDefaults(def))
  const [leadingIcon, setLeadingIcon] = useState(false)
  const [trailingIcon, setTrailingIcon] = useState(false)
  const slots = ICON_SLOTS[def.key]
  const icons = slots
    ? { prefix: PHOSPHOR_LIBRARY.key, leading: leadingIcon, trailing: trailingIcon }
    : undefined

  const heroCode = snippetFor(def, values, icons)
  const idx = COMPONENTS.findIndex((c) => c.key === def.key)
  const prev = COMPONENTS[idx - 1]
  const next = COMPONENTS[idx + 1]

  // The brief lives in the hero panel now (Agent context tab + Copy context),
  // not in the page header: two doors to one action, two rows apart.
  const buildContext = (opts: ContextOptions) =>
    componentContext(def, heroCode, previewTheme, appearance ?? 'light', tokens, opts)

  return (
    <div className="flex flex-col gap-8">

      {/* `def.label` is NOT translated: it is the plugin's own component name
          and the key a designer matches against the Figma variant set. Its
          category and prose are ours, so they are. */}


      {/* Hero — live playground + code. Axis/icon state lives in THIS
          component now (see above), reset per component the same way every
          other piece of this page's state already is: `ComponentsView` keys
          its wrapping `motion.div` on `def.key`, remounting the whole
          article — no separate key needed here any more. */}
      <ComponentCatalogueHero
        def={def}
        tokens={tokens}
        values={values}
        onValuesChange={setValues}
        icons={icons}
        leadingIcon={leadingIcon}
        onLeadingIconChange={setLeadingIcon}
        trailingIcon={trailingIcon}
        onTrailingIconChange={setTrailingIcon}
        snippet={heroCode}
        appearance={appearance}
        onInspectRole={onInspectRole}
        previewTheme={previewTheme}
        buildContext={buildContext}
        onOpenFoundation={onOpenFoundation}
        figmaCopy={figmaCopy}
      />

      {/* The stage above spans the card; the prose below keeps a reading
          width, aligned with the stage's left edge. */}
      <div className="flex max-w-4xl flex-col gap-8 px-6 lg:px-8">
      {/* The description follows the stage: the page opens on the component
          itself, the prose reads as its caption. Carries the TOC anchor. */}
      <Prose
        id="description"
        text={`${t(def.description)} ${t('To use it, copy its agent context.')}`}
        className="text-sm text-fg-muted leading-relaxed max-w-xl scroll-mt-4"
      />

      {/* Usage — the "when to use" prose only. The snippet lives in the agent
          context (hero panel), the one copy of it on this page. */}
      <DocSection id="usage" title={t('Usage')} description={t(def.usage)} />

      {/* Accessibility */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading id="accessibility">{t('Accessibility')}</SectionHeading>
        {INTERACTIVE_CATEGORIES.has(def.category) && <KeyboardTable />}
        <p className="text-ui text-fg-muted leading-relaxed">{t(def.accessibility)}</p>
      </section>

      {/* Ships in Figma */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading id="figma">{t('Figma')}</SectionHeading>
        <FigmaShipList component={def} />
      </section>

      {/* Related */}
      <RelatedComponents def={def} onOpen={onOpen} />

      {/* API Reference */}
      <section className="flex flex-col gap-3">
        <SectionHeading id="api">{t('API Reference')}</SectionHeading>
        {def.props.length > 0 && (
          <>
            <p className="text-caption uppercase tracking-wider text-fg-faint">{t('Props')}</p>
            <ApiPropsTable def={def} />
          </>
        )}
        {def.axes.length > 0 && (
          <>
            <p className="text-caption uppercase tracking-wider text-fg-faint mt-1">{t('Variants')}</p>
            <ApiVariantsTable def={def} />
          </>
        )}
      </section>

      <Pager
        prev={prev && { key: prev.key, label: prev.label }}
        next={next && { key: next.key, label: next.label }}
        onOpen={(key) => { const c = COMPONENTS.find((x) => x.key === key); if (c) onOpen(c) }}
      />
      </div>
    </div>
  )
}
