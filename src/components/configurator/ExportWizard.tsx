import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import {
  buildWizardExport, collectionMeta, primitiveFamilyMeta, isAiFormat, selectionCount,
  WIZARD_DESTINATIONS, WIZARD_FORMAT_BADGE, wizardFormatLabel, ALL_WIZARD_COLLECTIONS,
  type WizardCollection, type WizardDestination, type WizardFormat, type WizardStructure, type WizardSelection,
} from '../../lib/exportWizard'
import { type ColorFormat } from '../../lib/sectionExport'
import { slugify, FIGMA_PLUGIN_ZIP } from '../../lib/utils'
import { COMPONENTS, CATEGORIES, COMPONENT_KEYS, isInFigmaSample } from '../../lib/componentCatalogue'
import AgentInstallPanel from './AgentInstallPanel'
import { GitHubGlyph } from '../ui/icons'

// ── Guided export (Source → Where → Export) ────────────────────────────────
// Replaces the one-shot "here's your file" window with a three-step flow, so
// what ships is a deliberate choice: WHICH collections and semantic modes,
// WHERE it goes (Figma / code / AI), then the summary before anything downloads.
// Every step reads live counts from the real token payload, so the numbers on
// screen are the numbers in the file.

type Step = 1 | 2 | 3

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Source' },
  { n: 2, label: 'Where' },
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
        on ? 'bg-accent-solid border-transparent text-accent-ink' : 'border-line-strong bg-surface'
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
      <span className="text-ui text-fg-muted flex-shrink-0">{label}</span>
      <span className="text-ui font-semibold text-fg text-right min-w-0 truncate">{value}</span>
    </div>
  )
}

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ok ? 'bg-status-success-solid' : 'bg-line-strong'}`} aria-hidden />
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

function download(file: { name: string; content: string; binary?: Uint8Array }) {
  const mime = file.name.endsWith('.json') ? 'application/json'
    : file.name.endsWith('.zip') ? 'application/zip'
    : 'text/plain'
  const blob = file.binary
    ? new Blob([toArrayBuffer(file.binary)], { type: mime })
    : new Blob([file.content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(data.byteLength)
  new Uint8Array(copy).set(data)
  return copy
}

export default function ExportWizard({
  onClose,
  onConnectGithub,
  onAddSyncOption,
  initialCollections = ALL_WIZARD_COLLECTIONS,
  initialModes,
  themeScope = null,
  themeScopeLabel,
}: {
  onClose: () => void
  /** Closes the wizard and opens the dedicated GitHub connect flow — the
   *  wizard links out rather than re-implementing PAT auth + repo push
   *  itself, so there's still only ONE GitHub-connect flow in the app. */
  onConnectGithub?: () => void
  /** Closes the wizard and opens the live-sync setup (`FigmaSyncView`). Same
   *  link-out pattern as `onConnectGithub`: Step 2's "Add sync option" is a
   *  door to that one flow, not a second sync UI. Omit ⇒ the link isn't shown. */
  onAddSyncOption?: () => void
  /** Pre-checked collections — the shell passes the section you opened it from,
   *  so "Export" from Typography starts scoped to Typography. Opened with no
   *  scoping (Components, Docs, the bare TopNav pill), it defaults to EVERY
   *  foundation — a whole-system export is the more common ask than a partial
   *  one, and starting partial silently under-shipped anyone who hit Next
   *  without first reading the checklist. */
  initialCollections?: WizardCollection[]
  /** Optional appearance preselection. Theme Preview uses this to open the
   * existing wizard for the selected theme; no second exporter is involved. */
  initialModes?: string[]
  /** Set when the wizard was opened for ONE theme (Theme Preview → Export). The
   *  Step 3 snapshot then names itself after that theme and saves theme-scoped
   *  (`saveCurrentSystemAsTheme`), instead of the whole-project `saveCurrentSystem`. */
  themeScope?: string | null
  /** Display name of `themeScope` (its label, falling back to the key). */
  themeScopeLabel?: string
}) {
  // Subscribe so counts track edits made while the wizard is open.
  const store = useDesignStore()
  const {
    projectName, setProjectName, saveCurrentSystem, saveCurrentSystemAsTheme, savedSystems,
    githubRepo, githubLastPushAt,
    selectedComponents, toggleComponent, setSelectedComponents,
  } = store

  // A theme-scoped run has ONE name: the label edited in Theme Preview's
  // property rail. Keeping a second editable draft here let the visible theme,
  // saved kit and export summary disagree. Whole-system runs still bind their
  // field directly to `projectName`.
  const snapshotName = themeScope ? (themeScopeLabel ?? themeScope) : projectName
  const meta = useMemo(() => collectionMeta(), [store])
  // Of the selected components, how many the live Figma import actually
  // renders as real component nodes today (the fixed 9-item sample sheet) —
  // vs. how many ship as spec-only for code/agents. See isInFigmaSample.
  const figmaRenderedCount = useMemo(
    () => selectedComponents.filter(isInFigmaSample).length,
    [selectedComponents],
  )
  const allModes = meta.find((m) => m.key === 'semantics')?.modes ?? ['light']
  // Primitive families (Accent · Neutral · Error … + customs) — the second
  // level of "what do you want to export?" for the primitives collection,
  // mirroring how `modes` narrows semantics.
  const famMeta = useMemo(() => primitiveFamilyMeta(), [store])

  const [step, setStep] = useState<Step>(1)
  const [collections, setCollections] = useState<WizardCollection[]>(initialCollections)
  const [modes, setModes] = useState<string[]>(() => initialModes?.filter((mode) => allModes.includes(mode)).length ? initialModes.filter((mode) => allModes.includes(mode)) : allModes)
  const [families, setFamilies] = useState<string[]>(famMeta.map((f) => f.key))
  const [format, setFormat] = useState<WizardFormat>('escala')
  // GitHub is a destination but not a generated file format: its existing
  // exporter pushes the canonical repository bundle. Keep this separate so
  // selecting it cannot accidentally create a second export pipeline.
  const [destination, setDestination] = useState<WizardDestination>('escala')
  const [structure, setStructure] = useState<WizardStructure>('single')
  const [colorFormat] = useState<ColorFormat>('hex')
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

  // Same id the matching store action builds — lets the button read "Save
  // changes" once this exact kit already has a registry entry. A theme-scoped
  // run keys off the theme's name (see `buildSavedSystemEntry`'s `nameOverride`).
  const savedId = githubRepo ?? `local:${slugify(snapshotName) || 'design-system'}`
  const savedEntry = savedSystems.find((s) => s.id === savedId)

  function handleSaveSystem() {
    if (themeScope) saveCurrentSystemAsTheme(themeScope, snapshotName)
    else saveCurrentSystem()
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
  const ai = isAiFormat(format)
  // Escala JSON and the AI zips are each one document by contract.
  const isGitHubDestination = destination === 'github'
  const isWholeDocument = format === 'escala' || ai || isGitHubDestination
  const exportActionLabel = isGitHubDestination
    ? 'Continue to GitHub'
    : done
      ? 'Download again'
      : format === 'escala'
        ? 'Download Figma tokens'
        : format === 'w3c'
          ? 'Download W3C tokens'
          : ai
            ? 'Download agent context'
            : `Export ${files.length} ${files.length === 1 ? 'file' : 'files'}`
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

  function selectDestination(next: WizardDestination) {
    setDestination(next)
    if (next === 'github') return
    setFormat(next === 'agent-bundle' && format === 'skill' ? 'skill' : next)
  }

  function runExport() {
    if (isGitHubDestination) {
      onConnectGithub?.()
      return
    }
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
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-semibold flex-shrink-0 transition-colors ${
                      complete ? 'bg-accent-solid text-accent-ink' : active ? 'bg-accent-solid text-accent-ink' : 'bg-elevated text-fg-faint'
                    }`}
                  >
                    {complete ? <CheckIcon /> : s.n}
                  </span>
                  <span className={`text-ui truncate ${active || complete ? 'font-semibold text-accent-ui' : 'text-fg-faint'}`}>
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
              <h2 className="text-title font-semibold text-fg">What do you want to export?</h2>
              <p className="text-ui text-fg-muted mt-1">
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
                  className={`flex-1 flex items-center justify-center gap-2 px-3.5 py-2 rounded-full text-ui font-medium transition-colors ${
                    sourceTab === 'foundations' ? 'bg-app text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  Foundations
                  <span className="text-caption font-mono tabular-nums px-1.5 py-0.5 rounded-full bg-elevated text-fg-faint">
                    {collections.length}/{meta.length}
                  </span>
                </button>
                <button
                  onClick={() => setSourceTab('components')}
                  aria-pressed={sourceTab === 'components'}
                  className={`flex-1 flex items-center justify-center gap-2 px-3.5 py-2 rounded-full text-ui font-medium transition-colors ${
                    sourceTab === 'components' ? 'bg-app text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  Components
                  <span className="text-caption font-mono tabular-nums px-1.5 py-0.5 rounded-full bg-elevated text-fg-faint">
                    {includeComponents ? selectedComponents.length : 0}/{COMPONENT_KEYS.length}
                  </span>
                </button>
              </div>

              {sourceTab === 'foundations' && (
                <>
                  {/* All / None lives INSIDE the checklist card now, paired with
                      a count label — same header-row shape Families and
                      Components already use just below (label left, All/None
                      right, both inside the bordered card the list sits in).
                      It used to float in a bare div above the card, unlabeled
                      and structurally disconnected from what it controlled —
                      the one instance of this pattern in the file that didn't
                      match its own two siblings. */}
                  <div className="mt-4 rounded-xl border border-line bg-surface/50 p-3">
                    <div className="flex items-center justify-between gap-2 px-1 pb-2">
                      <span className="text-caption font-semibold uppercase tracking-widest text-fg-faint">
                        {collections.length} of {meta.length} selected
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCollections(meta.map((c) => c.key))}
                          className="px-2 py-1 rounded-lg text-caption font-medium text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
                        >
                          All
                        </button>
                        <button
                          onClick={() => setCollections([])}
                          className="px-2 py-1 rounded-lg text-caption font-medium text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
                        >
                          None
                        </button>
                      </div>
                    </div>
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
                            <span className={`flex-1 min-w-0 truncate text-ui ${on ? 'text-fg font-medium' : 'text-fg-muted'}`}>
                              {c.label}
                            </span>
                            <span className="text-caption font-mono tabular-nums text-fg-faint flex-shrink-0">{c.count} vars</span>
                            {c.modes && (
                              <span className="text-caption px-2 py-0.5 rounded-full bg-accent-ui/10 text-accent-ui flex-shrink-0">
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
                        <span className="text-caption font-semibold uppercase tracking-widest text-fg-faint">Families</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setFamilies(famMeta.map((f) => f.key))}
                            className="px-2 py-1 rounded-lg text-caption font-medium text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
                          >
                            All
                          </button>
                          <button
                            onClick={() => setFamilies([])}
                            className="px-2 py-1 rounded-lg text-caption font-medium text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
                          >
                            None
                          </button>
                        </div>
                      </div>
                      <span className="block px-1 pb-2 text-body text-fg-muted">Color · Primitives</span>
                      <div className="flex flex-wrap gap-2 px-1">
                        {famMeta.map((f) => {
                          const on = families.includes(f.key)
                          return (
                            <button
                              key={f.key}
                              onClick={() => toggleFamily(f.key)}
                              aria-pressed={on}
                              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-ui font-medium border transition-colors ${
                                on ? 'border-accent-ui text-accent-ui bg-accent-ui/[0.07]' : 'border-line text-fg-muted hover:text-fg hover:border-line-strong'
                              }`}
                            >
                              {f.label}
                              <span className="text-caption font-mono tabular-nums text-fg-faint">{f.count}</span>
                            </button>
                          )
                        })}
                      </div>
                      {families.length === 0 && (
                        <p className="px-1 pt-2.5 text-body text-status-danger">Pick at least one family to ship the primitives.</p>
                      )}
                    </div>
                  )}

                  {collections.includes('semantics') && (
                    <div className="mt-4 rounded-xl border border-line bg-surface/50 p-3">
                      <span className="block px-1 pb-2 text-caption font-semibold uppercase tracking-widest text-fg-faint">Modes</span>
                      <span className="block px-1 pb-2 text-body text-fg-muted">Color · Semantics</span>
                      <div className="flex flex-wrap gap-2 px-1">
                        {allModes.map((m) => {
                          const on = modes.includes(m)
                          return (
                            <button
                              key={m}
                              onClick={() => toggleMode(m)}
                              aria-pressed={on}
                              className={`px-3.5 py-1.5 rounded-full text-ui font-medium border transition-colors ${
                                on ? 'border-accent-ui text-accent-ui bg-accent-ui/[0.07]' : 'border-line text-fg-muted hover:text-fg hover:border-line-strong'
                              }`}
                            >
                              {m}
                            </button>
                          )
                        })}
                      </div>
                      {modes.length === 0 && (
                        <p className="px-1 pt-2.5 text-body text-status-danger">Pick at least one mode to ship the semantic layer.</p>
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
                      <span className={`block text-ui ${includeComponents ? 'text-fg font-medium' : 'text-fg-muted'}`}>
                        Include components in this export
                      </span>
                    </span>
                    <span className="text-caption font-mono tabular-nums text-fg-faint flex-shrink-0">
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
                          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-line bg-surface text-body text-fg outline-none focus:border-line-strong placeholder:text-fg-faint"
                        />
                        <button
                          onClick={() => setSelectedComponents(COMPONENT_KEYS)}
                          className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-caption font-medium text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
                        >
                          All
                        </button>
                        <button
                          onClick={() => setSelectedComponents([])}
                          className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-caption font-medium text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
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
                            return <p className="text-body text-fg-faint py-2">No components match "{componentSearch}".</p>
                          }
                          return cats.map(({ cat, items }) => (
                            <div key={cat} className="flex flex-col gap-0.5">
                              <span className="text-mini text-fg-faint uppercase tracking-widest">{cat}</span>
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
                                    <span className={`text-body truncate ${on ? 'text-fg' : 'text-fg-muted'}`}>{c.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          ))
                        })()}
                      </div>
                      {selectedComponents.length === 0 && (
                        <p className="px-1 text-body text-fg-faint">No components selected — none will ship.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-title font-semibold text-fg">Where is this going?</h2>
              <p className="text-ui text-fg-muted mt-1">Pick the place you work. Not a file format.</p>

              <div className="mt-5 rounded-xl border border-line bg-surface/50 p-3">
                <div className="flex items-center justify-between gap-2 px-1 pb-2">
                  <span className="text-caption font-semibold uppercase tracking-widest text-fg-faint">Destination</span>
                  {onAddSyncOption && (
                    <button
                      type="button"
                      onClick={onAddSyncOption}
                      className="flex items-center gap-1 text-caption font-semibold text-accent-ui hover:underline focus-visible:outline-none focus-visible:underline"
                    >
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                        <path d="M7 2.75v8.5M2.75 7h8.5" />
                      </svg>
                      Add sync option
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {WIZARD_DESTINATIONS.map((f) => {
                    const isGitHub = f.key === 'github'
                    const on = isGitHub
                      ? isGitHubDestination
                      : f.key === 'agent-bundle'
                        ? !isGitHubDestination && ai
                        : !isGitHubDestination && destination === f.key
                    const isEscala = f.key === 'escala'
                    const badge = f.key === 'github' ? 'Repository' : WIZARD_FORMAT_BADGE[f.key]
                    return (
                      <div
                        key={f.key}
                        className={`rounded-lg border transition-colors ${on ? 'border-accent-ui bg-accent-ui/[0.07]' : 'border-line hover:border-line-strong'}`}
                      >
                        <button
                          onClick={() => selectDestination(f.key)}
                          aria-pressed={on}
                          className="flex items-center gap-3 w-full px-3 py-2.5 text-left"
                        >
                          <Radio on={on} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 flex-wrap">
                              <span className={`block text-ui ${on ? 'text-fg font-medium' : 'text-fg'}`}>{f.label}</span>
                              {badge && (
                                <span
                                  className={`px-1.5 py-[1px] rounded-full text-mini font-semibold uppercase tracking-wide flex-shrink-0 ${
                                    isEscala
                                      ? 'bg-accent-ui/15 text-accent-ui'
                                      : 'border border-line-strong text-fg-faint'
                                  }`}
                                >
                                  {badge}
                                </span>
                              )}
                            </span>
                            <span className="block text-body text-fg-faint">{f.hint}</span>
                          </span>
                        </button>
                        {isEscala && (
                          <div className="px-3 pb-3 pl-[42px] flex flex-col gap-1.5">
                            <p className="text-caption text-fg-faint leading-relaxed">
                              This is the exact payload the <strong className="text-fg-muted font-medium">Escala Figma plugin</strong> imports —
                              the same JSON Sync already publishes.
                            </p>
                            <a
                              href={FIGMA_PLUGIN_ZIP}
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 self-start text-caption font-semibold text-accent-ui hover:underline"
                            >
                              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M7 1.5v8M3.5 6.5 7 10l3.5-3.5" />
                                <path d="M1.5 10.5v1.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-1.5" />
                              </svg>
                              Download the Escala plugin for Figma (.zip)
                            </a>
                          </div>
                        )}
                        {f.key === 'agent-bundle' && on && (
                          <div className="px-3 pb-3 pl-[42px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setFormat(format === 'skill' ? 'agent-bundle' : 'skill')
                              }}
                              aria-pressed={format === 'skill'}
                              className="flex items-start gap-2.5 text-left"
                            >
                              <CheckBox on={format === 'skill'} />
                              <span className="min-w-0">
                                <span className="block text-body text-fg">Figma Make only (smaller zip)</span>
                                <span className="block text-caption text-fg-faint leading-relaxed">
                                  Cursor and Claude want the full package. Make uploads the smaller zip as-is.
                                </span>
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {isGitHubDestination ? (
                <div className="mt-4 rounded-xl border border-line bg-surface/50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-fg-muted"><GitHubGlyph size={14} /></span>
                    <div className="min-w-0">
                      <p className="text-ui font-medium text-fg">Publish the complete system to a repository</p>
                      <p className="mt-1 text-body leading-relaxed text-fg-faint">
                        Escala will use the existing GitHub exporter to commit <code className="font-mono text-fg-muted">tokens.json</code>, <code className="font-mono text-fg-muted">variables.css</code>, <code className="font-mono text-fg-muted">README.md</code> and the restorable system snapshot.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
              {format === 'w3c' && (
              <div className="mt-4 rounded-xl border border-line bg-surface/50 p-3">
                <span className="block px-1 pb-2 text-caption font-semibold uppercase tracking-widest text-fg-faint">Output structure</span>
                <div className="flex flex-col gap-2">
                  {STRUCTURES.map((s) => {
                    const on = structure === s.key
                    return (
                      <button
                        key={s.key}
                        onClick={() => setStructure(s.key)}
                        aria-pressed={on}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                          on ? 'border-accent-ui bg-accent-ui/[0.07]' : 'border-line hover:border-line-strong'
                        }`}
                      >
                        <Radio on={on} />
                        <span className="min-w-0">
                          <span className="block text-ui text-fg">{s.label}</span>
                          <span className="block text-body text-fg-faint truncate">{s.hint}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              )}

              <div className="mt-4 rounded-xl border border-line bg-surface/50 p-3 flex flex-col gap-2">
                <span className="px-1 text-caption font-semibold uppercase tracking-widest text-fg-faint">Options</span>
                {format === 'w3c' && (
                  <>
                    <button
                      onClick={() => setIncludeAliases((v) => !v)}
                      aria-pressed={includeAliases}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-line hover:border-line-strong text-left transition-colors"
                    >
                      <CheckBox on={includeAliases} />
                      <span className="min-w-0">
                        <span className="block text-ui text-fg">Include aliases (variable references)</span>
                        <span className="block text-body text-fg-faint truncate">
                          Semantics ship as <code className="font-mono">{'{color.accent.600}'}</code> instead of a loose hex
                        </span>
                      </span>
                    </button>
                    {/* An alias into a `color` tree this run doesn't write is
                        unresolvable — no importer (Tokens Studio, Figma
                        Variables, Style Dictionary) can follow a reference to a
                        file/section that was never shipped, and that's the
                        reliable way a W3C export "won't import" or errors on
                        open. `buildWizardExport` already falls back to hex in
                        this exact case (see `w3cTreeFor`), so this is only
                        telling the truth about output the checkbox above can't. */}
                    {includeAliases && collections.includes('semantics') && !collections.includes('primitives') && (
                      <p className="px-3 text-caption text-fg-faint leading-snug">
                        Primitives isn't part of this export, so aliases have nothing to point at —
                        Semantics will ship resolved hex values regardless of this toggle.
                      </p>
                    )}
                  </>
                )}
                {format === 'escala' && (
                  <>
                    <p className="px-3 py-2 text-body text-fg-muted">
                      Figma always ships the whole document (typography, spacing, radius…) regardless of
                      the collections picked above — the plugin needs the full contract to import cleanly.
                      Components are the one part Step 1&apos;s toggle controls: on ships{' '}
                      {selectedComponents.length} selected component{selectedComponents.length === 1 ? '' : 's'}{' '}
                      as <code className="font-mono">atoms</code>, off ships none.
                    </p>
                    {includeComponents && selectedComponents.length > 0 && (
                      <p className="px-3 pb-2 text-body text-fg-muted">
                        Of those, the import renders <strong className="text-fg font-medium">{figmaRenderedCount}</strong> as real
                        components in the file today (the '⬡ Components Overview' sample sheet — building
                        all 58 as variants locks Figma on import). The remaining{' '}
                        {selectedComponents.length - figmaRenderedCount} still ship as full specs for your
                        coding agent.
                      </p>
                    )}
                  </>
                )}
                {ai && (
                  <p className="px-3 py-2 text-body text-fg-muted">
                    {format === 'skill'
                      ? 'The smaller zip is what Figma Make uploads as-is. Collections picked above are ignored.'
                      : 'The zip is the guide your agent reads, plus checkers and templates, generated from this system. Drop the unzipped folder into the product repo — not Escala. Collections picked above are ignored.'}
                  </p>
                )}
              </div>
                </>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-title font-semibold text-fg">{isGitHubDestination ? 'Review GitHub delivery' : 'Summary and export'}</h2>
              <p className="text-ui text-fg-muted mt-1">
                {isGitHubDestination ? 'Confirm the repository bundle, then continue to connect and push it.' : 'Review your settings and deliver the selected artifact.'}
              </p>

              <div className="mt-5 rounded-xl border border-line bg-surface/50 overflow-hidden">
                <SummaryRow
                  label="Collections"
                  value={
                    isGitHubDestination ? 'All (GitHub publishes the complete system)'
                      : format === 'escala' ? 'All (Figma needs the full contract)'
                      : ai ? 'All (one package)'
                        : collections.map((c) => meta.find((m) => m.key === c)?.label ?? c).join(', ')
                  }
                />
                {!isWholeDocument && collections.includes('primitives') && (
                  <SummaryRow
                    label="Families"
                    value={allFamilies ? 'All' : famMeta.filter((f) => families.includes(f.key)).map((f) => f.label).join(', ')}
                  />
                )}
                {!isWholeDocument && <SummaryRow label="Variables" value={String(varCount)} />}
                {(collections.includes('semantics') || ai || isGitHubDestination) && (
                  <SummaryRow label="Modes" value={isGitHubDestination ? 'All' : modes.join(', ')} />
                )}
                <SummaryRow label="Going to" value={isGitHubDestination ? 'GitHub repository' : wizardFormatLabel(format)} />
                <SummaryRow label="Structure" value={isGitHubDestination ? 'Repository bundle · 4 files' : files.length > 1 ? `${files.length} files` : 'Single file'} />
                {/* Mirrors `w3cTreeFor`'s own condition exactly — aliases only ever
                    ship when Primitives is part of THIS export, or the row
                    would claim "Included" for a file shipping hex. */}
                {format === 'w3c' && (
                  <SummaryRow
                    label="Aliases"
                    value={includeAliases && collections.includes('primitives') ? 'Included' : 'Resolved to hex'}
                  />
                )}
                <SummaryRow
                  label="Components"
                  value={
                    isGitHubDestination
                      ? 'Included in tokens.json'
                      : format !== 'escala'
                      ? 'Not shipped — Figma only'
                      : includeComponents
                        ? `${selectedComponents.length} of ${COMPONENT_KEYS.length} · ${figmaRenderedCount} render in Figma`
                        : 'Not included'
                  }
                />
              </div>

              {done && !isGitHubDestination && (
                <div className="mt-4 rounded-xl border border-status-success/40 bg-status-success/10 px-4 py-3.5">
                  <span className="text-ui font-medium text-status-success">
                    Downloaded {files.length} {files.length === 1 ? 'file' : 'files'}
                    {!isWholeDocument ? ` · ${varCount} variables` : ''}
                  </span>
                </div>
              )}

              {ai && !isGitHubDestination && (
                <div className="mt-4">
                  <AgentInstallPanel
                    key={format}
                    initialClient={format === 'skill' ? 'make' : 'cursor'}
                    variant="export"
                  />
                </div>
              )}

              {/* Local saving stays separate from a downloaded export. GitHub
                  changes that payoff: its own exporter commits the restorable
                  snapshot alongside the three delivery files. */}
              <div className="mt-4 rounded-xl border border-line bg-surface/50 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-caption font-semibold uppercase tracking-widest text-fg-faint">
                    {isGitHubDestination ? 'GitHub exporter' : <>Save a reusable snapshot <span className="normal-case font-medium tracking-normal">(optional)</span></>}
                  </span>
                  {!isGitHubDestination && savedEntry && (
                    <span className="text-caption text-fg-faint flex-shrink-0">
                      Last saved {timeAgo(savedEntry.savedAt)}
                    </span>
                  )}
                </div>
                {isGitHubDestination ? (
                  <p className="text-body leading-relaxed text-fg-muted">
                    Review the repository, authentication and commit in the dedicated GitHub flow. A successful push also stores a restorable <code className="font-mono text-caption">.escala/system.json</code> snapshot.
                  </p>
                ) : (
                <div className="flex items-center gap-2">
                  {themeScope ? (
                    <div aria-label="Snapshot name (matches the theme)" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
                      <span className="flex-shrink-0 text-caption text-fg-faint">Name</span>
                      <span className="truncate text-ui font-medium text-fg">{snapshotName}</span>
                    </div>
                  ) : (
                    <input
                      value={snapshotName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. Acme Design System"
                      aria-label="Design system name"
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-line bg-surface text-ui font-medium text-fg outline-none transition-colors placeholder:text-fg-faint placeholder:font-normal focus:border-line-strong"
                    />
                  )}
                  <button
                    onClick={handleSaveSystem}
                    className={`flex-shrink-0 px-3.5 py-2 rounded-lg text-ui font-semibold border transition-colors ${
                      justSaved ? 'border-status-success bg-status-success-solid text-white' : 'border-line-strong bg-app text-fg hover:bg-elevated'
                    }`}
                  >
                    {justSaved ? '✓ Saved' : savedEntry ? 'Save changes' : 'Save snapshot'}
                  </button>
                </div>
                )}
                {!isGitHubDestination && themeScope && (
                  <p className="text-caption text-fg-faint -mt-1">
                    This run exports one theme — the snapshot is named after it (<span className="font-medium text-fg-muted">{themeScopeLabel ?? themeScope}</span>) and saved as its own kit in the local registry, separate from the whole-system one. Exporting never saves it automatically.
                  </p>
                )}
                {!isGitHubDestination && !themeScope && (
                  <p className="text-caption text-fg-faint -mt-1">
                    Saves the whole design system to your local registry. Exporting never saves it automatically.
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-line/60">
                  <span className="flex items-center gap-1.5 min-w-0 text-body text-fg-muted">
                    <StatusDot ok={!!githubRepo} />
                    <span className="truncate">
                      {githubRepo
                        ? `${githubRepo}${githubLastPushAt ? ` · pushed ${timeAgo(githubLastPushAt)}` : ''}`
                        : 'GitHub — not connected'}
                    </span>
                  </span>
                  {onConnectGithub && (
                    <button
                      onClick={onConnectGithub}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-body font-semibold border border-line-strong text-fg hover:bg-elevated transition-colors"
                    >
                      <GitHubGlyph />
                      {isGitHubDestination ? (githubRepo ? 'Open GitHub exporter' : 'Connect GitHub') : (githubRepo ? 'Push to GitHub' : 'Connect GitHub')}
                    </button>
                  )}
                </div>
              </div>

              {!isGitHubDestination && <div className="mt-4 flex items-center gap-1 rounded-xl border border-line bg-surface/50 p-2">
                <button
                  onClick={() => setPreview((v) => !v)}
                  aria-pressed={preview}
                  className={`px-3 py-1.5 rounded-lg text-ui font-medium transition-colors ${preview ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'}`}
                >
                  Preview
                </button>
                <button
                  onClick={copyAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-ui font-medium text-fg-muted hover:text-fg transition-colors"
                >
                  {copied ? <><CheckIcon />Copied</> : 'Copy'}
                </button>
              </div>}

              {preview && !isGitHubDestination && (
                <div className="mt-3 rounded-xl border border-line bg-surface/40 overflow-hidden">
                  {files.map((f) => (
                    <div key={f.name} className="border-b border-line last:border-b-0">
                      <div className="px-4 py-2 text-caption font-mono text-fg-faint bg-elevated/40">
                        {f.binary ? `${f.name} · the guide your agent reads` : f.name}
                      </div>
                      <pre className="px-4 py-3 text-body leading-relaxed font-mono text-fg-muted whitespace-pre overflow-x-auto max-h-64">
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
            className="px-4 py-2 rounded-lg text-ui font-medium border border-line text-fg-muted hover:text-fg hover:border-line-strong transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => canNext && setStep((s) => (s + 1) as Step)}
              disabled={!canNext}
              className="px-5 py-2 rounded-lg text-ui font-semibold bg-accent-solid text-accent-ink disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          ) : (
            <button
              onClick={runExport}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-ui font-semibold bg-accent-solid text-accent-ink transition-opacity hover:opacity-90"
            >
              {isGitHubDestination ? <GitHubGlyph size={13} /> : (
                <svg width="13" height="13" viewBox="0 0 11 11" fill="none" aria-hidden>
                  <path d="M5.5 1v6M3 5l2.5 2.5L8 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M1 8.5v1a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              )}
              {exportActionLabel}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
