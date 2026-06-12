// Bundles the sibling Figma plugin (manifest + build output) into a downloadable
// zip served from /public, so the "Bring to Figma" view can hand it to designers.
//
// The plugin lives in a SEPARATE repo (../scalable-designs-figma-plugin) that is
// NOT present on Vercel's build, so the resulting zip is committed as a static
// asset. Re-run this and commit the zip whenever the plugin changes:
//
//   npm run bundle:plugin
//
import { execFileSync } from 'node:child_process'
import { existsSync, rmSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const pluginDir = path.resolve(repoRoot, '..', 'scalable-designs-figma-plugin')
const publicDir = path.resolve(repoRoot, 'public')
const out = path.join(publicDir, 'scalable-designs-figma-plugin.zip')

const manifest = path.join(pluginDir, 'manifest.json')
const dist = path.join(pluginDir, 'dist')

if (!existsSync(manifest) || !existsSync(dist)) {
  console.warn(
    `[bundle-plugin] Skipped — plugin sources not found at ${pluginDir}.\n` +
      '  This is expected on CI/Vercel; the committed public/ zip is used instead.',
  )
  process.exit(0)
}

mkdirSync(publicDir, { recursive: true })
rmSync(out, { force: true })

// `zip` ships with macOS/Linux. -r recurse dist/, -X strip extra attrs, exclude cruft.
execFileSync('zip', ['-r', '-X', out, 'manifest.json', 'dist', '-x', '*.DS_Store'], {
  cwd: pluginDir,
  stdio: 'inherit',
})

console.log(`[bundle-plugin] Wrote ${path.relative(repoRoot, out)}`)
