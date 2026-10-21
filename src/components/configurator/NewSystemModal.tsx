// New design system — name it. Confirming resets to a fresh system and applies
// the name on top. Colour lives on the brands inside, not on the system, so
// this asks for nothing else: how a brand starts is asked by Create brand.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { slugify } from '../../lib/utils'
import { myThemeKeys } from '../../lib/themeLibrary'
import { flushLibraryAutosave, useUnsavedBrands } from '../../lib/libraryStatus'

export default function NewSystemModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  /** Called after the new system is created — the shell stays on Home. */
  onCreated: () => void
}) {
  const { startNewSystem, savedSystems, githubRepo, projectName, themeOrder, themes } = useDesignStore()
  const unsavedBrands = useUnsavedBrands()

  const [name, setName] = useState('')

  // The outgoing system is lost unless it was saved (registry or GitHub push).
  const savedId = githubRepo ?? `local:${slugify(projectName) || 'design-system'}`
  const currentSaved = savedSystems.some((s) => s.id === savedId)
  // A system with no brands has nothing to lose, so it gets no warning.
  const ownBrands = myThemeKeys(themeOrder, themes)
  const currentEmpty = ownBrands.length === 0
  const draftsOnScreen = ownBrands.some((key) => unsavedBrands.has(key))

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const trimmed = name.trim()
  const slug = slugify(trimmed) || 'design-system'
  // A saved system is filed under `local:<slug>`: a new one with the same name
  // would be saved over it.
  const taken = !!trimmed && savedSystems.some((s) => s.id === `local:${slug}`)

  function create() {
    if (!trimmed || taken) return
    flushLibraryAutosave()
    startNewSystem()
    useDesignStore.getState().setProjectName(trimmed)
    onCreated()
  }

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
            A design system holds brands, and they ship together to one Figma file. Name it, then create a brand inside.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-ds-name" className="text-xs text-fg-muted">Design system name</label>
          <input
            id="new-ds-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') create() }}
            placeholder="e.g. Escala"
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-base font-semibold text-fg outline-none transition-colors placeholder:text-fg-faint placeholder:font-normal focus:border-line-strong"
          />
          {taken ? (
            <p role="alert" className="text-caption text-status-danger">
              A design system named “{trimmed}” already exists. Choose another name.
            </p>
          ) : (
            <p className="text-caption text-fg-faint">
              Saves as <code className="font-mono text-fg-muted">{slug}</code> — names your files, the Figma collection and the sync endpoint.
            </p>
          )}
        </div>

        {!currentSaved && !currentEmpty ? (
          <p className="text-caption leading-relaxed text-status-warning bg-status-warning/10 rounded-lg px-3 py-2">
            Your current system isn't saved — creating a new one replaces it. Save a copy first if you want to keep it.
          </p>
        ) : draftsOnScreen ? (
          <p className="text-caption leading-relaxed text-status-warning bg-status-warning/10 rounded-lg px-3 py-2">
            A brand on screen isn't saved yet. Creating a new system leaves it behind; save it first to keep it.
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-fg-muted hover:text-fg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={!trimmed || taken}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-cta text-cta-ink transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create design system
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
