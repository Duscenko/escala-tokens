import { useState } from 'react'
import type { SpecimenProps } from '../specimens'
import { PreviewIcon, avatarFillOf, avatarHueGradient } from '../specimens'
import { iconOf, iconRoleOf } from '../../../../lib/previewTokens'
import type { IconRole } from '../../../../lib/iconSizing'
import { Badge as SkBadge, StatusBadge as SkStatusBadge, type Presence } from '../../../escala-ui/badge'
import { Chip as SkChip } from '../../../escala-ui/chip'
import { Progress as SkProgress } from '../../../escala-ui/progress'
import { Spinner as SkSpinner } from '../../../escala-ui/spinner'
import { Icon as SkIcon } from '../../../escala-ui/icon'
import { Rating as SkRating } from '../../../escala-ui/rating'
import { FileFormat as SkFileFormat, type Format } from '../../../escala-ui/file-format'
import { Avatar as SkAvatar, AvatarFallback as SkAvatarFallback, type AvatarSize } from '../../../escala-ui/avatar'
import { RecipeScope, lower } from './scope'

export function SkeletonBadgeSpecimen({ t, v, children }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkBadge
        variant={lower(v.Style, 'Soft') as 'soft'}
        color={lower(v.Color, 'Brand') as 'brand'}
        size={lower(v.Size, 'MD') as 'md'}
        dot={v.Dot !== 'False'}
      >
        {children ?? (v.Color ?? 'Brand')}
      </SkBadge>
    </RecipeScope>
  )
}

export function SkeletonStatusBadgeSpecimen({ t, v }: SpecimenProps) {
  return <RecipeScope t={t}><SkStatusBadge status={(v.Status ?? 'Online') as Presence} /></RecipeScope>
}

export function SkeletonChipSpecimen({ t, v }: SpecimenProps) {
  const small = (v.Size ?? 'MD') === 'SM'
  const [selected, setSelected] = useState((v.Selected ?? 'False') === 'True')
  return (
    <RecipeScope t={t}>
      <SkChip
        key={`${v.Selected}-${v.Dismissible}-${v.Size}`}
        selected={selected}
        onPressedChange={setSelected}
        size={small ? 'sm' : 'md'}
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

export function SkeletonSpinnerSpecimen({ t, v }: SpecimenProps) {
  return <RecipeScope t={t}><SkSpinner size={lower(v.Size, 'MD') as 'md'} /></RecipeScope>
}

export function SkeletonIconSpecimen({ t, v }: SpecimenProps) {
  const step = lower(v.Size, 'MD')
  const role: IconRole = step === 'sm' ? 'small' : step === 'lg' || step === 'xl' ? 'large' : 'medium'
  return (
    <RecipeScope t={t}>
      <SkIcon size={role === 'small' ? 'sm' : role === 'large' ? 'lg' : 'md'}>
        <PreviewIcon concept="home" size={iconRoleOf(t, role)} />
      </SkIcon>
    </RecipeScope>
  )
}

export function SkeletonRatingSpecimen({ t, v }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <SkRating
        key={v.Interactive}
        value={4}
        interactive={(v.Interactive ?? 'False') === 'True'}
        star={<PreviewIcon concept="star" size={iconOf(18)} />}
        label="4.0 · 128 reviews"
      />
    </RecipeScope>
  )
}

export function SkeletonFileFormatSpecimen({ t, v }: SpecimenProps) {
  return <RecipeScope t={t}><SkFileFormat format={(v.Format ?? 'PDF') as Format} /></RecipeScope>
}

export function SkeletonAvatarSpecimen({ t, v }: SpecimenProps) {
  const gradient = v.Variant === 'Gradient'
  const hue = Number(v.Hue)
  const background = gradient ? (Number.isFinite(hue) ? avatarHueGradient(t, hue) : avatarFillOf(t)) : undefined
  return (
    <RecipeScope t={t}>
      <SkAvatar size={lower(v.Size, 'MD') as AvatarSize} style={background ? { background } : undefined}>
        <SkAvatarFallback>{gradient ? null : 'MD'}</SkAvatarFallback>
      </SkAvatar>
    </RecipeScope>
  )
}
