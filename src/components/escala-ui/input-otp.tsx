// Escala component on the shadcn Input skeleton (shadcn's InputOTP wraps the
// `input-otp` package; this keeps the same anatomy without the dependency):
// one hidden text control, N visual cells. Appearance: its recipe (InputOTP).
import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputOTPProps extends Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue'> {
  length?: number
  size?: 'md' | 'sm' | 'lg'
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onComplete?: (value: string) => void
  invalid?: boolean
}

function InputOTP({
  length = 6, size = 'md', value, defaultValue = '', onValueChange, onComplete, invalid, className, ...props
}: InputOTPProps) {
  const [inner, setInner] = React.useState(defaultValue)
  const code = value ?? inner
  const [focus, setFocus] = React.useState(false)
  const ref = React.useRef<HTMLInputElement>(null)
  const caret = Math.min(code.length, length - 1)
  return (
    <div
      data-slot="input-otp"
      data-escala="InputOTP"
      data-size={size.toUpperCase()}
      aria-invalid={invalid || undefined}
      onClick={() => ref.current?.focus()}
      className={cn('relative inline-flex cursor-text', className)}
      {...props}
    >
      <input
        ref={ref}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        value={code}
        aria-label="Verification code"
        className="absolute inset-0 cursor-text border-0 p-0 opacity-0"
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, '').slice(0, length)
          setInner(next); onValueChange?.(next)
          if (next.length === length) onComplete?.(next)
        }}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
      />
      {Array.from({ length }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          data-part="InputOTP.cell"
          data-active={focus && i === caret ? 'true' : undefined}
          className="inline-flex items-center justify-center transition-[border-color,box-shadow] duration-150"
        >
          {code[i] ?? ''}
        </span>
      ))}
    </div>
  )
}

export { InputOTP }
