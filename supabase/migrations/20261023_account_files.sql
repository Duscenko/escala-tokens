-- "My files" for each signed-in account: the design system on screen, its
-- saved systems and Figma sync choices (`api/account-files.ts`). Moved here
-- from Vercel Blob on 2026-10-23, when the Hobby Blob store was suspended for
-- quota and every account save failed.
--
-- One row per account. `etag` changes on every write; the server only updates
-- the row whose etag the browser last read, so a stale browser gets a 409 and
-- can never overwrite work saved in another browser.

create table if not exists public.account_files (
  user_id uuid primary key references auth.users (id) on delete cascade,
  etag text not null,
  record jsonb not null,
  updated_at timestamptz not null default now()
);

-- No policies on purpose: only the server, with the service role key, reads or
-- writes this table. A browser holding its own session token cannot reach it,
-- so the plan's design-system limit (trimmed on the server) always holds.
alter table public.account_files enable row level security;
revoke all on public.account_files from anon, authenticated;
