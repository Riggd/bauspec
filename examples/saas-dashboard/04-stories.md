# Development Stories

> Generated from PRD + Architecture + Constitution for MetricPulse.
> Each story is self-contained. An agent reads the story + constitution only.
>
> **Execution order matters.** Parallel stories marked [P].

## Story Map

```
S0: Project Setup
 └── S1: Auth Flow
      ├── S2: Stripe Integration [P]
      │    └── S4: MRR Dashboard
      │         └── S5: Churn, Active Users & Conversion Cards
      └── S3: App Shell & Layout [P]
           └── S4 (merge point)
                └── S6: Polish & Edge Cases
```

## Execution Checklist

- [ ] S0: Project Setup
- [ ] S1: Auth Flow
- [ ] S2: Stripe Integration
- [ ] S3: App Shell & Layout
- [ ] S4: MRR Dashboard
- [ ] S5: Churn, Active Users & Conversion Cards
- [ ] S6: Polish & Edge Cases

---

## S0: Project Setup

**Depends on:** Nothing
**Estimated scope:** Small

### Objective

Bootstrap the Next.js project with all tooling, directory structure, and database schema ready for development.

### Tasks

1. Initialize project:
   ```bash
   npx create-next-app@latest metricpulse --typescript --tailwind --app --src-dir --use-npm
   ```
2. Enable TypeScript strict mode in `tsconfig.json`: set `"strict": true`
3. Install dependencies:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr zod recharts stripe
   ```
4. Create full directory structure per architecture doc:
   ```
   src/components/ui/
   src/components/features/metrics/
   src/components/features/settings/
   src/lib/db/queries/
   src/lib/stripe/
   src/lib/auth/
   src/lib/utils/
   src/types/
   ```
5. Create `src/lib/db/client.ts` — Supabase client helpers:
   - `createServerClient()` — for server components and route handlers (uses cookies)
   - `createBrowserClient()` — for client components (uses anon key)
6. Create `src/lib/utils/errors.ts` — `AppError` class:
   ```typescript
   class AppError extends Error {
     constructor(public code: string, message: string, public statusCode: number) { ... }
   }
   ```
7. Create `src/lib/utils/format.ts` — formatting helpers:
   - `formatCurrency(cents: number): string` — e.g., 4999 → "$49.99"
   - `formatPercent(value: number, decimals?: number): string` — e.g., 0.042 → "4.2%"
8. Create `.env.example` with all required variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```
9. Create `supabase/migrations/001_initial_schema.sql`:
   ```sql
   -- users table
   CREATE TABLE users (
     id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     email text UNIQUE NOT NULL,
     name text,
     stripe_api_key text,
     stripe_webhook_secret text,
     stripe_connected_at timestamptz,
     created_at timestamptz DEFAULT now()
   );
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users read own profile" ON users FOR SELECT USING (auth.uid() = id);
   CREATE POLICY "Users update own profile" ON users FOR UPDATE USING (auth.uid() = id);

   -- stripe_events table
   CREATE TABLE stripe_events (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     stripe_event_id text UNIQUE NOT NULL,
     event_type text NOT NULL,
     data jsonb NOT NULL,
     occurred_at timestamptz NOT NULL,
     processed_at timestamptz DEFAULT now()
   );
   ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users read own events" ON stripe_events FOR SELECT USING (auth.uid() = user_id);
   CREATE INDEX idx_stripe_events_user_type ON stripe_events(user_id, event_type);
   CREATE INDEX idx_stripe_events_occurred ON stripe_events(user_id, occurred_at);

   -- daily_metrics table
   CREATE TABLE daily_metrics (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     date date NOT NULL,
     mrr_cents integer NOT NULL DEFAULT 0,
     active_subscriptions integer NOT NULL DEFAULT 0,
     churned_subscriptions integer NOT NULL DEFAULT 0,
     trial_starts integer DEFAULT 0,
     trial_conversions integer DEFAULT 0,
     UNIQUE(user_id, date)
   );
   ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users read own metrics" ON daily_metrics FOR SELECT USING (auth.uid() = user_id);
   ```
