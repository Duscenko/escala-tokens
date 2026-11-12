import { useId, useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { ICON_SLOTS, INPUT_HTML_TYPE, INPUT_META, PhosphorWeightProvider, PreviewIcon, inputSeed } from '../specimens'
import { iconForControl, iconOf, selectorRoleOf, sizeRoleOf } from '../../../../lib/previewTokens'
import { useI18n } from '../../../../lib/i18n'
import { useAutoplayStep } from '../../../preview/artefacts/boardAutoplay'
import { EDITORS_PLAY, EMAIL_PLAY, TAGS_PLAY, UPLOAD_PLAY } from '../../../preview/artefacts/boardScripts'
import { Input as SkInput, INPUT_TYPES, type InputSize, type InputState, type InputType } from '../../../escala-ui/input'
import { Textarea as SkTextarea, type TextareaSize, type TextareaState } from '../../../escala-ui/textarea'
import { DatePickerTrigger as SkDatePickerTrigger, type DatePickerTriggerSize, type DatePickerTriggerState } from '../../../escala-ui/date-picker'
import { InputGroup as SkInputGroup, InputGroupAddon as SkAddon, InputGroupInput as SkGroupInput, InputGroupText as SkGroupText, InputGroupButton as SkGroupButton, InputGroupSeparator as SkGroupSeparator } from '../../../escala-ui/input-group'
import { NumberInput as SkNumberInput, type NumberInputSize, type NumberInputState } from '../../../escala-ui/number-input'
import { InputTag as SkInputTag, InputTagChip as SkInputTagChip, InputTagOption as SkInputTagOption, type InputTagChipSize, type InputTagChipState, type InputTagChipVariant, type InputTagLayout, type InputTagOptionState, type InputTagOptionType, type InputTagSize, type InputTagState } from '../../../escala-ui/input-tag'
import { Select as SkSelect, SelectContent as SkSelectContent, SelectItem as SkSelectItem, SelectTrigger as SkSelectTrigger, SelectValue as SkSelectValue } from '../../../escala-ui/select'
import { Combobox as SkCombobox, ComboboxGroup as SkComboboxGroup, ComboboxGroupLabel as SkComboboxGroupLabel, ComboboxItem as SkComboboxItem, ComboboxPopover as SkComboboxPopover, ComboboxSeparator as SkComboboxSeparator, type ComboboxItemState, type ComboboxPopoverContent, type ComboboxShape, type ComboboxSize, type ComboboxState, type ComboboxVariant } from '../../../escala-ui/combobox'
import { InputOTP as SkInputOTP, InputOTPSlot as SkInputOTPSlot, type InputOTPLength, type InputOTPSize, type InputOTPSlotState, type InputOTPState, type InputOTPVariant } from '../../../escala-ui/input-otp'
import { Checkbox as SkCheckbox } from '../../../escala-ui/checkbox'
import { RadioGroup as SkRadioGroup, RadioGroupItem as SkRadioGroupItem } from '../../../escala-ui/radio-group'
import { Switch as SkSwitch, type SwitchSize } from '../../../escala-ui/switch'
import { Slider as SkSlider } from '../../../escala-ui/slider'
import { Label as SkLabel } from '../../../escala-ui/label'
import {
  Field as SkField, FieldContent as SkFieldContent, FieldDescription as SkFieldDescription, FieldGroup as SkFieldGroup,
  FieldLabel as SkFieldLabel, FieldLegend as SkFieldLegend, FieldSet as SkFieldSet, type FieldSize, type FieldState,
} from '../../../escala-ui/field'
import { PasswordStrength as SkPasswordStrength, PasswordStrengthMeter as SkPasswordStrengthMeter, PasswordStrengthRule as SkPasswordStrengthRule, type PasswordStrengthSize, type Strength } from '../../../escala-ui/password-strength'
import { Dropzone as SkDropzone, FileUpload as SkFileUpload, FileUploadFile as SkFileUploadFile } from '../../../escala-ui/file-upload'
import { Button as SkButton } from '../../../escala-ui/button'
import { TextLink as SkTextLink } from '../../../escala-ui/text-link'
import { RecipeScope } from './scope'
import { NativeSelect as SkNativeSelect, NativeSelectOption as SkNativeSelectOption, type NativeSelectSize } from '../../../escala-ui/native-select'

/**
 * shadcn's Input. On its own page the bare control; given `v.Type` (an opt-in
 * key, not a catalogue axis) it is composed the way shadcn composes a form
 * row — Field · FieldLabel · Input · FieldDescription — so a screen can show
 * an e-mail or password field without a second input component.
 */
/** The Figma file's own copy per Type (placeholder · filled). */
const FIGMA_INPUT_COPY: Record<InputType, [string, string]> = {
  default: ['Jane Doe', 'Jane Doe'], phone: ['Mobile number', '612 555 0199'], currency: ['0.00', '1,250.00'],
  'currency-select': ['0.00', '1,250.00'], password: ['Your password', 'escala-secret'], url: ['yourcompany.com', 'escala.design'],
  upload: ['No file chosen', ''], tag: ['username', 'maria.farerro'], 'copy-link': ['Invite link', 'escala.ds/join/4f2a'],
  'credit-card': ['16-digit card number', '4242 4242 4242 4242'], search: ['Jane Doe', 'Jane Doe'],
}

/** The catalogue's own axes (the Figma set): Size · State · Type · Value, bare. */
function FigmaInputSpecimen({ t, v, w }: SpecimenProps) {
  const type = v.Type as InputType
  const [placeholder, filled] = FIGMA_INPUT_COPY[type]
  const state = (v.State ?? 'Default') as InputState
  return (
    <RecipeScope t={t}>
      <SkInput
        key={`${type}-${v.Value}`}
        type={type}
        size={(v.Size ?? 'default') as InputSize}
        forceState={state}
        disabled={state === 'Disabled'}
        placeholder={placeholder}
        defaultValue={v.Value === 'filled' ? filled : undefined}
        aria-label={placeholder}
        style={{ width: w ?? 260 }}
      />
    </RecipeScope>
  )
}

export function SkeletonInputSpecimen(props: SpecimenProps) {
  if (props.v.Type && (INPUT_TYPES as readonly string[]).includes(props.v.Type)) return <FigmaInputSpecimen {...props} />
  return <BoardInputSpecimen {...props} />
}

/** The board's named fields (E-Mail, Password, Website…) composed with Field. */
function BoardInputSpecimen({ t, v, w, hideHint, icons }: SpecimenProps) {
  const { t: translate } = useI18n()
  const meta = INPUT_META[v.Type ?? 'Default'] ?? INPUT_META.Default
  const [value, setValue] = useState(() => inputSeed(v.Type, v.State))
  // On the playing board a filled e-mail types itself, focused, a key at a time.
  const typing = useAutoplayStep(EMAIL_PLAY.steps, EMAIL_PLAY.ms)
  const playsEmail = typing != null && v.Type === 'E-Mail' && v.State === 'Filled'
  const shown = playsEmail ? inputSeed(v.Type, v.State).slice(0, Math.max(0, typing - EMAIL_PLAY.typeFrom + 1)) : value
  const state = playsEmail && typing < EMAIL_PLAY.focusUntil ? 'Focused'
    : v.State === 'Filled' ? undefined : (v.State as 'Default' | undefined)
  const input = (
    <SkInput
      forceState={state}
      type={INPUT_HTML_TYPE[v.Type ?? 'Default'] ?? 'text'}
      placeholder={meta.placeholder}
      value={shown}
      onChange={(e) => setValue(e.target.value)}
      autoComplete="off"
      spellCheck={false}
      aria-label={v.Type ? undefined : translate(meta.label)}
      style={v.Type ? undefined : { width: w ?? 260 }}
    />
  )
  // shadcn composes icons as InputGroup > InputGroupInput + InputGroupAddon.
  const slots = ICON_SLOTS.Input
  const iconPx = iconForControl(sizeRoleOf(t, 'control'), t)
  const withIcons = Boolean(icons?.leading || icons?.trailing)
  const control = withIcons ? (
    <SkInputGroup forceState={state} style={{ width: w ?? 260 }}>
      <SkGroupInput
        type={INPUT_HTML_TYPE[v.Type ?? 'Default'] ?? 'text'}
        placeholder={meta.placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        aria-label={translate(meta.label)}
        aria-invalid={v.State === 'Invalid' || undefined}
        disabled={v.State === 'Disabled'}
      />
      {icons?.leading && (
        <SkAddon align="inline-start">
          <PreviewIcon prefix={icons.prefix} concept={slots.leading} size={iconPx} />
        </SkAddon>
      )}
      {icons?.trailing && (
        <SkAddon align="inline-end">
          <PreviewIcon prefix={icons.prefix} concept={slots.trailing} size={iconPx} />
        </SkAddon>
      )}
    </SkInputGroup>
  ) : input
  if (!v.Type) return <RecipeScope t={t}>{control}</RecipeScope>
  return (
    <RecipeScope t={t}>
      <SkField style={{ width: w ?? 260 }}>
        <SkFieldLabel>{translate(meta.label)}</SkFieldLabel>
        {input}
        {!hideHint && <SkFieldDescription>{translate(v.State === 'Invalid' ? 'This field is required.' : 'This is a hint text.')}</SkFieldDescription>}
      </SkField>
    </RecipeScope>
  )
}

/** The Figma Textarea: Size × State × Value, the file's own copy. */
const TEXTAREA_COPY = {
  placeholder: 'Write a message…',
  filled: 'Tell us about the project: goals, timeline and any constraints we should know about before the kickoff.',
}
export function SkeletonTextareaSpecimen({ t, v, w }: SpecimenProps) {
  const state = (v.State ?? 'Default') as TextareaState
  const filled = v.Value === 'filled'
  return (
    <RecipeScope t={t}>
      <SkTextarea
        aria-label="Message"
        size={(v.Size ?? 'default') as TextareaSize}
        forceState={state === 'Default' ? undefined : state}
        placeholder={TEXTAREA_COPY.placeholder}
        // Keyed on Value so the docs control swaps between empty and filled.
        key={filled ? 'filled' : 'empty'}
        defaultValue={filled ? TEXTAREA_COPY.filled : undefined}
        style={{ width: w ?? 360 }}
      />
    </RecipeScope>
  )
}

/** The Figma DatePickerTrigger: Size × State × Value, the file's own copy. */
export function SkeletonDatePickerTriggerSpecimen({ t, v, w }: SpecimenProps) {
  const state = (v.State ?? 'Default') as DatePickerTriggerState
  return (
    <RecipeScope t={t}>
      <SkDatePickerTrigger
        size={(v.Size ?? 'default') as DatePickerTriggerSize}
        forceState={state === 'Default' ? undefined : state}
        valueText={v.Value === 'filled' ? 'Nov 12, 2026' : undefined}
        style={{ width: w ?? 280 }}
      />
    </RecipeScope>
  )
}

export function SkeletonInputGroupSpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkInputGroup style={{ width: w ?? 300 }}>
        <SkAddon><SkGroupText>https://</SkGroupText></SkAddon>
        <SkGroupSeparator />
        <SkGroupInput defaultValue="escala.design" aria-label="Domain" />
        <SkGroupSeparator />
        <SkGroupButton>Copy</SkGroupButton>
      </SkInputGroup>
    </RecipeScope>
  )
}

