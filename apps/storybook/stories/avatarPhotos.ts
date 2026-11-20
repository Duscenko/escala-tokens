// The Figma file's `media/photo-*` (page ⛰ Media), exported once so any story can put a real face in an Avatar.
// Vite hashes and bundles them, so no staticDirs entry is needed. Names match the file: photo-9, photo-11 … photo-17.
import photo9 from './assets/avatars/photo-9.jpg'
import photo11 from './assets/avatars/photo-11.jpg'
import photo12 from './assets/avatars/photo-12.jpg'
import photo13 from './assets/avatars/photo-13.jpg'
import photo14 from './assets/avatars/photo-14.jpg'
import photo15 from './assets/avatars/photo-15.jpg'
import photo16 from './assets/avatars/photo-16.jpg'
import photo17 from './assets/avatars/photo-17.jpg'

export const AVATAR_PHOTOS = {
  'photo-9': photo9, 'photo-11': photo11, 'photo-12': photo12, 'photo-13': photo13,
  'photo-14': photo14, 'photo-15': photo15, 'photo-16': photo16, 'photo-17': photo17,
} as const
export type AvatarPhotoName = keyof typeof AVATAR_PHOTOS
/** The photos in the file's order, for lists of people. */
export const AVATAR_PHOTO_LIST: readonly string[] = Object.values(AVATAR_PHOTOS)
