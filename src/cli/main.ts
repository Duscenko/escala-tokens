// Node adapter for `@escala/cli`. Logic lives in `src/lib/cliInstall.ts`.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runCli } from '../lib/cliInstall'

async function main(): Promise<void> {
  const cwd = process.cwd()
  const code = await runCli(process.argv.slice(2), {
    cwd,
    fetch: (url) => fetch(url),
    readFile: (filePath) => {
      try {
        return readFileSync(resolve(filePath), 'utf8')
      } catch {
        return null
      }
    },
    writeFile: (filePath, text) => {
      writeFileSync(resolve(filePath), text)
    },
    mkdirp: (dir) => {
      mkdirSync(resolve(dir), { recursive: true })
    },
    log: (msg) => { console.log(msg) },
    error: (msg) => { console.error(msg) },
  })
  process.exit(code)
}

void main()
