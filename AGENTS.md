# Huddle Agent Guide

This file is the source of truth for AI coding agents working in this repository.

## Product

Huddle is a collaborative, multi-tenant Kanban board for organizations. Organizations can create multiple boards, and each board can have a custom ordered set of columns. Its main demo feature imports meeting notes with Claude and creates actionable cards live, one by one.

## Non-negotiable working rules

- Never start a development server unless the user explicitly asks. This includes `pnpm dev`, `pnpm turbo dev`, Vite, Express, Prisma Studio, and watch-mode commands.
- Do not install, remove, or upgrade dependencies unless the task requires it.
- Do not run database migrations against a shared or production database.
- Never expose secrets in source code, logs, screenshots, commits, or client-side bundles.
- Preserve unrelated user changes. Do not reset or overwrite work outside the requested task.
- Keep changes scoped, reviewable, and appropriate for a build-day project.
- Prefer a reliable core demo over optional breadth.

## Confirmed decisions

- Runtime: Node.js 24.21.0 LTS, recorded in `.nvmrc`
- Package manager: pnpm
- Monorepo: Turborepo
- Web: React, TypeScript, and Vite
- API: Node.js, TypeScript, Express, and Socket.IO
- Local database: XAMPP MariaDB 10.4.32 through Prisma's `mysql` connector
- ORM: Prisma 7.10.0; do not upgrade to Prisma 8 until MySQL/MariaDB is supported
- Authentication: Better Auth; prioritize Google OAuth for the demo
- UI: Tailwind CSS and shadcn/ui
- Icons: Hugeicons Free via `@hugeicons/react` and `@hugeicons/core-free-icons`
- Drag and drop: use an accessible React drag-and-drop library; prefer `@dnd-kit`
- AI: Anthropic SDK
- `@mention` AI assistance: stretch goal; keep isolated so it can be cut without affecting transcript import

## Priority order

1. Transcript/meeting-notes import
2. Stable board and custom-column CRUD
3. Real-time synchronization
4. Seeded demo data and a smooth two-minute demo
5. Authentication and organization polish
6. Per-card Claude `@mention` assistance

If schedule pressure appears, cut features in this order:

1. GitHub OAuth
2. Per-card Claude `@mention`
3. General issue comments
4. Member invitation flow

Never cut the transcript import, multiple boards, or custom columns.

## Intended repository layout

```text
huddle/
|-- apps/
|   |-- web/          # Vite + React + Tailwind + shadcn/ui
|   `-- api/          # Express + Socket.IO + Prisma + Better Auth
|       `-- prisma/   # Prisma schema and migrations owned by the API
|-- packages/
|   `-- shared/       # Shared domain types, schemas, and socket contracts
|-- AGENTS.md
|-- ARCHITECTURE.md
|-- DESIGN.md
|-- IMPLEMENTATION_PLAN.md
`-- README.md
```

Do not duplicate domain contracts between apps. Put shared API payloads, Zod schemas, column contracts, and Socket.IO event types in `packages/shared`.

## Architecture rules

- REST endpoints are the source of truth for writes.
- Prisma is the only application layer that directly accesses MySQL.
- After a successful write, the API emits a typed Socket.IO event.
- For real-time mutations, clients reconcile from socket events, including the initiating client. Do not also apply the REST response as a second optimistic update.
- Scope every organization-owned query and mutation by the authenticated user's organization membership.
- Never trust a client-provided `orgId`, `boardId`, or `issueId` without authorization checks.
- Keep the transcript parser and Anthropic client behind service interfaces so they are testable and replaceable.
- Validate all external input and AI output with shared Zod schemas.
- Use transactions for multi-row operations that must remain consistent.

## Real-time contract

Prefer explicit events over a generic event envelope:

- `board:join`
- `board:created`
- `board:updated`
- `board:deleted`
- `column:created`
- `column:updated`
- `column:moved`
- `column:deleted`
- `issue:created`
- `issue:updated`
- `issue:moved`
- `comment:created`
- `import:started`
- `import:card`
- `import:done`
- `import:failed`
- `agent:thinking` (stretch)
- `agent:result` (stretch)
- `agent:failed` (stretch)

The original build plan permits a global broadcast for a demo, but organization/board rooms are the safer default. Use rooms named from server-authorized organization and board IDs. Never accept an arbitrary room name from the client.