export function SkeletonNumberInputSpecimen({ t, v }: SpecimenProps) {
  // The board steps the count up and back (the Editors tile's total follows).
  const step = useAutoplayStep(EDITORS_PLAY.values.length, EDITORS_PLAY.ms)
  const state = (v.State ?? 'Default') as NumberInputState
  return (
    <RecipeScope t={t}>
      <SkNumberInput
        aria-label="Quantity"
        size={(v.Size ?? 'default') as NumberInputSize}
        forceState={state === 'Default' ? undefined : state}
        defaultValue={12}
        value={step == null ? undefined : EDITORS_PLAY.values[step]}
        min={0}
        max={99}
      />
    </RecipeScope>
  )
}

/** The Figma InputTag: Layout × Size × State × Value. On the board (no axis pinned) it is
 *  live: the field adds a third tag, holds it, takes it away. */
export function SkeletonInputTagSpecimen({ t, v, w }: SpecimenProps) {
  const step = useAutoplayStep(TAGS_PLAY.values.length, TAGS_PLAY.ms)
  const pinned = Object.keys(v).length > 0
  const state = (v.State ?? 'Default') as InputTagState
  return (
    <RecipeScope t={t}>
      <SkInputTag
        key={`${v.Layout}-${v.Value}`}
        layout={(v.Layout ?? 'inline') as InputTagLayout}
        size={(v.Size ?? 'default') as InputTagSize}
        forceState={state === 'Default' ? undefined : state}
        defaultValue={pinned ? (v.Value === 'filled' ? ['Design', 'Research'] : []) : ['tokens', 'figma']}
        value={pinned || step == null ? undefined : [...TAGS_PLAY.values[step]]}
        width={w ?? (pinned ? 360 : 300)}
      />
    </RecipeScope>
  )
}

