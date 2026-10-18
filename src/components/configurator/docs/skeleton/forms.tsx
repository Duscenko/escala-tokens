import { useId, useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { ICON_SLOTS, INPUT_HTML_TYPE, INPUT_META, PhosphorWeightProvider, PreviewIcon, inputSeed } from '../specimens'
import { iconForControl, iconOf, selectorRoleOf, sizeRoleOf } from '../../../../lib/previewTokens'
import { useI18n } from '../../../../lib/i18n'
import { Input as SkInput } from '../../../escala-ui/input'
import { TextareaField as SkTextareaField } from '../../../escala-ui/textarea'
import { InputGroup as SkInputGroup, InputGroupAddon as SkAddon, InputGroupInput as SkGroupInput, InputGroupButton as SkGroupButton, InputGroupSeparator as SkGroupSeparator } from '../../../escala-ui/input-group'
import { InputStepper as SkInputStepper } from '../../../escala-ui/input-stepper'
import { InputTag as SkInputTag } from '../../../escala-ui/input-tag'
import { Select as SkSelect, SelectContent as SkSelectContent, SelectItem as SkSelectItem, SelectTrigger as SkSelectTrigger, SelectValue as SkSelectValue } from '../../../escala-ui/select'
import { Combobox as SkCombobox } from '../../../escala-ui/combobox'
import { InputOTP as SkInputOTP, InputOTPGroup as SkInputOTPGroup, InputOTPSlot as SkInputOTPSlot } from '../../../escala-ui/input-otp'
import { Checkbox as SkCheckbox } from '../../../escala-ui/checkbox'
import { RadioGroup as SkRadioGroup, RadioGroupItem as SkRadioGroupItem } from '../../../escala-ui/radio-group'
import { Switch as SkSwitch, type SwitchSize } from '../../../escala-ui/switch'
import { Slider as SkSlider } from '../../../escala-ui/slider'
import { Label as SkLabel } from '../../../escala-ui/label'
import {
  Field as SkField, FieldContent as SkFieldContent, FieldDescription as SkFieldDescription, FieldGroup as SkFieldGroup,
  FieldLabel as SkFieldLabel, FieldLegend as SkFieldLegend, FieldSet as SkFieldSet, type FieldOrientation,
} from '../../../escala-ui/field'
import { PasswordStrength as SkPasswordStrength, type Strength } from '../../../escala-ui/password-strength'
import { Dropzone as SkDropzone, FileUpload as SkFileUpload, FileUploadFile as SkFileUploadFile } from '../../../escala-ui/file-upload'
import { Button as SkButton } from '../../../escala-ui/button'
import { RecipeScope } from './scope'

/**
 * shadcn's Input. On its own page the bare control; given `v.Type` (an opt-in
 * key, not a catalogue axis) it is composed the way shadcn composes a form
 * row — Field · FieldLabel · Input · FieldDescription — so a screen can show
 * an e-mail or password field without a second input component.
 */
export function SkeletonInputSpecimen({ t, v, w, hideHint }: SpecimenProps) {
  const { t: translate } = useI18n()
  const meta = INPUT_META[v.Type ?? 'Default'] ?? INPUT_META.Default
  const [value, setValue] = useState(() => inputSeed(v.Type, v.State))
  const state = v.State === 'Filled' ? undefined : (v.State as 'Default' | undefined)
  const input = (
    <SkInput
      forceState={state}
      type={INPUT_HTML_TYPE[v.Type ?? 'Default'] ?? 'text'}
      placeholder={meta.placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      autoComplete="off"
      spellCheck={false}
      aria-label={v.Type ? undefined : translate(meta.label)}
      style={v.Type ? undefined : { width: w ?? 260 }}
    />
  )
  if (!v.Type) return <RecipeScope t={t}>{input}</RecipeScope>
  return (
    <RecipeScope t={t}>
      <SkField style={{ width: w ?? 260 }}>
        <SkFieldLabel>{translate(meta.label)}</SkFieldLabel>
        {input}
        {!hideHint && <SkFieldDescription>{translate(v.State === 'Error' ? 'This field is required.' : 'This is a hint text.')}</SkFieldDescription>}
      </SkField>
    </RecipeScope>
  )
}

export function SkeletonTextareaSpecimen({ t, v, w }: SpecimenProps) {
  const error = v.State === 'Error'
  return (
    <RecipeScope t={t}>
      <SkTextareaField
        label="Description"
        placeholder="Tell us about your design system…"
        hint={error ? 'Description is required.' : 'Max 200 characters.'}
        maxLength={200}
        forceState={(v.State ?? 'Default') as 'Default'}
        width={w ?? 280}
        rows={3}
      />
    </RecipeScope>
  )
}

export function SkeletonInputGroupSpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkInputGroup style={{ width: w ?? 300 }}>
        <SkAddon>https://</SkAddon>
        <SkGroupSeparator />
        <SkGroupInput defaultValue="escala.design" aria-label="Domain" />
        <SkGroupSeparator />
        <SkGroupButton>Copy</SkGroupButton>
      </SkInputGroup>
    </RecipeScope>
  )
}

