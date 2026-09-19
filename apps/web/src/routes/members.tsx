import type { Me } from "@huddle/shared";
import { useEffect } from "react";
import { Link, Navigate, useOutletContext, useParams } from "react-router";

import { useShellHeader } from "@/components/layout/app-shell";
import { InviteMemberForm } from "@/components/members/invite-member-form";
import { MemberList } from "@/components/members/member-list";
import { PendingInvitations } from "@/components/members/pending-invitations";
import { useWorkspace } from "@/features/workspace";
import { canManageOrganization } from "@/lib/member-meta";

export function MembersPage() {
  const { organizationId = "" } = useParams();
  const me = useOutletContext<Me>();
  const { organizations, setActiveOrganizationId } = useWorkspace();
  const organization = organizations.find((item) => item.id === organizationId);
  const { setHeader } = useShellHeader();

  useEffect(() => {
    if (organization) {
      setActiveOrganizationId(organization.id);
    }
  }, [organization, setActiveOrganizationId]);

  useEffect(() => {
    setHeader(
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
      >
        <Link
          to={`/organizations/${organizationId}`}
          className="truncate rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {organization?.name ?? "Workspace"}
        </Link>
        <span aria-hidden="true">/</span>
        <h1 className="truncate font-medium text-foreground">Members</h1>
      </nav>,
    );
    return () => setHeader(null);
  }, [organization?.name, organizationId, setHeader]);

  if (!organization) {
    return <Navigate to="/" replace />;
  }

  const canManage = canManageOrganization(organization.role);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight">Members</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
            Everyone here can open and edit every board in {organization.name}.{" "}
            {canManage
              ? "Invite people by email; the workspace is waiting for them the moment they sign in."
              : "Only workspace owners and admins can invite people."}
          </p>
        </div>

        {canManage ? (
          <InviteMemberForm organizationId={organization.id} />
        ) : null}

        <MemberList
          organizationId={organization.id}
          currentUserId={me.user.id}
        />

        {canManage ? (
          <PendingInvitations organizationId={organization.id} />
        ) : null}
      </div>
    </div>
  );
}
