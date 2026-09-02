import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PreviewTokens } from '../ButtonPreview'
import { fontFamilyOf } from '../../../lib/previewTokens'

// Copies text to the clipboard, falling back to a hidden-textarea + execCommand
// for contexts where the async Clipboard API is unavailable (e.g. sandboxed
// preview iframes without the clipboard-write permission).
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

function FamilyRow({ role, family }: { role: string; family: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-app px-4 py-3">
      <span className="min-w-0">
        <span className="block text-mini uppercase tracking-widest text-fg-faint">{role}</span>
        <span className="block text-base text-fg truncate" style={{ fontFamily: `'${family}', sans-serif` }}>{family}</span>
      </span>
      <button
        onClick={async () => {
          if (await copyText(family)) {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }
        }}
        aria-label={`Copy ${role.toLowerCase()} font family`}
        className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-body font-medium transition-colors ${
          copied ? 'bg-status-success-solid text-white' : 'bg-elevated text-fg hover:bg-elevated/70'
        }`}
      >
        {copied ? 'Copied' : 'Copy family'}
      </button>
    </div>
  )
}

function FontFamilyModal({ tokens, onClose }: { tokens: PreviewTokens; onClose: () => void }) {
  const body = fontFamilyOf(tokens)
  const heading = tokens.typography?.headingFontFamily || body
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 flex flex-col gap-3"
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Active font family"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">Active font family</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-fg-faint hover:text-fg hover:bg-elevated transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <FamilyRow role="Heading" family={heading} />
        <FamilyRow role="Body" family={body} />
      </motion.div>
    </motion.div>
  )
}

// Trigger + modal pairing for the Typography category preview: a compact row
// showing the active BODY family (live, in its own font) that opens a modal
// listing both Heading and Body families, each with a "Copy family" action.
export function FontFamilyPreview({ tokens }: { tokens: PreviewTokens }) {
  const [open, setOpen] = useState(false)
  const body = fontFamilyOf(tokens)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-3 rounded-xl border border-line bg-app px-4 py-3 text-left hover:border-line-strong transition-colors"
      >
        <span className="min-w-0">
          <span className="block text-mini uppercase tracking-widest text-fg-faint">Active font</span>
          <span className="block text-sm font-medium text-fg truncate" style={{ fontFamily: `'${body}', sans-serif` }}>{body}</span>
        </span>
        <span className="flex-shrink-0 text-body font-medium text-accent-ui">View family</span>
      </button>
      <AnimatePresence>
        {open && <FontFamilyModal tokens={tokens} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  )
}
