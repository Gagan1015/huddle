import type { IssuePriority } from "@huddle/shared";

import { prisma } from "../src/db/prisma.js";
import { POSITION_GAP } from "../src/lib/positions.js";

// Fills an existing board with demo issues spread across its own columns: the
// first column gets work not started, the last gets finished work, and any
// columns in between share the in-flight items. Assignees rotate through the
// people passed with --assign, who must already belong to the board's
// workspace. Issue IDs are deterministic so re-running never duplicates.
// Usage, from apps/api:
//
//   pnpm exec tsx prisma/seed-board.ts <boardId> [--assign a@x.test,b@x.test] [--reset]

type Stage = "first" | "middle" | "last";

interface DemoIssue {
  title: string;
  description?: string;
  priority?: IssuePriority;
  /** Days from today; negative means overdue. */
  dueInDays?: number;
  stage: Stage;
}

// Topics deliberately avoid the sample meeting notes, so a live import adds
// visibly new cards instead of near-duplicates.
const DEMO_ISSUES: DemoIssue[] = [
  {
    title: "Write release notes for 2.1",
    description:
      "Plain-language summary of the touch fixes and the board switcher. Link to the changelog.",
    priority: "MEDIUM",
    dueInDays: 6,
    stage: "first",
  },
  {
    title: "Interview two candidates for the design role",
    description: "Portfolio review first, then a 45-minute working session.",
    priority: "HIGH",
    dueInDays: 2,
    stage: "first",
  },
  {
    title: "Set up an error-budget dashboard",
    description:
      "One panel per service. Alert only when half the monthly budget is spent.",
    priority: "LOW",
    stage: "first",
  },
  {
    title: "Plan the October customer webinar",
    description: "Forty minutes: live import demo, Q&A, roadmap teaser.",
    dueInDays: 12,
    stage: "first",
  },
  {
    title: "Verify invite emails render in Outlook",
    description:
      "Run the new template through Litmus. The button lost its padding last time.",
    priority: "MEDIUM",
    dueInDays: 1,
    stage: "middle",
  },
  {
    title: "Rate-limit the public API",
    description:
      "Per-key limits with clear 429 messages before the partner beta opens.",
    priority: "URGENT",
    dueInDays: -1,
    stage: "middle",
  },
  {
    title: "Regression pass on keyboard navigation",
    description:
      "Every dialog, menu, and card move action without touching the mouse.",
    priority: "HIGH",
    dueInDays: 3,
    stage: "middle",
  },
  {
    title: "Ship the board activity log",
    description:
      "Who moved what and when, in the board menu. Last seven days only.",
    priority: "HIGH",
    dueInDays: 4,
    stage: "middle",
  },
  { title: "Migrate CI to Node 24", stage: "last" },
  {
    title: "Fix avatar upload on Safari",
    description:
      "HEIC photos were rejected; they are now converted server-side.",
    stage: "last",
  },
  { title: "Rename the workspace settings page", stage: "last" },
];

const args = process.argv.slice(2);
const boardId = args.find((argument) => !argument.startsWith("--"));
const reset = args.includes("--reset");
const assignFlag = args.findIndex((argument) => argument === "--assign");
const assignEmails =
  assignFlag === -1
    ? []
    : (args[assignFlag + 1] ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

function dateInDays(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

/** Picks the column for each stage from the board's ordered columns. */
function columnsForStage<T>(columns: readonly T[], stage: Stage): T[] {
  const first = columns[0];
  const last = columns[columns.length - 1];

  if (!first || !last) {
    return [];
  }

  if (columns.length === 1) {
    return [first];
  }

  if (stage === "first") {
    return [first];
  }

  if (stage === "last") {
    return [last];
  }

  const middle = columns.slice(1, -1);
  return middle.length > 0 ? middle : [first];
}

async function main() {
  if (!boardId) {
    console.error(
      "Usage: pnpm exec tsx prisma/seed-board.ts <boardId> [--assign a@x.test,b@x.test] [--reset]",
    );
    process.exitCode = 1;
    return;
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      id: true,
      title: true,
      createdById: true,
      organization: {
        select: {
          id: true,
          name: true,
          members: { select: { userId: true } },
        },
      },
      columns: {
        orderBy: { position: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  if (!board) {
    console.error(`No board with id ${boardId}.`);
    process.exitCode = 1;
    return;
  }

  if (board.columns.length === 0) {
    console.error(`"${board.title}" has no columns to seed into.`);
    process.exitCode = 1;
    return;
  }

  const memberIds = new Set(
    board.organization.members.map((member) => member.userId),
  );
  const assignees: Array<{ id: string; email: string }> = [];

  for (const email of assignEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      console.error(
        `No account for ${email}. Sign in with it once, then run this again.`,
      );
      process.exitCode = 1;
      return;
    }

    if (!memberIds.has(user.id)) {
      console.error(
        `${email} is not a member of ${board.organization.name}. Add them to the workspace first.`,
      );
      process.exitCode = 1;
      return;
    }

    assignees.push(user);
  }

  if (reset) {
    const removed = await prisma.issue.deleteMany({
      where: { column: { boardId: board.id } },
    });
    console.log(
      `Removed ${removed.count} existing issues from "${board.title}".`,
    );
  }

  const createdById = board.createdById ?? assignees[0]?.id ?? null;
  const nextPosition = new Map<string, number>();

  for (const column of board.columns) {
    const last = await prisma.issue.findFirst({
      where: { columnId: column.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    nextPosition.set(column.id, last?.position ?? 0);
  }

  // Middle-stage issues rotate across the middle columns so each gets some.
  const middleCursor = { value: 0 };
  const createdPerColumn = new Map<string, number>();
  let created = 0;

  for (const [index, issue] of DEMO_ISSUES.entries()) {
    const candidates = columnsForStage(board.columns, issue.stage);
    const column =
      issue.stage === "middle"
        ? candidates[middleCursor.value++ % candidates.length]
        : candidates[0];

    if (!column) {
      continue;
    }

    const issueId = `${board.id}_demo_${String(index + 1).padStart(2, "0")}`;
    const assignee = assignees.length
      ? assignees[index % assignees.length]
      : undefined;
    const position = (nextPosition.get(column.id) ?? 0) + POSITION_GAP;

    const result = await prisma.issue.upsert({
      where: { id: issueId },
      create: {
        id: issueId,
        title: issue.title,
        description: issue.description ?? null,
        position,
        source: "MANUAL",
        priority: issue.priority ?? "NONE",
        dueDate:
          issue.dueInDays === undefined ? null : dateInDays(issue.dueInDays),
        columnId: column.id,
        createdById,
        assigneeId: assignee?.id ?? null,
        assignedById: assignee ? createdById : null,
      },
      update: {},
      select: { position: true },
    });

    if (result.position === position) {
      created += 1;
      nextPosition.set(column.id, position);
      createdPerColumn.set(
        column.id,
        (createdPerColumn.get(column.id) ?? 0) + 1,
      );
    }
  }

  const breakdown = board.columns
    .map((column) => `${column.name}: ${createdPerColumn.get(column.id) ?? 0}`)
    .join(", ");
  console.log(
    `Added ${created} issues to "${board.title}" in ${board.organization.name} (${breakdown}).`,
  );

  if (assignees.length) {
    console.log(
      `Assignees rotate through: ${assignees.map((user) => user.email).join(", ")}`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
