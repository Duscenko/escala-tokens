import { useI18n } from '../../lib/i18n'
import { CONTACT_PATH, LEGAL_PATH, PRIVACY_PATH } from '../../lib/legal'
import { cn } from '../../lib/utils'

// The colophon links — Contact · Legal notice · Privacy · Source · MIT License.
// ONE component for every footer that carries them: the desktop shell's 28px
// rule (`Configurator`) and `AboutScaffold`'s footer, which is what a phone
// (`DesktopOnlyNotice`) and `/about` render. They used to be hand-written in
// the shell only, so the mobile screen had no door to the legal pages at all.
//
// `text-fg-muted`, not the `text-fg-faint` of the copyright line beside them:
// these are the INTERACTIVE things in a footer, and faint measured 4.39:1 at
// 10.5px — under AA for small text.

const LINK =
  'flex flex-shrink-0 items-center rounded px-0.5 text-mini text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50'

export function FooterLinks({
  className,
  linkClassName = 'h-full',
}: {
  className?: string
  /** Hit-area sizing. The shell passes `h-full` to claim its whole 28px strip;
   *  a free-flowing footer passes a min height instead (WCAG 2.2 target size). */
  linkClassName?: string
}) {
  const { t } = useI18n()
  // Plain concatenation, NOT `cn`: tailwind-merge reads the custom `text-mini`
  // size as a colour and drops it in favour of `text-fg-muted`.
  const link = `${LINK} ${linkClassName}`
  return (
    <div className={cn('flex flex-shrink-0 items-center gap-2', className)}>
      {/* Legal pages open in the same tab: they're short reads with their own
          way back, not a reason to keep a second tab around. */}
      <a href={CONTACT_PATH} className={link}>{t('Contact')}</a>
      <a href={LEGAL_PATH} className={link}>{t('Legal notice')}</a>
      <a href={PRIVACY_PATH} className={link}>{t('Privacy')}</a>
      <a
        href="https://github.com/Duscenko/escala-tokens"
        target="_blank"
        rel="noreferrer"
        aria-label="Open the Escala Tokens source on GitHub"
        title="Open the Escala Tokens source on GitHub"
        className={`${link} gap-1.5`}
      >
        <span
          aria-hidden
          className="h-3 w-3 bg-current"
          style={{
            WebkitMask: "url('/ide-logos/github-outline.svg') center / contain no-repeat",
            mask: "url('/ide-logos/github-outline.svg') center / contain no-repeat",
          }}
        />
        <span>Source</span>
      </a>
      <a
        href="https://github.com/Duscenko/escala-tokens/blob/main/LICENSE"
        target="_blank"
        rel="noreferrer"
        aria-label="Read the MIT License"
        title="Read the MIT License"
        className={link}
      >
        MIT License
      </a>
    </div>
  )
}
