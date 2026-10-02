// Crawlable reading pages for Components and Docs. The editor is not mounted
// here, so `syncWorkspaceSearch` and Figma auto-sync never run. "Open the
// configurator" is `/?section=<id>` — the same section ids the plugin already
// sends — and the configurator attaches `project` after that load.

import { useEffect, useState } from 'react'
import { BrandMark } from '../configurator/TopNav'
import ComponentsView from '../configurator/ComponentsView'
import DocsView from '../configurator/DocsView'
import { CATEGORIES, COMPONENTS } from '../../lib/componentCatalogue'
import { applyDocumentHead } from '../../lib/documentHead'
import { useI18n } from '../../lib/i18n'
import {
  composeTitle,
  COMPONENTS_INDEX_DESCRIPTION,
  headSourceForPage,
  publicDocPath,
  workspaceSectionForPage,
  workspaceSectionHref,
  type PublicPage,
} from '../../lib/publicSeo'
import { encodeWorkspaceSection } from '../../lib/workspaceLink'
import { getTheme } from '../../lib/theme'
import { GUIDE_FIGMA_KEY, GUIDE_MCP_KEY } from '../configurator/docs/getStarted'

function go(href: string) {
  window.location.assign(href)
}

export function PublicReadingPage({ page }: { page: PublicPage }) {
  const { t } = useI18n()
  const [previewTheme] = useState(() => getTheme())
  const section = workspaceSectionForPage(page)
  const openEditor = workspaceSectionHref(section)

  useEffect(() => {
    const next = headSourceForPage(page)
    const titleCore = next.translateTitle ? t(next.title) : next.title
    applyDocumentHead({
      title: next.titleIsFull ? titleCore : composeTitle({ title: titleCore, titleIsFull: false }),
      description: t(next.description, next.descriptionVars),
      canonicalPath: next.path,
      robots: 'index, follow',
    })
  }, [page, t])

  const openDoc = (key: string) => {
    const path = publicDocPath(key)
    go(path ?? workspaceSectionHref(`docs/${key}`))
  }

  return (
    <div className="min-h-screen bg-app text-fg flex flex-col">
      <PublicHeader
        current={page.kind === 'doc' ? (page.docKey === GUIDE_MCP_KEY ? 'mcp' : page.docKey === GUIDE_FIGMA_KEY ? 'figma' : 'docs') : 'components'}
        openEditor={openEditor}
      />
      <div className="flex-1 min-h-0 h-[calc(100dvh-52px)]">
        {page.kind === 'components-index' ? (
          <ComponentsIndex />
        ) : page.kind === 'component' ? (
          <ComponentsView
            previewTheme={previewTheme}
            active={COMPONENTS.find((c) => c.key === page.key) ?? null}
            onSelect={(c) => go(`/components/${c.key}`)}
          />
        ) : (
          <DocsView
            activeFoundationKey={page.docKey}
            onSelectFoundationKey={openDoc}
            onEditFoundation={(foundationKey) => {
              go(workspaceSectionHref(encodeWorkspaceSection({
                tab: 'foundations',
                workspace: 'primitives',
                surface: 'artefacts',
                foundation: foundationKey,
              })))
            }}
            exits={{
              onOpenFigmaSync: () => go(workspaceSectionHref('sync')),
              onOpenFigmaDownload: () => go(workspaceSectionHref('sync')),
              onOpenExport: () => go(workspaceSectionHref('code')),
              onOpenSave: () => go(workspaceSectionHref('themes')),
              onOpenGithub: () => go(workspaceSectionHref('themes/github')),
            }}
          />
        )}
      </div>
    </div>
  )
}

type PublicNavKey = 'about' | 'components' | 'docs' | 'mcp' | 'figma' | 'legal'

/** The one header every crawlable reading page shares — Components, Docs,
 *  and the legal pages — so they read as one site, not three. */
export function PublicHeader({ current, openEditor = '/' }: { current?: PublicNavKey; openEditor?: string }) {
  const { t } = useI18n()
  const links: { key: PublicNavKey; href: string; label: string }[] = [
    { key: 'about', href: '/about', label: t('About') },
    { key: 'components', href: '/components', label: t('Components') },
    { key: 'docs', href: '/docs', label: t('Docs') },
    { key: 'mcp', href: '/docs/mcp', label: t('MCP') },
    { key: 'figma', href: '/docs/figma', label: t('Use in Figma') },
  ]
  return (
    <header className="flex h-[52px] flex-shrink-0 items-center gap-4 border-b border-line px-4">
      <a href="/" className="flex items-center gap-2 text-fg">
        <BrandMark size={28} />
        <span className="text-ui font-medium">Escala Tokens</span>
      </a>
      <nav aria-label={t('Navigation menu')} className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto text-body text-fg-muted">
        {links.map((l) => (
          <a key={l.key} href={l.href} className="hover:text-fg aria-[current=page]:text-fg" aria-current={current === l.key ? 'page' : undefined}>{l.label}</a>
        ))}
      </nav>
      <a
        href={openEditor}
        className="ml-auto flex-shrink-0 text-body font-medium text-fg border border-line-strong rounded-lg px-3 py-1.5 hover:bg-elevated/60"
      >
        {t('Open the configurator')}
      </a>
    </header>
  )
}

function ComponentsIndex() {
  const { t } = useI18n()
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-8 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-heading text-fg">{t('Components')}</h1>
          <p className="text-body text-fg-muted leading-relaxed max-w-2xl">
            {t(COMPONENTS_INDEX_DESCRIPTION, { count: COMPONENTS.length })}
          </p>
        </div>
        {CATEGORIES.map((category) => {
          const items = COMPONENTS.filter((c) => c.category === category)
          if (!items.length) return null
          return (
            <section key={category} className="flex flex-col gap-2">
              <h2 className="text-ui font-medium text-fg">{t(category)}</h2>
              <ul className="flex flex-col border-t border-line">
                {items.map((c) => (
                  <li key={c.key} className="border-b border-line">
                    <a href={`/components/${c.key}`} className="flex flex-col gap-0.5 py-2.5 hover:bg-elevated/40">
                      <span className="text-ui text-fg">{c.label}</span>
                      <span className="text-body text-fg-muted">{t(c.description)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
