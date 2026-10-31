// The Color edition, as one list of roles. Each role carries its own picker.
//
// Accent · Neutral · Success · Critical · Warning · Info are blocks: swatch,
// name and hex in one field (`ColorBlock`), so the list reads as a palette and
// a hex is typed in place. The swatch opens the role's picker, floating beside
// the inspector (`FloatingColorPicker`): a canvas for this theme's exact hex,
// the role's hue strip (scoped to its band, so Warning moves between orange
// and yellow and never into green, and solved in both themes), the contrast
// check, and the switch back to the derived value. The rule is shown as a
// range, not hidden behind a padlock that reads as "read-only".
//
// The rows show the theme being edited: switch to Dark and every swatch is
// that theme's own anchor. A hue move lands in BOTH themes, each holding its
// own saturation and brightness, and the dark one is kept a little dimmer —
// the same colour, tuned for the page it sits on.

import { useRef, useState, type ReactNode, type RefObject } from 'react'
import { COLOR_ROLE_BAND, COLOR_ROLE_LABEL, ROLE_LABEL_INKS, checkRoleColor, rolePasses, type ColorRoleId } from '../../lib/colorRoles'
import type { ThemeAppearance } from '../../lib/themeModes'
import { useI18n } from '../../lib/i18n'
import SpectrumSlider from '../ui/SpectrumSlider'
import { AccentAxisSlider, FINE_TUNE_IDEAL, FineResetButton, TintSlider } from './ThemeQuickSettingsRail'
import { ColorBlock, FloatingColorPicker } from './ColorBlock'
import { colorAtHue, readHuePosition, type NeutralTint } from '../../lib/colorUtils'
import { HintTip } from '../ui/HintTip'

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
  onHex, onHexPreview, onHuePreview, onHueCommit, solveAt,
  neutralTint, onNeutralTint, onToggleLink,
  page, after, rampContrast,
}: {
  appearance: ThemeAppearance
  /** Light / Dark and Random, drawn above the rows. */
  header?: ReactNode
  rows: ColorRoleRow[]
  selected: ColorRoleId
  onSelect: (id: ColorRoleId) => void
  /** A hex typed into a row. It sets that role in the theme on screen only. */
  onHex: (id: ColorRoleId, hex: string) => void
  /** The picker canvas's colour while it is dragged; null when it lands. */
  onHexPreview?: (id: ColorRoleId, hex: string | null) => void
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
  /** The Ramp contrast slider (global: it spaces every ramp's twelve tones).
   *  Shown inside each role's picker, under its fine-tune icons. */
  rampContrast?: ReactNode
}) {
  const { t } = useI18n()
  // Whose picker is open. Opening one also selects the row, so the preview's
  // highlight and the open picker never disagree.
  const [open, setOpen] = useState<ColorRoleId | null>(null)
  // Clicks in the list keep the picker: another row's swatch switches it.
  const list = useRef<HTMLDivElement>(null)
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
      {/* Every row is a ColorBlock, like the extra palettes below. */}
      <div ref={list} role="list" aria-label={t('Colour roles')} className="flex flex-col gap-1.5">
        {rows.map((row, index) => (
          <div key={row.id}>
          <RoleRow
            row={row}
            index={index}
            landing={landing}
            on={row.id === selected}
            open={open === row.id}
            appearance={appearance}
            page={page}
            neutralTint={neutralTint}
            list={list}
            onToggle={() => {
              onSelect(row.id)
              setOpen((current) => (current === row.id ? null : row.id))
            }}
            onClose={() => setOpen(null)}
            onFocusHex={() => onSelect(row.id)}
            onHex={(hex) => onHex(row.id, hex)}
            onHexPreview={onHexPreview ? (hex) => onHexPreview(row.id, hex) : undefined}
            onHuePreview={onHuePreview ? (hex, hue) => onHuePreview(row.id, hex, hue) : undefined}
            onHueCommit={(hue) => onHueCommit(row.id, hue)}
            solveAt={(hue) => solveAt(row.id, hue)}
            onNeutralTint={onNeutralTint}
            onToggleLink={row.linked === undefined ? undefined : () => onToggleLink(row.id)}
            rampContrast={rampContrast}
          />
          </div>
        ))}
      </div>
      {after}
    </div>
  )
}

