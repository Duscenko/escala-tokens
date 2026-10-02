import { dimensionKey, parseDimension, sortedDimensions } from '../../lib/dimensions'
import VariableSelect from './VariableSelect'

/**
 * Picks a semantic length FROM the Dimension primitives — the dimension twin of
 * choosing a ramp tone for a colour role. A role like `radius-container` is a
 * semantic token, so its value is never typed: it is one of the primitives, by
 * name (`dimension-16`).
 *
 * `VariableSelect` — a native `<select>` with the variable mark leading — so the
 * keyboard, screen reader and type-to-jump come for free.
 */
export default function DimensionSelect({
  value,
  scale,
  onChange,
  ariaLabel,
  min = 0,
  allowNone = false,
}: {
  /** The current px value (`16px`), or `none` when `allowNone`. */
  value: string
  /** `dimensions` — key → px. */
  scale: Record<string, string>
  /** Receives the picked primitive as a px string (`24px`), or `none`. */
  onChange: (px: string) => void
  ariaLabel: string
  /** Lowest primitive offered. A semantic length is never negative; the
   *  negatives exist for overlaps and shadow spreads, which are not picked here. */
  min?: number
  /** Offer `none` as a choice — a Grid container with no max-width. */
  allowNone?: boolean
}) {
  const isNone = allowNone && value === 'none'
  const current = isNone ? null : parseDimension(value)
  const options = sortedDimensions(scale).filter(([, n]) => n >= min)
  // The scale is built from every value in use, so this only triggers for a
  // value that changed since the scale was computed — never drop it silently.
  if (current !== null && !options.some(([, n]) => n === current)) {
    options.push([dimensionKey(current), current])
    options.sort((a, b) => a[1] - b[1])
  }
  return (
    <VariableSelect
      ariaLabel={ariaLabel}
      value={isNone ? 'none' : current === null ? '' : dimensionKey(current)}
      onChange={(key) => {
        if (key === 'none') return onChange('none')
        const hit = options.find(([k]) => k === key)
        if (hit) onChange(`${hit[1]}px`)
      }}
    >
      {allowNone && <option value="none">none</option>}
      {options.map(([k, n]) => (
        <option key={k} value={k} title={`${n}px`}>dimension-{k}</option>
      ))}
    </VariableSelect>
  )
}
