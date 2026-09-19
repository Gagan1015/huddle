import type { ServerEventName, ServerEventPayload } from "@huddle/shared";

import type { BoardScope } from "./rooms.js";

// Domain services publish through this seam after every committed write. The
// Socket.IO transport registers a publisher that maps scopes to authorized
// rooms; until it does (tests, scripts), events are dropped.
export interface BoardEventPublisher {
  toBoard<E extends ServerEventName>(
    scope: BoardScope,
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
  scope: BoardScope,
  event: E,
  payload: ServerEventPayload<E>,
) {
  publisher.toBoard(scope, event, payload);
}

export function publishToOrganization<E extends ServerEventName>(
  organizationId: string,
  event: E,
  payload: ServerEventPayload<E>,
) {
  publisher.toOrganization(organizationId, event, payload);
}
