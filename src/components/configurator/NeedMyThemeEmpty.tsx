import { useI18n } from '../../lib/i18n'

/**
 * Variables / Theme Preview when My themes is empty and nothing is tried on.
 * The store still holds scaffold `light`/`dark` with the default accent, and
 * that is what used to fill these tables — a purple "file" nobody added.
 */
export default function NeedMyThemeEmpty() {
  const { t } = useI18n()
  return (
    <div className="flex h-full min-h-0 items-center justify-center px-8" role="status">
      <div className="max-w-[20rem] text-center">
        <p className="text-body font-medium text-fg">{t('Add a theme to My themes')}</p>
        <p className="mt-1.5 text-caption leading-relaxed text-fg-muted">
          {t('Add a System style or create a theme. Trying one on does not add it.')}
        </p>
      </div>
    </div>
  )
}
