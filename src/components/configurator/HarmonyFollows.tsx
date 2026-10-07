import { useMemo, type CSSProperties } from 'react'
import { CHECKER } from './checker'
import { AppearanceGlyph } from './colorControls'
import { CHROME_CONTROL_SHELL } from './themeWorkspaceLayout'
import { previewHarmony, type NeutralTint } from '../../lib/colorUtils'

const STATE_ORDER = ['error', 'warning', 'success', 'info'] as const
const STATE_LABEL: Record<(typeof STATE_ORDER)[number], string> = {
  error: 'Error',
  warning: 'Warning',
  success: 'Success',
  info: 'Info',
}

const SWATCH_CHECKER: CSSProperties = { ...CHECKER, backgroundSize: '6px 6px' }

/** Read-only light/dark preview indicator — which appearance the workspace is
 *  showing, with sun/moon glyphs and page swatches on a checker (so a dark page
 *  stays visible on dark chrome). */
export function PageAppearancePreview({
  pageLight,
  pageDark,
  appearance = 'light',
  compact = false,
}: {
  pageLight: string
  pageDark: string
  appearance?: 'light' | 'dark'
  /** Tighter padding when nested in a harmony toggle card. */
  compact?: boolean
}) {
  return (
    <div
      className={`flex items-center rounded-md p-0.5 ${CHROME_CONTROL_SHELL} ${compact ? 'h-7' : 'h-8'}`}
      role="group"
      aria-label={`Preview appearance: ${appearance === 'light' ? 'Light' : 'Dark'}`}
    >
      {(['light', 'dark'] as const).map((mode) => {
        const active = appearance === mode
        const page = mode === 'light' ? pageLight : pageDark
        return (
          <div
            key={mode}
            aria-current={active ? 'true' : undefined}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 ${
              compact ? 'py-0.5' : 'py-1'
            } text-micro font-medium transition-colors ${
              active
                ? 'bg-elevated text-fg shadow-sm ring-1 ring-accent-ui/40'
                : 'text-fg-faint'
            }`}
          >
            <AppearanceGlyph kind={mode} size={compact ? 11 : 12} />
            <span className="truncate">{mode === 'light' ? 'Light' : 'Dark'}</span>
            <span
              aria-hidden
              className="relative h-3.5 w-3.5 flex-shrink-0 overflow-hidden rounded-[3px] ring-1 ring-line"
            >
              <span className="absolute inset-0" style={SWATCH_CHECKER} />
              <span className="absolute inset-0" style={{ background: page }} />
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** What the accent drags along, as a READOUT: the Neutral's page in each
 *  appearance and the four states, same numbers the appliers write when both
 *  harmony links are on.
 *
 *  Deliberately NOT a segmented control. It used to render `PageAppearancePreview`
 *  here — two segments, the active one ringed — which is exactly what a
 *  clickable switch looks like, while doing nothing, and which repeated the
 *  Light | Dark the picker already has as a real control. A readout lists
 *  facts, so it is a plain row of swatches; the previewed appearance is
 *  carried by ink weight alone. */
export function HarmonyFollows({
  accentHex,
  tint,
  appearance = 'light',
}: {
  accentHex: string
  tint: NeutralTint
  appearance?: 'light' | 'dark'
}) {
  const h = useMemo(() => previewHarmony(accentHex, tint), [accentHex, tint])
  const pages = [
    { mode: 'light' as const, label: 'Light', hex: h.pageLight },
    { mode: 'dark' as const, label: 'Dark', hex: h.pageDark },
  ]

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint">Follows the accent</span>
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-12 flex-shrink-0 text-caption text-fg-faint">Neutral</span>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {pages.map((page) => {
            const active = page.mode === appearance
            return (
              <span
                key={page.mode}
                title={`${page.label} page ${page.hex.toUpperCase()}`}
                aria-current={active ? 'true' : undefined}
                className={`inline-flex items-center gap-1.5 text-caption ${active ? 'font-semibold text-fg' : 'text-fg-faint'}`}
              >
                <span aria-hidden className="relative h-3.5 w-3.5 flex-shrink-0 overflow-hidden rounded-[3px] ring-1 ring-line">
                  <span className="absolute inset-0" style={SWATCH_CHECKER} />
                  <span className="absolute inset-0" style={{ background: page.hex }} />
                </span>
                {page.label}
              </span>
            )
          })}
        </div>
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-12 flex-shrink-0 text-caption text-fg-faint">Status</span>
        <div className="flex items-center -space-x-0.5 flex-shrink-0" aria-label="States">
          {STATE_ORDER.map((k) => (
            <span
              key={k}
              title={`${STATE_LABEL[k]} ${h.states[k].toUpperCase()}`}
              aria-hidden
              className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15 ring-offset-1 ring-offset-app"
              style={{ background: h.states[k] }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
