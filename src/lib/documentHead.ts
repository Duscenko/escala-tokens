/**
 * Document head for share and crawl tags. Writes title, description,
 * canonical, Open Graph and Twitter tags. Never touches history and never
 * touches `/api/tokens` — the workspace address bar stays on
 * `syncWorkspaceSearch` (`workspaceLink.ts`).
 */

export const PUBLIC_SITE_ORIGIN = 'https://www.escalatokens.com'

/** Existing product still. Not a generated social card. */
export const SHARE_IMAGE_PATH = '/video/escala-tokens-demo-poster.jpg'

export type DocumentHead = {
  title: string
  description: string
  /** Path only, beginning with `/`. `/` is the configurator home. */
  canonicalPath: string
  robots: 'index, follow' | 'noindex, nofollow'
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function absolutePublicUrl(path: string): string {
  if (path === '/' || path === '') return `${PUBLIC_SITE_ORIGIN}/`
  return `${PUBLIC_SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}

export function applyDocumentHead(head: DocumentHead): void {
  const canonical = absolutePublicUrl(head.canonicalPath)
  const image = absolutePublicUrl(SHARE_IMAGE_PATH)
  document.title = head.title
  upsertMeta('name', 'description', head.description)
  upsertMeta('name', 'robots', head.robots)
  upsertMeta('property', 'og:title', head.title)
  upsertMeta('property', 'og:description', head.description)
  upsertMeta('property', 'og:url', canonical)
  upsertMeta('property', 'og:type', 'website')
  upsertMeta('property', 'og:image', image)
  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', head.title)
  upsertMeta('name', 'twitter:description', head.description)
  upsertMeta('name', 'twitter:image', image)
  upsertCanonical(canonical)
}