export function SkeletonInputTagChipSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkInputTagChip
        size={(v.Size ?? 'default') as InputTagChipSize}
        variant={(v.Variant ?? 'default') as InputTagChipVariant}
        forceState={(v.State === 'Default' ? undefined : v.State) as InputTagChipState | undefined}
      >
        Design
      </SkInputTagChip>
    </RecipeScope>
  )
}

export function SkeletonInputTagOptionSpecimen({ t, v }: SpecimenProps) {
  const type = (v.Type ?? 'option') as InputTagOptionType
  return (
    <RecipeScope t={t}>
      <div style={{ width: 240 }}>
        <SkInputTagOption type={type} meta="12" forceState={(v.State === 'Default' ? undefined : v.State) as InputTagOptionState | undefined}>
          {type === 'create' ? 'Create “Design”' : 'Design'}
        </SkInputTagOption>
      </div>
    </RecipeScope>
  )
}

export function SkeletonSelectSpecimen({ t, v, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkSelect>
        <SkSelectTrigger
          size={(v.Size ?? 'default') as 'default'}
          forceState={(v.State ?? 'Default') as 'Default'}
          icon={<PreviewIcon concept="chevron" size={iconOf(12)} />}
          style={{ width: w ?? 240 }}
        >
          <SkSelectValue placeholder="Select an option" />
        </SkSelectTrigger>
        <SkSelectContent>
          <SkSelectItem value="design">Design</SkSelectItem>
          <SkSelectItem value="engineering">Engineering</SkSelectItem>
          <SkSelectItem value="product">Product</SkSelectItem>
        </SkSelectContent>
      </SkSelect>
    </RecipeScope>
  )
}


