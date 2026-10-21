import { useMemo, useRef, useState } from 'react'
import {
  AGENT_CONTEXT_TOAST_MORE,
  AI_CONTEXT_COPY,
  requestOpenFaq,
  resolveMarkdown,
  type AIContextScope,
} from '../../lib/aiContext'
import type { ContextAppearance, ContextScope } from '../../lib/contextRequest'
import { SparkleCircleIcon } from './icons'
import { showToast } from './Toast'
import { useI18n } from '../../lib/i18n'
import {
  AnchoredPopover,
  ContextFilters,
  ContextSizeNote,
  useContextOptions,
  type ContextOptions,
} from './ContextControls'

export type { AIContextScope }

/** Turns the button into Copy context + a filter popover. `build` is called
 *  with the chosen options at copy time (and for the size readout while the
 *  popover is open), so the paste is always the live system. */
export interface AIContextFilters {
  build: (opts: ContextOptions) => string
  /** The scope this page starts on. */
  scope: ContextScope
  /** Scopes the person can switch to. Omit for a page with only one. */
  scopes?: ContextScope[]
  /** Free cut: only this appearance can be copied. */
  lockedAppearance?: ContextAppearance | null
  /** Appearance when nothing is remembered yet. */
  fallbackAppearance?: ContextAppearance
}

export interface AIContextButtonProps {
  /** What the paste is for — drives microcopy (hint + toast) and the envelope. */
  scope: AIContextScope
  /** LLM-optimized markdown, or a thunk so Global can rebuild from live tokens.
   *  Ignored when `filters` is set. */
  markdown?: string | (() => string)
  /** Overrides the visible button text (still an i18n key). Toast copy is unchanged. */
  label?: string
  filters?: AIContextFilters
}

const BTN = 'flex h-7 items-center gap-1.5 rounded-md px-2 text-caption font-medium tracking-[0.18px] text-fg transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-surface active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

/**
 * Unified “copy this as agent context” CTA.
 *
 * Generator chrome, the same shell as Reset and Inspect in the theme header:
 * an h-8 outline with an h-7 caption label. With `filters` it is a split
 * button: the label copies with the remembered options, the chevron opens
 * Scope · Theme · Detail and shows what the paste will cost.
 */
export function AIContextButton({ scope, markdown, label, filters }: AIContextButtonProps) {
  const copy = AI_CONTEXT_COPY[scope]
  const { t } = useI18n()
  const [done, setDone] = useState(false)
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const shownLabel = label ? t(label) : t(copy.label)
  const [opts, setOpts] = useContextOptions(
    filters?.scope ?? 'all',
    filters?.lockedAppearance ?? filters?.fallbackAppearance ?? 'both',
  )
  const effective: ContextOptions = filters?.lockedAppearance
    ? { ...opts, appearance: filters.lockedAppearance }
    : opts

  async function onCopy() {
    try {
      const text = filters ? filters.build(effective) : resolveMarkdown(markdown ?? '')
      await navigator.clipboard.writeText(text)
      setDone(true)
      setOpen(false)
      showToast(t(copy.toast), {
        label: t(AGENT_CONTEXT_TOAST_MORE),
        onClick: () => requestOpenFaq(),
      })
      window.setTimeout(() => setDone(false), 2000)
    } catch {
      showToast(t('Couldn’t copy — try again'))
    }
  }

  const labelContent = done ? (
    <>
      <span className="text-caption leading-none text-status-success">✓</span>
      {t(copy.done)}
    </>
  ) : (
    <>
      <SparkleCircleIcon size={14} />
      {shownLabel}
    </>
  )

  if (!filters) {
    return (
      <div className="flex h-8 items-center rounded-lg border border-line p-0.5">
        <button type="button" onClick={onCopy} className={BTN}>{labelContent}</button>
      </div>
    )
  }

  return (
    <>
      <div ref={anchorRef} className="flex h-8 items-center rounded-lg border border-line p-0.5">
        <button type="button" onClick={onCopy} className={BTN}>{labelContent}</button>
        <span aria-hidden className="mx-0.5 h-4 w-px bg-line" />
        <button
          type="button"
          aria-label={t('Context options')}
          aria-expanded={open}
          aria-haspopup="dialog"
          title={t('Choose what to copy')}
          onClick={() => setOpen((v) => !v)}
          className={`${BTN} px-1.5 ${open ? 'bg-surface' : ''}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 4.5 6 7.5l3-3" />
          </svg>
        </button>
      </div>
      <AnchoredPopover anchor={anchorRef.current} open={open} onClose={() => setOpen(false)} label={t('Context options')}>
        {open ? (
          <ContextPopoverBody
            opts={effective}
            onChange={setOpts}
            filters={filters}
            onCopy={onCopy}
          />
        ) : null}
      </AnchoredPopover>
    </>
  )
}

function ContextPopoverBody({
  opts, onChange, filters, onCopy,
}: {
  opts: ContextOptions
  onChange: (patch: Partial<ContextOptions>) => void
  filters: AIContextFilters
  onCopy: () => void
}) {
  const { t } = useI18n()
  // Built only while the popover is open, so a closed button costs nothing.
  const preview = useMemo(() => filters.build(opts), [filters, opts])
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-ui font-semibold text-fg">{t('Copy context for agents')}</p>
        <p className="mt-0.5 text-caption text-fg-muted">{t('Pick what the agent needs. Less context, better answers.')}</p>
      </div>
      <ContextFilters
        opts={opts}
        onChange={onChange}
        scopes={filters.scopes}
        lockedAppearance={filters.lockedAppearance}
      />
      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <ContextSizeNote markdown={preview} />
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-cta px-3 text-caption font-semibold text-cta-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          {t('Copy')}
        </button>
      </div>
    </div>
  )
}
