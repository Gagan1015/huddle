import { describe, expect, it, vi } from "vitest";

import { createSocketPublisher, type RoomEmitter } from "./socket-publisher.js";

function makeEmitter() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { emit, to, io: { to } as unknown as RoomEmitter };
}

describe("socket publisher", () => {
  it("sends board events to the nested board room", () => {
    const { emit, to, io } = makeEmitter();
    const payload = { boardId: "board_1", columnId: "col_1", issueId: "iss_1" };

    createSocketPublisher(io).toBoard(
      { organizationId: "org_1", boardId: "board_1" },
      "issue:deleted",
      payload,
    );

    expect(to).toHaveBeenCalledWith("org:org_1:board:board_1");
    expect(emit).toHaveBeenCalledWith("issue:deleted", payload);
  });

  it("sends board lifecycle events to the organization room", () => {
    const { emit, to, io } = makeEmitter();
    const payload = { organizationId: "org_1", boardId: "board_1" };

    createSocketPublisher(io).toOrganization("org_1", "board:deleted", payload);

    expect(to).toHaveBeenCalledWith("org:org_1");
    expect(emit).toHaveBeenCalledWith("board:deleted", payload);
  });
});
