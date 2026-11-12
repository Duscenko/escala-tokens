// Escala component: Input — the Figma `Input` set (design-plans/input-contract.md,
// 4:12380): the box with the text field inside it, `size` × `type` × State, as the
// file draws it. `type` is Figma's Type axis — default · phone · currency ·
// currency-select · password · url · upload · tag · copy-link · credit-card ·
// search — and each one composes its own parts in the file's order (a +01 select,
// a $ prefix, an https:// prefix and its divider, a Browse button, a Copy button,
// the ⌘ K shortcut…). Any other value is an HTML input type on the default layout.
// A label and a hint are `Field`'s. `Value` (placeholder · filled) needs no prop:
// the field already paints its placeholder differently from a typed value.
// Appearance: the Input recipe (lib/recipes/forms.ts → lib/recipeStyles.ts), which
// reads `data-size`, `data-type` and `data-force-state`. No colour here.
import * as React from 'react'
import { cn } from '../../lib/utils'

export const INPUT_TYPES = [
  'default', 'phone', 'currency', 'currency-select', 'password', 'url', 'upload', 'tag', 'copy-link', 'credit-card', 'search',
] as const
export const INPUT_SIZES = ['default', 'sm', 'lg'] as const
export type InputType = (typeof INPUT_TYPES)[number]
export type InputState = 'Default' | 'Hover' | 'Focused' | 'Invalid' | 'Disabled'
/** Escala's Size roles: compact 32 · control 40 · touch 48 (Button's ladder). */
export type InputSize = (typeof INPUT_SIZES)[number]

/** The options of a Type that opens with a select (the file shows the first). */
export const INPUT_ADDON_OPTIONS: Partial<Record<InputType, string[]>> = {
  phone: ['+01', '+44', '+33', '+34', '+49', '+52', '+55'],
  'currency-select': ['USD', 'EUR', 'GBP', 'JPY', 'MXN'],
}
/** A Type's fixed prefix text (the file's `addon` layer). */
const ADDON_TEXT: Partial<Record<InputType, string>> = { currency: '$', url: 'https://', tag: '@' }

// The native `size` attribute (a character count) gives way to the Size axis, and
// `type` is Figma's Type (an HTML type outside that list still works).
export interface InputProps extends Omit<React.ComponentProps<'input'>, 'size' | 'type'> {
  size?: InputSize
  type?: InputType | (string & {})
  /** Pin a state without a pointer (docs playground, Figma parity). */
  forceState?: InputState
  /** Leading icon (Figma IconLeadingVisible + IconLeadingIcon). Each Type brings its
   *  own (search, lock, folder); `null` hides it. */
  leading?: React.ReactNode
  /** Trailing icon (Figma IconTrailingVisible + IconTrailingIcon). `password` brings
   *  its show / hide toggle; `null` hides it. */
  trailing?: React.ReactNode
  /** The search shortcut (Figma ShortcutVisible + Shortcut): keys, one per `<kbd>`.
   *  Defaults to ⌘ K on `search`; `null` hides it. */
  shortcut?: string[] | null
  /** The prefix text or the select's value (+01, $, USD, https://, @). */
  addon?: string
  /** The select's choices on `phone` and `currency-select`. */
  addonOptions?: string[]
  onAddonChange?: (value: string) => void
  /** `upload`: the chosen files. */
  onFiles?: (files: FileList | null) => void
  /** `copy-link`: called after the value is copied. */
  onCopy?: () => void
  /** The accessible names of the parts that act (translatable). */
  labels?: Partial<Record<'addon' | 'browse' | 'copy' | 'show' | 'hide', string>>
}

/** Phosphor regular bodies, as the file's glyphs draw them. */
const GLYPHS = {
  search: 'M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z',
  eye: 'M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z',
  'eye-off': 'M53.92,34.62A8,8,0,1,0,42.08,45.38L61.32,66.55C25,88.84,9.38,123.2,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208a127.11,127.11,0,0,0,52.07-10.83l22,24.21a8,8,0,1,0,11.84-10.76Zm47.33,75.84,41.67,45.85a32,32,0,0,1-41.67-45.85ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.16,133.16,0,0,1,25,128c4.69-8.79,19.66-33.39,47.35-49.38l18,19.75a48,48,0,0,0,63.66,70l14.73,16.2A112,112,0,0,1,128,192Zm6-95.43a8,8,0,0,1,3-15.72,48.16,48.16,0,0,1,38.77,42.64,8,8,0,0,1-7.22,8.71,6.39,6.39,0,0,1-.75,0,8,8,0,0,1-8-7.26A32.09,32.09,0,0,0,134,96.57Zm113.28,34.69c-.42.94-10.55,23.37-33.36,43.8a8,8,0,1,1-10.67-11.92A132.77,132.77,0,0,0,231.05,128a133.15,133.15,0,0,0-23.12-30.77C185.67,75.19,158.78,64,128,64a118.37,118.37,0,0,0-19.36,1.57A8,8,0,1,1,106,49.79,134,134,0,0,1,128,48c34.88,0,66.57,13.26,91.66,38.35,18.83,18.83,27.3,37.62,27.65,38.41A8,8,0,0,1,247.31,131.26Z',
  lock: 'M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z',
  chevron: 'M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z',
  folder: 'M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM40,56H92.69l16,16H40ZM216,200H40V88H216Z',
  copy: 'M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z',
} as const

