// A System Style before it is yours — shared by TopNav's theme sheet and the
// quick-settings rail (which shows it in place of the controls while a style
// is only being previewed). One component, so "what this style is" and the
// one button that makes it yours read the same in both places.

import { generateColorScale } from '../../lib/colorUtils'
import { useI18n } from '../../lib/i18n'
import { THEME_STYLE_PRESETS, presetStates, type ThemeStylePreset } from '../../lib/themePresets'
import { ThemeAvatar } from './ThemeLibraryRail'
import { useNeedsProForAnotherTheme } from '../../lib/access'
import { UpgradeToProNotice } from './UpgradeToProNotice'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

export const PRESET_AVATAR_RAMPS = Object.fromEntries(
  THEME_STYLE_PRESETS.flatMap((preset) =>
    (['light', 'dark'] as const).map((appearance) => [
      `${preset.id}:${appearance}`,
      generateColorScale(preset.accent, 'radix', 0, undefined, appearance),
    ]),
  ),
)

/** What a style IS before it is yours: its name and brief, its palette (accent
 *  + the four severities it ships), and the foundation picks that make it that
 *  style. Read off the preset itself — a style that isn't adopted has no export
 *  to count yet, so the library's primitive/token/CSS numbers don't exist. */
export function StyleOverview({
  preset, appearance, owned, onEdit, compact = false,
  firstSystem = false,
}: {
  preset: ThemeStylePreset
  appearance: 'light' | 'dark'
  owned: boolean
  onEdit: () => void
  /** The 240px quick-settings rail: tighter padding. */
  compact?: boolean
  /** No theme of their own yet: the button names the design system. */
  firstSystem?: boolean
}) {
  const { t } = useI18n()
  // Free keeps one theme: a style that isn't already yours needs Pro to add.
  const needsPro = useNeedsProForAnotherTheme() && !owned
  const f = preset.foundations
  const states = presetStates(preset)
  const ramp = PRESET_AVATAR_RAMPS[`${preset.id}:${appearance}`]
  const boxRole = f.radiusRoles?.container
  const boxRadius = boxRole ? f.radius?.[boxRole] : undefined
  const facts = [
    { label: t('Font'), value: f.typography?.headingFontFamily ?? f.typography?.fontFamily },
    { label: t('Radius'), value: boxRadius },
    { label: t('Icons'), value: f.iconWeight },
    { label: t('Neutral'), value: preset.neutralTint },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value))
  const swatches = [ramp?.[9] ?? preset.accent, states.error, states.warning, states.success, states.info]

  return (
    <div className={compact
      // The rail's own language: flat on the column (no card fill, border or
      // radius — `EditionCard` has none), `px-3` like every section there.
      ? 'flex flex-col gap-4 px-3 pb-3 pt-1'
      : 'mt-1 flex flex-col gap-5 rounded-2xl border border-line bg-app/50 p-5'}>
      <div className="flex items-start gap-3.5">
        <ThemeAvatar size={compact ? 36 : 44} ramp={ramp} appearance={appearance} fallback={preset.accent} />
        <div className="min-w-0">
          <p className="truncate text-strong font-semibold text-fg">{preset.label}</p>
          <p className="mt-0.5 text-body leading-relaxed text-fg-muted">{t(preset.description)}</p>
        </div>
      </div>
      <div aria-hidden className="flex h-7 overflow-hidden rounded-lg">
        {swatches.map((hex, i) => <span key={i} className={i === 0 ? 'flex-[2]' : 'flex-1'} style={{ background: hex }} />)}
      </div>
      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {facts.map((fact) => (
            <div key={fact.label} className="flex min-w-0 flex-col-reverse">
              <dt className="mt-0.5 text-mini font-semibold uppercase tracking-widest text-fg-faint">{fact.label}</dt>
              <dd className="truncate text-ui font-semibold capitalize text-fg" title={fact.value}>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {needsPro ? (
        <UpgradeToProNotice />
      ) : (
        <>
          <button
            type="button"
            onClick={onEdit}
            className={`flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink transition-opacity hover:opacity-90 ${FOCUS}`}
          >
            {owned ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9.5 2.5 11.5 4.5 5 11H3V9l6.5-6.5Z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
                <path d="M7 3v8M3 7h8" />
              </svg>
            )}
            {owned ? t('Edit theme') : firstSystem ? t('Add design system') : t('Add theme')}
          </button>
          {!owned && (
            <p className="-mt-2 text-center text-mini text-fg-faint">
              {firstSystem ? t('Opens quick edition on this system.') : t('Adds it to My themes.')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