10. Verify: `npm run build` passes with zero errors

### Done When

- [ ] Project builds cleanly with `npm run build`
- [ ] All directories exist per architecture doc
- [ ] Supabase client helpers export both server and browser clients
- [ ] `.env.example` documents all required env vars
- [ ] Migration file ready to apply to Supabase

---

## S1: Auth Flow

**Depends on:** S0
**Estimated scope:** Medium
**PRD Features:** Auth (prerequisite for all features)

### Objective

Users can sign in via magic link or GitHub OAuth and access protected routes. Unauthenticated users are redirected to login.

### Context

**Auth strategy:** Supabase Auth with `@supabase/ssr` for cookie-based sessions.

**Key constraints:**
- No custom auth code — use Supabase Auth SDK only
- Server components by default; login form is a client component (interactive)

### Tasks

1. Create `src/middleware.ts` — Next.js middleware:
   - Check for Supabase session via `@supabase/ssr`
   - No session + accessing `/(auth)/*` path → redirect to `/login`
   - Has session + accessing `/login` → redirect to `/dashboard`
   - Pass through for `/api/v1/stripe/webhook` (no auth — uses Stripe signature)
2. Create `src/app/auth/callback/route.ts`:
   - Handle Supabase auth callback (magic link + OAuth)
   - Exchange code for session
   - On first login: insert row into `users` table (id, email from auth)
   - Redirect to `/dashboard`
3. Create `src/app/(public)/login/page.tsx`:
   - Email input for magic link
   - "Sign in with GitHub" button
   - Client component (needs form interactivity)
   - Call `supabase.auth.signInWithOtp({ email })` for magic link
   - Call `supabase.auth.signInWithOAuth({ provider: 'github' })` for OAuth
   - Show success message after magic link sent
   - Show error state for invalid email
4. Create `src/app/(public)/layout.tsx`:
   - Minimal centered layout for public pages
5. Create `src/lib/auth/helpers.ts`:
   - `getUser(cookies)` — returns user or null
   - `requireAuth(cookies)` — returns user or throws redirect

### Acceptance Criteria

- [ ] Magic link login: enter email → receive link → click → land on dashboard
- [ ] GitHub OAuth: click button → GitHub flow → land on dashboard
- [ ] Unauthenticated `/dashboard` access → redirected to `/login`
- [ ] Authenticated `/login` access → redirected to `/dashboard`
- [ ] First login creates user profile row in `users` table
- [ ] Webhook endpoint bypasses auth middleware

---

## S2: Stripe Integration

**Depends on:** S1
**Estimated scope:** Large
**PRD Features:** F1 (Stripe Integration)

### Objective

Users can connect their Stripe account via restricted API key. The system syncs 12 months of subscription history and receives real-time events via webhook.

### Context

**Relevant schema:**
```sql
-- users table fields used:
stripe_api_key text, stripe_webhook_secret text, stripe_connected_at timestamptz

-- stripe_events table: full table (see S0 migration)
```

**Key constraints:**
- Accept restricted keys only (read-only)
- Webhook handler must verify Stripe signature
- Handler must be idempotent (stripe_event_id is unique)
- No Stripe operations on the client — all server-side

**Webhook events to process:**
`invoice.paid`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

### Tasks

1. Create `src/lib/stripe/client.ts`:
   - `createStripeClient(apiKey: string)` — returns configured Stripe instance
2. Create `src/lib/stripe/types.ts`:
   - Zod schemas for webhook payload validation
   - Type for processed subscription event
3. Create `src/app/api/v1/stripe/connect/route.ts` (POST):
   - Validate input: `{ apiKey: string }` with Zod
   - Test the key by calling `stripe.customers.list({ limit: 1 })`
   - If valid: encrypt and store in `users.stripe_api_key`, set `stripe_connected_at`
   - If invalid: return `AppError("STRIPE_KEY_INVALID", ..., 400)`
