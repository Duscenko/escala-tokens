// The Color edition, as one list of roles under one slider.
//
// Accent · Neutral · Success · Critical · Warning · Info are rows: a swatch
// with its hex beside the role's name. Picking a row points the slider above
// at it, so there is one control to learn instead of a slider per colour.
// The slider is scoped per role — Accent sweeps the whole wheel, a status
// colour only the band where it still reads as that status (Warning can move
// between orange and yellow, never into green).
//
// The rows show the theme being edited: switch to Dark and every swatch is
// that theme's own anchor. A hue move lands in BOTH themes, each holding its
// own saturation and brightness, and the dark one is kept a little dimmer —
// the same colour, tuned for the page it sits on.

import { useRef, useState, type ReactNode } from 'react'
import { COLOR_ROLE_BAND, COLOR_ROLE_LABEL, ROLE_LABEL_INKS, checkRoleColor, type ColorRoleId } from '../../lib/colorRoles'
import type { ThemeAppearance } from '../../lib/themeModes'
import { useI18n } from '../../lib/i18n'
import SpectrumSlider from '../ui/SpectrumSlider'
import { LockGlyph } from '../ui/icons'
import { TintSlider } from './ThemeQuickSettingsRail'
import type { NeutralTint } from '../../lib/colorUtils'

const HEX_RE = /^#?([0-9a-f]{6})$/i

export interface ColorRoleRow {
  id: ColorRoleId
  /** This theme's anchor (tone 9). */
  hex: string
  /** Neutral only: it follows the accent. */
  linked?: boolean
  /** The value shown is derived, not set — e.g. the neutral's dark tone,
   *  which comes from its one base. Typing would edit the wrong thing. */
  readOnly?: boolean
}

export function ColorRolesPanel({
  appearance, header, rows, selected, onSelect,
  onHex, onHuePreview, onHueCommit, solveAt,
  neutralTint, onNeutralTint, onToggleNeutralLink,
  swatchRef, onSwatch, pickers, page, after,
}: {
  appearance: ThemeAppearance
  /** Light / Dark and Random, drawn above the slider. */
  header: ReactNode
  rows: ColorRoleRow[]
  selected: ColorRoleId
  onSelect: (id: ColorRoleId) => void
  /** A hex typed into a row. It sets that role in the theme on screen only. */
  onHex: (id: ColorRoleId, hex: string) => void
  onHuePreview?: (id: ColorRoleId, hex: string, hue: number) => void
  onHueCommit: (id: ColorRoleId, hue: number) => void
  /** The colour a role takes at `hue` in the theme on screen — the same
   *  solve the commit writes, so the slider never shows one value and lands
   *  another. */
  solveAt: (id: ColorRoleId, hue: number) => string
  neutralTint: NeutralTint
  onNeutralTint: (tint: NeutralTint) => void
  onToggleNeutralLink: () => void
  /** Each swatch opens the full picker. */
  swatchRef: (id: ColorRoleId) => (node: HTMLDivElement | null) => void
  onSwatch: (id: ColorRoleId) => void
  pickers: ReactNode
  /** The page this theme paints on — the accessibility readout measures against it. */
  page: string
  /** Rows that are not roles (extra brand palettes). */
  after?: ReactNode
}) {
  const { t } = useI18n()
  const current = rows.find((row) => row.id === selected) ?? rows[0]
  const neutral = rows.find((row) => row.id === 'neutral')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-fg/[0.03] p-2.5">
        {header}

        {current.id === 'neutral' ? (
          <TintSlider hueHex={current.hex} value={neutralTint} onChange={onNeutralTint} />
        ) : (
          <SpectrumSlider
            key={`${current.id}-${appearance}`}
            value={current.hex}
            band={COLOR_ROLE_BAND[current.id]}
            colorAt={(hue) => solveAt(current.id, hue)}
            ariaLabel={`${t(COLOR_ROLE_LABEL[current.id])} hue`}
            onPreview={onHuePreview ? (hex, hue) => onHuePreview(current.id, hex, hue) : undefined}
            onCommit={(_hex, hue) => onHueCommit(current.id, hue)}
          />
        )}

        <div role="radiogroup" aria-label={t('Colour roles')} className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <RoleRow
              key={row.id}
              row={row}
              on={row.id === current.id}
              onSelect={() => onSelect(row.id)}
              onHex={(hex) => onHex(row.id, hex)}
              swatchRef={swatchRef(row.id)}
              onSwatch={() => { onSelect(row.id); onSwatch(row.id) }}
              onToggleLink={row.id === 'neutral' ? onToggleNeutralLink : undefined}
            />
          ))}
        </div>
        {pickers}
        {after}
      </div>

      {current.id !== 'neutral' && <AccessibilityReadout hex={current.hex} page={page} appearance={appearance} />}
      {current.id === 'neutral' && neutral && (
        <p className="px-1 text-mini text-fg-faint">
          {neutral.linked
            ? t('Neutral follows the accent. Unlock it to pick your own.')
            : t('Neutral is set by hand. Lock it to follow the accent again.')}
        </p>
      )}
    </div>
  )
}

