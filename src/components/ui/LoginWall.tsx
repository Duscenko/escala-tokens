import { useEffect, useRef, type ReactNode } from 'react'
import { useI18n } from '../../lib/i18n'
import { goToLogin } from '../../lib/access'
import type { LoginIntent } from '../../lib/loginReturn'

// The anonymous wall for Variables, Code and Docs — ONE component, so the three
// read as the same rule (design-plans/login-funnel.md).
//
// The top `visible` px of the content stay readable; below that a fade
// dissolves into the surface and a card asks for a free account. Same fade
// language as Code's "Show full file": the gradient ends in the exact token
// behind it (`tone`), or it reads as a dark bar instead of a dissolve.
//
// Soft by design: the content is rendered, just covered. Wheel scrolling is
// stopped inside the wall so the visible window cannot be scrolled through
// the hidden rows; nothing here pretends to be security.

/** Room the fade + card need below the readable part, in px. */
const WALL_MIN = 300

export function LoginWall({
  active,
  visible = 360,
  tone = 'var(--app)',
  title,
  detail,
  intent,
  children,
}: {
  /** Off → renders `children` untouched. */
  active: boolean
  /** How much of the content stays readable above the fade, in px. */
  visible?: number
  /** The colour behind the content, which the fade must end in. */
  tone?: string
  title: string
  detail: string
  intent?: LoginIntent
  children: ReactNode
}) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!active || !el) return
    // A React wheel handler is passive and cannot preventDefault.
    const stop = (event: WheelEvent) => event.preventDefault()
    el.addEventListener('wheel', stop, { passive: false, capture: true })
    // Anything already scrolled inside starts from the top again.
    el.querySelectorAll<HTMLElement>('*').forEach((node) => {
      if (node.scrollTop) node.scrollTop = 0
    })
    return () => el.removeEventListener('wheel', stop, { capture: true })
  }, [active])

  if (!active) return <>{children}</>
  return (
    <div ref={ref} className="relative h-full min-h-0 overflow-hidden">
      <div className="h-full min-h-0">{children}</div>
      <div
        // The readable part YIELDS on a short window (`min()`), so the card —
        // anchored to the bottom — is never cut off.
        className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center justify-end px-6 pb-8"
        style={{ top: `min(${visible}px, calc(100% - ${WALL_MIN}px))`, background: `linear-gradient(to bottom, transparent 0, ${tone} 96px, ${tone} 100%)` }}
      >
        <div
          role="region"
          aria-label={title}
          className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-5 text-center shadow-sm"
        >
          <p className="m-0 text-ui font-semibold text-fg">{title}</p>
          <p className="m-0 text-caption leading-relaxed text-fg-muted">{detail}</p>
          <button
            type="button"
            onClick={() => goToLogin(intent, 'signup')}
            className="h-8 w-full rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          >
            {t('Create a free account')}
          </button>
          <button
            type="button"
            onClick={() => goToLogin(intent, 'signin')}
            className="text-caption font-medium text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 rounded"
          >
            {t('I already have an account')}
          </button>
        </div>
      </div>
    </div>
  )
}
