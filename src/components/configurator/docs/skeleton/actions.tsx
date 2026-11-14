import type * as React from 'react'
import type { SpecimenProps } from '../specimens'
import { ICON_SLOTS, PreviewIcon, buttonLeadingConcept } from '../specimens'
import { iconForControlStep } from '../../../../lib/previewTokens'
import { useI18n } from '../../../../lib/i18n'
import { Button as SkButton, buttonAxes, type ButtonAppearance, type ButtonSize, type ButtonVariant } from '../../../escala-ui/button'
import { IconButton as SkIconButton } from '../../../escala-ui/icon-button'
import { FABButton as SkFABButton, type FABButtonAppearance, type FABButtonShape, type FABButtonSize, type FABButtonState, type FABButtonVariant } from '../../../escala-ui/fab-button'
import { FABGroup as SkFABGroup, type FABGroupLayout } from '../../../escala-ui/fab-group'
import { TextLink as SkTextLink, type TextLinkSize, type TextLinkState, type TextLinkVariant } from '../../../escala-ui/text-link'
import { CloseButton as SkCloseButton, type CloseButtonAppearance, type CloseButtonShape, type CloseButtonSize, type CloseButtonState, type CloseButtonVariant } from '../../../escala-ui/close-button'
import {
  ButtonGroup as SkButtonGroup, ButtonGroupItem as SkButtonGroupItem, ButtonGroupDivider as SkButtonGroupDivider,
  type ButtonGroupOrientation, type ButtonGroupShape, type ButtonGroupSize, type ButtonGroupVariant, type ButtonGroupItemState,
} from '../../../escala-ui/button-group'
import { SocialLoginButton as SkSocialLoginButton, type SocialProvider, PROVIDER_NAME } from '../../../escala-ui/social-login-button'
import { AppStoreBadge as SkAppStoreBadge, type Store } from '../../../escala-ui/app-store-badge'
import { RecipeScope } from './scope'
import { Toggle as SkToggle, type ToggleSize, type ToggleVariant } from '../../../escala-ui/_skeleton/toggle'

/** Button size → the control step its icon is sized from (xs · sm · md · lg). */
const ICON_STEP: Record<string, string> = { xs: 'xs', sm: 'sm', default: 'md', lg: 'lg' }

function SpinnerGlyph({ px }: { px: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full"
      style={{ width: px - 2, height: px - 2, border: '2px solid currentColor', borderTopColor: 'transparent' }}
      aria-hidden
    />
  )
}

export function SkeletonButtonSpecimen({ t, v, icons, w, children }: SpecimenProps) {
  // Legacy one-axis values (`outline`, `icon-sm`…) still resolve, so an old
  // stored selection keeps rendering while it migrates.
  const axes = buttonAxes((v.Variant ?? 'default') as ButtonVariant, v.Appearance as ButtonAppearance | undefined, (v.Size ?? 'default') as ButtonSize)
  if (axes.iconOnly) return <SkeletonIconButtonSpecimen t={t} v={{ ...v, Variant: axes.variant, Appearance: axes.appearance, Size: axes.size }} icons={icons} />
  const iconPx = iconForControlStep(ICON_STEP[axes.size] ?? 'md', t)
  const loading = v.State === 'Loading'
  const slots = ICON_SLOTS.Button
  const leadConcept = icons?.leadingConcept ?? buttonLeadingConcept(axes.variant)
  return (
    <RecipeScope t={t}>
      <SkButton
        variant={axes.variant}
        appearance={axes.appearance}
        size={axes.size}
        forceState={(v.State ?? 'Default') as 'Default'}
        style={{ width: w, minWidth: w != null ? 0 : undefined, maxWidth: w != null ? '100%' : undefined }}
        leading={loading ? <SpinnerGlyph px={iconPx} /> : icons?.leading ? <PreviewIcon prefix={icons.prefix} concept={leadConcept} size={iconPx} /> : undefined}
        trailing={icons?.trailing ? <PreviewIcon prefix={icons.prefix} concept={icons.trailingConcept ?? slots.trailing} size={iconPx} /> : undefined}
      >
        <span data-part="Button.label" className="truncate">{children ?? 'Button'}</span>
      </SkButton>
    </RecipeScope>
  )
}

