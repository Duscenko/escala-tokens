import { useState } from 'react'
import { FIGMA_PLUGIN_COMMUNITY } from '../../lib/utils'
import { useI18n } from '../../lib/i18n'
import {
  dismissPluginCommunityBanner,
  isPluginCommunityBannerDismissed,
} from '../../lib/pluginCommunityBannerDismiss'
import { WORKSPACE_CHROME } from './themeWorkspaceLayout'
import { FigmaGlyph, TOP_NAV_LOCKUP_FALLBACK_W } from './TopNav'

const linkClass =
  'inline-flex items-center gap-1.5 text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fg/40'

type PluginCommunityBannerProps = {
  /** When set, CTA uses the same anchor as section nav in `TopNav`. */
  navAnchorBrandW?: number
  /** Viewport-centered CTA (About / mobile reading surfaces). */
  centerInViewport?: boolean
}

/** Full-width announcement above the shell (Figma portfolio 4258:56326). */
export default function PluginCommunityBanner({
  navAnchorBrandW,
  centerInViewport = false,
}: PluginCommunityBannerProps) {
  const { t } = useI18n()
  const [dismissed, setDismissed] = useState(() => isPluginCommunityBannerDismissed())

  if (dismissed) return null

  const anchorW = navAnchorBrandW ?? TOP_NAV_LOCKUP_FALLBACK_W
  const alignWithNav = !centerInViewport && navAnchorBrandW != null

  const cta = (
    <>
      <FigmaGlyph className="h-[11px] w-auto flex-shrink-0" aria-hidden />
      <span className="flex items-center gap-1.5">
        <span className="text-body font-normal tracking-[0.01em]">
          {t('Get the Escala Tokens plugin on Figma Community')}
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="flex-shrink-0 opacity-70"
        >
          <path d="M4.5 2.5 8 6l-3.5 3.5" />
        </svg>
      </span>
    </>
  )

  return (
    <div
      className={`relative flex h-[30px] flex-shrink-0 items-center border-b border-line pl-3 pr-3 ${WORKSPACE_CHROME}`}
    >
      {alignWithNav ? (
        <a
          href={FIGMA_PLUGIN_COMMUNITY}
          target="_blank"
          rel="noopener noreferrer"
          className={`absolute ${linkClass}`}
          style={{
            left: `calc(50% + ${anchorW / 2}px)`,
            transform: 'translateX(-50%)',
          }}
        >
          {cta}
        </a>
      ) : (
        <a
          href={FIGMA_PLUGIN_COMMUNITY}
          target="_blank"
          rel="noopener noreferrer"
          className={`mx-auto ${linkClass}`}
        >
          {cta}
        </a>
      )}

      <button
        type="button"
        className="relative z-[1] ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fg/40"
        aria-label={t('Dismiss plugin announcement')}
        onClick={() => {
          dismissPluginCommunityBanner()
          setDismissed(true)
        }}
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
    </div>
  )
}