export function SkeletonInputStepperSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkInputStepper defaultValue={12} min={0} max={99} />
    </RecipeScope>
  )
}

export function SkeletonInputTagSpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkInputTag defaultValue={['tokens', 'figma']} width={w ?? 300} removeIcon={<PreviewIcon concept="close" size={iconOf(9)} />} />
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

const FONTS = ['Inter', 'Poppins', 'Sora'].map((label) => ({ label, value: label.toLowerCase() }))

export function SkeletonComboboxSpecimen({ t, v }: SpecimenProps) {
  const open = (v.State ?? 'Default') === 'Open'
  return (
    <RecipeScope t={t}>
      <SkCombobox
        key={v.State}
        options={FONTS}
        defaultValue={open ? 'poppins' : undefined}
        forceOpen={open}
        placeholder="Search fonts…"
        icon={<PreviewIcon concept="chevron" size={iconOf(12)} />}
        width={240}
      />
    </RecipeScope>
  )
}

export function SkeletonInputOTPSpecimen({ t, v }: SpecimenProps) {
  const filled = v.State === 'Filled' || v.State === 'Error'
  const [value, setValue] = useState(filled ? '824913' : '')
  return (
    <RecipeScope t={t}>
      <SkInputOTP key={v.State} maxLength={6} value={value} onChange={setValue} aria-invalid={v.State === 'Error' || undefined} aria-label="Verification code">
        <SkInputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((i) => <SkInputOTPSlot key={i} index={i} />)}
        </SkInputOTPGroup>
      </SkInputOTP>
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

export function SkeletonFieldSpecimen({ t, v }: SpecimenProps) {
  const orientation = (v.Orientation ?? 'vertical') as FieldOrientation
  const id = useId()
  if (orientation === 'horizontal') {
    return (
      <RecipeScope t={t}>
        <SkField orientation="horizontal" style={{ width: 300 }}>
          <SkCheckbox id={id} defaultChecked icon={checkGlyph(t)} />
          <SkFieldContent>
            <SkFieldLabel htmlFor={id}>Share usage data</SkFieldLabel>
            <SkFieldDescription>Helps us improve Escala. No tokens leave your file.</SkFieldDescription>
          </SkFieldContent>
        </SkField>
      </RecipeScope>
    )
  }
  return (
    <RecipeScope t={t}>
      <SkFieldGroup style={{ width: 260 }}>
        <SkField orientation={orientation}>
          <SkFieldLabel htmlFor={id}>Workspace name</SkFieldLabel>
          <SkInput id={id} defaultValue="Acme Inc." />
          <SkFieldDescription>Shown to your teammates.</SkFieldDescription>
        </SkField>
      </SkFieldGroup>
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

export function SkeletonPasswordStrengthSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkPasswordStrength strength={(v.Strength ?? 'Fair') as Strength} width={260}>
        <SkInput type="password" defaultValue="hunter2hunter2" aria-label="Password" />
      </SkPasswordStrength>
    </RecipeScope>
  )
}

export function SkeletonFileUploadSpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkFileUpload style={{ width: w ?? 300 }}>
        <SkButton variant="outline" size="sm" style={{ alignSelf: 'flex-start' }}>
          <PreviewIcon concept="upload" size={iconOf(14)} />
          Upload file
        </SkButton>
        <SkFileUploadFile name="brand-guide.pdf" kind="PDF" progress={80} />
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
