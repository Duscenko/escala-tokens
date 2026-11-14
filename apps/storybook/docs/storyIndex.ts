// What the Storybook holds, read from the story files themselves (their `meta.title`), so the Introduction and the
// "Related components" lists can never name a page that does not exist.
import { toId } from 'storybook/internal/csf'
import { COMPONENTS, type ComponentDef } from '../../../src/lib/componentCatalogue'

const metas = import.meta.glob<{ title?: string }>('../stories/**/*.stories.tsx', { eager: true, import: 'default' })

/** Every component page: its sidebar folder, its name (the Figma set) and its Documentation URL. */
export interface StoryComponent { title: string; folder: string; name: string; href: string }

export const STORY_COMPONENTS: StoryComponent[] = Object.values(metas)
  .map((m) => m?.title)
  .filter((t): t is string => typeof t === 'string')
  .map((title) => {
    const parts = title.split('/')
    return { title, folder: parts[0], name: parts[parts.length - 1], href: `./?path=/docs/${toId(title, 'Documentation')}` }
  })
  .sort((a, b) => a.name.localeCompare(b.name))

/** Folders in the sidebar's order. */
export const STORY_FOLDERS = ['Buttons', 'Form Controls', 'Forms', 'Indicators', 'Content & Surfaces', 'Feedback', 'Navigation']
  .filter((f) => STORY_COMPONENTS.some((c) => c.folder === f))

export const storyComponent = (name: string) => STORY_COMPONENTS.find((c) => c.name === name)

/** The catalogue entry of a Storybook component, or of the component it is a part of (BreadcrumbItem → Breadcrumb). */
export function catalogueEntry(name: string): { entry?: ComponentDef; partOf?: ComponentDef } {
  const entry = COMPONENTS.find((c) => c.key === name)
  if (entry) return { entry }
  const partOf = COMPONENTS
    .filter((c) => name.startsWith(c.key) && name !== c.key)
    .sort((a, b) => b.key.length - a.key.length)[0]
  return { partOf }
}
