# Technical Architecture

> **Status:** [x] Draft → [x] In Review → [x] Approved

## System Overview

MetricPulse is a self-hosted SaaS analytics dashboard. It ingests Stripe subscription events via webhooks, stores raw events in Supabase, and derives metrics (MRR, churn, active users, trial conversion) at query time. All computation is server-side; the client renders pre-computed views.

```
[Browser] → [Next.js App (Vercel)]
                  ↓              ↑
            [Supabase]    [Stripe API]
                  ↑
            [Stripe Webhooks]
```

## Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Frontend | Next.js | 15.x | App router, RSC for fast loads, Vercel-native |
| Styling | Tailwind CSS | 4.x | Utility-first, no custom CSS files to manage |
| Charts | Recharts | 2.x | Lightweight, React-native, SSR-compatible |
| Backend | Next.js Route Handlers | 15.x | Co-located API, no separate server |
| Database | Supabase (Postgres) | Latest | RLS, realtime, auth — all-in-one |
| Auth | Supabase Auth | Latest | Magic link + GitHub OAuth, zero custom auth code |
| Validation | Zod | 3.x | Runtime type safety for all inputs |
| Hosting | Vercel | N/A | Preview deploys, edge functions, analytics |

## Project Structure

```
src/
├── app/
│   ├── (auth)/                     # Auth-required routes (middleware protected)
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Main metrics dashboard (F2, F3, F4, F5)
│   │   ├── settings/
│   │   │   └── page.tsx            # Stripe connection, account (F1)
│   │   └── layout.tsx              # Authenticated shell (sidebar, nav)
│   ├── (public)/
│   │   ├── login/
│   │   │   └── page.tsx            # Magic link + GitHub OAuth
│   │   └── layout.tsx              # Minimal public layout
│   ├── api/
│   │   └── v1/
│   │       ├── stripe/
│   │       │   ├── connect/route.ts    # Validate + store Stripe key
│   │       │   ├── webhook/route.ts    # Ingest Stripe events
│   │       │   └── sync/route.ts       # Trigger initial 12-month sync
│   │       └── metrics/
│   │           └── route.ts            # GET derived metrics for dashboard
│   ├── auth/
│   │   └── callback/route.ts      # Supabase auth callback handler
│   ├── layout.tsx                  # Root layout (fonts, metadata)
│   └── page.tsx                    # Redirect: authed → dashboard, else → login
├── components/
│   ├── ui/                         # Reusable primitives
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── spinner.tsx
│   │   └── empty-state.tsx
│   └── features/
│       ├── metrics/
│       │   ├── mrr-card.tsx        # MRR display + trend chart
│       │   ├── churn-card.tsx      # Churn rate + sparkline
│       │   ├── active-users-card.tsx
│       │   ├── conversion-card.tsx
│       │   └── revenue-chart.tsx   # 12-month revenue chart
│       └── settings/
│           ├── stripe-connect-form.tsx
│           └── sync-status.tsx
├── lib/
│   ├── db/
│   │   ├── client.ts              # Supabase client (server + browser)
│   │   └── queries/
│   │       ├── stripe-events.ts   # Insert/query stripe events
│   │       ├── metrics.ts         # Derive MRR, churn, DAU/MAU, conversion
│   │       └── users.ts           # User profile operations
│   ├── stripe/
│   │   ├── client.ts              # Stripe SDK init
│   │   ├── sync.ts                # Initial 12-month history sync
│   │   ├── webhook.ts             # Webhook signature verify + dispatch
│   │   └── types.ts               # Stripe event type definitions
│   ├── auth/
│   │   ├── middleware.ts           # Route protection middleware
│   │   └── helpers.ts             # Session helpers (getUser, requireAuth)
│   └── utils/
│       ├── errors.ts              # AppError class
│       ├── dates.ts               # Date range helpers
│       └── format.ts              # Currency, percentage formatting
├── types/
│   ├── metrics.ts                 # Metric response types
│   ├── stripe.ts                  # Stripe-related types
│   └── database.ts                # Supabase generated types
└── middleware.ts                   # Next.js middleware (auth redirect)
```

## Data Architecture

### Schema

#### Table: users

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK, references auth.users | Supabase auth user |
| email | text | unique, not null | From auth provider |
| name | text | | Display name |
| stripe_api_key | text | encrypted | Restricted key (read-only) |
| stripe_webhook_secret | text | encrypted | For signature verification |
| stripe_connected_at | timestamptz | | Null if not connected |
| created_at | timestamptz | default now() | |

#### Table: stripe_events

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | FK → users.id, not null | Owner |
| stripe_event_id | text | unique, not null | Idempotency key |
| event_type | text | not null | e.g., invoice.paid |
| data | jsonb | not null | Raw Stripe event payload |
| occurred_at | timestamptz | not null | Stripe event timestamp |
| processed_at | timestamptz | default now() | When we ingested it |

#### Table: daily_metrics (materialized cache, optional)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | FK → users.id, not null | |
| date | date | not null | Metric date |
| mrr_cents | integer | not null | MRR in cents (avoid floats) |
| active_subscriptions | integer | not null | Count at end of day |
| churned_subscriptions | integer | not null | Cancellations that day |
| trial_starts | integer | default 0 | |
| trial_conversions | integer | default 0 | |
| unique constraint | | (user_id, date) | One row per user per day |

### Relationships

```
auth.users 1──1 users (profile)
users 1──* stripe_events
users 1──* daily_metrics
```

### Row-Level Security Policies

