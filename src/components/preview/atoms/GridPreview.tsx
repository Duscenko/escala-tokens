// Grid foundation specimen — the live layout grid at every breakpoint the
// system defines, plus the breakpoint ranges themselves.
//
// Two blocks, because the Grid foundation ships two genuinely different things
// and a token table can only print a number for either:
//
//  · **Layout grid, per breakpoint.** `columns`/`gutter`/`margin`/`container`
//    are GLOBAL tokens, but what they PRODUCE changes with the viewport: the
//    container caps the content long before the widest breakpoint, and once it
//    does, `margin` stops being what sets the side inset at all. One abstract
//    column strip can't show that — a frame per breakpoint can, and the
//    resulting CONTENT width is the number designers actually lay out against.
//    (The Grid table's own `footer` already draws the single abstract strip;
//    this deliberately doesn't repeat it.)
//  · **Breakpoint ranges.** A breakpoint is a RANGE, not a point. The table
//    prints only its min width, so "where does `md` stop" is invisible there —
//    it's the next breakpoint's min, which is a different row.
//
// Everything derives from `t.grid`, including WHICH breakpoints exist (any
// `breakpoint-*` key), so this can't drift from the tokens that ship.

import { type ReactNode } from 'react'
import { radiusOf } from '../../../lib/previewTokens'
import { withAlpha } from '../../../lib/colorUtils'
import type { PreviewTokens } from '../ButtonPreview'

const MONO = 'ui-monospace, monospace'

const num = (v: string | undefined, fallback: number) => {
  const n = parseFloat(v ?? '')
  return Number.isFinite(n) ? n : fallback
}

type Breakpoint = { key: string; label: string; min: number }

/** Every `breakpoint-*` token with a real width, smallest first. */
function breakpointsOf(grid: Record<string, string>): Breakpoint[] {
  return Object.entries(grid)
    .filter(([k]) => k.startsWith('breakpoint-'))
    .map(([k, v]) => ({ key: k, label: k.replace('breakpoint-', ''), min: num(v, 0) }))
    .filter((b) => b.min > 0)
    .sort((a, b) => a.min - b.min)
}

// ── One viewport's layout grid ──────────────────────────────────────────────
// Rendered at `viewport / widest` of the panel's width, so the frames keep
// their real proportions to each other — that relative story is half of what
// makes a breakpoint set legible.
//
// The maths stays EXACT at any render scale because both insets are expressed
// as percentages of the box they resolve against: `padding: %` resolves
// against the frame's own width (= the viewport), and `column-gap: %` against
// the grid's content box (= the content width). So nothing here depends on how
// many CSS pixels the frame actually got.
function Frame({
  t, bp, widest, columns, gutter, margin, container,
}: {
  t: PreviewTokens
  bp: Breakpoint
  widest: number
  columns: number
  gutter: number
  margin: number
  container: number
}) {
  const accent = t.brandSolid
  const viewport = bp.min
  // The container is a CAP, not a width: below it the margins set the content,
  // at and above it the container does and the margins are irrelevant.
  const capped = viewport - margin * 2 > container
  const content = Math.max(0, Math.min(viewport - margin * 2, container))
  const insetPct = viewport > 0 ? ((viewport - content) / 2 / viewport) * 100 : 0
  const gapPct = content > 0 ? (gutter / content) * 100 : 0

  return (
    <div className="flex flex-col gap-1 min-w-0" style={{ width: `${(viewport / widest) * 100}%` }}>
      <div className="flex items-baseline gap-2 min-w-0">
        <span style={{ fontFamily: MONO, fontSize: 10.5, color: accent }} className="flex-shrink-0">
          {bp.label}
        </span>
        {capped && (
          <span
            style={{ fontFamily: MONO, fontSize: 9, color: t.fgMuted, border: `1px solid ${withAlpha(accent, 0.35)}`, borderRadius: 4, padding: '0 4px' }}
            className="flex-shrink-0"
            title={`Content is capped by the container (${container}px), not the ${margin}px margin`}
          >
            container
          </span>
        )}
        <span
          style={{ fontFamily: MONO, fontSize: 10, color: t.fgMuted }}
          className="ml-auto flex-shrink-0 tabular-nums"
          title={`${viewport}px viewport · ${content}px content`}
        >
          {content}
          <span style={{ color: t.placeholderText || t.fgMuted }}>{` / ${viewport}`}</span>
        </span>
      </div>

      <div
        className="relative"
        style={{
          background: t.surface,
          border: `1px solid ${t.borderDefault || t.border || '#eaecf0'}`,
          borderRadius: radiusOf(t, 'md', '8px'),
          overflow: 'hidden',
        }}
      >
        {/* Margin guides — the classic layout-grid rules at the content edges.
            Absolutely positioned rather than borders on the content box, so
            they can't shift the content width the gap maths is solved against. */}
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
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              columnGap: `${gapPct}%`,
              height: 40,
            }}
          >
            {Array.from({ length: columns }).map((_, i) => (
              <span key={i} style={{ background: withAlpha(accent, 0.22) }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Breakpoint ranges ───────────────────────────────────────────────────────
// Each bar runs from its own min width to the NEXT breakpoint's — which is the
// thing the token table structurally can't show, since that number lives in a
// different row. The last bar runs to the axis edge: it's unbounded, hence the
// `+` on its label rather than a fabricated upper number.
function Ranges({ t, bps }: { t: PreviewTokens; bps: Breakpoint[] }) {
  const accent = t.brandSolid
  // Headroom past the largest breakpoint so the unbounded last range still has
  // visible extent instead of collapsing onto the right edge.
  const axis = bps[bps.length - 1].min * 1.2

  return (
    <div className="flex flex-col gap-1.5">
      {bps.map((b, i) => {
        const next = bps[i + 1]?.min ?? axis
        const last = i === bps.length - 1
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
                  background: accent,
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

export function GridPreview({ tokens: t }: { tokens: PreviewTokens }) {
  const grid = t.grid ?? {}
  const columns = Math.max(1, Math.min(parseInt(grid.columns) || 12, 24))
  const gutter = num(grid.gutter, 24)
  const margin = num(grid.margin, 32)
  const container = num(grid.container, 1280)

  // A system whose breakpoints are all blank still has a container, and that's
  // a real layout to draw — so it stands in as the single frame rather than the
  // block rendering empty.
  const found = breakpointsOf(grid)
  const bps: Breakpoint[] = found.length
    ? found
    : [{ key: 'container', label: 'container', min: container }]
  const widest = bps[bps.length - 1].min

  return (
    <>
      <Block t={t} title="Layout grid">
        {bps.map((bp) => (
          <Frame
            key={bp.key}
            t={t}
            bp={bp}
            widest={widest}
            columns={columns}
            gutter={gutter}
            margin={margin}
            container={container}
          />
        ))}
        {/* The globals, as ATOMIC chips rather than one `·`-joined sentence:
            at this width the sentence wrapped mid-phrase and orphaned the last
            word ("container" alone on line 2). Each stat wrapping as a unit
            can't do that. */}
        <div
          className="flex flex-wrap gap-x-3 gap-y-1"
          style={{ fontFamily: MONO, fontSize: 10, color: t.placeholderText || t.fgMuted }}
        >
          <span>{columns} columns</span>
          <span>{gutter}px gutter</span>
          <span>{margin}px margin</span>
          <span>{container}px container</span>
        </div>
      </Block>

      {found.length > 0 && (
        <Block t={t} title="Breakpoints">
          <Ranges t={t} bps={bps} />
        </Block>
      )}
    </>
  )
}