4. Create `src/lib/stripe/sync.ts`:
   - `syncStripeHistory(userId, apiKey)` — paginated fetch of subscriptions + invoices
   - Fetch last 12 months of `invoice.paid` events
   - Fetch all active + canceled subscriptions
   - Insert into `stripe_events` table (skip duplicates via ON CONFLICT)
   - Return `{ eventsImported: number }`
5. Create `src/app/api/v1/stripe/sync/route.ts` (POST):
   - Requires auth
   - Calls `syncStripeHistory()`
   - Returns sync status
6. Create `src/lib/stripe/webhook.ts`:
   - `verifyWebhook(body, signature, secret)` — verify Stripe signature
   - `processEvent(event)` — route event to handler by type
   - Handlers for: `invoice.paid`, `customer.subscription.created/updated/deleted`
   - Each handler inserts into `stripe_events` (idempotent via unique constraint)
7. Create `src/app/api/v1/stripe/webhook/route.ts` (POST):
   - Read raw body (not JSON parsed — Stripe needs raw for signature)
   - Verify signature
   - Process event
   - Return 200 immediately (Stripe expects fast response)
8. Create `src/components/features/settings/stripe-connect-form.tsx`:
   - Client component: input for API key, connect button
   - POST to `/api/v1/stripe/connect`, then trigger `/api/v1/stripe/sync`
   - Show progress during sync
9. Create `src/components/features/settings/sync-status.tsx`:
   - Show last sync time and event count
   - Query from `stripe_events` count + max `processed_at`

### Acceptance Criteria

- [ ] Valid restricted Stripe key accepted, stored, connection timestamp set
- [ ] Invalid key → clear error message, no partial state saved
- [ ] Initial sync imports up to 12 months of subscription data
- [ ] Webhook endpoint verifies Stripe signature before processing
- [ ] Duplicate events rejected silently (idempotent)
- [ ] Sync status displays in settings (last sync time, event count)

### Edge Cases

- Invalid API key → clear error, nothing stored
- Webhook replay (duplicate event ID) → silently ignored via unique constraint
- Stripe rate limit during sync → retry with exponential backoff (max 3 attempts)
- User disconnects and reconnects Stripe → old events preserved, new sync merges

---

## S3: App Shell & Layout

**Depends on:** S1
**Estimated scope:** Small
**PRD Features:** Supports F2-F5 (dashboard container)

### Objective

Create the authenticated app layout with navigation, so dashboard and settings pages have a consistent shell.

### Context

**Pages in authenticated shell:**
- `/dashboard` — main metrics view
- `/settings` — Stripe connection and account

**Key constraints:**
- Server components by default
- Mobile-responsive (min 375px)
- Tailwind only — no CSS files

### Tasks

1. Create `src/app/(auth)/layout.tsx`:
   - Server component
   - Sidebar nav (desktop) / bottom nav (mobile) with links: Dashboard, Settings
   - Show user email from session
   - Sign out button (calls `supabase.auth.signOut()`)
   - Responsive: sidebar collapses to bottom nav at `md` breakpoint
2. Create `src/components/ui/card.tsx`:
   - Reusable card component: `<Card title? badge? children />`
   - White bg, rounded, shadow-sm, padding
3. Create `src/components/ui/badge.tsx`:
   - Color variants: green (positive), red (negative), gray (neutral)
   - Used for MRR change indicator
4. Create `src/components/ui/spinner.tsx`:
   - Simple loading spinner for async states
5. Create `src/components/ui/empty-state.tsx`:
   - Icon + message + optional CTA button
   - Used when no data available
6. Create placeholder `src/app/(auth)/dashboard/page.tsx`:
   - Server component, shows "Dashboard coming in S4"
7. Create `src/app/(auth)/settings/page.tsx`:
   - Server component, renders Stripe connect form (from S2) and sync status

### Acceptance Criteria

