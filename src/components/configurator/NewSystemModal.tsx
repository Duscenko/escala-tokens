// New design system — a small guided creation dialog: name it, pick its accent,
// then land in Foundations · Color to keep setting tokens (share/download come
// later from Save). Confirming resets to a fresh system (same as the old bare
// "New" click) and applies the choices on top.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { useApplyAccentColor } from '../../lib/colorActions'
import { withAlpha } from '../../lib/colorUtils'
import { slugify } from '../../lib/utils'
import { COLOR_FAMILY_PRESETS } from './QuickFoundationsPanel'
import ColorField from '../ui/ColorField'

export default function NewSystemModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  /** Called after the new system is created — the shell navigates to Foundations · Color. */
  onCreated: () => void
}) {
  const { startNewSystem, setProjectName, savedSystems, githubRepo, projectName } = useDesignStore()
  const applyAccentColor = useApplyAccentColor()

  const [name, setName] = useState('')
  const [accent, setAccent] = useState(COLOR_FAMILY_PRESETS[0].hex)
  // Deferred accent apply: startNewSystem() resets the store, so the accent has
  // to be applied on the NEXT render, when useApplyAccentColor's closure reads
  // the fresh default state instead of the outgoing system's.
  const [pendingAccent, setPendingAccent] = useState<string | null>(null)

  // The outgoing system is lost unless it was saved (registry or GitHub push).
  const savedId = githubRepo ?? `local:${slugify(projectName) || 'design-system'}`
  const currentSaved = savedSystems.some((s) => s.id === savedId)

  useEffect(() => {
    if (!pendingAccent) return
    applyAccentColor(pendingAccent, true, 'light')
    setPendingAccent(null)
    onCreated()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAccent])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const trimmed = name.trim()
  const slug = slugify(trimmed) || 'design-system'

  function create() {
    if (!trimmed) return
    startNewSystem()
    useDesignStore.getState().setProjectName(trimmed)
    setPendingAccent(accent)
  }

  const isPreset = COLOR_FAMILY_PRESETS.some((p) => p.hex.toLowerCase() === accent.toLowerCase())

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="New design system"
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-line bg-app shadow-2xl p-6 flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-fg">New design system</h2>
          <p className="text-xs text-fg-faint leading-relaxed">
            Name it and pick its accent — then keep setting your foundations. You can
            share or download the files anytime from <span className="font-medium text-fg-muted">Save</span>.
          </p>
        </div>

        {/* 1 · Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-ds-name" className="text-xs text-fg-muted">Design system name</label>
          <input
            id="new-ds-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') create() }}
            placeholder="e.g. Acme Design System"
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-base font-semibold text-fg outline-none transition-colors placeholder:text-fg-faint placeholder:font-normal focus:border-line-strong"
          />
          <p className="text-[11px] text-fg-faint">
            Saves as <code className="font-mono text-fg-muted">{slug}</code> — names your files, the Figma collection and the sync endpoint.
          </p>
        </div>

        {/* 2 · Accent — the color every ramp, semantic token and gradient derives from */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-fg-muted">Accent color</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center flex-1 p-[2px] rounded-[8px] bg-surface border border-line">
              {COLOR_FAMILY_PRESETS.map((p) => {
                const selected = p.hex.toLowerCase() === accent.toLowerCase()
                return (
                  <button
                    key={p.label}
                    onClick={() => setAccent(p.hex)}
                    aria-pressed={selected}
                    aria-label={`Accent ${p.label}`}
                    title={`${p.label} — ${p.hex}`}
                    className={`relative flex-1 h-[28px] min-w-0 flex items-center justify-center rounded-[6px] transition-colors ${
                      selected ? 'bg-app shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]' : 'hover:bg-app/70'
                    }`}
                  >
                    <span
                      aria-hidden
                      className="rounded-[3px] transition-all"
                      style={{
                        width: selected ? 20 : 10,
                        height: selected ? 20 : 10,
                        borderRadius: selected ? 4 : 3,
                        backgroundColor: p.hex,
                        boxShadow: selected ? `0 0 0 3px ${withAlpha(p.hex, 0.1)}` : '0 0 0 1.7px #ffffff',
                      }}
                    />
                  </button>
                )
              })}
            </div>
            <ColorField
              value={accent}
              onChange={setAccent}
              ariaLabel="Custom accent color"
              size={28}
              align="right"
              swatchClassName={isPreset ? '' : 'ring-2 ring-fg/40'}
            />
          </div>
          <p className="text-[11px] text-fg-faint">
            Every ramp, semantic token and gradient starts from this — you can refine it later in Foundations · Color.
          </p>
        </div>

        {!currentSaved && (
          <p className="text-[11px] leading-relaxed text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
            Your current system isn't saved — creating a new one replaces it. Save it first from the Save hub if you want to keep it.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-fg-muted hover:text-fg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={!trimmed}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: accent }}
          >
            Create & start setting tokens
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
