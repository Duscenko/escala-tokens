/**
 * `npx tsx scripts/gen-chrome-theme.ts`
 *
 * Regenerates `src/lib/chromeTheme.generated.css` — the chrome neutrals
 * (`--app` / `--surface` / `--elevated` / `--line` / `--fg` / `--fg-muted`)
 * resolved from the platform's own foundations (`src/lib/platformFoundations.json`).
 *
 * Same contract as the other `gen:*` scripts: the output is COMMITTED, and
 * `__tests__/chromeTheme.test.ts` asserts regenerating is a no-op.
 */

import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderChromeThemeCss } from '../src/lib/chromeTheme'

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../src/lib/chromeTheme.generated.css')
const css = renderChromeThemeCss()
writeFileSync(out, css)
console.log(`wrote ${out}`)
