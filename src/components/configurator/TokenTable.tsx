import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'

// Generic, filterable token table shared by the Opacity / Shadow / Grid / Sizes
// foundations. Each row: CSS var name · live preview cell · editable value.
interface TokenTableProps {
  tokens: Record<string, string>
  /** CSS variable prefix — row names render as `--{prefix}-{key}`. */
  prefix: string
  onChange: (key: string, value: string) => void
  /** Optional per-row preview cell, rendered between the name and the input. */
  renderPreview?: (key: string, value: string) => ReactNode
  searchPlaceholder?: string
  /** Wider input column for long values (e.g. shadow definitions). */
  wideValues?: boolean
}

export default function TokenTable({
  tokens,
  prefix,
  onChange,
  renderPreview,
  searchPlaceholder = 'Filter tokens…',
  wideValues = false,
}: TokenTableProps) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const entries = Object.entries(tokens).filter(
    ([k, v]) => !q || k.toLowerCase().includes(q) || v.toLowerCase().includes(q),
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Filter */}
      <div className="relative max-w-xs">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-faint pointer-events-none"
          aria-hidden
        >
          <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="w-full bg-surface border border-line focus:border-[#0088FF] rounded-lg pl-8 pr-3 py-1.5 text-xs text-fg outline-none transition-colors"
        />
      </div>

      {/* Rows */}
      <div className="flex flex-col rounded-xl border border-line overflow-hidden divide-y divide-line/60">
        {entries.length === 0 && (
          <p className="px-4 py-6 text-xs text-fg-faint text-center">
            No tokens match “{query}”.
          </p>
        )}
        {entries.map(([key, value], i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.3) }}
            className="flex items-center gap-3 px-3 py-2 bg-surface"
          >
            <span className="text-[11px] font-mono text-fg-muted w-44 flex-shrink-0 truncate">
              --{prefix}-{key}
            </span>
            {renderPreview && (
              <div className="flex-1 min-w-0 flex items-center">{renderPreview(key, value)}</div>
            )}
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(key, e.target.value)}
              aria-label={`--${prefix}-${key} value`}
              className={`${
                wideValues ? 'flex-[2] min-w-0' : 'w-28 flex-shrink-0'
              } bg-app border border-line focus:border-[#0088FF] rounded px-2 py-1 text-[11px] font-mono text-fg outline-none transition-colors ${
                wideValues ? '' : 'text-right'
              }`}
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
