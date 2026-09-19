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

| Phase                       | State                                                                         |
| --------------------------- | ----------------------------------------------------------------------------- |
| 0 — Foundation              | Done                                                                          |
| 1 — Data and authentication | Done: Prisma client, migration, Better Auth, tenant authorization, seed       |
| 2 — Core REST product       | Done: organizations, boards, columns, issues, dashboard, and board UI         |
| 3 — Real-time collaboration | Done: authenticated Socket.IO, organization/board rooms, cache reconciliation |
| 4 — Meeting-notes import    | Done: Claude extraction with structured output, staggered cards, progress UI  |
| 5 — Demo hardening          | Next                                                                          |

Every write goes through REST. After the transaction commits, the API emits a typed Socket.IO event and all connected clients, including the one that made the change, reconcile from that event. When the socket is down, the web app falls back to refetching the board so REST stays authoritative.

## Local setup

1. Use Node 24.21.0 (`nvm use 24.21.0`) and pnpm 10.30.1, then run `pnpm install`.
2. Start only the MySQL module in XAMPP and create a `huddle` database plus a dedicated user.
3. Copy `.env.example` to `apps/api/.env` and fill in `DATABASE_URL` and a real `BETTER_AUTH_SECRET`. Google credentials are optional; the Google button only appears when both are set. `ANTHROPIC_API_KEY` is optional too: without it the app runs, but the `Import notes` button is disabled.
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

   This creates two workspaces and five people who all share the password `huddle-demo-2026` (override with `SEED_DEMO_PASSWORD`):

   | Workspace        | Boards                                                                                         | People                                                                                              |
   | ---------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
   | Northwind Studio | Q4 launch planning (default columns), Website redesign (4 columns), Mobile app 2.1 (5 columns) | Priya `demo@huddle.local` (owner), Dana `dana@huddle.local` (admin), Marcus, Tomás, Aisha (members) |
   | Lumen Labs       | Research roadmap (5 columns)                                                                   | Dana (owner), Aisha `aisha@huddle.local` (admin), Priya (member)                                    |

   Issues carry a spread of assignees, priorities, and due dates, and a few on the launch board were "imported" so Claude appears as their author. For the real-time demo, sign in as `marcus@huddle.local` in a second browser. Northwind Studio also has a pending invitation for `taylor@huddle.local`: create an account with that address to walk through joining from an invitation. Re-running is safe; `SEED_RESET=1` wipes and recreates the demo workspaces (people are kept).

   To empty a board between rehearsals without deleting its columns, or to fill one of your own boards with demo issues spread across its columns and assigned to the people you name:

   ```bash
   pnpm --filter @huddle/api db:clear-board -- <boardId> --dry-run
   pnpm --filter @huddle/api db:clear-board -- <boardId>
   pnpm --filter @huddle/api db:seed-board -- <boardId> --assign you@example.com,teammate@example.com
   ```

   The board ID is the last segment of its URL. `db:seed-board` puts not-started work in the first column, finished work in the last, and in-flight work in between; add `--reset` to clear the board first. The named people must already have signed in and belong to the board's workspace.

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

