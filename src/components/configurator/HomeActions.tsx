// Header actions — the pill row from the Figma header design originally read
//   + New · ⬆ Import JSON · ▸ Kits
// New (a category menu → NewTokenWizard, a guided 2–3 step flow) and Import
// JSON (this row's entry into ImportSystemModal) are REMOVED, not hidden —
// both flows shipped without enough guardrails to be self-explanatory (no
// preview of what "New" would actually add, no validation feedback on a bad
// JSON paste) and were confusing enough in practice that leaving them live
// did more harm than the feature was worth. `NewTokenWizard.tsx` and
// `ImportSystemModal.tsx` are NOT deleted — same precedent as
// `WorkbenchLayout`/`PickerColor`/`HomeView` (see CLAUDE.md): kept for
// reference, not wired up. Import is still reachable from Save & Share
// (`SaveView`'s own `onImport`, a separate entry point this file never owned).
// Kits is a self-contained "save current as + previous kits" popover over the
// local savedSystems registry — untouched.
// Share was retired earlier for the same "two buttons, one job" reason — it
// opened the exact same ExportWizard as the Export pill, just pre-checked to
// whole-system. Export's own Step 1 still selects every collection manually.

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import HeaderPill from '../ui/HeaderPill'

// ── Pill icons (16–18px on a 24 grid, tracking currentColor) ─────────────────
const FolderIcon: ComponentType = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

// The pill itself is shared with every other section header (ui/HeaderPill).
const Pill = HeaderPill

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

// Compact display name for a theme KEY — 'light'/'dark' capitalize, a custom
// theme's slug (e.g. 'midnight') just gets Title Case. Deliberately simpler
// than Step3's own `themeDisplayName` (which prefixes the accent family's
// name, "Purple light") — that's tuned for the token TABLE, where every
// column needs disambiguating; here it's one dropdown of a handful of
// options the user just created, so the raw name is already unambiguous.
function themeLabel(key: string): string {
  if (key === 'light' || key === 'dark') return key === 'light' ? 'Light' : 'Dark'
  return key.charAt(0).toUpperCase() + key.slice(1)
}

