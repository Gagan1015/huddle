import type { UserSummary } from "@huddle/shared";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { initials } from "@/lib/format";

const MAX_VISIBLE = 4;

// Faces of everyone with this board open. Teammates come first and the
// current user last, so the first avatar is always someone else.
export function BoardPresence({
  users,
  currentUserId,
}: {
  users: UserSummary[];
  currentUserId: string;
}) {
  if (users.length === 0) {
    return null;
  }

  const ordered = [
    ...users.filter((user) => user.id !== currentUserId),
    ...users.filter((user) => user.id === currentUserId),
  ];
  const visible = ordered.slice(0, MAX_VISIBLE);
  const overflow = ordered.length - visible.length;
  const labelFor = (user: UserSummary) =>
    user.id === currentUserId ? `${user.name} (you)` : user.name;

  return (
    <AvatarGroup
      role="group"
      aria-label={`Viewing this board: ${ordered.map(labelFor).join(", ")}`}
    >
      {visible.map((user) => (
        <Tooltip key={user.id}>
          <TooltipTrigger asChild>
            <Avatar
              size="sm"
              tabIndex={0}
              aria-label={labelFor(user)}
              className="outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {user.image ? (
                <AvatarImage
                  src={user.image}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom">{labelFor(user)}</TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <AvatarGroupCount
              tabIndex={0}
              aria-label={`${overflow} more viewing`}
              className="outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              +{overflow}
            </AvatarGroupCount>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {ordered.slice(MAX_VISIBLE).map(labelFor).join(", ")}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </AvatarGroup>
  );
}
