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
import { glyph } from '../../lib/icons'

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
  search: 'search',
  eye: 'eye',
  'eye-off': 'eye-slash',
  lock: 'lock',
  chevron: 'chevron-down',
  folder: 'folder',
  copy: 'copy',
} as const

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

  const leadingGlyph = leading === undefined && TYPE_LEADING[kind] ? glyph(GLYPHS[TYPE_LEADING[kind]!]) : leading
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
      <Icon chevron>{glyph(GLYPHS.chevron)}</Icon>
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
            {trailing !== null && <Icon>{trailing ?? glyph(GLYPHS.copy)}</Icon>}
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
                <Icon>{glyph(shown ? GLYPHS['eye-off'] : GLYPHS.eye)}</Icon>
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
