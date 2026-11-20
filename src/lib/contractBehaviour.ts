/**
 * Behaviour a component inherits from the library it is built on — the part of a
 * contract an agent cannot read from Figma (Storybook owns behaviour,
 * DEC-2026-11-16-007). Keyed by the primitive a component file imports
 * (`import { Dialog as DialogPrimitive } from 'radix-ui'` → `Dialog`), so a
 * contract states it without anyone retyping it per component.
 *
 * Each entry names the WAI-ARIA Authoring Practices pattern the primitive
 * implements and the keys it answers. Only what the library really does: a
 * component that adds keys of its own documents them in its story and, later,
 * in `componentBehaviour.ts` (design-plans/agent-ready-contracts.md, phase 3).
 *
 * Pure data, no imports: `componentContracts.ts` reads it.
 */

export interface PrimitiveBehaviour {
  /** Library the primitive comes from. */
  library: string
  /** WAI-ARIA APG pattern, or null when the primitive is not an interactive pattern. */
  pattern: string | null
  /** Key (or chord) → what it does. */
  keyboard: Record<string, string>
  /** Focus behaviour in one line. */
  focus: string
}

const RADIX = 'radix-ui'

export const PRIMITIVE_BEHAVIOUR: Record<string, PrimitiveBehaviour> = {
  Accordion: {
    library: RADIX,
    pattern: 'accordion',
    keyboard: {
      'Space / Enter': 'toggles the focused section',
      'ArrowDown / ArrowUp': 'moves focus to the next / previous trigger',
      'Home / End': 'moves focus to the first / last trigger',
    },
    focus: 'Each trigger is a button in the tab order; the panel is labelled by its trigger.',
  },
  Checkbox: {
    library: RADIX,
    pattern: 'checkbox',
    keyboard: { Space: 'toggles checked (indeterminate → checked)' },
    focus: 'The box is one tab stop; its Label is the accessible name.',
  },
  Dialog: {
    library: RADIX,
    pattern: 'dialog-modal',
    keyboard: {
      Escape: 'closes the dialog and returns focus to the trigger',
      'Tab / Shift+Tab': 'cycles focus inside the dialog (focus trap)',
    },
    focus: 'Focus moves into the dialog on open, is trapped while open and returns to the trigger on close; the page behind is inert.',
  },
  DropdownMenu: {
    library: RADIX,
    pattern: 'menu-button',
    keyboard: {
      'Space / Enter / ArrowDown': 'opens the menu from the trigger and focuses the first item',
      'ArrowDown / ArrowUp': 'moves between items (wraps)',
      'Home / End': 'first / last item',
      'Enter / Space': 'activates the focused item and closes the menu',
      Escape: 'closes the menu and returns focus to the trigger',
      'A–Z': 'typeahead to the item starting with the letter',
    },
    focus: 'Roving focus inside the menu; the trigger keeps aria-expanded in sync.',
  },
  Label: {
    library: RADIX,
    pattern: null,
    keyboard: {},
    focus: 'Clicking the label focuses or toggles its control (htmlFor).',
  },
  Popover: {
    library: RADIX,
    pattern: 'dialog-non-modal',
    keyboard: {
      'Space / Enter': 'opens / closes from the trigger',
      Escape: 'closes and returns focus to the trigger',
      Tab: 'moves through the popover content',
    },
    focus: 'Focus moves into the content on open and back to the trigger on close; outside click dismisses.',
  },
  Progress: {
    library: RADIX,
    pattern: 'progressbar',
    keyboard: {},
    focus: 'Not focusable; aria-valuenow / aria-valuemax announce the value (indeterminate when no value).',
  },
  RadioGroup: {
    library: RADIX,
    pattern: 'radio-group',
    keyboard: {
      Tab: 'enters the group on the checked item (or the first)',
      'ArrowDown / ArrowRight': 'checks and focuses the next item (wraps)',
      'ArrowUp / ArrowLeft': 'checks and focuses the previous item (wraps)',
      Space: 'checks the focused item',
    },
    focus: 'The group is one tab stop with roving focus.',
  },
  ScrollArea: {
    library: RADIX,
    pattern: null,
    keyboard: { 'Arrow keys / PageUp / PageDown': 'scroll the viewport natively when it has focus' },
    focus: 'Native scrolling; the custom scrollbars are not focusable.',
  },
  Separator: {
    library: RADIX,
    pattern: null,
    keyboard: {},
    focus: 'Not focusable. role="separator" unless decorative (role="none").',
  },
  Slider: {
    library: RADIX,
    pattern: 'slider',
    keyboard: {
      'ArrowRight / ArrowUp': 'increases by one step',
      'ArrowLeft / ArrowDown': 'decreases by one step',
      'PageUp / PageDown': 'increases / decreases by a larger step',
      'Shift+Arrow': 'larger step',
      'Home / End': 'minimum / maximum',
    },
    focus: 'Each thumb is one tab stop with aria-valuenow / min / max.',
  },
  Switch: {
    library: RADIX,
    pattern: 'switch',
    keyboard: { 'Space / Enter': 'toggles on / off' },
    focus: 'One tab stop, role="switch" with aria-checked.',
  },
  Tooltip: {
    library: RADIX,
    pattern: 'tooltip',
    keyboard: { Escape: 'hides the tooltip' },
    focus: 'Opens on hover after a delay and on keyboard focus of the trigger; never focusable itself; the trigger is described by it.',
  },
  // Not Radix.
  Toaster: {
    library: 'sonner',
    pattern: 'alert (live region)',
    keyboard: { 'Alt+T': 'moves focus to the toast region (sonner hotkey)' },
    focus: 'Toasts announce through a polite live region; hover or focus pauses the timer.',
  },
  OTPInput: {
    library: 'input-otp',
    pattern: null,
    keyboard: {
      'Digits / letters': 'fill the next slot',
      Backspace: 'clears the previous slot',
      'ArrowLeft / ArrowRight': 'move between slots',
      'Paste (Cmd/Ctrl+V)': 'fills every slot at once',
    },
    focus: 'One real input behind the slots; autocomplete="one-time-code".',
  },
}

/** `Slot` only forwards props (`asChild`): it is composition, not behaviour. */
const IGNORED = new Set(['Slot'])

const RADIX_IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"]radix-ui['"]/g
const OTHER_IMPORT: Record<string, string> = { sonner: 'Toaster', 'input-otp': 'OTPInput' }

/** The behaviour primitives a component source imports, in first-seen order. */
export function primitivesIn(src: string): string[] {
  const out: string[] = []
  for (const m of src.matchAll(RADIX_IMPORT)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0]?.trim()
      if (name && !IGNORED.has(name) && !out.includes(name)) out.push(name)
    }
  }
  for (const [mod, name] of Object.entries(OTHER_IMPORT)) {
    if (new RegExp(`from\\s*['"]${mod}['"]`).test(src) && !out.includes(name)) out.push(name)
  }
  return out
}

/** `role="…"` values and `aria-*` attributes a source sets, sorted. */
export function ariaIn(src: string): { roles: string[]; attributes: string[] } {
  const roles = new Set<string>()
  const attributes = new Set<string>()
  for (const m of src.matchAll(/\brole\s*[=:]\s*\{?\s*['"]([a-z]+)['"]/g)) roles.add(m[1])
  for (const m of src.matchAll(/['"]?(aria-[a-z]+)['"]?\s*[=:]/g)) attributes.add(m[1])
  return { roles: [...roles].sort(), attributes: [...attributes].sort() }
}
