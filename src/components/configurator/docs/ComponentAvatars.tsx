// The Components index — one avatar per catalogue component in the open
// category. Each frame is that component's own specimen, scaled down, so the
// row is a series of the things themselves rather than a second list of names.
// The rail keeps the names; this row is how you recognise one before opening it.

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { COMPONENTS, CATEGORIES, type ComponentDef } from '../../../lib/componentCatalogue'
import type { PreviewTokens } from '../../preview/ButtonPreview'
import { SPECIMENS } from './specimens'
import { useI18n } from '../../../lib/i18n'
import { axisDefaults } from './componentArticle'
import { INSPECT_EXEMPT_ATTR, TokenInspector, useInspectorActive } from '../../preview/artefacts/TokenInspector'

function useHorizontalScrollFade<T extends HTMLElement>(contentKey: string) {
  const ref = useRef<T>(null)
  const [fadeRight, setFadeRight] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const sync = () => {
      const overflow = el.scrollWidth > el.clientWidth + 1
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      setFadeRight(overflow && !atEnd)
    }
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', sync)
      ro.disconnect()
    }
  }, [contentKey])

  return { ref, fadeRight }
}

export function ComponentAvatarStrip({
  category, activeKey, tokens, onSelect,
}: {
  category: string
  activeKey: string
  tokens: PreviewTokens
  onSelect: (c: ComponentDef) => void
}) {
  const items = COMPONENTS.filter((c) => c.category === category)
  const { ref: scrollRef, fadeRight } = useHorizontalScrollFade<HTMLDivElement>(category)

  if (items.length === 0) return null

  return (
    <div className="relative flex-shrink-0 border-b border-line">
      <div
        ref={scrollRef}
        role="group"
        aria-label={category}
        className="flex gap-2 overflow-x-auto px-6 py-3 lg:px-10 scrollbar-thin"
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
      {fadeRight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-app via-app/80 to-transparent"
        />
      )}
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
  const brand = tokens.brandSolid
  return (
    // A div, not a <button>: the specimen inside renders real controls (a tab
    // strip, a button), and a <button> cannot contain another. The click
    // target is the transparent button laid over the whole card, last.
    <div
      className={`relative flex w-[120px] flex-shrink-0 flex-col rounded-xl border p-1.5 text-left transition-colors has-[>button:focus-visible]:ring-2 has-[>button:focus-visible]:ring-accent-ui/50 ${
        active
          ? ''
          : 'border-line hover:border-line-strong hover:bg-elevated/40'
      }`}
      style={
        active
          ? {
              borderColor: brand,
              backgroundColor: `color-mix(in srgb, ${brand} 6%, transparent)`,
            }
          : undefined
      }
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
      <span aria-hidden className={`mt-1 truncate px-0.5 text-micro ${active ? 'font-semibold text-fg' : 'text-fg-muted'}`}>
        {def.label}
      </span>
      <button
        type="button"
        aria-label={def.label}
        aria-current={active ? 'true' : undefined}
        onClick={() => onSelect(def)}
        className="absolute inset-0 cursor-pointer rounded-xl focus-visible:outline-none"
      />
    </div>
  )
}

/** Scales the specimen so the whole of it sits inside the avatar well.
 *  A fixed scale clipped the wide ones (a text link, a store badge) and left
 *  a fragment that no longer looked like the component.
 *  The specimen is a picture (`pointer-events-none`) unless `interactive`:
 *  the board's covers pass it while Inspect is on, or every hover fell through
 *  to the empty frame and the inspector could only pick "Page". */
export function FittedSpecimen({ children, interactive = false }: { children: ReactNode; interactive?: boolean }) {
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
        className={`${interactive ? '' : 'pointer-events-none '}absolute left-1/2 top-1/2 w-max`}
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </span>
    </span>
  )
}

/**
 * The catalogue's landing page: every component as a card, its cover the
 * component's own specimen (the same render the avatar strip uses, larger),
 * category + name below. Ordered by category so neighbours belong together.
 */
