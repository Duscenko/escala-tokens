// Import your design system — a two-step modal: intake (paste JSON or drop a
// .json file) → review (what was detected / what gets created by default, with
// an opt-in "Organize & normalize" pass), then confirm to adopt the import as a
// NEW system (registered in savedSystems with 'imported' provenance).

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import {
  parseTokenSource, analyzeTokens, materializeImport,
  type ImportAnalysis, type FamilyPick, type FoundationKey,
} from '../../lib/tokenImport'
import { ALL_ROLES } from '../../lib/semanticRoles'

const MAX_JSON_BYTES = 2 * 1024 * 1024 // 2 MB

const FOUNDATION_LABELS: Record<FoundationKey, string> = {
  spacing: 'Spacing', radius: 'Radius',
  shadows: 'Shadows', grid: 'Grid', sizes: 'Sizes', typography: 'Typography',
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: 'detected' | 'derived' | 'default' }) {
  const styles = {
    detected: 'bg-status-success/10 text-status-success',
    derived: 'bg-status-info/10 text-status-info',
    default: 'bg-elevated text-fg-faint',
  }[status]
  const label = { detected: 'Detected', derived: 'Derived', default: 'Defaults' }[status]
  return <span className={`px-2 py-0.5 rounded-full text-mini font-semibold uppercase tracking-wide ${styles}`}>{label}</span>
}

function RampStrip({ pick }: { pick: FamilyPick }) {
  return (
    <div className="flex rounded-md overflow-hidden border border-line h-5 w-40 flex-shrink-0">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className="flex-1" style={{ backgroundColor: pick.scale[i + 1] }} />
      ))}
    </div>
  )
}

