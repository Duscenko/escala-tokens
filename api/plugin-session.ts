import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put } from '@vercel/blob'
import { originAllowed, originsForHosts, parseBearer } from '../src/lib/publishTrust.js'
import {
  isPluginPairCode,
  upsertPluginLibraries,
  type PluginLibrary,
} from '../src/lib/pluginSession.js'
import { checkLicenceKey } from './_licence.js'
import type { StudioChoices } from '../src/lib/pluginStudio.js'
import { entitlementAt, FREE_MAX_THEMES, PRO_MAX_THEMES } from '../src/lib/entitlement.js'
import { clientIp, forgetBlob, learnBlobBase, rateLimited, readJsonBlob } from './_blob.js'

// The Figma plugin cannot share the browser session. Sign-in is a short-lived
// code opened on escalatokens.com; this handler binds it to the account and
// hands the plugin a token it stores in clientStorage. Libraries are the
// publish ids that account has published — the plugin lists names, never the id.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const PAIR_TTL_MS = 10 * 60 * 1000
const PAIR_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

type PairRecord = {
  secretHash: string
  expiresAt: number
  status: 'pending' | 'ready' | 'used'
  userId?: string
  email?: string
  sealed?: string
}

// `proUntil` is the instant a validated licence stops working ('lifetime' when
// Polar gave it no expiry). The licence KEY is never stored: this blob is public.
type SessionRecord = { userId: string; email: string; revoked?: boolean; proUntil?: string }

/** What this plugin session may do. Pro is the launch promo OR a licence the
 *  browser vouched for at sign-in. Free keeps ONE theme in ONE mode. */
function tierOf(session: Pick<SessionRecord, 'proUntil'> | null | undefined, now = new Date()) {
  const promo = entitlementAt(now).promo
  const licensed = !!session?.proUntil && (session.proUntil === 'lifetime' || Date.parse(session.proUntil) > now.getTime())
  const pro = promo || licensed
  return { tier: pro ? 'pro' as const : 'free' as const, maxThemes: pro ? PRO_MAX_THEMES : FREE_MAX_THEMES }
}
type LibraryRecord = { libraries: PluginLibrary[] }

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function pairKey(code: string): string {
  return `plugin-pair/${code}.json`
}
function sessionKey(tokenHash: string): string {
  return `plugin-session/${tokenHash}.json`
}
function librariesKey(userId: string): string {
  return `plugin-libraries/${sha256(userId)}.json`
}

function seal(secret: string, plaintext: string): string {
  const key = createHash('sha256').update(secret).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64url')
}

