// Component → its page in the PREVIEW library (`figmaKit.ts`). Derived, never
// typed: the page ids come from `spec/figma-components.json` (generated from
// the Figma file) and the set names from the catalogue's `figmaSets`, so a
// renamed or added page cannot leave a button pointing at the wrong place.
import snapshot from '../../spec/figma-components.json'
import { figmaPreviewUrl } from './figmaKit'

interface SnapshotPage { page: string; id: string; sets: { name: string }[] }
const PAGES = (snapshot as { pages: SnapshotPage[] }).pages

/** The Figma page that holds `key` or any of its `figmaSets`, or null when the
 *  component has no Figma twin yet (catalogue-first: Label, Spinner, Card…). */
export function figmaPageFor(key: string, figmaSets: readonly string[] = []): SnapshotPage | null {
  for (const name of [key, ...figmaSets]) {
    const hit = PAGES.find((p) => p.sets.some((s) => s.name === name))
    if (hit) return hit
  }
  return null
}

/** Where a component's Figma button goes: its page in the Preview library, or
 *  the library's Cover when it has no page of its own. */
export function figmaPreviewPageUrl(key: string, figmaSets: readonly string[] = []): string {
  return figmaPreviewUrl(figmaPageFor(key, figmaSets)?.id)
}
