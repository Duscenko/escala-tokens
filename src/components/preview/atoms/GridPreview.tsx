// Grid foundation specimen — desktop / mobile layout recipes plus the
// primitive breakpoint ranges they cut on.
//
// Semantics drive the two layout frames (columns, gutter, margin, container).
// The range chart is the primitive scale (sm–2xl) so a designer can see where
// `breakpoint-desktop` sits on the ramp.

import { type ReactNode } from 'react'
import { radiusRoleOf } from '../../../lib/previewTokens'
import { withAlpha } from '../../../lib/colorUtils'
import {
  breakpointMobileMax,
  extractBreakpoints,
  mergeGridFrame,
  resolveGridFrame,
  type GridViewport,
  type ResolvedGridFrame,
} from '../../../lib/layoutTokens'
import type { PreviewTokens } from '../ButtonPreview'
import { EditIcon } from './RoleEditCard'

const MONO = 'ui-monospace, monospace'

const num = (v: string | undefined, fallback: number) => {
  const n = parseFloat(v ?? '')
  return Number.isFinite(n) ? n : fallback
}

type Breakpoint = { key: string; label: string; min: number }

function breakpointsOf(grid: Record<string, string>): Breakpoint[] {
  return Object.entries(grid)
    .filter(([k]) => k.startsWith('breakpoint-'))
    .map(([k, v]) => ({ key: k, label: k.replace('breakpoint-', ''), min: num(v, 0) }))
    .filter((b) => b.min > 0)
    .sort((a, b) => a.min - b.min)
}

