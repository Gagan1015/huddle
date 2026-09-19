# Huddle Implementation Plan

This plan optimizes for a reliable build-day demo. Transcript import is the core differentiator. The Claude `@mention` flow is intentionally isolated as a stretch goal.

## Version baseline

Reviewed on 2026-09-18. Pin these versions exactly during initial setup and commit the pnpm lockfile.

### Workspace

| Dependency   | Version       |
| ------------ | ------------- |
| Node.js      | `24.21.0` LTS |
| pnpm         | `10.30.1`     |
| `turbo`      | `2.11.1`      |
| `typescript` | `6.0.3`       |

TypeScript 7 is not part of the baseline because the selected `typescript-eslint` release currently supports TypeScript versions below 6.1.

### Web

| Dependency                           | Version             |
| ------------------------------------ | ------------------- |
| `react`, `react-dom`                 | `19.3.0`            |
| `vite`                               | `8.3.0`             |
| `@vitejs/plugin-react`               | `6.1.1`             |
| `react-router`                       | `8.4.0`             |
| `tailwindcss`, `@tailwindcss/vite`   | `4.3.3`             |
| `shadcn` CLI                         | `4.21.0`            |
| `@tanstack/react-query`              | `5.103.1`           |
| `socket.io-client`                   | `4.8.3`             |
| `@dnd-kit/react`, `@dnd-kit/helpers` | `0.5.0`             |
| `react-hook-form`                    | `7.88.0`            |
| `@hookform/resolvers`                | `5.9.1`             |
| `zod`                                | `4.6.5`             |
| `@hugeicons/react`                   | `1.1.10`            |
| `@hugeicons/core-free-icons`         | `4.3.3`             |
| `sonner`                             | `2.0.8`             |
| `motion`                             | `13.4.0` (optional) |

### API

| Dependency                                   | Version            |
| -------------------------------------------- | ------------------ |
| `express`                                    | `5.2.1`            |
| `socket.io`                                  | `4.8.3`            |
| `prisma`, `@prisma/client`                   | `7.10.0`           |
| `@prisma/adapter-mariadb`                    | `7.10.0`           |
| `mariadb`                                    | `3.5.4`            |
| `better-auth`, `@better-auth/prisma-adapter` | `1.7.5`            |
| `@anthropic-ai/sdk`                          | `0.127.0`          |
| `helmet`                                     | `8.3.0`            |
| `express-rate-limit`                         | `8.7.0`            |
| `pino`, `pino-http`                          | `10.3.1`, `11.0.0` |
| `tsx`                                        | `4.23.13`          |

Do not install Prisma through an unversioned `latest` tag. Prisma 8 does not yet support the selected MySQL/MariaDB path.

### Verification tooling

| Dependency               | Version             |
| ------------------------ | ------------------- |
| `vitest`                 | `5.0.1`             |
| `@testing-library/react` | `16.3.3`            |
| `jsdom`                  | `30.1.0`            |
| `msw`                    | `2.15.0`            |
| `eslint`, `@eslint/js`   | `10.10.0`, `10.0.1` |
| `typescript-eslint`      | `8.70.0`            |
| `prettier`               | `3.9.8`             |

## Frontend dependency plan

Install only the libraries needed for the current phase.

### Core dependencies

- `@tanstack/react-query` for REST-backed server state, caching, mutations, and loading/error states
- `react-router` for client-side routing
- `socket.io-client` for real-time events
- `@dnd-kit/react` and `@dnd-kit/helpers` for accessible Kanban dragging and sorting
- `react-hook-form`, `@hookform/resolvers`, and `zod` for forms and shared validation
- `@hugeicons/react` and `@hugeicons/core-free-icons` for interface icons
- `sonner` for user-facing notifications through shadcn/ui

Use the current dnd-kit packages above. Do not copy older examples that use the legacy `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` packages unless the project deliberately chooses the legacy API.

### Animation

Use Tailwind/CSS transitions for ordinary hover, focus, and color changes. Add the `motion` package only when implementing interactions that benefit from layout or enter/exit animation, especially:

- Imported cards appearing one by one
- Dialog and issue-detail sheet transitions
- Small card layout transitions

Import React animation primitives from `motion/react`. Do not add GSAP; the planned interface does not require cinematic timelines, complex SVG animation, or scroll choreography.

### State ownership

- TanStack Query owns data fetched from the API.
- Local React state owns temporary UI state such as open dialogs, draft text, and the active drag arrangement.
- REST remains the source of truth for writes.
- Socket.IO events update or invalidate the relevant TanStack Query cache entries.
- Do not update the canonical board cache from both a REST response and its corresponding socket event.
- During a drag, render from a local snapshot and do not replace it with refetched query data. On drop, send the REST mutation and reconcile from the resulting socket event. On cancellation or failure, restore the last server-backed snapshot.

Do not add Redux, Zustand, Axios, GSAP, TanStack Router, a second form library, or a second animation library initially. Zustand may be considered later only if substantial client-only state becomes difficult to manage with local state and context.

