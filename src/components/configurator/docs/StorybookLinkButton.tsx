// The stage header's door to the same page in the online Storybook — beside
// the CatalogueSwitcher, on component and block pages alike. It opens the
// family's (or block's) Documentation in a new tab. The hint says it is the
// Escala REFERENCE system: Storybook paints the Figma file's own palette, not
// the visitor's brand. URLs come from `lib/storybookLinks.ts`, never typed here.
import { useI18n } from '../../../lib/i18n'
import { HintTip } from '../../ui/HintTip'

const ICON_BTN =
  'flex h-8 w-8 items-center justify-center rounded-lg border border-line text-fg-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

/** Storybook's mark, drawn in one ink: the book with its bookmark and the S. */
export function StorybookGlyph({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 2.6 12 2.1a.9.9 0 0 1 .95.9v10a.9.9 0 0 1-.95.9l-8.4-.4a.9.9 0 0 1-.85-.9V3.5a.9.9 0 0 1 .75-.9Z" />
      <path d="M10.2 2.25v2.1l.75-.55.75.55V2.15" />
      <path d="M9.6 6.6c-.25-.5-.85-.8-1.6-.8-.85 0-1.45.4-1.45 1 0 1.4 3.15.75 3.15 2.35 0 .7-.7 1.15-1.65 1.15-.85 0-1.5-.35-1.75-.95" />
    </svg>
  )
}

export function StorybookLinkButton({ href }: { href: string }) {
  const { t } = useI18n()
  return (
    <HintTip label={t('Storybook reference (Escala system)')}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={ICON_BTN}
        aria-label={t('Open in Storybook: the Escala reference system, in a new tab')}
        data-testid="storybook-link"
      >
        <StorybookGlyph />
      </a>
    </HintTip>
  )
}
