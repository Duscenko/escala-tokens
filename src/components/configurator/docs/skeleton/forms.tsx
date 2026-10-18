import { useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { ICON_SLOTS, INPUT_HTML_TYPE, INPUT_META, PhosphorWeightProvider, PreviewIcon, inputSeed } from '../specimens'
import { iconForControl, iconOf, selectorRoleOf, sizeRoleOf } from '../../../../lib/previewTokens'
import { useI18n } from '../../../../lib/i18n'
import { InputField as SkInputField } from '../../../escala-ui/input'
import { TextareaField as SkTextareaField } from '../../../escala-ui/textarea'
import { InputGroup as SkInputGroup, InputGroupAddon as SkAddon, InputGroupInput as SkGroupInput, InputGroupButton as SkGroupButton, InputGroupSeparator as SkGroupSeparator } from '../../../escala-ui/input-group'
import { InputStepper as SkInputStepper } from '../../../escala-ui/input-stepper'
import { InputTag as SkInputTag } from '../../../escala-ui/input-tag'
import { Select as SkSelect, SelectContent as SkSelectContent, SelectItem as SkSelectItem, SelectTrigger as SkSelectTrigger, SelectValue as SkSelectValue } from '../../../escala-ui/select'
import { Combobox as SkCombobox } from '../../../escala-ui/combobox'
import { InputOTP as SkInputOTP } from '../../../escala-ui/input-otp'
import { Checkbox as SkCheckbox, CheckboxGroup as SkCheckboxGroup } from '../../../escala-ui/checkbox'
import { RadioGroup as SkRadioGroup, RadioGroupItem as SkRadioGroupItem } from '../../../escala-ui/radio-group'
import { Switch as SkSwitch, SwitchGroup as SkSwitchGroup, SwitchGroupRow as SkSwitchGroupRow } from '../../../escala-ui/switch'
import { Slider as SkSlider } from '../../../escala-ui/slider'
import { Field as SkField, Label as SkLabel } from '../../../escala-ui/label'
import { PasswordStrength as SkPasswordStrength, type Strength } from '../../../escala-ui/password-strength'
import { Dropzone as SkDropzone, FileUpload as SkFileUpload, FileUploadFile as SkFileUploadFile } from '../../../escala-ui/file-upload'
import { Button as SkButton } from '../../../escala-ui/button'
import { RecipeScope } from './scope'

export function SkeletonInputSpecimen({ t, v, icons, w, hideHint }: SpecimenProps) {
  const { t: translate } = useI18n()
  const meta = INPUT_META[v.Type ?? 'Default'] ?? INPUT_META.Default
  const size = (v.Size ?? 'MD') as 'MD'
  const control = parseFloat(sizeRoleOf(t, size === 'MD' ? 'control' : 'compact', '40px')) || 40
  const iconPx = iconForControl(control, t)
  const [value, setValue] = useState(() => inputSeed(v.Type, v.State))
  const error = v.State === 'Error'
  const slots = ICON_SLOTS.Input
  const lead = icons?.leading
    ? <PreviewIcon prefix={icons.prefix} concept={slots.leading} size={iconPx} />
    : meta.lead != null ? <span>{meta.lead}</span> : undefined
  return (
    <RecipeScope t={t}>
      <SkInputField
        label={translate(meta.label)}
        hint={hideHint ? undefined : translate(error ? 'This field is required.' : 'This is a hint text.')}
        size={size}
        forceState={v.State === 'Filled' ? undefined : (v.State as 'Default')}
        type={INPUT_HTML_TYPE[v.Type ?? 'Default'] ?? 'text'}
        placeholder={meta.placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        leading={lead}
        trailing={icons?.trailing ? <PreviewIcon prefix={icons.prefix} concept={slots.trailing} size={iconPx} /> : undefined}
        loading={v.State === 'Loading'
          ? <span className="inline-block animate-spin rounded-full" style={{ width: 13, height: 13, border: '2px solid currentColor', borderTopColor: 'transparent' }} aria-hidden />
          : undefined}
        width={w ?? 260}
      />
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
          size={(v.Size ?? 'MD').toLowerCase() as 'md'}
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
  return (
    <RecipeScope t={t}>
      <SkInputOTP key={v.State} size={(v.Size ?? 'MD').toLowerCase() as 'md'} defaultValue={filled ? '824913' : ''} invalid={v.State === 'Error'} />
    </RecipeScope>
  )
}

function checkGlyph(t: SpecimenProps['t'], small: boolean) {
  const px = parseFloat(selectorRoleOf(t, small ? 'compact' : 'control', '18px')) || 18
  return (
    <PhosphorWeightProvider weight="bold">
      <PreviewIcon concept="check" size={Math.round(px * 0.72)} />
    </PhosphorWeightProvider>
  )
}

export function SkeletonCheckboxSpecimen({ t, v }: SpecimenProps) {
  const { t: translate } = useI18n()
  const small = (v.Size ?? 'MD') === 'SM'
  return (
    <RecipeScope t={t}>
      <SkCheckbox
        key={`${v.Checked}`}
        defaultChecked={(v.Checked ?? 'True') === 'True'}
        size={small ? 'sm' : 'md'}
        forceState={(v.State ?? 'Default') as 'Default'}
        label={translate('Remember me')}
        icon={checkGlyph(t, small)}
      />
    </RecipeScope>
  )
}

export function SkeletonCheckboxGroupSpecimen({ t }: SpecimenProps) {
  const rows = ['Comments on my files', 'New team members', 'Weekly digest']
  return (
    <RecipeScope t={t}>
      <SkCheckboxGroup legend="Notify me about">
        {rows.map((label, i) => (
          <SkCheckbox key={label} defaultChecked={i < 2} label={label} icon={checkGlyph(t, false)} />
        ))}
      </SkCheckboxGroup>
    </RecipeScope>
  )
}

export function SkeletonRadioSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkRadioGroup key={v.Checked} defaultValue={(v.Checked ?? 'True') === 'True' ? 'monthly' : undefined}>
        <SkRadioGroupItem
          value="monthly"
          label="Monthly billing"
          size={(v.Size ?? 'MD') === 'SM' ? 'sm' : 'md'}
          forceState={(v.State ?? 'Default') as 'Default'}
        />
      </SkRadioGroup>
    </RecipeScope>
  )
}

export function SkeletonRadioGroupSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkRadioGroup legend="Billing period" defaultValue="monthly">
        <SkRadioGroupItem value="monthly" label="Monthly billing" />
        <SkRadioGroupItem value="yearly" label="Yearly billing — save 20%" />
        <SkRadioGroupItem value="lifetime" label="Lifetime" />
      </SkRadioGroup>
    </RecipeScope>
  )
}

