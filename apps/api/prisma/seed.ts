import {
  DEFAULT_COLUMN_NAMES,
  INVITATION_TTL_DAYS,
  type IssuePriority,
  type IssueSource,
} from "@huddle/shared";

import { auth } from "../src/auth/auth.js";
import { prisma } from "../src/db/prisma.js";
import type { MemberRole } from "../src/generated/prisma/client.js";
import { POSITION_GAP } from "../src/lib/positions.js";

// Deterministic demo data: fixed IDs keep URLs stable between runs, and every
// write is an upsert so re-running never duplicates rows or clobbers edits.
// Set SEED_RESET=1 to wipe the demo organizations first (people are kept).

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "huddle-demo-2026";

// Five people so boards show a spread of assignees and a second browser can
// sign in as a teammate for the real-time demo. Everyone shares DEMO_PASSWORD.
const demoUsers = [
  { key: "priya", name: "Priya Natarajan", email: "demo@huddle.local" },
  { key: "marcus", name: "Marcus Lee", email: "marcus@huddle.local" },
  { key: "dana", name: "Dana Whitfield", email: "dana@huddle.local" },
  { key: "tomas", name: "Tomás Herrera", email: "tomas@huddle.local" },
  { key: "aisha", name: "Aisha Bello", email: "aisha@huddle.local" },
] as const;

type UserKey = (typeof demoUsers)[number]["key"];

interface SeedIssue {
  title: string;
  description?: string;
  priority?: IssuePriority;
  assignee?: UserKey;
  /** Days from the seed run; negative means already overdue. */
  dueInDays?: number;
  /** `AI_IMPORT` issues render with Claude as the author. */
  source?: IssueSource;
  /** Defaults to the board's creator. For imports, the person who imported. */
  createdBy?: UserKey;
}

interface SeedBoard {
  id: string;
  title: string;
  description: string;
  createdBy: UserKey;
  columns: Array<{ name: string; issues: SeedIssue[] }>;
}

interface SeedInvitation {
  email: string;
  role: MemberRole;
  invitedBy: UserKey;
}

interface SeedOrganization {
  id: string;
  name: string;
  description: string;
  members: Array<[UserKey, MemberRole]>;
  /** Creating an account with one of these addresses shows the join-from-invitation welcome screen. */
  invitations?: SeedInvitation[];
  boards: SeedBoard[];
}

