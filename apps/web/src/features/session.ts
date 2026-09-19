import type { Me } from "@huddle/shared";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { apiFetch } from "@/lib/api";
import { fetchPublicConfig, signOut } from "@/lib/auth";
import { queryKeys } from "@/lib/query-keys";

export const meQueryOptions = queryOptions({
  queryKey: queryKeys.me,
  queryFn: () => apiFetch<Me>("/api/me"),
  retry: false,
  staleTime: 5 * 60_000,
});

export const publicConfigQueryOptions = queryOptions({
  queryKey: queryKeys.publicConfig,
  queryFn: fetchPublicConfig,
  staleTime: Infinity,
});

export function useMe() {
  return useQuery(meQueryOptions);
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear();
      void navigate("/sign-in", { replace: true });
    },
  });
}