function RoleRow({ row, on, onSelect, onHex, swatchRef, onSwatch, onToggleLink }: {
  row: ColorRoleRow
  on: boolean
  onSelect: () => void
  onHex: (hex: string) => void
  swatchRef: (node: HTMLDivElement | null) => void
  onSwatch: () => void
  onToggleLink?: () => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const label = t(COLOR_ROLE_LABEL[row.id])
  const pill = `flex h-9 min-w-0 items-center rounded-[10px] border transition-colors duration-150 ${
    on ? 'border-line-strong bg-fg/[0.06]' : 'border-transparent bg-fg/[0.04] hover:bg-fg/[0.07]'
  }`
  // Leaving the field writes only a CHANGED, valid hex. Writing back what was
  // shown is not a no-op: the neutral's dark row shows a derived tone, and
  // committing it would set the neutral itself and unlink it from the accent.
  const save = () => {
    if (draft == null) return
    const match = HEX_RE.exec(draft.trim())
    const next = match ? `#${match[1].toLowerCase()}` : null
    if (next && next !== row.hex.toLowerCase()) onHex(next)
    setDraft(null)
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <div className={`${pill} gap-2 pl-1.5 pr-1.5`} onClick={() => { onSelect(); input.current?.focus() }}>
        <div ref={swatchRef} className="flex-shrink-0">
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onSwatch() }}
            aria-label={`${label} — ${row.hex} — open picker`}
            className="block h-5 w-5 rounded-[6px] border border-fg/10 transition-transform duration-75 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60"
            style={{ background: row.hex }}
          />
        </div>
        <input
          ref={input}
          value={draft ?? row.hex.toUpperCase()}
          onFocus={(event) => { onSelect(); setDraft(row.hex.toUpperCase()); event.currentTarget.select() }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') { setDraft(null); event.currentTarget.blur() }
          }}
          spellCheck={false}
          readOnly={row.readOnly}
          title={row.readOnly ? t('Derived from the neutral base. Edit it in Light.') : undefined}
          aria-label={`${label} hex`}
          className="min-w-0 flex-1 bg-transparent font-mono text-ui text-fg outline-none"
        />
      </div>
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={onSelect}
        className={`${pill} justify-between gap-1 pl-2.5 pr-1 text-left text-ui text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
      >
        <span className="truncate">{label}</span>
        {onToggleLink && (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => { event.stopPropagation(); onToggleLink() }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onToggleLink() }
            }}
            aria-label={row.linked ? t('Unlock Neutral from the accent') : t('Lock Neutral to the accent')}
            aria-pressed={row.linked}
            title={row.linked ? t('Follows the accent. Click to set it by hand.') : t('Set by hand. Click to follow the accent.')}
            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-fg/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${row.linked ? 'text-fg-muted' : 'text-fg-faint opacity-60'}`}
          >
            <LockGlyph size={13} />
          </span>
        )}
      </button>
    </div>
  )
}

/** The selected colour measured the way the solver measures it: against the
 *  page as a shape (WCAG 3:1 + APCA Lc 45) and with a label on it (WCAG 4.5:1
 *  + APCA Lc 60). Both metrics are shown, so a pass on one and a miss on the
 *  other is visible instead of averaged away. */
function AccessibilityReadout({ hex, page, appearance }: { hex: string; page: string; appearance: ThemeAppearance }) {
  const { t } = useI18n()
  const c = checkRoleColor(hex, page)
  const pageOk = c.pageWcag >= 3 && c.pageLc >= 45
  const labelOk = c.ink !== null
  const grade = pageOk && labelOk ? 'good' : pageOk || labelOk ? 'fair' : 'poor'
  const white = c.labelInk === ROLE_LABEL_INKS[0]
  const tone = {
    good: { dot: 'bg-status-success-solid', chip: 'bg-status-success/15 text-status-success', word: t('Good'), note: t('Reads well on this theme.') },
    fair: { dot: 'bg-status-warning-solid', chip: 'bg-status-warning/15 text-status-warning', word: t('Fair'), note: !pageOk ? t('Faint against the page. Fine as a fill, weak as a line or icon.') : t('Labels on it need large or bold text.') },
    poor: { dot: 'bg-status-danger-solid', chip: 'bg-status-danger/15 text-status-danger', word: t('Poor'), note: t('Hard to see on this page and hard to read on. Pick a deeper or brighter tone.') },
  }[grade]

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-fg/[0.03] p-3">
      <div className="flex items-center justify-between">
        <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">{t('Accessibility')}</span>
        <span className={`rounded-md px-2 py-0.5 text-caption font-semibold ${tone.chip}`}>{tone.word}</span>
      </div>
      <p className="flex items-baseline gap-2 text-caption text-fg-muted">
        <span aria-hidden className={`h-2 w-2 flex-shrink-0 translate-y-[-1px] rounded-full ${tone.dot}`} />
        <span className="font-semibold text-fg">{t(appearance === 'dark' ? 'Dark' : 'Light')}</span>
        <span className="tabular-nums">
          {t('{ratio}:1 on surface', { ratio: c.pageWcag.toFixed(1) })} · Lc {Math.round(c.pageLc)}
        </span>
      </p>
      <p className="pl-4 text-caption tabular-nums text-fg-muted">
        {white
          ? t('white label {ratio}:1', { ratio: c.labelWcag.toFixed(1) })
          : t('dark label {ratio}:1', { ratio: c.labelWcag.toFixed(1) })} · Lc {Math.round(c.labelLc)}
      </p>
      <p className="text-caption text-fg-faint">{tone.note}</p>
    </div>
  )
}