function unseal(secret: string, payload: string): string | null {
  try {
    const buf = Buffer.from(payload, 'base64url')
    if (buf.length < 29) return null
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const enc = buf.subarray(28)
    const key = createHash('sha256').update(secret).digest()
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

function requestOrigins(req: VercelRequest): string[] {
  return originsForHosts([
    req.headers.host,
    req.headers['x-forwarded-host'] as string | undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ])
}

async function writeJson(key: string, value: unknown): Promise<void> {
  const out = await put(key, JSON.stringify(value), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  })
  learnBlobBase(out.url, key)
  forgetBlob(key)
}

function supabaseEnv(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  if (!url || !key) return null
  return { url, key }
}

async function userFromJwt(jwt: string): Promise<{ id: string; email: string } | 'unconfigured' | null> {
  const env = supabaseEnv()
  if (!env) return 'unconfigured'
  if (!jwt || jwt.length > 8192) return null
  let res: Response
  try {
    res = await fetch(`${env.url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: env.key },
    })
  } catch {
    return null
  }
  if (!res.ok) return null
  const body = await res.json().catch(() => null) as { id?: unknown; email?: unknown } | null
  if (!body || typeof body.id !== 'string' || !body.id) return null
  const email = typeof body.email === 'string' ? body.email.slice(0, 200) : ''
  return { id: body.id, email }
}

function readOp(req: VercelRequest): string {
  const q = req.query?.op
  return (Array.isArray(q) ? q[0] : q) ?? ''
}

function jsonBody(req: VercelRequest): Record<string, unknown> {
  const body = req.body
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
}

async function readLibraries(userId: string): Promise<PluginLibrary[]> {
  const stored = await readJsonBlob<LibraryRecord>(librariesKey(userId), { fresh: true })
  return stored && Array.isArray(stored.libraries) ? stored.libraries : []
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS).end()
    return
  }
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v))
  res.setHeader('Cache-Control', 'no-store')

  const op = readOp(req)
  const ip = clientIp(req.headers)

  // ── Plugin opens a code. No session yet. Figma's origin is not ours. ──
  if (op === 'start' && req.method === 'POST') {
    if (rateLimited(`${ip}:plugin-start`, 20)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ error: 'Too many requests.' })
    }
    const secret = randomBytes(24).toString('base64url')
    let code = ''
    for (let attempt = 0; attempt < 4; attempt++) {
      const bytes = randomBytes(10)
      code = [...bytes].map((b) => PAIR_ALPHABET[b % PAIR_ALPHABET.length]).join('')
      const existing = await readJsonBlob<PairRecord>(pairKey(code), { fresh: true }).catch(() => null)
      if (!existing) break
      code = ''
    }
    if (!code || !isPluginPairCode(code)) return res.status(503).json({ error: 'Could not start sign-in. Try again.' })
    const record: PairRecord = {
      secretHash: sha256(secret),
      expiresAt: Date.now() + PAIR_TTL_MS,
      status: 'pending',
    }
    try {
      await writeJson(pairKey(code), record)
    } catch {
      return res.status(503).json({ error: 'Could not start sign-in. Try again.' })
    }
    return res.status(200).json({ code, pollSecret: secret })
  }

  // ── Plugin polls until the browser confirms. ──
  if (op === 'poll' && req.method === 'POST') {
    if (rateLimited(`${ip}:plugin-poll`, 40)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ error: 'Too many requests.' })
    }
    const body = jsonBody(req)
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    const secret = typeof body.pollSecret === 'string' ? body.pollSecret : ''
    if (!isPluginPairCode(code) || !secret || secret.length > 200) {
      return res.status(401).json({ error: 'This sign-in expired. Press Sign in again.' })
    }
    const pair = await readJsonBlob<PairRecord>(pairKey(code), { fresh: true }).catch(() => null)
    if (!pair || pair.expiresAt < Date.now() || pair.secretHash !== sha256(secret)) {
      return res.status(401).json({ error: 'This sign-in expired. Press Sign in again.' })
    }
    if (pair.status !== 'ready' || !pair.sealed || !pair.userId) {
      return res.status(200).json({ pending: true })
    }
    // Sealed with the secret's hash — the raw secret never sits in the blob.
    const token = unseal(sha256(secret), pair.sealed)
    if (!token) return res.status(401).json({ error: 'This sign-in expired. Press Sign in again.' })
    try {
      await writeJson(pairKey(code), { secretHash: pair.secretHash, expiresAt: pair.expiresAt, status: 'used' } satisfies PairRecord)
    } catch {
      // The token is already in the plugin's hands on the next line. A failed
      // wipe leaves a sealed blob that still needs the poll secret.
    }
    const libraries = await readLibraries(pair.userId).catch(() => [])
    const fresh = await readJsonBlob<SessionRecord>(sessionKey(sha256(token)), { fresh: true }).catch(() => null)
    return res.status(200).json({ token, email: pair.email ?? '', libraries, ...tierOf(fresh) })
  }

  // ── Signed-in browser confirms the code and registers libraries. ──
  if (op === 'approve' && req.method === 'POST') {
    if (!originAllowed(req.headers.origin, requestOrigins(req))) {
      return res.status(403).json({ error: 'Confirm sign-in from this app.' })
    }
    if (rateLimited(`${ip}:plugin-approve`, 20)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ error: 'Too many requests.' })
    }
    const user = await userFromJwt(parseBearer(req.headers.authorization) ?? '')
    if (user === 'unconfigured') return res.status(503).json({ error: 'Accounts are not configured on the server.' })
    if (!user) return res.status(401).json({ error: 'Sign in on escalatokens.com first.' })
    const body = jsonBody(req)
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    if (!isPluginPairCode(code)) return res.status(400).json({ error: 'This sign-in link is not valid.' })
    const pair = await readJsonBlob<PairRecord>(pairKey(code), { fresh: true }).catch(() => null)
    if (!pair || pair.status !== 'pending' || pair.expiresAt < Date.now()) {
      return res.status(401).json({ error: 'This sign-in expired. Press Sign in in the plugin again.' })
    }
    const token = randomBytes(32).toString('base64url')
    let proUntil: string | undefined
    const licenceKey = typeof body.licenceKey === 'string' ? body.licenceKey.trim().slice(0, 200) : ''
    if (licenceKey) {
      const checked = await checkLicenceKey(licenceKey)
      if (checked.valid) proUntil = checked.expiresAt ?? 'lifetime'
    }
    // The blob is public. The raw token is sealed with the secret's hash,
    // which poll reconstructs from the secret only the plugin holds.
    const sealed = seal(pair.secretHash, token)
    const incoming = Array.isArray(body.libraries) ? body.libraries as Array<{ id?: unknown; name?: unknown }> : []
    try {
      const libraries = upsertPluginLibraries(await readLibraries(user.id), incoming, new Date().toISOString())
      await writeJson(librariesKey(user.id), { libraries } satisfies LibraryRecord)
      await writeJson(sessionKey(sha256(token)), { userId: user.id, email: user.email, ...(proUntil ? { proUntil } : {}) } satisfies SessionRecord)
      await writeJson(pairKey(code), {
        secretHash: pair.secretHash,
        expiresAt: pair.expiresAt,
        status: 'ready',
        userId: user.id,
        email: user.email,
        sealed,
      } satisfies PairRecord)
    } catch {
      return res.status(503).json({ error: 'Could not connect the plugin. Try again.' })
    }
    return res.status(200).json({ ok: true })
  }

  // ── A later Sync now adds the library without a new pairing. ──
  if (op === 'register' && req.method === 'POST') {
    if (!originAllowed(req.headers.origin, requestOrigins(req))) {
      return res.status(403).json({ error: 'Publish only from this app.' })
    }
    const user = await userFromJwt(parseBearer(req.headers.authorization) ?? '')
    if (user === 'unconfigured') return res.status(503).json({ error: 'Accounts are not configured on the server.' })
    if (!user) return res.status(401).json({ error: 'Sign in first.' })
    const body = jsonBody(req)
    const incoming = Array.isArray(body.libraries) ? body.libraries as Array<{ id?: unknown; name?: unknown }> : []
    try {
      const libraries = upsertPluginLibraries(await readLibraries(user.id), incoming, new Date().toISOString())
      await writeJson(librariesKey(user.id), { libraries } satisfies LibraryRecord)
    } catch {
      return res.status(503).json({ error: 'Could not save the library list.' })
    }
    return res.status(200).json({ ok: true })
  }

  // ── Plugin, signed in: the native theme setup. Options are the web's own
  //    lists; build applies the choices with the web's own code. ──
  if ((op === 'studio-options' && req.method === 'GET') || (op === 'studio-build' && req.method === 'POST') || (op === 'studio-code' && req.method === 'POST')) {
    // No account needed: anyone can build ONE theme in ONE mode in the plugin
    // (the Free scope). A token, when sent, must still be a live session — a
    // stale one answers 401 so the plugin signs in again instead of silently
    // dropping a Pro user to Free.
    const token = parseBearer(req.headers.authorization) ?? ''
    if (token.length > 200) return res.status(401).json({ error: 'Sign in again.' })
    let session: SessionRecord | null = null
    if (token) {
      session = await readJsonBlob<SessionRecord>(sessionKey(sha256(token)), { fresh: true }).catch(() => null)
      if (!session || session.revoked || !session.userId) return res.status(401).json({ error: 'Sign in again.' })
    }
    // Loaded on demand from the prebuilt bundle (scripts/build-plugin-studio.mjs):
    // the generator graph can't load as plain Node ESM, and a failure here must
    // never take sign-in down with it.
    const studio = await import('./_pluginStudio.mjs') as typeof import('../src/lib/pluginStudio.js')
    if (op === 'studio-options') {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300')
      return res.status(200).json(studio.studioOptions())
    }
    if (op === 'studio-code') {
      if (rateLimited(`${ip}:plugin-studio-code`, 30)) {
        res.setHeader('Retry-After', '60')
        return res.status(429).json({ error: 'Too many requests.' })
      }
      const body = jsonBody(req)
      const out = studio.readCode(typeof body.css === 'string' ? body.css : '', typeof body.name === 'string' ? body.name.slice(0, 60) : undefined)
      return out.ok ? res.status(200).json(out.reading) : res.status(400).json({ error: out.error })
    }
    if (rateLimited(`${ip}:plugin-studio`, 30)) {
      res.setHeader('Retry-After', '60')
      return res.status(429).json({ error: 'Too many requests.' })
    }
    const built = studio.buildStudioTokens(jsonBody(req) as unknown as StudioChoices, session ? tierOf(session).tier : 'free')
    if ('error' in built) return res.status(400).json({ error: built.error })
    return res.status(200).json(built)
  }

  // ── Plugin, signed in: list or sign out. Bearer is the plugin token. ──
  if ((op === 'libraries' || op === 'signout') && (req.method === 'GET' || req.method === 'POST')) {
    const token = parseBearer(req.headers.authorization) ?? ''
    if (!token || token.length > 200) return res.status(401).json({ error: 'Sign in again.' })
    const session = await readJsonBlob<SessionRecord>(sessionKey(sha256(token)), { fresh: true }).catch(() => null)
    if (!session || session.revoked || !session.userId) return res.status(401).json({ error: 'Sign in again.' })
    if (op === 'signout') {
      try {
        await writeJson(sessionKey(sha256(token)), { ...session, revoked: true })
      } catch {
        return res.status(503).json({ error: 'Could not sign out. Try again.' })
      }
      return res.status(200).json({ ok: true })
    }
    const libraries = await readLibraries(session.userId).catch(() => [])
    return res.status(200).json({ email: session.email, libraries, ...tierOf(session) })
  }

  return res.status(405).json({ error: 'Method not allowed.' })
}