function Glyph({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false">
      <path d={d} />
    </svg>
  )
}

/** One icon slot: a glyph box sized by the recipe (`icon`, or `chevron` at 16). */
function Icon({ children, chevron }: { children: React.ReactNode; chevron?: boolean }) {
  return (
    <span
      data-part="Input.icon"
      data-icon={chevron ? 'chevron' : undefined}
      className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full"
    >
      {children}
    </span>
  )
}

const Divider = () => <span data-part="Input.divider" aria-hidden className="shrink-0 self-stretch" />
const Addon = ({ children }: { children: React.ReactNode }) => (
  <span data-part="Input.addon" className="shrink-0 whitespace-nowrap">{children}</span>
)

/** Each Type's own leading glyph, as the file draws it. */
const TYPE_LEADING: Partial<Record<InputType, keyof typeof GLYPHS>> = {
  password: 'lock', 'credit-card': 'lock', search: 'search', upload: 'folder',
}
/** The HTML side of each Type: the native type, the keyboard and the autofill hint. */
const TYPE_FIELD: Record<InputType, { type: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; autoComplete?: string }> = {
  default: { type: 'text' },
  phone: { type: 'tel', inputMode: 'tel', autoComplete: 'tel-national' },
  currency: { type: 'text', inputMode: 'decimal' },
  'currency-select': { type: 'text', inputMode: 'decimal' },
  password: { type: 'password', autoComplete: 'current-password' },
  url: { type: 'text', inputMode: 'url', autoComplete: 'url' },
  upload: { type: 'text' },
  tag: { type: 'text', autoComplete: 'username' },
  'copy-link': { type: 'text' },
  'credit-card': { type: 'text', inputMode: 'numeric', autoComplete: 'cc-number' },
  search: { type: 'search' },
}

const isFigmaType = (t: string | undefined): t is InputType => !!t && (INPUT_TYPES as readonly string[]).includes(t)

