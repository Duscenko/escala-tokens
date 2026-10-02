import { useEffect } from 'react'
import { useI18n } from './lib/i18n'
import Configurator from './pages/Configurator'
import { AboutScaffold } from './components/configurator/AboutMenu'
import { PublicReadingPage } from './components/public/PublicReadingPage'
import { LegalPage } from './components/public/LegalPage'
import { ContactPage } from './components/public/ContactPage'
import { CONTACT_PATH, LEGAL_PATH, PRIVACY_PATH } from './lib/legal'
import { ToastHost } from './components/ui/Toast'
import { applyDocumentHead } from './lib/documentHead'
import { ABOUT_DESCRIPTION, ABOUT_TITLE, matchPublicPath } from './lib/publicSeo'

// Escala is a dense token-editing workspace built for a laptop/desktop
// keyboard-and-mouse session — not a responsive site (see CLAUDE.md's
// "Platform" note). Below `md` (768px) there's no adaptive layout to fall
// back to, so rather than let the shell render half-broken, this screen takes
// its place. Pure CSS (`md:hidden`), not a JS viewport check — no flash of
// the wrong screen on load, no resize listener.
//
// It is NOT just a "come back on a laptop" card any more. Everything the
// About drawer holds — what Escala is, how the tokens work, the Figma plugin,
// what the docs are based on, the changelog, legal — is reference reading
// that needs no workspace to be useful, and on a phone it used to be
// unreachable: the only door to it was a burger button inside the desktop
// shell. `AboutScaffold` renders the SAME `SECTIONS` array here — see that
// component for why it also backs the `/about` route below.
function DesktopOnlyNotice() {
  const { t } = useI18n()
  return (
    <AboutScaffold
      wrapperClassName="md:hidden"
      heading={t('Optimized for desktop')}
      subheading={t('Escala Tokens is a design token workspace built for a laptop or desktop screen. Open it there to configure and export your system.')}
    />
  )
}

// `/about` — a real, shareable, crawlable URL for the same "what is this"
// content, so it isn't only reachable via a burger button inside the desktop
// shell. No router: `vercel.json` already rewrites every non-`/api/` path to
// `index.html` (SPA catch-all), so this is just a pathname branch, not new
// infrastructure. Content is 100% `AboutScaffold`/`SECTIONS` — nothing here
// is authored twice.
function AboutPage() {
  const { t } = useI18n()

  // `[t]` rather than `[]`: this is the one crawlable page in the app, and a
  // title left in English while the body renders in Spanish would misdescribe
  // it to both a reader and a crawler (`I18nProvider` already sets
  // `documentElement.lang`). React runs the cleanup before re-running the
  // effect, so `prevTitle` still captures the document's real original title
  // on a locale switch rather than the one this effect just wrote.
  useEffect(() => {
    applyDocumentHead({
      title: t(ABOUT_TITLE),
      description: t(ABOUT_DESCRIPTION),
      canonicalPath: '/about',
      robots: 'index, follow',
    })
  }, [t])

  return (
    <AboutScaffold
      heading={t('Define your foundations before you prompt')}
      subheading={t('Escala is where you set your design tokens once, then hand them to Figma, your code and any AI agent as one contract, so nothing invents its own colors, spacing or radius.')}
      ctaHref="/"
      ctaLabel={t('Open the configurator')}
    />
  )
}

function App() {
  // Read once per load, not reactively — this app has no client router, and
  // a real navigation (typed URL, shared link, back button) already triggers
  // a fresh document load. Matches the SPA catch-all in vercel.json.
  // Public reading paths (`/components`, `/docs/mcp`, …) never mount the
  // configurator, so they cannot rewrite `/?project=&section=` or publish.
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const publicPage = path === '/about' ? null : matchPublicPath(path)

  if (path === CONTACT_PATH) {
    return (
      <>
        <ContactPage />
        <ToastHost />
      </>
    )
  }

  if (path === LEGAL_PATH || path === PRIVACY_PATH) {
    return (
      <>
        <LegalPage kind={path === LEGAL_PATH ? 'legal' : 'privacy'} />
        <ToastHost />
      </>
    )
  }

  if (path === '/about') {
    return (
      <>
        <main className="min-h-screen bg-app text-fg">
          <AboutPage />
        </main>
        <ToastHost />
      </>
    )
  }

  if (publicPage) {
    return (
      <>
        <PublicReadingPage page={publicPage} />
        <ToastHost />
      </>
    )
  }

  return (
    <>
      <DesktopOnlyNotice />
      <main className="hidden md:block min-h-screen bg-app text-fg">
        <Configurator />
      </main>
      <ToastHost />
    </>
  )
}

export default App
