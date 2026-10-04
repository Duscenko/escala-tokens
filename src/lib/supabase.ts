import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ACCOUNTS_LIVE } from './legal'

// The ONE Supabase client. Accounts are optional and off until ACCOUNTS_LIVE
// (src/lib/legal.ts) flips, so in production today this module creates nothing:
// no client, no session in localStorage, no request to Supabase. That keeps the
// privacy page's "no accounts" statement true until the same change that makes
// accounts real also rewrites it. In `vite dev` it is on so the flow can be built.
//
// URL and publishable key are public by design (RLS is what protects data). The
// service-role key never belongs in `src/` or in a `VITE_*` variable.

// Read through a typed view of `import.meta.env`: this file is also compiled by
// tsconfig.test.json, which deliberately has no `vite/client` types.
const env = (import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env ?? {}
const url = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL : undefined
const key = typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY : undefined

export const accountsEnabled: boolean = Boolean(url && key) && (ACCOUNTS_LIVE || env.DEV === true)

export const supabase: SupabaseClient | null = accountsEnabled
  ? createClient(url as string, key as string, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

/** Social sign-in buttons to offer. Empty until the provider is configured in
 *  Supabase (Authentication → Sign In / Providers) AND listed here through
 *  `VITE_AUTH_PROVIDERS="google,github"`, so a button never appears that cannot work.
 *  They ask for identity only — never repository access (GitHubConnectView owns that). */
export type AuthProvider = 'google' | 'github'
export const authProviders: AuthProvider[] = (typeof env.VITE_AUTH_PROVIDERS === 'string' ? env.VITE_AUTH_PROVIDERS : '')
  .split(',')
  .map((p) => p.trim())
  .filter((p): p is AuthProvider => p === 'google' || p === 'github')
