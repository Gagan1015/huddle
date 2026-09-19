import { KanbanIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Me } from "@huddle/shared";
import { useEffect } from "react";
import { Link, useOutletContext, useParams } from "react-router";

import { BoardHeader } from "@/components/board/board-header";
import { KanbanBoard } from "@/components/board/kanban-board";
import { EmptyState, ErrorState } from "@/components/common/page-state";
import { useShellHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBoard } from "@/features/boards";
import { useBoardRoom } from "@/features/realtime";
import { useWorkspace } from "@/features/workspace";
import { isApiError } from "@/lib/api";

function BoardSkeleton() {
  return (
    <div
      className="flex gap-4 overflow-hidden px-4 py-4 sm:px-6"
      aria-busy="true"
      aria-label="Loading board"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="flex w-72 shrink-0 flex-col gap-2 rounded-2xl bg-secondary/70 p-2"
        >
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          {index === 0 ? <Skeleton className="h-20 rounded-xl" /> : null}
        </div>
      ))}
    </div>
  );
}

export function BoardPage() {
  const { boardId = "" } = useParams();
  const me = useOutletContext<Me>();
  const board = useBoard(boardId);
  const presence = useBoardRoom(boardId);
  const { organizations, activeOrganization, setActiveOrganizationId } =
    useWorkspace();
  const { setHeader } = useShellHeader();

  const organizationId = board.data?.organizationId;
  const organizationName =
    organizations.find((organization) => organization.id === organizationId)
      ?.name ?? "Workspace";

  useEffect(() => {
    if (organizationId) {
      setActiveOrganizationId(organizationId);
    }
  }, [organizationId, setActiveOrganizationId]);

  useEffect(() => {
    setHeader(
      board.data ? (
        <BoardHeader
          board={board.data}
          organizationName={organizationName}
          presence={presence}
          currentUserId={me.user.id}
        />
      ) : (
        <Skeleton className="h-5 w-48" />
      ),
    );
    return () => setHeader(null);
  }, [board.data, organizationName, presence, me.user.id, setHeader]);

  if (board.isPending) {
    return <BoardSkeleton />;
  }

  if (board.isError) {
    const dashboardHref = activeOrganization
      ? `/organizations/${activeOrganization.id}`
      : "/";

    if (isApiError(board.error, 404)) {
      return (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            className="max-w-md"
            icon={
              <HugeiconsIcon icon={KanbanIcon} size={24} strokeWidth={1.5} />
            }
            title="This board is not available"
            description="It may have been deleted, or it belongs to a workspace you are not part of."
            action={
              <Button asChild variant="outline">
                <Link to={dashboardHref}>Back to dashboard</Link>
              </Button>
            }
          />
        </div>
      );
    }

    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <ErrorState error={board.error} onRetry={() => void board.refetch()} />
      </div>
    );
  }

  return (
    // Positioned so the import progress pill can sit over the foot of the board.
    <div className="relative min-h-0 flex-1">
      <KanbanBoard board={board.data} currentUserId={me.user.id} />
    </div>
  );
}
