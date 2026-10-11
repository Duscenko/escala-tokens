import { useState } from 'react'
import { useFreeTier } from '../../lib/access'
import {
  BRAND_THEME_CHOICES, brandThemeChoiceFor, brandThemeLabel, plannedBrandThemes, type BrandThemeId,
} from '../../lib/brandThemes'
import { useI18n } from '../../lib/i18n'
import { UpgradeToProDialog } from './UpgradeToProNotice'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

/** "Which themes does this brand ship?" — the same three answers the Figma
 *  plugin's "Add a brand" asks, in the same words: Light + Dark, Light only,
 *  Dark only, each with the number of themes it costs.
 *
 *  The choices come from `BRAND_THEME_CHOICES` (derived from the theme
 *  registry), never a list typed here, so a third theme shows up on its own.
 *  Free ships one theme: a choice with more than one stays visible, carries the
 *  PRO mark and opens the upgrade notice instead of selecting. */
export function BrandThemesPicker({ value, onChange, lead, onLead, label = true }: {
  value: readonly BrandThemeId[]
  onChange: (ids: BrandThemeId[]) => void
  /** The theme this brand leads with. On Free a brand ships one theme, so a
   *  stored list of several reads as this one — the stored list is left alone
   *  and is what the account gets back the day it is Pro. */
  lead?: BrandThemeId
  /** Asks which theme is the DEFAULT when the brand ships several: the one it
   *  opens on and lists first in Figma. A brand that ships one theme has
   *  nothing to ask — that theme is the default. */
  onLead?: (id: BrandThemeId) => void
  /** The caption above the row. Off where the host already names the field. */
  label?: boolean
}) {
  const { t } = useI18n()
  const free = useFreeTier()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const current = brandThemeChoiceFor(plannedBrandThemes(value, lead, free))
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <p className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{t('Themes this brand ships')}</p>
      )}
      {/* The multi-theme choice (Light + Dark, with its PRO mark) takes a full
          row; the single-theme ones share the next one. Three columns would not
          fit "Light + Dark" beside a PRO mark in a 240px rail. The one-theme
          cells drop the "1 theme" count: it is the same for both and the row
          has no room for it. */}
      <div role="radiogroup" aria-label={t('Themes this brand ships')} className="grid grid-cols-2 gap-1">
        {BRAND_THEME_CHOICES.map((choice) => {
          const on = choice.id === current.id
          const locked = free && choice.ids.length > 1
          const count = choice.ids.length
          const pair = count === 1
          return (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={on}
              title={locked ? t('Upgrade to Pro') : pair ? t('1 theme') : undefined}
              onClick={() => {
                if (locked) { setUpgradeOpen(true); return }
                onChange([...choice.ids])
              }}
              className={`${pair ? '' : 'col-span-2'} flex h-8 w-full items-center gap-2 rounded-lg border px-2.5 text-left transition-colors duration-150 ease-out ${FOCUS} ${
                on ? 'border-fg/40 bg-fg/8 text-fg' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
              }`}
            >
              <span
                aria-hidden
                className={`flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full border ${on ? 'border-fg' : 'border-line-strong'}`}
              >
                {on && <span className="h-1.5 w-1.5 rounded-full bg-fg" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-caption font-medium">{t(choice.label)}</span>
              {locked && (
                <span className="flex-shrink-0 rounded-full bg-accent-solid px-1.5 py-px text-nano font-semibold tracking-[0.1em] text-accent-ink">PRO</span>
              )}
              {!pair && (
                <span className="flex-shrink-0 text-micro text-fg-faint">
                  {t('{count} themes', { count: String(count) })}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {onLead && current.ids.length > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <span
            className="min-w-0 truncate text-caption font-medium text-fg-muted"
            title={t('The theme this brand opens on and lists first in Figma.')}
          >
            {t('Default theme')}
          </span>
          <div role="radiogroup" aria-label={t('Default theme')} className="flex h-7 flex-shrink-0 items-center gap-0.5 rounded-lg border border-line p-0.5">
            {current.ids.map((id) => {
              const on = id === lead
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onLead(id)}
                  className={`flex h-full items-center rounded-md px-2.5 text-caption font-medium transition-colors duration-150 ease-out ${FOCUS} ${
                    on ? 'bg-fg/8 text-fg' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {t(brandThemeLabel(id))}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <UpgradeToProDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  )
}
