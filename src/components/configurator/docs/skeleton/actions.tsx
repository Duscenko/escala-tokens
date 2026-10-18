import type * as React from 'react'
import type { SpecimenProps } from '../specimens'
import { ICON_SLOTS, PreviewIcon, buttonLeadingConcept } from '../specimens'
import { iconForControlStep } from '../../../../lib/previewTokens'
import { useI18n } from '../../../../lib/i18n'
import { Button as SkButton, type ButtonSize, type ButtonVariant } from '../../../escala-ui/button'
import { ButtonGroup as SkButtonGroup, ButtonGroupSeparator as SkButtonGroupSeparator, type ButtonGroupOrientation } from '../../../escala-ui/button-group'
import { SocialLoginButton as SkSocialLoginButton, type SocialProvider, PROVIDER_NAME } from '../../../escala-ui/social-login-button'
import { AppStoreBadge as SkAppStoreBadge, type Store } from '../../../escala-ui/app-store-badge'
import { RecipeScope } from './scope'

/** shadcn size → the control step its icon is sized from (xs · sm · md · lg). */
const ICON_STEP: Record<ButtonSize, string> = {
  xs: 'xs', 'icon-xs': 'xs', sm: 'sm', 'icon-sm': 'sm', default: 'md', icon: 'md', lg: 'lg', 'icon-lg': 'lg',
}

export function SkeletonButtonSpecimen({ t, v, icons, w, children }: SpecimenProps) {
  const variant = (v.Variant ?? 'default') as ButtonVariant
  const size = (v.Size ?? 'default') as ButtonSize
  const iconPx = iconForControlStep(ICON_STEP[size] ?? 'md', t)
  const loading = v.State === 'Loading'
  const iconOnly = size.startsWith('icon')
  const slots = ICON_SLOTS.Button
  const leadConcept = icons?.leadingConcept ?? buttonLeadingConcept(variant)
  const spinner = (
    <span
      className="inline-block animate-spin rounded-full"
      style={{ width: iconPx - 2, height: iconPx - 2, border: '2px solid currentColor', borderTopColor: 'transparent' }}
      aria-hidden
    />
  )
  return (
    <RecipeScope t={t}>
      <SkButton
        variant={variant}
        size={size}
        forceState={(v.State ?? 'Default') as 'Default'}
        aria-label={iconOnly ? (typeof children === 'string' ? children : 'Add') : undefined}
        style={{ width: w, minWidth: w != null ? 0 : undefined, maxWidth: w != null ? '100%' : undefined }}
      >
        {iconOnly ? (
          loading ? spinner : <PreviewIcon prefix={icons?.prefix} concept={icons?.leadingConcept ?? slots.leading} size={iconPx} />
        ) : (
          <>
            {loading && spinner}
            {!loading && icons?.leading && <PreviewIcon prefix={icons.prefix} concept={leadConcept} size={iconPx} />}
            <span data-part="Button.label" className="truncate">{children ?? 'Button'}</span>
            {icons?.trailing && <PreviewIcon prefix={icons.prefix} concept={slots.trailing} size={iconPx} />}
          </>
        )}
      </SkButton>
    </RecipeScope>
  )
}

export function SkeletonButtonGroupSpecimen({ t, v }: SpecimenProps) {
  const orientation = (v.Orientation ?? 'horizontal') as ButtonGroupOrientation
  return (
    <RecipeScope t={t}>
      <SkButtonGroup orientation={orientation} aria-label="Range">
        <SkButton variant="outline">Day</SkButton>
        <SkButton variant="outline">Week</SkButton>
        <SkButton variant="outline">Month</SkButton>
      </SkButtonGroup>
    </RecipeScope>
  )
}

/** A dismiss control is shadcn's `Button variant="ghost" size="icon-sm"`. */
export function SkeletonDismissSpecimen({ t, size = 'icon-sm' }: { t: SpecimenProps['t']; size?: ButtonSize }) {
  return (
    <RecipeScope t={t}>
      <SkButton variant="ghost" size={size} aria-label="Close">
        <PreviewIcon concept="close" size={iconForControlStep(ICON_STEP[size] ?? 'sm', t)} />
      </SkButton>
    </RecipeScope>
  )
}

export function SkeletonSocialLoginButtonSpecimen({ t, v, w }: SpecimenProps) {
  const { t: translate } = useI18n()
  const provider = (v.Provider ?? 'google') as SocialProvider
  const large = v.Size === 'lg'
  return (
    <RecipeScope t={t}>
      <SkSocialLoginButton
        provider={provider}
        size={large ? 'lg' : 'default'}
        label={translate('Continue with {provider}', { provider: PROVIDER_NAME[provider] ?? provider })}
        style={{ width: w ?? (large ? 320 : 280), maxWidth: w != null ? '100%' : undefined, minWidth: w != null ? 0 : undefined }}
      />
    </RecipeScope>
  )
}

/** An inline link inside running copy: shadcn's `Button variant="link"` on an
 *  <a>, without the control's height and padding (it sits on the text line). */
export function SkeletonInlineLinkSpecimen({ t, children }: { t: SpecimenProps['t']; children: React.ReactNode }) {
  return (
    <RecipeScope t={t}>
      <SkButton variant="link" asChild style={{ height: 'auto', paddingInline: 0, display: 'inline', verticalAlign: 'baseline' }}>
        <a href="#" onClick={(e) => e.preventDefault()}>{children}</a>
      </SkButton>
    </RecipeScope>
  )
}

export function SkeletonAppStoreBadgeSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkAppStoreBadge store={(v.Store ?? 'app-store') as Store} href="#store" onClick={(e) => e.preventDefault()} />
    </RecipeScope>
  )
}