export function SkeletonIconButtonSpecimen({ t, v, icons, children }: SpecimenProps) {
  const size = (v.Size ?? 'default') as 'default'
  const iconPx = iconForControlStep(ICON_STEP[size] ?? 'md', t)
  const loading = v.State === 'Loading'
  return (
    <RecipeScope t={t}>
      <SkIconButton
        variant={(v.Variant ?? 'default') as 'default'}
        appearance={(v.Appearance ?? 'solid') as 'solid'}
        size={size}
        forceState={(v.State ?? 'Default') as 'Default'}
        aria-label={typeof children === 'string' ? children : 'Home'}
        icon={loading ? <SpinnerGlyph px={iconPx} /> : <PreviewIcon prefix={icons?.prefix} concept={icons?.leadingConcept ?? ICON_SLOTS.Button.leading} size={iconPx} />}
      />
    </RecipeScope>
  )
}

export function SkeletonCloseButtonSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkCloseButton
        appearance={(v.Appearance ?? 'soft') as CloseButtonAppearance}
        shape={(v.Shape ?? 'pill') as CloseButtonShape}
        size={(v.Size ?? 'default') as CloseButtonSize}
        variant={(v.Variant ?? 'default') as CloseButtonVariant}
        forceState={(v.State ?? 'Default') as CloseButtonState}
      />
    </RecipeScope>
  )
}

export function SkeletonTextLinkSpecimen({ t, v, icons, children }: SpecimenProps) {
  const size = (v.Size ?? 'default') as TextLinkSize
  const iconPx = iconForControlStep(size === 'xs' || size === 'sm' ? 'sm' : 'md', t)
  return (
    <RecipeScope t={t}>
      <SkTextLink
        href="#"
        onClick={(e) => e.preventDefault()}
        variant={(v.Variant ?? 'default') as TextLinkVariant}
        size={size}
        forceState={(v.State ?? 'Default') as TextLinkState}
        leading={icons?.leading !== false ? <PreviewIcon prefix={icons?.prefix} concept={icons?.leadingConcept ?? 'plus'} size={iconPx} /> : undefined}
        trailing={icons?.trailing !== false ? <PreviewIcon prefix={icons?.prefix} concept={icons?.trailingConcept ?? 'arrow-right'} size={iconPx} /> : undefined}
      >
        {children ?? 'Inline Text Link'}
      </SkTextLink>
    </RecipeScope>
  )
}

export function SkeletonFABButtonSpecimen({ t, v, icons, children }: SpecimenProps) {
  const size = (v.Size ?? 'default') as FABButtonSize
  const iconPx = iconForControlStep(size === 'lg' ? 'lg' : 'md', t)
  return (
    <RecipeScope t={t}>
      <SkFABButton
        appearance={(v.Appearance ?? 'solid') as FABButtonAppearance}
        shape={(v.Shape ?? 'rounded') as FABButtonShape}
        size={size}
        variant={(v.Variant ?? 'default') as FABButtonVariant}
        forceState={(v.State ?? 'Default') as FABButtonState}
        aria-label={typeof children === 'string' ? children : 'Create'}
        icon={<PreviewIcon prefix={icons?.prefix} concept={icons?.leadingConcept ?? 'plus'} size={iconPx} />}
      >
        {children ?? 'Create'}
      </SkFABButton>
    </RecipeScope>
  )
}

/** The three demo actions the Figma file itself ships (`stack`'s Edit · Photo · Share). */
export function SkeletonFABGroupSpecimen({ t, v, icons }: SpecimenProps) {
  const iconPx = iconForControlStep('md', t)
  const items = [
    { icon: <PreviewIcon prefix={icons?.prefix} concept="edit" size={iconPx} />, label: 'Edit' },
    { icon: <PreviewIcon prefix={icons?.prefix} concept="image" size={iconPx} />, label: 'Photo' },
    { icon: <PreviewIcon prefix={icons?.prefix} concept="share" size={iconPx} />, label: 'Share' },
  ]
  return (
    <RecipeScope t={t}>
      <SkFABGroup
        layout={(v.Layout ?? 'stack') as FABGroupLayout}
        open={(v.Open ?? 'false') === 'true'}
        items={items}
        triggerLabel="Create"
      />
    </RecipeScope>
  )
}

