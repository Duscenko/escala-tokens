import { useState } from 'react'

/** Copies `text` on click / Enter / Space and says so for ~1s. A span with
 *  a button role because it sits INSIDE a row that is itself a button. */
export function useCopyOnClick(text: string) {
  const [copied, setCopied] = useState(false)
  const copy = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    e.preventDefault()
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1100)
    }).catch(() => {})
  }
  return {
    copied,
    props: {
      role: 'button' as const,
      tabIndex: 0,
      onClick: copy,
      onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') copy(e) },
    },
  }
}
