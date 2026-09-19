export const queryKeys = {
  me: ["me"] as const,
  publicConfig: ["public-config"] as const,
  organizations: ["organizations"] as const,
  boards: (organizationId: string) =>
    ["organizations", organizationId, "boards"] as const,
  board: (boardId: string) => ["boards", boardId] as const,
};
