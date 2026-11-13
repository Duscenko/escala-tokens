import { useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { PhosphorWeightProvider, PreviewIcon, avatarFillOf, avatarHueGradient } from '../specimens'
import { iconOf, iconRoleOf } from '../../../../lib/previewTokens'
import type { IconRole } from '../../../../lib/iconSizing'
import { Badge as SkBadge, StatusBadge as SkStatusBadge, type BadgeAppearance, type BadgeShape, type BadgeSize, type BadgeType, type BadgeVariant, type Presence } from '../../../escala-ui/badge'
import { Chip as SkChip, type ChipAppearance, type ChipShape, type ChipSize, type ChipState, type ChipVariant } from '../../../escala-ui/chip'
import { useAutoplayStep } from '../../../preview/artefacts/boardAutoplay'
import { ProgressCircle as SkProgressCircle, ProgressLine as SkProgressLine, type ProgressAppearance, type ProgressCap, type ProgressSize } from '../../../escala-ui/progress-line'
import { Spinner as SkSpinner } from '../../../escala-ui/spinner'
import { Icon as SkIcon } from '../../../escala-ui/icon'
import { RatingGroup as SkRatingGroup, RatingGroupItem as SkRatingGroupItem, type RatingGroupItemState, type RatingGroupSize, type RatingGroupType } from '../../../escala-ui/rating-group'
import { FileFormat as SkFileFormat, type Format } from '../../../escala-ui/file-format'
import {
  Avatar as SkAvatar, AvatarStatus as SkAvatarStatus, AvatarGroup as SkAvatarGroup,
  type AvatarSize, type AvatarType, type AvatarShape, type AvatarVariant, type AvatarAppearance, type AvatarStatusValue, type AvatarStatusSize,
} from '../../../escala-ui/avatar'
import { FeaturedIcon as SkFeaturedIcon, type FeaturedIconSize, type FeaturedIconShape, type FeaturedIconVariant, type FeaturedIconAppearance } from '../../../escala-ui/featured-icon'
import { RecipeScope } from './scope'
import { Kbd as SkKbd, KbdGroup as SkKbdGroup, type KbdSize } from '../../../escala-ui/kbd'

/** The Figma Badge. `IconLeadingVisible` / `IconTrailingVisible` are Figma booleans (`'True'`); a dot only
 *  exists solid + pill, so the specimen draws it that way whatever the other axes say. */
export function SkeletonBadgeSpecimen({ t, v, children }: SpecimenProps) {
  const type = (v.Type ?? 'default') as BadgeType
  return (
    <RecipeScope t={t}>
      <SkBadge
        appearance={(v.Appearance ?? 'soft') as BadgeAppearance}
        shape={(v.Shape ?? 'rounded') as BadgeShape}
        size={(v.Size ?? 'default') as BadgeSize}
        type={type}
        variant={(v.Variant ?? 'default') as BadgeVariant}
        iconLeading={v.IconLeadingVisible === 'True' ? true : undefined}
        iconTrailing={v.IconTrailingVisible === 'True' ? true : undefined}
        aria-label={type === 'icon' ? 'Verified' : type === 'dot' ? 'Online' : undefined}
      >
        {children ?? 'Badge'}
      </SkBadge>
    </RecipeScope>
  )
}

export function SkeletonStatusBadgeSpecimen({ t, v }: SpecimenProps) {
  return <RecipeScope t={t}><SkStatusBadge status={(v.Status ?? 'online') as Presence} /></RecipeScope>
}

/** The Figma Chip. `CloseVisible` / `IconLeadingVisible` are Figma booleans (`'True'`). `v.Interactive: 'True'`
 *  (opt-in, not a catalogue axis) lets a click toggle it, as the board plays it; otherwise State pins it. */
export function SkeletonChipSpecimen(props: SpecimenProps) {
  const { v } = props
  return <ChipPlayground key={`${v.State}-${v.Selected}-${v.Interactive}`} {...props} />
}

function ChipPlayground({ t, v, children }: SpecimenProps) {
  const interactive = v.Interactive === 'True'
  const [selected, setSelected] = useState(v.State === 'Selected' || v.Selected === 'True')
  const state = (v.State ?? 'Default') as ChipState
  return (
    <RecipeScope t={t}>
      <SkChip
        variant={(v.Variant ?? 'default') as ChipVariant}
        appearance={(v.Appearance ?? 'outline') as ChipAppearance}
        size={(v.Size ?? 'default') as ChipSize}
        shape={(v.Shape ?? 'rounded') as ChipShape}
        selected={interactive ? selected : undefined}
        onPressedChange={interactive ? setSelected : undefined}
        forceState={interactive ? undefined : state}
        closeVisible={v.CloseVisible === 'True' || v.Dismissible === 'True'}
        iconLeading={v.IconLeadingVisible === 'True' ? true : undefined}
      >
        {children ?? 'Chip'}
      </SkChip>
    </RecipeScope>
  )
}

/** An upload as the board plays it: fills in steps, rests full, starts over. */
const PROGRESS_PLAY = [0, 24, 60, 82, 100, 100]

/** The Figma ProgressLine at its 240px sample; `v.Value` pins the value (the board plays an upload through it). */
export function SkeletonProgressLineSpecimen({ t, v, w }: SpecimenProps) {
  const step = useAutoplayStep(PROGRESS_PLAY.length, 1100)
  const value = v.Value != null ? Number(v.Value) : step == null ? 60 : PROGRESS_PLAY[step]
  return (
    <RecipeScope t={t}>
      <SkProgressLine aria-label="Uploading" size={(v.Size ?? 'default') as ProgressSize} appearance={(v.Appearance ?? 'solid') as ProgressAppearance} value={value} style={{ width: w ?? 240, maxWidth: '100%' }} />
    </RecipeScope>
  )
}

export function SkeletonProgressCircleSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkProgressCircle aria-label="Uploading" size={(v.Size ?? 'default') as ProgressSize} cap={(v.Cap ?? 'round') as ProgressCap} appearance={(v.Appearance ?? 'solid') as ProgressAppearance} value={Number(v.Value ?? 50)} />
    </RecipeScope>
  )
}

