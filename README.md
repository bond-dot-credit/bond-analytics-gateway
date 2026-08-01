# bond-api-proxy

Hides your Supabase REST URL behind `bond.credit/api/<table>`.

```
https://xurzcnthfpzihylgcnly.supabase.co/rest/v1/agent_leaderboard_genesis?apikey=...
                              ↓
https://bond.credit/api/agent_leaderboard_genesis
```

## How it works

`api/[table].js` is a Vercel dynamic serverless function. Any request to
`/api/<anything>` gets routed here, with `<anything>` available as
`req.query.table`. The function rebuilds the request and forwards it to
Supabase's REST (PostgREST) API, injecting the `apikey` / `Authorization`
headers server-side — so the key never appears in your frontend code or
network tab pointing at Supabase directly.

All normal PostgREST query params still work, e.g.:

```
https://bond.credit/api/agent_leaderboard_genesis?select=*&order=score.desc&limit=10
```

gets forwarded as:

```
https://xurzcnthfpzihylgcnly.supabase.co/rest/v1/agent_leaderboard_genesis?select=*&order=score.desc&limit=10
```

## 1. Push to GitHub

```bash
cd bond-api-proxy
git init
git add .
git commit -m "Supabase proxy"
git branch -M main
git remote add origin https://github.com/<you>/bond-api-proxy.git
git push -u origin main
```

## 2. Import into Vercel

- Go to vercel.com → Add New → Project → import the GitHub repo.
- Framework preset: "Other" (no build step needed).

## 3. Set environment variables

In Vercel: Project → Settings → Environment Variables, add for
Production (and Preview if you want):

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://xurzcnthfpzihylgcnly.supabase.co` |
| `SUPABASE_ANON_KEY` | your `sb_publishable_...` key |

Redeploy after adding them (env vars only apply to new deployments).

## 4. Point bond.credit at Vercel

- Project → Settings → Domains → add `bond.credit` (and/or a subdomain
  like `api.bond.credit` if you'd rather keep `/api/*` on a dedicated host).
- Vercel gives you a CNAME/A record to add at your DNS registrar. Add it,
  wait for propagation, and Vercel auto-issues the SSL certificate.

## 5. Test it

```bash
curl "https://bond.credit/api/agent_leaderboard_genesis?select=*&limit=5"
```

## Notes on the key you shared

The key in your message (`sb_publishable_...`) is Supabase's **publishable
anon key** — it's meant to be public-ish (it's what ships in client apps
normally), but it's still good practice to keep it out of the URL/repo and
gate access with **Row Level Security (RLS)** policies on the table in
Supabase, since anyone who finds this proxy can still query it. If
`agent_leaderboard_genesis` is meant to be public read-only data, make
sure RLS has a `SELECT` policy allowing anon reads and blocks writes.

Since you posted the key in this chat, consider rotating it in Supabase
(Project Settings → API) if you'd rather not use this one going forward.

## Optional hardening later

- Add a simple rate limiter (e.g. Vercel's `@vercel/kv` or Upstash) if this
  becomes public-facing at scale.
- Restrict `Access-Control-Allow-Origin` in `api/[table].js` to your actual
  frontend domain instead of `*`.
- Add an allowlist of table names in the handler if you only ever want to
  expose specific tables.
