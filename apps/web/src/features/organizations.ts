import type {
  CreateOrganizationInput,
  OrganizationMembership,
} from "@huddle/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrganizationInput) =>
      apiFetch<OrganizationMembership>("/api/organizations", {
        method: "POST",
        json: input,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}
