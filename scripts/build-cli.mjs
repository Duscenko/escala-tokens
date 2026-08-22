// Bundle `@escala/cli` from the same `buildAgentProductFiles` the wizard uses.
// Output: cli/dist/escala.js — the only file the published package ships.

import * as esbuild from 'esbuild'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outfile = path.join(root, 'cli', 'dist', 'escala.js')

mkdirSync(path.dirname(outfile), { recursive: true })

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [path.join(root, 'src/cli/main.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile,
  banner: { js: '#!/usr/bin/env node' },
  logLevel: 'info',
})
