# Huddle

Huddle is a collaborative, organization-aware Kanban workspace that turns meeting notes into actionable work. Teams can create multiple boards, define and reorder their own columns, and manage issues in real time. Claude can extract tasks from pasted notes so cards appear live across connected clients.

## Stack

- pnpm + Turborepo
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Hugeicons Free icons)
- Node.js + Express
- Socket.IO
- Prisma 7 + XAMPP MariaDB locally (`mysql` connector)
- Better Auth with Google OAuth and email/password
- Anthropic SDK

## Repository structure

```text
apps/web        React web application
apps/api        Express API and Socket.IO server
packages/shared Shared types, schemas, and event contracts
```

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the build sequence, [ARCHITECTURE.md](./ARCHITECTURE.md) for system boundaries, and [DESIGN.md](./DESIGN.md) for the interface direction.

## Status

| Phase                       | State                                                                          |
| --------------------------- | ------------------------------------------------------------------------------ |
| 0 — Foundation              | Done                                                                           |
| 1 — Data and authentication | Done: Prisma client, migration, Better Auth, tenant authorization, seed        |
| 2 — Core REST product       | Done: organizations, boards, columns, issues, dashboard, and board UI          |
| 3 — Real-time collaboration | Next. Services already publish through `apps/api/src/realtime/board-events.ts` |
| 4 — Meeting-notes import    | Planned                                                                        |
| 5 — Demo hardening          | Planned                                                                        |

Until Phase 3, the web app reconciles every write by refetching the board over REST.

## Local setup

1. Use Node 24.21.0 (`nvm use 24.21.0`) and pnpm 10.30.1, then run `pnpm install`.
2. Start only the MySQL module in XAMPP and create a `huddle` database plus a dedicated user.
3. Copy `.env.example` to `apps/api/.env` and fill in `DATABASE_URL` and a real `BETTER_AUTH_SECRET`. Google credentials are optional; the Google button only appears when both are set.
4. Apply the schema and generate the client:

   ```bash
   pnpm db:generate
   pnpm --filter @huddle/api db:deploy
   ```

   Use `pnpm --filter @huddle/api db:migrate` instead when you change `schema.prisma` and want a new migration.

5. Seed the demo workspace:

   ```bash
   pnpm --filter @huddle/api db:seed
   ```

   This creates the **Northwind Studio** workspace with two boards and a demo owner: `demo@huddle.local` / `huddle-demo-2026` (override with `SEED_DEMO_PASSWORD`). Re-running is safe; `SEED_RESET=1` wipes and recreates the demo organization.

6. Run `pnpm dev` yourself when you want to use the app. The web app is served on `http://localhost:5173` and proxies `/api` to the API on port 4000, so auth cookies stay same-origin.

## Workspace commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:validate
pnpm db:generate
```

The `pnpm dev` command exists for interactive work, but agents must not start it unless the user explicitly asks.

## API overview

All application routes live under `/api`, return JSON, and use the error shape `{ "error": { "code", "message" } }`. Every route except `/api/health`, `/api/public-config`, and `/api/auth/*` requires a Better Auth session cookie.

| Method | Route                            | Purpose                                          |
| ------ | -------------------------------- | ------------------------------------------------ |
| GET    | `/api/me`                        | Current user and their organizations             |
| GET    | `/api/organizations`             | Organizations the user belongs to                |
| POST   | `/api/organizations`             | Create an organization (caller is OWNER)         |
| GET    | `/api/organizations/:id`         | One organization                                 |
| PATCH  | `/api/organizations/:id`         | Update name/description (OWNER or ADMIN)         |
| GET    | `/api/organizations/:id/members` | Members                                          |
| GET    | `/api/organizations/:id/boards`  | Boards with column and issue counts              |
| POST   | `/api/organizations/:id/boards`  | Create a board with three starter columns        |
| GET    | `/api/boards/:boardId`           | Board with ordered columns and issues            |
| PATCH  | `/api/boards/:boardId`           | Update title/description                         |
| DELETE | `/api/boards/:boardId`           | Delete a board and everything on it              |
| POST   | `/api/boards/:boardId/columns`   | Add a column                                     |
| PATCH  | `/api/columns/:columnId`         | Rename a column                                  |
| POST   | `/api/columns/:columnId/move`    | Reorder: `{ "index": n }`                        |
| DELETE | `/api/columns/:columnId`         | Delete; needs `destinationColumnId` if non-empty |
| POST   | `/api/columns/:columnId/issues`  | Add an issue to the end of a column              |
| GET    | `/api/issues/:issueId`           | One issue                                        |
| PATCH  | `/api/issues/:issueId`           | Update title/description                         |
| POST   | `/api/issues/:issueId/move`      | Move: `{ "columnId", "index" }`                  |
| DELETE | `/api/issues/:issueId`           | Delete an issue                                  |

Resources outside the caller's organizations respond with `404` so their existence is never revealed; `403` is reserved for role restrictions inside an organization.

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

Never commit real credentials. Environment files other than `.env.example` are ignored by git.