- [ ] Sidebar visible on desktop (≥768px), bottom nav on mobile
- [ ] Active page highlighted in nav
- [ ] Sign out works and redirects to login
- [ ] Settings page renders Stripe connection UI
- [ ] All UI components are Tailwind-only, no external CSS

---

## S4: MRR Dashboard

**Depends on:** S2, S3
**Estimated scope:** Medium
**PRD Features:** F2 (MRR Dashboard)

### Objective

The dashboard page displays current MRR, month-over-month change, and a 12-month revenue trend chart.

### Context

**MRR calculation:**
Sum of all active subscription amounts (monthly normalized). Annual subscriptions divided by 12. All values in cents, formatted on display.

**Relevant query pattern:**
```sql
-- Current MRR: sum active subscription amounts
-- For each month in last 12: calculate MRR at end of that month
-- from stripe_events where event_type IN ('customer.subscription.created',
-- 'customer.subscription.updated', 'customer.subscription.deleted')
```

**Key constraints:**
- Metrics derived at query time (no pre-computation required for v1)
- Dashboard loads in < 2 seconds
- Server components for data fetching; Recharts is client component (dynamic import)
- Currency in integer cents; format with `formatCurrency()`

### Tasks

1. Create `src/lib/db/queries/metrics.ts`:
   - `getCurrentMRR(userId)` — returns `{ mrrCents: number, previousMrrCents: number }`
   - `getMRRHistory(userId, months: number)` — returns `{ month: string, mrrCents: number }[]`
   - Both query `stripe_events` and derive from subscription lifecycle events
   - Use `SUPABASE_SERVICE_ROLE_KEY` for server-side queries (bypass RLS for perf)
2. Create `src/app/api/v1/metrics/route.ts` (GET):
   - Requires auth
   - Calls all metric queries (MRR now; churn, DAU, MAU, conversion added in S5)
   - Returns combined response: `{ mrr: {...}, mrrHistory: [...] }`
3. Create `src/components/features/metrics/mrr-card.tsx`:
   - Server component wrapper fetches data
   - Displays: large MRR number, badge with % change (green/red), "vs last month" label
   - Uses `<Card>`, `<Badge>` from ui components
4. Create `src/components/features/metrics/revenue-chart.tsx`:
   - **Client component** (needs Recharts interactivity)
   - `"use client"` directive
   - Dynamic import Recharts: `import dynamic from 'next/dynamic'`
   - Area chart with 12 data points
   - Hover tooltip shows month + exact MRR
   - Responsive: fills container width
5. Update `src/app/(auth)/dashboard/page.tsx`:
   - Server component
   - Fetch metrics server-side
   - Render MRR card + revenue chart
   - Handle empty state: no Stripe connected → show prompt to connect in settings
   - Handle loading state via Suspense boundaries

### Acceptance Criteria

- [ ] Current MRR displayed as formatted currency (e.g., "$4,250.00")
- [ ] Month-over-month change shown as green badge (up) or red badge (down)
- [ ] 12-month trend chart renders with data points per month
- [ ] Chart tooltip shows exact MRR on hover
- [ ] Empty state shown when no Stripe data exists
- [ ] Page loads in < 2 seconds with 12 months of data

### Edge Cases

- No Stripe connection → empty state with "Connect Stripe" CTA linking to /settings
- Only 1 month of data → show single bar, no trend line, no % change badge
- MRR is $0 (all subscriptions canceled) → show "$0.00" not empty state

---

## S5: Churn, Active Users & Conversion Cards

**Depends on:** S4
**Estimated scope:** Medium
**PRD Features:** F3 (Churn), F4 (Active Users), F5 (Trial Conversion)

### Objective

Add the remaining three metric cards to the dashboard: churn rate with sparkline, DAU/MAU, and trial conversion rate.

### Context

**Churn calculation:**
`churn_rate = cancellations_in_month / active_subscribers_at_month_start`
Display as percentage with one decimal. Sparkline shows 6-month trend.

