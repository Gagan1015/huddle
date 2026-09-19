# Huddle Architecture

## System overview

Huddle is a pnpm/Turborepo monorepo with a Vite React client, an Express API, a local XAMPP MariaDB database accessed through Prisma's `mysql` connector, and Socket.IO for real-time board updates. Better Auth owns authentication and session management. Claude converts meeting notes into structured issues.

```text
Browser (React + Vite)
   | REST / auth cookies
   | Socket.IO
   v
API (Express + Better Auth + Socket.IO)
   |                 |
   | Prisma          | Anthropic SDK
   v                 v
XAMPP MariaDB     Claude API
```

## Package boundaries

### `apps/web`

- Routing and page composition
- Authentication UI and session consumption
- REST client and query/cache layer
- Socket.IO connection and event reconciliation
- Kanban interactions, dialogs, forms, and responsive UI

The web app must never contain database credentials, Anthropic keys, or authorization decisions.

### `apps/api`

- Better Auth configuration and session validation
- Organization authorization
- REST routes and input validation
- Domain services for organizations, boards, issues, comments, and imports
- Prisma access
- Socket.IO room membership and broadcasting
- Anthropic integration

Suggested internal shape:

```text
apps/api/src/
├── auth/
├── config/
├── modules/
│   ├── organizations/
│   ├── boards/
│   ├── issues/
│   ├── comments/
│   └── imports/
├── realtime/
├── services/
└── server.ts
```

### `packages/shared`

- Zod request/response schemas
- Domain enums and serializable types
- Typed Socket.IO client/server event maps
- Stable API error codes

Do not import server-only code or Prisma clients into this package.

## Data model

The baseline model should include:

- `User`
- Better Auth account/session/verification tables
- `Organization`
- `Member`
- `Invitation`
- `Board`
- `BoardColumn`
- `Issue`
- `Comment`

Recommended additions to the initial sketch:

- `Member.role`: `OWNER`, `ADMIN`, or `MEMBER`
- `Invitation`: a pending, email-bound invitation with a role (`ADMIN` or `MEMBER`) and expiry, unique on `(organizationId, email)`; accepting or revoking deletes the row, so "pending" means "exists and has not expired"
- `BoardColumn.position`: integer rank with gaps, scoped to its board
- `Issue.columnId`: required relation to a column rather than a fixed status enum
- `Issue.position`: integer rank with gaps, scoped to its column
- `createdAt` and `updatedAt` timestamps
- Unique membership constraint on `(userId, organizationId)`
- Indexes on organization, board, column, position, and issue comment lookups

Relationship outline:

```text
Organization 1─* Board 1─* BoardColumn 1─* Issue 1─* Comment
```

Every new board is created with `Upcoming`, `In progress`, and `Done` columns in the same transaction. These are defaults, not reserved statuses: users may rename or reorder them and add more columns.

## Local database baseline

- XAMPP root: `C:\xampp`
- Database engine: MariaDB 10.4.32, exposed locally on port 3306
- Prisma datasource provider: `mysql` (this provider supports both MySQL and MariaDB)
- Prisma line: 7.10.0 for `prisma`, `@prisma/client`, and `@prisma/adapter-mariadb`
- Runtime driver: `mariadb`
- Connection host: prefer `127.0.0.1` on Windows

MariaDB 10.4 is acceptable only for isolated local development because it is no longer maintained. Do not expose the XAMPP database publicly or use it as the production database.

Prisma 7 uses `prisma.config.ts` for `DATABASE_URL` and requires an explicit generated-client output path and MariaDB driver adapter. Keep Prisma packages on the same exact version.

Column deletion rules:

- A board must retain at least one column.
- An empty column may be deleted directly.
- Deleting a non-empty column requires a destination column on the same board.
- Moving its issues and deleting the source column happen in one transaction.
- Board and column mutations emit real-time events after commit.

## Request lifecycle

For an issue move:

1. The client sends a validated REST request with destination column ID and ordering information.
2. The API authenticates the session.
3. The API verifies membership in the issue's organization.
4. The domain service updates positions in a transaction.
5. After commit, the API emits `issue:moved` to the authorized board room.
6. Every connected client, including the sender, reconciles the same event.

If low latency requires optimistic UI later, use a client mutation ID and deterministic reconciliation. Do not silently maintain two competing update paths.

## Socket.IO authorization

- Authenticate during the Socket.IO handshake using the same session system as REST.
- Have the server resolve authorized memberships and join `org:{orgId}` rooms during the handshake, before any event handler can run.
- On `board:join`, validate the payload with the shared schema, verify access with the same helper REST uses, then join `org:{orgId}:board:{boardId}`. Acknowledge with `{ ok }` or a coded error so the client can react.
- Emit board mutations only to the appropriate room, carrying rebalanced sibling positions with `*:moved` events.
- Room membership is re-evaluated on every reconnect; revoking access mid-session takes effect at the next reconnect.
- Validate every incoming and outgoing payload.

## Transcript import

Suggested endpoint:

```text
POST /api/boards/:boardId/imports/meeting-notes
```

Request:

```json
{
  "notes": "Meeting notes..."
}
```

Processing flow:

1. Authenticate and authorize board access.
2. Validate note length and content.
3. Emit `import:started` with an import ID.
4. Provide Claude with the current board's allowed column IDs and names and request one allowed `columnId` per task.
5. Parse the constrained response and validate the entire result with Zod, including column membership.
6. Cap task count and normalize safe fields.
7. Persist issues one at a time or as a batch, depending on failure policy.
8. Emit one `import:card` event per committed issue, staggered for presentation.
9. Emit `import:done` with totals.
10. On failure, emit `import:failed` and return a stable error response.

The HTTP request can return after validated persistence while a lightweight emission scheduler handles the visual stagger. Do not delay database commits or hold transactions merely for animation.

Parsing policy as implemented: safe fields are normalized (whitespace collapsed, titles and descriptions clipped to the issue limits) before Zod validation; a task with an unknown `columnId` rejects the whole import rather than falling back to the first column; an empty list is a `422 IMPORT_NO_TASKS`; tasks beyond the cap of 25 are dropped and counted in the server log. All tasks are inserted in one transaction so a failure part-way leaves no half-imported board.

## API conventions

- Prefix application routes with `/api`.
- Use JSON request and response bodies.
- Validate params, query, and body at the route boundary.
- Use predictable status codes: 400 invalid input, 401 unauthenticated, 403 unauthorized, 404 unavailable resource, 409 conflict, 429 limited, and 500 unexpected failure.
- Error shape:

```json
{
  "error": {
    "code": "ISSUE_NOT_FOUND",
    "message": "This issue is no longer available."
  }
}
```

## Security baseline

- Use secure, HTTP-only, same-site cookies as supported by the deployment topology.
- Restrict CORS to configured web origins and allow credentials only where needed.
- Rate-limit authentication and AI endpoints.
- Apply body-size and meeting-note length limits.
- Sanitize rendering by treating descriptions/comments as plain text unless a deliberate safe Markdown renderer is added.
- Keep secrets in environment variables and validate them at API startup.
- Never return whether an email belongs to another organization unless the workflow requires it.

## Observability

- Add structured server logs with request/import IDs.
- Do not log raw meeting notes, session tokens, OAuth payloads, or AI keys.
- Log event name, board ID, duration, result, and safe error code.
- Provide a lightweight health endpoint that does not expose configuration.
