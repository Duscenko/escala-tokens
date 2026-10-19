import { useOneThemePlan } from '../../lib/access'
import {
  BRAND_THEME_CHOICES, brandThemeChoiceFor, brandThemeLabel, plannedBrandThemes, type BrandThemeId,
} from '../../lib/brandThemes'
import { useI18n } from '../../lib/i18n'
import { SELECT_CARD } from './themeWorkspaceLayout'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

/** The brand's theme row: Light · Dark.
 *
 *  Free — a brand ships ONE theme, so the row picks which. Light or Dark only;
 *  there is no Both segment (that used to be a Pro upsell and was removed).
 *
 *  Pro — a brand ships every theme, so there is nothing to choose about what
 *  leaves. The row is just which theme you are looking at, and that is the
 *  one the brand opens on.
 *
 *  The segments come from `BRAND_THEME_CHOICES` (derived from the theme
 *  registry), never a list typed here, so a third theme shows up on its own. */
export function BrandThemesPicker({ value, onChange, lead, onLead, label = true, field = false }: {
  value: readonly BrandThemeId[]
  onChange: (ids: BrandThemeId[]) => void
  /** The theme this brand leads with. On Free a brand ships one theme, so a
   *  stored list of several reads as this one — the stored list is left alone
   *  and is what the account gets back the day it is Pro. */
  lead?: BrandThemeId
  /** Sets which theme is the DEFAULT when the brand ships several. */
  onLead?: (id: BrandThemeId) => void
  /** The caption above the row. Off where the host already names the field. */
  label?: boolean
  /** One field row like the form's Name and Style rows: the label inside on
   *  the left, the segments on the right, no caption above. */
  field?: boolean
}) {
  const { t } = useI18n()
  const limited = useOneThemePlan()
  const current = brandThemeChoiceFor(plannedBrandThemes(value, lead, limited))
  const both = current.ids.length > 1
  const everyTheme = BRAND_THEME_CHOICES.find((c) => c.ids.length > 1)?.ids ?? []
  const singles = BRAND_THEME_CHOICES.filter((c) => c.ids.length === 1)
  const leadId = lead && singles.some((c) => c.ids[0] === lead) ? lead : singles[0]?.ids[0]
  const caption = limited ? t('Themes this brand ships') : t('Theme')

  const segments = (
        singles.map((choice) => {
          const id = choice.ids[0]
          // Pro ships both, so the lit segment is the theme on screen.
          const on = limited ? choice.id === current.id : both ? id === leadId : choice.id === current.id
          const name = t(brandThemeLabel(id))
          return (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={limited ? t(choice.label) : name}
              title={limited ? t(choice.label) : name}
              onClick={() => {
                if (limited) { onChange([...choice.ids]); return }
                if (!both && everyTheme.length) onChange([...everyTheme])
                onLead?.(id)
              }}
              className={`flex h-full min-w-0 flex-1 items-center justify-center rounded-md px-2 text-caption font-medium transition-colors duration-150 ease-out ${FOCUS} ${
                on ? 'bg-fg/8 text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              <span className="truncate">{name}</span>
            </button>
          )
        })
  )

  if (field) {
    return (
      <div className={`flex h-11 items-center gap-3 pl-3.5 pr-1.5 ${SELECT_CARD}`}>
        <span className="flex-shrink-0 text-ui text-fg-muted">{caption}</span>
        <div role="radiogroup" aria-label={caption} className="ml-auto flex h-8 min-w-0 max-w-[11rem] flex-1 select-none items-center gap-0.5 rounded-md bg-app/50 p-0.5">
          {segments}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <p className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{caption}</p>
      )}
      <div role="radiogroup" aria-label={caption} className="flex h-8 select-none items-center gap-0.5 rounded-lg border border-line p-0.5">
        {segments}
      </div>
    </div>
  )
}
