# Constitution

> Non-negotiable principles for this project. Loaded as context for every phase.
> Keep this under 500 words — it's injected into every agent interaction.

## Identity

- **Project:** [Name]
- **One-liner:** [What this is in one sentence]
- **Target users:** [Who uses this]

## Technical Principles

<!-- Pick what applies. Delete the rest. Be specific — "use React" not "use a modern framework." -->

- **Stack:** [e.g., Next.js 15, TypeScript, Tailwind, Supabase]
- **Language rules:** [e.g., TypeScript strict mode, no `any` types]
- **Architecture pattern:** [e.g., Server components by default, client only when interactive]
- **Data layer:** [e.g., Supabase with row-level security, no raw SQL in components]
- **Auth:** [e.g., Supabase Auth with OAuth providers]
- **Deployment:** [e.g., Vercel, preview deploys on PR]

## Quality Standards

<!-- These are your "definition of done" gates -->

- [ ] [e.g., All endpoints have input validation]
- [ ] [e.g., Error states handled in every UI component]
- [ ] [e.g., Mobile-responsive by default]
- [ ] [e.g., No hardcoded secrets or API keys]

## Constraints

<!-- Things the agent must NOT do -->

- **DO NOT:** [e.g., Add new dependencies without explicit approval]
- **DO NOT:** [e.g., Modify the database schema without updating the migration]
- **DO NOT:** [e.g., Use client-side state management for server-available data]

## Conventions

<!-- Naming, file structure, patterns the agent should follow -->

- **File naming:** [e.g., kebab-case for files, PascalCase for components]
- **Directory structure:** [e.g., feature-based: `src/features/[feature]/`]
- **API pattern:** [e.g., REST with `/api/v1/` prefix]
- **Error handling:** [e.g., Custom AppError class, never throw raw strings]

## Out of Scope

<!-- Explicitly excluded to prevent scope creep -->

- [e.g., Native mobile app]
- [e.g., Multi-tenancy]
- [e.g., Internationalization (for now)]
