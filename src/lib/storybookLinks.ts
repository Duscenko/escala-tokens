// The way from a platform page to the same page in the online Storybook — the
// Escala design system's reference (it paints the Figma file's own palette,
// not the visitor's brand).
//
// Nothing here is typed by hand: a component's Storybook title is
// `<folder>/<family>` from `spec/storybook-families.json` (the manifest the
// sidebar is written from), a block's is `Blocks/<group>/<name>` (its registry
// id). The story id is Storybook's own sanitising of that title, and the docs
// entry is named "Documentation" (`.storybook/main.ts` `docs.defaultName`).
// `storybookLinks.test.ts` checks every page against the story files.

import { familyOf } from './platformCatalogue'

export const STORYBOOK_URL = 'https://escala-storybook.vercel.app'

/** Storybook's `sanitize` (@storybook/csf): lower case, every run of
 *  punctuation or spaces one hyphen, none at the ends. */
export function sanitizeStoryPart(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

/** The docs entry's id for a Storybook title ("Forms/Calendar" → "forms-calendar--documentation"). */
export function docsIdForTitle(title: string): string {
  return `${sanitizeStoryPart(title)}--documentation`
}

export function storybookDocsUrl(title: string): string {
  return `${STORYBOOK_URL}/?path=/docs/${docsIdForTitle(title)}`
}

/** A catalogue key's Storybook title — its FAMILY's, so a part (CalendarDay)
 *  opens the family it belongs to. Null when the platform hides the key. */
export function componentStoryTitle(key: string): string | null {
  const f = familyOf(key)
  return f ? `${f.folder}/${f.id}` : null
}

export function componentStorybookUrl(key: string): string | null {
  const title = componentStoryTitle(key)
  return title ? storybookDocsUrl(title) : null
}

/** A block's Storybook title from its registry id (`<group>/<name>`). A screen's id is
 *  already its title (`Screens/<name>`). */
export function blockStoryTitle(blockId: string): string {
  return blockId.startsWith('Screens/') ? blockId : `Blocks/${blockId}`
}

export function blockStorybookUrl(blockId: string): string {
  return storybookDocsUrl(blockStoryTitle(blockId))
}
