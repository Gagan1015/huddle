import type {
  Board,
  BoardColumn,
  BoardDeletedPayload,
  BoardDetail,
  BoardSummary,
  ColumnDeletedPayload,
  CreateBoardInput,
  CreateColumnInput,
  CreateIssueInput,
  DeleteColumnInput,
  Issue,
  IssueDeletedPayload,
  MoveColumnInput,
  MoveIssueInput,
  UpdateBoardInput,
  UpdateColumnInput,
  UpdateIssueInput,
} from "@huddle/shared";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export const boardsQueryOptions = (organizationId: string) =>
  queryOptions({
    queryKey: queryKeys.boards(organizationId),
    queryFn: () =>
      apiFetch<BoardSummary[]>(`/api/organizations/${organizationId}/boards`),
  });

export const boardQueryOptions = (boardId: string) =>
  queryOptions({
    queryKey: queryKeys.board(boardId),
    queryFn: () => apiFetch<BoardDetail>(`/api/boards/${boardId}`),
  });

export function useBoards(organizationId: string | null) {
  return useQuery({
    ...boardsQueryOptions(organizationId ?? ""),
    enabled: organizationId !== null,
  });
}

export function useBoard(boardId: string) {
  return useQuery(boardQueryOptions(boardId));
}

// Until Socket.IO reconciliation lands (Phase 3), every write settles by
// refetching the affected board so REST stays the single source of truth.
function useBoardWrite<TVariables, TData>(
  boardId: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.board(boardId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organizations }),
      ]),
  });
}

export function useCreateBoard(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBoardInput) =>
      apiFetch<Board>(`/api/organizations/${organizationId}/boards`, {
        method: "POST",
        json: input,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.boards(organizationId),
      }),
  });
}

export function useUpdateBoard(boardId: string) {
  return useBoardWrite(boardId, (input: UpdateBoardInput) =>
    apiFetch<Board>(`/api/boards/${boardId}`, { method: "PATCH", json: input }),
  );
}

export function useDeleteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (boardId: string) =>
      apiFetch<BoardDeletedPayload>(`/api/boards/${boardId}`, {
        method: "DELETE",
      }),
    onSuccess: (payload) => {
      queryClient.removeQueries({ queryKey: queryKeys.board(payload.boardId) });
      return queryClient.invalidateQueries({
        queryKey: queryKeys.boards(payload.organizationId),
      });
    },
  });
}

export function useCreateColumn(boardId: string) {
  return useBoardWrite(boardId, (input: CreateColumnInput) =>
    apiFetch<BoardColumn>(`/api/boards/${boardId}/columns`, {
      method: "POST",
      json: input,
    }),
  );
}

export function useRenameColumn(boardId: string) {
  return useBoardWrite(
    boardId,
    ({ columnId, ...input }: UpdateColumnInput & { columnId: string }) =>
      apiFetch<BoardColumn>(`/api/columns/${columnId}`, {
        method: "PATCH",
        json: input,
      }),
  );
}

export function useMoveColumn(boardId: string) {
  return useBoardWrite(
    boardId,
    ({ columnId, ...input }: MoveColumnInput & { columnId: string }) =>
      apiFetch<BoardColumn>(`/api/columns/${columnId}/move`, {
        method: "POST",
        json: input,
      }),
  );
}

export function useDeleteColumn(boardId: string) {
  return useBoardWrite(
    boardId,
    ({ columnId, ...input }: DeleteColumnInput & { columnId: string }) =>
      apiFetch<ColumnDeletedPayload>(`/api/columns/${columnId}`, {
        method: "DELETE",
        json: input,
      }),
  );
}

export function useCreateIssue(boardId: string) {
  return useBoardWrite(
    boardId,
    ({ columnId, ...input }: CreateIssueInput & { columnId: string }) =>
      apiFetch<Issue>(`/api/columns/${columnId}/issues`, {
        method: "POST",
        json: input,
      }),
  );
}

export function useUpdateIssue(boardId: string) {
  return useBoardWrite(
    boardId,
    ({ issueId, ...input }: UpdateIssueInput & { issueId: string }) =>
      apiFetch<Issue>(`/api/issues/${issueId}`, {
        method: "PATCH",
        json: input,
      }),
  );
}

export function useMoveIssue(boardId: string) {
  return useBoardWrite(
    boardId,
    ({ issueId, ...input }: MoveIssueInput & { issueId: string }) =>
      apiFetch<Issue>(`/api/issues/${issueId}/move`, {
        method: "POST",
        json: input,
      }),
  );
}

export function useDeleteIssue(boardId: string) {
  return useBoardWrite(boardId, (issueId: string) =>
    apiFetch<IssueDeletedPayload>(`/api/issues/${issueId}`, {
      method: "DELETE",
    }),
  );
}
