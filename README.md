# Bauspec

Zero-dependency spec-driven development. Turn brainstorms into agent-executable specs.

```
BRAINDUMP  →  PRD  →  ARCHITECTURE  →  STORIES  →  Agent executes
(messy)      (what)     (how)          (do it)
```

Inspired by [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD), [OpenSpec](https://github.com/Fission-AI/OpenSpec), [GitHub Spec Kit](https://github.com/github/spec-kit), and [Agent OS](https://github.com/buildermethods/agent-os) — without the ceremony.

## Install

Choose your method:

### npx (recommended)

```bash
# In your project root
npx bauspec init

# Custom directory name
npx bauspec init --dir specifications
```

### Shell script (no npm needed)

```bash
curl -sSL https://raw.githubusercontent.com/riggd/bauspec/main/install.sh | bash

# Custom directory name
curl -sSL https://raw.githubusercontent.com/riggd/bauspec/main/install.sh | bash -s -- my-specs
```

### GitHub Template

Click **"Use this template"** on the [GitHub repo](https://github.com/riggd/bauspec) and copy the `templates/` folder into your project as `specs/`.

### degit

```bash
npx degit riggd/bauspec/templates specs
```

### Manual

```bash
git clone https://github.com/riggd/bauspec.git /tmp/bauspec
cp -r /tmp/bauspec/templates ./specs
rm -rf /tmp/bauspec
```

## What It Does

The installer:

1. **Copies 5 markdown templates** into `specs/` (constitution, braindump, PRD, architecture, stories)
2. **Scaffolds directories** — `specs/features/` for future features, `specs/drafts/` for WIP
3. **Auto-detects your tech stack** and pre-fills `constitution.md` (framework, DB, auth, etc.)
4. **Scans for AI agent configs** (CLAUDE.md, .cursorrules, AGENTS.md, etc.) and suggests how to make them Bauspec-aware
5. **Updates .gitignore** to exclude draft braindumps

## What You Get

```
specs/
├── constitution.md       ← Project principles (auto-detected stack pre-filled)
├── 01-braindump.md       ← Raw idea capture
├── 02-prd.md             ← Product requirements
├── 03-architecture.md    ← Technical architecture
├── 04-stories.md         ← Agent-executable dev stories
├── features/             ← Per-feature spec folders
└── drafts/               ← WIP braindumps (gitignored)
```

## Usage

### New Project

```bash
npx bauspec init
# Fill in constitution.md (5 min)
# Braindump into 01-braindump.md (10-30 min)
# Hand off to your AI agent for the rest
```

### Add a Feature

```bash
npx bauspec add dark-mode
# Creates specs/features/dark-mode/ with braindump, PRD, and stories templates
# Architecture skipped — uses project-level
```

### Agentic Handoffs

You don't need to babysit the agent between phases. Bauspec templates include embedded `<!-- AGENT INSTRUCTIONS -->` that guide the AI.

To start the process, just tell your agent:
> "Read `specs/01-braindump.md` and follow its instructions."

The agent will automatically read the constitution, ask clarifying questions, and prompt you for approval before generating the PRD, Architecture, and Stories in sequence.

## Agent Config Detection

The installer detects and provides integration suggestions for:

| Agent | Config File(s) |
|-------|---------------|
| Claude Code | `CLAUDE.md`, `.claude/settings.json`, `.claude/skills/` |
| Cursor | `.cursorrules`, `.cursor/rules/` |
| Windsurf | `.windsurfrules` |
| GitHub Copilot | `.github/copilot-instructions.md`, `.github/agents/` |
| Gemini / Antigravity | `AGENTS.md`, `.gemini/`, `.antigravity/` |
| Agent OS | `agent-os/`, `.agent-os/` |
| GitHub Spec Kit | `.specify/` |
| OpenSpec | `openspec/` |
| BMAD-METHOD | `.bmad/` |
| Roo Code | `.roomodes` |
| Continue | `.continuerules` |

When an existing SDD framework is detected (Spec Kit, OpenSpec, BMAD), the installer notes the overlap and suggests whether to coexist or migrate.

## Design Decisions

| Decision | Why |
|----------|-----|
| Zero dependencies | Works everywhere. Nothing to update, audit, or break. |
| Markdown only | Every AI coding agent reads it natively. |
| No agent personas | Clear instructions beat role-play wrappers and cost fewer tokens. |
| Single-file phases | One file = one context window load. No cross-reference chasing. |
| Stories embed context | Agent reads one story + constitution. Nothing else needed. |
| Stack auto-detection | Reduces setup friction from 15 min to 5 min. |
| Agent config awareness | Meets developers where they already are. |

## Token Efficiency

- **Constitution:** Keep under 500 words. It's loaded with every interaction.
- **Braindump:** Can be messy — it's only human-facing. The PRD replaces it.
- **Stories:** Each embeds its own context. Agent reads ~1500 words per story, not the entire spec.
- **Drafts folder:** Gitignored. Keeps messy WIP out of your repo.

## Examples

See `examples/saas-dashboard/` for a complete end-to-end example:
- Braindump → PRD → Architecture → 7 implementation stories
- Shows a Stripe-connected analytics dashboard built with Next.js + Supabase

## Contributing

PRs welcome. Keep it light — the core principle is zero dependencies.

## License

MIT
