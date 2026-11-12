import type { CSSProperties } from 'react'

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const ROLL = 'transform var(--motion-use-travel-in, 320ms cubic-bezier(0.22, 1, 0.36, 1))'

/**
 * A figure whose digits roll to their new value, each on its own strip, on the
 * brand's `use-travel-in`. The value itself sits underneath, transparent: it
 * gives the exact width and baseline, so a neighbour ("%", "/ per month")
 * stays on the line and nothing around the number moves. Tabular figures keep
 * every digit one width wide.
 */
export function RollingNumber({ value, style }: { value: string; style?: CSSProperties }) {
  const chars = [...value]
  return (
    <span style={{ position: 'relative', display: 'inline-block', fontVariantNumeric: 'tabular-nums', ...style }}>
      <span style={{ color: 'transparent' }}>{value}</span>
      <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', whiteSpace: 'pre' }}>
        {chars.map((ch, i) => {
          // Keyed from the right, so "9" → "10" grows on the left and the
          // units keep rolling instead of remounting.
          const key = chars.length - i
          if (!/\d/.test(ch)) return <span key={`${key}${ch}`}>{ch}</span>
          return (
            <span key={key} style={{ display: 'inline-block', height: '1lh', overflow: 'hidden' }}>
              <span style={{ display: 'flex', flexDirection: 'column', transform: `translateY(calc(${-Number(ch)} * 1lh))`, transition: ROLL }}>
                {DIGITS.map((d) => <span key={d} style={{ height: '1lh' }}>{d}</span>)}
              </span>
            </span>
          )
        })}
      </span>
    </span>
  )
}
