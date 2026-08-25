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

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore, DEFAULT_ACCENT, type DesignSnapshot } from '../../store/useDesignStore'
import { isLiveEnvironment, publishTokens } from '../../lib/figmaSync'
import { useApplyAccentColor } from '../../lib/colorActions'
import HeaderPill from '../ui/HeaderPill'
import { GitHubGlyph } from '../ui/icons'

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

/**
 * What a saved kit actually CONTAINS, read straight off its own snapshot.
 *
 * This exists because a kit has always saved the WHOLE system — `captureSnapshot`
 * copies every key of `makeDesignDefaults()`, so typography, radius, spacing,
 * shadows, grid, sizes, gradients and icons were all in there — and the popover
 * said none of it. The only per-kit signal on screen was a colour dot pulled
 * from `primaryColor`, and the footer read `Active: #9522e9`. Both point at
 * colour, so the popover *looked* like a palette manager; reported as "Save is
 * only saving the color part", which was never true of the data.
 *
 * The fix is EVIDENCE, not a reassuring sentence: these are real values off the
 * snapshot, so they differ per kit and a kit named after a font can be seen to
 * actually carry it. A claim that a kit "includes typography" would be one more
 * thing to take on faith; `Roboto` sitting on the row is not.
 */
function kitFacts(snapshot: DesignSnapshot | undefined) {
  if (!snapshot) return null
  const t = snapshot.typography
  const heading = t?.headingFontFamily
  const body = t?.fontFamily
  return {
    accent: snapshot.primaryColor ?? '',
    themes: snapshot.themeOrder ?? [],
    // One family when they match, "Heading / Body" when they don't — the
    // distinction is a real typography decision, and collapsing it would hide
    // exactly the kind of thing someone opens a kit to check.
    fonts: !body ? null : heading && heading !== body ? `${heading} / ${body}` : body,
    radius: snapshot.radius?.md ?? null,
    spacing: snapshot.spacing?.['2'] ?? null,
    icons: snapshot.iconLibrary ?? null,
    // 6 globals (accent · neutral · the four states) plus whatever the user
    // minted — the same arithmetic ColorPrimitives' own family nav does.
    families: 6 + (snapshot.customColors?.length ?? 0),
  }
}

/** One `label: value` line of a kit's contents. A `<dl>` row, not a two-column
 *  grid: the labels are four short words and a fixed track would either clip
 *  "Themes" or waste the width the values need in a 360px popover. */
function KitFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 text-[11px] leading-relaxed">
      <dt className="w-[46px] flex-shrink-0 text-fg-faint">{label}</dt>
      <dd className="flex-1 min-w-0 text-fg-muted truncate">{children}</dd>
    </div>
  )
}

