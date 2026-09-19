import type { Me } from "@huddle/shared";
import { Navigate, useOutletContext } from "react-router";

import { useWorkspace } from "@/features/workspace";

// Someone with no workspace but a pending invitation joins instead of being
// asked to create one.
export function HomeRedirect() {
  const me = useOutletContext<Me>();
  const { activeOrganization } = useWorkspace();

  const destination = activeOrganization
    ? `/organizations/${activeOrganization.id}`
    : me.invitations.length > 0
      ? "/invitations"
      : "/organizations/new";

  return <Navigate to={destination} replace />;
}
