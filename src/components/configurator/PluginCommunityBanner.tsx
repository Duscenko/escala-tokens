import { FIGMA_PLUGIN_COMMUNITY } from '../../lib/utils'
import { useI18n } from '../../lib/i18n'
import { CHROME_CONTROL_HOVER, WORKSPACE_CHROME } from './themeWorkspaceLayout'
import { FigmaGlyph } from './TopNav'

/** Full-width announcement above the shell (Figma portfolio 4258:56326). */
export default function PluginCommunityBanner() {
  const { t } = useI18n()
  return (
    <a
      href={FIGMA_PLUGIN_COMMUNITY}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex flex-shrink-0 items-center justify-center gap-1.5 border-b border-line px-4 py-1.5 ${WORKSPACE_CHROME} text-fg transition-[color,box-shadow] ${CHROME_CONTROL_HOVER} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fg/40`}
    >
      <FigmaGlyph className="h-[15.75px] w-auto flex-shrink-0" aria-hidden />
      <span className="flex items-center gap-2">
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
          className="flex-shrink-0"
        >
          <path d="M4.5 2.5 8 6l-3.5 3.5" />
        </svg>
      </span>
    </a>
  )
}