/** The file's sample list (the ComboboxPopover list variant). */
const FRAMEWORKS = [
  { label: 'Next.js', value: 'next' },
  { label: 'Remix', value: 'remix' },
  { label: 'Astro', value: 'astro' },
  { label: 'SvelteKit', value: 'sveltekit', disabled: true },
]

/** The Figma Combobox: Size × State × Variant × Shape × Value. Open draws the list. */
export function SkeletonComboboxSpecimen({ t, v, w }: SpecimenProps) {
  const state = (v.State ?? 'Default') as ComboboxState
  const variant = (v.Variant ?? 'default') as ComboboxVariant
  return (
    <RecipeScope t={t}>
      <SkCombobox
        key={`${v.Value}-${state}`}
        aria-label="Framework"
        options={FRAMEWORKS}
        size={(v.Size ?? 'default') as ComboboxSize}
        variant={variant}
        shape={(v.Shape ?? 'rounded') as ComboboxShape}
        forceState={state === 'Default' ? undefined : state}
        defaultValue={v.Value === 'filled' || state === 'Open' ? 'next' : undefined}
        width={variant === 'compact' ? undefined : w ?? 280}
      />
    </RecipeScope>
  )
}

/** The Figma ComboboxPopover: Content × Size, with the file's sample rows. */
export function SkeletonComboboxPopoverSpecimen({ t, v, w }: SpecimenProps) {
  const size = (v.Size ?? 'default') as ComboboxSize
  const content = (v.Content ?? 'list') as ComboboxPopoverContent
  return (
    <RecipeScope t={t}>
      <SkComboboxPopover size={size} content={content} width={w ?? 280}>
        {content === 'grouped' ? (
          <>
            <SkComboboxGroup label="Suggested" size={size}>
              <SkComboboxItem size={size} forceState="Selected" description="React framework" trailing="⌘1">Next.js</SkComboboxItem>
              <SkComboboxItem size={size} forceState="Focused" description="Full-stack web framework" trailing="⌘2">Remix</SkComboboxItem>
            </SkComboboxGroup>
            <SkComboboxSeparator />
            <SkComboboxGroup label="All frameworks" size={size}>
              <SkComboboxItem size={size}>Astro</SkComboboxItem>
              <SkComboboxItem size={size} forceState="Disabled">SvelteKit</SkComboboxItem>
            </SkComboboxGroup>
          </>
        ) : (
          <>
            <SkComboboxItem size={size} forceState="Selected">Next.js</SkComboboxItem>
            <SkComboboxItem size={size} forceState="Focused">Remix</SkComboboxItem>
            <SkComboboxItem size={size}>Astro</SkComboboxItem>
            <SkComboboxItem size={size} forceState="Disabled">SvelteKit</SkComboboxItem>
          </>
        )}
      </SkComboboxPopover>
    </RecipeScope>
  )
}

