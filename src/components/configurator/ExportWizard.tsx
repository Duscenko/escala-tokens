import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import {
  buildWizardExport, collectionMeta, primitiveFamilyMeta, selectionCount, WIZARD_FORMATS,
  type WizardCollection, type WizardFormat, type WizardStructure, type WizardSelection,
} from '../../lib/exportWizard'
import { COLOR_FORMATS, type ColorFormat } from '../../lib/sectionExport'
import { slugify, FIGMA_PLUGIN_ZIP } from '../../lib/utils'
import { COMPONENTS, CATEGORIES, COMPONENT_KEYS } from '../../lib/componentCatalogue'

// ── Guided export (Source → Format → Export) ────────────────────────────────
// Replaces the one-shot "here's your file" window with a three-step flow, so
// what ships is a deliberate choice: WHICH collections and semantic modes, in
// WHAT format and file structure, then the summary before anything downloads.
// Every step reads live counts from the real token payload, so the numbers on
// screen are the numbers in the file.

type Step = 1 | 2 | 3

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Source' },
  { n: 2, label: 'Format' },
  { n: 3, label: 'Export' },
]

const STRUCTURES: { key: WizardStructure; label: string; hint: string }[] = [
  { key: 'single', label: 'Single file', hint: 'All collections in one file' },
  { key: 'per-collection', label: 'Multiple files', hint: 'One file per collection' },
]

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M2.5 7.5l3 3 6-7" />
    </svg>
  )
}

// Square check — the multi-select control (collections).
function CheckBox({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center flex-shrink-0 border transition-colors ${
        on ? 'bg-accent-ui border-transparent text-accent-ink' : 'border-line-strong bg-surface'
      }`}
    >
      {on && <CheckIcon />}
    </span>
  )
}

// Round radio — the single-select control (format, structure).
function Radio({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
        on ? 'border-accent-ui' : 'border-line-strong'
      }`}
    >
      {on && <span className="w-2 h-2 rounded-full bg-accent-ui" />}
    </span>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-line last:border-b-0">
      <span className="text-[13px] text-fg-muted flex-shrink-0">{label}</span>
      <span className="text-[13px] font-semibold text-fg text-right min-w-0 truncate">{value}</span>
    </div>
  )
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-500' : 'bg-line-strong'}`} aria-hidden />
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

// GitHub brand mark — monochrome, tracks currentColor (same glyph as
// TopNav/SaveView's — kept local rather than shared, matching the existing
// precedent of a small duplicated icon per call site in this codebase).
function GitHubGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