// ── Systems popover — name & save the current system, reopen a previous one ──
//
// The pill reads "Systems", not "Save", and that is a deliberate correction of
// a promise this control could not keep. Two facts drove it:
//
//  1. **Nothing here is durable.** The store persists with NO `partialize`, so
//     `savedSystems` lives inside the same `scalable-designs-store` localStorage
//     key as the working state — clearing site data destroys the current system
//     AND every saved one in a single action. "Save" is the one word that
//     promises otherwise, and it was the only word on the button.
//  2. **This popover is mostly a LIBRARY.** One third is "save current as";
//     the rest is the list of what you already have, with load/review/sync per
//     row. A folder glyph over a verb was already saying two different things.
//
// So "Save" moves INSIDE, onto the button that actually performs it, where it
// can state its destination; the pill names the shelf. One noun throughout —
// **system**, matching `savedSystems` and SaveView's "My design systems". The
// third name ("kit") is gone from the UI; only the internal flow keeps it.
function KitsPopover({
  onClose, previewTheme, onOpenEditor, onReviewInDocs, onConnectGithub, onOpenSaveHub, onPreviewTheme,
}: {
  onClose: () => void
  previewTheme: string
  /** Where "Load & edit" lands — the Variables Generator. */
  onOpenEditor?: () => void
  /** Where "Load & review" lands — Docs' whole-system Overview sheet, which is
   *  every foundation's sections in one column. That's the page that answers
   *  "what is in this system", which is the question a saved system raises. */
  onReviewInDocs?: () => void
  /** Opens `GitHubConnectView` — the ONE durable destination in the app, and
   *  the remedy this popover now names inline instead of leaving it to a hub
   *  users were not finding (see the durability note below). */
  onConnectGithub?: () => void
  /** Opens `SaveView` — the full hub this popover is the quick version of.
   *  Its only doors were a button inside a Docs article and a link two levels
   *  inside the Figma Sync screen, so the surface holding the systems grid,
   *  the create/import tile (the app's last Import door) and the connection
   *  status was effectively unreachable from the editor. */
  onOpenSaveHub?: () => void
  /** Sets the previewed theme — `changePreviewTheme` in the shell, so the app
   *  chrome follows too. Used to land a load on the theme the user picked. */
  onPreviewTheme?: (themeKey: string) => void
}) {
  const {
    setProjectName, primaryColor, projectName,
    savedSystems, saveCurrentSystem, saveCurrentSystemAsTheme, loadSystem, removeSavedSystem,
    themeOrder, githubRepo,
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

  // EVERY saved system, local and GitHub-backed alike. This used to filter
  // `source !== 'github'` ("GitHub-backed systems have their own push flow"),
  // which had a defect this popover could not survive: `buildSavedSystemEntry`
  // stamps `source: 'github'` the moment `githubRepo` is set, so once a user
  // connected a repo, pressing Save here saved an entry the list then hid.
  // Verified against the store — one entry written, zero rendered: the green
  // tick flashed and the list did not change, which is indistinguishable from
  // a save that failed. Showing both kinds side by side is also what makes the
  // durability badge below meaningful: the whole point is being able to see,
  // in one list, which systems would survive a cache clear.
  //
  // Derived BEFORE `openKit` on purpose — that state seeds itself from the
  // first system and would otherwise be reading a variable declared below it.
  const kits = savedSystems

  // Which kit's contents are expanded.
  //  · **One at a time** — the list scrolls inside a 256px box, and a second
  //    open kit would push the one you just opened's actions out of view.
  //  · **The FIRST kit starts open.** With the scope sentence gone (see the
  //    header), this summary is the only thing that says a kit is the whole
  //    system rather than a palette — so it has to be visible without being
  //    hunted for. Opening exactly one keeps the list scannable when there are
  //    several. The popover unmounts on close, so every open re-seeds here,
  //    which is the behaviour we want: come back, see the top kit's contents.
  const [openKit, setOpenKit] = useState<string | null>(() => kits[0]?.id ?? null)

  // Which theme each system should OPEN in, keyed by system id. Per-system
  // rather than one shared value: two saved systems rarely carry the same
  // theme names, and a single selection would either be wrong for one of them
  // or need resetting every time the open row changes. Unset means "this
  // system's first theme", resolved at click time so the map never has to be
  // pre-seeded for systems the user never expanded.
  const [landTheme, setLandTheme] = useState<Record<string, string>>({})

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

  /** Load a system, land on the requested theme, then go wherever the caller
   *  points. One helper for both destinations so "Load & edit" and
   *  "Load & review" can never disagree about which theme you arrive on.
   *
   *  Order matters: `loadSystem` replaces `themeOrder`, and Configurator
   *  CLAMPS `previewTheme` to it — so requesting the theme before the load
   *  would be clamped away against the outgoing system's themes. Both run in
   *  one React batch, and the clamp reads the committed store either way.
   *  `onPreviewTheme` is optional: without it the clamp alone still guarantees
   *  a valid theme, it just won't be the one the user picked. */
  function handleLoad(id: string, themes: string[], go?: () => void) {
    loadSystem(id)
    const target = landTheme[id] ?? themes[0]
    if (target) onPreviewTheme?.(target)
    go?.()
    onClose()
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
      aria-label="Saved systems"
    >
      <div className="p-4 flex flex-col gap-2.5">
        <h3 className="text-sm font-semibold text-fg">Save current as</h3>
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            placeholder="Name this system"
            aria-label="System name"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-line bg-app text-sm text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-line-strong"
          />
          <button
            onClick={handleSave}
            aria-label="Save system"
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
        {/* No "saves all 8 foundations: Color · Typography · …" line here.
            It was tried, and it's the weaker half of the same fix: a static
            sentence that never changes is a claim to be taken on faith, and it
            says the same thing the first system's own OPEN summary below
            already proves with real values off its snapshot. Showing both was
            the over-explaining CLAUDE.md's design principles warn about — the
            evidence wins, the sentence goes.

            SCOPE is what that summary answers. This line answers DURABILITY,
            which nothing on screen used to: it read "Saved locally in your
            browser", which is true and far too calm for what it describes.
            There is no `partialize` on the store, so `savedSystems` shares one
            localStorage key with the working state — "clear site data" is a
            single action that destroys the current system and every saved one
            together. A user who has pressed a button labelled Save has every
            reason to believe otherwise, so the risk is named in full, and the
            remedy is offered in the same breath rather than left in a hub
            (`SaveView`) whose only door is inside a Docs article. */}
        <p className="text-xs text-fg-faint leading-relaxed">
          {hasMultipleThemes && scope === 'one'
            ? `Every primitive is kept; only the ${themeLabel(chosenTheme)} theme ships — the other themes stay out. `
            : ''}
          Reusing a name updates that system.
          {githubRepo
            ? <> Saved in this browser and pushed to <code className="font-mono text-fg-muted">{githubRepo}</code>.</>
            : ' Saved in this browser only — clearing site data removes it, along with every system below.'}
        </p>
        {/* The remedy, inline. Only while there IS one to offer: once a repo is
            connected the sentence above already reports it, and a button
            re-offering the thing you just did is noise. */}
        {!githubRepo && onConnectGithub && (
          <button
            type="button"
            onClick={() => { onConnectGithub(); onClose() }}
            className="flex items-center justify-center gap-1.5 h-8 rounded-lg text-[12px] font-medium border border-line-strong bg-surface text-fg hover:bg-elevated transition-colors"
          >
            <GitHubGlyph />
            Connect GitHub to keep a restorable copy
          </button>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto border-t border-line/70">
        {kits.length === 0 ? (
          <p className="px-4 py-6 text-sm text-fg-faint text-center">No saved systems yet.</p>
        ) : (
          <ul className="p-2 flex flex-col gap-0.5">
            {kits.map((kit) => {
              const isActive = kit.name.trim().toLowerCase() === activeKitName
              const facts = openKit === kit.id ? kitFacts(kit.snapshot) : null
              return (
              <li key={kit.id} className="flex flex-col rounded-lg">
              <div className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-elevated/60 transition-colors">
                {/* Click EXPANDS, it no longer loads.
                    Two reasons, and the second is the load-bearing one:
                    · This row now owns three destinations (edit · review ·
                      sync), so "the row" can't mean one of them any more.
                    · Loading replaces the system currently on screen, unsaved
                      edits and all, and it used to happen on a single
                      unlabelled click on the row you were only trying to read.
                      Making that an explicit "Edit" button is the safer half
                      of the same change, not a cost of it.
                    The chevron leads, and the colour dot moves INSIDE this
                    button behind it: the glyph is what says the row discloses
                    something (the same leading position `AboutAccordion` and
                    the preview panel's `DocRow` use), while the dot is the
                    kit's identity, not a control. Both belong to the one
                    target, so there's no half of the row that looks clickable
                    and isn't. */}
                <button
                  onClick={() => setOpenKit((cur) => (cur === kit.id ? null : kit.id))}
                  aria-expanded={openKit === kit.id}
                  className="flex-1 min-w-0 flex items-center gap-2 text-left"
                >
                  <span className={`flex-shrink-0 transition-colors ${openKit === kit.id ? 'text-fg-muted' : 'text-fg-faint'}`}>
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                      className={`transition-transform duration-200 ${openKit === kit.id ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                  <span
                    className="w-3 h-3 rounded-full ring-1 ring-black/10 flex-shrink-0"
                    style={{ backgroundColor: kit.snapshot?.primaryColor ?? '#888' }}
                    aria-hidden
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-fg truncate">{kit.name}</span>
                    <span className="flex items-center gap-1 text-[11px] text-fg-faint min-w-0">
                      <span className="truncate">
                        saved {timeAgo(kit.savedAt)}
                        {/* Each system publishes to ITS OWN endpoint — see
                            `activeKitName`. Marking the live one is the whole
                            point of surfacing sync here: otherwise you can't
                            tell which system the plugin in Figma is reading. */}
                        {isActive && canSync && <span className="text-fg-muted"> · live</span>}
                      </span>
                      {/* Durability badge — marks only the EXCEPTION, never the
                          rule. Every row carrying a "Browser only" chip would
                          repeat, on each line, what the one sentence above the
                          list already states for all of them; a badge that is
                          always present stops being read. So it appears solely
                          when a system is genuinely backed by a repo, which is
                          the fact you cannot otherwise get from this list — and
                          the same "don't answer a question that was never in
                          doubt" rule the theme-scope control follows. */}
                      {kit.source === 'github' && (
                        <span
                          title={kit.repo ? `Restorable from ${kit.repo}` : 'Restorable from GitHub'}
                          className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 h-[15px] rounded text-[10px] font-medium border border-line text-fg-muted bg-elevated/60"
                        >
                          <GitHubGlyph size={9} />
                          GitHub
                        </span>
                      )}
                    </span>
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
              </div>

              {/* Expanded — what this kit HOLDS, then where to take it.
                  Mounted only while open (not animated to `height: 0` with the
                  body live) for the same reason the preview aside's docs
                  accordion is: there's no reason to build every kit's summary
                  to show one. */}
              <AnimatePresence initial={false}>
                {openKit === kit.id && facts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mx-2 mb-1.5 mt-0.5 rounded-lg border border-line bg-app/70 px-2.5 py-2 flex flex-col gap-2">
                      <dl className="flex flex-col gap-1">
                        <KitFact label="Color">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-[3px] ring-1 ring-black/10 flex-shrink-0"
                              style={{ backgroundColor: facts.accent }}
                              aria-hidden
                            />
                            <code className="font-mono">{facts.accent.toUpperCase()}</code>
                            <span className="text-fg-faint">· {facts.families} families</span>
                          </span>
                        </KitFact>
                        {facts.fonts && <KitFact label="Type">{facts.fonts}</KitFact>}
                        {(facts.radius || facts.spacing) && (
                          <KitFact label="Scale">
                            {[facts.radius && `radius ${facts.radius}`, facts.spacing && `spacing ${facts.spacing}`]
                              .filter(Boolean).join(' · ')}
                          </KitFact>
                        )}
                        <KitFact label="Themes">
                          {facts.themes.length
                            ? `${facts.themes.length} — ${facts.themes.map(themeLabel).join(', ')}`
                            : '—'}
                        </KitFact>
                        {facts.icons && <KitFact label="Icons">{facts.icons}</KitFact>}
                      </dl>

                      {/* Which theme to LAND on. Only when this system carries
                          more than one — the same "don't ask a question that
                          has only one answer" rule the save-scope control
                          follows one panel up; with a single theme the clamp in
                          `Configurator` already picks it and a select of one
                          option would be a decision that was never in doubt.

                          Non-destructive on purpose: this previews the chosen
                          theme, it does NOT narrow the loaded system to it.
                          Narrowing already exists on the SAVE side ("Just one
                          theme" → `scopeSnapshotToTheme`), and offering it here
                          too would be a second, silent way to discard themes at
                          the exact moment the system on screen is replaced —
                          the same class of surprise as the row-click-loads
                          behaviour this panel was built to remove. */}
                      {facts.themes.length > 1 && (
                        <label className="flex items-center gap-2 text-[11px] text-fg-faint">
                          <span className="flex-shrink-0">Open in</span>
                          <select
                            value={landTheme[kit.id] ?? facts.themes[0]}
                            onChange={(e) => setLandTheme((m) => ({ ...m, [kit.id]: e.target.value }))}
                            aria-label={`Theme to open ${kit.name} in`}
                            className="flex-1 min-w-0 px-2 py-1 rounded-md border border-line bg-app text-[11px] text-fg outline-none transition-colors focus:border-line-strong"
                          >
                            {facts.themes.map((t) => (
                              <option key={t} value={t}>{themeLabel(t)}</option>
                            ))}
                          </select>
                        </label>
                      )}

                      {/* Two destinations, spelled out, because they're the two
                          things you do with a saved system and they land in
                          different places. Both LOAD first — the editor and the
                          docs both render the live store, so there is no way to
                          show a kit without making it the current one. The
                          buttons say "Load and …" for exactly that reason:
                          this is the moment the system on screen is replaced,
                          and it should not be a surprise. */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          onClick={() => handleLoad(kit.id, facts.themes, onOpenEditor)}
                          title={`Load ${kit.name} and open it in the Variables Generator`}
                          className="flex-1 h-7 rounded-md text-[11px] font-medium border border-line-strong bg-surface text-fg hover:bg-elevated transition-colors"
                        >
                          Load & edit
                        </button>
                        <button
                          onClick={() => handleLoad(kit.id, facts.themes, onReviewInDocs)}
                          title={`Load ${kit.name} and read its foundations in Docs`}
                          className="flex-1 h-7 rounded-md text-[11px] font-medium border border-line text-fg-muted hover:text-fg hover:border-line-strong hover:bg-elevated transition-colors"
                        >
                          Load & review
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* The door to the full hub.
          This slot used to read `Active: #9522e9`. That line is named in
          CLAUDE.md as one half of why this popover "looked like a palette
          manager" — the per-row colour dot was the other half, and only the
          dot got fixed (by `kitFacts`) at the time. It reports the accent, on
          a surface whose subject is whole systems, so it survived as a
          misleading signal in the most prominent fixed position here. Spending
          the space on the one thing this popover genuinely cannot do is a
          strictly better trade than keeping it.
          Named as a ROW (glyph · title · what's there) rather than a bare
          link, matching `SyncHubPopover` — the codebase's existing pattern for
          "this popover routes somewhere". The destination keeps its own proper
          noun, "Save & Share", because Docs prose refers to it by that name in
          eight places; the subtitle is what says why you'd go. */}
      <div className="border-t border-line/70 bg-app/60 p-1.5">
        {onOpenSaveHub && (
          <button
            onClick={() => { onOpenSaveHub(); onClose() }}
            className="w-full flex items-start gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-elevated/60 transition-colors"
          >
            <span className="flex-shrink-0 mt-0.5 text-fg-muted">
              <FolderIcon />
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-semibold text-fg">Save &amp; Share</span>
              <span className="block text-[11px] text-fg-faint leading-relaxed">
                Every system side by side, the export files, and your Figma / GitHub connections.
              </span>
            </span>
          </button>
        )}
        {kits.length > 0 && (
          <span className="block px-2.5 pb-1 pt-0.5 text-[11px] text-fg-faint leading-relaxed">
            {canSync
              ? 'Each system syncs to its own Figma URL, named after the system.'
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
// Spells out what survives — saved systems and the sync connection — because the
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
        Your saved systems and Figma sync URL are kept.
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

// ── The pill row itself (header rightSlot on Home) — Reset · Systems ────────
export default function HomeActions({
  previewTheme = 'light', onOpenEditor, onReviewInDocs, onConnectGithub, onOpenSaveHub, onPreviewTheme,
}: {
  previewTheme?: string
  /** Forwarded to the Systems popover's per-row actions — see `KitsPopover`. */
  onOpenEditor?: () => void
  onReviewInDocs?: () => void
  /** Opens `GitHubConnectView` — the popover's inline durability remedy. */
  onConnectGithub?: () => void
  /** Opens `SaveView` — the full hub the popover routes to. */
  onOpenSaveHub?: () => void
  /** Sets the previewed theme (and the app chrome with it). */
  onPreviewTheme?: (themeKey: string) => void
}) {
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
      {/* Same HeaderPill as Systems, so both read as one row of equal-weight
          controls — the pill owns the h-7 / rounded-[10px] / px-2.5 geometry,
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
          label="Systems"
          title="Save the current system under a name, and reopen one you already saved"
          onClick={() => setKitsOpen((v) => !v)}
          buttonRef={kitsBtn}
          aria-haspopup
          aria-expanded={kitsOpen}
        />
        <AnimatePresence>
          {kitsOpen && (
            <KitsPopover
              onClose={() => setKitsOpen(false)}
              previewTheme={previewTheme}
              onOpenEditor={onOpenEditor}
              onReviewInDocs={onReviewInDocs}
              onConnectGithub={onConnectGithub}
              onOpenSaveHub={onOpenSaveHub}
              onPreviewTheme={onPreviewTheme}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
