// Get started articles — destinations, not file formats.
// Create UI's docs shape (what you get → where it lands) without their CLI.
// The offline agent package is installed from Export (`AgentInstallPanel` on its
// last step), not from here.

import { type ReactNode } from 'react'
import { useI18n } from '../../../lib/i18n'
import { withAgentEnvelope } from '../../../lib/aiContext'
import { FIGMA_PLUGIN_COMMUNITY } from '../../../lib/utils'
import { AIContextButton } from '../../ui/AIContextButton'
import {
  DocHeader, DocSection, DocTitle, Pager, type TocEntry,
} from './blocks'
import {
  GET_STARTED_KEY, GUIDE_FIGMA_KEY, GUIDE_PAGE_COPY,
  introPager, type DocsExits,
} from './getStarted'

type Translate = (source: string) => string

export function getStartedToc(key: string, t: Translate = (source) => source): TocEntry[] {
  if (key === GUIDE_FIGMA_KEY) {
    return [
      { id: 'description', label: t('Overview') },
      { id: 'plugin', label: t('Install the plugin') },
      { id: 'context', label: t('Copy the context') },
      { id: 'file', label: t('Optional file') },
    ]
  }
  return [
    { id: 'description', label: t('Overview') },
    { id: 'configured', label: t('What you configured') },
    { id: 'start', label: t('Take it somewhere') },
  ]
}

function guideMarkdown(key: string): string {
  if (key === GUIDE_FIGMA_KEY) {
    return [
      '# Use in Figma',
      '',
      'Install the Escala plugin once. Copy the agent context from the Figma page and paste it into the plugin’s context card, then Import into this file.',
      '',
      `1. Install Escala Tokens from Figma Community: ${FIGMA_PLUGIN_COMMUNITY}`,
      '2. In the Figma desktop app, run Plugins → Escala Tokens.',
      '3. On escalatokens.com open Figma, check brands and viewports, then Copy context.',
      '4. In the plugin, paste it in the context card (⌘V) → Import into this file.',
      '5. Optional file: Export → Escala JSON (the same payload, as a download).',
      '',
    ].join('\n')
  }
  return [
    '# Get started',
    '',
    'You configured a token system. Primitives stay hidden; semantics are what designs and code reference. Light and dark are modes of the same roles.',
    '',
    'Take it somewhere:',
    '',
    '- **Figma** — plugin + Sync.',
    '- **Code** — `variables.css` from Save, W3C JSON from Export, a GitHub remote, and the Design skills (AGENTS.md and agent skills). All of it lands in the product repo.',
    '',
    'Do not choose between Markdown, Skill, and Agent bundle. Export asks where the system is going.',
  ].join('\n')
}

function ExitButton({
  children, onClick,
}: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start text-body font-medium text-fg border border-line-strong rounded-lg px-3 py-1.5 hover:bg-elevated/60 transition-colors"
    >
      {children}
    </button>
  )
}

function DestinationRow({
  title, hint, onClick,
}: { title: string; hint: string; onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-baseline justify-between gap-4 w-full text-left px-4 py-3.5 rounded-xl border border-line hover:border-line-strong transition-colors"
    >
      <span className="min-w-0">
        <span className="block text-ui font-medium text-fg">{title}</span>
        <span className="block text-body text-fg-muted mt-0.5 leading-relaxed">{hint}</span>
      </span>
      <span className="flex-shrink-0 text-body text-fg-faint">{t('Read')} →</span>
    </button>
  )
}

