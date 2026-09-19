import { describe, expect, it } from "vitest";

import { PresenceRegistry } from "./presence.js";

const scope = { organizationId: "org_1", boardId: "board_1" };
const other = { organizationId: "org_1", boardId: "board_2" };
const priya = { id: "u_priya", name: "Priya", email: "p@x.test", image: null };
const marcus = { id: "u_marcus", name: "Marcus", email: "m@x.test", image: null };

describe("PresenceRegistry", () => {
  it("lists users in arrival order and reports one entry per user across tabs", () => {
    const presence = new PresenceRegistry();

    presence.join(scope, "sock_a", priya);
    presence.join(scope, "sock_b", marcus);
    const change = presence.join(scope, "sock_c", priya);

    expect(change.scope).toEqual(scope);
    expect(change.users).toEqual([priya, marcus]);
  });

  it("keeps a user present while any of their tabs remains", () => {
    const presence = new PresenceRegistry();
    presence.join(scope, "sock_a", priya);
    presence.join(scope, "sock_c", priya);

    expect(presence.leave("board_1", "sock_a")?.users).toEqual([priya]);
    expect(presence.leave("board_1", "sock_c")?.users).toEqual([]);
    expect(presence.list("board_1")).toEqual([]);
  });

  it("returns null when the socket was not on that board", () => {
    const presence = new PresenceRegistry();
    presence.join(scope, "sock_a", priya);

    expect(presence.leave("board_1", "sock_zzz")).toBeNull();
    expect(presence.leave("board_9", "sock_a")).toBeNull();
    expect(presence.list("board_1")).toEqual([priya]);
  });

  it("re-joining from the same socket is idempotent", () => {
    const presence = new PresenceRegistry();
    presence.join(scope, "sock_a", priya);
    presence.join(scope, "sock_a", priya);

    expect(presence.list("board_1")).toEqual([priya]);
    expect(presence.leave("board_1", "sock_a")?.users).toEqual([]);
  });

  it("clears a disconnecting socket from every board it had open", () => {
    const presence = new PresenceRegistry();
    presence.join(scope, "sock_a", priya);
    presence.join(other, "sock_a", priya);
    presence.join(other, "sock_b", marcus);

    const changes = presence.leaveAll("sock_a");

    expect(changes).toEqual([
      { scope, users: [] },
      { scope: other, users: [marcus] },
    ]);
    expect(presence.leaveAll("sock_a")).toEqual([]);
  });
});
