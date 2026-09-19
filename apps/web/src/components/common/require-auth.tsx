import { Navigate, Outlet, useLocation } from "react-router";

import { ErrorState, FullPageLoader } from "@/components/common/page-state";
import { RealtimeProvider } from "@/features/realtime";
import { useMe } from "@/features/session";
import { WorkspaceProvider } from "@/features/workspace";
import { isApiError } from "@/lib/api";

export function RequireAuth() {
  const location = useLocation();
  const me = useMe();

  if (me.isPending) {
    return <FullPageLoader label="Loading your workspace" />;
  }

  if (me.isError) {
    if (isApiError(me.error, 401)) {
      return <Navigate to="/sign-in" replace state={{ from: location }} />;
    }

    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <ErrorState
          title="Huddle could not load"
          error={me.error}
          onRetry={() => void me.refetch()}
        />
      </div>
    );
  }

  // The socket connects only once a session is confirmed and disconnects when
  // this gate unmounts (sign-out or an expired session).
  return (
    <RealtimeProvider>
      <WorkspaceProvider organizations={me.data.organizations}>
        <Outlet context={me.data} />
      </WorkspaceProvider>
    </RealtimeProvider>
  );
}
