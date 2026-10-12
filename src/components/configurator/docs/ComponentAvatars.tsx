// The Components index — one avatar per catalogue component in the open
// category. Each frame is that component's own specimen, scaled down, so the
// row is a series of the things themselves rather than a second list of names.
// The rail keeps the names; this row is how you recognise one before opening it.

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { COMPONENTS, type ComponentDef } from '../../../lib/componentCatalogue'
import type { PreviewTokens } from '../../preview/ButtonPreview'
import { SPECIMENS } from './specimens'
import { axisDefaults } from './componentArticle'

export function ComponentAvatarStrip({
  category, activeKey, tokens, onSelect,
}: {
  category: string
  activeKey: string
  tokens: PreviewTokens
  onSelect: (c: ComponentDef) => void
}) {
  const items = COMPONENTS.filter((c) => c.category === category)
  if (items.length === 0) return null

  return (
    <div className="flex-shrink-0 border-b border-line">
      <div
        role="group"
        aria-label={category}
        className="flex gap-2 overflow-x-auto px-6 py-3 lg:px-10"
      >
        {items.map((comp) => (
          <ComponentAvatar
            key={comp.key}
            def={comp}
            tokens={tokens}
            active={comp.key === activeKey}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

function ComponentAvatar({
  def, tokens, active, onSelect,
}: {
  def: ComponentDef
  tokens: PreviewTokens
  active: boolean
  onSelect: (c: ComponentDef) => void
}) {
  const Specimen = SPECIMENS[def.key]
  return (
    <button
      type="button"
      aria-label={def.label}
      aria-current={active ? 'true' : undefined}
      onClick={() => onSelect(def)}
      className={`flex w-[120px] flex-shrink-0 flex-col rounded-xl border p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
        active
          ? 'border-accent-solid bg-accent-ui/[0.06]'
          : 'border-line hover:border-line-strong hover:bg-elevated/40'
      }`}
    >
      <span
        aria-hidden
        inert
        className="relative block h-16 w-full overflow-hidden rounded-lg"
        style={{ background: tokens.surface }}
      >
        {Specimen ? (
          <FittedSpecimen>
            <Specimen t={tokens} v={axisDefaults(def)} />
          </FittedSpecimen>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-micro text-fg-faint">
            {def.label.slice(0, 1)}
          </span>
        )}
      </span>
      <span className={`mt-1 truncate px-0.5 text-micro ${active ? 'font-semibold text-fg' : 'text-fg-muted'}`}>
        {def.label}
      </span>
    </button>
  )
}

/** Scales the specimen so the whole of it sits inside the avatar well.
 *  A fixed scale clipped the wide ones (a text link, a store badge) and left
 *  a fragment that no longer looked like the component. */
function FittedSpecimen({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLSpanElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const frame = frameRef.current
    const inner = innerRef.current
    if (!frame || !inner) return
    const fit = () => {
      const fw = frame.clientWidth - 8
      const fh = frame.clientHeight - 8
      const iw = inner.offsetWidth
      const ih = inner.offsetHeight
      if (fw <= 0 || fh <= 0 || iw <= 0 || ih <= 0) return
      const next = Math.min(1, fw / iw, fh / ih)
      setScale((prev) => (Math.abs(prev - next) < 0.02 ? prev : next))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [])

  return (
    <span ref={frameRef} className="absolute inset-0">
      <span
        ref={innerRef}
        className="pointer-events-none absolute left-1/2 top-1/2 w-max"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </span>
    </span>
  )
}
