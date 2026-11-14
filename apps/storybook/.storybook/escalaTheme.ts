import { create } from 'storybook/theming'

// Storybook's own chrome, in Escala's dark chrome (src/lib/chromeTheme.generated.css `.dark`) and the Figma file's
// accent (#874fff, `FIGMA_FILE_PALETTE.accent`). Literal hexes on purpose: the manager is a separate bundle that cannot
// read the app's CSS variables. If the chrome is regenerated, copy its `.dark` values here.
const CHROME = {
  app: '#131416', // surface.page
  surface: '#191a1b', // surface.layer-1
  elevated: '#1f1f21', // surface.layer-2
  fg: '#e4e5e6', // content.primary
  fgMuted: '#cccccf', // content.secondary
  line: '#ffffff1a', // border.subtle
  accent: '#874fff', // the Figma file's accent (Action/primary/default)
}

const base = {
  base: 'dark' as const,
  colorPrimary: CHROME.accent,
  colorSecondary: CHROME.accent,
  appBg: CHROME.app,
  appContentBg: CHROME.surface,
  appPreviewBg: CHROME.surface,
  appBorderColor: CHROME.line,
  appBorderRadius: 8,
  fontBase: '"Inter", ui-sans-serif, system-ui, sans-serif',
  fontCode: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  textColor: CHROME.fg,
  textMutedColor: CHROME.fgMuted,
  textInverseColor: CHROME.app,
  barTextColor: CHROME.fgMuted,
  barSelectedColor: CHROME.fg,
  barHoverColor: CHROME.fg,
  barBg: CHROME.app,
  inputBg: CHROME.elevated,
  inputBorder: CHROME.line,
  inputTextColor: CHROME.fg,
  inputBorderRadius: 8,
}

/** The sidebar, toolbar and panels. */
export const escalaManagerTheme = create({
  ...base,
  brandTitle: 'Escala Design System',
  brandUrl: 'https://www.escalatokens.com',
  brandImage: './brand/escala-logo-dark.svg',
  brandTarget: '_blank',
})

/** Documentation pages (Introduction, Variables, each component's Documentation). */
export const escalaDocsTheme = create({ ...base, appContentBg: CHROME.app, appPreviewBg: CHROME.surface })