function GetStartedLanding({ onOpen, exits }: { onOpen: (key: string) => void; exits: DocsExits }) {
  const { t } = useI18n()
  return (
    <>
      <DocSection
        id="configured"
        title={t('What you configured')}
        description={t('A token system, not a component library. Primitive ramps hold the raw values; semantic roles are what a screen is allowed to name. Light and dark (and any extra brand) are modes of those roles — not a second palette.')}
      >
        <ul className="flex flex-col gap-1.5 text-ui text-fg-muted leading-relaxed pl-4 list-disc">
          <li>{t('Foundations you set in the Variables Generator — color, type, space, radius, size, stroke, grid, icons.')}</li>
          <li>{t('Optional component specs')} (<code className="font-mono text-[0.92em] px-1 py-0.5 rounded bg-elevated/70 border border-line text-fg">atoms</code>) {t('for the Figma plugin. Code still binds to roles, not to a hex on a button.')}</li>
          <li>{t('One payload underneath: the same JSON Figma, CSS, and an agent all read.')}</li>
        </ul>
      </DocSection>

      <DocSection
        id="start"
        title={t('Take it somewhere')}
        description={t('Two places, not a menu of file formats. Figma is a design tool and has its own guide; everything else — CSS, W3C JSON, the Design skills — lands in the product repo through Export.')}
      >
        <div className="flex flex-col gap-2">
          <DestinationRow
            title={t('Use in Figma')}
            hint={t('Install the Escala plugin, copy the agent context, and paste it in. Variables land in the file you already design in.')}
            onClick={() => onOpen(GUIDE_FIGMA_KEY)}
          />
        </div>
        <ExitButton onClick={exits.onOpenExport}>{t('Open Export')}</ExitButton>
      </DocSection>
    </>
  )
}

function FigmaGuide({ exits }: { exits: DocsExits }) {
  const { t } = useI18n()
  return (
    <>
      <DocSection
        id="plugin"
        title={t('Install the plugin')}
        description={t('One-time. Figma desktop, not the browser. After that you paste the agent context — or a JSON snapshot if you want one on disk.')}
      >
        <ol className="list-decimal pl-4 text-ui text-fg-muted leading-relaxed flex flex-col gap-1 mb-3">
          <li>{t('Install Escala Tokens from Figma Community.')}</li>
          <li>{t('In the Figma desktop app, run')} <span className="text-fg">Plugins → Escala Tokens</span>.</li>
        </ol>
        <a
          href={FIGMA_PLUGIN_COMMUNITY}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-body font-medium text-fg border border-line-strong rounded-lg px-3 py-1.5 hover:bg-elevated/60 transition-colors"
        >
          {t('Open in Figma Community')}
        </a>
      </DocSection>

      <DocSection
        id="context"
        title={t('Copy the context')}
        description={t('The Figma page builds one message — your brands, themes and viewports, plus the Escala JSON. Paste it into the plugin’s context card, then Import into this file.')}
      >
        <ol className="list-decimal pl-4 text-ui text-fg-muted leading-relaxed flex flex-col gap-1 mb-3">
          <li>{t('Open Figma in the workspace. Check the brands and viewports to ship.')}</li>
          <li>{t('Press Copy context.')}</li>
          <li>{t('In the plugin, paste it in the context card (⌘V) → Import into this file.')}</li>
        </ol>
        <ExitButton onClick={exits.onOpenFigmaSync}>{t('Open Figma')}</ExitButton>
      </DocSection>

      <DocSection
        id="file"
        title={t('Optional file')}
        description={t('If you need a snapshot on disk: Export and pick Escala JSON. That is the exact payload the plugin imports. W3C JSON is for other tools, not this plugin.')}
      >
        <ExitButton onClick={exits.onOpenExport}>{t('Open Export')}</ExitButton>
      </DocSection>
    </>
  )
}

export function GetStartedArticle({
  pageKey, onOpen, exits, showPager = true,
}: {
  pageKey: string
  onOpen: (key: string) => void
  exits: DocsExits
  showPager?: boolean
}) {
  const { t } = useI18n()
  const meta = GUIDE_PAGE_COPY[pageKey] ?? GUIDE_PAGE_COPY[GET_STARTED_KEY]
  const pager = introPager(pageKey)

  return (
    <div className="flex flex-col gap-8">
      <DocHeader
        section={t('Docs')}
        kind={t('Get started')}
        title={t(meta.title)}
        actions={
          <AIContextButton
            scope="global"
            markdown={() => withAgentEnvelope('global', t(meta.title), guideMarkdown(pageKey))}
          />
        }
      />

      <DocTitle title={t(meta.title)} eyebrow={t('Guide')} lead={t(meta.lead)} />

      {pageKey === GUIDE_FIGMA_KEY ? (
        <FigmaGuide exits={exits} />
      ) : (
        <GetStartedLanding onOpen={onOpen} exits={exits} />
      )}

      {showPager && <Pager prev={pager.prev} next={pager.next} onOpen={onOpen} />}
    </div>
  )
}