function RoleRow({
  row, index, landing, on, open, appearance, page, neutralTint, list,
  onToggle, onClose, onFocusHex, onHex, onHexPreview, onHuePreview, onHueCommit, solveAt, onNeutralTint, onToggleLink,
  rampContrast,
}: {
  rampContrast?: ReactNode
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
  list: RefObject<HTMLDivElement | null>
  onToggle: () => void
  onClose: () => void
  onFocusHex: () => void
  onHex: (hex: string) => void
  onHexPreview?: (hex: string | null) => void
  onHuePreview?: (hex: string, hue: number) => void
  onHueCommit: (hue: number) => void
  solveAt: (hue: number) => string
  onNeutralTint: (tint: NeutralTint) => void
  onToggleLink?: () => void
}) {
  const { t } = useI18n()
  const block = useRef<HTMLDivElement>(null)
  const label = t(COLOR_ROLE_LABEL[row.id])
  const readOnlyTitle = t('Derived from the neutral base. Edit it in Light.')

  // The constraint, in words. Accent has none — it sweeps the whole wheel.
  const family = BAND_FAMILY[row.id]
  const rule = row.id === 'neutral'
    ? (row.linked
      ? t('Hue comes from the accent. Only the tint moves.')
      : t('Its own hue, anywhere on the wheel.'))
    : family
      ? t('Hue stays in the {family} band. Lightness and saturation follow the slider.', { family: t(family) })
      : null

  // The hue strip is the rule: solved in BOTH themes, held to the band.
  const strip = row.id === 'neutral' ? (
    <>
      {/* Unlinked, the neutral picks its own hue on the whole wheel.
          Linked, the hue is the accent's — only the tint moves. */}
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
  )

  return (
    <div role="listitem" className="group">
      <ColorBlock
        anchorRef={block}
        label={label}
        hex={row.hex}
        active={on}
        open={open}
        readOnly={row.readOnly}
        readOnlyTitle={readOnlyTitle}
        landing={landing}
        index={index}
        onSwatch={onToggle}
        onFocusHex={onFocusHex}
        onHex={onHex}
      />
      {open && (
        <FloatingColorPicker
          anchor={block}
          keepOpenWithin={list}
          label={label}
          hex={row.hex}
          readOnly={row.readOnly}
          readOnlyTitle={readOnlyTitle}
          onClose={onClose}
          onHex={onHex}
          onHexPreview={onHexPreview}
          strip={strip}
        >
          {rule && <p className="text-caption text-fg-faint">{rule}</p>}
          <FineTuneTools
            label={label}
            hex={row.hex}
            readOnly={row.readOnly}
            onPreview={(hex) => onHexPreview?.(hex)}
            onCommit={(hex) => { onHex(hex); onHexPreview?.(null) }}
            rampContrast={rampContrast}
          />
          {(row.id !== 'neutral' || onToggleLink) && (
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
          )}
        </FloatingColorPicker>
      )}
    </div>
  )
}

type FineTool = 'saturation' | 'lightness' | 'contrast'

/** Fine-tune, inside a colour's picker: three icons — Saturation, Brightness,
 *  Ramp contrast — and the slider of the one picked, with its reset. One open
 *  at a time keeps the picker short. Saturation and Brightness move THIS
 *  colour along its own hue (a perceptual position, so the hue never moves)
 *  and save through the same path as the canvas and the hex field. Ramp
 *  contrast is global: it spaces the twelve tones of every ramp, and says so. */
function FineTuneTools({ label, hex, readOnly, onPreview, onCommit, rampContrast }: {
  label: string
  hex: string
  readOnly?: boolean
  onPreview: (hex: string) => void
  onCommit: (hex: string) => void
  rampContrast?: ReactNode
}) {
  const { t } = useI18n()
  const [tool, setTool] = useState<FineTool | null>(null)
  const reading = readHuePosition(hex)
  const tools: { id: FineTool; name: string; icon: ReactNode }[] = [
    ...(readOnly ? [] : [
      { id: 'saturation' as const, name: t('Saturation'), icon: <SaturationGlyph /> },
      { id: 'lightness' as const, name: t('Brightness'), icon: <BrightnessGlyph /> },
    ]),
    ...(rampContrast ? [{ id: 'contrast' as const, name: t('Ramp contrast'), icon: <RampContrastGlyph /> }] : []),
  ]
  if (!tools.length) return null
  const idealOf = (axis: 'saturation' | 'lightness') => Math.abs(reading.position[axis] - FINE_TUNE_IDEAL[axis]) < 0.015
  const resetTo = (axis: 'saturation' | 'lightness') => onCommit(colorAtHue({ ...reading.position, [axis]: FINE_TUNE_IDEAL[axis] }, reading.hue))
  return (
    <div className="flex flex-col gap-2.5">
      <div role="group" aria-label={t('Fine-tune')} className="flex items-center gap-1">
        <span className="mr-auto text-caption text-fg-faint">{t('Fine-tune')}</span>
        {tools.map((item) => {
          const on = tool === item.id
          return (
            <HintTip key={item.id} label={item.name}>
              <button
                type="button"
                onClick={() => setTool(on ? null : item.id)}
                aria-pressed={on}
                aria-label={item.name}
                className={`grid h-7 w-7 place-items-center rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui ${
                  on ? 'bg-fg/[0.12] text-fg' : 'text-fg-faint hover:bg-elevated hover:text-fg'
                }`}
              >
                {item.icon}
              </button>
            </HintTip>
          )
        })}
      </div>
      {(tool === 'saturation' || tool === 'lightness') && (
        <AccentAxisSlider
          key={tool}
          axis={tool}
          label={`${tool === 'saturation' ? t('Saturation') : t('Brightness')} · ${label}`}
          value={hex}
          onPreview={onPreview}
          onCommit={onCommit}
          action={(
            <FineResetButton
              label={tool === 'saturation' ? t('Reset saturation') : t('Reset brightness')}
              disabled={idealOf(tool)}
              onClick={() => resetTo(tool)}
            />
          )}
        />
      )}
      {tool === 'contrast' && rampContrast}
    </div>
  )
}

function SaturationGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden>
      <path d="M8 1.8C8 1.8 3.2 7 3.2 10a4.8 4.8 0 0 0 9.6 0C12.8 7 8 1.8 8 1.8Z" />
      <path d="M8 14.8a4.8 4.8 0 0 0 4.8-4.8c0-.8-.4-1.8-1-2.9L8 10.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function BrightnessGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
    </svg>
  )
}

/** Steps of a ramp, spaced apart — what Ramp contrast moves. */
function RampContrastGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      <rect x="1.5" y="4" width="3" height="8" rx="1" fill="currentColor" opacity=".3" />
      <rect x="6.5" y="4" width="3" height="8" rx="1" fill="currentColor" opacity=".6" />
      <rect x="11.5" y="4" width="3" height="8" rx="1" fill="currentColor" />
    </svg>
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
