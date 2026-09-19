import type { Member, UserSummary } from "@huddle/shared";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useMembers } from "@/features/members";

interface BoardPeople {
  members: Member[];
  userById: Map<string, UserSummary>;
  isPending: boolean;
}

const BoardPeopleContext = createContext<BoardPeople | null>(null);

// Issues carry user IDs only. The organization's member list is fetched once
// per board view and cards, the composer, and the sheet resolve names and
// pictures from it.
export function BoardPeopleProvider({
  organizationId,
  children,
}: {
  organizationId: string;
  children: ReactNode;
}) {
  const members = useMembers(organizationId);

  const value = useMemo<BoardPeople>(() => {
    const list = members.data ?? [];
    return {
      members: list,
      userById: new Map(list.map((member) => [member.user.id, member.user])),
      isPending: members.isPending,
    };
  }, [members.data, members.isPending]);

  return (
    <BoardPeopleContext.Provider value={value}>
      {children}
    </BoardPeopleContext.Provider>
  );
}

export function useBoardPeople() {
  const context = useContext(BoardPeopleContext);

  if (!context) {
    throw new Error("useBoardPeople must be used inside BoardPeopleProvider.");
  }

  return context;
}
