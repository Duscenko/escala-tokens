// Crawlable reading pages for Components and Docs. The editor is not mounted
// here, so `syncWorkspaceSearch` and Figma auto-sync never run. "Open the
// configurator" is `/?section=<id>` — the same section ids the plugin already
// sends — and the configurator attaches `project` after that load.

import { useEffect, useState } from 'react'
import TopNav, { type DocsMenuPage, type TopNavKey } from '../configurator/TopNav'
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
import { getTheme, setTheme, useTheme } from '../../lib/theme'
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
      <PublicHeader current={page.kind === 'doc' ? 'docs' : 'components'} openEditor={openEditor} />
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

const DOCS_PAGE_PATH: Record<DocsMenuPage, string> = {
  mcp: '/docs/mcp',
  figma: '/docs/figma',
  changelog: '/docs/changelog',
  faq: '/docs/faq',
}

const NAV_PATH: Record<TopNavKey, string | null> = {
  about: '/about',
  variables: null, // the configurator itself — `openEditor`
  components: '/components',
  docs: '/docs',
}

/** The one header every crawlable reading page shares — Components, Docs,
 *  Contact and the legal pages. It IS the workspace's `TopNav`, not a look-
 *  alike: same lockup, same centred section nav and Docs menu, same Language
 *  and Appearance controls, so leaving the configurator for a reading page
 *  never changes the frame around it. The Export pill's slot holds the way
 *  back into the configurator instead. `current` null lights nothing, the
 *  same as the workspace's export/connect views. */
export function PublicHeader({ current = null, openEditor = '/' }: { current?: TopNavKey | null; openEditor?: string }) {
  const { t } = useI18n()
  const theme = useTheme()
  return (
    <TopNav
      nav={current}
      onNav={(key) => go(NAV_PATH[key] ?? openEditor)}
      onOpenDocsPage={(page) => go(DOCS_PAGE_PATH[page])}
      chromeAppearance={theme}
      onChromeAppearanceChange={setTheme}
      exportAction={(
        <a
          href={openEditor}
          className="inline-flex h-8 flex-shrink-0 items-center rounded-lg bg-white px-2.5 text-caption font-medium text-black transition-shadow hover:shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40"
        >
          {t('Open the configurator')}
        </a>
      )}
    />
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
