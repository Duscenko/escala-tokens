import { addons } from 'storybook/manager-api'
import { escalaManagerTheme } from './escalaTheme'

addons.setConfig({
  theme: escalaManagerTheme,
  sidebar: { showRoots: true },
})
