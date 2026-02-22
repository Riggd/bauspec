# Braindump

## The Problem

I'm running a small SaaS and I check 4 different dashboards every morning — Stripe for revenue, my database for user counts, PostHog for engagement, and a spreadsheet for churn calculations. It takes 30 minutes and I always forget to check something. I want one screen that shows me the health of my business.

## The Idea

A simple dashboard that connects to Stripe and shows MRR, churn rate, active users, and trial conversions. Like Baremetrics but way simpler and cheaper. Self-hosted on my own Supabase instance so I own the data.

## Users & Scenarios

**User type 1:** Solo SaaS founder (me)
- They want to check business health in under 60 seconds every morning
- They currently bounce between Stripe dashboard, analytics tools, and spreadsheets
- The frustration is context-switching and manual calculations

**User type 2:** Small team lead
- They want to share key metrics with their team without giving everyone Stripe access
- They currently screenshot Stripe charts into Slack
- The frustration is stale data and no single source of truth

## Key Features (Rough)

- MRR tracking with trend line
- Churn rate (monthly)
- Active users count (DAU/MAU)
- Trial → paid conversion rate
- Revenue chart (last 12 months)
- Stripe webhook integration for real-time updates
- Simple email digest (weekly summary)

## What Already Exists?

Baremetrics — great but $108/mo minimum, overkill for small SaaS
ChartMogul — similar price range, complex setup
ProfitWell (now Paddle) — free but requires Paddle, migration hassle
Stripe Dashboard — free but limited views, no churn calc, no custom metrics

## Open Questions

- [ ] Should I calculate churn myself or use Stripe's built-in metrics?
- [ ] Do I need real-time updates or is hourly sync enough?
- [ ] How do I handle multiple Stripe accounts?
- [ ] Should this be open source?

## Non-Negotiables

- Must load dashboard in under 2 seconds
- Must work with Stripe (primary payment processor for indie SaaS)
- Data stays in my Supabase — no third-party analytics services
- Free tier viable (for my own use), paid tier later
