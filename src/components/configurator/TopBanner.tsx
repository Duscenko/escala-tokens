import type { ReactNode } from 'react'
import { useI18n } from '../../lib/i18n'
import { WORKSPACE_CHROME } from './themeWorkspaceLayout'

// The one announcement strip that sits ABOVE `TopNav` — the Figma Community
// plugin bar and the pricing launch promo both render through it, so every
// banner shares one height, one chrome fill, one hairline and one dismiss
// control instead of each page inventing its own (the promo used to be an
// accent-tinted block BELOW the header, a different element entirely).
//
// The content is centred on the VIEWPORT — the same axis `TopNav`'s section
// nav sits on — so a banner and the nav under it read as one column. The
// dismiss button is absolute so it never pushes that centre off; the content
// keeps `px-9` of room for it (only when there IS one) and wraps, balanced,
// on a narrow page — min-h, not h.

export default function TopBanner({
  children,
  onDismiss,
  dismissLabel,
}: {
  children: ReactNode
  /** Omit for a banner that can't be dismissed (e.g. a time-boxed promo on its own page). */
  onDismiss?: () => void
  dismissLabel?: string
}) {
  const { t } = useI18n()
  return (
    <div
      data-shell-chrome
      className={`relative flex min-h-[30px] flex-shrink-0 items-center justify-center border-b border-line py-1 ${onDismiss ? 'px-9' : 'px-4'} ${WORKSPACE_CHROME}`}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-center text-body text-fg [text-wrap:balance]">
        {children}
      </div>

      {onDismiss && (
        <button
          type="button"
          className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fg/40"
          aria-label={dismissLabel ?? t('Dismiss')}
          onClick={onDismiss}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
