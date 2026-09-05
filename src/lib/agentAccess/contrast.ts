import { evaluate, INTENT_THRESHOLDS, type IntentClass } from '../color/apca.js'

export type { IntentClass }

export function parseIntent(raw: unknown): IntentClass {
  if (typeof raw === 'string' && raw in INTENT_THRESHOLDS) return raw as IntentClass
  return 'body-text'
}

/** Dual WCAG + APCA readout. `foreground` first — APCA is directional. */
export function checkContrast(foreground: string, background: string, intent?: string) {
  return evaluate(foreground, background, parseIntent(intent))
}
