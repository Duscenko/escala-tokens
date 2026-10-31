import { useId, type KeyboardEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useOneThemePlan } from '../../lib/access'
import {
  BRAND_THEME_CHOICES, brandThemeChoiceFor, brandThemeDef, brandThemeLabel, plannedBrandThemes, shippedThemes, type BrandThemeId,
} from '../../lib/brandThemes'
import { useI18n } from '../../lib/i18n'
import type { ThemeAppearance } from '../../lib/themeModes'
import { useDesignStore } from '../../store/useDesignStore'
import { HintTip } from '../ui/HintTip'
import { CHROME_CONTROL_SHELL, SEGMENT_ACTIVE_INK, SEGMENT_INACTIVE, SELECT_CARD } from './themeWorkspaceLayout'
import { SegmentHighlight } from '../ui/SegmentHighlight'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui'

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
export function BrandThemesPicker({ value, onChange, lead, onLead, label = true, field = false, inset = false }: {
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
  /** Inside the board toolbar, beside Theme · Components: a sun and a moon
   *  in the same recessed well, the selected one on a sliding pill. */
  inset?: boolean
}) {
  const { t } = useI18n()
  const group = useId()
  const reduceMotion = useReducedMotion()
  const limited = useOneThemePlan()
  const current = brandThemeChoiceFor(plannedBrandThemes(value, lead, limited))
  const both = current.ids.length > 1
  const everyTheme = BRAND_THEME_CHOICES.find((c) => c.ids.length > 1)?.ids ?? []
  const singles = BRAND_THEME_CHOICES.filter((c) => c.ids.length === 1)
  const leadId = lead && singles.some((c) => c.ids[0] === lead) ? lead : singles[0]?.ids[0]
  const caption = limited ? t('Themes this brand ships') : t('Theme')

  // WAI-ARIA radio group: arrows move focus AND select, wrapping at the ends.
  const onRadioKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'))
    const at = radios.findIndex((radio) => radio === document.activeElement)
    const next = radios[(at + step + radios.length) % radios.length]
    next?.focus()
    next?.click()
  }

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
              // Roving tab stop: only the checked segment is in the tab order;
              // the arrows move between them (`onRadioKeys`).
              tabIndex={on ? 0 : -1}
              // The segmented-control language (raised fill + semibold) shared
              // with Desktop / Tablet / Mobile — the fill is one
              // `SegmentHighlight` that slides to the picked segment.
              className={`relative flex h-full min-w-0 flex-1 items-center justify-center rounded-md px-2 text-caption transition-colors duration-150 ease-out motion-reduce:transition-none ${FOCUS} ${
                on ? SEGMENT_ACTIVE_INK : SEGMENT_INACTIVE
              }`}
            >
              {on && <SegmentHighlight group={group} />}
              <span className="relative truncate">{name}</span>
            </button>
          )
        })
  )

  if (inset) {
    return (
      <div role="radiogroup" aria-label={caption} onKeyDown={onRadioKeys} className="flex h-8 flex-shrink-0 select-none items-center gap-0.5 rounded-lg bg-fg/[0.04] p-0.5">
        {singles.map((choice) => {
          const id = choice.ids[0]
          const on = limited ? choice.id === current.id : both ? id === leadId : choice.id === current.id
          const name = limited ? t(choice.label) : t(brandThemeLabel(id))
          return (
            <HintTip key={choice.id} label={name}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={name}
                tabIndex={on ? 0 : -1}
                onClick={() => {
                  if (limited) { onChange([...choice.ids]); return }
                  if (!both && everyTheme.length) onChange([...everyTheme])
                  onLead?.(id)
                }}
                className={`relative flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150 ease-out motion-reduce:transition-none ${FOCUS} ${
                  on ? 'text-fg' : 'text-fg-faint hover:bg-fg/[0.06] hover:text-fg'
                }`}
              >
                {on && (
                  <motion.span
                    layoutId={group}
                    aria-hidden
                    className="absolute inset-0 rounded-md bg-fg/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.4)]"
                    transition={reduceMotion ? { duration: 0 } : { type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <span className="relative flex">
                  {brandThemeDef(id)?.base === 'dark' ? <MoonGlyph /> : <SunGlyph />}
                </span>
              </button>
            </HintTip>
          )
        })}
      </div>
    )
  }

  if (field) {
    return (
      <div className={`flex h-11 items-center gap-3 pl-3.5 pr-1.5 ${SELECT_CARD}`}>
        <span className="flex-shrink-0 text-ui text-fg-muted">{caption}</span>
        <div role="radiogroup" aria-label={caption} onKeyDown={onRadioKeys} className={`ml-auto flex h-8 min-w-0 max-w-[11rem] flex-1 select-none items-center gap-0.5 rounded-md p-0.5 ${CHROME_CONTROL_SHELL}`}>
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
      <div role="radiogroup" aria-label={caption} onKeyDown={onRadioKeys} className={`flex h-8 select-none items-center gap-0.5 rounded-lg p-0.5 ${CHROME_CONTROL_SHELL}`}>
        {segments}
      </div>
    </div>
  )
}

function SunGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.6 3.6l1.05 1.05M11.35 11.35l1.05 1.05M3.6 12.4l1.05-1.05M11.35 4.65l1.05-1.05" />
    </svg>
  )
}

function MoonGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden>
      <path d="M13.25 9.6A5.5 5.5 0 0 1 6.4 2.75a5.5 5.5 0 1 0 6.85 6.85Z" />
    </svg>
  )
}

/** Light · Dark on the board toolbar: the brand's theme row as two icons.
 *  Same rules as the Color edition's row it replaces — on Free it picks the
 *  ONE theme the brand ships; on Pro, the theme the board shows and the
 *  brand opens on. */
export function BoardThemeSwitch({ previewTheme, onAppearance }: {
  previewTheme: string
  /** The board's appearance follows the pick. */
  onAppearance: (appearance: ThemeAppearance) => void
}) {
  const brandThemes = useDesignStore((s) => s.brandThemes)
  const kind = useDesignStore((s) => s.themeKinds[previewTheme])
  const setBrandThemes = useDesignStore((s) => s.setBrandThemes)
  /** Make `appearance` the brand's default theme and show it. */
  const leadWith = (appearance: ThemeAppearance) => {
    const live = useDesignStore.getState()
    const sources = live.themeSources[previewTheme]
    if (sources && live.themeKinds[previewTheme] !== appearance) live.updateTheme(previewTheme, appearance, sources)
    onAppearance(appearance)
  }
  return (
    <BrandThemesPicker
      inset
      label={false}
      value={shippedThemes(brandThemes, previewTheme)}
      lead={kind === 'dark' ? 'dark' : 'light'}
      onLead={(id) => leadWith(brandThemeDef(id)?.base ?? 'light')}
      onChange={(ids) => {
        setBrandThemes(previewTheme, ids)
        // A brand that ships one theme leads with it, and the board shows it.
        const only = ids.length === 1 ? brandThemeDef(ids[0])?.base : undefined
        if (only) leadWith(only)
      }}
    />
  )
}
