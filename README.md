# Huddle

Huddle is a collaborative, organization-aware Kanban workspace that turns meeting notes into actionable work. Teams can create multiple boards, define and reorder their own columns, and manage issues in real time. Claude can extract tasks from pasted notes so cards appear live across connected clients.

## Planned stack

- pnpm + Turborepo
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Node.js + Express
- Socket.IO
- Prisma 7 + XAMPP MariaDB locally (`mysql` connector)
- Better Auth with Google OAuth
- Anthropic SDK

## Repository structure

```text
apps/web        React web application
apps/api        Express API and Socket.IO server
packages/shared Shared types, schemas, and event contracts
```

The pnpm/Turborepo workspace and application foundations are initialized. See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the build sequence, [ARCHITECTURE.md](./ARCHITECTURE.md) for system boundaries, and [DESIGN.md](./DESIGN.md) for the interface direction.

## Workspace commands

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:validate
pnpm db:generate
```

The `pnpm dev` command exists for future interactive work, but agents must not start it unless the user explicitly asks.

## Core demo

1. Open a seeded organization board.
2. Paste meeting notes into `Import notes`.
3. Claude extracts actionable issues.
4. Issues appear one by one for all connected clients.
5. Moving an issue updates every client in real time.

The optional per-card Claude `@mention` workflow is a stretch feature and may be cut without affecting the core import experience.

## Working agreement

Agents and contributors must follow [AGENTS.md](./AGENTS.md). In particular, do not start development servers unless the user explicitly requests it.

## Environment

Copy `.env.example` to an ignored local environment file once the apps are scaffolded. Never commit real credentials.

Use Node 24.21.0 (`nvm use 24.21.0`) and pnpm 10.30.1. Start only the MySQL module in XAMPP when database access or Prisma migrations are needed; Apache is required only if using phpMyAdmin.
