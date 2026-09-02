import { useMemo } from 'react'
import { previewHarmony, type NeutralTint } from '../../lib/colorUtils'

const STATE_ORDER = ['error', 'warning', 'success', 'info'] as const
const STATE_LABEL: Record<(typeof STATE_ORDER)[number], string> = {
  error: 'Error',
  warning: 'Warning',
  success: 'Success',
  info: 'Info',
}

/** Live Neutral (light/dark page) + four states for an accent — same numbers
 *  the appliers write when both harmony links are on. */
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

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-mini font-semibold uppercase tracking-widest text-fg-faint flex-shrink-0">Follows</span>
      <div
        className="flex items-center gap-px flex-shrink-0"
        title={`Neutral page — light ${h.pageLight.toUpperCase()} · dark ${h.pageDark.toUpperCase()}`}
        aria-label="Neutral page, light and dark"
      >
        {(['light', 'dark'] as const).map((mode) => (
          <span
            key={mode}
            aria-hidden
            className={`w-3.5 h-3.5 first:rounded-l last:rounded-r ring-1 ring-black/15 ${
              appearance === mode ? 'ring-2 ring-fg z-[1]' : ''
            }`}
            style={{ background: mode === 'light' ? h.pageLight : h.pageDark }}
          />
        ))}
      </div>
      <span className="w-px h-3 bg-line flex-shrink-0" aria-hidden />
      <div className="flex items-center -space-x-0.5 flex-shrink-0" aria-label="States">
        {STATE_ORDER.map((k) => (
          <span
            key={k}
            title={`${STATE_LABEL[k]} ${h.states[k].toUpperCase()}`}
            aria-hidden
            className="w-3.5 h-3.5 rounded-full ring-1 ring-black/15 ring-offset-1 ring-offset-app"
            style={{ background: h.states[k] }}
          />
        ))}
      </div>
    </div>
  )
}
