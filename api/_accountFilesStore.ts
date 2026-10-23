import { randomUUID } from 'node:crypto'
import { isCloudRecord, type CloudRecord } from '../src/lib/accountCloud.js'

// Where an account's files live: one row of `public.account_files` in the
// Supabase project that already signs people in. The leading underscore keeps
// Vercel from deploying this file as its own function.
//
// Talks to PostgREST with the service role key, server side only — the table
// has RLS on and no policies (`supabase/migrations/20261023_account_files.sql`).

export interface StoredFiles {
  etag: string
  record: CloudRecord
}

/** Thrown for any answer that is not a clean one. The message is logged. */
export class StoreUnavailable extends Error {}

function adminEnv(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) return null
  return { url, key }
}

export function accountFilesConfigured(): boolean {
  return adminEnv() !== null
}

async function rest(path: string, init: RequestInit & { prefer?: string } = {}): Promise<Response> {
  const env = adminEnv()
  if (!env) throw new StoreUnavailable('unconfigured')
  // A legacy service_role key is a JWT and goes in both headers; a new
  // `sb_secret_…` key is not a JWT and only goes in `apikey`.
  const headers: Record<string, string> = { apikey: env.key, Accept: 'application/json' }
  if (!env.key.startsWith('sb_')) headers.Authorization = `Bearer ${env.key}`
  if (init.body) headers['Content-Type'] = 'application/json'
  if (init.prefer) headers.Prefer = init.prefer
  try {
    return await fetch(`${env.url}/rest/v1/${path}`, { ...init, headers })
  } catch (err) {
    throw new StoreUnavailable(`fetch: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function failed(res: Response, op: string): Promise<never> {
  const text = await res.text().catch(() => '')
  throw new StoreUnavailable(`${op} ${res.status} ${text.slice(0, 300)}`)
}

export async function readFiles(userId: string): Promise<StoredFiles | null> {
  const res = await rest(`account_files?user_id=eq.${encodeURIComponent(userId)}&select=etag,record`)
  if (!res.ok) return failed(res, 'read')
  const rows = await res.json() as Array<{ etag?: unknown; record?: unknown }>
  const row = rows[0]
  if (!row) return null
  if (typeof row.etag !== 'string' || !isCloudRecord(row.record)) throw new StoreUnavailable('corrupt row')
  return { etag: row.etag, record: row.record }
}

/**
 * Write `record` only if the row still holds `ifEtag` (null: only if there is
 * no row yet). The new etag, or `'stale'` when another save landed first.
 */
export async function writeFiles(userId: string, ifEtag: string | null, record: CloudRecord): Promise<string | 'stale'> {
  const etag = randomUUID()
  const now = new Date().toISOString()
  if (ifEtag === null) {
    const res = await rest('account_files', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({ user_id: userId, etag, record, updated_at: now }),
    })
    if (res.status === 409) return 'stale'
    if (!res.ok) return failed(res, 'insert')
    return etag
  }
  const res = await rest(
    `account_files?user_id=eq.${encodeURIComponent(userId)}&etag=eq.${encodeURIComponent(ifEtag)}&select=etag`,
    { method: 'PATCH', prefer: 'return=representation', body: JSON.stringify({ etag, record, updated_at: now }) },
  )
  if (!res.ok) return failed(res, 'update')
  const rows = await res.json() as unknown[]
  return rows.length === 1 ? etag : 'stale'
}