/** Icon px per ButtonGroupItem Size (Figma: icon-sm at xs · sm, md at default, lg at lg · xl). */
const GROUP_ICON_STEP: Record<string, string> = { xs: 'xs', sm: 'sm', default: 'md', lg: 'lg', xl: 'lg' }

export function SkeletonButtonGroupSpecimen({ t, v }: SpecimenProps) {
  const orientation = (v.Orientation ?? 'horizontal') as ButtonGroupOrientation
  return (
    <RecipeScope t={t}>
      <SkButtonGroup
        orientation={orientation}
        size={(v.Size ?? 'default') as ButtonGroupSize}
        variant={(v.Variant ?? 'default') as ButtonGroupVariant}
        shape={(v.Shape ?? 'rounded') as ButtonGroupShape}
        aria-label="Range"
      >
        <SkButtonGroupItem>Previous</SkButtonGroupItem>
        <SkButtonGroupItem active>Today</SkButtonGroupItem>
        <SkButtonGroupItem>Next</SkButtonGroupItem>
      </SkButtonGroup>
    </RecipeScope>
  )
}

export function SkeletonButtonGroupItemSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as ButtonGroupSize
  const iconOnly = v.IconOnly === 'true'
  const px = iconForControlStep(GROUP_ICON_STEP[size] ?? 'md', t)
  const state = (v.State ?? 'Default') as ButtonGroupItemState
  return (
    <RecipeScope t={t}>
      <SkButtonGroupItem
        size={size}
        variant={(v.Variant ?? 'default') as ButtonGroupVariant}
        active={v.Active === 'true'}
        iconOnly={iconOnly}
        forceState={state}
        disabled={state === 'Disabled'}
        aria-label={iconOnly ? 'Add' : undefined}
        leading={iconOnly ? <PreviewIcon concept="plus" size={px} /> : undefined}
      >
        Label
      </SkButtonGroupItem>
    </RecipeScope>
  )
}

export function SkeletonButtonGroupDividerSpecimen({ t, v }: SpecimenProps) {
  const vertical = v.Orientation === 'vertical'
  return (
    <RecipeScope t={t}>
      <div style={{ display: 'flex', width: vertical ? 68 : 1, height: vertical ? 1 : 40 }}>
        <SkButtonGroupDivider variant={(v.Variant ?? 'default') as ButtonGroupVariant} orientation={vertical ? 'vertical' : 'horizontal'} style={vertical ? { flex: 1 } : undefined} />
      </div>
    </RecipeScope>
  )
}

/** A dismiss control: a secondary · ghost IconButton with the close glyph. */
export function SkeletonDismissSpecimen({ t, size = 'icon-sm' }: { t: SpecimenProps['t']; size?: ButtonSize }) {
  const step = buttonAxes('default', undefined, size).size
  return (
    <RecipeScope t={t}>
      <SkIconButton variant="secondary" appearance="ghost" size={step} aria-label="Close" icon={<PreviewIcon concept="close" size={iconForControlStep(ICON_STEP[step] ?? 'sm', t)} />} />
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

export function SkeletonToggleSpecimen({ t, v }: SpecimenProps) {
  const pressed = (v.Pressed ?? 'False') === 'True'
  return (
    <RecipeScope t={t}>
      <SkToggle
        key={String(pressed)}
        defaultPressed={pressed}
        variant={(v.Variant ?? 'default') as ToggleVariant}
        size={(v.Size ?? 'default') as ToggleSize}
        aria-label="Bold"
      >
        <b>B</b>
      </SkToggle>
    </RecipeScope>
  )
}
