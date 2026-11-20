// The screens' sitemap: the paths the Figma file's DocWindow shows in its address pill (`Url`), one per screen and
// settings section. The prototype (`ScreenPrototype`) keeps one path and draws the screen it names; a screen's
// navigation items call `onNavigate` with one of these paths. The host is the demo product's, as the file has it.

export const SCREEN_HOST = 'app.ohmewn.com'

export const SETTINGS_SECTIONS = ['general', 'appearance', 'notifications', 'security', 'members', 'billing'] as const
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]

export const settingsPath = (section: SettingsSectionId) => `/settings/${section}`

export const SCREEN_ROUTES = {
  /** IssueBoardPage: the Payments 2.0 board (`app.ohmewn.com/payments/board` in the file). */
  board: '/payments/board',
  /** SettingsPage: General (`app.ohmewn.com/settings/general` in the file). */
  settings: settingsPath('general'),
} as const

export type ScreenName = 'IssueBoardPage' | 'SettingsPage'

export interface SitemapEntry { path: string; screen: ScreenName; title: string }

/** Every path the prototype can show, in navigation order. */
export const SCREEN_SITEMAP: readonly SitemapEntry[] = [
  { path: SCREEN_ROUTES.board, screen: 'IssueBoardPage', title: 'Payments 2.0 · Board' },
  ...SETTINGS_SECTIONS.map((s): SitemapEntry => ({ path: settingsPath(s), screen: 'SettingsPage', title: `Settings · ${s[0].toUpperCase()}${s.slice(1)}` })),
]

/** The screen a path draws; an unknown path falls back to the board. */
export function screenOf(path: string): ScreenName {
  return SCREEN_SITEMAP.find((e) => e.path === path)?.screen ?? 'IssueBoardPage'
}

/** The address the DocWindow shows for a path. */
export const screenUrl = (path: string) => `${SCREEN_HOST}${path}`
