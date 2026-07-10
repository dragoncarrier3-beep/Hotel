# Job Application — TSB $500 Paid Test

## Opening (Required)

**WALLED GARDEN**

## Architectural Approach — Saga Pattern Rollback

I implement checkout as a durable, database-backed saga where each step (soft-hold → Stripe authorization → provider confirmation → capture) is persisted to `saga_events` before the next step executes. On failure at any stage, compensating transactions run in strict reverse order: uncaptured PaymentIntents are cancelled via `stripe.paymentIntents.cancel()` (not refunded, since no funds were captured), and soft-holds are released via the aggregator API. Because saga state lives in PostgreSQL rather than server memory, the pattern is fully compatible with Vercel's stateless serverless functions and horizontal scale-out — no sticky sessions required.

## Live Demo URLs (after Vercel deploy)

Replace `your-app.vercel.app` with your deployment URL:

| Demo Step | URL | What to Show Client |
|-----------|-----|---------------------|
| Landing | `/` | Architecture overview of all 4 pillars |
| Interactive Console | `/demo` | Live testing of each pillar |
| QR Scan (Hotel Roma) | `/api/scan?t=H8kX2mRomaA1bC3dE5fG7h` | Sets HTTP-Only attribution cookie |
| B2C Experience | `/hotel/H8kX2mRomaA1bC3dE5fG7h` | White-label tourist checkout |
| RLS Proof | `/api/rls-demo` | Tenant isolation evidence |

## Demo Script for Client (5 minutes)

### 1. Attribution (30 sec)
1. Open incognito browser
2. Visit `/api/scan?t=H8kX2mRomaA1bC3dE5fG7h`
3. Redirected to white-label Hotel Roma page
4. Go to `/demo` → show "Attributed to Grand Hotel Roma"
5. Refresh page → attribution persists (HTTP-Only cookie)

### 2. RLS Isolation (30 sec)
1. In `/demo`, show Pillar 1 card
2. Complete a checkout (Pillar 2)
3. Refresh RLS state — Hotel A sees its orders, Hotel B sees zero

### 3. Saga Happy Path (1 min)
1. In `/demo`, run "Execute Checkout Saga"
2. Show 4-step timeline: Hold → Auth → Confirm → Capture
3. Point out `requires_capture` (manual capture, not immediate charge)

### 4. Saga Rollback (1 min)
1. Select "Step 3: Provider Confirm" failure
2. Run saga again
3. Show rollback: auth cancelled, hold released, zero funds captured

### 5. Escrow & Split (1 min)
1. Show split visualizer: 70/10/20 on gross
2. Click "Trigger Ledger Engine"
3. Show JSON with transfers to TO and Hotel Stripe accounts

### 6. B2C White-Label (1 min)
1. Open `/hotel/H8kX2mRomaA1bC3dE5fG7h`
2. Show hotel branding, tour catalog, MoR disclosure
3. Complete 1-click checkout

## Technical Highlights to Mention

- **RLS**: Policies use `auth_user_hotel_ids()` — bypass impossible from frontend
- **Saga**: DEL-0093 through DEL-0099 compliant sequence
- **Escrow**: `transfer_eligible_at = max(captured_at + 48h, service_end_at + 48h)`
- **Attribution**: Jose-signed JWT, 48h TTL, HttpOnly + Secure cookies
- **Stripe**: `capture_method: manual`, `on_behalf_of` for MoR, separate charges & transfers

## Vercel Deploy Commands

```bash
npm install -g vercel
vercel login
vercel --prod
```

Set these env vars in Vercel:
- `ATTRIBUTION_SECRET` (random 32+ chars)
- `DEMO_FAST_ESCROW=true` (for live demo)
- `CRON_SECRET` (for ledger cron)
- Optional: Supabase + Stripe keys for production mode
