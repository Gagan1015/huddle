import {
  Add01Icon,
  DashboardSquare01Icon,
  Menu01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Me } from "@huddle/shared";
import { createContext, useContext, useState, type ReactNode } from "react";
import { NavLink, Outlet, useOutletContext } from "react-router";

import { Brand } from "@/components/layout/brand";
import { ConnectionIndicator } from "@/components/layout/connection-indicator";
import { OrganizationSwitcher } from "@/components/layout/organization-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useBoards } from "@/features/boards";
import { useWorkspace } from "@/features/workspace";
import { cn } from "@/lib/utils";

interface ShellHeaderContextValue {
  setHeader: (node: ReactNode) => void;
}

const ShellHeaderContext = createContext<ShellHeaderContextValue | null>(null);

export function useShellHeader() {
  const context = useContext(ShellHeaderContext);

  if (!context) {
    throw new Error("useShellHeader must be used inside AppShell.");
  }

  return context;
}

function navLinkClass(isActive: boolean) {
  return cn(
    "flex min-h-8 items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring",
    isActive && "bg-sidebar-accent font-medium text-sidebar-foreground",
  );
}

function SidebarContent({
  me,
  onNavigate,
}: {
  me: Me;
  onNavigate?: () => void;
}) {
  const { activeOrganization } = useWorkspace();
  const boards = useBoards(activeOrganization?.id ?? null);

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <div className="px-2 pt-1">
        <Brand />
      </div>
      <OrganizationSwitcher pendingInvitations={me.invitations.length} />
      <nav
        aria-label="Workspace"
        className="flex flex-1 flex-col gap-1 overflow-y-auto"
      >
        {activeOrganization ? (
          <>
            <NavLink
              to={`/organizations/${activeOrganization.id}`}
              end
              className={({ isActive }) => navLinkClass(isActive)}
              onClick={onNavigate}
            >
              <HugeiconsIcon
                icon={DashboardSquare01Icon}
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Dashboard
            </NavLink>
            <NavLink
              to={`/organizations/${activeOrganization.id}/members`}
              className={({ isActive }) => navLinkClass(isActive)}
              onClick={onNavigate}
            >
              <HugeiconsIcon
                icon={UserGroupIcon}
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              Members
            </NavLink>
          </>
        ) : null}
        <p className="mt-3 mb-1 px-2 text-xs font-medium tracking-wide text-muted-foreground">
          Boards
        </p>
        {boards.isPending && activeOrganization ? (
          <div className="flex flex-col gap-1.5 px-2 py-1" aria-hidden="true">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : null}
        {boards.data?.map((board) => (
          <NavLink
            key={board.id}
            to={`/boards/${board.id}`}
            className={({ isActive }) => navLinkClass(isActive)}
            onClick={onNavigate}
          >
            <span className="truncate">{board.title}</span>
          </NavLink>
        ))}
        {boards.data?.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No boards yet.
          </p>
        ) : null}
        {activeOrganization ? (
          <NavLink
            to={`/organizations/${activeOrganization.id}?new=board`}
            className={cn(navLinkClass(false), "mt-1 text-muted-foreground")}
            onClick={onNavigate}
          >
            <HugeiconsIcon
              icon={Add01Icon}
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            New board
          </NavLink>
        ) : null}
      </nav>
      <UserMenu user={me.user} />
    </div>
  );
}

export function AppShell() {
  const me = useOutletContext<Me>();
  const [header, setHeader] = useState<ReactNode>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ShellHeaderContext.Provider value={{ setHeader }}>
      <div className="flex h-dvh w-full bg-background">
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
          <SidebarContent me={me} />
        </aside>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="p-0 data-[side=left]:w-72"
            showCloseButton={false}
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent me={me} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <HugeiconsIcon icon={Menu01Icon} size={20} strokeWidth={1.5} />
            </Button>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {header}
            </div>
            <ConnectionIndicator />
          </header>
          <main className="flex min-h-0 flex-1 flex-col">
            <Outlet context={me} />
          </main>
        </div>
      </div>
    </ShellHeaderContext.Provider>
  );
}
