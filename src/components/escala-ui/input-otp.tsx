// Skeleton: shadcn/ui `bases/radix/ui/input-otp.tsx` (MIT, see LICENSE-shadcn.md):
// the `input-otp` package — InputOTP · InputOTPGroup · InputOTPSlot ·
// InputOTPSeparator. Appearance: recipe (InputOTP); a slot reads
// `data-active`, the wrapper carries `aria-invalid`.
import * as React from 'react'
import { OTPInput, OTPInputContext } from 'input-otp'
import { cn } from '../../lib/utils'

type OTPProps = React.ComponentProps<typeof OTPInput> & { containerClassName?: string }

function InputOTP({ className, containerClassName, ...props }: OTPProps) {
  return (
    <div data-escala="InputOTP" aria-invalid={props['aria-invalid']} style={{ display: 'contents' }}>
      <OTPInput
        data-slot="input-otp"
        containerClassName={cn('flex items-center has-disabled:opacity-50', containerClassName)}
        spellCheck={false}
        className={cn('disabled:cursor-not-allowed', className)}
        {...props}
      />
    </div>
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="input-otp-group" data-part="InputOTP.group" className={cn('flex items-center', className)} {...props} />
}

function InputOTPSlot({ index, className, ...props }: React.ComponentProps<'div'> & { index: number }) {
  const ctx = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = ctx?.slots[index] ?? {}
  return (
    <div
      data-slot="input-otp-slot"
      data-part="InputOTP.slot"
      data-active={isActive ? 'true' : undefined}
      className={cn('relative flex items-center justify-center data-[active=true]:z-10', className)}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-pulse bg-current" />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator(props: React.ComponentProps<'div'>) {
  return (
    <div data-slot="input-otp-separator" role="separator" className="flex items-center" {...props}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M5 12h14" /></svg>
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot }
