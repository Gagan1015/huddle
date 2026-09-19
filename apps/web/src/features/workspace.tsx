import type { OrganizationMembership } from "@huddle/shared";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "huddle.activeOrganizationId";

interface WorkspaceContextValue {
  organizations: OrganizationMembership[];
  activeOrganization: OrganizationMembership | null;
  setActiveOrganizationId: (organizationId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function readStoredId() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Remembers which organization the user is working in across boards and
// reloads. Pages that know their organization call `setActiveOrganizationId`.
export function WorkspaceProvider({
  organizations,
  children,
}: {
  organizations: OrganizationMembership[];
  children: ReactNode;
}) {
  const [storedId, setStoredId] = useState(readStoredId);

  const setActiveOrganizationId = useCallback((organizationId: string) => {
    setStoredId((current) => {
      if (current === organizationId) {
        return current;
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, organizationId);
      } catch {
        // Storage can be unavailable in private modes; the in-memory value still works.
      }
      return organizationId;
    });
  }, []);

  const value = useMemo<WorkspaceContextValue>(() => {
    const activeOrganization =
      organizations.find((organization) => organization.id === storedId) ??
      organizations[0] ??
      null;

    return { organizations, activeOrganization, setActiveOrganizationId };
  }, [organizations, storedId, setActiveOrganizationId]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  }

  return context;
}
