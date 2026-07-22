# Deployment Guide

Everything below uses only free tiers — no credit card required beyond what the provider itself
asks for account verification.

## 1. Database — Supabase (free tier)

1. Create a project at [supabase.com](https://supabase.com) (free tier: 500MB DB, 2 CPU-hour
   compute, paused after 1 week of inactivity — fine for a hackathon demo).
2. **Project Settings → Database → Connection string**: copy the *Connection pooling* URI
   (port `6543`, `?pgbouncer=true`) into `DATABASE_URL`, and the *Direct connection* URI (port
   `5432`) into `DIRECT_URL`. Prisma needs both: pooled for the app at runtime, direct for
   running migrations.
3. **Project Settings → API**: copy the Project URL into `NEXT_PUBLIC_SUPABASE_URL`, the
   `anon` public key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the `service_role` key into
   `SUPABASE_SERVICE_ROLE_KEY` (server-side only — never expose this to the browser).
4. Apply the schema and seed data:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

## 2. Application hosting — pick one free option

### Option A: Vercel (recommended — built for Next.js)
1. Push this repo to GitHub.
2. [vercel.com](https://vercel.com) → **New Project** → import the repo (free Hobby tier).
3. Add all variables from `.env.example` under **Settings → Environment Variables**.
4. Deploy. Vercel auto-detects Next.js — no build config needed.

### Option B: Render
1. **New → Web Service** → connect the repo (free tier — spins down after 15 min idle).
2. Build command: `npm install && npm run build`. Start command: `npm run start`.
3. Add the same environment variables.

### Option C: Railway
1. **New Project → Deploy from GitHub repo** (free trial credit, then usage-based).
2. Railway auto-detects Next.js via Nixpacks. Add environment variables under the service's
   **Variables** tab.

All three auto-provision HTTPS and a public URL on their free tier.

## 3. LLM — Ollama (local inference, not a hosted service)

Ollama is designed to run **on a machine you control**, not as a hosted API — that's what
keeps it free. Two ways to use it with a deployed app:

- **Judge/demo laptop**: run `ollama serve` locally and demo via `npm run dev` on
  `localhost:3000` — the app calls `http://localhost:11434` by default (see
  `OLLAMA_BASE_URL` in `.env`). This is the simplest setup for a hackathon demo.
- **Deployed app + remote Ollama**: run Ollama on any always-on machine you control (a spare
  desktop, a free-tier VM with enough RAM for a 7B model, etc.), expose port `11434` on your
  own network/tailscale, and point the deployed app's `OLLAMA_BASE_URL` env var at it.
- **No Ollama available**: leave `LLM_DISABLED=true` (or just don't run Ollama) — every agent
  still fully functions using its deterministic fallback template. This is a legitimate,
  intentional degrade path, not a broken state — the UI labels it clearly
  (`usedFallbackTemplate: true`).

Recommended model for a typical laptop (16GB RAM): `ollama pull qwen2.5:7b-instruct`. For
lower-RAM machines, `ollama pull llama3.2:3b-instruct` runs comfortably and is already in the
fallback chain.

## 4. Post-deploy checklist

- [ ] `DATABASE_URL` / `DIRECT_URL` point at your Supabase project, not `.env.example` placeholders
- [ ] `npm run db:migrate` has been run against that database at least once
- [ ] `npm run db:seed` has been run at least once (re-running it is safe — it clears and
      rebuilds the one seeded project)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set if you plan to wire up
      Supabase Auth sign-in (the current prototype ships `user_profiles` and the Supabase
      client, but pages are not yet gated behind a login screen — see "Future Improvements")
- [ ] Either Ollama is reachable at `OLLAMA_BASE_URL`, or you've accepted the deterministic
      fallback template as the demo path for the "Generate explanation" buttons

## Estimated free-tier limits for a hackathon demo

| Resource | Free tier limit | This project's usage |
|---|---|---|
| Supabase DB storage | 500 MB | Seed data is a few MB |
| Supabase compute | Pauses after 7 days idle | Wake it before a demo by opening the dashboard |
| Vercel Hobby bandwidth | 100 GB/month | Comfortably sufficient for a demo audience |
| Open-Meteo | 10,000 requests/day | Dashboard makes single-digit requests per load |
| Nager.Date | No published hard limit | Same — negligible request volume |

No component of this stack requires a paid tier to run the full prototype end-to-end.
