// What the platform's Components section lists: Escala's OWN components, the
// ones the Storybook documents — never the whole `COMPONENTS` catalogue.
//
// `COMPONENTS` still carries entries from the shadcn era (Card, Drawer,
// Command, Chart…) that the Figma file and the Storybook do not have. They stay
// in the data — export, agent context and the plugin read it — but the
// platform does not show them. The list here is built from the SAME manifest
// the Storybook sidebar is written from (`spec/storybook-families.json`), so
// the two cannot drift: one Figma page = one family = one Storybook entry = one
// row in the platform's directory. A family's anatomy sets (CalendarDay,
// TableCell…) are PARTS: they open from inside their family's page, never as
// rows of their own.

import manifest from '../../spec/storybook-families.json'
import { COMPONENTS, type ComponentDef } from './componentCatalogue'

export const PLATFORM_FOLDERS = manifest.folders as readonly string[]

/** The catalogue's category for each Storybook folder (icons are keyed by it). */
export const FOLDER_CATEGORY: Record<string, string> = {
  Buttons: 'Button & Actions',
  Forms: 'Form Controls',
  Indicators: 'Indicators',
  'Content & Surfaces': 'Content & Surfaces',
  Feedback: 'Feedback',
  Navigation: 'Navigation',
}

export interface PlatformFamily {
  /** The family's name — the Storybook entry's title, e.g. "Calendar". */
  id: string
  folder: string
  /** The component set a designer places. Null for DatePicker and Tooltip:
   *  Figma has no root set, the family is composed from its parts. */
  root: ComponentDef | null
  /** Anatomy sets, in the manifest's order (only those with a page). */
  parts: ComponentDef[]
  /** The page the family's row opens: its root, else its first part. */
  lead: ComponentDef
}

const BY_KEY = new Map(COMPONENTS.map((c) => [c.key, c]))

interface ManifestFamily { id: string; folder: string; root: string | null; parts: string[] }
const noStory = new Set(Object.keys((manifest as { noStory?: Record<string, string> }).noStory ?? {}))

export const PLATFORM_FAMILIES: PlatformFamily[] = (manifest.families as ManifestFamily[]).flatMap((f) => {
  const root = f.root ? BY_KEY.get(f.root) ?? null : null
  const parts = f.parts
    .filter((p) => !noStory.has(p))
    .map((p) => BY_KEY.get(p))
    .filter((c): c is ComponentDef => Boolean(c))
  const lead = root ?? parts.find((p) => p.key.endsWith('Trigger')) ?? parts[0]
  if (!lead) return []
  return [{ id: f.id, folder: f.folder, root, parts, lead }]
})

const FAMILY_OF = new Map<string, PlatformFamily>()
for (const f of PLATFORM_FAMILIES) {
  FAMILY_OF.set(f.lead.key, f)
  for (const p of f.parts) FAMILY_OF.set(p.key, f)
}

/** The family a catalogue key belongs to, or null when the platform hides it. */
export function familyOf(key: string): PlatformFamily | null {
  return FAMILY_OF.get(key) ?? null
}

/** True when the platform shows this component (a family's page or a part). */
export function isPlatformComponent(key: string): boolean {
  return FAMILY_OF.has(key)
}

/** Every page the platform can open, family by family, parts after their family. */
export const PLATFORM_PAGES: ComponentDef[] = PLATFORM_FAMILIES.flatMap((f) => [f.lead, ...f.parts.filter((p) => p !== f.lead)])

/** The families of one folder, in the manifest's order. */
export function familiesIn(folder: string): PlatformFamily[] {
  return PLATFORM_FAMILIES.filter((f) => f.folder === folder)
}

/** A family's display name: the Storybook entry and Figma page name
 *  (IconButton, DatePicker), not the catalogue's prose label. */
export function familyLabel(f: PlatformFamily): string {
  return f.id
}
