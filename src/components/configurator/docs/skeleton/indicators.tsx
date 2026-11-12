import { useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { PhosphorWeightProvider, PreviewIcon, avatarFillOf, avatarHueGradient } from '../specimens'
import { iconOf, iconRoleOf } from '../../../../lib/previewTokens'
import type { IconRole } from '../../../../lib/iconSizing'
import { Badge as SkBadge, StatusBadge as SkStatusBadge, type BadgeVariant, type Presence } from '../../../escala-ui/badge'
import { Chip as SkChip } from '../../../escala-ui/chip'
import { useAutoplayStep } from '../../../preview/artefacts/boardAutoplay'
import { Progress as SkProgress } from '../../../escala-ui/progress'
import { Spinner as SkSpinner } from '../../../escala-ui/spinner'
import { Icon as SkIcon } from '../../../escala-ui/icon'
import { RatingGroup as SkRatingGroup, RatingGroupItem as SkRatingGroupItem, type RatingGroupItemState, type RatingGroupSize, type RatingGroupType } from '../../../escala-ui/rating-group'
import { FileFormat as SkFileFormat, type Format } from '../../../escala-ui/file-format'
import { Avatar as SkAvatar, AvatarFallback as SkAvatarFallback, type AvatarSize } from '../../../escala-ui/avatar'
import { RecipeScope } from './scope'
import { Kbd as SkKbd, KbdGroup as SkKbdGroup } from '../../../escala-ui/kbd'

export function SkeletonBadgeSpecimen({ t, v, children }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkBadge variant={(v.Variant ?? 'default') as BadgeVariant}>
        {children ?? 'Badge'}
      </SkBadge>
    </RecipeScope>
  )
}

export function SkeletonStatusBadgeSpecimen({ t, v }: SpecimenProps) {
  return <RecipeScope t={t}><SkStatusBadge status={(v.Status ?? 'online') as Presence} /></RecipeScope>
}

// Keyed by the axis values, so flipping `Selected` in the playground re-seeds
// the chip's own toggle state (a key on the inner Chip left it stale).
export function SkeletonChipSpecimen(props: SpecimenProps) {
  const { v } = props
  return <ChipPlayground key={`${v.Selected}-${v.Dismissible}-${v.Size}`} {...props} />
}

function ChipPlayground({ t, v }: SpecimenProps) {
  const small = v.Size === 'sm'
  const [selected, setSelected] = useState((v.Selected ?? 'False') === 'True')
  return (
    <RecipeScope t={t}>
      <SkChip
        selected={selected}
        onPressedChange={setSelected}
        size={small ? 'sm' : 'default'}
        dismissible={(v.Dismissible ?? 'False') === 'True'}
        removeIcon={<PreviewIcon concept="close" size={small ? 9 : 10} />}
      >
        Design tokens
      </SkChip>
    </RecipeScope>
  )
}

/** An upload as the board plays it: fills in steps, rests full, starts over. */
const PROGRESS_PLAY = [0, 24, 60, 82, 100, 100]

export function SkeletonProgressSpecimen({ t, w }: SpecimenProps) {
  const step = useAutoplayStep(PROGRESS_PLAY.length, 1100)
  return <RecipeScope t={t}><SkProgress label="Uploading…" value={step == null ? 60 : PROGRESS_PLAY[step]} style={{ width: w ?? 240, maxWidth: '100%' }} /></RecipeScope>
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

/** `v.Fill: 'Gradient'` (opt-in, not a catalogue axis) paints the avatar with
 *  the system's gradient instead of initials; `v.Hue` rotates it. */
export function SkeletonAvatarSpecimen({ t, v }: SpecimenProps) {
  const gradient = v.Fill === 'Gradient'
  const hue = Number(v.Hue)
  const background = gradient ? (Number.isFinite(hue) ? avatarHueGradient(t, hue) : avatarFillOf(t)) : undefined
  return (
    <RecipeScope t={t}>
      <SkAvatar size={(v.Size ?? 'default') as AvatarSize}>
        <SkAvatarFallback style={background ? { background } : undefined}>{gradient ? null : 'MD'}</SkAvatarFallback>
      </SkAvatar>
    </RecipeScope>
  )
}

export function SkeletonKbdSpecimen({ t }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkKbdGroup>
        <SkKbd>⌘</SkKbd>
        <SkKbd>K</SkKbd>
      </SkKbdGroup>
    </RecipeScope>
  )
}
