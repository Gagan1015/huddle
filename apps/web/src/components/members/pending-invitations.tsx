import {
  Cancel01Icon,
  Link01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { ErrorState, Spinner } from "@/components/common/page-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useOrganizationInvitations,
  useRevokeInvitation,
} from "@/features/invitations";
import { errorMessage } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/member-meta";

// Nothing is emailed, so the manager gets a link to hand over instead. After
// sign-in it lists every invitation waiting for that account.
function inviteLink() {
  return `${window.location.origin}/invitations`;
}

export function PendingInvitations({
  organizationId,
}: {
  organizationId: string;
}) {
  const invitations = useOrganizationInvitations(organizationId);
  const revoke = useRevokeInvitation(organizationId);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink());
      toast.success("Invite link copied. Anyone you invited can join from it.");
    } catch {
      toast.error(`Couldn't copy. The link is ${inviteLink()}`);
    }
  };

  return (
    <section
      aria-labelledby="invitations-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="invitations-heading" className="text-lg font-semibold">
          Pending invitations
        </h3>
        <Button variant="ghost" size="sm" onClick={() => void copyLink()}>
          <HugeiconsIcon
            icon={Link01Icon}
            size={16}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          Copy invite link
        </Button>
      </div>

      {invitations.isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-14 rounded-xl" />
        </div>
      ) : invitations.isError ? (
        <ErrorState
          error={invitations.error}
          onRetry={() => void invitations.refetch()}
        />
      ) : invitations.data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/60 px-5 py-6 text-center text-sm text-muted-foreground">
          No one is waiting to join. Invitations you send stay here until they
          are accepted or expire.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
          {invitations.data.map((invitation) => {
            const revoking =
              revoke.isPending && revoke.variables === invitation.id;
            return (
              <li
                key={invitation.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                  <HugeiconsIcon
                    icon={Mail01Icon}
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {invitation.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ROLE_LABEL[invitation.role]} · invited{" "}
                    {formatRelativeTime(invitation.createdAt)}
                    {invitation.invitedBy
                      ? ` by ${invitation.invitedBy.name}`
                      : ""}{" "}
                    · expires {formatRelativeTime(invitation.expiresAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revoking}
                  aria-label={`Revoke invitation for ${invitation.email}`}
                  onClick={() =>
                    revoke.mutate(invitation.id, {
                      onSuccess: () =>
                        toast.success(
                          `Invitation for ${invitation.email} revoked.`,
                        ),
                      onError: (error) => toast.error(errorMessage(error)),
                    })
                  }
                >
                  {revoking ? (
                    <Spinner className="size-4" />
                  ) : (
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      size={16}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  )}
                  Revoke
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
