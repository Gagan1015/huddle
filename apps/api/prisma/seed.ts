import { DEFAULT_COLUMN_NAMES } from "@huddle/shared";

import { auth } from "../src/auth/auth.js";
import { prisma } from "../src/db/prisma.js";
import { POSITION_GAP } from "../src/lib/positions.js";

// Deterministic demo data: fixed IDs keep URLs stable between runs, and every
// write is an upsert so re-running never duplicates rows or clobbers edits.
// Set SEED_RESET=1 to wipe the demo organization first.

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "huddle-demo-2026";
const ORGANIZATION_ID = "org_demo_northwind";

const demoUsers = [
  {
    key: "owner",
    name: "Priya Natarajan",
    email: "demo@huddle.local",
    role: "OWNER",
  },
  {
    key: "teammate",
    name: "Marcus Lee",
    email: "marcus@huddle.local",
    role: "MEMBER",
  },
] as const;

interface SeedIssue {
  title: string;
  description?: string;
}

interface SeedBoard {
  id: string;
  title: string;
  description: string;
  columns: Array<{ name: string; issues: SeedIssue[] }>;
}

const boards: SeedBoard[] = [
  {
    id: "board_demo_launch",
    title: "Q4 launch planning",
    description:
      "Everything that has to land before the public launch on October 14.",
    columns: [
      {
        name: DEFAULT_COLUMN_NAMES[0],
        issues: [
          {
            title: "Finalize pricing page copy",
            description:
              "Marketing needs the final tier names and FAQ answers before Thursday's review.",
          },
          {
            title: "Set up status page for launch week",
            description:
              "Public status page with the API, web app, and billing as separate components.",
          },
          {
            title: "Draft customer announcement email",
            description:
              "Short, plain-language note to existing customers. Link to the changelog, not the blog.",
          },
          { title: "Book QA time for the mobile release" },
        ],
      },
      {
        name: DEFAULT_COLUMN_NAMES[1],
        issues: [
          {
            title: "Migrate billing webhooks to the new queue",
            description:
              "Replay last week's failed events once the consumer is idempotent.",
          },
          {
            title: "Record 90-second product walkthrough",
            description:
              "Desktop only. Show import, then a live move between columns.",
          },
          { title: "Review accessibility audit findings" },
        ],
      },
      {
        name: DEFAULT_COLUMN_NAMES[2],
        issues: [
          { title: "Choose launch date with leadership" },
          {
            title: "Ship dark-mode toggle",
            description: "Behind a setting for now; default stays light.",
          },
          { title: "Update onboarding checklist" },
        ],
      },
    ],
  },
  {
    id: "board_demo_website",
    title: "Website redesign",
    description: "Marketing site refresh with a custom review workflow.",
    columns: [
      {
        name: "Backlog",
        issues: [
          { title: "Collect testimonials from beta customers" },
          {
            title: "Audit third-party scripts",
            description:
              "Remove anything not tied to analytics or support chat.",
          },
        ],
      },
      {
        name: "Drafting",
        issues: [
          {
            title: "Rewrite homepage hero",
            description: "Lead with the meeting-notes import, not the board.",
          },
        ],
      },
      {
        name: "In review",
        issues: [{ title: "New pricing comparison table" }],
      },
      {
        name: "Shipped",
        issues: [{ title: "Move docs to the new domain" }],
      },
    ],
  },
];

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function ensureUser(user: (typeof demoUsers)[number]) {
  const existing = await prisma.user.findUnique({
    where: { email: user.email },
  });

  if (existing) {
    return existing;
  }

  // Better Auth owns password hashing, so the seed signs the user up through it.
  await auth.api.signUpEmail({
    body: { name: user.name, email: user.email, password: DEMO_PASSWORD },
  });

  return prisma.user.findUniqueOrThrow({ where: { email: user.email } });
}

async function resetDemoOrganization() {
  await prisma.issue.deleteMany({
    where: { column: { board: { organizationId: ORGANIZATION_ID } } },
  });
  await prisma.organization.deleteMany({ where: { id: ORGANIZATION_ID } });
}

async function main() {
  if (process.env.SEED_RESET === "1") {
    await resetDemoOrganization();
    console.log("Removed the existing demo organization.");
  }

  const users = new Map<string, { id: string }>();

  for (const demoUser of demoUsers) {
    users.set(demoUser.key, await ensureUser(demoUser));
  }

  const owner = users.get("owner");

  if (!owner) {
    throw new Error("Demo owner was not created.");
  }

  await prisma.organization.upsert({
    where: { id: ORGANIZATION_ID },
    create: {
      id: ORGANIZATION_ID,
      name: "Northwind Studio",
      description: "Product, design, and engineering for the Northwind app.",
    },
    update: {},
  });

  for (const demoUser of demoUsers) {
    const user = users.get(demoUser.key);

    if (!user) {
      continue;
    }

    await prisma.member.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: ORGANIZATION_ID,
        },
      },
      create: {
        userId: user.id,
        organizationId: ORGANIZATION_ID,
        role: demoUser.role,
      },
      update: {},
    });
  }

  for (const board of boards) {
    await prisma.board.upsert({
      where: { id: board.id },
      create: {
        id: board.id,
        title: board.title,
        description: board.description,
        organizationId: ORGANIZATION_ID,
        createdById: owner.id,
      },
      update: {},
    });

    for (const [columnIndex, column] of board.columns.entries()) {
      const columnId = `${board.id}_${slug(column.name)}`;

      await prisma.boardColumn.upsert({
        where: { boardId_name: { boardId: board.id, name: column.name } },
        create: {
          id: columnId,
          name: column.name,
          position: POSITION_GAP * (columnIndex + 1),
          boardId: board.id,
        },
        update: {},
      });

      for (const [issueIndex, issue] of column.issues.entries()) {
        const issueId = `${columnId}_${String(issueIndex + 1).padStart(2, "0")}`;

        await prisma.issue.upsert({
          where: { id: issueId },
          create: {
            id: issueId,
            title: issue.title,
            description: issue.description ?? null,
            position: POSITION_GAP * (issueIndex + 1),
            source: "MANUAL",
            columnId,
            createdById: owner.id,
          },
          update: {},
        });
      }
    }
  }

  console.log("Seeded the Northwind Studio demo workspace.");
  console.log(`Sign in with ${demoUsers[0].email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
