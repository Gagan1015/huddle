export const queryKeys = {
  me: ["me"] as const,
  publicConfig: ["public-config"] as const,
  organizations: ["organizations"] as const,
  boards: (organizationId: string) =>
    ["organizations", organizationId, "boards"] as const,
  members: (organizationId: string) =>
    ["organizations", organizationId, "members"] as const,
  invitations: (organizationId: string) =>
    ["organizations", organizationId, "invitations"] as const,
  board: (boardId: string) => ["boards", boardId] as const,
};