function Input({
  className,
  style,
  type,
  size = 'default',
  forceState,
  disabled,
  leading,
  trailing,
  shortcut,
  addon,
  addonOptions,
  onAddonChange,
  onFiles,
  onCopy,
  labels,
  ref,
  ...rest
}: InputProps) {
  const props = rest
  const kind: InputType = isFigmaType(type) ? type : 'default'
  const field = TYPE_FIELD[kind]
  const isDisabled = disabled || forceState === 'Disabled'
  const invalid = forceState === 'Invalid' || props['aria-invalid'] === true || props['aria-invalid'] === 'true'
  // A live disabled or invalid field pins its look (the root carries no aria state).
  const pinned = forceState && forceState !== 'Default' ? forceState : isDisabled ? 'Disabled' : invalid ? 'Invalid' : undefined

  const [shown, setShown] = React.useState(false)
  const options = addonOptions ?? INPUT_ADDON_OPTIONS[kind]
  const [choice, setChoice] = React.useState(addon ?? options?.[0] ?? '')
  const chosen = addon ?? choice
  const [fileName, setFileName] = React.useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)
  const textRef = React.useRef<HTMLInputElement>(null)
  // The caller's ref reaches the <input> too (React 19 passes `ref` as a prop).
  React.useImperativeHandle(ref, () => textRef.current as HTMLInputElement, [])

  const leadingGlyph = leading === undefined && TYPE_LEADING[kind] ? <Glyph d={GLYPHS[TYPE_LEADING[kind]!]} /> : leading
  const keys = shortcut === undefined ? (kind === 'search' ? ['⌘', 'K'] : null) : shortcut

  const text = (
    <input
      ref={textRef}
      data-part="Input.text"
      type={kind === 'password' ? (shown ? 'text' : 'password') : isFigmaType(type) ? field.type : (type ?? 'text')}
      inputMode={field.inputMode}
      autoComplete={field.autoComplete}
      disabled={isDisabled}
      aria-invalid={invalid || undefined}
      className="m-0 h-full min-w-0 flex-1 self-stretch border-0 bg-transparent p-0 outline-none [font:inherit] [color:inherit] disabled:cursor-not-allowed"
      {...rest}
      {...(kind === 'upload'
        ? { value: fileName, defaultValue: undefined, onChange: undefined, readOnly: true, placeholder: rest.placeholder ?? 'No file chosen' }
        : {})}
    />
  )

  // A select addon: the visible +01 / USD and its caret, with the native select laid
  // over them so the choice is a real, keyboard-reachable control.
  const select = options && (
    <span className="relative inline-flex shrink-0 items-center gap-[var(--spacing-gap-control)]">
      <Addon>{chosen}</Addon>
      <Icon chevron><Glyph d={GLYPHS.chevron} /></Icon>
      <select
        aria-label={labels?.addon ?? (kind === 'phone' ? 'Country code' : 'Currency')}
        value={chosen}
        disabled={isDisabled}
        onChange={(e) => { setChoice(e.target.value); onAddonChange?.(e.target.value) }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </span>
  )

  const iconButton = 'inline-flex shrink-0 cursor-pointer items-center gap-[var(--spacing-gap-control)] rounded-[inherit] border-0 bg-transparent p-0 [color:inherit] [font:inherit] outline-none disabled:cursor-not-allowed'

  let parts: React.ReactNode
  switch (kind) {
    case 'phone':
      parts = <>{select}{text}</>
      break
    case 'currency-select':
      parts = <>{select}<Divider />{text}</>
      break
    case 'currency':
    case 'url':
    case 'tag':
      parts = <><Addon>{addon ?? ADDON_TEXT[kind]}</Addon>{kind === 'url' && <Divider />}{text}</>
      break
    case 'upload':
      parts = (
        <>
          <button type="button" className={iconButton} disabled={isDisabled} onClick={() => fileRef.current?.click()}>
            {leadingGlyph != null && <Icon>{leadingGlyph}</Icon>}
            <Addon>{labels?.browse ?? 'Browse'}</Addon>
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            tabIndex={-1}
            onChange={(e) => {
              const files = e.target.files
              setFileName(files && files.length ? Array.from(files).map((f) => f.name).join(', ') : '')
              onFiles?.(files)
            }}
          />
          <Divider />
          {text}
        </>
      )
      break
    case 'copy-link':
      parts = (
        <>
          {text}
          <Divider />
          <button
            type="button"
            className={iconButton}
            disabled={isDisabled}
            onClick={async () => {
              const value = textRef.current?.value ?? ''
              try { await navigator.clipboard.writeText(value) } catch { /* the clipboard may be blocked */ }
              onCopy?.()
            }}
          >
            {trailing !== null && <Icon>{trailing ?? <Glyph d={GLYPHS.copy} />}</Icon>}
            <Addon>{labels?.copy ?? 'Copy'}</Addon>
          </button>
        </>
      )
      break
    case 'password':
      parts = (
        <>
          {leadingGlyph != null && <Icon>{leadingGlyph}</Icon>}
          {text}
          {trailing !== null && (
            trailing !== undefined ? <Icon>{trailing}</Icon> : (
              <button
                type="button"
                className={iconButton}
                disabled={isDisabled}
                aria-pressed={shown}
                aria-label={shown ? (labels?.hide ?? 'Hide password') : (labels?.show ?? 'Show password')}
                onClick={() => setShown((s) => !s)}
              >
                <Icon><Glyph d={shown ? GLYPHS['eye-off'] : GLYPHS.eye} /></Icon>
              </button>
            )
          )}
        </>
      )
      break
    default:
      parts = (
        <>
          {leadingGlyph != null && <Icon>{leadingGlyph}</Icon>}
          {text}
          {trailing != null && <Icon>{trailing}</Icon>}
          {keys && keys.length > 0 && !isDisabled && (
            <span className="inline-flex shrink-0 items-center gap-[var(--spacing-gap-tight)]" aria-hidden>
              {keys.map((k, i) => (
                <kbd key={i} data-part="Input.kbd" className="inline-flex items-center justify-center whitespace-nowrap">{k}</kbd>
              ))}
            </span>
          )}
        </>
      )
  }

  return (
    <div
      data-slot="input"
      data-escala="Input"
      data-size={size}
      data-type={kind}
      data-force-state={pinned}
      className={cn('flex w-full min-w-0 items-center', isDisabled && 'cursor-not-allowed', className)}
      style={style}
      onPointerDown={(e) => {
        // A click on the box (not a control in it) puts the caret in the field.
        if (e.target === e.currentTarget) { e.preventDefault(); textRef.current?.focus() }
      }}
    >
      {parts}
    </div>
  )
}

export { Input }