function Frame({
  t, label, viewportPx, frame, widest, onEdit,
}: {
  t: PreviewTokens
  label: string
  viewportPx: number
  frame: ResolvedGridFrame
  widest: number
  onEdit?: () => void
}) {
  const accent = t.brandSolid
  const gutter = num(frame.gutter, 16)
  const margin = num(frame.margin, 16)
  const container = frame.container === 'none' ? Infinity : num(frame.container, 1280)
  const capped = viewportPx - margin * 2 > container
  const content = Math.max(0, Math.min(viewportPx - margin * 2, container === Infinity ? viewportPx - margin * 2 : container))
  const insetPct = viewportPx > 0 ? ((viewportPx - content) / 2 / viewportPx) * 100 : 0
  const gapPct = content > 0 ? (gutter / content) * 100 : 0
  // Decorative chrome only — this rect stands for "a device viewport," not a
  // real container, so its radius is capped rather than taken verbatim from
  // the (possibly much larger) container-radius token. Uncapped, a generous
  // radius token rounds deep enough into the fixed 40px column row to read as
  // clipped bars instead of a rounded frame.
  const frameRadius = Math.min(num(radiusRoleOf(t, 'container'), 14), 14)
  const stats: [string, string][] = [
    ['cols', String(frame.columns)],
    ['gutter', frame.gutter],
    ['margin', frame.margin],
    ['container', frame.container === 'none' ? 'fluid' : frame.container],
  ]

  return (
    <div className="flex flex-col gap-1 min-w-0" style={{ width: `${(viewportPx / widest) * 100}%` }}>
      <div className="flex items-baseline gap-2 min-w-0">
        <span style={{ fontFamily: MONO, fontSize: 10.5, color: accent }} className="flex-shrink-0">
          {label}
        </span>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            title={`Edit breakpoint-${label} in the table`}
            aria-label={`Edit breakpoint-${label} in the table`}
            className="p-0.5 rounded text-fg-faint hover:text-fg hover:bg-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
          >
            <EditIcon />
          </button>
        )}
        {capped && (
          <span
            style={{ fontFamily: MONO, fontSize: 9, color: t.fgMuted, border: `1px solid ${withAlpha(accent, 0.35)}`, borderRadius: 4, padding: '0 4px' }}
            className="flex-shrink-0"
          >
            container
          </span>
        )}
        <span
          style={{ fontFamily: MONO, fontSize: 10, color: t.fgMuted }}
          className="ml-auto flex-shrink-0 tabular-nums"
          title={`${viewportPx}px viewport · ${Math.round(content)}px content`}
        >
          {Math.round(content)}
          <span style={{ color: t.placeholderText || t.fgMuted }}>{` / ${viewportPx}`}</span>
        </span>
      </div>

      <div
        className="relative"
        style={{
          background: t.surface,
          border: `1px solid ${t.borderDefault || t.border || '#eaecf0'}`,
          borderRadius: frameRadius,
          overflow: 'hidden',
          // Vertical-only breathing room: the columns are a fixed 40px strip
          // unrelated to the horizontal percentage math below, so padding
          // here can't shift the `insetPct`/`gapPct` calculations — it just
          // keeps the strip clear of the frame's own rounded top/bottom edge.
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        {insetPct > 0 && (
          <>
            <span aria-hidden className="absolute top-0 bottom-0" style={{ left: `${insetPct}%`, width: 1, background: withAlpha(accent, 0.4) }} />
            <span aria-hidden className="absolute top-0 bottom-0" style={{ right: `${insetPct}%`, width: 1, background: withAlpha(accent, 0.4) }} />
          </>
        )}
        <div style={{ paddingLeft: `${insetPct}%`, paddingRight: `${insetPct}%` }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${frame.columns}, 1fr)`,
              columnGap: `${gapPct}%`,
              height: 40,
            }}
          >
            {Array.from({ length: frame.columns }).map((_, i) => (
              <span key={i} style={{ background: withAlpha(accent, 0.28), borderRadius: 3 }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {stats.map(([k, v]) => (
          <span
            key={k}
            className="inline-flex items-baseline gap-1 flex-shrink-0"
            style={{
              fontFamily: MONO,
              fontSize: 10,
              border: `1px solid ${withAlpha(accent, 0.14)}`,
              borderRadius: 5,
              padding: '2px 6px',
            }}
          >
            <span style={{ color: t.placeholderText || t.fgMuted }}>{k}</span>
            <span style={{ color: t.fgMuted }}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Ranges({ t, bps, desktopMin }: { t: PreviewTokens; bps: Breakpoint[]; desktopMin: number }) {
  const accent = t.brandSolid
  const axis = bps[bps.length - 1].min * 1.2

  return (
    <div className="flex flex-col gap-1.5">
      {bps.map((b, i) => {
        const next = bps[i + 1]?.min ?? axis
        const last = i === bps.length - 1
        const isDesktopCut = b.min === desktopMin
        return (
          <div key={b.key} className="flex items-center gap-2 min-w-0">
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: accent, width: 26 }} className="flex-shrink-0">
              {b.label}
            </span>
            <span
              className="relative flex-1 min-w-0 rounded-full"
              style={{ height: 8, background: withAlpha(accent, 0.1) }}
              title={last ? `${b.min}px and up` : `${b.min}–${next - 1}px`}
            >
              <span
                className="absolute top-0 bottom-0 rounded-full"
                style={{
                  left: `${(b.min / axis) * 100}%`,
                  width: `${((next - b.min) / axis) * 100}%`,
                  background: isDesktopCut ? accent : withAlpha(accent, 0.55),
                }}
              />
            </span>
            <span
              style={{ fontFamily: MONO, fontSize: 10, color: t.fgMuted, width: 52 }}
              className="flex-shrink-0 text-right tabular-nums"
            >
              {b.min}
              {last ? '+' : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Block({ t, title, children }: { t: PreviewTokens; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 min-w-0">
      <span className="text-[10px] uppercase tracking-widest text-fg-faint px-0.5">{title}</span>
      <div
        className="p-4 flex flex-col gap-3 min-w-0"
        style={{
          background: t.surface,
          border: `1px solid ${t.borderDefault || t.border || '#eaecf0'}`,
          borderRadius: 14,
        }}
      >
        {children}
      </div>
    </section>
  )
}

function frameOf(t: PreviewTokens, viewport: GridViewport): ResolvedGridFrame {
  const bps = extractBreakpoints(t.grid)
  return resolveGridFrame(viewport, mergeGridFrame(t.gridFrame), t.spacing ?? {}, bps)
}

export function GridPreview({
  tokens: t,
  onEditRole,
}: {
  tokens: PreviewTokens
  onEditRole?: (key: string) => void
}) {
  const grid = t.grid ?? {}
  const bpsMap = extractBreakpoints(grid)
  const found = breakpointsOf(grid)
  const desktopStep = t.breakpointRoles?.desktop ?? 'md'
  const desktopMin = num(bpsMap[desktopStep], 768)
  const mobileMax = num(breakpointMobileMax(t.breakpointRoles, bpsMap), desktopMin - 1)
  const mobileFrame = frameOf(t, 'mobile')
  const desktopFrame = frameOf(t, 'desktop')
  const widest = Math.max(desktopMin, found[found.length - 1]?.min ?? desktopMin, 375)

  return (
    <>
      <Block t={t} title="Layout · mobile / desktop">
        <Frame t={t} label="mobile" viewportPx={Math.min(375, mobileMax)} frame={mobileFrame} widest={widest} onEdit={onEditRole ? () => onEditRole('mobile') : undefined} />
        <Frame t={t} label="desktop" viewportPx={desktopMin} frame={desktopFrame} widest={widest} onEdit={onEditRole ? () => onEditRole('desktop') : undefined} />
      </Block>

      {found.length > 0 && (
        <Block t={t} title="Breakpoint primitives">
          <Ranges t={t} bps={found} desktopMin={desktopMin} />
        </Block>
      )}
    </>
  )
}
