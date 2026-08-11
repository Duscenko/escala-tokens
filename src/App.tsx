import { useState } from 'react'
import Configurator from './pages/Configurator'
import { BrandMark } from './components/configurator/TopNav'
import {
  AboutAccordion, AboutContact, COPYRIGHT_LINE, type AboutSection,
} from './components/configurator/AboutMenu'
import { TOKEN_SCHEMA_VERSION } from './lib/tokenGenerator'

// Escala is a dense token-editing workspace built for a laptop/desktop
// keyboard-and-mouse session — not a responsive site (see CLAUDE.md's
// "Platform" note). Below `md` (768px) there's no adaptive layout to fall
// back to, so rather than let the shell render half-broken, this screen takes
// its place. Pure CSS (`md:hidden` / `hidden md:block`), not a JS viewport
// check — no flash of the wrong screen on load, no resize listener.
//
// It is NOT just a "come back on a laptop" card any more. Everything the
// About drawer holds — what Escala is, how the tokens work, the Figma plugin,
// what the docs are based on, the changelog, legal — is reference reading that
// needs no workspace to be useful, and on a phone it used to be unreachable:
// the only door to it was a burger button inside the desktop shell. So the
// same `AboutAccordion`/`AboutContact` render here, from the SAME `SECTIONS`
// array. The desktop-only message stays as the lead, because that's still the
// first thing a phone visitor needs to know.
function DesktopOnlyNotice() {
  // Collapsed by default, exactly like the drawer: a list of six labels, not
  // six essays. Nothing pre-opens here — there's no entry point that could
  // have asked for a specific section, unlike the drawer's `openAbout(s)`.
  const [section, setSection] = useState<AboutSection | null>(null)

  return (
    <div className="md:hidden min-h-screen flex flex-col bg-app text-fg">
      {/* Lead — the one thing that IS about this being a phone. */}
      <header className="flex flex-col items-center gap-4 px-6 pt-12 pb-8 text-center">
        <BrandMark />
        <div className="flex flex-col gap-1.5 max-w-[300px]">
          <h1 className="text-[15px] font-semibold text-fg">Optimized for desktop</h1>
          <p className="text-[13px] leading-relaxed text-fg-muted">
            Escala Tokens is a design token workspace built for a laptop or desktop screen.
            Open it there to configure and export your system.
          </p>
        </div>
      </header>

      {/* Everything else is the About drawer's own content, unchanged. */}
      <div className="border-t border-line">
        <div className="px-5 pt-5 pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-fg-faint">
            About
          </span>
          <p className="text-[11.5px] text-fg-faint mt-0.5">
            Design token infrastructure · schema v{TOKEN_SCHEMA_VERSION}
          </p>
        </div>
        <div className="mt-3 border-t border-line">
          <AboutAccordion section={section} onSectionChange={setSection} />
          <AboutContact />
        </div>
      </div>

      {/* `mt-auto` pins this to the bottom on a short list and lets it flow
          after the content once a section is expanded. */}
      <footer className="mt-auto px-5 py-4 border-t border-line">
        <p className="text-[11px] text-fg-faint">
          {COPYRIGHT_LINE} · All rights reserved. Figma is a trademark of Figma, Inc.
        </p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <>
      <DesktopOnlyNotice />
      <main className="hidden md:block min-h-screen bg-app text-fg">
        <Configurator />
      </main>
    </>
  )
}

export default App
