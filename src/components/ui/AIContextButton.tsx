import { useState } from 'react'
import {
  AI_CONTEXT_COPY,
  resolveMarkdown,
  type AIContextScope,
} from '../../lib/aiContext'
import { SparkleCircleIcon } from './icons'
import { RainbowButton } from './rainbow-button'
import { showToast } from './Toast'
import { useI18n } from '../../lib/i18n'

export type { AIContextScope }

export interface AIContextButtonProps {
  /** What the paste is for — drives microcopy (hint + toast) and the envelope. */
  scope: AIContextScope
  /** LLM-optimized markdown, or a thunk so Global can rebuild from live tokens. */
  markdown: string | (() => string)
}

/**
 * Unified “copy this as agent context” CTA.
 *
 * Same Rainbow + sparkle chrome everywhere. `scope` swaps the hint, the
 * success toast, and (via the caller) the markdown payload — Overview used
 * to ship a Skill zip, component pages a copy button, foundations a quiet
 * “Copy Page”. One control, three payloads.
 */
export function AIContextButton({ scope, markdown }: AIContextButtonProps) {
  const copy = AI_CONTEXT_COPY[scope]
  const { t } = useI18n()
  const [done, setDone] = useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(resolveMarkdown(markdown))
      setDone(true)
      showToast(t(copy.toast))
      window.setTimeout(() => setDone(false), 2000)
    } catch {
      showToast(t('Couldn’t copy — try again'))
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <RainbowButton type="button" size="sm" onClick={onCopy} className="relative z-10">
        {done ? (
          <>
            <span className="text-caption leading-none">✓</span>
            {t(copy.done)}
          </>
        ) : (
          <>
            <SparkleCircleIcon size={14} />
            {t(copy.label)}
          </>
        )}
      </RainbowButton>
      <span className="relative group/hint inline-flex">
        <button
          type="button"
          aria-label={t('What {label} does', { label: t(copy.label) })}
          className="w-4 h-4 rounded-full border border-line-strong text-fg-muted flex items-center justify-center text-mini font-semibold leading-none hover:text-fg hover:border-fg-faint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
        >
          i
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full mt-2 w-60 rounded-lg bg-fg text-app text-caption leading-snug px-2.5 py-2 text-left opacity-0 group-hover/hint:opacity-100 group-focus-within/hint:opacity-100 transition-opacity duration-150 z-40 shadow-lg"
        >
          {t(copy.hint)}
        </span>
      </span>
    </div>
  )
}
