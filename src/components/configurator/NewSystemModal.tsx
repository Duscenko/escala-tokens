// New folder — name a saved system. Confirming resets to a fresh system
// (same as the old bare "New" click) and applies the name on top. Accent
// lives on the files (themes) inside, not on the folder.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { slugify } from '../../lib/utils'

export default function NewSystemModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  /** Called after the new system is created — the shell stays on Home. */
  onCreated: () => void
}) {
  const { startNewSystem, savedSystems, githubRepo, projectName } = useDesignStore()

  const [name, setName] = useState('')

  // The outgoing system is lost unless it was saved (registry or GitHub push).
  const savedId = githubRepo ?? `local:${slugify(projectName) || 'design-system'}`
  const currentSaved = savedSystems.some((s) => s.id === savedId)

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
      aria-label="New folder"
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
          <h2 className="text-lg font-semibold text-fg">New folder</h2>
          <p className="text-xs text-fg-faint leading-relaxed">
            A folder holds files — each file is a theme. Name it, then create a file inside.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-ds-name" className="text-xs text-fg-muted">Folder name</label>
          <input
            id="new-ds-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') create() }}
            placeholder="e.g. Escala"
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-base font-semibold text-fg outline-none transition-colors placeholder:text-fg-faint placeholder:font-normal focus:border-line-strong"
          />
          <p className="text-caption text-fg-faint">
            Saves as <code className="font-mono text-fg-muted">{slug}</code> — names your files, the Figma collection and the sync endpoint.
          </p>
        </div>

        {!currentSaved && (
          <p className="text-caption leading-relaxed text-status-warning bg-status-warning/10 rounded-lg px-3 py-2">
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
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-accent-solid text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create folder
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
