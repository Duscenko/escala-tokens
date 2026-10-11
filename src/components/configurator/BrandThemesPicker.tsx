import { Fragment, useRef, useState } from 'react'
import { useOneThemePlan } from '../../lib/access'
import {
  BRAND_THEME_CHOICES, brandThemeChoiceFor, brandThemeLabel, plannedBrandThemes, type BrandThemeId,
} from '../../lib/brandThemes'
import { useI18n } from '../../lib/i18n'
import { UpgradeToProDialog } from './UpgradeToProNotice'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
/** Travel (px) past which a press on a theme is a drag, not a click. */
const DRAG_THRESHOLD = 10

/** "Which themes does this brand ship?" — Light · Dark · Both, in one row.
 *
 *  The choices come from `BRAND_THEME_CHOICES` (derived from the theme
 *  registry), never a list typed here, so a third theme shows up on its own.
 *
 *  With Both chosen the first theme wears a `Default` badge in the accent: the
 *  order IS the default theme — the one the brand opens on and lists first in
 *  Figma. It is changed by the swap button between the two, by dragging one
 *  across the other, or ←/→ on a focused one, so there is no separate "Default
 *  theme" control. Pressing a single theme still narrows the brand to it.
 *
 *  Without Pro — a Free account or a visitor with no account — a brand ships
 *  one theme: Both stays visible, carries the PRO mark and opens the upgrade
 *  notice instead of selecting. */
export function BrandThemesPicker({ value, onChange, lead, onLead, label = true }: {
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
}) {
  const { t } = useI18n()
  const limited = useOneThemePlan()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const pressX = useRef<number | null>(null)
  /** Set when a drag swapped the order, so the click that follows the pointer
   *  release does not also narrow the brand to the theme that was dragged. */
  const dragged = useRef(false)
  const current = brandThemeChoiceFor(plannedBrandThemes(value, lead, limited))
  const both = current.ids.length > 1
  const choices = [...BRAND_THEME_CHOICES].sort((x, y) => x.ids.length - y.ids.length)
  const singles = choices.filter((c) => c.ids.length === 1)
  const multi = choices.filter((c) => c.ids.length > 1)
  // With several shipped, the default theme comes first and wears the badge.
  const orderedSingles = both && lead
    ? [...singles].sort((x, y) => Number(y.ids[0] === lead) - Number(x.ids[0] === lead))
    : singles
  const reorderable = both && Boolean(onLead)

  const swapLead = () => {
    const next = orderedSingles[1]?.ids[0]
    if (next) onLead?.(next)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <p className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{t('Themes this brand ships')}</p>
      )}
      <div role="radiogroup" aria-label={t('Themes this brand ships')} className="flex h-8 select-none items-center gap-0.5 rounded-lg border border-line p-0.5">
        {orderedSingles.map((choice, i) => {
          const id = choice.ids[0]
          const on = choice.id === current.id
          const name = t(brandThemeLabel(id))
          const isDefault = both && i === 0
          return (
            <Fragment key={choice.id}>
              {reorderable && i === 1 && (
                <button
                  type="button"
                  onClick={swapLead}
                  aria-label={t('Swap order')}
                  title={t('Swap order')}
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-fg/8 hover:text-fg ${FOCUS}`}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2.5 5.5h10M10 3l2.5 2.5L10 8M13.5 10.5h-10M6 8l-2.5 2.5L6 13" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={isDefault ? `${name} — ${t('Default')}` : reorderable ? name : t(choice.label)}
                title={reorderable ? t('Drag to set which theme comes first') : t(choice.label)}
                onPointerDown={(e) => {
                  pressX.current = e.clientX
                  dragged.current = false
                  // Without capture the release lands on the OTHER theme (that
                  // is where the pointer is by then) and this one never hears it.
                  try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* best effort */ }
                }}
                onPointerUp={(e) => {
                  const from = pressX.current
                  pressX.current = null
                  if (reorderable && from != null && Math.abs(e.clientX - from) > DRAG_THRESHOLD) {
                    dragged.current = true
                    swapLead()
                  }
                }}
                onPointerCancel={() => { pressX.current = null }}
                onClick={() => {
                  if (dragged.current) { dragged.current = false; return }
                  onChange([...choice.ids])
                }}
                onKeyDown={(e) => {
                  if (reorderable && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                    e.preventDefault()
                    swapLead()
                  }
                }}
                className={`flex h-full items-center justify-center gap-1.5 rounded-md px-2 text-caption font-medium transition-colors duration-150 ease-out ${FOCUS} ${
                  // The default theme keeps its whole name beside the badge; the
                  // other one takes what is left.
                  isDefault ? 'flex-shrink-0' : 'min-w-0 flex-1'
                } ${
                  reorderable ? 'cursor-grab active:cursor-grabbing' : ''
                } ${on ? 'bg-fg/8 text-fg' : 'text-fg-muted hover:text-fg'}`}
              >
                <span className="truncate">{name}</span>
                {isDefault && (
                  <span
                    aria-hidden
                    className="flex-shrink-0 rounded-full bg-accent-solid px-1.5 py-px text-nano font-semibold tracking-[0.06em] text-accent-ink"
                  >
                    {t('Default')}
                  </span>
                )}
              </button>
            </Fragment>
          )
        })}
        {multi.map((choice) => {
          const on = choice.id === current.id
          return (
            <button
              key={choice.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={limited ? `${t('Both')} — ${t('Upgrade to Pro')}` : t('Both')}
              title={limited ? t('Upgrade to Pro') : t(choice.label)}
              onClick={() => {
                if (limited) { setUpgradeOpen(true); return }
                onChange([...choice.ids])
              }}
              className={`flex h-full flex-shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-caption font-medium transition-colors duration-150 ease-out ${FOCUS} ${
                on ? 'bg-fg/8 text-fg' : limited ? 'text-fg-faint hover:text-fg-muted' : 'text-fg-muted hover:text-fg'
              }`}
            >
              <span className="truncate">{t('Both')}</span>
              {limited && (
                <span className="flex-shrink-0 rounded-full bg-accent-solid px-1.5 py-px text-nano font-semibold tracking-[0.1em] text-accent-ink">PRO</span>
              )}
            </button>
          )
        })}
      </div>
      {limited ? (
        <p className="text-micro text-fg-faint">{t('Your plan ships one theme. You can still edit both.')}</p>
      ) : reorderable ? (
        <p className="text-micro text-fg-faint">{t('The default theme opens first. Swap or drag to change it.')}</p>
      ) : null}
      <UpgradeToProDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  )
}