export function SkeletonToggleSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkSwitch
        key={v.On}
        defaultChecked={(v.On ?? 'True') === 'True'}
        size={(v.Size ?? 'MD') === 'SM' ? 'sm' : 'md'}
        forceState={(v.State ?? 'Default') as 'Default'}
        label="Notifications"
      />
    </RecipeScope>
  )
}

export function SkeletonSwitchGroupSpecimen({ t, w }: SpecimenProps) {
  const rows = [
    { label: 'Email notifications', on: true },
    { label: 'Push notifications', on: true },
    { label: 'Marketing emails', on: false },
  ]
  return (
    <RecipeScope t={t}>
      <SkSwitchGroup legend="Notifications" style={{ width: w ?? 260 }}>
        {rows.map((r) => (
          <SkSwitchGroupRow key={r.label} label={r.label}>
            <SkSwitch defaultChecked={r.on} aria-label={r.label} />
          </SkSwitchGroupRow>
        ))}
      </SkSwitchGroup>
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

export function SkeletonFieldSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkField label="Workspace name" required description="Shown to your teammates." style={{ width: 260 }}>
        <SkInputField defaultValue="Acme Inc." />
      </SkField>
    </RecipeScope>
  )
}

export function SkeletonLabelSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkLabel required={(v.Required ?? 'False') === 'True'}>Email address</SkLabel>
    </RecipeScope>
  )
}

export function SkeletonPasswordStrengthSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkPasswordStrength strength={(v.Strength ?? 'Fair') as Strength} width={260}>
        <SkInputField type="password" defaultValue="hunter2hunter2" aria-label="Password" />
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