export function SkeletonComboboxItemSpecimen({ t, v, w }: SpecimenProps) {
  const state = (v.State ?? 'Default') as ComboboxItemState
  return (
    <RecipeScope t={t}>
      <div role="listbox" aria-label="Options" style={{ width: w ?? 256 }}>
        <SkComboboxItem size={(v.Size ?? 'default') as ComboboxSize} forceState={state === 'Default' ? undefined : state}>Option</SkComboboxItem>
      </div>
    </RecipeScope>
  )
}

export function SkeletonComboboxGroupLabelSpecimen({ t, v, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div style={{ width: w ?? 256 }}>
        <SkComboboxGroupLabel size={(v.Size ?? 'default') as ComboboxSize}>Group</SkComboboxGroupLabel>
      </div>
    </RecipeScope>
  )
}

const OTP_CODE = '824913'

/** The Figma InputOTP: Size × Length × State × Variant. Live on the board (the code
 *  types itself a digit at a time); a pinned State draws the file's variant. */
export function SkeletonInputOTPSpecimen({ t, v }: SpecimenProps) {
  const length = Number(v.Length ?? 6) as InputOTPLength
  const state = (v.State ?? 'Empty') as InputOTPState
  const size = (v.Size ?? 'default') as InputOTPSize
  const variant = (v.Variant ?? 'outline') as InputOTPVariant
  const [value, setValue] = useState('')
  // The board types the code a digit at a time, holds it, and clears.
  const typed = useAutoplayStep(10, 420)
  const live = state === 'Filled' && typed != null
  return (
    <RecipeScope t={t}>
      {live ? (
        <SkInputOTP aria-label="Verification code" size={size} variant={variant} length={length} value={OTP_CODE.slice(0, Math.min(length, typed))} onChange={setValue} />
      ) : state === 'Empty' && v.State === undefined ? (
        <SkInputOTP aria-label="Verification code" size={size} variant={variant} length={length} value={value} onChange={setValue} />
      ) : (
        <SkInputOTP aria-label="Verification code" size={size} variant={variant} length={length} forceState={state} />
      )}
    </RecipeScope>
  )
}

export function SkeletonInputOTPSlotSpecimen({ t, v }: SpecimenProps) {
  const state = (v.State ?? 'Default') as InputOTPSlotState
  return (
    <RecipeScope t={t}>
      <SkInputOTPSlot size={(v.Size ?? 'default') as InputOTPSize} variant={(v.Variant ?? 'outline') as InputOTPVariant} forceState={state} digit="7" />
    </RecipeScope>
  )
}

