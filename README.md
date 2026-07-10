# TSB — The Secret Boutique | Full Platform Demo

Production-quality demonstration of the multi-city white-label tour booking and partner settlement platform.

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:3000**

**Demo password for all accounts:** `demo123!`

## Demo URLs

| Role | URL | Action |
|------|-----|--------|
| **Landing** | `/` | Overview + quick links |
| **Tourist** | `/api/scan?t=H8kX2mRomaA1bC3dE5fG7h` | QR scan → white-label B2C |
| **Tourist (alt)** | `/api/scan?t=V9nY4pVenB2cD4eF6gH8i` | Different hotel branding |
| **SuperAdmin** | `/admin` | Cities, orders, settlement |
| **Demo Control** | `/admin/control` | Failure sims + advance clock |
| **B2B Login** | `/b2b` | Partner portal |
| **Hotel Dashboard** | `/b2b/hotel` | Royalties (TO masked) |
| **TO Dashboard** | `/b2b/to` | Bookings (Hotel masked) |

## Demo Accounts

| Email | Role |
|-------|------|
| superadmin@tsb-demo.com | SuperAdmin |
| to.owner@tsb-demo.com | Tour Operator Owner |
| hotel.group@tsb-demo.com | Hotel Group Owner |
| hotel.property@tsb-demo.com | Hotel Property Manager |
| support@tsb-demo.com | Support Agent |

Use the **Demo Role Switcher** (bottom-right) to switch roles instantly.

## 10-Minute Client Demo Script

### 1. Tourist Journey (3 min)
1. Open incognito → `/api/scan?t=H8kX2mRomaA1bC3dE5fG7h`
2. Show white-label **Hotel Aurelia Roma** branding
3. Browse categories → select **Colosseum Private Access**
4. Configure date/time/language/participants
5. Enter email, accept TO terms, click **Authorize & Book**
6. Show saga timeline: Match → Hold → Auth → Confirm → Capture
7. Download voucher

### 2. Partner Privacy (2 min)
1. Open `/b2b` → login as `hotel.property@tsb-demo.com`
2. Show attributed sales — **no TO identity**
3. Switch to `to.owner@tsb-demo.com`
4. Show bookings — **no Hotel identity**

### 3. SuperAdmin (2 min)
1. `/admin` — show 10 seeded order scenarios
2. `/admin/control` — toggle **Confirm Failure** → repeat checkout → show rollback
3. Advance demo clock +48h → Run Settlement Engine

### 4. Architecture Proof (2 min)
1. Show 3 TOs: Roma Elite (active), Imperial (timeout), Hidden (suspended)
2. Explain deterministic matching with audit trail
3. Show 70/10/20 split + `transfer_eligible_at` formula

## Seeded Data

- **Cities:** Rome (active), London (preview), Tokyo (inactive)
- **Hotels:** Aurelia Roma, Palazzo Navona, Kensington Grand
- **TOs:** Roma Elite, Imperial City (timeout), Hidden Rome (suspended)
- **Tours:** 6 Rome experiences with TSB fixed pricing
- **Orders:** 10 scenarios (success, hold, auth fail, confirm fail, capture fail, settlement, refund, debt, archived)

## Architecture

```
lib/tsb/
  store.ts      — In-memory multi-tenant database
  seed.ts       — Realistic demo data
  matching.ts   — 3-TO concurrent matching + circuit breaker
  checkout.ts   — Full saga with rollback
  ledger.ts     — Escrow, 70/10/20 split, debt offset
  auth.ts       — HTTP-only cookies + demo role auth
  audit.ts      — Append-only audit + idempotency
```

## Tests

```bash
npm test
```

Covers: 70/10/20 split, Stripe fee 50/50, residual cent, transfer_eligible_at, idempotency, RLS data model.

## Netlify Deploy (Recommended)

### Option A — Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init        # link to new or existing site
netlify deploy --prod
```

### Option B — Git-connected deploy

1. Push the repo to GitHub/GitLab/Bitbucket
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
3. Build settings are auto-detected from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next` (do NOT set to repo root in Netlify UI)
   - **Plugin:** `@netlify/plugin-nextjs`
   - **Node:** 20

> If deploy fails with *"publish directory cannot be the same as base directory"*, go to **Site configuration → Build & deploy → Build settings** and clear the Publish directory field (leave empty) so `netlify.toml` takes over.

### Required environment variables (Netlify UI → Site settings → Environment variables)

| Variable | Value |
|----------|-------|
| `ATTRIBUTION_SECRET` | Random 32+ character string |
| `DEMO_MODE` | `true` |
| `DEMO_FAST_ESCROW` | `true` |
| `CRON_SECRET` | Optional — protects `/api/ledger/process` |

### Scheduled settlement

Hourly settlement runs via `netlify/functions/scheduled-settlement.mts` (configured in the function's `schedule` export).

For live demos, use **SuperAdmin → Run Settlement Engine** or **Demo Control → Advance Clock +48h** — these work immediately without waiting for cron.

### Serverless note

The demo uses an in-memory store (`lib/tsb/store.ts`). On Netlify serverless, state resets on cold starts. For a single demo session (scan QR → checkout → dashboards), everything works. For persistent data across deploys, connect Supabase (see `.env.example`).

## Vercel Deploy (alternative)

```bash
npx vercel --prod
```

Env vars: `ATTRIBUTION_SECRET`, `DEMO_MODE=true`, `DEMO_FAST_ESCROW=true`

## Proposal Opening

> **WALLED GARDEN** — I implement checkout as a durable saga persisted to the database before each step proceeds. On failure, compensating transactions run in reverse order (cancel uncaptured PaymentIntent, release soft-hold). Saga state lives in PostgreSQL, not server memory — fully compatible with Vercel serverless scale-out.
