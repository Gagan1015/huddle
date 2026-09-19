import type { UserSummary } from "@huddle/shared";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

// One avatar treatment everywhere a person appears on the board. `xs` is for
// dense card footers; an unknown user (left the workspace) still gets a shape.
export function UserAvatar({
  user,
  size = "sm",
  className,
}: {
  user: UserSummary | null | undefined;
  size?: "xs" | "sm" | "default";
  className?: string;
}) {
  const name = user?.name ?? "Unknown user";

  return (
    <Avatar
      role="img"
      aria-label={name}
      size={size === "xs" ? "sm" : size}
      className={cn(size === "xs" && "size-5!", className)}
    >
      {user?.image ? (
        <AvatarImage src={user.image} alt="" referrerPolicy="no-referrer" />
      ) : null}
      <AvatarFallback className={cn(size === "xs" && "text-[9px]!")}>
        {user ? initials(user.name) : "?"}
      </AvatarFallback>
    </Avatar>
  );
}
