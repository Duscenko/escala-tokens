// Escala component on the shadcn Input + Progress idea: a password field with a
// four-segment meter. Appearance: its recipe (PasswordStrength).
import * as React from 'react'
import { cn } from '../../lib/utils'

export type Strength = 'weak' | 'fair' | 'strong'

/** 0–4 from length and character mix; the meter and caption follow it. */
export function scorePassword(pw: string): { level: number; strength: Strength; caption: string } {
  let n = 0
  if (pw.length >= 8) n++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) n++
  if (/\d/.test(pw)) n++
  if (/[^A-Za-z0-9]/.test(pw) && pw.length >= 10) n++
  if (n <= 1) return { level: Math.max(1, n), strength: 'weak', caption: 'Weak — add more characters.' }
  if (n <= 3) return { level: n, strength: 'fair', caption: 'Fair — mix in numbers and symbols.' }
  return { level: 4, strength: 'strong', caption: 'Strong password.' }
}

const FORCED: Record<Strength, { level: number; caption: string }> = {
  weak: { level: 1, caption: 'Weak — add more characters.' },
  fair: { level: 2, caption: 'Fair — mix in numbers and symbols.' },
  strong: { level: 4, caption: 'Strong password.' },
}

export interface PasswordStrengthProps extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  value?: string
  onValueChange?: (value: string) => void
  /** Show a level without typing (docs, previews). */
  strength?: Strength
  /** The field, so the meter sits under whatever Input the product uses. */
  children?: React.ReactNode
  width?: number | string
}

function PasswordStrength({ value, onValueChange, strength, children, width, className, ...props }: PasswordStrengthProps) {
  const [inner, setInner] = React.useState('')
  const pw = value ?? inner
  const scored = strength ? { ...FORCED[strength], strength } : scorePassword(pw)
  return (
    <div data-slot="password-strength" data-escala="PasswordStrength" data-strength={scored.strength} className={cn('flex flex-col', className)} style={{ width }} {...props}>
      {children ?? (
        <input
          type="password" value={pw} aria-label="Password" placeholder="Password"
          onChange={(e) => { setInner(e.target.value); onValueChange?.(e.target.value) }}
        />
      )}
      <div data-part="PasswordStrength.meter" className="flex" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} data-part={i < scored.level ? 'PasswordStrength.segmentOn' : 'PasswordStrength.segment'} className="flex-1" />
        ))}
      </div>
      <span data-part="PasswordStrength.caption" aria-live="polite">{scored.caption}</span>
    </div>
  )
}

export { PasswordStrength }
