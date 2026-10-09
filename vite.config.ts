import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { licenceCookieHeader, readLicenceCookie } from './src/lib/licenceCookie.ts'
import {
  POLAR_ACTIVATE_URL, POLAR_ORGANIZATION_ID, POLAR_VALIDATE_URL,
  interpretValidation, isActivationId, licenceFollowup,
} from './src/lib/polar.ts'

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

async function polarPost(url: string, body: Record<string, string>) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: r.status, body: await r.json().catch(() => null) }
}

// Same follow-up as `api/_licence.ts`: validate first, and activate only when
// Polar says this benefit limits activations.
async function devCheck(licence: string, activationId: string | null) {
  const org = { key: licence, organization_id: POLAR_ORGANIZATION_ID }
  const first = await polarPost(POLAR_VALIDATE_URL, org)
  const plan = licenceFollowup(first.status, first.body, activationId, new Date())
  if (plan.kind === 'done') return plan.result
  if (plan.kind === 'revalidate') {
    const second = await polarPost(POLAR_VALIDATE_URL, { ...org, activation_id: plan.activationId })
    if (second.status === 403) return { valid: false, expiresAt: null, reason: 'activation_limit' as const, activationId: plan.activationId }
    return { ...interpretValidation(second.status, second.body, new Date()), activationId: plan.activationId }
  }
  const activated = await polarPost(POLAR_ACTIVATE_URL, { ...org, label: 'Escala' })
  const newId = activated.body && typeof activated.body === 'object' ? (activated.body as { id?: unknown }).id : undefined
  if (activated.status === 403) return { valid: false, expiresAt: null, reason: 'activation_limit' as const }
  if (activated.status !== 200 || !isActivationId(newId)) {
    return { valid: false, expiresAt: null, reason: 'unavailable' as const }
  }
  const second = await polarPost(POLAR_VALIDATE_URL, { ...org, activation_id: newId })
  if (second.status === 403) return { valid: false, expiresAt: null, reason: 'activation_limit' as const, activationId: newId }
  return { ...interpretValidation(second.status, second.body, new Date()), activationId: newId }
}

// Local only. Reads the gitignored test key and answers /api/license the same
// way production does, including the HttpOnly cookie, so a saved key can
// become Pro on localhost.
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
        if (path !== '/api/license') return next()
        res.setHeader('Cache-Control', 'no-store')
        if (req.method === 'DELETE') {
          res.setHeader('Set-Cookie', licenceCookieHeader(''))
          res.statusCode = 204
          res.end()
          return
        }
        if (req.method !== 'POST' && req.method !== 'GET') return next()
        try {
          const raw = req.method === 'POST'
            ? await new Promise<string>((resolve, reject) => {
              const chunks: Buffer[] = []
              req.on('data', (chunk: Buffer) => chunks.push(chunk))
              req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
              req.on('error', reject)
            })
            : ''
          const parsed = req.method === 'POST' ? JSON.parse(raw || '{}') as { key?: unknown; activationId?: unknown } : {}
          const licence = req.method === 'POST'
            ? (typeof parsed.key === 'string' ? parsed.key.trim() : '')
            : readLicenceCookie(req.headers.cookie)
          if (req.method === 'GET' && !licence) {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ valid: false, expiresAt: null, hasKey: false, stored: false }))
            return
          }
          if (!licence || licence.length > 200) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'invalid_key' }))
            return
          }
          const activationId = isActivationId(parsed.activationId) ? parsed.activationId : null
          const result = await devCheck(licence, activationId)
          const keep = result.valid || result.reason === 'unavailable' || result.reason === 'activation_limit'
          if (keep) res.setHeader('Set-Cookie', licenceCookieHeader(licence))
          else if (req.method === 'GET') res.setHeader('Set-Cookie', licenceCookieHeader(''))
          res.statusCode = result.reason === 'unavailable' ? 502 : 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ...result, stored: keep, hasKey: keep }))
        } catch {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ valid: false, expiresAt: null, reason: 'unavailable', stored: false, hasKey: false }))
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
