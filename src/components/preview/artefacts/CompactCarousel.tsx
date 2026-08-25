import { useRef, useState } from 'react'
import { ARTEFACTS, type Artefact } from './index'
import { ScaledArtefactCard } from './ScaledArtefactCard'
import type { PreviewTokens } from '../ButtonPreview'

/** Thumbnail width in the carousel — deliberately much smaller than the
 *  ~360px true-size frame, so it reads as a shrunk photo (a "social post"
 *  scale) rather than a slightly-narrower version of the real screen. */
const COMPACT_WIDTH = 240
const GAP = 16

/** Landing view of the `Artefacts` tab — a horizontally-scrolling strip of
 *  compact cards, one per `ARTEFACTS` entry. Tapping a card hands it to
 *  `onExpand`, which shows it at true size (see `PreviewPanel`'s `ArtefactsPane`).
 *
 *  Pagination dots + prev/next only render once `ARTEFACTS.length > 1` — a
 *  single-item carousel has nothing to page between, and a control for a
 *  choice nobody has is the same over-explaining `KitsPopover`'s one-theme
 *  case already argues against. With one artefact this is just a centred card. */
export function CompactCarousel({
  tokens, onExpand,
}: {
  tokens: PreviewTokens
  onExpand: (artefact: Artefact) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const multi = ARTEFACTS.length > 1

  const scrollToIndex = (i: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: i * (COMPACT_WIDTH + GAP), behavior: 'smooth' })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setActive(Math.round(el.scrollLeft / (COMPACT_WIDTH + GAP)))
  }

  return (
    <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-5 flex flex-col">
      {/* Same centering fix as the expanded view's frame: on a tall window the
          strip used to sit at the top with a large dead area below it. This
          wrapper takes the remaining room and centers the strip+dots group
          inside it; `min-h-0` lets it shrink below the group's height on a
          short window instead of forcing overflow, and the OUTER
          `overflow-y-auto` still scrolls the whole column if it can't. */}
      <div className="flex-1 min-h-0 flex flex-col justify-center gap-1">
        <div
          ref={scrollRef}
          onScroll={multi ? handleScroll : undefined}
          className={`flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-thin pb-2 -mx-5 px-5 ${multi ? '' : 'justify-center'}`}
        >
          {ARTEFACTS.map((a) => (
            <div key={a.key} className="snap-center flex flex-col items-center gap-2">
              <ScaledArtefactCard artefact={a} t={tokens} targetWidth={COMPACT_WIDTH} onExpand={() => onExpand(a)} />
              <span className="text-[11px] font-medium text-fg-muted">{a.label}</span>
            </div>
          ))}
        </div>

        {multi && (
          <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label="Artefacts">
            {ARTEFACTS.map((a, i) => (
              <button
                key={a.key}
                type="button"
                role="tab"
                aria-selected={active === i}
                aria-label={`Show ${a.label}`}
                onClick={() => scrollToIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${active === i ? 'bg-fg' : 'bg-line-strong hover:bg-fg-faint'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
