# Product Requirements Document

> **Status:** [x] Draft → [x] In Review → [x] Approved

## Product Overview

### Problem Statement

Indie SaaS founders waste 30+ minutes daily context-switching between Stripe, analytics tools, and spreadsheets to understand their business health. Key metrics like churn rate require manual calculation, leading to stale data and missed trends.

### Solution Summary

MetricPulse is a self-hosted analytics dashboard that connects to Stripe via webhooks and displays MRR, churn, active users, and conversion metrics on a single screen. Data stays in the user's own Supabase instance.

### Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Dashboard load time | < 2 seconds | Vercel Analytics LCP |
| Daily active usage | Founder checks daily | Login frequency |
| Time to first value | < 15 min setup | Onboarding completion event |

## User Personas

### Persona 1: Solo Founder (Primary)

- **Goal:** Check business health in under 60 seconds each morning
- **Context:** Desktop browser, first thing in the morning with coffee
- **Pain point:** Bouncing between 4+ tools to assemble a mental picture of business health

### Persona 2: Team Lead

- **Goal:** Share key metrics with team without exposing Stripe credentials
- **Context:** Shares a read-only dashboard link in team Slack
- **Pain point:** Manually screenshotting Stripe charts into Slack channels

## Feature Requirements

### F1: Stripe Integration

- **Priority:** P0
- **Persona:** Solo Founder
- **Description:** Connect to Stripe via API key + webhooks. Sync subscription events in real-time. Store raw events in Supabase for derived metric computation.
- **User flow:**
  1. User enters Stripe API key in settings
  2. System validates key and performs initial data sync (last 12 months)
  3. System registers webhook endpoint with Stripe
  4. Ongoing events arrive via webhook and are stored
- **Acceptance criteria:**
  - [ ] Stripe restricted key (read-only) accepted and validated
  - [ ] Initial sync imports last 12 months of subscription data
  - [ ] Webhooks process: invoice.paid, customer.subscription.created/updated/deleted
  - [ ] Webhook signature verification active
  - [ ] Sync status visible in settings (last sync time, event count)
- **Edge cases:**
  - Invalid API key → clear error message, no partial state
  - Webhook delivery failure → Stripe retries, system is idempotent
  - Rate limit from Stripe during initial sync → exponential backoff

### F2: MRR Dashboard

- **Priority:** P0
- **Persona:** Solo Founder, Team Lead
- **Description:** Display current MRR, MRR trend (last 12 months), and month-over-month change. All values derived from stored Stripe events at query time.
- **User flow:**
  1. User opens dashboard (default view)
  2. System displays current MRR as large number with % change badge
  3. Below: 12-month trend chart
  4. Hover on chart shows exact MRR for that month
- **Acceptance criteria:**
  - [ ] MRR calculated from active subscriptions (not Stripe's MRR — we compute it)
  - [ ] Trend chart shows last 12 months with data points per month
  - [ ] Month-over-month % change shown as green (up) or red (down) badge
  - [ ] Dashboard loads in < 2 seconds with 12 months of data
- **Edge cases:**
  - No data yet (pre-sync) → empty state with setup prompt
  - Single month of data → show bar instead of trend line

### F3: Churn Metrics

- **Priority:** P0
- **Persona:** Solo Founder
- **Description:** Monthly churn rate calculated as (churned subscribers / start-of-month subscribers). Display current rate + 6-month trend.
- **User flow:**
  1. Churn card visible on dashboard below MRR
  2. Shows current monthly churn rate as percentage
  3. 6-month sparkline trend below the number
- **Acceptance criteria:**
  - [ ] Churn = cancellations in month / active subscribers at month start
  - [ ] Displayed as percentage with one decimal (e.g., 4.2%)
  - [ ] Sparkline shows 6-month trend
  - [ ] Tooltip on hover shows exact values
- **Edge cases:**
  - Zero subscribers at month start → show "N/A" not division error
  - Reactivated subscribers not counted as churn

### F4: Active Users

- **Priority:** P1
- **Persona:** Solo Founder
- **Description:** DAU and MAU counts based on Supabase auth session activity. Displayed as cards with ratio.
- **User flow:**
  1. Active Users card on dashboard
  2. Shows DAU / MAU numbers and DAU/MAU ratio
- **Acceptance criteria:**
  - [ ] DAU = unique users with auth activity in last 24 hours
  - [ ] MAU = unique users with auth activity in last 30 days
  - [ ] DAU/MAU ratio displayed (engagement indicator)
- **Edge cases:**
  - No auth activity data available → show "Connect auth" prompt

### F5: Trial Conversion Rate

- **Priority:** P1
- **Persona:** Solo Founder
- **Description:** Percentage of trial subscriptions that convert to paid, rolling 30-day window.
- **Acceptance criteria:**
  - [ ] Conversion = trials converted to paid / trials started, 30-day window
  - [ ] Displayed as percentage with trend indicator

## Data Requirements

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| User | id, email, name, stripe_connected | owns StripeEvents |
| StripeEvent | id, type, data, stripe_id, processed_at | belongs to User |
| DailyMetrics | id, date, mrr, churn_rate, active_users, trial_conversions | belongs to User |

## Pages / Screens

| Page | Purpose | Key Features |
|------|---------|-------------|
| /dashboard | Main view — all metrics | F2, F3, F4, F5 |
| /settings | Stripe connection, account | F1 |
| /login | Authentication | Auth flow |

## API Surface

| Integration | Purpose | Direction |
|-------------|---------|-----------|
| Stripe API | Read subscription data, initial sync | Outbound (read) |
| Stripe Webhooks | Real-time event ingestion | Inbound |

## Out of Scope (v1)

- Multiple Stripe account support
- Email digests / weekly summary
- Custom date range filtering
- Export / CSV download
- Team member roles / permissions (v1 is single-user)
- Open source release

## Clarification Log

| # | Question | Answer | Date |
|---|----------|--------|------|
| 1 | Calculate churn ourselves or use Stripe metrics? | Calculate ourselves — more control and accuracy | 2026-02-22 |
| 2 | Real-time or hourly sync? | Real-time via webhooks, with daily rollup for charts | 2026-02-22 |
| 3 | How do we handle multiple Stripe accounts? | V2 feature. V1 assumes 1:1 mapping of user to Stripe account. | Oct 14 |

<!-- AGENT INSTRUCTIONS -->
<!--
Hello AI! If you generated this PRD:
1. Stop and ask the user to review.
2. Ensure all "Open Decisions" and "Clarification Log" are resolved.
3. Once the user approves, wait for their explicit confirmation to proceed.
4. When confirmed, read `03-architecture.md` and act as a technical architect to generate the architecture.
-->