export function ComponentsIndex({
  tokens, onSelect, search = '',
}: {
  tokens: PreviewTokens
  onSelect: (c: ComponentDef) => void
  search?: string
}) {
  const { t } = useI18n()
  const q = search.trim().toLowerCase()
  const items = COMPONENTS
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q))
    .sort((a, b) =>
      CATEGORIES.indexOf(a.c.category) - CATEGORIES.indexOf(b.c.category) || a.i - b.i)
    .map(({ c }) => c)

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
      <header className="mb-6">
        <h1 className="text-display font-semibold tracking-tight text-fg">{t('Components')}</h1>
        <p className="mt-2 max-w-2xl text-strong leading-relaxed text-fg-muted">{t('Every component in the library, drawn with your tokens. Open one to see its variants, code and the roles it reads.')}</p>
        <p className="mt-2 text-caption text-fg-faint">{items.length} {t(items.length === 1 ? 'component' : 'components')}</p>
      </header>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
        {items.map((def) => (
          <li key={def.key}>
            <ComponentCard def={def} tokens={tokens} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ComponentCard({
  def, tokens, onSelect,
}: {
  def: ComponentDef
  tokens: PreviewTokens
  onSelect: (c: ComponentDef) => void
}) {
  const { t } = useI18n()
  const Specimen = SPECIMENS[def.key]
  const category = t(def.category)
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-line-strong has-[>button:focus-visible]:ring-2 has-[>button:focus-visible]:ring-accent-ui/50">
      <span
        aria-hidden
        inert
        className="relative block h-[136px] w-full overflow-hidden border-b border-line"
        style={{ background: tokens.surface }}
      >
        {Specimen ? (
          <span className="absolute inset-4 transition-transform duration-200 ease-out group-hover:scale-[1.03]">
            <FittedSpecimen>
              <Specimen t={tokens} v={axisDefaults(def)} />
            </FittedSpecimen>
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-heading text-fg-faint">
            {def.label.slice(0, 1)}
          </span>
        )}
      </span>
      <span aria-hidden className="flex flex-col gap-0.5 px-3.5 py-3">
        <span className="truncate text-caption text-fg-faint">{category}</span>
        <span className="truncate text-strong font-medium text-fg">{def.label}</span>
      </span>
      <button
        type="button"
        aria-label={`${def.label}, ${category}`}
        onClick={() => onSelect(def)}
        className="absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-none"
      />
    </div>
  )
}

/**
 * Every component as a large cover, painted entirely in the system's own
 * tokens (card, label, specimen) — the board's "Components" view.
 *
 * Two doors per cover, and they never compete:
 *  · the name (`onOpen`) opens that component's page; its ↗ shows on hover.
 *    It is the only clickable thing on the card and is exempt from inspector mode, so it
 *    navigates whether or not Inspect is on.
 *  · with inspector mode on (`InspectorModeProvider` above), the specimen is a
 *    `TokenInspector` target: point at it, get the tokens it paints. The cover
 *    is `inert` only while the mode is OFF — an inert subtree is skipped by
 *    hit-testing, which is exactly what the overlay needs to reach.
 */
export function ComponentCoversGrid({ tokens, onOpen }: {
  tokens: PreviewTokens
  /** Opens the component's page. Omit and no arrow renders. */
  onOpen?: (def: ComponentDef) => void
}) {
  const { t } = useI18n()
  const inspecting = useInspectorActive()
  const items = COMPONENTS
    .map((c, i) => ({ c, i }))
    .sort((a, b) =>
      CATEGORIES.indexOf(a.c.category) - CATEGORIES.indexOf(b.c.category) || a.i - b.i)
    .map(({ c }) => c)
  const card = tokens.archTokens?.['surface.layer-1'] ?? tokens.surface
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
      {items.map((def) => {
        const Specimen = SPECIMENS[def.key]
        return (
          <li
            key={def.key}
            className="group relative flex h-[220px] flex-col overflow-hidden rounded-2xl"
            // No outline: the card's fill (surface.layer-1) already separates it
            // from the page, and 59 stroked boxes read as a spreadsheet.
            style={{ background: card }}
          >
            <span className="flex min-w-0 px-5 pt-4">
              {onOpen ? (
                // The name IS the door: the arrow beside it stays hidden until
                // the card is hovered (or the name has keyboard focus), so the
                // grid reads as specimens, not a list of links.
                <button
                  type="button"
                  onClick={() => onOpen(def)}
                  aria-label={`${t('Open')} ${def.label}`}
                  {...{ [INSPECT_EXEMPT_ATTR]: '' }}
                  className="-mx-1.5 -my-0.5 flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-ui transition-colors duration-150 ease-[var(--ease-out-quint)] hover:bg-[color-mix(in_srgb,var(--cover-ink)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cover-ink)]"
                  style={{ color: tokens.neutralText, ['--cover-ink' as string]: tokens.neutralText }}
                >
                  <span className="truncate">{def.label}</span>
                  <svg
                    width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                    className="flex-shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] duration-150 ease-[var(--ease-out-quint)] group-hover:translate-x-0 group-hover:opacity-70 group-focus-within:translate-x-0 group-focus-within:opacity-70 motion-reduce:translate-x-0 motion-reduce:transition-none"
                  >
                    <path d="M5 11 11 5M6 5h5v5" />
                  </svg>
                </button>
              ) : (
                <span className="truncate text-ui" style={{ color: tokens.neutralText }}>{def.label}</span>
              )}
            </span>
            <span aria-hidden inert={!inspecting} className="relative block min-h-0 flex-1">
              {Specimen && (
                <span className="absolute inset-x-5 bottom-5 top-2">
                  <FittedSpecimen interactive={inspecting}>
                    <TokenInspector component={def.key} variant={axisDefaults(def)}>
                      <Specimen t={tokens} v={axisDefaults(def)} />
                    </TokenInspector>
                  </FittedSpecimen>
                </span>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
