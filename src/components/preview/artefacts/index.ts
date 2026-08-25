// The artefact registry. Adding one is a single entry here — the panel derives
// everything else (header title, and the carousel's dots/scroll-snap, which
// activate on their own the moment a SECOND entry exists — see
// `CompactCarousel`'s own note on why there's no picker for a single one).
//
// Order is a narrative: Login → verify → pick a plan → pay → manage the
// account — a real product's own onboarding-to-settings arc, not an
// alphabetical or a by-category list. A new artefact doesn't have to fit that
// arc; it just goes wherever it reads best next to its neighbours.

import { LOGIN_ARTEFACT } from './LoginArtefact'
import { OTP_ARTEFACT } from './OTPArtefact'
import { PRICING_ARTEFACT } from './PricingArtefact'
import { CHECKOUT_ARTEFACT } from './CheckoutArtefact'
import { PROFILE_ARTEFACT } from './ProfileArtefact'
import type { Artefact } from './types'

export const ARTEFACTS: Artefact[] = [
  LOGIN_ARTEFACT,
  OTP_ARTEFACT,
  PRICING_ARTEFACT,
  CHECKOUT_ARTEFACT,
  PROFILE_ARTEFACT,
]

export type { Artefact, ArtefactProps, ArtefactViewport } from './types'
