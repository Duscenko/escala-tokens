// Escala components: InputOTP · InputOTPSlot — the Figma `InputOTP` page
// (design-plans/input-otp-contract.md): InputOTP (416:994: `size` sm · default · lg,
// `length` 4 · 6 · 8, State Empty · Typing · Filled · Invalid · Disabled, `variant`
// outline · filled · underline) is a row of InputOTPSlot (416:108: Size × State
// Default · Filled · Typing · Focused · Invalid · Disabled × Variant, Digit), with a
// separator between the halves of a 6- or 8-digit code. Behaviour: the `input-otp`
// package (one hidden input, paste fills every slot, digits only by default). A slot
// takes its state from it — Filled with a digit, Typing (the caret) when it is the
// active empty one, Focused when active with a digit — or from `aria-invalid` /
// `disabled` on InputOTP. `forceState` pins one for docs. Paint: the InputOTP and
// InputOTPSlot recipes.
import * as React from 'react'
import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from 'input-otp'
import { cn } from '../../lib/utils'

export const INPUT_OTP_SIZES = ['sm', 'default', 'lg'] as const
export const INPUT_OTP_LENGTHS = [4, 6, 8] as const
export const INPUT_OTP_VARIANTS = ['outline', 'filled', 'underline'] as const
export type InputOTPSize = (typeof INPUT_OTP_SIZES)[number]
export type InputOTPLength = (typeof INPUT_OTP_LENGTHS)[number]
export type InputOTPVariant = (typeof INPUT_OTP_VARIANTS)[number]
export type InputOTPState = 'Empty' | 'Typing' | 'Filled' | 'Invalid' | 'Disabled'
export type InputOTPSlotState = 'Default' | 'Filled' | 'Typing' | 'Focused' | 'Invalid' | 'Disabled'

/** The digits the file's variants show (its slots read 4 8 2 9 1 7 3 5). */
const FILE_CODE = '48291735'

interface OTPLook { size: InputOTPSize; variant: InputOTPVariant; invalid: boolean; disabled: boolean }
const LookContext = React.createContext<OTPLook>({ size: 'default', variant: 'outline', invalid: false, disabled: false })

type OTPBaseProps = Omit<React.ComponentProps<typeof OTPInput>, 'maxLength' | 'render' | 'children' | 'size'>

export interface InputOTPProps extends Partial<OTPBaseProps> {
  size?: InputOTPSize
  variant?: InputOTPVariant
  /** Figma Length: the number of slots (= maxLength). */
  length?: InputOTPLength | number
  /** shadcn's name for `length`; `length` wins. */
  maxLength?: number
  /** Pin a state for docs: the slots are drawn as the file draws that variant
   *  (Typing: the first half filled, the caret in the next slot). Not interactive. */
  forceState?: InputOTPState
  /** shadcn composition (InputOTPGroup · InputOTPSlot · InputOTPSeparator). Omit
   *  to draw the file's layout: `length` slots, a separator between the halves of 6 and 8. */
  children?: React.ReactNode
  containerClassName?: string
}

/** The separator the file draws between the halves of a 6- or 8-digit code. */
function InputOTPSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-otp-separator"
      data-part="InputOTP.separator"
      role="separator"
      className={cn('shrink-0', className)}
      {...props}
    />
  )
}

/** The file's layout: `length` slots, the separator after the first half (6 and 8). */
function fileLayout(length: number, slot: (i: number) => React.ReactNode) {
  const out: React.ReactNode[] = []
  for (let i = 0; i < length; i++) {
    if (length > 4 && i === length / 2) out.push(<InputOTPSeparator key="separator" />)
    out.push(slot(i))
  }
  return out
}

/** A slot's state in the file's pinned InputOTP variants. */
function pinnedSlotState(state: InputOTPState, i: number, length: number): InputOTPSlotState {
  if (state === 'Empty') return 'Default'
  if (state === 'Filled') return 'Filled'
  if (state === 'Invalid') return 'Invalid'
  if (state === 'Disabled') return 'Disabled'
  const half = Math.floor(length / 2)
  return i < half ? 'Filled' : i === half ? 'Typing' : 'Default'
}

