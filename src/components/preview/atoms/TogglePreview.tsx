import { useState } from 'react'
import { motion } from 'framer-motion'
import { type PreviewTokens } from '../ButtonPreview'

// A switch whose "on" track uses the brand color. Interactive so the preview
// feels alive; the knob springs across on toggle.
export function TogglePreview({ tokens, defaultOn = true }: { tokens: PreviewTokens; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn)
  const W = 40
  const H = 24
  const KNOB = 20

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      style={{
        width: W,
        height: H,
        flexShrink: 0,
        borderRadius: 9999,
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        position: 'relative',
        background: on ? tokens.brandSolid : tokens.border || '#d0d5dd',
        transition: 'background .2s',
      }}
    >
      <motion.span
        animate={{ x: on ? W - KNOB - 2 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute',
          top: 2,
          left: 0,
          width: KNOB,
          height: KNOB,
          borderRadius: 9999,
          background: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,.25)',
        }}
      />
    </button>
  )
}
