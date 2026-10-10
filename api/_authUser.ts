// "Whose session is this?" — asked of Supabase with the browser's access token.
// The leading underscore keeps Vercel from deploying this file as a function.
// Shared so the plugin sign-in and the licence check agree on what a signed-in
// request is.

function supabaseEnv(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  if (!url || !key) return null
  return { url, key }
}

/** `'unconfigured'` when the server has no Supabase project to ask. `null`
 *  when the token is missing, malformed, or Supabase does not accept it. */
export async function userFromJwt(jwt: string): Promise<{ id: string; email: string } | 'unconfigured' | null> {
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
