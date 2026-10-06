import { useState } from 'react'
import {
  AGENT_CONTEXT_TOAST_MORE,
  AI_CONTEXT_COPY,
  requestOpenFaq,
  resolveMarkdown,
  type AIContextScope,
} from '../../lib/aiContext'
import { SparkleCircleIcon } from './icons'
import { showToast } from './Toast'
import { useI18n } from '../../lib/i18n'

export type { AIContextScope }

export interface AIContextButtonProps {
  /** What the paste is for — drives microcopy (hint + toast) and the envelope. */
  scope: AIContextScope
  /** LLM-optimized markdown, or a thunk so Global can rebuild from live tokens. */
  markdown: string | (() => string)
  /** Overrides the visible button text (still an i18n key). Toast copy is unchanged. */
  label?: string
}

/**
 * Unified “copy this as agent context” CTA.
 *
 * Generator chrome, the same shell as Reset and Inspect in the theme header:
 * an h-8 outline with an h-7 caption label. The rainbow fill stays on About.
 * `scope` swaps the hint, the success toast, and (via the caller) the
 * markdown payload — Overview used to ship a Skill zip, component pages a
 * copy button, foundations a quiet “Copy Page”. One control, three payloads.
 */
export function AIContextButton({ scope, markdown, label }: AIContextButtonProps) {
  const copy = AI_CONTEXT_COPY[scope]
  const { t } = useI18n()
  const [done, setDone] = useState(false)
  const shownLabel = label ? t(label) : t(copy.label)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(resolveMarkdown(markdown))
      setDone(true)
      showToast(t(copy.toast), {
        label: t(AGENT_CONTEXT_TOAST_MORE),
        onClick: () => requestOpenFaq(),
      })
      window.setTimeout(() => setDone(false), 2000)
    } catch {
      showToast(t('Couldn’t copy — try again'))
    }
  }

  return (
    <div className="flex h-8 items-center rounded-lg border border-line p-0.5">
      <button
        type="button"
        onClick={onCopy}
        className="flex h-7 items-center gap-1.5 rounded-md px-2 text-caption font-medium tracking-[0.18px] text-fg transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-surface active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        {done ? (
          <>
            <span className="text-caption leading-none text-status-success">✓</span>
            {t(copy.done)}
          </>
        ) : (
          <>
            <SparkleCircleIcon size={14} />
            {shownLabel}
          </>
        )}
      </button>
    </div>
  )
}
