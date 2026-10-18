import type { SpecimenProps } from '../specimens'
import { BUTTON_SIZE_SPECS, ICON_SLOTS, PreviewIcon, buttonLeadingConcept } from '../specimens'
import { iconForControlStep } from '../../../../lib/previewTokens'
import { useI18n } from '../../../../lib/i18n'
import { Button as SkButton, CloseButton as SkCloseButton, FABButton as SkFABButton } from '../../../escala-ui/button'
import { ButtonGroup as SkButtonGroup, ButtonGroupItem as SkButtonGroupItem } from '../../../escala-ui/button-group'
import { TextLink as SkTextLink } from '../../../escala-ui/link'
import { SocialLoginButton as SkSocialLoginButton, type SocialProvider } from '../../../escala-ui/social-login-button'
import { AppStoreBadge as SkAppStoreBadge } from '../../../escala-ui/app-store-badge'
import { RecipeScope, lower } from './scope'

const INTENT: Record<string, 'brand' | 'neutral' | 'danger' | 'success'> = {
  Brand: 'brand', Neutral: 'neutral', Danger: 'danger', Success: 'success',
}

export function SkeletonButtonSpecimen({ t, v, icons, w, children }: SpecimenProps) {
  const sz = BUTTON_SIZE_SPECS[v.Size ?? 'MD'] ?? BUTTON_SIZE_SPECS.MD
  const iconPx = iconForControlStep(sz.sizeKey, t)
  const loading = v.State === 'Loading'
  const slots = ICON_SLOTS.Button
  return (
    <RecipeScope t={t}>
      <SkButton
        variant={lower(v.Style, 'Solid') as 'solid'}
        intent={INTENT[v.Color ?? 'Brand']}
        size={lower(v.Size, 'MD') as 'md'}
        forceState={(v.State ?? 'Default') as 'Default'}
        style={{ width: w, minWidth: w != null ? 0 : undefined, maxWidth: w != null ? '100%' : undefined }}
      >
        {loading && (
          <span
            className="inline-block animate-spin rounded-full"
            style={{ width: iconPx - 2, height: iconPx - 2, border: '2px solid currentColor', borderTopColor: 'transparent' }}
            aria-hidden
          />
        )}
        {!loading && icons?.leading && (
          <PreviewIcon prefix={icons.prefix} concept={icons.leadingConcept ?? buttonLeadingConcept(v.Color)} size={iconPx} />
        )}
        <span data-part="Button.label" className="truncate">{children ?? 'Button'}</span>
        {icons?.trailing && <PreviewIcon prefix={icons.prefix} concept={slots.trailing} size={iconPx} />}
      </SkButton>
    </RecipeScope>
  )
}

export function SkeletonButtonGroupSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkButtonGroup size={lower(v.Size, 'MD') as 'md'}>
        <SkButtonGroupItem>Day</SkButtonGroupItem>
        <SkButtonGroupItem selected>Week</SkButtonGroupItem>
        <SkButtonGroupItem>Month</SkButtonGroupItem>
      </SkButtonGroup>
    </RecipeScope>
  )
}

export function SkeletonCloseButtonSpecimen({ t, v }: SpecimenProps) {
  const px = v.Size === 'SM' ? 24 : 32
  return (
    <RecipeScope t={t}>
      <SkCloseButton size={v.Size === 'SM' ? 'sm' : 'md'} forceState={(v.State ?? 'Default') as 'Default'}>
        <PreviewIcon concept="close" size={Math.round(px * 0.5)} />
      </SkCloseButton>
    </RecipeScope>
  )
}

export function SkeletonFABButtonSpecimen({ t, v }: SpecimenProps) {
  const px = v.Size === 'LG' ? 56 : 48
  return (
    <RecipeScope t={t}>
      <SkFABButton size={v.Size === 'LG' ? 'lg' : 'md'} aria-label="New item">
        <PreviewIcon concept="plus" size={Math.round(px * 0.42)} />
      </SkFABButton>
    </RecipeScope>
  )
}

export function SkeletonSocialLoginButtonSpecimen({ t, v, w }: SpecimenProps) {
  const { t: translate } = useI18n()
  const provider = (v.Provider ?? 'Google') as SocialProvider
  const large = (v.Size ?? 'MD') === 'LG'
  return (
    <RecipeScope t={t}>
      <SkSocialLoginButton
        provider={provider}
        size={large ? 'lg' : 'md'}
        label={translate('Continue with {provider}', { provider })}
        style={{ width: w ?? (large ? 320 : 280), maxWidth: w != null ? '100%' : undefined, minWidth: w != null ? 0 : undefined }}
      />
    </RecipeScope>
  )
}

export function SkeletonTextLinkSpecimen({ t, v, children }: SpecimenProps) {
  const link = (
    <SkTextLink href="#docs" onClick={(e) => e.preventDefault()} forceState={(v.State ?? 'Default') as 'Default'}>
      {children ?? 'design tokens guide ↗'}
    </SkTextLink>
  )
  // With `children` the caller supplies the WHOLE sentence around the link
  // ("Didn't get a code? <TextLink>Resend</TextLink>"), so only the anchor renders.
  return <RecipeScope t={t}>{children ? link : <span style={{ font: 'var(--text-body-md-font-size) var(--font-family-body)' }}>Read the {link}</span>}</RecipeScope>
}

export function SkeletonAppStoreBadgeSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkAppStoreBadge store={(v.Store ?? 'App Store') as 'App Store'} href="#store" onClick={(e) => e.preventDefault()} />
    </RecipeScope>
  )
}
