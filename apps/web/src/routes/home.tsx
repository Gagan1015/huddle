import { Navigate } from "react-router";

import { useWorkspace } from "@/features/workspace";

export function HomeRedirect() {
  const { activeOrganization } = useWorkspace();

  return (
    <Navigate
      to={
        activeOrganization
          ? `/organizations/${activeOrganization.id}`
          : "/organizations/new"
      }
      replace
    />
  );
}
