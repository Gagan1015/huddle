import { prisma } from "../src/db/prisma.js";

// Removes every issue from one board while keeping the board and its columns,
// so a demo board can be reset between rehearsals. Comments cascade with their
// issues. Usage, from apps/api:
//
//   pnpm exec tsx prisma/clear-board.ts <boardId> [--dry-run]

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const boardId = args.find((argument) => !argument.startsWith("--"));

async function main() {
  if (!boardId) {
    console.error(
      "Usage: pnpm exec tsx prisma/clear-board.ts <boardId> [--dry-run]",
    );
    process.exitCode = 1;
    return;
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      id: true,
      title: true,
      organization: { select: { name: true } },
      _count: { select: { columns: true } },
    },
  });

  if (!board) {
    console.error(`No board with id ${boardId}.`);
    process.exitCode = 1;
    return;
  }

  const where = { column: { boardId: board.id } };
  const issueCount = await prisma.issue.count({ where });
  const label = `"${board.title}" in ${board.organization.name} (${board.id}, ${board._count.columns} columns)`;

  if (dryRun) {
    console.log(
      `Dry run: ${issueCount} issues would be removed from ${label}.`,
    );
    return;
  }

  const result = await prisma.issue.deleteMany({ where });
  console.log(`Removed ${result.count} issues from ${label}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