export function SkeletonSpinnerSpecimen({ t }: SpecimenProps) {
  return <RecipeScope t={t}><SkSpinner /></RecipeScope>
}

export function SkeletonIconSpecimen({ t, v }: SpecimenProps) {
  const step = v.Size ?? 'default'
  const role: IconRole = step === 'sm' ? 'small' : step === 'lg' ? 'large' : 'medium'
  return (
    <RecipeScope t={t}>
      <SkIcon size={role === 'small' ? 'sm' : role === 'large' ? 'lg' : 'default'}>
        <PreviewIcon concept="home" size={iconRoleOf(t, role)} />
      </SkIcon>
    </RecipeScope>
  )
}

/** The Figma RatingGroup: five stars (four checked) or five smileys (the fourth chosen). */
export function SkeletonRatingGroupSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkRatingGroup
        aria-label="How was it?"
        size={(v.Size ?? 'default') as RatingGroupSize}
        type={(v.Type ?? 'star') as RatingGroupType}
      />
    </RecipeScope>
  )
}

/** One Figma rating item on its own (the overview and the docs playground). */
export function SkeletonRatingGroupItemSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkRatingGroupItem
        aria-label="Rating"
        size={(v.Size ?? 'default') as RatingGroupSize}
        kind={(v.Type ?? 'star') as RatingGroupType}
        checked={v.Checked === 'true'}
        forceState={(v.State ?? 'Default') as RatingGroupItemState}
      />
    </RecipeScope>
  )
}

export function SkeletonFileFormatSpecimen({ t, v }: SpecimenProps) {
  return <RecipeScope t={t}><SkFileFormat format={(v.Format ?? 'pdf') as Format} /></RecipeScope>
}

/** The Figma Avatar. `v.Fill: 'Gradient'` (opt-in, not a catalogue axis) paints the avatar with
 *  the system's gradient and no initials (the board's people); `v.Hue` rotates it. RingVisible and
 *  StatusVisible are Figma booleans (`'True'` / `'False'`). */
export function SkeletonAvatarSpecimen({ t, v }: SpecimenProps) {
  const gradient = v.Fill === 'Gradient'
  const hue = Number(v.Hue)
  const size = (v.Size ?? 'default') as AvatarSize
  const type = (gradient ? 'initials' : v.Type ?? 'initials') as AvatarType
  // The file's photo is a stock image: shown here as the system's own gradient (no image ships).
  const background = gradient || type === 'image' ? (Number.isFinite(hue) ? avatarHueGradient(t, hue) : avatarFillOf(t)) : undefined
  return (
    <RecipeScope t={t}>
      <SkAvatar
        aria-label="Maya Duscenko"
        type={type}
        size={size}
        shape={(v.Shape ?? 'circle') as AvatarShape}
        variant={(v.Variant ?? 'secondary') as AvatarVariant}
        appearance={(v.Appearance ?? 'soft') as AvatarAppearance}
        ringVisible={v.RingVisible === 'True'}
        statusVisible={v.StatusVisible === 'True'}
        style={background ? { background } : undefined}
      >
        {gradient ? null : size === '2xs' ? 'M' : 'MD'}
      </SkAvatar>
    </RecipeScope>
  )
}

/** The Figma AvatarStatus dot on its own. */
export function SkeletonAvatarStatusSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkAvatarStatus status={(v.Status ?? 'online') as AvatarStatusValue} size={(v.Size ?? 'default') as AvatarStatusSize} />
    </RecipeScope>
  )
}

/** The Figma AvatarGroup: four people (the swap's sample photos are not shipped, so initials) and +3. */
export function SkeletonAvatarGroupSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as AvatarSize
  const variants: AvatarVariant[] = ['default', 'success', 'warning', 'info']
  return (
    <RecipeScope t={t}>
      <SkAvatarGroup aria-label="Team" size={size} shape={(v.Shape ?? 'circle') as AvatarShape} count={3} countLabel="3 more people">
        {['AB', 'CD', 'EF', 'GH'].map((initials, i) => (
          <SkAvatar key={initials} type="initials" variant={variants[i]} aria-label={initials}>{size === '2xs' ? initials[0] : initials}</SkAvatar>
        ))}
      </SkAvatarGroup>
    </RecipeScope>
  )
}

/** The Figma FeaturedIcon (a lightning bolt unless it is swapped). */
export function SkeletonFeaturedIconSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkFeaturedIcon
        size={(v.Size ?? 'default') as FeaturedIconSize}
        variant={(v.Variant ?? 'default') as FeaturedIconVariant}
        appearance={(v.Appearance ?? 'soft') as FeaturedIconAppearance}
        shape={(v.Shape ?? 'circle') as FeaturedIconShape}
      />
    </RecipeScope>
  )
}

export function SkeletonKbdSpecimen({ t, v }: SpecimenProps) {
  const size = (v.Size ?? 'default') as KbdSize
  return (
    <RecipeScope t={t}>
      <SkKbdGroup>
        <SkKbd size={size}>⌘</SkKbd>
        <SkKbd size={size}>K</SkKbd>
      </SkKbdGroup>
    </RecipeScope>
  )
}