**Active users:**
DAU = unique auth sessions in last 24h. MAU = last 30d. Source: Supabase `auth.sessions` or track via app-level events.

**Trial conversion:**
`conversion = trials_converted_to_paid / trials_started` over rolling 30-day window.

**Key constraints:**
- Zero subscribers at month start → churn shows "N/A"
- Reactivated subscribers NOT counted as churn
- Sparklines can be simple SVG — no need for Recharts

### Tasks

1. Add to `src/lib/db/queries/metrics.ts`:
   - `getChurnRate(userId)` → `{ currentRate: number, history: { month, rate }[] }`
   - `getActiveUsers(userId)` → `{ dau: number, mau: number, ratio: number }`
   - `getTrialConversion(userId)` → `{ rate: number, trialsStarted: number, converted: number }`
2. Update `src/app/api/v1/metrics/route.ts`:
   - Add churn, activeUsers, and conversion to the response object
3. Create `src/components/features/metrics/churn-card.tsx`:
   - Display current churn rate as percentage (e.g., "4.2%")
   - 6-month sparkline below (simple inline SVG, not Recharts)
   - Tooltip on hover with exact values
   - "N/A" when zero subscribers at month start
4. Create `src/components/features/metrics/active-users-card.tsx`:
   - Display DAU / MAU as large numbers
   - DAU/MAU ratio below (engagement metric)
   - If no auth activity data → "Connect auth" prompt
5. Create `src/components/features/metrics/conversion-card.tsx`:
   - Display conversion rate as percentage
   - Subtitle: "X of Y trials converted (30d)"
   - Trend indicator arrow (up/down vs previous 30d period)
6. Update `src/app/(auth)/dashboard/page.tsx`:
   - Add all three new cards below MRR section
   - Layout: 2x2 grid on desktop (MRR large on top, 3 cards below), stack on mobile
   - Suspense boundaries around each card for independent loading

### Acceptance Criteria

- [ ] Churn rate shows as percentage with one decimal (e.g., "4.2%")
- [ ] Churn sparkline shows 6-month trend
- [ ] DAU and MAU numbers displayed with DAU/MAU ratio
- [ ] Trial conversion shows percentage and raw numbers
- [ ] Zero subscribers → churn shows "N/A" not error
- [ ] Dashboard is 2-column grid on desktop, single column on mobile

---

## S6: Polish & Edge Cases

**Depends on:** S5
**Estimated scope:** Small
**PRD Features:** Cross-cutting quality

### Objective

Handle all edge cases, add error boundaries, loading states, and ensure the app meets quality standards from the constitution.

### Tasks

1. Add error boundaries:
   - Create `src/app/(auth)/dashboard/error.tsx` — dashboard error boundary
   - Create `src/app/(auth)/settings/error.tsx` — settings error boundary
   - Show friendly message + retry button
2. Add loading states:
   - Create `src/app/(auth)/dashboard/loading.tsx` — skeleton cards
   - Create `src/app/(auth)/settings/loading.tsx` — skeleton form
3. Responsive audit:
   - Test all pages at 375px, 768px, 1280px
   - Fix any overflow, truncation, or layout issues
4. Create `src/app/page.tsx` (root):
   - Check auth: if authenticated → redirect `/dashboard`, else → redirect `/login`
5. Verify all constitution quality standards:
   - [ ] All API inputs validated with Zod
   - [ ] Error boundaries on every page
   - [ ] Loading states for all async operations
   - [ ] Mobile-responsive (min 375px)
   - [ ] No hardcoded secrets
6. Update `README.md` with:
   - Setup instructions (env vars, Supabase project, deploy)
   - Local development commands
   - Architecture overview (one paragraph + directory listing)

### Acceptance Criteria

- [ ] Errors caught by boundaries, not white screens
- [ ] Loading skeletons visible during data fetch
- [ ] All pages usable at 375px width
- [ ] Root `/` redirects correctly based on auth state
- [ ] README contains complete setup instructions
- [ ] `npm run build` passes with zero errors and zero warnings