| Method | Route                                              | Purpose                                                    |
| ------ | -------------------------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/me`                                          | Current user, their organizations, and pending invitations |
| GET    | `/api/organizations`                               | Organizations the user belongs to                          |
| POST   | `/api/organizations`                               | Create an organization (caller is OWNER)                   |
| GET    | `/api/organizations/:id`                           | One organization                                           |
| PATCH  | `/api/organizations/:id`                           | Update name/description (OWNER or ADMIN)                   |
| GET    | `/api/organizations/:id/members`                   | Members                                                    |
| GET    | `/api/organizations/:id/invitations`               | Pending invitations (OWNER or ADMIN)                       |
| POST   | `/api/organizations/:id/invitations`               | Invite by email: `{ "email", "role" }` (OWNER or ADMIN)    |
| DELETE | `/api/organizations/:id/invitations/:invitationId` | Revoke a pending invitation (OWNER or ADMIN)               |
| GET    | `/api/invitations`                                 | Invitations waiting for the signed-in user's email         |
| POST   | `/api/invitations/:invitationId/accept`            | Join the workspace an invitation names                     |
| GET    | `/api/organizations/:id/boards`                    | Boards with column and issue counts                        |
| POST   | `/api/organizations/:id/boards`                    | Create a board with three starter columns                  |
| GET    | `/api/boards/:boardId`                             | Board with ordered columns and issues                      |
| PATCH  | `/api/boards/:boardId`                             | Update title/description                                   |
| DELETE | `/api/boards/:boardId`                             | Delete a board and everything on it                        |
| POST   | `/api/boards/:boardId/columns`                     | Add a column                                               |
| PATCH  | `/api/columns/:columnId`                           | Rename a column                                            |
| POST   | `/api/columns/:columnId/move`                      | Reorder: `{ "index": n }`                                  |
| DELETE | `/api/columns/:columnId`                           | Delete; needs `destinationColumnId` if non-empty           |
| POST   | `/api/columns/:columnId/issues`                    | Add an issue; optional priority, assignee, due date        |
| GET    | `/api/issues/:issueId`                             | One issue                                                  |
| PATCH  | `/api/issues/:issueId`                             | Update title, description, priority, assignee, due date    |
| POST   | `/api/issues/:issueId/move`                        | Move: `{ "columnId", "index" }`                            |
| DELETE | `/api/issues/:issueId`                             | Delete an issue                                            |
| POST   | `/api/boards/:boardId/imports/meeting-notes`       | Turn pasted notes into issues with Claude: `{ "notes" }`   |

Resources outside the caller's organizations respond with `404` so their existence is never revealed; `403` is reserved for role restrictions inside an organization.

## Meeting-notes import

`POST /api/boards/:boardId/imports/meeting-notes` is the demo's centerpiece. The flow lives in `apps/api/src/modules/imports/`:

1. The route authorizes the board, validates the notes with the shared `importNotesInputSchema` (non-blank, at most 20,000 characters), and applies a per-user rate limit.
2. The API emits `import:started` to the board room so every viewer sees the board is busy.
3. `task-extractor.ts` asks Claude (`claude-opus-5` by default, override with `ANTHROPIC_MODEL`) for structured JSON. The request includes the board's column IDs and names; the output schema allows only `title`, `description`, and one of those `columnId` values. Claude never creates columns.
4. `import-parser.ts` normalizes safe fields (whitespace, length) and validates the whole reply with the shared Zod schema before any write. An unknown column ID rejects the import; an empty list is reported as `422 IMPORT_NO_TASKS`; anything past 25 tasks is dropped.
5. Every task is inserted through the same `insertIssue` helper as manual cards, in one transaction, with `source: AI_IMPORT`.
6. After commit, the REST response returns the created issues and a small scheduler emits one `import:card` every 300 ms, then `import:done`. No transaction is held open during the stagger.
7. Any failure emits `import:failed` and returns a stable error: `503 IMPORT_UNAVAILABLE` (no key or bad configuration), `429 RATE_LIMITED`, or `502 IMPORT_FAILED`. Provider details, prompts, and notes are never sent to the client or written to logs.

On the web, `Import notes` in the board header opens the dialog. The notes stay in the textarea if the import fails so a retry is one click away, and `Use sample notes` offers five transcripts (launch sync, incident review, design review, customer call, sprint planning) that name the seeded people. While Claude reads the notes the dialog shows Claude's mark with a short sequence of progress messages; imported issues then show Claude as their author, with the importer credited in the issue sheet. Connected clients fold each `import:card` into the board exactly like `issue:created`; a pill at the foot of the board shows `Reading your notes…`, `Adding tasks to the board · 3 of 6`, and `6 tasks created from notes` for everyone watching.

Tests use fixture replies and never call Claude: `import-parser.test.ts`, `import-runner.test.ts`, `task-extractor.test.ts`, and `import-scheduler.test.ts` in the API, plus the progress reducer test in the web app.

## Invitations

Workspace owners and admins invite people from **Members** in the sidebar (`/organizations/:id/members`). Nothing is emailed: an invitation is a row bound to a lowercased email address, and only an account signed in with that address can accept it. The flow lives in `apps/api/src/modules/invitations/`.

- `POST /api/organizations/:id/invitations` takes `{ "email", "role" }` where `role` is `MEMBER` or `ADMIN`; ownership is never granted by invitation. Inviting a current member answers `409 ALREADY_MEMBER`. Re-inviting a pending address renews it with the new role and expiry instead of failing. Creation is rate limited per manager.
- Invitations expire after 7 days (`INVITATION_TTL_DAYS` in `@huddle/shared`). Expired rows are ignored by every list, and accepting one answers `410 INVITATION_EXPIRED`.
- `GET /api/me` includes `invitations`, the pending ones addressed to the signed-in email. Someone with no workspace and a pending invitation lands on `/invitations` after sign-in instead of the create-workspace form; someone who already has a workspace sees an **Invitations** entry in the workspace switcher. **Copy invite link** on the members page copies `/invitations`, which is safe to share because it lists only the invitations addressed to whoever signs in.
- `POST /api/invitations/:invitationId/accept` creates the membership and deletes the invitation in one transaction and returns the new `OrganizationMembership`. An invitation that is missing, revoked, or addressed to someone else answers `404 INVITATION_NOT_FOUND`, so a link never reveals who was invited where. The web app reconnects its socket after joining so the new workspace's rooms are joined.
- `DELETE` revokes by deleting the row; the invitee's next `/api/me` no longer lists it.

`invitation-policy.test.ts` covers the acceptance rules; `schemas.test.ts` covers the input contract.

## Real-time

Socket.IO is served from the API on the default `/socket.io` path (proxied by Vite in development). The handshake is authenticated with the same Better Auth session cookie as REST; a missing session fails the connection with `UNAUTHENTICATED`, and the client stops retrying and returns to sign-in.

Rooms are named only from server-resolved IDs:

| Room                          | Joined when                                       | Carries                                                                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `org:{orgId}`                 | On connect, for every organization the user is in | `board:created`, `board:updated`, `board:deleted`                                                                                                                                                                           |
| `org:{orgId}:board:{boardId}` | On `board:join` after membership is verified      | `column:created`, `column:updated`, `column:moved`, `column:deleted`, `issue:created`, `issue:updated`, `issue:moved`, `issue:deleted`, `presence:updated`, `import:started`, `import:card`, `import:done`, `import:failed` |

`board:join` takes `{ "boardId" }`, is validated with the shared Zod schema, and is acknowledged with `{ "ok": true }` or `{ "ok": false, "code", "message" }` using the same error codes as REST. `board:leave` takes the same payload. The `*:moved` events include `rebalanced` sibling positions so every client converges without a refetch even when gapped positions are re-spread.

`presence:updated` carries `{ boardId, users }`, the deduplicated list of people who currently have the board open. The API keeps this in memory per process (`apps/api/src/realtime/presence.ts`) and sends it to the room after every join, leave, and disconnect. The board header shows the list as an avatar stack with the current user last.

On the web, `RealtimeProvider` owns the socket lifecycle and folds events into the TanStack Query cache with idempotent reducers (`apps/web/src/features/board-events.ts`). A board page re-joins its room and refetches on every reconnect, and the shell header shows a quiet connection indicator that only grows a label while reconnecting or offline.

## Core demo

1. Open a seeded organization board.
2. Choose `Import notes` and paste meeting notes, or click `Use sample notes`.
3. Claude extracts actionable issues and sorts them into the board's columns.
4. Issues appear one by one for all connected clients.
5. Moving an issue updates every client in real time.

The optional per-card Claude `@mention` workflow is a stretch feature and may be cut without affecting the core import experience.

## Working agreement

Agents and contributors must follow [AGENTS.md](./AGENTS.md). In particular, do not start development servers unless the user explicitly requests it.

## Environment

Never commit real credentials. Environment files other than `.env.example` are ignored by git.