function checkGlyph(t: SpecimenProps['t']) {
  const px = parseFloat(selectorRoleOf(t, 'control', '18px')) || 18
  return (
    <PhosphorWeightProvider weight="bold">
      <PreviewIcon concept="check" size={Math.round(px * 0.72)} />
    </PhosphorWeightProvider>
  )
}

/** shadcn's docs example: the checkbox in a horizontal Field with its label. */
export function SkeletonCheckboxSpecimen({ t, v }: SpecimenProps) {
  const { t: translate } = useI18n()
  const id = useId()
  return (
    <RecipeScope t={t}>
      <SkField orientation="horizontal" style={{ width: 'auto' }}>
        <SkCheckbox
          id={id}
          key={`${v.Checked}`}
          defaultChecked={(v.Checked ?? 'True') === 'True'}
          forceState={(v.State ?? 'Default') as 'Default'}
          icon={checkGlyph(t)}
        />
        <SkFieldLabel htmlFor={id}>{translate('Remember me')}</SkFieldLabel>
      </SkField>
    </RecipeScope>
  )
}

export function SkeletonRadioGroupSpecimen({ t, w }: SpecimenProps) {
  const id = useId()
  const items = [['monthly', 'Monthly billing'], ['yearly', 'Yearly billing — save 20%'], ['lifetime', 'Lifetime']]
  return (
    <RecipeScope t={t}>
      <SkFieldSet style={{ width: w }}>
        <SkFieldLegend variant="label">Billing period</SkFieldLegend>
        <SkRadioGroup defaultValue="monthly">
          {items.map(([value, label]) => (
            <SkField key={value} orientation="horizontal">
              <SkRadioGroupItem value={value} id={`${id}-${value}`} />
              <SkFieldLabel htmlFor={`${id}-${value}`}>{label}</SkFieldLabel>
            </SkField>
          ))}
        </SkRadioGroup>
      </SkFieldSet>
    </RecipeScope>
  )
}

export function SkeletonSwitchSpecimen({ t, v }: SpecimenProps) {
  const id = useId()
  return (
    <RecipeScope t={t}>
      <SkField orientation="horizontal" style={{ width: 'auto' }}>
        <SkSwitch
          id={id}
          key={v.Checked}
          defaultChecked={(v.Checked ?? 'True') === 'True'}
          size={(v.Size ?? 'default') as SwitchSize}
          forceState={(v.State ?? 'Default') as 'Default'}
        />
        <SkFieldLabel htmlFor={id}>Notifications</SkFieldLabel>
      </SkField>
    </RecipeScope>
  )
}

/**
 * A settings list the way shadcn builds one: FieldSet · FieldLegend ·
 * FieldGroup of horizontal Fields, a Checkbox or a Switch in each. Screens use
 * it for "notify me about" and preference lists.
 */
export function SkeletonSettingsList({ t, control, legend, rows, w }: {
  t: SpecimenProps['t']; control: 'checkbox' | 'switch'; legend?: string; rows: { label: string; on: boolean }[]; w?: number | string
}) {
  const id = useId()
  return (
    <RecipeScope t={t}>
      <SkFieldSet style={{ width: w }}>
        {legend != null && <SkFieldLegend variant="label">{legend}</SkFieldLegend>}
        <SkFieldGroup style={{ gap: 'var(--spacing-3)' }}>
          {rows.map((r, i) => (
            <SkField key={r.label} orientation="horizontal">
              {control === 'checkbox' && <SkCheckbox id={`${id}-${i}`} defaultChecked={r.on} icon={checkGlyph(t)} />}
              <SkFieldLabel htmlFor={`${id}-${i}`}>{r.label}</SkFieldLabel>
              {control === 'switch' && <SkSwitch id={`${id}-${i}`} defaultChecked={r.on} />}
            </SkField>
          ))}
        </SkFieldGroup>
      </SkFieldSet>
    </RecipeScope>
  )
}

export function SkeletonSliderSpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkSlider label="Border radius" defaultValue={60} style={{ width: w ?? 260, maxWidth: '100%' }} />
    </RecipeScope>
  )
}

