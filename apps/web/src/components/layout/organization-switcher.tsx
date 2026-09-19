import {
  Add01Icon,
  MailOpen01Icon,
  Tick02Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/features/workspace";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function OrganizationSwitcher({
  pendingInvitations = 0,
  className,
}: {
  /** Invitations waiting for the signed-in user; surfaces a link to review them. */
  pendingInvitations?: number;
  className?: string;
}) {
  const navigate = useNavigate();
  const { organizations, activeOrganization, setActiveOrganizationId } =
    useWorkspace();

  if (!activeOrganization) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto w-full justify-start gap-2.5 px-2 py-1.5 text-left",
            className,
          )}
          aria-label={`Workspace: ${activeOrganization.name}. Switch workspace`}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
            {initials(activeOrganization.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {activeOrganization.name}
            </span>
            <span className="block text-xs text-muted-foreground">
              {activeOrganization.role.toLowerCase()}
            </span>
          </span>
          <HugeiconsIcon
            icon={UnfoldMoreIcon}
            size={16}
            strokeWidth={1.5}
            className="text-muted-foreground"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {organizations.map((organization) => (
          <DropdownMenuItem
            key={organization.id}
            onSelect={() => {
              setActiveOrganizationId(organization.id);
              void navigate(`/organizations/${organization.id}`);
            }}
          >
            <span className="flex size-6 items-center justify-center rounded bg-secondary text-[11px] font-semibold text-secondary-foreground">
              {initials(organization.name)}
            </span>
            <span className="flex-1 truncate">{organization.name}</span>
            {organization.id === activeOrganization.id ? (
              <HugeiconsIcon
                icon={Tick02Icon}
                size={16}
                strokeWidth={2}
                aria-label="Current workspace"
              />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {pendingInvitations > 0 ? (
          <DropdownMenuItem onSelect={() => void navigate("/invitations")}>
            <HugeiconsIcon
              icon={MailOpen01Icon}
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span className="flex-1">Invitations</span>
            <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {pendingInvitations}
            </span>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => void navigate("/organizations/new")}>
          <HugeiconsIcon
            icon={Add01Icon}
            size={16}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
