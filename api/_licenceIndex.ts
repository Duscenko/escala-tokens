import { put } from '@vercel/blob'
import { forgetBlob, learnBlobBase, readJsonBlob } from './_blob.js'
import { licenceKeyHash } from './_licence.js'
import { stripLicence } from '../src/lib/licenceGate.js'
import { tokenBlobKey } from '../src/lib/publishTrust.js'

// keyHash → the slugs published with that key. The raw key is not in the blob.
// A refund webhook reads this and strips each stamp, so hosted sync stops the
// same day instead of waiting out the 30-day seal. Public, like the token
// blobs: the reader fetches the public URL and must not spend a Blob head().

const MAX_PROJECTS = 50

export function licenceSlugKey(hash: string): string {
  return `licence-slugs/${hash}.json`
}

async function writePublic(key: string, json: string): Promise<void> {
  const stored = await put(key, json, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  })
  learnBlobBase(stored.url, key)
  forgetBlob(key)
}

/** Best-effort. A failure here must not turn a successful publish into a 500. */
export async function rememberLicenceSlug(key: string, project: string): Promise<void> {
  const blobKey = licenceSlugKey(licenceKeyHash(key))
  const existing = await readJsonBlob<{ projects?: unknown }>(blobKey)
  const projects = Array.isArray(existing?.projects)
    ? existing.projects.filter((p): p is string => typeof p === 'string' && p.length > 0)
    : []
  if (!projects.includes(project)) projects.push(project)
  await writePublic(blobKey, JSON.stringify({ projects: projects.slice(-MAX_PROJECTS) }))
}

/** Strip the licence stamp from every system this key published. The payload
 *  stays; the next read is a 402. Returns the slugs it cleared. */
export async function revokeLicenceStamps(key: string): Promise<string[]> {
  const blobKey = licenceSlugKey(licenceKeyHash(key))
  const existing = await readJsonBlob<{ projects?: unknown }>(blobKey, { fresh: true })
  const projects = Array.isArray(existing?.projects)
    ? existing.projects.filter((p): p is string => typeof p === 'string' && p.length > 0)
    : []
  const cleared: string[] = []
  for (const project of projects) {
    const tokenKey = tokenBlobKey(project)
    const data = await readJsonBlob<Record<string, unknown>>(tokenKey, { fresh: true })
    if (!data || typeof data !== 'object') continue
    await writePublic(tokenKey, JSON.stringify(stripLicence(data)))
    cleared.push(project)
  }
  return cleared
}
