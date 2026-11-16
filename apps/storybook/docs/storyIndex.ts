// What the Storybook holds, by FAMILY (design-plans/storybook-families.md): one Figma page = one sidebar entry = one
// Documentation page. The families come from spec/storybook-families.json; the stories are read from the story files
// themselves, so the Introduction, the Anatomy section and the Related lists can never name a page that does not exist.
import type { ComponentType } from 'react'
import { toId, storyNameFromExport } from 'storybook/internal/csf'
import { COMPONENTS, type ComponentDef } from '../../../src/lib/componentCatalogue'
import manifest from '../../../spec/storybook-families.json'
import inventory from '../../../spec/figma-components.json'

/** A story module as Vite loads it: the default export (meta) and the stories. */
export interface StoryModule {
  default: { title?: string; render?: (args: Record<string, unknown>, ctx?: unknown) => unknown; args?: Record<string, unknown>; component?: ComponentType<Record<string, unknown>> }
  [exportName: string]: unknown
}
interface StoryExport { name?: string; args?: Record<string, unknown>; render?: (args: Record<string, unknown>, ctx?: unknown) => unknown }

const modules = import.meta.glob<StoryModule>('../stories/*.stories.tsx', { eager: true })
const moduleOf = (set: string) => Object.entries(modules).find(([path]) => path.endsWith(`/${set}.stories.tsx`))?.[1]

export interface FamilyStory { exportName: string; id: string; name: string; href: string }
/** The Figma set as the inventory snapshot has it. */
export interface FigmaSet { name: string; variants?: number; axes?: Record<string, string>; props?: string }
export interface StoryPart {
  set: string
  /** Its stories, the first being its Playground. Empty when it has no story yet (`missing` says why). */
  stories: FamilyStory[]
  module?: StoryModule
  figma?: FigmaSet
  missing?: string
}
export interface StoryFamily {
  id: string
  title: string
  folder: string
  /** The Figma set that is the family's root; null = composed from its parts (DatePicker, Tooltip). */
  root: string | null
  page: string | null
  href: string
  figma?: FigmaSet
  parts: StoryPart[]
}

const figmaSets = new Map<string, FigmaSet>(inventory.pages.flatMap((p) => p.sets.map((s) => [s.name, s as FigmaSet] as const)))
const noStory = manifest.noStory as Record<string, string>

function storiesOf(set: string, title: string): { stories: FamilyStory[]; module?: StoryModule } {
  const module = moduleOf(set)
  if (!module) return { stories: [] }
  const stories = Object.entries(module)
    .filter(([k]) => k !== 'default' && k !== '__namedExportsOrder')
    .map(([exportName, story]) => {
      const id = toId(title, storyNameFromExport(exportName))
      return { exportName, id, name: (story as StoryExport)?.name ?? storyNameFromExport(exportName), href: `./?path=/story/${id}` }
    })
  return { stories, module }
}

export const STORY_FAMILIES: StoryFamily[] = manifest.families.map((f) => {
  const title = `${f.folder}/${f.id}`
  return {
    id: f.id, title, folder: f.folder, root: f.root, page: f.page,
    href: `./?path=/docs/${toId(title, 'Documentation')}`,
    figma: f.root ? figmaSets.get(f.root) : undefined,
    parts: f.parts.map((set) => ({ set, ...storiesOf(set, title), figma: figmaSets.get(set), missing: noStory[set] })),
  }
})

/** Folders in the sidebar's order (the manifest's), the ones that hold a family. */
export const STORY_FOLDERS: string[] = manifest.folders.filter((f) => STORY_FAMILIES.some((x) => x.folder === f))

export const familyByTitle = (title: string) => STORY_FAMILIES.find((f) => f.title === title)
export const familyOfSet = (set: string) => STORY_FAMILIES.find((f) => f.id === set || f.root === set || f.parts.some((p) => p.set === set))

export const catalogueOf = (key: string): ComponentDef | undefined => COMPONENTS.find((c) => c.key === key)

/** The catalogue entry of a family: its root's, else the family id's, else its first part with one. */
export function catalogueEntry(family: StoryFamily): ComponentDef | undefined {
  const keys = [family.root, family.id, ...family.parts.map((p) => p.set)].filter(Boolean) as string[]
  for (const k of keys) {
    const hit = catalogueOf(k)
    if (hit) return hit
  }
  return undefined
}
