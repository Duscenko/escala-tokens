import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import {
  buildWizardExport, collectionMeta, selectionCount, WIZARD_FORMATS,
  type WizardCollection, type WizardFormat, type WizardStructure, type WizardSelection,
} from '../../lib/exportWizard'
import { COLOR_FORMATS, type ColorFormat } from '../../lib/sectionExport'

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
        on ? 'bg-accent-ui border-transparent text-white' : 'border-line-strong bg-surface'
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
  initialCollections = ['primitives', 'semantics'],
}: {
  onClose: () => void
  /** Pre-checked collections — the shell passes the section you opened it from,
   *  so "Export" from Typography starts scoped to Typography. */
  initialCollections?: WizardCollection[]
}) {
  // Subscribe so counts track edits made while the wizard is open.
  const store = useDesignStore()
  const meta = useMemo(() => collectionMeta(), [store])
  const allModes = meta.find((m) => m.key === 'semantics')?.modes ?? ['light']

  const [step, setStep] = useState<Step>(1)
  const [collections, setCollections] = useState<WizardCollection[]>(initialCollections)
  const [modes, setModes] = useState<string[]>(allModes)
  const [format, setFormat] = useState<WizardFormat>('w3c')
  const [structure, setStructure] = useState<WizardStructure>('single')
  const [colorFormat, setColorFormat] = useState<ColorFormat>('hex')
  const [includeAliases, setIncludeAliases] = useState(true)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const sel: WizardSelection = { collections, modes, format, structure, colorFormat, includeAliases }
  const files = useMemo(
    () => (collections.length ? buildWizardExport(sel) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collections, modes, format, structure, colorFormat, includeAliases, store],
  )
  const varCount = useMemo(() => selectionCount({ collections, modes }), [collections, modes, store])
  const isJson = format === 'w3c' || format === 'escala'
  // Escala JSON is one document by contract, so structure can't split it.
  const structureLocked = format === 'escala'
  const canNext = step === 1 ? collections.length > 0 && (!collections.includes('semantics') || modes.length > 0) : true

  const toggleCollection = (key: WizardCollection) =>
    setCollections((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]))
  const toggleMode = (m: string) =>
    setModes((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))

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
                      complete ? 'bg-accent-ui text-white' : active ? 'bg-accent-ui text-white' : 'bg-elevated text-fg-faint'
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
              <p className="text-[13px] text-fg-muted mt-1">Pick the collections and modes to include in your export</p>

              <div className="mt-5 rounded-xl border border-line bg-surface/50 p-3">
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-fg-faint">Collections</span>
                  <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-elevated text-fg-muted">
                    {collections.length}/{meta.length}
                  </span>
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

          {step === 2 && (
            <>
              <h2 className="text-[17px] font-semibold text-fg">Format and structure</h2>
              <p className="text-[13px] text-fg-muted mt-1">Choose the output format and how it lands on disk</p>

              <div className="mt-5 rounded-xl border border-line bg-surface/50 p-3">
                <span className="block px-1 pb-2 text-[11px] font-semibold uppercase tracking-widest text-fg-faint">Format</span>
                <div className="flex flex-col gap-2">
                  {WIZARD_FORMATS.map((f) => {
                    const on = format === f.key
                    return (
                      <button
                        key={f.key}
                        onClick={() => setFormat(f.key)}
                        aria-pressed={on}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                          on ? 'border-accent-ui bg-accent-ui/[0.07]' : 'border-line hover:border-line-strong'
                        }`}
                      >
                        <Radio on={on} />
                        <span className="min-w-0">
                          <span className={`block text-[13px] ${on ? 'text-fg font-medium' : 'text-fg'}`}>{f.label}</span>
                          <span className="block text-[12px] text-fg-faint truncate">{f.hint}</span>
                        </span>
                      </button>
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
                    Escala JSON is the exact payload the Figma plugin imports — keys and values ship verbatim.
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
                <SummaryRow label="Collections" value={collections.map((c) => meta.find((m) => m.key === c)?.label ?? c).join(', ')} />
                <SummaryRow label="Variables" value={String(varCount)} />
                {collections.includes('semantics') && <SummaryRow label="Modes" value={modes.join(', ')} />}
                <SummaryRow label="Format" value={WIZARD_FORMATS.find((f) => f.key === format)?.label ?? format} />
                <SummaryRow label="Structure" value={files.length > 1 ? `${files.length} files` : 'Single file'} />
                {format === 'w3c' && <SummaryRow label="Aliases" value={includeAliases ? 'Included' : 'Resolved to hex'} />}
                {!isJson && <SummaryRow label="Color format" value={colorFormat.toUpperCase()} />}
              </div>

              {done && (
                <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3.5">
                  <span className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
                    Exported {files.length} {files.length === 1 ? 'file' : 'files'} · {varCount} variables
                  </span>
                </div>
              )}

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
              className="px-5 py-2 rounded-lg text-[13px] font-semibold bg-accent-ui text-white disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          ) : (
            <button
              onClick={runExport}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold bg-accent-ui text-white transition-opacity hover:opacity-90"
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