## Data conventions

- Model columns as first-class `BoardColumn` records instead of an `IssueStatus` enum.
- Every new board starts with three editable default columns: `Upcoming`, `In progress`, and `Done`.
- Store integer positions with gaps (for example, 1024, 2048, 3072) on each column and issue so both orders survive refreshes and concurrent clients. Rebalance positions transactionally when gaps run out.
- An issue belongs to exactly one column, and the column belongs to the same board as the issue.
- Support creating, renaming, and reordering columns as core behavior.
- A non-empty column cannot be deleted until the user chooses a destination column for its issues. Move the issues and delete the column in one transaction.
- A board must always contain at least one column.
- Add timestamps to primary entities.
- Enforce unique organization membership for `(userId, orgId)`.
- Prefer soft assumptions in UI code and hard validation in API code.
- Use cursor or bounded pagination for comments if the list can grow.

## AI import rules

- The endpoint accepts meeting notes plus the target board ID.
- Put a reasonable length limit on notes and reject blank input.
- Include the current board's allowed column IDs and names in the Claude request.
- Ask Claude for structured JSON containing `title`, `description`, and one allowed `columnId` only. Claude must not create columns.
- Validate the complete response before database writes.
- Reject unknown column IDs or map them to the board's first column only if the parsing policy explicitly permits that fallback.
- Limit the number of imported issues to prevent accidental cost and board flooding.
- Create issues through the same domain service used by normal CRUD.
- Emit `import:card` after each committed issue and stagger visible delivery by roughly 300 ms for the demo.
- Do not hold a database transaction open while waiting between socket emissions.
- Report safe, actionable failures without leaking provider details or prompts.

## UI and UX rules

- Follow both `DESIGN.md` and the persistent project identity in `.impeccable.md`.
- For substantial UI work, use focused design skills when available: `arrange`, `typeset`, and `colorize` during implementation; `adapt` and `harden` for responsive and edge-case work; `audit` and `polish` before the demo. Do not apply every skill mechanically to minor changes.
- Build keyboard-accessible interactions and visible focus states.
- Dragging must not be the only way to move an issue between columns.
- Use semantic buttons, labels, dialogs, and form errors.
- Include loading, empty, error, reconnecting, and permission-denied states.
- Keep responsive behavior usable at mobile widths, even if the main demo is desktop.
- Use design tokens instead of scattered one-off colors and spacing values.
- Use `HugeiconsIcon` with individually imported Hugeicons Free icons; do not use wildcard icon imports or mix icon libraries.

## Code quality

- Use TypeScript in strict mode. Avoid `any`; narrow `unknown` safely.
- Prefer small domain-focused modules over large route or component files.
- Keep route handlers thin: authenticate, validate, call a service, serialize.
- Use shared schemas to derive TypeScript types where practical.
- Return consistent API errors with a stable `code` and human-readable `message`.
- Add comments only for decisions or non-obvious constraints, not line-by-line narration.

## Verification

Run only checks relevant to the change. Safe non-server checks include:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec prisma validate
```

Do not run commands in watch mode. Do not start the dev server for verification unless the user asks.

Before dependency or build commands, confirm `node --version` reports Node 24.21.0. Use `nvm use 24.21.0` if necessary.

Minimum important test coverage:

- Organization authorization boundaries
- Issue creation, updates, moves, and stable ordering
- AI response parsing and rejection of malformed output
- Transcript import success and failure paths
- Socket event payload validation
- Duplicate-event/idempotent client reconciliation

## Definition of done

- The requested behavior is implemented and scoped correctly.
- Tenant authorization is enforced server-side.
- Types and schemas remain shared where appropriate.
- Loading, empty, error, and reconnect states are handled.
- Relevant lint, type, test, or build checks pass.
- Documentation and `.env.example` are updated when configuration changes.
- No server was left running.

## Open decisions to ask the owner when relevant

Do not block unrelated work on these. Ask only when a task reaches the decision:

- Should production use board-specific rooms from day one, or temporarily use a global demo broadcast?
- Should email/password sign-in ship with Google OAuth, or remain post-demo?
- Can any organization member edit settings and invite members, or only an `OWNER`/`ADMIN` role?
- Should imported issues be reviewed before creation, or immediately populate the board?
