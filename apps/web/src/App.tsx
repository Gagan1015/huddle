import { Route, Routes } from "react-router";

import { RequireAuth } from "@/components/common/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { BoardPage } from "@/routes/board";
import { DashboardPage } from "@/routes/dashboard";
import { HomeRedirect } from "@/routes/home";
import { InvitationsPage } from "@/routes/invitations";
import { MembersPage } from "@/routes/members";
import { NewOrganizationPage } from "@/routes/new-organization";
import { NotFoundPage } from "@/routes/not-found";
import { SignInPage } from "@/routes/sign-in";

export function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<HomeRedirect />} />
        <Route path="organizations/new" element={<NewOrganizationPage />} />
        <Route path="invitations" element={<InvitationsPage />} />
        <Route element={<AppShell />}>
          <Route
            path="organizations/:organizationId"
            element={<DashboardPage />}
          />
          <Route
            path="organizations/:organizationId/members"
            element={<MembersPage />}
          />
          <Route path="boards/:boardId" element={<BoardPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
