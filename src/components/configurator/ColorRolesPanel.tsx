// The Color edition, as one list of roles. Each role carries its own slider.
//
// Accent · Neutral · Success · Critical · Warning · Info are rows: the role's
// name and a swatch with its hex — the same FIELD_ROW every other field in the
// panel uses. The rows start closed — the
// list reads as a palette. Opening a row reveals its hue slider (scoped to the
// role's band, so Warning moves between orange and yellow and never into
// green), the contrast check, and the switch back to the derived value. The
// rule is the same as before; it is shown as a range, not hidden behind a
// padlock that reads as "read-only".
//
// The rows show the theme being edited: switch to Dark and every swatch is
// that theme's own anchor. A hue move lands in BOTH themes, each holding its
// own saturation and brightness, and the dark one is kept a little dimmer —
// the same colour, tuned for the page it sits on.

import { useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { COLOR_ROLE_BAND, COLOR_ROLE_LABEL, ROLE_LABEL_INKS, checkRoleColor, rolePasses, type ColorRoleId } from '../../lib/colorRoles'
import type { ThemeAppearance } from '../../lib/themeModes'
import { FIELD_CONTROL, FIELD_CONTROL_ON, FIELD_CONTROL_REST, FIELD_LEAD, FIELD_NAME, FIELD_ROW } from '../ui/PickerField'
import { useI18n } from '../../lib/i18n'
import SpectrumSlider from '../ui/SpectrumSlider'
import { TintSlider } from './ThemeQuickSettingsRail'
import { readHuePosition, type NeutralTint } from '../../lib/colorUtils'

const HEX_RE = /^#?([0-9a-f]{6})$/i

/** The family a status hue band reads as, named in the open row's rule. */
const BAND_FAMILY: Partial<Record<ColorRoleId, string>> = {
  success: 'green',
  error: 'red',
  warning: 'amber',
  info: 'blue',
}

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
  page, after, defaultOpen = null, showAll = true, listId,
}: {
  appearance: ThemeAppearance
  /** Light / Dark and Random, drawn above the rows. */
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
  /** The page this theme paints on — the contrast check measures against it. */
  page: string
  /** Rows that are not roles (extra brand palettes). */
  after?: ReactNode
  /** A row open on mount — the create form opens Accent, its one decision. */
  defaultOpen?: ColorRoleId | null
  /** false: Accent alone (Figma's folded style list). The header's "show all
   *  colours" toggle reveals the other roles. */
  showAll?: boolean
  /** The list's id, for the toggle's `aria-controls`. */
  listId?: string
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  // Which row is open. Closed by default: the slider only shows once you
  // reach for a colour. Opening a row also selects it, so the preview's
  // highlight and the open row never disagree.
  const [open, setOpen] = useState<ColorRoleId | null>(defaultOpen)
  // A palette that changes in one go (Shuffle, Light ↔ Dark) bumps `landing`,
  // and every swatch replays its landing, staggered by row. One role moving
  // (a hue drag, a typed hex) does not: that swatch just cross-fades.
  // Compared during render — React's "adjust state when a prop changes".
  const palette = rows.map((row) => row.hex).join()
  const [seenPalette, setSeenPalette] = useState(palette)
  const [landing, setLanding] = useState(0)
  if (palette !== seenPalette) {
    const before = seenPalette.split(',')
    const changed = rows.filter((row, i) => before[i] && before[i] !== row.hex).length
    setSeenPalette(palette)
    if (changed >= 2) setLanding((n) => n + 1)
  }

  return (
    <div className="flex flex-col gap-3">
      {header}
      {/* Every row is a FIELD_ROW ([name] [control 58%]), so the hex fields
          line up with Font, Radius and the extra palettes below. */}
      <div id={listId} role="list" aria-label={t('Colour roles')} className="flex flex-col">
        <AnimatePresence initial={false}>
        {rows.filter((row) => showAll || row.id === 'accent').map((row, index) => (
          // Each row unfolds from the one above it: height + fade, so the
          // list grows downward instead of popping in.
          <motion.div
            key={row.id}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : index * 0.02 }}
            className={index === 0 ? '' : 'overflow-hidden'}
          >
          <div className={index === 0 ? '' : 'pt-1.5'}>
          <RoleRow
            row={row}
            index={index}
            landing={landing}
            on={row.id === selected}
            open={open === row.id}
            appearance={appearance}
            page={page}
            neutralTint={neutralTint}
            onToggle={() => {
              onSelect(row.id)
              setOpen((current) => (current === row.id ? null : row.id))
            }}
            onFocusHex={() => { onSelect(row.id); setOpen(row.id) }}
            onHex={(hex) => onHex(row.id, hex)}
            onHuePreview={onHuePreview ? (hex, hue) => onHuePreview(row.id, hex, hue) : undefined}
            onHueCommit={(hue) => onHueCommit(row.id, hue)}
            solveAt={(hue) => solveAt(row.id, hue)}
            onNeutralTint={onNeutralTint}
            onToggleLink={row.linked === undefined ? undefined : () => onToggleLink(row.id)}
          />
          </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
      {after}
    </div>
  )
}

function RoleRow({
  row, index, landing, on, open, appearance, page, neutralTint,
  onToggle, onFocusHex, onHex, onHuePreview, onHueCommit, solveAt, onNeutralTint, onToggleLink,
}: {
  row: ColorRoleRow
  /** Row position — the delay of its swatch's landing. */
  index: number
  /** Bumped when the whole palette changes at once; 0 = never, no landing. */
  landing: number
  on: boolean
  open: boolean
  appearance: ThemeAppearance
  page: string
  neutralTint: NeutralTint
  onToggle: () => void
  onFocusHex: () => void
  onHex: (hex: string) => void
  onHuePreview?: (hex: string, hue: number) => void
  onHueCommit: (hue: number) => void
  solveAt: (hue: number) => string
  onNeutralTint: (tint: NeutralTint) => void
  onToggleLink?: () => void
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const [draft, setDraft] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const label = t(COLOR_ROLE_LABEL[row.id])
  const panelId = `color-role-${row.id}`
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

  // The constraint, in words. Accent has none — it sweeps the whole wheel.
  const family = BAND_FAMILY[row.id]
  const rule = row.id === 'neutral'
    ? (row.linked
      ? t('Hue comes from the accent. Only the tint moves.')
      : t('Its own hue, anywhere on the wheel.'))
    : family
      ? t('Hue stays in the {family} band. Lightness and saturation follow the slider.', { family: t(family) })
      : null

  return (
    // Name | control, the same row as every PickerField (`FIELD_ROW`): the
    // name and its chip are bare text, the swatch + hex is the one surface.
    <div role="listitem" className="group flex flex-col">
      <div className={FIELD_ROW}>
        {/* The hex field is a SIBLING of the toggle, never inside it: an
            input nested in a <button> is invalid. */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className={`${FIELD_NAME} h-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${on || open ? 'text-fg' : 'text-fg-muted group-hover:text-fg'}`}
        >
          {label}
        </button>
        <div
          className={`${FIELD_CONTROL} cursor-text ${open || on ? FIELD_CONTROL_ON : FIELD_CONTROL_REST}`}
          onClick={() => input.current?.focus()}
        >
          <span
            key={landing}
            aria-hidden
            className={`${FIELD_LEAD} block border border-fg/40 transition-[background-color] duration-200 ease-[var(--ease-out-quint)] motion-reduce:transition-none ${landing ? 'swatch-land' : ''}`}
            style={{ background: row.hex, '--swatch-i': index } as React.CSSProperties}
          />
          <input
            ref={input}
            value={draft ?? row.hex.toUpperCase()}
            onFocus={(event) => { onFocusHex(); setDraft(row.hex.toUpperCase()); event.currentTarget.select() }}
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

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="body"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {/* The slider spans the whole row, name edge to control edge. */}
            <div className="flex flex-col gap-2.5 pb-1.5 pt-2.5">
              {rule && <p className="text-caption text-fg-faint">{rule}</p>}
              {row.id === 'neutral' ? (
                <>
                  {/* Unlinked, the neutral picks its own hue on the whole
                      wheel. Linked, the hue is the accent's — only the tint moves. */}
                  {!row.linked && (
                    <SpectrumSlider
                      key={`neutral-${appearance}`}
                      value={row.hex}
                      band={[0, 360]}
                      colorAt={solveAt}
                      ariaLabel={`${label} hue`}
                      onPreview={onHuePreview}
                      onCommit={(_hex, hue) => onHueCommit(hue)}
                    />
                  )}
                  <TintSlider hueHex={row.hex} value={neutralTint} onChange={onNeutralTint} />
                </>
              ) : (
                <SpectrumSlider
                  key={`${row.id}-${appearance}`}
                  value={row.hex}
                  band={COLOR_ROLE_BAND[row.id]}
                  colorAt={solveAt}
                  ariaLabel={`${label} hue`}
                  onPreview={onHuePreview}
                  onCommit={(_hex, hue) => onHueCommit(hue)}
                />
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                {row.id !== 'neutral' && (
                  <ContrastChip
                    hex={row.hex}
                    page={page}
                    appearance={appearance}
                    solveAt={solveAt}
                    onFix={onHueCommit}
                  />
                )}
                {onToggleLink && (
                  <button
                    type="button"
                    onClick={onToggleLink}
                    aria-pressed={row.linked}
                    title={row.id === 'neutral'
                      ? (row.linked ? t('Follows the accent. Click to set it by hand.') : t('Set by hand. Click to follow the accent.'))
                      : (row.linked
                        ? t('Success, Critical, Warning and Info follow the accent’s chroma, solved for contrast. Click to set them by hand.')
                        : t('Set by hand. Click to make all four states follow the accent’s chroma.'))}
                    className={`h-6 rounded-md px-2 text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                      row.linked ? 'bg-accent-ui/15 text-fg' : 'bg-fg/8 text-fg-muted hover:text-fg'
                    }`}
                  >
                    {row.linked ? t('Derived from accent') : t('Derive from accent')}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** The role measured the way the solver measures it: against the page as a
 *  shape (WCAG 3:1 + APCA Lc 45) and with a label on it (WCAG 4.5:1 + APCA
 *  Lc 60). One chip with the label ratio; both metrics in its tooltip, so a
 *  pass on one and a miss on the other is still visible. A failing colour
 *  gets ONE action: the same solve the slider commits, at its own hue. */
function ContrastChip({ hex, page, appearance, solveAt, onFix }: {
  hex: string
  page: string
  appearance: ThemeAppearance
  solveAt: (hue: number) => string
  onFix: (hue: number) => void
}) {
  const { t } = useI18n()
  const c = checkRoleColor(hex, page)
  const pageOk = c.pageWcag >= 3 && c.pageLc >= 45
  const labelOk = c.ink !== null
  const aaOk = c.pageWcag >= 3 && c.labelWcag >= 4.5
  // Good = visible on the page AND carrying a label, in every theme.
  const grade = rolePasses(c, appearance) ? 'good' : aaOk ? 'aa' : pageOk || labelOk ? 'fair' : 'poor'
  const style = {
    good: 'bg-status-success/15 text-status-success',
    aa: 'bg-status-success/15 text-status-success',
    fair: 'bg-status-warning/15 text-status-warning',
    poor: 'bg-status-danger/15 text-status-danger',
  }[grade]
  const word = grade === 'good' || grade === 'aa' ? 'AA' : grade === 'fair' ? t('Partial AA') : t('Below AA')
  const white = c.labelInk === ROLE_LABEL_INKS[0]
  const detail = [
    `${t(appearance === 'dark' ? 'Dark' : 'Light')}: ${t('{ratio}:1 on surface', { ratio: c.pageWcag.toFixed(1) })} · Lc ${Math.round(c.pageLc)}`,
    `${white
      ? t('white label {ratio}:1', { ratio: c.labelWcag.toFixed(1) })
      : t('dark label {ratio}:1', { ratio: c.labelWcag.toFixed(1) })} · Lc ${Math.round(c.labelLc)}`,
  ].join('\n')

  const hue = readHuePosition(hex).hue
  const solved = solveAt(hue)
  const fixable = !rolePasses(c, appearance)
    && solved.toLowerCase() !== hex.toLowerCase()
    && rolePasses(checkRoleColor(solved, page), appearance)

  return (
    <>
      <span title={detail} className={`h-6 rounded-md px-2 text-caption leading-6 tabular-nums ${style}`}>
        {word} {c.labelWcag.toFixed(1)}:1
      </span>
      {fixable && (
        <button
          type="button"
          onClick={() => onFix(hue)}
          title={t('Same hue, a tone that passes on this theme.')}
          className="flex h-6 items-center gap-1.5 rounded-md bg-fg/8 px-2 text-caption text-fg transition-colors hover:bg-fg/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] border border-fg/40" style={{ background: solved }} />
          {t('Use accessible tone')}
        </button>
      )}
    </>
  )
}
