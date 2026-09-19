import {
  Add01Icon,
  DashboardSquare01Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router";

import { EmptyState, ErrorState } from "@/components/common/page-state";
import { CreateBoardDialog } from "@/components/board/create-board-dialog";
import { useShellHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBoards } from "@/features/boards";
import { useWorkspace } from "@/features/workspace";
import { formatRelativeTime, pluralize } from "@/lib/format";
import { canManageOrganization } from "@/lib/member-meta";

export function DashboardPage() {
  const { organizationId = "" } = useParams();
  const { organizations, setActiveOrganizationId } = useWorkspace();
  const organization = organizations.find((item) => item.id === organizationId);
  const [searchParams, setSearchParams] = useSearchParams();
  const boards = useBoards(organization ? organization.id : null);
  const { setHeader } = useShellHeader();

  useEffect(() => {
    if (organization) {
      setActiveOrganizationId(organization.id);
    }
  }, [organization, setActiveOrganizationId]);

  useEffect(() => {
    setHeader(
      <h1 className="truncate text-sm font-medium text-muted-foreground">
        {organization?.name ?? "Workspace"}
      </h1>,
    );
    return () => setHeader(null);
  }, [organization?.name, setHeader]);

  if (!organization) {
    return <Navigate to="/" replace />;
  }

  const createOpen = searchParams.get("new") === "board";
  const setCreateOpen = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) {
      next.set("new", "board");
    } else {
      next.delete("new");
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold tracking-tight">
              {organization.name}
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              {organization.description ??
                "Pick a board to keep working, or start a new one for the next project."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManageOrganization(organization.role) ? (
              <Button asChild variant="outline">
                <Link to={`/organizations/${organization.id}/members`}>
                  <HugeiconsIcon
                    icon={UserAdd01Icon}
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  Invite people
                </Link>
              </Button>
            ) : null}
            <Button onClick={() => setCreateOpen(true)}>
              <HugeiconsIcon
                icon={Add01Icon}
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              New board
            </Button>
          </div>
        </div>

        <section
          aria-labelledby="boards-heading"
          className="flex flex-col gap-4"
        >
          <h3 id="boards-heading" className="text-lg font-semibold">
            Boards
          </h3>
          {boards.isPending ? (
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-busy="true"
            >
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : boards.isError ? (
            <ErrorState
              error={boards.error}
              onRetry={() => void boards.refetch()}
            />
          ) : boards.data.length === 0 ? (
            <EmptyState
              icon={
                <HugeiconsIcon
                  icon={DashboardSquare01Icon}
                  size={24}
                  strokeWidth={1.5}
                />
              }
              title="No boards yet"
              description="Create a board to start turning conversations into work. Each board starts with Upcoming, In progress, and Done columns you can rename."
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <HugeiconsIcon
                    icon={Add01Icon}
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  Create your first board
                </Button>
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {boards.data.map((board) => (
                <li key={board.id}>
                  <Link
                    to={`/boards/${board.id}`}
                    className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors outline-none hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-base font-semibold">
                      {board.title}
                    </span>
                    <span className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                      {board.description ?? "No description yet."}
                    </span>
                    <span className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{pluralize(board.issueCount, "issue")}</span>
                      <span aria-hidden="true">·</span>
                      <span>{pluralize(board.columnCount, "column")}</span>
                      <span className="ml-auto">
                        Updated {formatRelativeTime(board.updatedAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <CreateBoardDialog
        organizationId={organization.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
