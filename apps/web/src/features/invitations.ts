import type {
  CreateInvitationInput,
  Invitation,
  OrganizationMembership,
} from "@huddle/shared";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { getSocket } from "@/lib/socket";

// Pending invitations a manager has sent for one organization. The invitee's
// own pending invitations arrive with `/api/me` instead.
export const invitationsQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: queryKeys.invitations(organizationId),
    queryFn: () =>
      apiFetch<Invitation[]>(
        `/api/organizations/${organizationId}/invitations`,
      ),
  });

export function useOrganizationInvitations(organizationId: string) {
  return useQuery(invitationsQueryOptions(organizationId));
}

export function useCreateInvitation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      apiFetch<Invitation>(`/api/organizations/${organizationId}/invitations`, {
        method: "POST",
        json: input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.invitations(organizationId),
      }),
  });
}

export function useRevokeInvitation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      apiFetch<null>(
        `/api/organizations/${organizationId}/invitations/${invitationId}`,
        { method: "DELETE" },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.invitations(organizationId),
      }),
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      apiFetch<OrganizationMembership>(
        `/api/invitations/${invitationId}/accept`,
        { method: "POST" },
      ),
    onSuccess: async (organization) => {
      // Organization rooms are resolved during the socket handshake, so a
      // reconnect is what starts delivering the new workspace's events.
      const socket = getSocket();
      if (socket.connected) {
        socket.disconnect().connect();
      }
      // Wait for `me` so the new workspace exists before the page navigates.
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.members(organization.id),
      });
    },
  });
}
