import { useState } from 'react'
import { FIGMA_PLUGIN_COMMUNITY } from '../../lib/utils'
import { useI18n } from '../../lib/i18n'
import {
  dismissPluginCommunityBanner,
  isPluginCommunityBannerDismissed,
} from '../../lib/pluginCommunityBannerDismiss'
import TopBanner from './TopBanner'
import { FigmaGlyph } from './TopNav'

const linkClass =
  'inline-flex items-center gap-1.5 text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fg/40'

/** Full-width announcement above the shell (Figma portfolio 4258:56326).
 *  The CTA is centred on the VIEWPORT — the same axis `TopNav`'s section nav
 *  sits on — so the two stack on one line on every surface. */
export default function PluginCommunityBanner() {
  const { t } = useI18n()
  const [dismissed, setDismissed] = useState(() => isPluginCommunityBannerDismissed())

  if (dismissed) return null

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
    <TopBanner
      dismissLabel={t('Dismiss plugin announcement')}
      onDismiss={() => {
        dismissPluginCommunityBanner()
        setDismissed(true)
      }}
    >
      <a
        href={FIGMA_PLUGIN_COMMUNITY}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {cta}
      </a>
    </TopBanner>
  )
}
