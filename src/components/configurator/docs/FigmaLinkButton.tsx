// The stage header's door to the same page in the Figma Preview library, beside
// Storybook's. Links come from `lib/figmaPreviewPages.ts`, never typed here.
import { useI18n } from '../../../lib/i18n'
import { HintTip } from '../../ui/HintTip'
import { FigmaGlyph } from '../../ui/icons'

const ICON_BTN =
  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-line text-fg-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

export function FigmaLinkButton({ href, name }: { href: string; name: string }) {
  const { t } = useI18n()
  return (
    <HintTip label={t('Open in the Figma Preview library')}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={ICON_BTN}
        aria-label={t('Open {name} in the Escala Design System in Figma', { name })}
        data-testid="figma-link"
      >
        <FigmaGlyph size={15} />
      </a>
    </HintTip>
  )
}