function InputOTP({
  size = 'default', variant = 'outline', length, maxLength, forceState, children, className, containerClassName, disabled, ...props
}: InputOTPProps) {
  const n = length ?? maxLength ?? 6
  const invalid = forceState === 'Invalid' || props['aria-invalid'] === true || props['aria-invalid'] === 'true'
  const isDisabled = !!disabled || forceState === 'Disabled'
  const look: OTPLook = { size, variant, invalid, disabled: isDisabled }
  const root = {
    'data-size': size,
    'data-variant': variant,
    'data-length': String(n),
    'data-force-state': forceState && forceState !== 'Empty' ? forceState : isDisabled ? 'Disabled' : invalid ? 'Invalid' : undefined,
  }

  if (forceState) {
    // Docs: the file's variant, drawn statically (no input behind it).
    return (
      <LookContext.Provider value={look}>
        <div data-escala="InputOTP" {...root} data-slot="input-otp" role="group" aria-label={props['aria-label']} className={cn('inline-flex items-center', className)}>
          {fileLayout(n, (i) => {
            const state = pinnedSlotState(forceState, i, n)
            return <InputOTPSlot key={i} forceState={state} digit={state === 'Filled' || state === 'Invalid' || state === 'Disabled' ? FILE_CODE[i % FILE_CODE.length] : undefined} />
          })}
        </div>
      </LookContext.Provider>
    )
  }

  return (
    <LookContext.Provider value={look}>
      <div data-escala="InputOTP" {...root} className="inline-flex">
        <OTPInput
          data-slot="input-otp"
          maxLength={n}
          containerClassName={cn('flex items-center [gap:inherit]', containerClassName)}
          spellCheck={false}
          // A one-time code is digits: the numeric keypad alone did not stop a
          // physical keyboard typing "a" and "b" (audit 2026-11-05). A product
          // with alphanumeric codes passes its own `pattern`.
          pattern={REGEXP_ONLY_DIGITS}
          disabled={isDisabled}
          className={cn('disabled:cursor-not-allowed', className)}
          {...(props as OTPBaseProps)}
        >
          {children ?? fileLayout(n, (i) => <InputOTPSlot key={i} index={i} />)}
        </OTPInput>
      </div>
    </LookContext.Provider>
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="input-otp-group" data-part="InputOTP.group" className={cn('flex items-center', className)} {...props} />
}

export interface InputOTPSlotProps extends React.ComponentProps<'div'> {
  /** The slot's position inside InputOTP (reads the code and the caret from it). */
  index?: number
  /** Standalone (outside InputOTP) or for docs: the slot's look. Inside InputOTP the
   *  size and variant come from it. */
  size?: InputOTPSize
  variant?: InputOTPVariant
  /** Pin a state (docs, Storybook, Figma parity). */
  forceState?: InputOTPSlotState
  /** Figma Digit: the character shown when the slot is not driven by InputOTP. */
  digit?: string
}

function InputOTPSlot({ index, size, variant, forceState, digit, className, ...props }: InputOTPSlotProps) {
  const look = React.useContext(LookContext)
  const ctx = React.useContext(OTPInputContext)
  const live = index != null && ctx ? ctx.slots[index] : undefined
  const char = live ? live.char : digit
  let state: InputOTPSlotState
  if (forceState) state = forceState
  else if (look.disabled) state = 'Disabled'
  else if (look.invalid) state = 'Invalid'
  else if (live?.isActive) state = char ? 'Focused' : 'Typing'
  else state = char ? 'Filled' : 'Default'
  const showDigit = state === 'Typing' || state === 'Default' ? undefined : char
  return (
    <div
      data-slot="input-otp-slot"
      data-escala="InputOTPSlot"
      data-size={size ?? look.size}
      data-variant={variant ?? look.variant}
      data-force-state={state === 'Default' ? undefined : state}
      data-active={live?.isActive ? 'true' : undefined}
      className={cn('relative flex shrink-0 items-center justify-center data-[active=true]:z-10', className)}
      {...props}
    >
      {showDigit ? <span data-part="InputOTPSlot.digit">{showDigit}</span> : null}
      {state === 'Typing' ? (
        <span data-part="InputOTPSlot.caret" aria-hidden className={cn('block', !forceState && 'animate-pulse motion-reduce:animate-none')} />
      ) : null}
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot }
