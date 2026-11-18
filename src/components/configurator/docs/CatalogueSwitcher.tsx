// The quick way from one catalogue page to the next — on the stage's own header
// row (right side), for Elements and Blocks alike: ‹ previous · [name ⌄] · next ›.
// The name opens a searchable list grouped by folder (the directory's own
// order), typed into at once, arrows + Enter to go, Esc to close. The breadcrumb
// above stays the way back to the index; this is the way sideways.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Popover } from 'radix-ui'
import { useI18n } from '../../../lib/i18n'
import { SELECT_LIST, SELECT_OPTION, SELECT_OPTION_CURSOR, SELECT_OPTION_OFF, SELECT_OPTION_ON } from '../themeWorkspaceLayout'
import { HintTip } from '../../ui/HintTip'

export interface SwitcherItem { id: string; label: string }
export interface SwitcherGroup { label: string; items: SwitcherItem[] }

const ICON_BTN =
  'flex h-8 w-8 items-center justify-center rounded-lg border border-line text-fg-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 aria-disabled:pointer-events-none aria-disabled:opacity-40'

function Chevron({ dir }: { dir: 'left' | 'right' | 'down' }) {
  const d = dir === 'left' ? 'M10 3.5 5.5 8 10 12.5' : dir === 'right' ? 'M6 3.5 10.5 8 6 12.5' : 'M4 6l4 4 4-4'
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
}

/** A step past the end of this list, into the next catalogue (Elements → Blocks). */
export interface CatalogueBridge { label: string; hint: string; onGo: () => void }

const BRIDGE_BTN =
  'flex h-8 items-center gap-1 rounded-lg border border-line-strong bg-surface px-2 text-caption font-medium text-fg transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

export function CatalogueSwitcher({ groups, currentId, onPick, noun, bridgePrev, bridgeNext }: {
  /** Shown on the first page instead of a dead ‹. */
  bridgePrev?: CatalogueBridge
  /** Shown on the last page instead of a dead ›. */
  bridgeNext?: CatalogueBridge
  groups: SwitcherGroup[]
  currentId: string
  onPick: (id: string) => void
  /** "component" / "block": names the list and the arrows. */
  noun: 'component' | 'block'
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const index = flat.findIndex((i) => i.id === currentId)
  const current = flat[index]
  const prev = index > 0 ? flat[index - 1] : null
  const next = index >= 0 && index < flat.length - 1 ? flat[index + 1] : null

  const q = query.trim().toLowerCase()
  const shown = useMemo(
    () => groups
      .map((g) => ({ ...g, items: g.items.filter((i) => !q || i.label.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0),
    [groups, q],
  )
  const shownFlat = useMemo(() => shown.flatMap((g) => g.items), [shown])

  // Open on the page on screen; typing moves the cursor to the first match.
  useEffect(() => {
    if (!open) return
    setCursor(q ? 0 : Math.max(0, shownFlat.findIndex((i) => i.id === currentId)))
  }, [open, q, shownFlat, currentId])
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cursor="true"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [open, cursor])

  const go = (id: string) => {
    setOpen(false)
    setQuery('')
    if (id !== currentId) onPick(id)
  }
  const label = noun === 'block' ? t('Go to block') : t('Go to component')

  return (
    <div className="flex items-center gap-1">
      {!prev && bridgePrev ? (
        <HintTip label={bridgePrev.hint}>
          <button type="button" className={BRIDGE_BTN} onClick={bridgePrev.onGo}>
            <Chevron dir="left" />
            {bridgePrev.label}
          </button>
        </HintTip>
      ) : (
      <HintTip label={prev ? `${t('Previous')}: ${prev.label}` : t('Previous')}>
        <button type="button" className={ICON_BTN} aria-label={t('Previous')} aria-disabled={!prev || undefined} onClick={() => prev && go(prev.id)}>
          <Chevron dir="left" />
        </button>
      </HintTip>
      )}
      <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery('') }}>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label={label}
            className="flex h-8 max-w-[220px] items-center gap-1.5 rounded-lg border border-line px-2.5 text-caption font-medium text-fg transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 data-[state=open]:bg-surface"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden className="flex-shrink-0 text-fg-faint">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="truncate">{current?.label ?? label}</span>
            {index >= 0 && <span className="tabular-nums text-mini font-normal text-fg-faint">{index + 1}/{flat.length}</span>}
            <span className="text-fg-faint"><Chevron dir="down" /></span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={6}
            className={`${SELECT_LIST} z-[70] flex w-[280px] flex-col gap-1.5`}
            onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector('input')?.focus() }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(shownFlat.length - 1, c + 1)) }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)) }
                else if (e.key === 'Enter') { e.preventDefault(); const it = shownFlat[cursor]; if (it) go(it.id) }
              }}
              placeholder={noun === 'block' ? t('Search blocks') : t('Search components')}
              aria-label={noun === 'block' ? t('Search blocks') : t('Search components')}
              role="combobox"
              aria-expanded
              aria-controls="catalogue-switcher-list"
              className="h-8 w-full rounded-lg border border-line bg-app px-2.5 text-caption text-fg placeholder:text-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
            />
            <div ref={listRef} id="catalogue-switcher-list" role="listbox" aria-label={label} className="max-h-[360px] overflow-y-auto">
              {shown.length === 0 && <p className="px-2.5 py-2 text-caption text-fg-faint">{t('No match')}</p>}
              {shown.map((g) => (
                <div key={g.label} role="group" aria-label={t(g.label)} className="pb-1">
                  <p className="px-2.5 pb-0.5 pt-1.5 text-mini font-semibold uppercase tracking-widest text-fg-faint">{t(g.label)}</p>
                  {g.items.map((it) => {
                    const at = shownFlat.indexOf(it)
                    const on = it.id === currentId
                    const cur = at === cursor
                    return (
                      <button
                        key={it.id}
                        type="button"
                        role="option"
                        aria-selected={on}
                        data-cursor={cur ? 'true' : undefined}
                        onMouseEnter={() => setCursor(at)}
                        onClick={() => go(it.id)}
                        className={`${SELECT_OPTION} block truncate text-caption ${on ? SELECT_OPTION_ON : cur ? SELECT_OPTION_CURSOR : SELECT_OPTION_OFF}`}
                      >
                        {it.label}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {!next && bridgeNext ? (
        <HintTip label={bridgeNext.hint}>
          <button type="button" className={BRIDGE_BTN} onClick={bridgeNext.onGo}>
            {bridgeNext.label}
            <Chevron dir="right" />
          </button>
        </HintTip>
      ) : (
      <HintTip label={next ? `${t('Next')}: ${next.label}` : t('Next')}>
        <button type="button" className={ICON_BTN} aria-label={t('Next')} aria-disabled={!next || undefined} onClick={() => next && go(next.id)}>
          <Chevron dir="right" />
        </button>
      </HintTip>
      )}
    </div>
  )
}