function FamilyRow({ label, pick }: { label: string; pick?: FamilyPick }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs font-medium text-fg w-20 flex-shrink-0">{label}</span>
      {pick ? (
        <>
          <RampStrip pick={pick} />
          <span className="text-caption text-fg-faint truncate">
            {pick.source === 'ramp'
              ? `“${pick.name}” — ${pick.preservedTones.length}/12 tones from your file`
              : `from “${pick.name}” (${pick.baseHex}) — ramp generated`}
          </span>
        </>
      ) : (
        <span className="text-caption text-fg-faint">not in the file — generated for you</span>
      )}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────────

export default function ImportSystemModal({
  onClose,
  onImported,
}: {
  onClose: () => void
  /** Called after the snapshot is applied — the shell closes + navigates Home. */
  onImported: () => void
}) {
  const { applyImportedSystem, githubRepo, savedSystems, projectName } = useDesignStore()
  const [step, setStep] = useState<'intake' | 'review'>('intake')
  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsedJson, setParsedJson] = useState<unknown>(null)
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null)
  const [normalize, setNormalize] = useState(false)
  const [mergeFamilies, setMergeFamilies] = useState(true)
  const [systemName, setSystemName] = useState('')
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (file.size > MAX_JSON_BYTES) {
      setParseError('That file is over 2 MB — token files are much smaller. Is this the right JSON?')
      return
    }
    const text = await file.text()
    setRawText(text)
    setFileName(file.name)
    setParseError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function runAnalysis() {
    setParseError(null)
    const parsed = parseTokenSource(rawText)
    if (!parsed.ok) { setParseError(parsed.error); return }
    const result = analyzeTokens(parsed.json, { consolidate: mergeFamilies })
    if (!result.ok) { setParseError(result.error); return }
    setParsedJson(parsed.json)
    setAnalysis(result.analysis)
    setNormalize(result.analysis.issues.some((i) => i.kind === 'off-ramp-semantic' || i.kind === 'partial-ramp'))
    setSystemName(
      result.analysis.sourceName ??
      (fileName ? fileName.replace(/\.json$/i, '').replace(/[-_]/g, ' ') : 'Imported system'),
    )
    setStep('review')
  }

  // Re-run the analysis with the merge/fix pass on or off — it's pure and fast.
  function toggleMerge(v: boolean) {
    setMergeFamilies(v)
    if (parsedJson === null) return
    const result = analyzeTokens(parsedJson, { consolidate: v })
    if (result.ok) setAnalysis(result.analysis)
  }

  function confirmImport() {
    if (!analysis) return
    const snapshot = materializeImport(analysis, { name: systemName, normalize })
    applyImportedSystem(snapshot)
    onImported()
  }

  // The current system is "safe" when it's already in the registry (its id
  // matches a saved entry) — otherwise importing discards unsaved work.
  const currentIsSaved = savedSystems.some(
    (s) => s.id === githubRepo || s.name === projectName,
  )

  const mappedLight = analysis?.semantics.mapped.filter((m) => m.theme === 'light').length ?? 0
  const mappedDark = analysis?.semantics.mapped.filter((m) => m.theme === 'dark').length ?? 0
  const totalRoles = ALL_ROLES.length

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
      aria-label="Import your design system"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-app border border-line shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 h-14 border-b border-line flex-shrink-0">
          <h2 className="text-sm font-semibold text-fg">
            {step === 'intake' ? 'Import your design system' : 'Review import'}
          </h2>
          <span className="text-caption text-fg-faint truncate">
            {step === 'intake'
              ? 'any tokens JSON — we detect its structure'
              : fileName ?? 'pasted JSON'}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg hover:bg-elevated/60 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4">
          {step === 'intake' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="import-json" className="text-xs font-medium text-fg">Paste your tokens JSON</label>
                <p className="text-caption text-fg-faint">
                  Any structure works — our own tokens.json, W3C design tokens ($value), Tailwind-style
                  palettes, or ad-hoc maps. We detect ramps, semantic tokens and foundations, and generate
                  whatever's missing.
                </p>
                <textarea
                  id="import-json"
                  value={rawText}
                  onChange={(e) => { setRawText(e.target.value); setFileName(null); setParseError(null) }}
                  rows={9}
                  spellCheck={false}
                  placeholder={'{\n  "colors": { "primary": { "500": "#7c3aed", … } },\n  "spacing": { "1": "4px", … }\n}'}
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 font-mono text-body leading-relaxed text-fg placeholder:text-fg-faint focus:border-fg outline-none transition-colors resize-none"
                />
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files) }}
                className={`rounded-xl border-2 border-dashed p-5 flex flex-col items-center justify-center gap-2 text-center transition-colors ${
                  dragging ? 'border-fg bg-elevated/50' : 'border-line-strong bg-surface/50'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-muted" aria-hidden>
                  <path d="M12 15V3m0 0L7 8m5-5 5 5M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
                </svg>
                <p className="text-xs text-fg-muted">
                  {fileName ? <span className="font-medium text-fg">{fileName} loaded</span> : 'or drop a .json file here'}
                </p>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="text-caption font-medium text-fg-muted hover:text-fg border border-line hover:border-line-strong rounded-lg px-3 py-1.5 transition-colors"
                >
                  Browse files
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => void handleFiles(e.target.files)}
                  className="hidden"
                />
              </div>

              {parseError && (
                <div className="rounded-xl border border-status-danger/30 bg-status-danger/5 px-4 py-3 text-xs text-status-danger">
                  {parseError}
                </div>
              )}
            </>
          ) : analysis && (
            <>
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="import-name" className="text-xs font-medium text-fg">System name</label>
                <input
                  id="import-name"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-fg outline-none transition-colors"
                />
              </div>

              {analysis.fastPath === 'escala' && (
                <div className="rounded-xl border border-line bg-surface/60 px-4 py-2.5 text-caption text-fg-muted">
                  ✓ Recognized as an Escala export — everything maps 1:1.
                </div>
              )}

              {/* Colors */}
              <section className="rounded-xl border border-line bg-surface p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xs font-semibold text-fg">Color families</h3>
                  <StatusPill status={analysis.families.accent || analysis.families.neutral ? 'detected' : 'default'} />
                </div>
                <FamilyRow label="Accent" pick={analysis.families.accent} />
                <FamilyRow label="Neutral" pick={analysis.families.neutral} />
                {analysis.families.grayDark && (
                  <FamilyRow label="Dark neutral" pick={analysis.families.grayDark} />
                )}
                <FamilyRow label="Error" pick={analysis.families.error} />
                <FamilyRow label="Warning" pick={analysis.families.warning} />
                <FamilyRow label="Success" pick={analysis.families.success} />
                <FamilyRow label="Info" pick={analysis.families.info} />
                {analysis.families.custom.map((c) => (
                  <FamilyRow key={c.name} label={c.name} pick={c} />
                ))}
              </section>

              {/* Semantics */}
              <section className="rounded-xl border border-line bg-surface p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-fg">Semantic tokens</h3>
                  <StatusPill status={mappedLight + mappedDark > 0 ? 'detected' : 'derived'} />
                </div>
                <p className="text-caption text-fg-muted leading-relaxed">
                  {mappedLight > 0
                    ? <>Light: <span className="font-medium text-fg">{mappedLight} of {totalRoles}</span> roles mapped from your file · {totalRoles - mappedLight} derived from your primitives.</>
                    : <>No semantic layer detected — all {totalRoles} roles derived from your primitives.</>}
                  {' '}
                  {mappedDark > 0
                    ? <>Dark: <span className="font-medium text-fg">{mappedDark}</span> mapped · rest derived.</>
                    : <>Dark theme created automatically.</>}
                </p>
                {analysis.semantics.unmapped.length > 0 && (
                  <p className="text-caption text-fg-faint">
                    {analysis.semantics.unmapped.length} color token{analysis.semantics.unmapped.length > 1 ? 's' : ''} didn't match any role and won't be imported.
                  </p>
                )}
              </section>

              {/* Foundations */}
              <section className="rounded-xl border border-line bg-surface p-4 flex flex-col gap-1.5">
                <h3 className="text-xs font-semibold text-fg mb-1">Foundations</h3>
                {(Object.keys(FOUNDATION_LABELS) as FoundationKey[]).map((k) => {
                  const r = analysis.foundations[k]
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <span className="text-xs text-fg w-24 flex-shrink-0">{FOUNDATION_LABELS[k]}</span>
                      <StatusPill status={r.status} />
                      <span className="text-caption text-fg-faint">
                        {r.status === 'detected' ? `${r.count} token${r.count > 1 ? 's' : ''} from your file` : 'Escala defaults'}
                      </span>
                    </div>
                  )
                })}
              </section>

              {/* Issues + merge/normalize offers */}
              {(analysis.issues.length > 0 || analysis.merge || !mergeFamilies) && (
                <section className="rounded-xl border border-line bg-surface p-4 flex flex-col gap-2">
                  <h3 className="text-xs font-semibold text-fg">Needs attention</h3>
                  <ul className="flex flex-col gap-1">
                    {analysis.issues.map((issue, i) => (
                      <li key={i} className="text-caption text-fg-muted leading-relaxed flex gap-1.5">
                        <span className="text-status-warning flex-shrink-0">•</span>
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                  {(analysis.merge || !mergeFamilies) && (
                    <label className="flex items-start gap-2.5 mt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={mergeFamilies}
                        onChange={(e) => toggleMerge(e.target.checked)}
                        className="mt-0.5 accent-current"
                      />
                      <span className="text-xs text-fg">
                        Merge &amp; fix tokens
                        <span className="block text-caption text-fg-faint font-normal mt-0.5">
                          Collapse light/dark/alpha ramp variants into single families — one accent
                          (extras become accent-2), one neutral, and the four state colors.
                          {analysis.merge && ` Merged ${analysis.merge.variantsMerged} variants · skipped ${analysis.merge.alphaDropped} alpha twins.`}
                        </span>
                      </span>
                    </label>
                  )}
                  <label className="flex items-start gap-2.5 mt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={normalize}
                      onChange={(e) => setNormalize(e.target.checked)}
                      className="mt-0.5 accent-current"
                    />
                    <span className="text-xs text-fg">
                      Organize &amp; normalize
                      <span className="block text-caption text-fg-faint font-normal mt-0.5">
                        Snap off-ramp semantic values onto their family ramps. Exports normalize
                        either way — this just keeps the editor consistent from the start.
                      </span>
                    </span>
                  </label>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 h-14 border-t border-line flex-shrink-0">
          {step === 'intake' ? (
            <>
              <button onClick={onClose} className="text-xs text-fg-faint hover:text-fg transition-colors">Cancel</button>
              <button
                onClick={runAnalysis}
                disabled={!rawText.trim()}
                className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-fg text-app hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                Analyze
              </button>
            </>
          ) : confirmingLeave ? (
            <>
              <span className="text-caption text-fg-muted flex-1 min-w-0">
                {githubRepo
                  ? `Import as a new system? Anything changed since your last push to ${githubRepo} will be lost.`
                  : 'Import as a new system? Your current unsaved system will be lost.'}
              </span>
              <button onClick={confirmImport} className="text-xs font-medium text-status-danger hover:text-status-danger transition-colors flex-shrink-0">
                Import anyway
              </button>
              <button onClick={() => setConfirmingLeave(false)} className="text-xs text-fg-faint hover:text-fg transition-colors flex-shrink-0">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setStep('intake')} className="text-xs text-fg-faint hover:text-fg transition-colors">Back</button>
              <button
                onClick={() => (currentIsSaved ? confirmImport() : setConfirmingLeave(true))}
                disabled={!systemName.trim()}
                className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-fg text-app hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                Import system
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
