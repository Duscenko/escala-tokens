/**
 * What each Board tile plays while the board plays itself: one short script
 * per tile, as data. A specimen and the tile around it read the same script
 * through `useAutoplayStep(script.steps, script.ms)`; the board's clock is one
 * clock (see `boardAutoplay`), so both land on the same step.
 *
 * Periods differ on purpose, so tiles change at different moments instead of
 * in unison. Data only — the lazy specimens (Calendar) import it, and it must
 * not pull anything heavy into the board's bundle.
 */

/** Create account: the email types itself while the button rests, then the
 *  button loads. Same total as the button's own loop (8 × 780 ms). */
export const EMAIL_PLAY = { ms: 160, steps: 39, typeFrom: 1, focusUntil: 17 } as const

/** Editors: the count steps up and back; the total follows it. */
export const EDITORS_PLAY = { ms: 1600, values: [12, 13, 14, 13] } as const
export const EDITOR_PRICE = 12

/** Calendar: the selected day hops, and the event under the month follows. */
export const CALENDAR_PLAY = {
  ms: 2400,
  days: [
    { day: 14, event: 'Design review', time: '10:00' },
    { day: 15, event: 'Token sync', time: '14:30' },
    { day: 16, event: 'Release', time: '09:00' },
    { day: 21, event: 'Team retro', time: '16:00' },
  ],
} as const

/** Chart: the readiness figure climbs, holds, starts over. */
export const READINESS_PLAY = { ms: 1400, values: [92, 94, 96, 98, 98] } as const

/** Profile: followers tick up. */
export const FOLLOWERS_PLAY = { ms: 2100, values: ['12.4K', '12.5K', '12.6K', '12.6K'] } as const

/** File upload: fills in steps, rests at 100 %, starts over. */
export const UPLOAD_PLAY = { ms: 900, values: [0, 22, 48, 74, 100, 100, 100] } as const

/** Input tag: a third tag arrives, stays a beat, leaves. */
export const TAGS_PLAY = { ms: 2000, values: [['tokens', 'figma'], ['tokens', 'figma', 'motion'], ['tokens', 'figma', 'motion']] } as const
