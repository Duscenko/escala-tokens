// The status pill as a menu. A choice is the decision `setElementStatus` stores.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../../lib/i18n'
import type { DashboardElement, Suggestion } from '../../../lib/systemDashboard'
import { ELEMENT_STATUSES, type ElementStatus } from '../../../lib/systemDashboardTypes'
import { useDesignStore } from '../../../store/useDesignStore'
import { STATUS_LABEL } from './dashboardData'
import { StatusPill } from './parts'

const SUGGESTED_STATUS: Record<Suggestion, ElementStatus | null> = { approve: 'approved', changes: 'review', keep: null }

export function StatusMenu({ element }: { element: DashboardElement }) {
  const { t } = useI18n()
  const setElementStatus = useDesignStore((s) => s.setElementStatus)
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ top: number; left: number; up: boolean } | null>(null)
  const suggested = SUGGESTED_STATUS[element.suggestion]

  useEffect(() => {
    if (!open || !btnRef.current) return
    const place = () => {
      const rect = btnRef.current!.getBoundingClientRect()
      const up = window.innerHeight - rect.bottom < 220 && rect.top > 220
      const menuW = 180
      setBox({
        top: up ? rect.top - 4 : rect.bottom + 4,
        left: Math.max(8, Math.min(rect.right - menuW, window.innerWidth - menuW - 8)),
        up,
      })
    }
    place()
    const close = () => setOpen(false)
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      btnRef.current?.focus({ preventScroll: true })
      setOpen(false)
    }
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', close, true)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDoc)
    const focus = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"], button')?.focus({ preventScroll: true })
    })
    return () => {
      window.cancelAnimationFrame(focus)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', close, true)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDoc)
    }
  }, [open])

  function choose(status: ElementStatus | null) {
    setElementStatus(element.id, status)
    btnRef.current?.focus({ preventScroll: true })
    setOpen(false)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('Set status')}: ${element.name}`}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        <StatusPill status={element.status} />
      </button>
      {open && box && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label={t('Set status')}
          data-status-menu
          style={{ top: box.top, left: box.left, transform: box.up ? 'translateY(-100%)' : undefined }}
          className="fixed z-50 flex w-40 flex-col gap-0.5 rounded-lg border border-line bg-elevated p-1 shadow-lg"
        >
          {ELEMENT_STATUSES.map((status) => {
            const on = element.decided && element.status === status
            const hinted = !on && suggested === status
            return (
              <button
                key={status}
                type="button"
                role="option"
                aria-selected={on}
                title={hinted ? t('The checks suggest this') : undefined}
                onClick={() => choose(status)}
                className={`h-7 rounded-md px-2 text-left text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
                  on
                    ? 'bg-accent-solid text-accent-ink'
                    : hinted
                      ? 'text-accent-ui hover:bg-accent-ui/[0.08]'
                      : 'text-fg-muted hover:bg-fg/[0.05] hover:text-fg'
                }`}
              >
                {t(STATUS_LABEL[status])}
              </button>
            )
          })}
          {element.decided && (
            <>
              <div className="my-0.5 border-t border-line" />
              <button
                type="button"
                onClick={() => choose(null)}
                className="h-7 rounded-md px-2 text-left text-caption text-fg-muted hover:bg-fg/[0.05] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
              >
                {t('Back to automatic')}
              </button>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