function download(file: { name: string; content: string }) {
  const mime = file.name.endsWith('.json') ? 'application/json' : 'text/plain'
  const url = URL.createObjectURL(new Blob([file.content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportWizard({
  onClose,
  onConnectGithub,
  initialCollections = ['primitives', 'semantics'],
}: {
  onClose: () => void
  /** Closes the wizard and opens the dedicated GitHub connect flow — the
   *  wizard links out rather than re-implementing PAT auth + repo push
   *  itself, so there's still only ONE GitHub-connect flow in the app. */
  onConnectGithub?: () => void
  /** Pre-checked collections — the shell passes the section you opened it from,
   *  so "Export" from Typography starts scoped to Typography. */
  initialCollections?: WizardCollection[]
}) {
  // Subscribe so counts track edits made while the wizard is open.
  const store = useDesignStore()
  const {
    projectName, setProjectName, saveCurrentSystem, savedSystems,
    githubRepo, githubLastPushAt,
    selectedComponents, toggleComponent, setSelectedComponents,
  } = store
  const meta = useMemo(() => collectionMeta(), [store])
  const allModes = meta.find((m) => m.key === 'semantics')?.modes ?? ['light']
  // Primitive families (Accent · Neutral · Error … + customs) — the second
  // level of "what do you want to export?" for the primitives collection,
  // mirroring how `modes` narrows semantics.
  const famMeta = useMemo(() => primitiveFamilyMeta(), [store])

  const [step, setStep] = useState<Step>(1)
  const [collections, setCollections] = useState<WizardCollection[]>(initialCollections)
  const [modes, setModes] = useState<string[]>(allModes)
  const [families, setFamilies] = useState<string[]>(famMeta.map((f) => f.key))
  const [format, setFormat] = useState<WizardFormat>('w3c')
  const [structure, setStructure] = useState<WizardStructure>('single')
  const [colorFormat, setColorFormat] = useState<ColorFormat>('hex')
  const [includeAliases, setIncludeAliases] = useState(true)
  // Defaults to true — matches the pre-toggle behavior (every selected
  // component always shipped); this just adds the option to narrow or drop
  // them, it doesn't flip the default off.
  const [includeComponents, setIncludeComponents] = useState(true)
  const [componentSearch, setComponentSearch] = useState('')
  // Step 1 used to stack Foundations (10 rows) and Components (58 rows) in one
  // scroll — too much to scan in one glance. Split into a tab switcher instead,
  // same pill pattern as ColorHub's — one list on screen at a time, with a live
  // count on each pill so the OTHER tab's state is never a mystery.
  const [sourceTab, setSourceTab] = useState<'foundations' | 'components'>('foundations')
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [preview, setPreview] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  // Same id `saveCurrentSystem` builds — lets the button read "Save changes"
  // once this exact project already has a registry entry.
  const savedId = githubRepo ?? `local:${slugify(projectName) || 'design-system'}`
  const savedEntry = savedSystems.find((s) => s.id === savedId)

  function handleSaveSystem() {
    saveCurrentSystem()
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2200)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Every family picked = unscoped, so an untouched export keeps producing the
  // exact same payload it did before family scoping existed.
  const allFamilies = families.length === famMeta.length
  const sel: WizardSelection = {
    collections, modes, format, structure, colorFormat, includeAliases, includeComponents,
    primitiveFamilies: allFamilies ? undefined : families,
  }
  const files = useMemo(
    () => (collections.length ? buildWizardExport(sel) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collections, modes, families, format, structure, colorFormat, includeAliases, includeComponents, store],
  )
  const varCount = useMemo(
    () => selectionCount({ collections, modes, primitiveFamilies: allFamilies ? undefined : families }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collections, modes, families, allFamilies, store],
  )
  const isJson = format === 'w3c' || format === 'escala'
  // Escala JSON is one document by contract, so structure can't split it.
  const structureLocked = format === 'escala'
  const canNext = step === 1
    ? collections.length > 0
      && (!collections.includes('semantics') || modes.length > 0)
      && (!collections.includes('primitives') || families.length > 0)
    : true

  const toggleCollection = (key: WizardCollection) =>
    setCollections((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]))
  const toggleMode = (m: string) =>
    setModes((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))
  const toggleFamily = (k: string) =>
    setFamilies((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))

  function runExport() {
    files.forEach((f, i) => setTimeout(() => download(f), i * 120))
    setDone(true)
  }

  function copyAll() {
    navigator.clipboard.writeText(files.map((f) => (files.length > 1 ? `/* ${f.name} */\n${f.content}` : f.content)).join('\n\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Export tokens"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-3xl h-[min(88vh,46rem)] flex flex-col rounded-2xl bg-app border border-line shadow-2xl overflow-hidden"
      >
        {/* Stepper — a progress rail, and the way back to a finished step */}
        <div className="flex items-center gap-3 px-6 h-14 border-b border-line flex-shrink-0">
          {STEPS.map((s, i) => {
            const active = step === s.n
            const complete = step > s.n
            return (
              <div key={s.n} className="flex items-center gap-3 flex-1 last:flex-initial min-w-0">
                <button
                  onClick={() => { if (complete) { setStep(s.n); setDone(false) } }}
                  disabled={!complete}
                  className={`flex items-center gap-2 min-w-0 ${complete ? 'cursor-pointer' : 'cursor-default'}`}
                  aria-current={active ? 'step' : undefined}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 transition-colors ${
                      complete ? 'bg-accent-ui text-accent-ink' : active ? 'bg-accent-ui text-accent-ink' : 'bg-elevated text-fg-faint'
                    }`}
                  >
                    {complete ? <CheckIcon /> : s.n}
                  </span>
                  <span className={`text-[13px] truncate ${active || complete ? 'font-semibold text-accent-ui' : 'text-fg-faint'}`}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className={`h-px flex-1 min-w-4 ${complete ? 'bg-accent-ui' : 'bg-line'}`} aria-hidden />
                )}
              </div>
            )
          })}
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg hover:bg-elevated/60 transition-colors flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <>
              <h2 className="text-[17px] font-semibold text-fg">What do you want to export?</h2>
              <p className="text-[13px] text-fg-muted mt-1">
                {sourceTab === 'foundations'
                  ? 'Foundations are your design tokens — colors, typography, spacing…'
                  : 'Components are the UI elements built from those tokens.'}
              </p>

              {/* Foundations (10 rows) and Components (58 rows) used to stack
                  in one long scroll — everything to choose from at once. Split
                  into a tab switcher instead, same pill pattern as ColorHub's,
                  so only one list is on screen at a time. Each pill carries a
                  live count, so switching away never loses track of what the
                  other side has selected. */}
              <div className="mt-5 flex items-center gap-1 p-1 rounded-full bg-elevated/60 border border-line">
                <button
                  onClick={() => setSourceTab('foundations')}
                  aria-pressed={sourceTab === 'foundations'}
                  className={`flex-1 flex items-center justify-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                    sourceTab === 'foundations' ? 'bg-app text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  Foundations
                  <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-full bg-elevated text-fg-faint">
                    {collections.length}/{meta.length}
                  </span>
                </button>
                <button
                  onClick={() => setSourceTab('components')}
                  aria-pressed={sourceTab === 'components'}
                  className={`flex-1 flex items-center justify-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors ${
                    sourceTab === 'components' ? 'bg-app text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  Components
                  <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-full bg-elevated text-fg-faint">
                    {includeComponents ? selectedComponents.length : 0}/{COMPONENT_KEYS.length}
                  </span>
                </button>
              </div>

              {sourceTab === 'foundations' && (
                <>
                  {/* All / None — same affordance Components already has next to
                      its search field. Foundations has no search box to share a
                      row with, so these sit on their own, right-aligned above
                      the checklist. */}
                  <div className="mt-4 flex items-center justify-end gap-1">
                    <button
                      onClick={() => setCollections(meta.map((c) => c.key))}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setCollections([])}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
                    >
                      None
                    </button>
                  </div>
                  <div className="mt-1 rounded-xl border border-line bg-surface/50 p-3">
                    <div className="flex flex-col gap-0.5">
                      {meta.map((c) => {
                        const on = collections.includes(c.key)
                        return (
                          <button
                            key={c.key}
                            onClick={() => toggleCollection(c.key)}
                            aria-pressed={on}
                            className={`flex items-center gap-3 px-2.5 h-11 rounded-lg text-left transition-colors ${
                              on ? 'bg-accent-ui/[0.07]' : 'hover:bg-elevated/60'
                            }`}
                          >
                            <CheckBox on={on} />
                            <span className={`flex-1 min-w-0 truncate text-[13px] ${on ? 'text-fg font-medium' : 'text-fg-muted'}`}>
                              {c.label}
                            </span>
                            <span className="text-[11px] font-mono tabular-nums text-fg-faint flex-shrink-0">{c.count} vars</span>
                            {c.modes && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent-ui/10 text-accent-ui flex-shrink-0">
                                {c.modes.length} modes
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Primitives is the one collection that's really a stack of
                      independent ramps — "export just the Accent scale" is a
                      routine ask (and what Primitives' per-family export icon
                      opens this wizard for), so it gets the same second-level
                      picker semantics gets for its modes. Each chip counts the
                      variables it carries, light + dark ramps together, since
                      that's how the Primitives table shows a family too. */}
                  {collections.includes('primitives') && famMeta.length > 1 && (
                    <div className="mt-4 rounded-xl border border-line bg-surface/50 p-3">
                      <div className="flex items-center justify-between gap-2 px-1 pb-2">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-fg-faint">Families</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setFamilies(famMeta.map((f) => f.key))}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
                          >
                            All
                          </button>
                          <button
                            onClick={() => setFamilies([])}
                            className="px-2 py-1 rounded-lg text-[11px] font-medium text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
                          >
                            None
                          </button>
                        </div>
                      </div>
                      <span className="block px-1 pb-2 text-[12px] text-fg-muted">Color · Primitives</span>
                      <div className="flex flex-wrap gap-2 px-1">
                        {famMeta.map((f) => {
                          const on = families.includes(f.key)
                          return (
                            <button
                              key={f.key}
                              onClick={() => toggleFamily(f.key)}
                              aria-pressed={on}
                              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
                                on ? 'border-accent-ui text-accent-ui bg-accent-ui/[0.07]' : 'border-line text-fg-muted hover:text-fg hover:border-line-strong'
                              }`}
                            >
                              {f.label}
                              <span className="text-[11px] font-mono tabular-nums text-fg-faint">{f.count}</span>
                            </button>
                          )
                        })}
                      </div>
                      {families.length === 0 && (
                        <p className="px-1 pt-2.5 text-[12px] text-red-500">Pick at least one family to ship the primitives.</p>
                      )}
                    </div>
                  )}

                  {collections.includes('semantics') && (
                    <div className="mt-4 rounded-xl border border-line bg-surface/50 p-3">
                      <span className="block px-1 pb-2 text-[11px] font-semibold uppercase tracking-widest text-fg-faint">Modes</span>
                      <span className="block px-1 pb-2 text-[12px] text-fg-muted">Color · Semantics</span>
                      <div className="flex flex-wrap gap-2 px-1">
                        {allModes.map((m) => {
                          const on = modes.includes(m)
                          return (
                            <button
                              key={m}
                              onClick={() => toggleMode(m)}
                              aria-pressed={on}
                              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
                                on ? 'border-accent-ui text-accent-ui bg-accent-ui/[0.07]' : 'border-line text-fg-muted hover:text-fg hover:border-line-strong'
                              }`}
                            >
                              {m}
                            </button>
                          )
                        })}
                      </div>
                      {modes.length === 0 && (
                        <p className="px-1 pt-2.5 text-[12px] text-red-500">Pick at least one mode to ship the semantic layer.</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Components — the checkboxes write straight through to
                  `selectedComponents`/`toggleComponent`, the SAME field the
                  Components tab edits, so there's one list of "which
                  components," not a second one that can drift from it. This
                  toggle only takes effect on Escala JSON (Step 2) — the only
                  format with a component payload. */}
              {sourceTab === 'components' && (
                <div className="mt-4 rounded-xl border border-line bg-surface/50 p-3">
                  <button
                    onClick={() => setIncludeComponents((v) => !v)}
                    aria-pressed={includeComponents}
                    className={`flex items-center gap-3 px-2.5 h-11 rounded-lg text-left transition-colors w-full ${
                      includeComponents ? 'bg-accent-ui/[0.07]' : 'hover:bg-elevated/60'
                    }`}
                  >
                    <CheckBox on={includeComponents} />
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[13px] ${includeComponents ? 'text-fg font-medium' : 'text-fg-muted'}`}>
                        Include components in this export
                      </span>
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-fg-faint flex-shrink-0">
                      {selectedComponents.length}/{COMPONENT_KEYS.length}
                    </span>
                  </button>

                  {includeComponents && (
                    <div className="mt-3 pt-3 border-t border-line/60 flex flex-col gap-2.5">
                      <div className="flex items-center gap-2 px-1">
                        <input
                          value={componentSearch}
                          onChange={(e) => setComponentSearch(e.target.value)}
                          placeholder="Search components"
                          aria-label="Search components"
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-line bg-surface text-[12px] text-fg outline-none focus:border-line-strong placeholder:text-fg-faint"
                        />
                        <button
                          onClick={() => setSelectedComponents(COMPONENT_KEYS)}
                          className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
                        >
                          All
                        </button>
                        <button
                          onClick={() => setSelectedComponents([])}
                          className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
                        >
                          None
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto flex flex-col gap-2 px-1">
                        {(() => {
                          const q = componentSearch.trim().toLowerCase()
                          const cats = CATEGORIES.map((cat) => ({
                            cat,
                            items: COMPONENTS.filter(
                              (c) => c.category === cat && (!q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)),
                            ),
                          })).filter((g) => g.items.length > 0)
                          if (cats.length === 0) {
                            return <p className="text-[12px] text-fg-faint py-2">No components match "{componentSearch}".</p>
                          }
                          return cats.map(({ cat, items }) => (
                            <div key={cat} className="flex flex-col gap-0.5">
                              <span className="text-[10px] text-fg-faint uppercase tracking-widest">{cat}</span>
                              {items.map((c) => {
                                const on = selectedComponents.includes(c.key)
                                return (
                                  <button
                                    key={c.key}
                                    onClick={() => toggleComponent(c.key)}
                                    aria-pressed={on}
                                    className={`flex items-center gap-2.5 px-2 h-8 rounded-lg text-left transition-colors ${
                                      on ? 'bg-accent-ui/[0.07]' : 'hover:bg-elevated/60'
                                    }`}
                                  >
                                    <CheckBox on={on} />
                                    <span className={`text-[12.5px] truncate ${on ? 'text-fg' : 'text-fg-muted'}`}>{c.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          ))
                        })()}
                      </div>
                      {selectedComponents.length === 0 && (
                        <p className="px-1 text-[12px] text-fg-faint">No components selected — none will ship.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-[17px] font-semibold text-fg">Format and structure</h2>
              <p className="text-[13px] text-fg-muted mt-1">Choose the output format and how it lands on disk</p>

              <div className="mt-5 rounded-xl border border-line bg-surface/50 p-3">
                <span className="block px-1 pb-2 text-[11px] font-semibold uppercase tracking-widest text-fg-faint">Format</span>
                <div className="flex flex-col gap-2">
                  {WIZARD_FORMATS.map((f) => {
                    const on = format === f.key
                    const isEscala = f.key === 'escala'
                    return (
                      <div
                        key={f.key}
                        className={`rounded-lg border transition-colors ${on ? 'border-accent-ui bg-accent-ui/[0.07]' : 'border-line hover:border-line-strong'}`}
                      >
                        <button onClick={() => setFormat(f.key)} aria-pressed={on} className="flex items-center gap-3 w-full px-3 py-2.5 text-left">
                          <Radio on={on} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className={`block text-[13px] ${on ? 'text-fg font-medium' : 'text-fg'}`}>{f.label}</span>
                              {isEscala && (
                                <span className="px-1.5 py-[1px] rounded-full bg-accent-ui/15 text-accent-ui text-[10px] font-semibold uppercase tracking-wide flex-shrink-0">
                                  Recommended · Figma plugin
                                </span>
                              )}
                            </span>
                            <span className="block text-[12px] text-fg-faint truncate">{f.hint}</span>
                          </span>
                        </button>
                        {/* Escala JSON is only useful if you know what reads it — shown
                            regardless of selection so it informs the choice, not just
                            confirms it after the fact. The download is the same asset
                            FigmaConnectView offers, so there's still one place the plugin
                            package is defined, just a second entry point to grab it. */}
                        {isEscala && (
                          <div className="px-3 pb-3 pl-[42px] flex flex-col gap-1.5">
                            <p className="text-[11px] text-fg-faint leading-relaxed">
                              This is the exact payload the <strong className="text-fg-muted font-medium">Escala Figma plugin</strong> imports —
                              pick it to sync colors, themes and components straight into Figma variables.
                            </p>
                            <a
                              href={FIGMA_PLUGIN_ZIP}
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 self-start text-[11px] font-semibold text-accent-ui hover:underline"
                            >
                              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M7 1.5v8M3.5 6.5 7 10l3.5-3.5" />
                                <path d="M1.5 10.5v1.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-1.5" />
                              </svg>
                              Download the Escala plugin for Figma (.zip)
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-line bg-surface/50 p-3">
                <span className="block px-1 pb-2 text-[11px] font-semibold uppercase tracking-widest text-fg-faint">Output structure</span>
                <div className="flex flex-col gap-2">
                  {STRUCTURES.map((s) => {
                    const on = structure === s.key && !structureLocked
                    const disabled = structureLocked && s.key === 'per-collection'
                    return (
                      <button
                        key={s.key}
                        onClick={() => !disabled && setStructure(s.key)}
                        disabled={disabled}
                        aria-pressed={on}
                        title={disabled ? 'Escala JSON is a single document by contract' : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                          on ? 'border-accent-ui bg-accent-ui/[0.07]' : 'border-line hover:border-line-strong'
                        } ${disabled ? 'opacity-40 cursor-not-allowed hover:border-line' : ''}`}
                      >
                        <Radio on={on || (structureLocked && s.key === 'single')} />
                        <span className="min-w-0">
                          <span className="block text-[13px] text-fg">{s.label}</span>
                          <span className="block text-[12px] text-fg-faint truncate">{s.hint}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-line bg-surface/50 p-3 flex flex-col gap-2">
                <span className="px-1 text-[11px] font-semibold uppercase tracking-widest text-fg-faint">Options</span>
                {format === 'w3c' && (
                  <button
                    onClick={() => setIncludeAliases((v) => !v)}
                    aria-pressed={includeAliases}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-line hover:border-line-strong text-left transition-colors"
                  >
                    <CheckBox on={includeAliases} />
                    <span className="min-w-0">
                      <span className="block text-[13px] text-fg">Include aliases (variable references)</span>
                      <span className="block text-[12px] text-fg-faint truncate">
                        Semantics ship as <code className="font-mono">{'{color.accent.600}'}</code> instead of a loose hex
                      </span>
                    </span>
                  </button>
                )}
                {!isJson && (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-line">
                    <span className="text-[13px] text-fg flex-1">Color format</span>
                    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-elevated/60 border border-line">
                      {COLOR_FORMATS.map((c) => (
                        <button
                          key={c.key}
                          onClick={() => setColorFormat(c.key)}
                          aria-pressed={colorFormat === c.key}
                          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                            colorFormat === c.key ? 'bg-app text-fg shadow-sm' : 'text-fg-faint hover:text-fg'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {isJson && format !== 'w3c' && (
                  <p className="px-3 py-2 text-[12px] text-fg-muted">
                    Escala JSON is the exact payload the Figma plugin imports — keys and values ship verbatim,
                    and it always ships the WHOLE document (typography, spacing, radius…) regardless of the
                    collections picked above, since the plugin needs the full contract to import cleanly.
                    Components are the one part Step 1's toggle controls: on ships{' '}
                    {selectedComponents.length} selected component{selectedComponents.length === 1 ? '' : 's'}{' '}
                    as <code className="font-mono">atoms</code>, off ships none.
                  </p>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-[17px] font-semibold text-fg">Summary and export</h2>
              <p className="text-[13px] text-fg-muted mt-1">Review your settings and start the export</p>

              <div className="mt-5 rounded-xl border border-line bg-surface/50 overflow-hidden">
                <SummaryRow
                  label="Collections"
                  value={format === 'escala' ? 'All (Escala JSON is one document)' : collections.map((c) => meta.find((m) => m.key === c)?.label ?? c).join(', ')}
                />
                {format !== 'escala' && collections.includes('primitives') && (
                  <SummaryRow
                    label="Families"
                    value={allFamilies ? 'All' : famMeta.filter((f) => families.includes(f.key)).map((f) => f.label).join(', ')}
                  />
                )}
                {format !== 'escala' && <SummaryRow label="Variables" value={String(varCount)} />}
                {collections.includes('semantics') && <SummaryRow label="Modes" value={modes.join(', ')} />}
                <SummaryRow label="Format" value={WIZARD_FORMATS.find((f) => f.key === format)?.label ?? format} />
                <SummaryRow label="Structure" value={files.length > 1 ? `${files.length} files` : 'Single file'} />
                {format === 'w3c' && <SummaryRow label="Aliases" value={includeAliases ? 'Included' : 'Resolved to hex'} />}
                {!isJson && <SummaryRow label="Color format" value={colorFormat.toUpperCase()} />}
                <SummaryRow
                  label="Components"
                  value={
                    format !== 'escala'
                      ? 'Not shipped — Escala JSON only'
                      : includeComponents
                        ? `${selectedComponents.length} of ${COMPONENT_KEYS.length}`
                        : 'Not included'
                  }
                />
              </div>

              {done && (
                <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3.5">
                  <span className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
                    Exported {files.length} {files.length === 1 ? 'file' : 'files'} · {varCount} variables
                  </span>
                </div>
              )}

              {/* Save & sync — the payoff step is also where the system gets an
                  identity: name it, keep it in the local registry, optionally
                  wire it to GitHub. This is the ONLY place that flow was
                  missing from — Save & Share already has it, but a first-time
                  user exporting from Variables had no path to it at all. Saves
                  the WHOLE current system, not just this export's scope (same
                  as Save & Share's own Save button), so the helper line below
                  says so explicitly rather than implying "Typography" saved
                  when this wizard opened scoped to Typography. */}
              <div className="mt-4 rounded-xl border border-line bg-surface/50 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-fg-faint">Save this design system</span>
                  {savedEntry && (
                    <span className="text-[11px] text-fg-faint flex-shrink-0">
                      Last saved {timeAgo(savedEntry.savedAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. Acme Design System"
                    aria-label="Design system name"
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-line bg-surface text-[13px] font-medium text-fg outline-none transition-colors placeholder:text-fg-faint placeholder:font-normal focus:border-line-strong"
                  />
                  <button
                    onClick={handleSaveSystem}
                    className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                      justSaved ? 'bg-emerald-500 text-white' : 'bg-fg text-app hover:opacity-90'
                    }`}
                  >
                    {justSaved ? '✓ Saved' : savedEntry ? 'Save changes' : 'Save'}
                  </button>
                </div>
                <p className="text-[11px] text-fg-faint -mt-1">
                  Saves the whole design system to your local registry — not just this export's scope.
                </p>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-line/60">
                  <span className="flex items-center gap-1.5 min-w-0 text-[12px] text-fg-muted">
                    <StatusDot ok={!!githubRepo} />
                    <span className="truncate">
                      {githubRepo
                        ? `${githubRepo}${githubLastPushAt ? ` · pushed ${timeAgo(githubLastPushAt)}` : ''}`
                        : 'Not synced to GitHub'}
                    </span>
                  </span>
                  {onConnectGithub && (
                    <button
                      onClick={onConnectGithub}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-line-strong text-fg hover:bg-elevated transition-colors"
                    >
                      <GitHubGlyph />
                      {githubRepo ? 'Push to GitHub' : 'Connect GitHub'}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1 rounded-xl border border-line bg-surface/50 p-2">
                <button
                  onClick={() => setPreview((v) => !v)}
                  aria-pressed={preview}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${preview ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'}`}
                >
                  Preview
                </button>
                <button
                  onClick={copyAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-fg-muted hover:text-fg transition-colors"
                >
                  {copied ? <><CheckIcon />Copied</> : 'Copy'}
                </button>
                <button
                  onClick={runExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-fg-muted hover:text-fg transition-colors"
                >
                  Download
                </button>
              </div>

              {preview && (
                <div className="mt-3 rounded-xl border border-line bg-surface/40 overflow-hidden">
                  {files.map((f) => (
                    <div key={f.name} className="border-b border-line last:border-b-0">
                      <div className="px-4 py-2 text-[11px] font-mono text-fg-faint bg-elevated/40">{f.name}</div>
                      <pre className="px-4 py-3 text-[12px] leading-relaxed font-mono text-fg-muted whitespace-pre overflow-x-auto max-h-64">
                        {f.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 h-16 border-t border-line flex-shrink-0">
          <button
            onClick={() => (step === 1 ? onClose() : (setStep((s) => (s - 1) as Step), setDone(false)))}
            className="px-4 py-2 rounded-lg text-[13px] font-medium border border-line text-fg-muted hover:text-fg hover:border-line-strong transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => canNext && setStep((s) => (s + 1) as Step)}
              disabled={!canNext}
              className="px-5 py-2 rounded-lg text-[13px] font-semibold bg-accent-ui text-accent-ink disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          ) : (
            <button
              onClick={runExport}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold bg-accent-ui text-accent-ink transition-opacity hover:opacity-90"
            >
              <svg width="13" height="13" viewBox="0 0 11 11" fill="none" aria-hidden>
                <path d="M5.5 1v6M3 5l2.5 2.5L8 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1 8.5v1a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Export
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
