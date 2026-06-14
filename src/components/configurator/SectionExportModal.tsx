import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import {
  buildSectionExport, EXPORT_FORMATS, COLOR_FORMATS,
  type SectionKey, type ExportFormat, type ColorFormat,
} from '../../lib/sectionExport'

// A focused "window" to grab one section's tokens as CSS / Tailwind / JSON / MD —
// for fast copy-paste into an AI prompt or codebase. Colors render in the chosen
// format (HEX/RGBA/HSL/OKLCH).
export default function SectionExportModal({
  section,
  title,
  onClose,
  defaultFormat = 'css',
}: {
  section: SectionKey | 'all'
  title: string
  onClose: () => void
  defaultFormat?: ExportFormat
}) {
  const [format, setFormat] = useState<ExportFormat>(defaultFormat)
  const [colorFormat, setColorFormat] = useState<ColorFormat>('hex')
  const [copied, setCopied] = useState(false)

  // Subscribe to the store so edits made while the window is open re-render the code.
  const store = useDesignStore()

  const code = useMemo(
    () => buildSectionExport(section, format, colorFormat),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [section, format, colorFormat, store],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function copy() {
    navigator.clipboard.writeText(code)
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
      aria-label={`Export ${title}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-2xl bg-app border border-line shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 h-14 border-b border-line flex-shrink-0">
          <h2 className="text-sm font-semibold text-fg">Export <span className="text-[#0088FF]">{title}</span></h2>
          <span className="text-[11px] text-fg-faint">copy as context for AI or code</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg hover:bg-elevated/60 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Toolbar — format tabs + (color) format toggle */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-line flex-shrink-0">
          <div className="flex items-center gap-1">
            {EXPORT_FORMATS.map((f) => {
              const active = format === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${active ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'}`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
          {section === 'color' && (
            <div className="ml-auto flex items-center gap-0.5 p-0.5 rounded-lg bg-elevated/60 border border-line">
              {COLOR_FORMATS.map((c) => {
                const active = colorFormat === c.key
                return (
                  <button
                    key={c.key}
                    onClick={() => setColorFormat(c.key)}
                    aria-pressed={active}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${active ? 'bg-app text-fg shadow-sm' : 'text-fg-faint hover:text-fg'}`}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Code */}
        <div className="relative flex-1 min-h-0 overflow-auto bg-surface/40">
          <button
            onClick={copy}
            className="sticky top-3 float-right mr-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-fg text-app text-[11px] font-medium hover:opacity-90 transition-opacity"
          >
            {copied ? (
              <><svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.5l3 3 6-7" /></svg>Copied</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copy</>
            )}
          </button>
          <pre className="px-5 py-4 text-[12.5px] leading-relaxed font-mono text-fg-muted whitespace-pre min-w-0">{code}</pre>
        </div>
      </motion.div>
    </motion.div>
  )
}
