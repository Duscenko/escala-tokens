import { useEffect } from 'react'
import type { PreviewTokens } from '../preview/ButtonPreview'
import { radiusRoleOf } from '../../lib/previewTokens'
import { fontStack, loadGoogleFont } from '../../lib/fonts'

// A theme's COVER — the same composition for every theme, filled from that
// theme's own tokens: its accent, its typeface, and a shape cut at its own
// radius. A standard pattern instead of a screenshot, so a grid of themes
// reads as a set and each card differs only where the systems differ.
//
// Everything resolves from `PreviewTokens`; nothing here picks a colour or a
// face. Sizes are in container units (`cqw`) so the cover scales with the
// card instead of reflowing.

/** Radius of a role, halved: the cover is a ~0.5× thumbnail of the system. */
function coverRadius(t: PreviewTokens, role: string, fallback: number): string {
  const n = parseFloat(radiusRoleOf(t, role, `${fallback}px`))
  return `${Math.min(Number.isFinite(n) ? n : fallback, 999) * 0.5}px`
}

export function ThemeCover({ t }: { t: PreviewTokens }) {
  const display = t.typography.headingFontFamily || t.typography.fontFamily
  useEffect(() => {
    if (display) loadGoogleFont(display)
  }, [display])

  const ramp = t.brandRamp ?? {}
  const neutral = t.neutralRamp ?? {}
  const box = coverRadius(t, 'container', 16)
  const tile = coverRadius(t, 'action', 8)
  const swatches = [
    ramp[3] ?? t.selectedSurface ?? t.neutralFill,
    ramp[11] ?? t.brandText,
    neutral[12] ?? t.neutralText,
    t.successColor ?? t.brandText,
  ]

  return (
    <div
      aria-hidden
      className="relative aspect-[16/10] w-full overflow-hidden"
      style={{ background: t.surface, containerType: 'inline-size' }}
    >
      <div className="absolute inset-[5cqw] grid grid-cols-[1.15fr_1fr] gap-[3cqw]">
        {/* Type — the body face named, the display face drawn as "Aa". */}
        <div
          className="flex min-w-0 flex-col justify-between overflow-hidden p-[4cqw]"
          style={{ background: t.layer2 ?? t.neutralFill, borderRadius: box, color: t.neutralText }}
        >
          <span
            className="truncate text-[3.6cqw] font-medium leading-none"
            style={{ fontFamily: fontStack(t.typography.fontFamily), color: t.fgMuted ?? t.neutralText }}
          >
            {t.typography.fontFamily}
          </span>
          <span
            className="text-[19cqw] font-semibold leading-[0.85] tracking-[-0.02em]"
            style={{ fontFamily: fontStack(display) }}
          >
            Aa
          </span>
        </div>

        {/* Colour — the accent as the hero, with a shape cut at the theme's
            own radius, then the ramp ends and one state beside it. */}
        <div className="grid min-w-0 grid-rows-[1.35fr_1fr] gap-[3cqw]">
          <div
            className="relative overflow-hidden"
            style={{ background: t.brandSolid, borderRadius: tile }}
          >
            <span
              className="absolute -bottom-[6cqw] -right-[4cqw] h-[22cqw] w-[22cqw]"
              style={{ background: t.onBrand, opacity: 0.18, borderRadius: box }}
            />
            <span
              className="absolute bottom-[3cqw] left-[3cqw] h-[7cqw] w-[7cqw] rounded-full"
              style={{ border: `0.6cqw solid ${t.onBrand}`, opacity: 0.9 }}
            />
          </div>
          <div className="grid grid-cols-4 gap-[2cqw]">
            {swatches.map((color, i) => (
              <span key={i} className="min-w-0" style={{ background: color, borderRadius: tile }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