Use `HugeiconsIcon` from `@hugeicons/react` and import individual icons from `@hugeicons/core-free-icons`. Avoid wildcard icon imports so Vite can tree-shake unused icons. Default to the free Stroke Rounded set; adopting a Hugeicons Pro style later requires an explicit licensing and private-registry decision.

## Phase 0 — Foundation

- Confirm Node 24.21.0 with `nvm use 24.21.0` and pnpm 10.30.1.
- Create the pnpm workspace and Turborepo configuration.
- Scaffold `apps/web`, `apps/api`, and `packages/shared`.
- Configure strict TypeScript, linting, formatting, and shared scripts.
- Add Tailwind CSS and initialize shadcn/ui in the web app.
- Configure React Router and a single TanStack Query client.
- Add the current dnd-kit React packages for the Kanban interaction.
- Configure React Hook Form with Zod-backed validation.
- Add environment validation and keep `.env.example` current.
- Define shared Zod schemas and Socket.IO event maps.
- Configure Prisma 7 with `@prisma/adapter-mariadb` for the local XAMPP database.

Exit criteria:

- Workspace packages build and typecheck without watch mode.
- Web and API can import types from `packages/shared`.

## Phase 1 — Data and authentication

- Configure Prisma for MySQL.
- Model Better Auth tables plus user, organization, membership, board, board-column, issue, and comment data.
- Add roles, timestamps, constraints, indexes, column/issue positions, and issue-to-column relations.
- Create the three editable default columns in the same transaction as every new board.
- Configure Better Auth with Google OAuth first.
- Add server-side helpers for session and organization authorization.
- Create deterministic seed data for one demo organization and populated board.

Exit criteria:

- Prisma schema validates.
- A signed-in user can only access organizations they belong to.
- Seed data provides a presentation-ready board.

## Phase 2 — Core REST product

- Organization creation and selection.
- Dashboard with board shortcuts.
- Multiple-board navigation and board create/read/update/delete operations.
- Column create, rename, reorder, and delete operations.
- Require a destination column when deleting a non-empty column, and move its issues transactionally.
- Issue create, edit, move, reorder, and delete operations.
- Issue detail UI.
- Comments only if schedule remains healthy.
- Loading, empty, error, and permission states.

Exit criteria:

- The board works correctly after a full refresh without Socket.IO.
- Board and column changes persist after a full refresh.
- Moving an issue persists both its destination column and order.

## Phase 3 — Real-time collaboration

- Authenticate Socket.IO connections.
- Implement authorized board rooms.
- Broadcast typed board, column, and issue events only after committed REST writes.
- Reconcile socket events in the web state/cache.
- Handle reconnects, duplicate events, and stale board subscriptions.
- Add a subtle connection-state indicator.

Exit criteria:

- Two browser sessions on the same board converge after board, column, and issue operations.
- Unauthorized users cannot join or receive another organization's room.

## Phase 4 — Meeting-notes import

- Add the `Import notes` dialog.
- Implement the authenticated board import endpoint.
- Add an Anthropic service with structured prompt/output handling.
- Give Claude the current board's allowed column IDs and names and require one valid `columnId` per extracted task.
- Validate Claude output before persistence.
- Emit `import:started`, one `import:card` per issue, `import:done`, and `import:failed`.
- Stagger card presentation by roughly 300 ms.
- Preserve notes and provide a retry path after failure.
- Add tests using fixture model responses; do not call Claude in routine tests.

Exit criteria:

- Sample notes reliably produce valid, editable issues.
- Cards appear one by one on all connected clients.
- Invalid AI output creates no corrupt records and produces a recoverable error.

## Phase 5 — Demo hardening

- Rehearse with seeded data and a known sample transcript.
- Verify the two-minute happy path and common failure paths.
- Check desktop and mobile layout.
- Verify keyboard access and reduced motion.
- Add production-safe error copy and remove debugging output.
- Run lint, typecheck, tests, and builds without starting dev servers.

## Stretch — Per-card Claude mention

Only begin this phase after Phase 5 is clean.

- Detect an explicit `@claude` mention in the comment flow.
- Authorize access before sending issue context.
- Emit `agent:thinking`, `agent:result`, and `agent:failed`.
- Store the result as a clearly identified assistant comment or structured suggestion.
- Add rate limits and context-length caps.
- Keep the feature behind one module/flag so it can be cut cleanly.

## Suggested build-day schedule

| Time            | Outcome                                                 |
| --------------- | ------------------------------------------------------- |
| Hour 1          | Workspace, schema, auth, shared contracts               |
| Hour 2          | Organization/dashboard/board CRUD                       |
| Hour 3          | Real-time create/edit/move                              |
| Hour 4          | Notes import pipeline and visible stagger               |
| Final 30–60 min | Demo hardening; `@mention` only if everything is stable |

## Two-minute demo path

1. Open a pre-seeded board.
2. Choose `Import notes` and paste the prepared sample.
3. Show issues appearing live, one by one.
4. Open one generated issue and make a small edit.
5. Drag it to another column and show the second client update.
6. If stable, demonstrate `@claude` on the issue.
7. Close with one architecture sentence: pnpm/Turborepo, Socket.IO, MySQL/Prisma, and Claude.
