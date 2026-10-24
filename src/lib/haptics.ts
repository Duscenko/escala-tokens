// Haptics for the phone generator (`MobileThemeSheet`, `MobilePreviewViews`):
// a light tick when a press lands, so a pick FEELS picked.
//
// Two engines, whichever the phone has:
//   - `navigator.vibrate` (Android Chrome, Firefox): a short pattern per kind;
//   - iOS Safari has no Vibration API, but since 17.4 toggling a native
//     `<input type="checkbox" switch>` plays the system's selection haptic.
//     A hidden one is toggled through its label, inside the user's gesture.
// Neither: nothing happens, and nothing breaks.
//
// The visitor can turn it off (the Theme sheet's vibrate button); the choice
// is a per-device convenience in localStorage, read defensively — a private
// window or a blocked store just means "on".

export type HapticKind = 'tick' | 'tap' | 'success' | 'warning'

/** Vibration patterns (ms). Short on purpose: a tick, not a buzz. */
export const HAPTIC_PATTERNS: Record<HapticKind, number | number[]> = {
  tick: 8,
  tap: 14,
  success: [10, 50, 16],
  warning: [24, 60, 24],
}

const STORAGE_KEY = 'escala-haptics'
const CHANGE_EVENT = 'escala-haptics-change'

export function hapticsEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setHapticsEnabled(on: boolean): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch { /* a blocked store: the toggle still works for this page */ }
  globalThis.dispatchEvent?.(new Event(CHANGE_EVENT))
}

export function subscribeHaptics(onChange: () => void): () => void {
  globalThis.addEventListener?.(CHANGE_EVENT, onChange)
  return () => globalThis.removeEventListener?.(CHANGE_EVENT, onChange)
}

export type HapticEngine = 'vibrate' | 'ios-switch' | null

/** Which engine this browser offers. iOS 17.4+ exposes the `switch`
 *  property on inputs; that is the feature test, not a user-agent sniff. */
export function hapticEngine(): HapticEngine {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') return 'vibrate'
  if (typeof HTMLInputElement !== 'undefined' && 'switch' in HTMLInputElement.prototype) return 'ios-switch'
  return null
}

let iosLabel: HTMLLabelElement | null = null

function iosTick() {
  if (!iosLabel) {
    iosLabel = document.createElement('label')
    iosLabel.setAttribute('aria-hidden', 'true')
    iosLabel.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    iosLabel.appendChild(input)
    document.body.appendChild(iosLabel)
  }
  iosLabel.click()
}

/** One haptic, if the visitor has them on and the phone can play them. */
export function haptic(kind: HapticKind = 'tick'): void {
  if (!hapticsEnabled()) return
  const engine = hapticEngine()
  try {
    if (engine === 'vibrate') navigator.vibrate(HAPTIC_PATTERNS[kind])
    else if (engine === 'ios-switch') iosTick()
  } catch { /* a browser that refuses (no user gesture yet) — stay silent */ }
}
