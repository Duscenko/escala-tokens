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

/** The group the roles and the accessibility readout sit in. No fill of its
 *  own: it sits on the inspector's `surface.layer-2`, and its rows carry
 *  `layer-1` (platform foundations). */
const CARD = 'flex flex-col gap-3.5'
/** The accessibility readout: a `surface.layer-1` card lit from the top edge
 *  (Figma 1:7003). */
const READOUT_CARD = 'flex flex-col gap-3.5 rounded-[18px] border-t border-line bg-surface px-[11.25px] pb-[11.25px] pt-[12.25px]'

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
  neutralTint, onNeutralTint, onToggleLink,
  page, after,
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
  /** Neutral: follow the accent's hue. A status: follow the accent's
   *  chroma, solved for contrast. All four statuses share one switch. */
  onToggleLink: (id: ColorRoleId) => void
  /** The page this theme paints on — the accessibility readout measures against it. */
  page: string
  /** Rows that are not roles (extra brand palettes). */
  after?: ReactNode
}) {
  const { t } = useI18n()
  const current = rows.find((row) => row.id === selected) ?? rows[0]
  const neutral = rows.find((row) => row.id === 'neutral')

  return (
    <div className="flex flex-col gap-3.5">
      <div className={CARD}>
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

        <div role="radiogroup" aria-label={t('Colour roles')} className="flex flex-col gap-2">
          {rows.map((row) => (
            <RoleRow
              key={row.id}
              row={row}
              on={row.id === current.id}
              onSelect={() => onSelect(row.id)}
              onHex={(hex) => onHex(row.id, hex)}
              onToggleLink={row.linked === undefined ? undefined : () => onToggleLink(row.id)}
            />
          ))}
        </div>
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

function RoleRow({ row, on, onSelect, onHex, onToggleLink }: {
  row: ColorRoleRow
  on: boolean
  onSelect: () => void
  onHex: (hex: string) => void
  onToggleLink?: () => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const label = t(COLOR_ROLE_LABEL[row.id])
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

  // One row per role (Figma 1:6928): the role's name and its lock lead, the
  // swatch + hex sit in their own pill on the right. Rows are
  // `surface.layer-1` on the `layer-2` panel; the selected row — the one the
  // slider above edits — carries the `border.control-hover` edge and its hex
  // pill fills with `action.secondary.default`.
  return (
    <div
      className={`flex items-center gap-2 rounded-[10px] bg-surface p-1 transition-shadow duration-150 ${
        on
          ? 'shadow-[inset_0_0_0_1px_var(--line-emphasis)]'
          : 'hover:shadow-[inset_0_0_0_1px_var(--line-strong)]'
      }`}
    >
      {/* The lock is a SIBLING of the label button, never inside it: an
          interactive element nested in a <button> is invalid, and a real
          mouse click on it went to the outer button (selecting the row) while
          the lock itself never fired. */}
      <div className="flex min-w-0 flex-1 items-center gap-1 pr-1">
        <button
          type="button"
          role="radio"
          aria-checked={on}
          onClick={onSelect}
          className={`flex h-[22.5px] min-w-0 flex-1 items-center rounded-md pl-2 text-left text-ui transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${on ? 'text-fg' : 'text-fg-muted hover:text-fg'}`}
        >
          <span className="truncate">{label}</span>
        </button>
        {onToggleLink && (
          <button
            type="button"
            onClick={onToggleLink}
            aria-label={row.id === 'neutral'
              ? (row.linked ? t('Unlock Neutral from the accent') : t('Lock Neutral to the accent'))
              : (row.linked ? t('Unlock states from the accent') : t('Lock states to the accent'))}
            aria-pressed={row.linked}
            title={row.id === 'neutral'
              ? (row.linked ? t('Follows the accent. Click to set it by hand.') : t('Set by hand. Click to follow the accent.'))
              : (row.linked
                ? t('Success, Critical, Warning and Info follow the accent’s chroma, solved for contrast. Click to set them by hand.')
                : t('Set by hand. Click to make all four states follow the accent’s chroma.'))}
            className={`flex h-[22.5px] w-[22.5px] flex-shrink-0 items-center justify-center rounded transition-colors hover:bg-fg/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${row.linked ? 'text-fg-muted' : 'text-fg-faint'}`}
          >
            <LockGlyph size={12} />
          </button>
        )}
      </div>
      <div
        className={`flex h-[22.5px] w-[98px] flex-shrink-0 cursor-text items-center gap-2 rounded-[6px] pr-1.5 transition-colors ${on ? 'bg-chrome-control' : ''}`}
        onClick={() => { onSelect(); input.current?.focus() }}
      >
        <span
          aria-hidden
          className="block h-[22.5px] w-[22.5px] flex-shrink-0 rounded-[6px] border border-fg/40"
          style={{ background: row.hex }}
        />
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
          className="min-w-0 flex-1 bg-transparent text-ui tabular-nums text-fg outline-none"
        />
      </div>
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
  // WCAG AA alone (3:1 as a shape, 4.5:1 with a label). A colour can clear it
  // and still miss APCA, which is what asks for larger or heavier text.
  const aaOk = c.pageWcag >= 3 && c.labelWcag >= 4.5
  const grade = pageOk && labelOk ? 'good' : aaOk ? 'aa' : pageOk || labelOk ? 'fair' : 'poor'
  const white = c.labelInk === ROLE_LABEL_INKS[0]
  const tone = {
    good: { dot: 'bg-status-success-solid', chip: 'bg-status-success/15 text-status-success', word: t('AA + APCA'), note: t('Reads well on this theme.') },
    aa: { dot: 'bg-status-success-solid', chip: 'bg-status-success/15 text-status-success', word: t('AA Compliant'), note: t('Meets WCAG AA. Perceptual contrast (APCA) is lower, so labels on it read best at a larger or heavier size.') },
    fair: { dot: 'bg-status-warning-solid', chip: 'bg-status-warning/15 text-status-warning', word: t('Partial AA'), note: !pageOk ? t('Faint against the page. Fine as a fill, weak as a line or icon.') : t('Labels on it need large or bold text.') },
    poor: { dot: 'bg-status-danger-solid', chip: 'bg-status-danger/15 text-status-danger', word: t('Below AA'), note: t('Hard to see on this page and hard to read on. Pick a deeper or brighter tone.') },
  }[grade]

  return (
    <div className={READOUT_CARD}>
      <div className="flex items-center justify-between">
        <span className="text-mini uppercase tracking-[0.1em] text-fg-faint">{t('Accessibility')}</span>
        <span className={`rounded-md px-2 py-0.5 text-caption ${tone.chip}`}>{tone.word}</span>
      </div>
      <div className="flex flex-col gap-1">
      <p className="flex items-baseline gap-2 text-caption text-fg-muted">
        <span aria-hidden className={`h-[9px] w-[9px] flex-shrink-0 translate-y-[0.5px] rounded-full ${tone.dot}`} />
        <span className="text-fg">{t(appearance === 'dark' ? 'Dark' : 'Light')}</span>
        <span className="tabular-nums">
          {t('{ratio}:1 on surface', { ratio: c.pageWcag.toFixed(1) })} · Lc {Math.round(c.pageLc)}
        </span>
      </p>
      <p className="pl-[18px] text-caption tabular-nums text-fg-muted">
        {white
          ? t('white label {ratio}:1', { ratio: c.labelWcag.toFixed(1) })
          : t('dark label {ratio}:1', { ratio: c.labelWcag.toFixed(1) })} · Lc {Math.round(c.labelLc)}
      </p>
      </div>
      <p className="text-caption text-fg-faint">{tone.note}</p>
    </div>
  )
}
