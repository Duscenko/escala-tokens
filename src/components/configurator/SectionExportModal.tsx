import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import {
  buildSectionExport, EXPORT_FORMATS, COLOR_FORMATS,
  type SectionKey, type ExportFormat, type ColorFormat,
} from '../../lib/sectionExport'
import { slugify } from '../../lib/utils'

// File extension + MIME per export format, for the Download action.
const FILE_META: Record<ExportFormat, { ext: string; mime: string }> = {
  tokens: { ext: 'json', mime: 'application/json' },
  css: { ext: 'css', mime: 'text/css' },
  tailwind: { ext: 'js', mime: 'text/javascript' },
  md: { ext: 'md', mime: 'text/markdown' },
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

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
  const [downloaded, setDownloaded] = useState(false)

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

  function download() {
    const meta = FILE_META[format]
    const slug = slugify(store.projectName) || 'design-system'
    const scope = section === 'all' ? '' : `-${section}`
    downloadFile(code, `${slug}${scope}.${meta.ext}`, meta.mime)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 1600)
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
          <h2 className="text-sm font-semibold text-fg">Export <span className="text-fg">{title}</span></h2>
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
          {section === 'color' && format !== 'tokens' && (
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

        {/* Tokens = the plugin contract — say exactly what this JSON is good for */}
        {format === 'tokens' && (
          <div className="flex items-center gap-2 px-5 py-2 border-b border-line bg-surface/60 flex-shrink-0">
            <svg width="9" height="13" viewBox="0 0 38 57" fill="currentColor" className="text-fg-muted flex-shrink-0" aria-hidden>
              <path d="M9.5 57C14.7467 57 19 52.7467 19 47.5V38H9.5C4.25329 38 0 42.2533 0 47.5C0 52.7467 4.25329 57 9.5 57Z" />
              <path d="M0 28.5C0 23.2533 4.25329 19 9.5 19H19V38H9.5C4.25329 38 0 33.7467 0 28.5Z" />
              <path d="M0 9.5C0 4.25329 4.25329 0 9.5 0H19V19H9.5C4.25329 19 0 14.7467 0 9.5Z" />
              <path d="M19 0H28.5C33.7467 0 38 4.25329 38 9.5C38 14.7467 33.7467 19 28.5 19H19V0Z" />
              <path d="M38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5Z" />
            </svg>
            <p className="text-[11px] text-fg-muted">
              {section === 'all'
                ? <>This is your full <code className="font-mono">tokens.json</code> — exactly the file the Figma plugin imports.</>
                : <>A slice of <code className="font-mono">tokens.json</code> (same keys). To import into the Figma plugin, use the full file from <span className="font-medium">Save</span>.</>}
            </p>
          </div>
        )}

        {/* Code */}
        <div className="relative flex-1 min-h-0 overflow-auto bg-surface/40">
          <div className="sticky top-3 float-right mr-3 z-10 flex items-center gap-1.5">
            <button
              onClick={download}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-elevated text-fg-muted text-[11px] font-medium hover:bg-line-strong transition-colors border border-line-strong"
            >
              {downloaded ? (
                <><svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.5l3 3 6-7" /></svg>Saved</>
              ) : (
                <><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v6M3 5l2.5 2.5L8 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 8.5v1a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>Download</>
              )}
            </button>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-fg text-app text-[11px] font-medium hover:opacity-90 transition-opacity"
            >
              {copied ? (
                <><svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.5l3 3 6-7" /></svg>Copied</>
              ) : (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copy</>
              )}
            </button>
          </div>
          <pre className="px-5 py-4 text-[12.5px] leading-relaxed font-mono text-fg-muted whitespace-pre min-w-0">{code}</pre>
        </div>
      </motion.div>
    </motion.div>
  )
}
