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
import { useDesignStore, DEFAULT_ACCENT } from '../../store/useDesignStore'
import { isLiveEnvironment, publishTokens } from '../../lib/figmaSync'
import { useApplyAccentColor } from '../../lib/colorActions'
import HeaderPill from '../ui/HeaderPill'

// ── Pill icons (16–18px on a 24 grid, tracking currentColor) ─────────────────
const FolderIcon: ComponentType = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const ResetIcon: ComponentType = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 12a9 9 0 1 0 2.6-6.4M3 4v5h5" />
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

// ── Save popover — name & save the current system, reopen a previous kit ─────
// Named "Save" in the UI; the saved entries are still "kits" (the store's
// `savedSystems` registry) and the internal flow is unchanged — the rename is
// about the ACTION the button performs, which is what a header pill labels.
function KitsPopover({ onClose, previewTheme }: { onClose: () => void; previewTheme: string }) {
  const {
    setProjectName, primaryColor, projectName,
    savedSystems, saveCurrentSystem, saveCurrentSystemAsTheme, loadSystem, removeSavedSystem,
    themeOrder,
  } = useDesignStore()
  // Which kit is currently on screen. The sync URL is derived from the project
  // name (figmaSync's `syncProjectId`), and `handleSave` sets the project name
  // from the kit's name — so the kit whose name matches the active project is
  // the one an installed plugin is actually pointed at. That's the fact the
  // row badge reports; without it "Sync" on a row looks like it publishes to
  // one shared endpoint, which it does not.
  const activeKitName = projectName.trim().toLowerCase()
  // Per-kit publish state, keyed by kit id — one row can be mid-publish while
  // the rest stay idle.
  const [syncing, setSyncing] = useState<string | null>(null)
  const [synced, setSynced] = useState<string | null>(null)
  // `/api/tokens` is a deployed function; `vite dev` has no such route, so the
  // action is disabled rather than silently failing on localhost.
  const canSync = isLiveEnvironment()
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

  // Load a kit and publish it in one action — the shortcut this popover exists
  // to provide. It genuinely LOADS first: publishTokens() serializes whatever
  // is in the store right now, so publishing without loading would push the
  // system currently on screen under the clicked kit's name.
  async function handleSyncKit(id: string) {
    if (!canSync || syncing) return
    loadSystem(id)
    setSyncing(id)
    // One frame, so the store's new state is what generateTokenJSON reads.
    await new Promise((r) => setTimeout(r, 0))
    const ok = await publishTokens()
    setSyncing(null)
    if (ok) {
      setSynced(id)
      setTimeout(() => setSynced((cur) => (cur === id ? null : cur)), 2000)
    }
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
            {kits.map((kit) => {
              const isActive = kit.name.trim().toLowerCase() === activeKitName
              return (
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
                  <span className="block text-[11px] text-fg-faint">
                    saved {timeAgo(kit.savedAt)}
                    {/* Each kit publishes to ITS OWN endpoint — see
                        `activeKitName`. Marking the live one is the whole
                        point of surfacing sync here: otherwise you can't tell
                        which kit the plugin in Figma is reading. */}
                    {isActive && canSync && <span className="text-fg-muted"> · live</span>}
                  </span>
                </button>
                {/* Sync shortcut: load this kit AND publish it, without a trip
                    through the Sync screen. A small LABELLED button, not an
                    icon — a circular-arrow glyph reads as "reload"/"revert"
                    just as easily as "publish", and on a row that also offers
                    load-on-click and delete, guessing wrong is expensive. The
                    word carries the state too (Sync → Syncing… → Synced), so
                    there's no spinner to decode either. */}
                <button
                  onClick={() => handleSyncKit(kit.id)}
                  disabled={!canSync || syncing !== null}
                  title={canSync
                    ? `Load ${kit.name} and publish it to its Figma sync URL`
                    : 'Sync runs on the deployed app — /api/tokens has no local dev route'}
                  className={`flex-shrink-0 px-2 h-6 rounded-md text-[11px] font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                    synced === kit.id
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-line text-fg-muted hover:text-fg hover:border-line-strong hover:bg-elevated'
                  }`}
                >
                  {synced === kit.id ? 'Synced' : syncing === kit.id ? 'Syncing…' : 'Sync'}
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
              )
            })}
          </ul>
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-line/70 bg-app/60 flex flex-col gap-1">
        <span className="text-[11px] text-fg-faint">
          Active: <code className="font-mono text-fg-muted">{primaryColor}</code>
        </span>
        {kits.length > 0 && (
          <span className="text-[11px] text-fg-faint leading-relaxed">
            {canSync
              ? 'Each kit syncs to its own Figma URL, named after the kit.'
              : 'Sync is available on the deployed app.'}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── Reset confirmation ───────────────────────────────────────────────────────
// Same anchor/dismiss contract as KitsPopover (outside-click + Escape, the
// framer fade+slide), so the two controls in this row behave identically.
// Spells out what survives — saved kits and the sync connection — because the
// only reason to hesitate here is not knowing whether Reset also throws those
// away. It does not; see `resetToDefaults`.
function ResetConfirmPopover({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel()
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onCancel])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-line bg-surface shadow-[0_16px_48px_-12px_rgba(0,0,0,0.28)] z-50 p-4 flex flex-col gap-2.5"
      role="dialog"
      aria-label="Confirm reset"
    >
      <h3 className="text-sm font-semibold text-fg">Reset to defaults?</h3>
      <p className="text-xs text-fg-faint leading-relaxed">
        Puts every foundation back to the default — the purple accent, the Light
        and Dark themes, Astryx semantics, typography, spacing and the rest.
        Your saved kits and Figma sync URL are kept.
      </p>
      <div className="flex items-center gap-2 pt-0.5">
        <button
          onClick={onConfirm}
          className="flex-1 h-8 rounded-lg text-[12px] font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          Reset everything
        </button>
        <button
          onClick={onCancel}
          className="flex-1 h-8 rounded-lg text-[12px] font-medium border border-line text-fg-muted hover:text-fg hover:bg-elevated transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  )
}

// ── The pill row itself (header rightSlot on Home) — Reset · Save ───────────
export default function HomeActions({ previewTheme = 'light' }: { previewTheme?: string }) {
  const [kitsOpen, setKitsOpen] = useState(false)
  const kitsBtn = useRef<HTMLButtonElement>(null)
  const resetToDefaults = useDesignStore((s) => s.resetToDefaults)
  const applyAccentColor = useApplyAccentColor()

  // `makeDesignDefaults()` ships `primaryScale: {}` — the ramps are DERIVED,
  // not stored defaults, so a reset alone leaves every family empty and the
  // whole table renders as #FFFFFF / #000000. Every other caller of
  // `startNewSystem` already pairs it with an accent apply on the NEXT render
  // (see NewSystemModal's `pendingAccent`), because useApplyAccentColor's
  // closure reads the state it captured — run it in the same tick and it
  // regenerates from the OUTGOING system instead of the fresh defaults.
  //
  // The bug this exists to prevent is specifically a SECOND reset: the first
  // one changes primaryColor, so any effect keyed on it re-derives the ramps
  // as a side effect and the omission hides. Reset twice — or reset a system
  // already on the default purple — and nothing re-derives them at all.
  const [pendingAccent, setPendingAccent] = useState<string | null>(null)
  useEffect(() => {
    if (!pendingAccent) return
    applyAccentColor(pendingAccent, true, 'light')
    setPendingAccent(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAccent])

  // Reset throws away every foundation edit and has no undo, so it confirms —
  // through a small popover, NOT a self-arming "click again" pill.
  //
  // The arming version was tried and is a trap twice over. `mousedown` fires
  // before `click`, so the outside-click listener that disarmed it ran BEFORE
  // the confirming click reached the handler, which then read `armed === false`
  // and merely re-armed — the button could not be confirmed by a real mouse at
  // all (a synthetic `.click()` dispatches no mousedown, so it passed a test
  // and shipped broken). And the arm window expired on its own, so hesitating
  // for a few seconds silently cancelled and read as "the button does
  // nothing". A popover has neither failure mode: no timer, and the confirm is
  // its own element.
  const [confirmOpen, setConfirmOpen] = useState(false)

  function handleConfirmedReset() {
    setConfirmOpen(false)
    resetToDefaults()
    // Queued, not called here — see `pendingAccent`. DEFAULT_ACCENT is the
    // same hex makeDesignDefaults seeds, so the ramps that get derived are the
    // ones the reset state claims to have.
    setPendingAccent(DEFAULT_ACCENT)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Same HeaderPill as Save, so both read as one row of equal-weight
          actions — the pill owns the h-7 / rounded-[10px] / px-2.5 geometry,
          which is what makes the two match without hardcoding sizes here. */}
      <div className="relative">
        <Pill
          Icon={ResetIcon}
          label="Reset"
          onClick={() => setConfirmOpen((v) => !v)}
          title="Restore the default purple accent, the light/dark themes, and every other foundation default"
          danger={confirmOpen}
          aria-haspopup
          aria-expanded={confirmOpen}
        />
        <AnimatePresence>
          {confirmOpen && (
            <ResetConfirmPopover
              onCancel={() => setConfirmOpen(false)}
              onConfirm={handleConfirmedReset}
            />
          )}
        </AnimatePresence>
      </div>
      <div className="relative">
        <Pill
          Icon={FolderIcon}
          label="Save"
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
