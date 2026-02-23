# Technical Architecture

> Generated from PRD + Constitution. This is the HOW.
> Must satisfy every P0 and P1 requirement from the PRD.
>
> **Status:** [ ] Draft → [ ] In Review → [ ] Approved

## System Overview

<!-- One paragraph. What does this system do at the highest level? -->
<!-- Include a simple ASCII diagram if helpful. -->

```
[Client] → [API Layer] → [Data Layer]
              ↓
         [External Services]
```

## Tech Stack

<!-- Be exact. Versions matter for agents. -->

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Frontend | [e.g., Next.js] | [e.g., 15.x] | [Why this choice] |
| Styling | [e.g., Tailwind CSS] | [e.g., 4.x] | |
| Backend | [e.g., Next.js API routes] | | |
| Database | [e.g., Supabase/Postgres] | | |
| Auth | [e.g., Supabase Auth] | | |
| Hosting | [e.g., Vercel] | | |
| | | | |

## Project Structure

<!-- Actual directory layout the agent should create. Be specific. -->

```
src/
├── app/                    # Next.js app router
│   ├── (auth)/             # Auth-required routes
│   │   ├── dashboard/
│   │   └── settings/
│   ├── (public)/           # Public routes
│   │   ├── login/
│   │   └── signup/
│   ├── api/                # API routes
│   │   └── v1/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                 # Reusable primitives
│   └── features/           # Feature-specific components
├── lib/
│   ├── db/                 # Database client, queries
│   ├── auth/               # Auth utilities
│   └── utils/              # Shared helpers
├── types/                  # TypeScript type definitions
└── hooks/                  # Custom React hooks
```

## Data Architecture

### Schema

<!-- Define actual tables/collections. Agents need exact field names and types. -->

#### [Table: users]

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK, default gen | |
| email | text | unique, not null | |
| name | text | not null | |
| role | enum | default 'member' | Values: admin, member |
| created_at | timestamptz | default now() | |

#### [Table: ...]

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|

### Relationships

```
users 1──* projects
projects 1──* tasks
tasks *──1 users (assignee)
```

### Key Queries

<!-- The 5-10 most important data access patterns. -->

| Query | Description | Used By |
|-------|-------------|---------|
| [e.g., Get user's projects] | [e.g., SELECT with join on membership] | [e.g., Dashboard page] |
| | | |

## API Design

### Endpoints

| Method | Path | Purpose | Auth | Request | Response |
|--------|------|---------|------|---------|----------|
| GET | /api/v1/projects | List user's projects | Required | query: ?page,limit | { data: Project[], total } |
| POST | /api/v1/projects | Create project | Required | body: { name, desc } | { data: Project } |
| | | | | | |

### Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {}
  }
}
```

## Auth Architecture

<!-- How auth works end-to-end. Agents need this to wire up protected routes. -->

- **Strategy:** [e.g., Supabase Auth with magic link + OAuth]
- **Session management:** [e.g., Server-side via Supabase SSR helpers]
- **Protected routes:** [e.g., Middleware checks session, redirects to /login]
- **Role-based access:** [e.g., RLS policies on Supabase, checked at DB level]

## External Services

| Service | Purpose | Auth Method | Failure Mode |
|---------|---------|-------------|-------------|
| [e.g., Resend] | [e.g., Transactional email] | [e.g., API key] | [e.g., Queue + retry] |
| | | | |

## Key Technical Decisions

<!-- Document WHY, not just WHAT. Agents use this to make consistent choices. -->

| Decision | Choice | Alternatives Considered | Why |
|----------|--------|------------------------|-----|
| [e.g., State management] | [e.g., Server state via RSC] | [e.g., Redux, Zustand] | [e.g., Minimizes client JS, simpler mental model] |
| | | | |

## Performance Considerations

- **Target:** [e.g., LCP < 2s, TTI < 3s]
- **Strategy:** [e.g., Server components, edge caching, image optimization]
- **Monitoring:** [e.g., Vercel Analytics]

## Security Considerations

- [e.g., All user input sanitized via zod schemas]
- [e.g., CORS restricted to production domain]
- [e.g., Rate limiting on auth endpoints]
- [e.g., No secrets in client bundle — all via env vars]

## Migration / Setup Requirements

<!-- What needs to happen before code runs. Agents execute this as story 0. -->

1. [e.g., Create Supabase project]
2. [e.g., Run initial migration: `supabase db push`]
3. [e.g., Set environment variables per `.env.example`]
4. [e.g., Configure OAuth providers in Supabase dashboard]

<!-- AGENT INSTRUCTIONS -->
<!--
Hello AI! If you generated this architecture document:
1. Stop and ask the user to review.
2. Ensure all decisions and setups are fully documented.
3. Once the user approves, wait for their explicit confirmation to proceed.
4. When confirmed, read `04-stories.md` and act as an engineering manager to generate the development stories.
-->
