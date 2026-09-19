import { SOCKET_UNAUTHENTICATED, type UserSummary } from "@huddle/shared";
import { describe, expect, it, vi } from "vitest";

import { HttpError } from "../lib/http-error.js";
import {
  createConnectionGate,
  handleBoardJoin,
  handleBoardLeave,
  handleDisconnect,
  joinOrganizationRooms,
  SOCKET_UNAVAILABLE,
  type RealtimeDeps,
  type RoomSocket,
} from "./handlers.js";
import { PresenceRegistry } from "./presence.js";
import { boardRoom, isBoardRoomFor, organizationRoom } from "./rooms.js";

const MEMBER_BOARD = "board_1";
const SCOPE = { organizationId: "org_1", boardId: MEMBER_BOARD };

const priya: UserSummary = {
  id: "user_1",
  name: "Priya",
  email: "priya@x.test",
  image: null,
};
const marcus: UserSummary = {
  id: "user_2",
  name: "Marcus",
  email: "marcus@x.test",
  image: null,
};

function makeDeps(overrides: Partial<RealtimeDeps> = {}): RealtimeDeps {
  return {
    presence: new PresenceRegistry(),
    resolveUser: vi.fn(async () => priya),
    listOrganizationIds: vi.fn(async () => ["org_1", "org_2"]),
    authorizeBoard: vi.fn(async (_userId: string, boardId: string) => {
      if (boardId === MEMBER_BOARD) {
        return { organizationId: "org_1", boardId };
      }
      throw new HttpError(
        404,
        "BOARD_NOT_FOUND",
        "This board is no longer available.",
      );
    }),
    broadcastPresence: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
}

function makeSocket(id = "sock_1", user = priya): RoomSocket {
  const rooms = new Set<string>();
  return {
    id,
    data: { user, organizationIds: ["org_1", "org_2"] },
    rooms,
    join: (room) => {
      rooms.add(room);
    },
    leave: (room) => {
      rooms.delete(room);
    },
  };
}

describe("connection gate", () => {
  it("rejects a handshake without a session and leaves socket data empty", async () => {
    const deps = makeDeps({ resolveUser: vi.fn(async () => null) });
    const socket = { request: { headers: {} }, data: {} };
    const next = vi.fn();

    await createConnectionGate(deps)(socket, next);

    expect(next).toHaveBeenCalledWith(new Error(SOCKET_UNAUTHENTICATED));
    expect(socket.data).toEqual({});
  });

  it("stores the user and their organizations before allowing the connection", async () => {
    const deps = makeDeps();
    const socket = { request: { headers: { cookie: "x" } }, data: {} };
    const next = vi.fn();

    await createConnectionGate(deps)(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.data).toEqual({
      user: priya,
      organizationIds: ["org_1", "org_2"],
    });
  });

  it("reports unexpected failures without blaming the client", async () => {
    const deps = makeDeps({
      resolveUser: vi.fn(async () => {
        throw new Error("db down");
      }),
    });
    const next = vi.fn();

    await createConnectionGate(deps)({ request: { headers: {} }, data: {} }, next);

    expect(next).toHaveBeenCalledWith(new Error(SOCKET_UNAVAILABLE));
    expect(deps.onError).toHaveBeenCalledTimes(1);
  });
});

describe("organization rooms", () => {
  it("joins one room per membership", () => {
    const socket = makeSocket();

    joinOrganizationRooms(socket);

    expect([...socket.rooms]).toEqual([
      organizationRoom("org_1"),
      organizationRoom("org_2"),
    ]);
  });
});

describe("board:join", () => {
  it("rejects malformed payloads before touching authorization", async () => {
    const deps = makeDeps();
    const socket = makeSocket();

    const ack = await handleBoardJoin(socket, deps, { boardId: "" });

    expect(ack).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(deps.authorizeBoard).not.toHaveBeenCalled();
    expect(socket.rooms.size).toBe(0);
    expect(deps.broadcastPresence).not.toHaveBeenCalled();
  });

  it("does not join a room for a board outside the user's organizations", async () => {
    const deps = makeDeps();
    const socket = makeSocket();

    const ack = await handleBoardJoin(socket, deps, { boardId: "board_other" });

    expect(ack).toMatchObject({ ok: false, code: "BOARD_NOT_FOUND" });
    expect(socket.rooms.size).toBe(0);
    expect(deps.broadcastPresence).not.toHaveBeenCalled();
    expect(deps.onError).not.toHaveBeenCalled();
  });

  it("joins the server-derived room and announces the viewer list to everyone", async () => {
    const deps = makeDeps();
    const socket = makeSocket();

    const ack = await handleBoardJoin(socket, deps, {
      boardId: MEMBER_BOARD,
      extra: "ignored",
    });

    expect(ack).toEqual({ ok: true });
    expect([...socket.rooms]).toEqual([boardRoom(SCOPE)]);
    expect(deps.authorizeBoard).toHaveBeenCalledWith("user_1", MEMBER_BOARD);
    expect(deps.broadcastPresence).toHaveBeenCalledWith({
      scope: SCOPE,
      users: [priya],
    });
  });

  it("hides internal failures behind a generic acknowledgement", async () => {
    const deps = makeDeps({
      authorizeBoard: vi.fn(async () => {
        throw new Error("connection reset");
      }),
    });
    const socket = makeSocket();

    const ack = await handleBoardJoin(socket, deps, { boardId: MEMBER_BOARD });

    expect(ack).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
    expect(ack).not.toMatchObject({ message: expect.stringContaining("reset") });
    expect(deps.onError).toHaveBeenCalledTimes(1);
  });
});

describe("board:leave", () => {
  it("leaves only the matching board room and tells the others who remains", async () => {
    const deps = makeDeps();
    const priyaSocket = makeSocket("sock_1", priya);
    const marcusSocket = makeSocket("sock_2", marcus);
    await handleBoardJoin(priyaSocket, deps, { boardId: MEMBER_BOARD });
    await handleBoardJoin(marcusSocket, deps, { boardId: MEMBER_BOARD });
    joinOrganizationRooms(priyaSocket);
    priyaSocket.rooms.add(boardRoom({ organizationId: "org_1", boardId: "board_2" }));

    await handleBoardLeave(priyaSocket, deps, { boardId: MEMBER_BOARD });

    expect([...priyaSocket.rooms]).toEqual([
      organizationRoom("org_1"),
      organizationRoom("org_2"),
      boardRoom({ organizationId: "org_1", boardId: "board_2" }),
    ]);
    expect(deps.broadcastPresence).toHaveBeenLastCalledWith(
      { scope: SCOPE, users: [marcus] },
      "sock_1",
    );
  });

  it("ignores malformed payloads", async () => {
    const deps = makeDeps();
    const socket = makeSocket();
    socket.rooms.add(boardRoom(SCOPE));

    await handleBoardLeave(socket, deps, null);

    expect(socket.rooms.size).toBe(1);
    expect(deps.broadcastPresence).not.toHaveBeenCalled();
  });
});

describe("disconnect", () => {
  it("removes the socket from every board's viewer list", async () => {
    const deps = makeDeps({
      authorizeBoard: vi.fn(async (_userId: string, boardId: string) => ({
        organizationId: "org_1",
        boardId,
      })),
    });
    const socket = makeSocket();
    const teammate = makeSocket("sock_2", marcus);
    await handleBoardJoin(socket, deps, { boardId: "board_1" });
    await handleBoardJoin(socket, deps, { boardId: "board_2" });
    await handleBoardJoin(teammate, deps, { boardId: "board_2" });
    vi.mocked(deps.broadcastPresence).mockClear();

    handleDisconnect(socket, deps);

    expect(vi.mocked(deps.broadcastPresence).mock.calls).toEqual([
      [{ scope: { organizationId: "org_1", boardId: "board_1" }, users: [] }, "sock_1"],
      [
        { scope: { organizationId: "org_1", boardId: "board_2" }, users: [marcus] },
        "sock_1",
      ],
    ]);
  });
});

describe("room names", () => {
  it("nest boards under their organization and match by board id", () => {
    const room = boardRoom({ organizationId: "org_1", boardId: "board_9" });

    expect(room).toBe("org:org_1:board:board_9");
    expect(isBoardRoomFor(room, "board_9")).toBe(true);
    expect(isBoardRoomFor(room, "board_")).toBe(false);
    expect(isBoardRoomFor(organizationRoom("org_1"), "org_1")).toBe(false);
  });
});