// Calendar date `days` from today, pinned to UTC midnight like the API does.
function dateInDays(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

const northwindBoards: SeedBoard[] = [
  {
    id: "board_demo_launch",
    title: "Q4 launch planning",
    description:
      "Everything that has to land before the public launch on October 14.",
    createdBy: "priya",
    columns: [
      {
        name: DEFAULT_COLUMN_NAMES[0],
        issues: [
          {
            title: "Finalize pricing page copy",
            description:
              "Marketing needs the final tier names and FAQ answers before Thursday's review.",
            priority: "HIGH",
            assignee: "marcus",
            dueInDays: 3,
          },
          {
            title: "Set up status page for launch week",
            description:
              "Public status page with the API, web app, and billing as separate components.",
            priority: "MEDIUM",
            assignee: "priya",
            dueInDays: 9,
          },
          {
            title: "Draft customer announcement email",
            description:
              "Short, plain-language note to existing customers. Link to the changelog, not the blog.",
            priority: "LOW",
            assignee: "dana",
          },
          {
            title: "Book QA time for the mobile release",
            assignee: "tomas",
            dueInDays: 14,
          },
          {
            title: "Send calendar hold for two days of mobile QA",
            description:
              "Priya to book the QA days in the first week of October.",
            source: "AI_IMPORT",
            createdBy: "priya",
          },
        ],
      },
      {
        name: DEFAULT_COLUMN_NAMES[1],
        issues: [
          {
            title: "Migrate billing webhooks to the new queue",
            description:
              "Replay last week's failed events once the consumer is idempotent.",
            priority: "URGENT",
            assignee: "marcus",
            dueInDays: -1,
          },
          {
            title: "Record 90-second product walkthrough",
            description:
              "Desktop only. Show import, then a live move between columns.",
            priority: "MEDIUM",
            assignee: "aisha",
            dueInDays: 1,
          },
          {
            title: "Review accessibility audit findings",
            priority: "HIGH",
            assignee: "dana",
          },
          {
            title: "Finish wiring status page components",
            description:
              "Priya started on the API, web app, and billing components. The page can't go public until IT hands over the DNS record.",
            source: "AI_IMPORT",
            createdBy: "priya",
          },
        ],
      },
      {
        name: DEFAULT_COLUMN_NAMES[2],
        issues: [
          { title: "Choose launch date with leadership", assignee: "priya" },
          {
            title: "Ship dark-mode toggle",
            description: "Behind a setting for now; default stays light.",
            assignee: "tomas",
          },
          { title: "Update onboarding checklist", assignee: "aisha" },
          {
            title: "Confirm launch date stays October 14",
            description: "Leadership signed off on Monday.",
            source: "AI_IMPORT",
            createdBy: "priya",
          },
        ],
      },
    ],
  },
  {
    id: "board_demo_website",
    title: "Website redesign",
    description: "Marketing site refresh with a custom review workflow.",
    createdBy: "dana",
    columns: [
      {
        name: "Backlog",
        issues: [
          {
            title: "Collect testimonials from beta customers",
            assignee: "marcus",
            priority: "LOW",
          },
          {
            title: "Audit third-party scripts",
            description:
              "Remove anything not tied to analytics or support chat.",
            assignee: "tomas",
          },
          {
            title: "Plan the case-study template",
            description: "Two customer stories ready for launch week.",
            assignee: "dana",
            dueInDays: 21,
          },
        ],
      },
      {
        name: "Drafting",
        issues: [
          {
            title: "Rewrite homepage hero",
            description: "Lead with the meeting-notes import, not the board.",
            priority: "HIGH",
            assignee: "dana",
            dueInDays: 4,
          },
          {
            title: "Illustrate the import flow",
            description: "Three frames: paste, Claude reads, cards land.",
            priority: "MEDIUM",
            assignee: "aisha",
            dueInDays: 6,
          },
        ],
      },
      {
        name: "In review",
        issues: [
          {
            title: "New pricing comparison table",
            assignee: "marcus",
            priority: "HIGH",
            dueInDays: 2,
          },
        ],
      },
      {
        name: "Shipped",
        issues: [
          { title: "Move docs to the new domain", assignee: "tomas" },
          { title: "Retire the old blog theme", assignee: "dana" },
        ],
      },
    ],
  },
  {
    id: "board_demo_mobile",
    title: "Mobile app 2.1",
    description: "Touch fixes and the board switcher for the October release.",
    createdBy: "tomas",
    columns: [
      {
        name: "Ideas",
        issues: [
          {
            title: "Offline mode for boards",
            description: "Queue moves while offline and replay on reconnect.",
            assignee: "aisha",
          },
          { title: "Haptic feedback when a card drops", priority: "LOW" },
        ],
      },
      {
        name: "Ready",
        issues: [
          {
            title: "Touch-friendly drag handles",
            description: "Cards currently drop in the wrong column on iPad.",
            priority: "HIGH",
            assignee: "tomas",
            dueInDays: 5,
          },
          {
            title: "Push notification for @mentions",
            priority: "MEDIUM",
            assignee: "dana",
            dueInDays: 12,
          },
        ],
      },
      {
        name: "Building",
        issues: [
          {
            title: "Board switcher sheet",
            description: "Swipe from the left edge to switch boards.",
            priority: "HIGH",
            assignee: "tomas",
            dueInDays: 2,
          },
          {
            title: "Reorder columns on long-press",
            priority: "MEDIUM",
            assignee: "aisha",
          },
        ],
      },
      {
        name: "QA",
        issues: [
          {
            title: "Sign in with Google on Android",
            description: "Consent screen loops back to sign-in on Pixel 8.",
            priority: "URGENT",
            assignee: "marcus",
            dueInDays: 0,
          },
        ],
      },
      {
        name: "Released",
        issues: [
          { title: "App icon refresh", assignee: "dana" },
          { title: "Fix crash when rotating the board", assignee: "tomas" },
        ],
      },
    ],
  },
];

const lumenBoards: SeedBoard[] = [
  {
    id: "board_demo_research",
    title: "Research roadmap",
    description: "Studies that shape how Huddle turns conversations into work.",
    createdBy: "dana",
    columns: [
      {
        name: "Ideas",
        issues: [
          {
            title: "Study how teams triage meeting notes today",
            assignee: "aisha",
          },
        ],
      },
      {
        name: "Scoping",
        issues: [
          {
            title: "Interview eight agency project managers",
            priority: "HIGH",
            assignee: "dana",
            dueInDays: 7,
          },
        ],
      },
      {
        name: "Running",
        issues: [
          {
            title: "Diary study with three pilot teams",
            description: "Two weeks, daily prompts, weekly check-in call.",
            priority: "MEDIUM",
            assignee: "priya",
            dueInDays: 20,
          },
        ],
      },
      {
        name: "Write-up",
        issues: [
          {
            title: "Import accuracy benchmark, round one",
            description:
              "Fifty transcripts scored for missed and invented tasks.",
            priority: "HIGH",
            assignee: "aisha",
            dueInDays: 3,
          },
        ],
      },
      {
        name: "Published",
        issues: [{ title: "Kanban column naming survey", assignee: "dana" }],
      },
    ],
  },
];

// Two workspaces so the switcher has something to switch between, with
// different roles for the same people in each.
const organizations: SeedOrganization[] = [
  {
    id: "org_demo_northwind",
    name: "Northwind Studio",
    description: "Product, design, and engineering for the Northwind app.",
    members: [
      ["priya", "OWNER"],
      ["dana", "ADMIN"],
      ["marcus", "MEMBER"],
      ["tomas", "MEMBER"],
      ["aisha", "MEMBER"],
    ],
    invitations: [
      { email: "taylor@huddle.local", role: "MEMBER", invitedBy: "priya" },
    ],
    boards: northwindBoards,
  },
  {
    id: "org_demo_lumen",
    name: "Lumen Labs",
    description: "A small research group Priya advises.",
    members: [
      ["dana", "OWNER"],
      ["aisha", "ADMIN"],
      ["priya", "MEMBER"],
    ],
    boards: lumenBoards,
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

async function resetDemoOrganizations() {
  const ids = organizations.map((organization) => organization.id);

  await prisma.issue.deleteMany({
    where: { column: { board: { organizationId: { in: ids } } } },
  });
  await prisma.organization.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  if (process.env.SEED_RESET === "1") {
    await resetDemoOrganizations();
    console.log("Removed the existing demo organizations.");
  }

  const users = new Map<UserKey, { id: string }>();

  for (const demoUser of demoUsers) {
    users.set(demoUser.key, await ensureUser(demoUser));
  }

  const userId = (key: UserKey) => {
    const user = users.get(key);
    if (!user) {
      throw new Error(`Demo user ${key} was not created.`);
    }
    return user.id;
  };

  let boardCount = 0;
  let issueCount = 0;

  for (const organization of organizations) {
    await prisma.organization.upsert({
      where: { id: organization.id },
      create: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
      },
      update: {},
    });

    for (const [key, role] of organization.members) {
      await prisma.member.upsert({
        where: {
          userId_organizationId: {
            userId: userId(key),
            organizationId: organization.id,
          },
        },
        create: {
          userId: userId(key),
          organizationId: organization.id,
          role,
        },
        update: {},
      });
    }

    // Re-running renews the expiry so the invitation is always live for a demo.
    for (const invitation of organization.invitations ?? []) {
      await prisma.invitation.upsert({
        where: {
          organizationId_email: {
            organizationId: organization.id,
            email: invitation.email,
          },
        },
        create: {
          id: `${organization.id}_invite_${slug(invitation.email)}`,
          email: invitation.email,
          role: invitation.role,
          organizationId: organization.id,
          invitedById: userId(invitation.invitedBy),
          expiresAt: dateInDays(INVITATION_TTL_DAYS),
        },
        update: { expiresAt: dateInDays(INVITATION_TTL_DAYS) },
      });
    }

    for (const board of organization.boards) {
      boardCount += 1;
      await prisma.board.upsert({
        where: { id: board.id },
        create: {
          id: board.id,
          title: board.title,
          description: board.description,
          organizationId: organization.id,
          createdById: userId(board.createdBy),
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
          issueCount += 1;
          const issueId = `${columnId}_${String(issueIndex + 1).padStart(2, "0")}`;
          const assigneeId = issue.assignee ? userId(issue.assignee) : null;
          const createdById = userId(issue.createdBy ?? board.createdBy);

          await prisma.issue.upsert({
            where: { id: issueId },
            create: {
              id: issueId,
              title: issue.title,
              description: issue.description ?? null,
              position: POSITION_GAP * (issueIndex + 1),
              source: issue.source ?? "MANUAL",
              priority: issue.priority ?? "NONE",
              dueDate:
                issue.dueInDays === undefined
                  ? null
                  : dateInDays(issue.dueInDays),
              columnId,
              createdById,
              assigneeId,
              assignedById: assigneeId ? createdById : null,
            },
            update: {},
          });
        }
      }
    }
  }

  console.log(
    `Seeded ${organizations.length} workspaces, ${boardCount} boards, and ${issueCount} issues.`,
  );
  console.log(
    `Sign in with any of: ${demoUsers.map((user) => user.email).join(", ")}`,
  );
  console.log(`Password for all demo people: ${DEMO_PASSWORD}`);

  const invited = organizations.flatMap((organization) =>
    (organization.invitations ?? []).map(
      (invitation) => `${invitation.email} (${organization.name})`,
    ),
  );
  if (invited.length > 0) {
    console.log(
      `Create an account as one of these to join from an invitation: ${invited.join(", ")}`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
