import { evaluate, type IntentClass } from '../color/apca.js'

export type { IntentClass }

const INTENTS: IntentClass[] = ['body-text', 'large-text', 'ui-component', 'decorative', 'surface']

export function parseIntent(raw: unknown): IntentClass {
  if (typeof raw === 'string' && (INTENTS as string[]).includes(raw)) return raw as IntentClass
  return 'body-text'
}

/** Dual WCAG + APCA readout. `foreground` first — APCA is directional. */
export function checkContrast(foreground: string, background: string, intent?: string) {
  return evaluate(foreground, background, parseIntent(intent))
}
