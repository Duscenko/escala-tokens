// Header actions — the pill row from the Figma header design:
//   + New · ⬆ Import JSON · ▸ Kits
// New opens a category menu (Color/Font/Radius/Spacing/Sizes, matching the
// Variables rail) → NewTokenWizard, a guided 2–3 step flow, in Configurator;
// Import reuses the shell's existing modal; Kits is a self-contained "save
// current as + previous kits" popover over the local savedSystems registry.
// Share was retired — it opened the exact same ExportWizard as the Export
// pill, just pre-checked to whole-system instead of the active section, and
// having both read as two buttons doing one job. Export's own Step 1 lets you
// select every collection manually, so nothing is unreachable, just one pill
// fewer for the same result.

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { slugify } from '../../lib/utils'
import HeaderPill from '../ui/HeaderPill'

// ── Pill icons (16–18px on a 24 grid, tracking currentColor) ─────────────────
const PlusIcon: ComponentType = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
const UploadIcon: ComponentType = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 15V3m0 0L7 8m5-5 5 5M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
  </svg>
)
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

// ── Kits popover — name & save the current system, reopen a previous kit ─────
function KitsPopover({ onClose }: { onClose: () => void }) {
  const {
    projectName, setProjectName, primaryColor,
    savedSystems, saveCurrentSystem, loadSystem, removeSavedSystem,
  } = useDesignStore()
  const [name, setName] = useState(projectName)
  const [justSaved, setJustSaved] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Local kits only (GitHub-backed systems have their own push flow).
  const kits = savedSystems.filter((s) => s.source !== 'github')

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
    saveCurrentSystem()
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
            placeholder="e.g. Acme v2"
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
        <p className="text-xs text-fg-faint leading-relaxed">
          Saved locally in your browser. Reusing a name updates that kit.
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

// ── New-token menu — the categories match SectionRail's Variables group
// exactly (same array, passed down from Configurator), so picking one and
// scanning the rail always agree. ─────────────────────────────────────────────
function NewTokenMenu({ categories, onSelect, onClose }: {
  categories: { key: string; label: string; Icon: ComponentType }[]
  onSelect: (key: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      role="dialog"
      aria-label="New token"
      className="absolute left-0 top-full mt-2 z-30 w-56 rounded-2xl border border-line bg-app shadow-xl p-2"
    >
      <span className="block px-2.5 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">
        New token
      </span>
      {categories.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-xl text-[13px] text-left text-fg-muted hover:text-fg hover:bg-elevated/60 transition-colors"
        >
          <span className="flex-shrink-0 text-fg-faint"><Icon /></span>
          <span className="truncate">{label}</span>
        </button>
      ))}
    </motion.div>
  )
}

// ── The pill row itself (header rightSlot on Home) ───────────────────────────
export default function HomeActions({ onNew, onImport, tokenCategories }: {
  /** Called with the picked category key (`color`|`typography`|`radius`|`spacing`|`sizes`). */
  onNew: (category: string) => void
  onImport: () => void
  tokenCategories: { key: string; label: string; Icon: ComponentType }[]
}) {
  const [kitsOpen, setKitsOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const kitsBtn = useRef<HTMLButtonElement>(null)
  const newBtn = useRef<HTMLButtonElement>(null)

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Pill
          Icon={PlusIcon}
          label="New"
          onClick={() => setNewOpen((v) => !v)}
          buttonRef={newBtn}
          aria-haspopup
          aria-expanded={newOpen}
        />
        <AnimatePresence>
          {newOpen && (
            <NewTokenMenu
              categories={tokenCategories}
              onSelect={(key) => { setNewOpen(false); onNew(key) }}
              onClose={() => setNewOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
      <Pill Icon={UploadIcon} label="Import JSON" onClick={onImport} />
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
          {kitsOpen && <KitsPopover onClose={() => setKitsOpen(false)} />}
        </AnimatePresence>
      </div>
    </div>
  )
}
