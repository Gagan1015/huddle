export interface AssignmentState {
  assigneeId: string | null;
  assignedById: string | null;
}

/**
 * Decide the assignment after an update. `next` is `undefined` when the caller
 * did not touch the assignee. Whoever changes the assignee is recorded as the
 * assigner; unassigning clears both so stale attributions never linger.
 */
export function resolveAssignment(
  current: AssignmentState,
  next: string | null | undefined,
  actorId: string,
): AssignmentState {
  if (next === undefined || next === current.assigneeId) {
    return current;
  }

  return next === null
    ? { assigneeId: null, assignedById: null }
    : { assigneeId: next, assignedById: actorId };
}
