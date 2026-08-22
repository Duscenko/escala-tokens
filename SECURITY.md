# Security

Report vulnerabilities privately to the repository owner (GitHub Security Advisory on this repo, or an email to the account that publishes [escalatokens.com](https://escalatokens.com)). Do not open a public issue for a live overwrite or token-leak report.

## What this project stores, and where

There is **no user account**. That is deliberate.

| Layer | What it is | Trust |
|---|---|---|
| Browser `localStorage` | The live editor (Zustand) and, per slug, the publish claim | This machine, this browser |
| GitHub repo | Durable save: `tokens.json` + `.escala/system.json` (editor snapshot and publish claim) | As private as the repo. Use a private repo. |
| `POST /api/tokens` | Live-sync cache so the Figma plugin can poll | Same-origin from this app + per-slug claim after first publish |
| `GET /api/tokens?project=` | Public read of that cache | Anyone with the URL. The plugin needs this. |

A published blob is not a backup. If you care about a system, push it to GitHub.

## `/api/tokens` write model

- CORS remains `*` so already-downloaded Figma plugins can GET cross-origin.
- GET is unauthenticated. That cannot change without breaking installed zips.
- POST is rejected unless `Origin` matches this deployment (or the known production hosts). `curl` cannot claim a slug.
- The first POST to a slug from the app issues a publish claim. Later POSTs require `Authorization: Bearer <claim>`.
- The claim is stored in `localStorage` and, on GitHub push, in `.escala/system.json`. Clearing the browser without a repo loses the right to overwrite that slug; connect the repo to recover.
- `GET ?list=1` no longer returns published slugs.

Already-published slugs are unclaimed until their owner publishes once from the configurator after this model shipped. Until then they can still be overwritten from the app origin.

`GET` or `POST /api/tokens` without `?project=` is `400`. There is no global latest blob.

## Dependencies

See `NOTICE` and `CONTRIBUTING.md`. `apca-w3` and `colorparsley` are test-only; do not import them from `src/`.
