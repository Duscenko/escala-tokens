// An ARTEFACT is a composed screen — the thing a designer actually ships —
// built entirely from the system's own components and foundations.
//
// It answers a different question from the Preview tab. `Preview` asks "what do
// my components look like"; an artefact asks "what does a real screen built
// from my system look like". That is why it is whole-SYSTEM rather than scoped
// to the active foundation the way `.MD` is: it's the one view that always has
// everything on screen at once.
//
// Two rules keep it honest, both inherited from the Color collage:
//  · Every CONTROL is a catalogue `SPECIMENS` renderer, never hand-rolled
//    markup, so the artefact can't drift from what the Figma plugin ships.
//    Where an artefact needs a control to fill its column it passes
//    `SpecimenProps.w` — a width, not a re-implementation.
//  · Every measurement — page margin, gaps, radii, type — resolves from the
//    store through `PreviewTokens`. The artefact picks no numbers of its own.
//
// What the artefact DOES own is its prose (a page title, a footer line): no
// catalogue component provides those, and a screen without them isn't a screen.
// That's the normal split — the system owns the component, the composition owns
// the copy around it.

import type { ReactNode } from 'react'
import type { PreviewTokens } from '../ButtonPreview'

export type ArtefactViewport = 'mobile' | 'desktop'

export interface ArtefactProps {
  t: PreviewTokens
  /** True while rendered as a scaled-down thumbnail (the carousel's compact
   *  card) rather than at its real size. Forwarded to `DeviceFrame` so its own
   *  caption doesn't claim "true size" while it visually isn't — a thumbnail
   *  and the real screen must not make the same claim about their own scale. */
  compact?: boolean
}

export interface Artefact {
  /** Stable id — the registry key and, later, the picker's value. */
  key: string
  label: string
  /** One line for the panel header. */
  hint: string
  viewport: ArtefactViewport
  render: (p: ArtefactProps) => ReactNode
}
