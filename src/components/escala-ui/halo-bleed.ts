// A scroll container (`overflow-y: auto`) clips on both axes, so a field that touches its edge loses the half of its focus
// halo that sits outside the box (the 2px `border.ring` ring): the ring then reads as masked on three sides. The container
// gives the halo its own room — `stroke.focus` of padding, taken back by an equal negative margin — so nothing moves.
export const HALO_BLEED = 'p-[var(--stroke-focus,2px)] m-[calc(-1*var(--stroke-focus,2px))]'
