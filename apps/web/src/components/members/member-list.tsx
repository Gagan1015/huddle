import { useQuery } from "@tanstack/react-query";

import { ErrorState } from "@/components/common/page-state";
import { UserAvatar } from "@/components/common/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { membersQueryOptions } from "@/features/members";
import { pluralize } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/member-meta";

export function MemberList({
  organizationId,
  currentUserId,
}: {
  organizationId: string;
  currentUserId: string;
}) {
  // Boards can live with a five-minute-old member list; this page is where
  // someone looks right after a teammate joins, so keep it fresher here.
  const members = useQuery({
    ...membersQueryOptions(organizationId),
    staleTime: 30_000,
  });

  return (
    <section aria-labelledby="members-heading" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="members-heading" className="text-lg font-semibold">
          People
        </h3>
        {members.data ? (
          <span className="text-sm text-muted-foreground">
            {pluralize(members.data.length, "member")}
          </span>
        ) : null}
      </div>

      {members.isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : members.isError ? (
        <ErrorState
          error={members.error}
          onRetry={() => void members.refetch()}
        />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
          {members.data.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-4 py-3">
              <UserAvatar user={member.user} size="default" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.user.name}
                  {member.user.id === currentUserId ? (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      (you)
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.user.email}
                </p>
              </div>
              <Badge
                variant={member.role === "MEMBER" ? "outline" : "secondary"}
              >
                {ROLE_LABEL[member.role]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
