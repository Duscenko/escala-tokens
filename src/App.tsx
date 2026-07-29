import Configurator from './pages/Configurator'
import { BrandMark } from './components/configurator/TopNav'

// Escala is a dense token-editing workspace built for a laptop/desktop
// keyboard-and-mouse session — not a responsive site (see CLAUDE.md's
// "Platform" note). Below `md` (768px) there's no adaptive layout to fall
// back to, so rather than let the shell render half-broken, a static notice
// takes its place. Pure CSS (`md:hidden` / `hidden md:block`), not a JS
// viewport check — no flash of the wrong screen on load, no resize listener.
function DesktopOnlyNotice() {
  return (
    <div className="md:hidden min-h-screen flex flex-col items-center justify-center gap-5 px-8 text-center bg-app text-fg">
      <BrandMark />
      <div className="flex flex-col gap-1.5 max-w-[280px]">
        <h1 className="text-[15px] font-semibold text-fg">Optimized for desktop</h1>
        <p className="text-[13px] leading-relaxed text-fg-muted">
          Escala Tokens is a design token workspace built for a laptop or desktop screen.
          Open it there to configure and export your system.
        </p>
      </div>
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
