// The screens as the Figma file presents them in each `<Screen> Prototype` section: the desktop build inside
// `DocWindow` (1440 × 900 at 0.75, the address pill showing the current path) and the mobile build inside the 390 frame.
// One path is kept in state (see `sitemap.ts`); the screens' navigation moves it, so the window walks the sitemap:
// the board's account menu opens Settings, Settings' sidebar scrolls between sections, "Back to workspace" returns.
import * as React from 'react'
import { DESKTOP_FRAME, DocWindow, MOBILE_SCREEN, MobileScreenFrame } from '../blocks/frames'
import { IssueBoardPage, SettingsPage, type ScreenLayout, type ScreenPhotos } from './screens'
import { SCREEN_ROUTES, screenOf, screenUrl } from './sitemap'

export interface ScreenPrototypeProps {
  /** The path the prototype opens on (`/payments/board`, `/settings/general` …). */
  initialPath?: string
  /** desktop = DocWindow · mobile = the 390 frame. */
  layout?: ScreenLayout
  photos?: ScreenPhotos
  /** The mobile frame's height (844 for the board, 933 for settings in the file). */
  mobileHeight?: number
  /** Called whenever the prototype moves to another path. */
  onPathChange?: (path: string) => void
}

export function ScreenPrototype({ initialPath = SCREEN_ROUTES.board, layout = 'desktop', photos, mobileHeight, onPathChange }: ScreenPrototypeProps) {
  const [path, setPath] = React.useState(initialPath)
  React.useEffect(() => setPath(initialPath), [initialPath])
  const navigate = React.useCallback((next: string) => { setPath(next); onPathChange?.(next) }, [onPathChange])
  const screen = screenOf(path)
  const Screen = screen === 'SettingsPage' ? SettingsPage : IssueBoardPage
  const label = `${screen} prototype`
  if (layout === 'mobile') {
    const height = mobileHeight ?? (screen === 'SettingsPage' ? 933 : MOBILE_SCREEN.height)
    return (
      <MobileScreenFrame label={label} height={height}>
        <Screen key={screen} layout="mobile" path={path} photos={photos} onNavigate={navigate} style={{ flex: 1 }} />
      </MobileScreenFrame>
    )
  }
  return (
    <DocWindow url={screenUrl(path)} label={label} screenSize={DESKTOP_FRAME}>
      <Screen key={screen} layout="desktop" path={path} photos={photos} onNavigate={navigate} />
    </DocWindow>
  )
}
