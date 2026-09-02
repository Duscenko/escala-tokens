import type { ReactNode } from 'react'
import { extractBreakpoints, resolveGridFrame } from '../../../lib/layoutTokens'
import { radiusRoleOf } from '../../../lib/previewTokens'
import type { PreviewTokens } from '../ButtonPreview'

/** Widest a mobile frame is allowed to get. Phones top out around here (a Pro
 *  Max is 430pt), and past it the frame stops reading as a phone and starts
 *  reading as a narrow desktop window. It is a CAP, not a target — in the 400px
 *  aside the column is always the binding constraint. */
const MOBILE_MAX = 420

/**
 * The artefact's viewport — a plain rounded rectangle, painted in the system's
 * own page surface, radius and border. No notch, no status bar, no simulated
 * hardware: every pixel of invented device chrome is a pixel that isn't a token,
 * competing for attention in a panel whose entire job is showing you tokens.
 *
 * **This component itself never re-flows to fit a size.** It always lays out
 * at 100% of its immediate container (capped at `MOBILE_MAX`), so type, control
 * heights and radii are computed at one consistent scale — never squeezed into
 * a narrower box, which is what would quietly lie about the type scale (a 16px
 * label rendering at 14.7px). `GridPreview` reaches the opposite conclusion for
 * the right reason: it draws a layout DIAGRAM, whose percentage insets stay a
 * true scale model at any size — an artefact contains type, which has no
 * percentage equivalent.
 *
 * A CALLER may still shrink the whole rendered result for display — the
 * carousel's `ScaledArtefactCard` does, via a CSS `transform: scale()` applied
 * AFTER this component has already laid out at its one true scale. That's a
 * photograph of the real thing at a smaller size, not a re-flow, and it's the
 * `compact` prop's only job: swap the caption so a shrunk photo doesn't claim
 * to be "true size."
 *
 * The page inset is the system's OWN mobile grid margin (`resolveGridFrame`),
 * not a number chosen here — so editing Grid · Mobile visibly moves the screen.
 */
export function DeviceFrame({
  t, children, compact = false,
}: {
  t: PreviewTokens
  children: ReactNode
  compact?: boolean
}) {
  const frame = resolveGridFrame('mobile', t.gridFrame, t.spacing, extractBreakpoints(t.grid))

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div
        style={{
          width: '100%',
          maxWidth: MOBILE_MAX,
          margin: '0 auto',
          background: t.surface,
          border: `1px solid ${t.borderDefault || t.border || '#eaecf0'}`,
          // The frame is a container, so it takes the container radius role —
          // the same token a Card or Modal resolves.
          borderRadius: radiusRoleOf(t, 'container', '16px'),
          padding: frame.margin,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
      {/* Names the two numbers the frame is built from. Without it, "this is at
          true size" and "this margin came from your Grid tokens" are both
          claims you'd have to take on faith. In `compact` the caption drops
          BOTH claims — a scaled photo is neither true size nor showing its
          margin in real px, and the text is illegible at that scale anyway. */}
      {!compact && (
        <p className="text-mini text-fg-faint text-center tabular-nums">
          Mobile · true size · page margin {frame.margin} from Grid
        </p>
      )}
    </div>
  )
}
