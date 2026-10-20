import { useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { PhosphorWeightProvider, PreviewIcon, avatarFillOf, avatarHueGradient } from '../specimens'
import { iconOf, iconRoleOf } from '../../../../lib/previewTokens'
import type { IconRole } from '../../../../lib/iconSizing'
import { Badge as SkBadge, StatusBadge as SkStatusBadge, type BadgeVariant, type Presence } from '../../../escala-ui/badge'
import { Chip as SkChip } from '../../../escala-ui/chip'
import { Progress as SkProgress } from '../../../escala-ui/progress'
import { Spinner as SkSpinner } from '../../../escala-ui/spinner'
import { Icon as SkIcon } from '../../../escala-ui/icon'
import { Rating as SkRating } from '../../../escala-ui/rating'
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

export function SkeletonProgressSpecimen({ t, w }: SpecimenProps) {
  return <RecipeScope t={t}><SkProgress label="Uploading…" value={60} style={{ width: w ?? 240, maxWidth: '100%' }} /></RecipeScope>
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

export function SkeletonRatingSpecimen(props: SpecimenProps) {
  return <RatingPlayground key={props.v.Interactive} {...props} />
}

// Interactive: a click sets the score and the label follows it. Filled stars
// are the fill weight of the same glyph, so a score reads at a glance.
function RatingPlayground({ t, v }: SpecimenProps) {
  const interactive = (v.Interactive ?? 'False') === 'True'
  const [score, setScore] = useState(4)
  const size = iconOf(18)
  return (
    <RecipeScope t={t}>
      <SkRating
        value={score}
        onValueChange={interactive ? setScore : undefined}
        interactive={interactive}
        star={<PreviewIcon concept="star" size={size} />}
        starOn={<PhosphorWeightProvider weight="fill"><PreviewIcon concept="star" size={size} /></PhosphorWeightProvider>}
        label={`${score.toFixed(1)} · 128 reviews`}
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