```sql
-- users: can only read/update own profile
CREATE POLICY "Users read own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- stripe_events: can only read own events
CREATE POLICY "Users read own events" ON stripe_events FOR SELECT USING (auth.uid() = user_id);

-- daily_metrics: can only read own metrics
CREATE POLICY "Users read own metrics" ON daily_metrics FOR SELECT USING (auth.uid() = user_id);

-- stripe_events + daily_metrics INSERT: service role only (webhooks/sync)
```

### Key Queries

| Query | Description | Used By |
|-------|-------------|---------|
| Current MRR | Sum of active subscription amounts from latest events per subscription | Dashboard F2 |
| MRR by month (12mo) | Group subscription amounts by month, last 12 months | Revenue chart F2 |
| Monthly churn rate | Cancellations in month / active subs at month start | Dashboard F3 |
| DAU | Count distinct user sessions in last 24h (from auth.sessions) | Dashboard F4 |
| MAU | Count distinct user sessions in last 30d | Dashboard F4 |
| Trial conversion (30d) | Trials converted to paid / trials started, rolling 30d | Dashboard F5 |

## API Design

### Endpoints

| Method | Path | Purpose | Auth | Request | Response |
|--------|------|---------|------|---------|----------|
| POST | /api/v1/stripe/connect | Store Stripe API key | Required | `{ apiKey: string }` | `{ connected: boolean }` |
| POST | /api/v1/stripe/webhook | Ingest Stripe events | Stripe signature | Raw body | 200 OK |
| POST | /api/v1/stripe/sync | Trigger initial history sync | Required | None | `{ status, eventsImported }` |
| GET | /api/v1/metrics | Get all dashboard metrics | Required | `?range=12m` | `{ mrr, churn, dau, mau, conversion, mrrHistory[] }` |

### Error Format

```json
{
  "error": {
    "code": "STRIPE_KEY_INVALID",
    "message": "The provided Stripe API key could not be validated.",
    "statusCode": 400
  }
}
```

## Auth Architecture

- **Strategy:** Supabase Auth — magic link (primary) + GitHub OAuth (secondary)
- **Session management:** Server-side via `@supabase/ssr`. Cookies set by Supabase, validated in middleware.
- **Protected routes:** Next.js middleware at `src/middleware.ts` checks session. No session → redirect to `/login`. Paths under `/(auth)/` are all protected.
- **Role-based access:** Not needed for v1 (single user). RLS policies enforce data isolation by `user_id`.
- **Service role:** Used only by webhook handler and sync endpoint to write `stripe_events` and `daily_metrics`. Never exposed to client.

## External Services

| Service | Purpose | Auth Method | Failure Mode |
|---------|---------|-------------|-------------|
| Stripe API | Read subscriptions, customers, invoices | Restricted API key (read-only) | Retry with exponential backoff (max 3) |
| Stripe Webhooks | Real-time event ingestion | Webhook signature verification | Stripe auto-retries; handler is idempotent via stripe_event_id unique constraint |

## Key Technical Decisions

| Decision | Choice | Alternatives Considered | Why |
|----------|--------|------------------------|-----|
| Metrics computation | Derived at query time from raw events | Pre-computed materialized views | Simpler for v1 data volumes; daily_metrics table is optional cache |
| Currency handling | Integer cents, never floats | Decimal libraries | Standard practice, avoids floating point errors |
| Chart library | Recharts | Chart.js, D3, Tremor | React-native, SSR-friendly, minimal bundle size |
| Stripe key storage | Encrypted column in users table | Vault service, env vars | Self-contained in Supabase; encryption at rest via Supabase |
| Initial sync approach | Server-side paginated fetch on connect | Background job queue | Simpler for v1; < 10k events for indie SaaS fits in one request cycle |

## Performance Considerations

- **Target:** LCP < 2 seconds, dashboard fully rendered
- **Strategy:** Server components for all metric cards (no client-side fetch waterfall). Single `/api/v1/metrics` call returns all dashboard data. Recharts loaded via dynamic import (client component) only for interactive charts.
- **Caching:** `daily_metrics` table acts as query cache. Metrics endpoint reads from cache if today's row exists, otherwise computes from raw events and caches.
- **Monitoring:** Vercel Analytics (free tier)

## Security Considerations

- Stripe API keys encrypted at rest in Supabase (vault extension or encrypted column)
- Webhook endpoint validates Stripe signature before processing any event
- All API inputs validated with Zod schemas — no raw request body access
- CORS: default Next.js behavior (same-origin only)
- Rate limiting: Vercel's built-in for API routes; Stripe webhook endpoint excluded from rate limits
- No secrets in client bundle — all Stripe operations server-side only
- Content Security Policy headers on all pages

## Migration / Setup Requirements

1. Create Supabase project at supabase.com
2. Run migration: create `users`, `stripe_events`, `daily_metrics` tables with RLS policies
3. Enable Supabase Auth with magic link + GitHub OAuth provider
4. Create `.env.local` from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy to Vercel, set env vars in Vercel dashboard
6. After first user connects Stripe: register webhook URL `https://[domain]/api/v1/stripe/webhook` in Stripe dashboard

<!-- AGENT INSTRUCTIONS -->
<!--
Hello AI! If you generated this architecture document:
1. Stop and ask the user to review.
2. Ensure all decisions and setups are fully documented.
3. Once the user approves, wait for their explicit confirmation to proceed.
4. When confirmed, read `04-stories.md` and act as an engineering manager to generate the development stories.
-->
