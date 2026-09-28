import { FIGMA_PLUGIN_COMMUNITY } from '../../lib/utils'
import { useI18n } from '../../lib/i18n'
import { FigmaGlyph } from './TopNav'

/** Full-width announcement above the shell. The bar itself is the link. */
export default function PluginCommunityBanner() {
  const { t } = useI18n()
  return (
    <a
      href={FIGMA_PLUGIN_COMMUNITY}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-9 flex-shrink-0 items-center justify-center gap-2 bg-accent-solid px-4 py-2 text-center text-ui font-medium text-accent-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ink"
    >
      <FigmaGlyph className="h-3.5 w-auto flex-shrink-0" />
      <span>{t('Get the Escala Tokens plugin on Figma Community')}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
        <path d="M4.5 2.5 8 6l-3.5 3.5" />
      </svg>
    </a>
  )
}
