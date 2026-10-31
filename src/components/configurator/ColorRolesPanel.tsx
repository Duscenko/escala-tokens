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

import { useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { COLOR_ROLE_BAND, COLOR_ROLE_LABEL, ROLE_LABEL_INKS, checkRoleColor, rolePasses, type ColorRoleId } from '../../lib/colorRoles'
import type { ThemeAppearance } from '../../lib/themeModes'
import type { ColorScale } from '../../types/tokens'
import type { ToneUse } from '../../lib/colorRoleMap'
import { useI18n } from '../../lib/i18n'
import SpectrumSlider from '../ui/SpectrumSlider'
import { AccentAxisSlider, FINE_TUNE_IDEAL, FineResetButton, TintSlider } from './ThemeQuickSettingsRail'
import { ColorBlock, FloatingColorPicker } from './ColorBlock'
import { BASE_TONE, colorAtHue, readHuePosition, toneLabel, type ColorNaming, type NeutralTint } from '../../lib/colorUtils'
import { HintTip } from '../ui/HintTip'

/** The family a status hue band reads as, named in the open row's rule. */
const BAND_FAMILY: Partial<Record<ColorRoleId, string>> = {
  success: 'green',
  error: 'red',
  warning: 'amber',
  info: 'blue',
}

/** The open ramp as the colour map's legend: which steps any role reads, and
 *  which the map's focus lights. Pointing at a step lights its roles on the
 *  board. Given only while the board shows the map. */
export interface RampLegend {
  tones: Record<number, ToneUse>
  lit: ReadonlySet<number>
  onHover: (tone: number | null) => void
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
  page, after, rampContrast, ramps, naming = 'numeric', rampOpen: rampOpenProp, onRampOpenChange, rampLegend,
}: {
  /** The open ramp's legend, while the board maps that colour. */
  rampLegend?: RampLegend
  /** Whose ramp is open, when the caller owns it — the Generator does, since
   *  the open ramp is also the colour the board maps. Omit to keep it local. */
  rampOpen?: ColorRoleId | null
  onRampOpenChange?: (id: ColorRoleId | null) => void
  appearance: ThemeAppearance
  /** Each role's twelve tones in the theme on screen — what the row's ramp
   *  toggle reveals under it. A role with no ramp gets no toggle. */
  ramps?: Partial<Record<ColorRoleId, ColorScale>>
  /** The system's naming scheme, so the ramp's steps read as they export. */
  naming?: ColorNaming
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
  // Whose ramp is shown under its row. One at a time keeps the card short —
  // opening Critical's folds Accent's.
  const [rampOpenLocal, setRampOpenLocal] = useState<ColorRoleId | null>(null)
  const rampOpen = rampOpenProp !== undefined ? rampOpenProp : rampOpenLocal
  const setRampOpen = (next: (current: ColorRoleId | null) => ColorRoleId | null) => {
    const value = next(rampOpen)
    if (onRampOpenChange) onRampOpenChange(value)
    else setRampOpenLocal(value)
  }
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
            ramp={ramps?.[row.id]}
            naming={naming}
            rampOpen={rampOpen === row.id}
            legend={rampOpen === row.id ? rampLegend : undefined}
            onToggleRamp={() => setRampOpen((current) => (current === row.id ? null : row.id))}
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
  rampContrast, ramp, naming, rampOpen, onToggleRamp, legend,
}: {
  legend?: RampLegend
  rampContrast?: ReactNode
  ramp?: ColorScale
  naming: ColorNaming
  rampOpen: boolean
  onToggleRamp: () => void
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
  const rampId = useId()
  const label = t(COLOR_ROLE_LABEL[row.id])
  const hasRamp = Boolean(ramp && Object.keys(ramp).length)
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
      {/* The field, then the ramp toggle beside it — outside the field, so a
          click on it never lands in the hex. */}
      <div className="flex min-w-0 items-center gap-1">
        <div className="min-w-0 flex-1">
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
        </div>
        {hasRamp && (
          <HintTip label={rampOpen ? t('Hide the {name} ramp', { name: label }) : t('Show the {name} ramp', { name: label })}>
            <button
              type="button"
              onClick={onToggleRamp}
              aria-expanded={rampOpen}
              aria-controls={rampId}
              aria-label={rampOpen ? t('Hide the {name} ramp', { name: label }) : t('Show the {name} ramp', { name: label })}
              className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg transition-[background-color,color,transform] duration-150 ease-[var(--ease-out-quint)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 motion-reduce:transition-none ${
                rampOpen ? 'bg-fg/[0.12] text-fg' : 'text-fg-faint hover:bg-elevated hover:text-fg'
              }`}
            >
              <RampToggleGlyph />
            </button>
          </HintTip>
        )}
      </div>
      {hasRamp && ramp && (
        <RoleRamp id={rampId} open={rampOpen} label={label} ramp={ramp} naming={naming} legend={legend} />
      )}
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

const RAMP_TONES = Array.from({ length: 12 }, (_, i) => i + 1)

/** The role's twelve tones under its row, in the theme on screen — the same
 *  ramp Variables and the export read (`scaleForFamily`), never a second
 *  render of it. Step names follow the system's naming scheme; the anchor
 *  (tone 9, the hex in the row above) is the one label in full ink. Read-only:
 *  the row's field and picker are where the colour is set. */
function RoleRamp({ id, open, label, ramp, naming, legend }: {
  id: string
  open: boolean
  label: string
  ramp: ColorScale
  naming: ColorNaming
  /** While the board maps this colour: which steps the system reads. */
  legend?: RampLegend
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const usage = (tone: number) => legend?.tones[tone]
  const lit = (tone: number) => legend?.lit.has(tone) ?? false
  const title = (tone: number) => {
    const base = `${label} ${toneLabel(naming, tone)} · ${(ramp[tone] ?? '').toUpperCase()}`
    if (!legend) return base
    const n = usage(tone)?.roles.length ?? 0
    return n === 0
      ? `${base} · ${t('No role reads it')}`
      : `${base} · ${t(n === 1 ? '{n} role' : '{n} roles', { n: String(n) })}${usage(tone)?.alphaOnly ? ` (${t('alpha twin')})` : ''}`
  }
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          id={id}
          role="group"
          aria-label={t('{name} ramp', { name: label })}
          initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: reduce ? 0.12 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="pt-1.5 pb-1">
            {/* The hairline sits OVER the swatches (an inset ring on a layer
                above), so the end tones keep an edge on a page of their own
                colour without a border shrinking the cells. */}
            <div className="relative flex h-6 overflow-hidden rounded-md" onMouseLeave={() => legend?.onHover(null)}>
              <span aria-hidden className="pointer-events-none absolute inset-0 z-10 rounded-md ring-1 ring-inset ring-fg/10" />
              {RAMP_TONES.map((tone) => (
                <span
                  key={tone}
                  title={title(tone)}
                  onMouseEnter={legend ? () => legend.onHover(usage(tone) ? tone : null) : undefined}
                  // A lit step: a two-tone ring (ink over the page colour),
                  // which reads on the ramp's pale end and its dark end alike.
                  className={`h-full flex-1 transition-[background-color,box-shadow] duration-200 ease-[var(--ease-out-quint)] motion-reduce:transition-none ${
                    lit(tone) ? 'relative z-20 shadow-[inset_0_0_0_2px_var(--fg),inset_0_0_0_3px_var(--app)]' : ''
                  }`}
                  style={{ background: ramp[tone] }}
                />
              ))}
            </div>
            {/* The legend: a dot under each step a role reads — filled for
                the solid, a ring when only its alpha twin is read. */}
            {legend && (
              <div aria-hidden className="mt-1 flex h-1.5">
                {RAMP_TONES.map((tone) => (
                  <span key={tone} className="flex flex-1 justify-center">
                    {usage(tone) && (
                      <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-150 ${
                        usage(tone)!.alphaOnly
                          ? `ring-1 ring-inset ${lit(tone) ? 'ring-accent-ui' : 'ring-fg-muted'}`
                          : lit(tone) ? 'bg-accent-ui' : 'bg-fg-muted'
                      }`} />
                    )}
                  </span>
                ))}
              </div>
            )}
            <div aria-hidden className="mt-1 flex">
              {RAMP_TONES.map((tone) => (
                <span
                  key={tone}
                  className={`flex-1 text-center text-micro leading-none tabular-nums transition-colors duration-150 ${
                    lit(tone) || tone === BASE_TONE ? 'font-medium text-fg' : legend && !usage(tone) ? 'text-fg-faint/50' : 'text-fg-faint'
                  }`}
                >
                  {toneLabel(naming, tone)}
                </span>
              ))}
            </div>
            {legend && (
              <p className="mt-2 flex items-center gap-3 text-micro text-fg-faint">
                <span className="flex items-center gap-1"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-fg-muted" />{t('Read by a role')}</span>
                <span className="flex items-center gap-1"><span aria-hidden className="h-1.5 w-1.5 rounded-full ring-1 ring-inset ring-fg-muted" />{t('Alpha twin only')}</span>
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Three sliders — "tune this colour". Drawn without a filled knob, so it
 *  reads on any surface the inspector paints (SlidersIcon fills with --app). */
function RampToggleGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden>
      <path d="M3.5 2v2.6M3.5 7.9V14M8 2v6.1M8 11.4V14M12.5 2v1.1M12.5 6.4V14" />
      <circle cx="3.5" cy="6.25" r="1.65" />
      <circle cx="8" cy="9.75" r="1.65" />
      <circle cx="12.5" cy="4.75" r="1.65" />
    </svg>
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
