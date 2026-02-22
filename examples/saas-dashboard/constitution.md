# Constitution

## Identity

- **Project:** MetricPulse
- **One-liner:** A lightweight analytics dashboard for indie SaaS founders to track MRR, churn, and user engagement in one place.
- **Target users:** Solo founders and small SaaS teams (1-5 people)

## Technical Principles

- **Stack:** Next.js 15, TypeScript, Tailwind CSS 4, Supabase (Postgres + Auth + Realtime)
- **Language rules:** TypeScript strict mode. No `any`. Zod for all runtime validation.
- **Architecture pattern:** Server components by default. Client components only for interactivity. No client-side data fetching for initial loads.
- **Data layer:** Supabase with RLS. All queries via `lib/db/queries/`. No raw SQL in components.
- **Auth:** Supabase Auth with magic link + GitHub OAuth.
- **Deployment:** Vercel. Preview deploys on every PR.

## Quality Standards

- [ ] All API inputs validated with zod schemas
- [ ] Error boundaries on every page
- [ ] Loading states for all async operations
- [ ] Mobile-responsive (min 375px)
- [ ] No hardcoded secrets — env vars only

## Constraints

- **DO NOT:** Add npm packages without explicit approval
- **DO NOT:** Use client-side state management libraries (no Redux, Zustand)
- **DO NOT:** Create custom auth flows — use Supabase Auth SDK only
- **DO NOT:** Store computed metrics — derive at query time

## Conventions

- **File naming:** kebab-case for files, PascalCase for components
- **Directory structure:** feature-based under `src/features/[feature]/`
- **API pattern:** Next.js route handlers at `src/app/api/v1/`
- **Error handling:** Custom `AppError` class with code, message, statusCode
- **Components:** Reusable primitives in `src/components/ui/`, feature components co-located

## Out of Scope

- Native mobile app
- Multi-tenancy / white-labeling
- Custom event tracking SDK (use Stripe webhooks + Supabase logs)
- Internationalization
