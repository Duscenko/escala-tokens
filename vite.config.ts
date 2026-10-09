import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { POLAR_ORGANIZATION_ID, POLAR_VALIDATE_URL, interpretValidation } from './src/lib/polar.ts'

function devLicenceKey(): string {
  try {
    const text = readFileSync(fileURLToPath(new URL('./.env.local', import.meta.url)), 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('VITE_DEV_LICENCE_KEY=')) continue
      let value = trimmed.slice('VITE_DEV_LICENCE_KEY='.length).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      return value
    }
  } catch {
    // No local env: localhost stays on whatever key the browser already saved.
  }
  return ''
}

// Local only. Reads the gitignored test key and answers POST /api/license the
// same way production does, so a saved key can become Pro on localhost.
function devLicence(): Plugin {
  const key = devLicenceKey()
  return {
    name: 'escala-dev-licence',
    apply: 'serve',
    enforce: 'pre',
    transform(code, id) {
      if (!key || !id.replaceAll('\\', '/').includes('/src/lib/licence.ts')) return
      const slot = 'null /* dev-licence-slot */'
      if (!code.includes(slot)) return
      return code.replace(slot, JSON.stringify(key))
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path !== '/api/license' || req.method !== 'POST') return next()
        try {
          const raw = await new Promise<string>((resolve, reject) => {
            const chunks: Buffer[] = []
            req.on('data', (chunk: Buffer) => chunks.push(chunk))
            req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
            req.on('error', reject)
          })
          const parsed = JSON.parse(raw || '{}') as { key?: unknown }
          const licence = typeof parsed.key === 'string' ? parsed.key.trim() : ''
          if (!licence || licence.length > 200) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'invalid_key' }))
            return
          }
          const polar = await fetch(POLAR_VALIDATE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: licence, organization_id: POLAR_ORGANIZATION_ID }),
          })
          const body = await polar.json().catch(() => null)
          const result = interpretValidation(polar.status, body, new Date())
          res.statusCode = result.reason === 'unavailable' ? 502 : 200
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(result))
        } catch {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ valid: false, expiresAt: null, reason: 'unavailable' }))
        }
      })
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(command === 'serve' ? [devLicence()] : []),
  ],
  // The preview harness hands each session a free port through PORT (autoPort);
  // plain `vite` ignores it, so a second chat's server would collide on 5173.
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
