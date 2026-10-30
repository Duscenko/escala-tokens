import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import type { CodeFormatKey } from './ThemeCodeScopeRail'
import { CHROME_CONTROL_ACTIVE } from './themeWorkspaceLayout'
import { INSPECTOR_ID } from './WorkspaceInspector'

// "How to use it": the few steps between a file on screen and a product that
// reads it. One list per destination (CSS file, agent context, GitHub repo),
// so the Code tab and the GitHub export say the same thing the same way.
// Variable names are real ones from variables.css, never placeholders.

export type HowToKind = CodeFormatKey | 'github'

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-elevated px-1 py-0.5 font-mono text-mini text-fg-muted">{children}</code>
}

function Snippet({ lines }: { lines: string[] }) {
  return (
    <pre className="mt-1.5 whitespace-pre-wrap [overflow-wrap:anywhere] rounded-md border border-line bg-app px-2.5 py-2 font-mono text-mini leading-relaxed text-fg-muted">
      {lines.join('\n')}
    </pre>
  )
}

type Step = { title: string; body?: ReactNode; snippet?: string[] }

function useSteps(kind: HowToKind, skillFolders: string[]): Step[] {
  const { t } = useI18n()
  if (kind === 'css') {
    return [
      { title: t('Copy or download the file'), body: t('Save it in your project as variables.css.') },
      { title: t('Import it once, before your own styles'), snippet: ["@import './variables.css';"] },
      {
        title: t('Use the roles, never a hex'),
        snippet: [
          '.button {',
          '  background: var(--color-action-primary-default);',
          '  color: var(--color-content-on-action);',
          '  border-radius: var(--radius-action);',
          '}',
        ],
      },
      { title: t('Switch to dark'), body: t('Put the dark class on the html element. Every role changes with it.'), snippet: ['<html class="dark">'] },
    ]
  }
  if (kind === 'agent') {
    return [
      { title: t('Pick what to send'), body: t('Choose the foundations, the theme and the detail in the panel on the right. The file on screen is exactly what gets copied.') },
      { title: t('Copy context'), body: t('Paste it into Cursor, Claude Code or any chat, before you ask for UI.') },
      { title: t('Ask for screens'), body: t('The agent then uses your token names instead of inventing colours and sizes.') },
      { title: t('For a whole project, use GitHub'), body: t('A push writes the same context as Design skills in your repo, so every agent finds it without a paste.') },
    ]
  }
  return [
    { title: t('Pull the repo'), snippet: ['git pull'] },
    { title: t('Import the tokens in your app'), body: t('Import variables.css once, then use the roles:'), snippet: ["@import './variables.css';", 'color: var(--color-content-primary);'] },
    {
      title: t('Your agents already have the system'),
      body: (
        <>
          {t('Cursor and Claude Code read the Design skills from')}{' '}
          {skillFolders.map((p, i) => <span key={p}>{i > 0 && ', '}<Code>{p}</Code></span>)}.
        </>
      ),
    },
    { title: t('Changed something? Push again'), body: t('Each push is one commit that replaces these files. Open the repo in Escala later to keep editing.') },
  ]
}

