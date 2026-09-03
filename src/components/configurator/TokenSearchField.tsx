import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { CHROME_CONTROL_ACTIVE, CHROME_CONTROL_FOCUS, CHROME_CONTROL_HOVER, CHROME_CONTROL_SHELL } from './themeWorkspaceLayout'

/** Field width as rem — must match the animated overflow mask AND the label
 *  `w-[14rem]`. A px constant (224) assumed a 16px root; this app's root is
 *  18px, so 14rem = 252px and the mask clipped ~28px off the chip. */
const SEARCH_W = '14rem'
/** Collapsed icon is `h-8 w-8` = 2rem (36px at this root). */
const ICON_W = '2rem'
const WIDE_BP = '(min-width: 1280px)'

const IS_MAC = typeof navigator !== 'undefined'
  && /mac/i.test(navigator.platform || navigator.userAgent || '')

const ICON_ACTION = `grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-fg-muted transition-[color,box-shadow] ${CHROME_CONTROL_SHELL} ${CHROME_CONTROL_HOVER} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/60 focus-visible:ring-offset-2 focus-visible:ring-offset-app`

const FIELD_SHELL = `bg-input-bg ${CHROME_CONTROL_HOVER} ${CHROME_CONTROL_FOCUS}`

function SearchGlyph({ className = 'h-3.5 w-3.5 flex-shrink-0 bg-current text-fg-faint' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        WebkitMask: "url('/icons/settings/search.svg') center / contain no-repeat",
        mask: "url('/icons/settings/search.svg') center / contain no-repeat",
      }}
    />
  )
}

export type TokenSearchHandle = { focus: () => void }

interface TokenSearchFieldProps {
  value: string
  onChange: (value: string) => void
}

export const TokenSearchField = forwardRef<TokenSearchHandle, TokenSearchFieldProps>(
  function TokenSearchField({ value, onChange }, ref) {
    const { t } = useI18n()
    const inputRef = useRef<HTMLInputElement>(null)
    const rootRef = useRef<HTMLDivElement>(null)
    const [expanded, setExpanded] = useState(false)
    const [wide, setWide] = useState(
      () => typeof window !== 'undefined' && window.matchMedia(WIDE_BP).matches,
    )
    const reduceMotion = useReducedMotion()

    useEffect(() => {
      const mq = window.matchMedia(WIDE_BP)
      const sync = () => {
        setWide(mq.matches)
        if (mq.matches) setExpanded(false)
      }
      sync()
      mq.addEventListener('change', sync)
      return () => mq.removeEventListener('change', sync)
    }, [])

    const open = wide || expanded

    const focusField = useCallback(() => {
      if (!wide) setExpanded(true)
      requestAnimationFrame(() => {
        const el = inputRef.current
        if (!el) return
        el.focus()
        el.select()
      })
    }, [wide])

    useImperativeHandle(ref, () => ({ focus: focusField }), [focusField])

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return
        const active = document.activeElement as HTMLElement | null
        const typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
        if (typing && active !== inputRef.current) return
        if (!inputRef.current) return
        e.preventDefault()
        focusField()
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }, [focusField])

    useEffect(() => {
      if (!expanded || wide || value) return
      const onPointerDown = (e: PointerEvent) => {
        if (rootRef.current?.contains(e.target as Node)) return
        setExpanded(false)
      }
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return
        setExpanded(false)
        inputRef.current?.blur()
      }
      document.addEventListener('pointerdown', onPointerDown)
      document.addEventListener('keydown', onKey)
      return () => {
        document.removeEventListener('pointerdown', onPointerDown)
        document.removeEventListener('keydown', onKey)
      }
    }, [expanded, wide, value])

    const input = (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('Search tokens')}
        aria-label={t('Search tokens')}
        aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}
        className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-faint"
        onBlur={() => {
          if (value || wide) return
          window.setTimeout(() => {
            if (!rootRef.current?.contains(document.activeElement)) setExpanded(false)
          }, 120)
        }}
      />
    )

    const clearBtn = value ? (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label={t('Clear search')}
        className="grid h-5 w-5 flex-shrink-0 place-items-center rounded text-ui text-fg-faint hover:bg-elevated hover:text-fg"
      >
        ×
      </button>
    ) : (
      <img
        src="/icons/settings/search-comands.svg"
        alt=""
        aria-hidden
        className="hidden min-[1180px]:block h-3.5 flex-shrink-0 opacity-80"
      />
    )

    if (wide) {
      return (
        <label className={`flex h-8 w-[14rem] flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-fg-muted transition-colors ${FIELD_SHELL}`}>
          <SearchGlyph />
          {input}
          {clearBtn}
        </label>
      )
    }

    return (
      <div ref={rootRef} className="relative flex-shrink-0">
        <motion.div
          className="overflow-hidden"
          initial={false}
          animate={{ width: open ? SEARCH_W : ICON_W }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.33, 1, 0.68, 1] }}
        >
          {!open ? (
            <button
              type="button"
              onClick={focusField}
              aria-label={t('Search tokens')}
              title={`${t('Search tokens')} (${IS_MAC ? '⌘K' : 'Ctrl+K'})`}
              className={`${ICON_ACTION} ${value ? `${CHROME_CONTROL_ACTIVE} text-fg` : ''}`}
            >
              <SearchGlyph className="h-4 w-4 bg-current text-current" />
            </button>
          ) : (
            <label className={`flex h-8 w-[14rem] items-center gap-1.5 rounded-lg px-2.5 text-fg-muted ${FIELD_SHELL}`}>
              <SearchGlyph />
              {input}
              {clearBtn}
            </label>
          )}
        </motion.div>
      </div>
    )
  },
)
