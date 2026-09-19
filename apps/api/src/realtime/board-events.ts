import type { ServerEventName, ServerEventPayload } from "@huddle/shared";

// Domain services publish through this seam after every committed write. The
// Socket.IO transport (Phase 3) registers a publisher that maps organization
// and board IDs to authorized rooms; until then events are dropped.
export interface BoardEventPublisher {
  toBoard<E extends ServerEventName>(
    boardId: string,
    event: E,
    payload: ServerEventPayload<E>,
  ): void;
  toOrganization<E extends ServerEventName>(
    organizationId: string,
    event: E,
    payload: ServerEventPayload<E>,
  ): void;
}

const noopPublisher: BoardEventPublisher = {
  toBoard() {},
  toOrganization() {},
};

let publisher: BoardEventPublisher = noopPublisher;

export function setBoardEventPublisher(next: BoardEventPublisher | null) {
  publisher = next ?? noopPublisher;
}

export function publishToBoard<E extends ServerEventName>(
  boardId: string,
  event: E,
  payload: ServerEventPayload<E>,
) {
  publisher.toBoard(boardId, event, payload);
}

export function publishToOrganization<E extends ServerEventName>(
  organizationId: string,
  event: E,
  payload: ServerEventPayload<E>,
) {
  publisher.toOrganization(organizationId, event, payload);
}
