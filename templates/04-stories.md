# Development Stories

> Generated from PRD + Architecture + Constitution.
> Each story is self-contained — an agent should be able to implement it
> by reading ONLY that story + the constitution.
>
> **Execution order matters.** Stories are numbered by dependency.
> Stories marked [P] can run in parallel.

## Story Map

<!-- Quick visual of what gets built in what order -->

```
S0: Project Setup
 └── S1: Auth Flow
      ├── S2: Dashboard Layout [P]
      └── S3: [Feature] [P]
           └── S4: [Feature]
                └── S5: Polish & Edge Cases
```

## Execution Checklist

- [ ] S0: Project Setup
- [ ] S1: Auth Flow
- [ ] S2: Dashboard Layout
- [ ] S3: [Feature]
- [ ] S4: [Feature]
- [ ] S5: Polish & Edge Cases

---

## S0: Project Setup

<!-- AGENT-CONTEXT: This story bootstraps the project. No prior code exists. -->

**Depends on:** Nothing
**Estimated scope:** Small (< 30 min agent time)

### Objective

Set up the project skeleton with all tooling configured per the architecture doc.

### Tasks

1. Initialize project: `npx create-next-app@latest [name] --typescript --tailwind --app --src-dir`
2. Configure TypeScript strict mode in `tsconfig.json`
3. Set up directory structure per architecture doc
4. Create `.env.example` with all required variables
5. Create `lib/db/client.ts` — database client initialization
6. Create `lib/auth/config.ts` — auth configuration
7. Verify: `npm run build` passes with zero errors

### Done When

- [ ] Project builds cleanly
- [ ] Directory structure matches architecture doc
- [ ] `.env.example` documents all required env vars
- [ ] README has setup instructions

---

## S1: [Story Title]

<!-- AGENT-CONTEXT:
  Constitution: [reference key constraints relevant to this story]
  PRD Features: [F1, F2 — which features this implements]
  Architecture: [relevant sections — e.g., Auth Architecture, Schema: users table]
  Depends on: S0
-->

**Depends on:** S0
**Estimated scope:** Medium | Small | Large
**PRD Features:** F1, F2

### Objective

<!-- One sentence. What does the user get when this is done? -->

### Context

<!-- Everything the agent needs to know that isn't in the tasks.
     Embed the relevant architecture decisions, schema details, and
     constraints HERE — don't make the agent go look them up. -->

**Relevant schema:**
```sql
-- Paste the exact table definitions this story touches
```

**Relevant API endpoints:**
```
GET  /api/v1/...  — [purpose]
POST /api/v1/...  — [purpose]
```

**Key constraints from constitution:**
- [e.g., All inputs validated with zod]
- [e.g., Server components by default]

### Tasks

<!-- Numbered. Specific. Each task = one clear action. -->

1. Create `src/app/(auth)/layout.tsx` — Auth-required layout with session check
2. Create `src/lib/auth/middleware.ts` — Middleware to protect routes
3. Create `src/app/(public)/login/page.tsx` — Login page with [auth method]
4. Create `src/app/api/v1/auth/callback/route.ts` — OAuth callback handler
5. Add RLS policy: `users` table — users can only read/write own rows
6. Test: Login flow works end-to-end

### Acceptance Criteria

<!-- Copied from PRD. The agent checks these when done. -->

- [ ] [Testable condition from PRD]
- [ ] [Testable condition from PRD]
- [ ] [Testable condition from PRD]

### Edge Cases

- [What happens when session expires mid-action?]
- [What happens with invalid OAuth state?]

---

## S[N]: [Story Title]

<!-- Copy this block for each story. Keep the structure identical. -->

**Depends on:** S[N-1]
**Estimated scope:** Small | Medium | Large
**PRD Features:** F[X]

### Objective

### Context

### Tasks

1.
2.
3.

### Acceptance Criteria

- [ ]
- [ ]

### Edge Cases

-

---

<!-- TEMPLATE NOTES (delete when using):

Story sizing guide:
- Small: 1-3 files, single concern (< 30 min agent time)
- Medium: 3-8 files, one feature (30-90 min agent time)
- Large: 8+ files, complex feature — consider splitting

Token efficiency:
- Embed context IN the story. Don't reference other docs.
- An agent should implement a story by reading ONLY that story + constitution.
- Keep each story under ~1500 words for optimal context usage.

Parallelization:
- Mark stories [P] if they have the same dependency and don't touch the same files.
- Agents like Claude Code can run parallel stories as separate tasks.
-->
