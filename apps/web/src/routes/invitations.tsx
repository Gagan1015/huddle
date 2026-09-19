import { MailOpen01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Me, PendingInvitation } from "@huddle/shared";
import { Link, useNavigate, useOutletContext } from "react-router";
import { toast } from "sonner";

import { Spinner } from "@/components/common/page-state";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { useAcceptInvitation } from "@/features/invitations";
import { useWorkspace } from "@/features/workspace";
import { errorMessage } from "@/lib/api";
import { formatRelativeTime, initials } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/member-meta";

const linkClass =
  "font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring";

// Full-page like workspace setup: this is where someone lands right after
// signing in when a workspace is already waiting for them.
export function InvitationsPage() {
  const me = useOutletContext<Me>();
  const navigate = useNavigate();
  const { organizations, setActiveOrganizationId } = useWorkspace();
  const accept = useAcceptInvitation();
  const hasWorkspace = organizations.length > 0;
  const invitations = me.invitations;

  const join = (invitation: PendingInvitation) => {
    accept.mutate(invitation.id, {
      onSuccess: (organization) => {
        setActiveOrganizationId(organization.id);
        toast.success(`Welcome to ${organization.name}.`);
        void navigate(`/organizations/${organization.id}`, { replace: true });
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Brand />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {invitations.length > 0
                ? "You're invited"
                : "No invitations waiting"}
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {invitations.length > 0
                ? `Sent to ${me.user.email}. Join a workspace to see its boards.`
                : `Nothing has been sent to ${me.user.email} yet. Ask a workspace owner to invite this address.`}
            </p>
          </div>
        </div>

        {invitations.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {invitations.map((invitation) => {
              const joining =
                accept.isPending && accept.variables === invitation.id;
              return (
                <li
                  key={invitation.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground">
                    {initials(invitation.organization.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">
                      {invitation.organization.name}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {invitation.invitedBy
                        ? `${invitation.invitedBy.name} invited you`
                        : "You were invited"}{" "}
                      as {ROLE_LABEL[invitation.role].toLowerCase()} · expires{" "}
                      {formatRelativeTime(invitation.expiresAt)}
                    </p>
                  </div>
                  <Button
                    onClick={() => join(invitation)}
                    disabled={accept.isPending}
                    aria-label={`Join ${invitation.organization.name}`}
                  >
                    {joining ? (
                      <Spinner className="size-4 text-primary-foreground" />
                    ) : null}
                    Join
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <HugeiconsIcon
                icon={MailOpen01Icon}
                size={24}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Invitations show up here as soon as they are sent.
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {hasWorkspace ? (
            <Link to="/" className={linkClass}>
              Back to your workspace
            </Link>
          ) : (
            <>
              Not expecting one?{" "}
              <Link to="/organizations/new" className={linkClass}>
                Create a new workspace instead
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