/** A short, numbered "How to use it" list. `compact` fits the 288px inspector. */
export default function CodeHowTo({ kind, skillFolders = [], compact = false }: { kind: HowToKind; skillFolders?: string[]; compact?: boolean }) {
  const { t } = useI18n()
  const steps = useSteps(kind, skillFolders)
  return (
    <ol className={`flex flex-col ${compact ? 'gap-3' : 'gap-3.5'}`} aria-label={t('How to use it')}>
      {steps.map((step, i) => (
        <li key={step.title} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2">
          <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full border border-line-strong font-mono text-nano font-semibold text-fg-muted">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-caption font-medium leading-5 text-fg">{step.title}</p>
            {step.body ? <p className="mt-0.5 text-caption leading-relaxed text-fg-faint">{step.body}</p> : null}
            {step.snippet ? <Snippet lines={step.snippet} /> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Help glyph: a circled question mark, drawn at the house 14px icon size. */
function HelpGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M6.4 6.2a1.7 1.7 0 0 1 3.25.6c0 1.15-1.65 1.5-1.65 2.45" />
      <circle cx="8" cy="11.4" r=".35" fill="currentColor" />
    </svg>
  )
}

const POPOVER_W = 400
const EDGE = 12
const GAP = 6
/** Inset from the inspector's edges when the panel docks over it. */
const DOCK_INSET = 8
/** Below this much room under the button, the panel opens upward instead. */
const MIN_ROOM = 280

/**
 * "How to use" behind a button, so the steps are one click away instead of
 * sitting in the inspector all the time. Opens under the button, right-aligned,
 * and never runs past the window: its height is capped to the room below.
 */
export function CodeHowToButton({ kind, className = '', iconOnly = false }: { kind: HowToKind; className?: string; iconOnly?: boolean }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number; width: number; maxHeight: number; up: boolean } | null>(null)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useLayoutEffect(() => {
    if (!open) return
    const measure = () => {
      const r = anchorRef.current?.getBoundingClientRect()
      if (!r) return
      // Inside the right-hand inspector, the panel docks over that column,
      // under the ?: its width, its edges, never over the code it explains.
      const inspector = anchorRef.current?.closest(`#${INSPECTOR_ID}`)?.getBoundingClientRect()
      if (inspector) {
        const top = r.bottom + GAP
        setPos({
          top,
          right: window.innerWidth - inspector.right + DOCK_INSET,
          width: inspector.width - DOCK_INSET * 2,
          maxHeight: Math.min(inspector.bottom, window.innerHeight - EDGE) - top - DOCK_INSET,
          up: false,
        })
        return
      }
      // Elsewhere: right-aligned to the button, but never past either window edge.
      const width = Math.min(POPOVER_W, window.innerWidth - EDGE * 2)
      const right = Math.min(Math.max(EDGE, window.innerWidth - r.right), window.innerWidth - width - EDGE)
      // Opens below; flips above only when below can't hold a useful panel and
      // above has more room. Either way the height is capped to the room it
      // has, and the body scrolls, so the panel is never cut by the window.
      const below = window.innerHeight - r.bottom - GAP - EDGE
      const above = r.top - GAP - EDGE
      const up = below < MIN_ROOM && above > below
      setPos(up
        ? { bottom: window.innerHeight - r.top + GAP, right, width, maxHeight: above, up }
        : { top: r.bottom + GAP, right, width, maxHeight: below, up })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const close = (refocus: boolean) => {
      setOpen(false)
      if (refocus) anchorRef.current?.focus()
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return
      close(false)
    }
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') close(true) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={iconOnly ? t('How to use') : undefined}
        title={iconOnly ? t('How to use') : undefined}
        onClick={() => setOpen((v) => !v)}
        className={iconOnly
          ? `inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${open ? 'bg-elevated text-fg' : 'text-fg-faint hover:bg-elevated hover:text-fg'} ${className}`
          : `inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg px-3 text-caption font-medium text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${className} ${open ? CHROME_CONTROL_ACTIVE : ''}`}
      >
        <HelpGlyph />
        {iconOnly ? null : t('How to use')}
      </button>
      {createPortal(
        <AnimatePresence>
          {open && pos ? (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-labelledby={titleId}
              tabIndex={-1}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: pos.up ? 4 : -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: pos.up ? 4 : -4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, right: pos.right, width: pos.width, maxHeight: pos.maxHeight, transformOrigin: pos.up ? 'bottom right' : 'top right', zIndex: 80 }}
              className="flex flex-col overflow-hidden rounded-xl border border-line-strong bg-app shadow-xl outline-none"
            >
              <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
                <p id={titleId} className="text-ui font-semibold text-fg">{t('How to use it')}</p>
                <button
                  type="button"
                  aria-label={t('Close')}
                  onClick={() => { setOpen(false); anchorRef.current?.focus() }}
                  className="-mr-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden><path d="m3 3 6 6M9 3 3 9" /></svg>
                </button>
              </div>
              <div className="min-h-0 overflow-y-auto px-4 py-4">
                <CodeHowTo kind={kind} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