// ── Kits popover — name & save the current system, reopen a previous kit ─────
function KitsPopover({ onClose, previewTheme }: { onClose: () => void; previewTheme: string }) {
  const {
    setProjectName, primaryColor,
    savedSystems, saveCurrentSystem, saveCurrentSystemAsTheme, loadSystem, removeSavedSystem,
    themeOrder,
  } = useDesignStore()
  // Starts EMPTY, not pre-filled with `projectName` — a pre-filled field
  // hides the "e.g. Acme v2" placeholder entirely, so it never actually
  // taught anyone what to type. Empty here still means "keep the current
  // name" (handleSave falls back to it), the field just doesn't LOOK
  // pre-answered.
  const [name, setName] = useState('')
  const [justSaved, setJustSaved] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Local kits only (GitHub-backed systems have their own push flow).
  const kits = savedSystems.filter((s) => s.source !== 'github')

  // The scope question only exists to ASK — with one theme there's nothing to
  // choose between, and asking anyway would be a confirmation dialog for a
  // decision that was never in doubt. Reported as: saving a kit needs to ask
  // whether to carry every created theme or just one, so this fork is what
  // "save current as" actually means once a system has more than one theme.
  const hasMultipleThemes = themeOrder.length > 1
  const [scope, setScope] = useState<'all' | 'one'>('all')
  // Defaults to whichever theme is currently PREVIEWED — the one on screen —
  // not always 'light'; that's the theme the user's most likely to mean by
  // "just this one" at the moment they open the popover.
  const [chosenTheme, setChosenTheme] = useState(() =>
    themeOrder.includes(previewTheme) ? previewTheme : themeOrder[0]
  )

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function handleSave() {
    const trimmed = name.trim()
    if (trimmed) setProjectName(trimmed)
    if (hasMultipleThemes && scope === 'one') saveCurrentSystemAsTheme(chosenTheme)
    else saveCurrentSystem()
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1800)
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-line bg-surface shadow-[0_16px_48px_-12px_rgba(0,0,0,0.28)] z-50 overflow-hidden"
      role="dialog"
      aria-label="Kits"
    >
      <div className="p-4 flex flex-col gap-2.5">
        <h3 className="text-sm font-semibold text-fg">Save current as</h3>
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            placeholder="Name this kit"
            aria-label="Kit name"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-line bg-app text-sm text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-line-strong"
          />
          <button
            onClick={handleSave}
            aria-label="Save kit"
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white transition-colors"
            style={{ backgroundColor: justSaved ? '#10b981' : primaryColor }}
          >
            {justSaved ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8M7 3v5h8" />
              </svg>
            )}
          </button>
        </div>
        {/* Scope choice — only appears once there's an actual choice
            (`hasMultipleThemes`). A segmented pair, not a checkbox: "all" vs
            "just one" are mutually exclusive answers to one question, not an
            independent on/off toggle. */}
        {hasMultipleThemes && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-app border border-line">
              <button
                type="button"
                onClick={() => setScope('all')}
                aria-pressed={scope === 'all'}
                className={`flex-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  scope === 'all' ? 'bg-elevated text-fg shadow-sm' : 'text-fg-faint hover:text-fg-muted'
                }`}
              >
                All themes ({themeOrder.length})
              </button>
              <button
                type="button"
                onClick={() => setScope('one')}
                aria-pressed={scope === 'one'}
                className={`flex-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  scope === 'one' ? 'bg-elevated text-fg shadow-sm' : 'text-fg-faint hover:text-fg-muted'
                }`}
              >
                Just one theme
              </button>
            </div>
            {/* The picker only shows while relevant — same "don't ask a
                question that has only one answer" rule the segmented control
                above follows, applied one level down. */}
            {scope === 'one' && (
              <select
                value={chosenTheme}
                onChange={(e) => setChosenTheme(e.target.value)}
                aria-label="Theme to save"
                className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-app text-xs text-fg outline-none transition-colors focus:border-line-strong"
              >
                {themeOrder.map((t) => (
                  <option key={t} value={t}>{themeLabel(t)}</option>
                ))}
              </select>
            )}
          </div>
        )}
        <p className="text-xs text-fg-faint leading-relaxed">
          {hasMultipleThemes && scope === 'one'
            ? `Saves every primitive plus just the ${themeLabel(chosenTheme)} theme — the others stay out of this kit. Locally in your browser; reusing a name updates that kit.`
            : 'Saved locally in your browser. Reusing a name updates that kit.'}
        </p>
      </div>

      <div className="max-h-64 overflow-y-auto border-t border-line/70">
        {kits.length === 0 ? (
          <p className="px-4 py-6 text-sm text-fg-faint text-center">No kits saved yet.</p>
        ) : (
          <ul className="p-2 flex flex-col gap-0.5">
            {kits.map((kit) => (
              <li key={kit.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-elevated/60 transition-colors">
                <span
                  className="w-3 h-3 rounded-full ring-1 ring-black/10 flex-shrink-0"
                  style={{ backgroundColor: kit.snapshot?.primaryColor ?? '#888' }}
                  aria-hidden
                />
                <button
                  onClick={() => { loadSystem(kit.id); onClose() }}
                  className="flex-1 min-w-0 text-left"
                >
                  <span className="block text-sm font-medium text-fg truncate">{kit.name}</span>
                  <span className="block text-[11px] text-fg-faint">saved {timeAgo(kit.savedAt)}</span>
                </button>
                <button
                  onClick={() => removeSavedSystem(kit.id)}
                  aria-label={`Remove ${kit.name}`}
                  className="flex-shrink-0 p-1 rounded-md text-fg-faint opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-elevated transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-line/70 bg-app/60">
        <span className="text-[11px] text-fg-faint">
          Active: <code className="font-mono text-fg-muted">{primaryColor}</code>
        </span>
      </div>
    </motion.div>
  )
}

// ── The pill row itself (header rightSlot on Home) — Kits only now ──────────
export default function HomeActions({ previewTheme = 'light' }: { previewTheme?: string }) {
  const [kitsOpen, setKitsOpen] = useState(false)
  const kitsBtn = useRef<HTMLButtonElement>(null)

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Pill
          Icon={FolderIcon}
          label="Kits"
          onClick={() => setKitsOpen((v) => !v)}
          buttonRef={kitsBtn}
          aria-haspopup
          aria-expanded={kitsOpen}
        />
        <AnimatePresence>
          {kitsOpen && <KitsPopover onClose={() => setKitsOpen(false)} previewTheme={previewTheme} />}
        </AnimatePresence>
      </div>
    </div>
  )
}
