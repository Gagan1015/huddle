import type { Member } from "@huddle/shared";
import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export const membersQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: queryKeys.members(organizationId),
    queryFn: () =>
      apiFetch<Member[]>(`/api/organizations/${organizationId}/members`),
    // Membership changes rarely; cards resolve assignee IDs from this list.
    staleTime: 5 * 60_000,
  });

export function useMembers(organizationId: string) {
  return useQuery(membersQueryOptions(organizationId));
}
