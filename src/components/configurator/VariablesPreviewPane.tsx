import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'

const MIN_OVERFLOW = 52
const MAX_DOTS = 5

/** Inline live preview shared by every semantic variable table. */
export default function VariablesPreviewPane({
  children,
  watch,
}: {
  children: ReactNode
  /** Re-measures and resets scroll progress when the preview context changes. */
  watch: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion() ?? false
  const [dots, setDots] = useState(0)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => {
      const max = el.scrollHeight - el.clientHeight
      if (max < MIN_OVERFLOW || el.clientHeight === 0) { setDots(0); setActive(0); return }
      const count = Math.min(MAX_DOTS, Math.max(2, Math.ceil(el.scrollHeight / el.clientHeight)))
      setDots(count)
      setActive(Math.round((el.scrollTop / max) * (count - 1)))
    }
    el.scrollTo({ top: 0 })
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => { el.removeEventListener('scroll', measure); observer.disconnect() }
  }, [watch])

  return (
    <aside className="relative hidden min-[1080px]:flex w-[clamp(17rem,29vw,22rem)] flex-shrink-0 flex-col border-l border-line bg-app" aria-label="Variables Preview">
      <header className="h-10 flex-shrink-0 flex items-center px-4 border-b border-line text-mini font-semibold uppercase tracking-widest text-fg-faint">
        Variables Preview
      </header>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pr-6">
        {children}
      </div>
      {dots > 0 && (
        <div role="group" aria-label="Preview scroll position" className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 rounded-full border border-line bg-app/80 py-1 backdrop-blur-sm">
          {Array.from({ length: dots }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Scroll preview to position ${index + 1} of ${dots}`}
              aria-current={index === active}
              onClick={() => {
                const el = scrollRef.current
                if (!el) return
                const max = el.scrollHeight - el.clientHeight
                el.scrollTo({ top: (index / (dots - 1)) * max, behavior: reduce ? 'auto' : 'smooth' })
              }}
              className="flex h-4 w-4 items-center justify-center"
            >
              <span aria-hidden className={`w-[5px] rounded-full ${reduce ? '' : 'transition-all duration-200'} ${index === active ? 'h-3 bg-accent-ui' : 'h-[5px] bg-fg-faint/50'}`} />
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}
