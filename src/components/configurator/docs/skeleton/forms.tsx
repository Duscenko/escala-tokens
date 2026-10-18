import { useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { ICON_SLOTS, INPUT_HTML_TYPE, INPUT_META, PreviewIcon, inputSeed } from '../specimens'
import { iconForControl, sizeRoleOf } from '../../../../lib/previewTokens'
import { useI18n } from '../../../../lib/i18n'
import { InputField as SkInputField } from '../../../escala-ui/input'
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
