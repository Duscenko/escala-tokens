import { motion, useReducedMotion } from 'framer-motion'
import { SEGMENT_SELECTED_FILL } from '../configurator/themeWorkspaceLayout'

/** The raised fill of a segmented control's selected segment, as ONE element
 *  that slides between segments instead of blinking off one and on the next.
 *  Render it inside the selected segment (which must be `relative`, its label
 *  `relative` above it); every segment of a control passes the same `group`, so
 *  framer-motion's shared layout moves the one fill across. A critically damped
 *  spring — it lands, it does not bounce. */
export function SegmentHighlight({ group }: { group: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.span
      aria-hidden
      layoutId={`segment-highlight-${group}`}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42, mass: 0.85 }}
      className={`absolute inset-0 rounded-md ${SEGMENT_SELECTED_FILL}`}
    />
  )
}
