import { useI18n } from '../../lib/i18n'

/**
 * Variables / Theme Preview when My themes is empty and nothing is tried on.
 * The store still holds scaffold `light`/`dark` with the default accent, and
 * that is what used to fill these tables — a purple "file" nobody added.
 */
export default function NeedMyThemeEmpty({
  onSeePreview,
  onCreateTheme,
}: {
  onSeePreview?: () => void
  onCreateTheme?: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex h-full min-h-0 items-center justify-center px-8" role="status">
      <div className="max-w-[20rem] text-center">
        <p className="text-body font-medium text-fg">{t('Add a theme to My themes')}</p>
        <p className="mt-1.5 text-caption leading-relaxed text-fg-muted">
          {onSeePreview
            ? t('Theme preview shows a System style. Add it to My themes, then edit here.')
            : t('Add a System style or create a theme. Trying one on does not add it.')}
        </p>
        {(onSeePreview || onCreateTheme) && (
          <div className="mt-4 flex flex-col items-stretch gap-2">
            {onSeePreview && (
              <button
                type="button"
                onClick={onSeePreview}
                className="h-8 rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
              >
                {t('See it in Theme preview')}
              </button>
            )}
            {onCreateTheme && (
              <button
                type="button"
                onClick={onCreateTheme}
                className="h-8 rounded-lg border border-line text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
              >
                {t('Create your theme')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