export function SkeletonFieldSpecimen({ t, v, w }: SpecimenProps) {
  const size = (v.Size ?? 'default') as FieldSize
  const state = (v.State ?? 'Default') as FieldState
  return (
    <RecipeScope t={t}>
      <SkField
        style={{ width: w ?? 320 }}
        size={size}
        state={state}
        label="Email address"
        required
        trailing={<SkTextLink href="#" onClick={(e) => e.preventDefault()}>Forgot password?</SkTextLink>}
        description="We will never share your email."
        error="Enter a valid email address."
      >
        <SkInput type="email" placeholder="Jane Doe" />
      </SkField>
    </RecipeScope>
  )
}

export function SkeletonLabelSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkLabel>Email address</SkLabel>
    </RecipeScope>
  )
}

/** Pre-Figma docs said weak · fair · strong; old saved links still pass them. */
const LEGACY_STRENGTH: Record<string, string> = { weak: '1', fair: '3', strong: '4' }
const strengthOf = (v: SpecimenProps['v'], fallback: string) => Number(LEGACY_STRENGTH[v.Strength ?? ''] ?? v.Strength ?? fallback) as Strength

export function SkeletonPasswordStrengthSpecimen({ t, v, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkPasswordStrength size={(v.Size ?? 'default') as PasswordStrengthSize} strength={strengthOf(v, '3')} style={{ width: w ?? 350 }} />
    </RecipeScope>
  )
}

export function SkeletonPasswordStrengthMeterSpecimen({ t, v, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div style={{ width: w ?? 280 }}>
        <SkPasswordStrengthMeter size={(v.Size ?? 'default') as PasswordStrengthSize} strength={strengthOf(v, '3')} />
      </div>
    </RecipeScope>
  )
}

export function SkeletonPasswordStrengthRuleSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkPasswordStrengthRule size={(v.Size ?? 'default') as PasswordStrengthSize} met={v.Met !== 'false'} />
    </RecipeScope>
  )
}

export function SkeletonFileUploadSpecimen({ t, w }: SpecimenProps) {
  // The board uploads: fills in steps, rests at 100 %, starts over.
  const step = useAutoplayStep(UPLOAD_PLAY.values.length, UPLOAD_PLAY.ms)
  const progress = step == null ? 80 : UPLOAD_PLAY.values[step]
  return (
    <RecipeScope t={t}>
      <SkFileUpload style={{ width: w ?? 300 }}>
        <SkButton variant="outline" size="sm" style={{ alignSelf: 'flex-start' }}>
          <PreviewIcon concept="upload" size={iconOf(14)} />
          Upload file
        </SkButton>
        <SkFileUploadFile name="brand-guide.pdf" kind="PDF" progress={progress} />
      </SkFileUpload>
    </RecipeScope>
  )
}

export function SkeletonDropzoneSpecimen({ t, v }: SpecimenProps) {
  const error = v.State === 'Error'
  return (
    <RecipeScope t={t}>
      <SkDropzone
        forceState={(v.State ?? 'Default') as 'Default'}
        width={300}
        icon={<PreviewIcon concept="upload" size={iconOf(17)} />}
        title={<><span data-part="Dropzone.link">Click to upload</span> or drag and drop</>}
        hint={error ? 'File exceeds the 10MB limit.' : 'SVG, PNG or PDF (max. 10MB)'}
      />
    </RecipeScope>
  )
}

export function SkeletonNativeSelectSpecimen({ t, v, w }: SpecimenProps) {
  const state = (v.State ?? 'Default') as 'Default'
  return (
    <RecipeScope t={t}>
      <SkNativeSelect
        size={(v.Size ?? 'default') as NativeSelectSize}
        forceState={state}
        disabled={state === ('Disabled' as string)}
        icon={<PreviewIcon concept="chevron" size={iconOf(12)} />}
        defaultValue="design"
        aria-label="Team"
        style={{ width: w ?? 240 }}
      >
        <SkNativeSelectOption value="design">Design</SkNativeSelectOption>
        <SkNativeSelectOption value="engineering">Engineering</SkNativeSelectOption>
        <SkNativeSelectOption value="product">Product</SkNativeSelectOption>
      </SkNativeSelect>
    </RecipeScope>
  )
}
