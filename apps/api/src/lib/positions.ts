// Columns and issues are ordered by integer positions with gaps so that a move
// usually touches one row. When two neighbours have no integer between them,
// the whole sibling list is re-spread inside the same transaction.

export const POSITION_GAP = 1024;

export interface Positioned {
  id: string;
  position: number;
}

export interface InsertionPlan {
  /** Index the item ends up at after clamping to the sibling count. */
  index: number;
  /** Position to store on the moved or created item. */
  position: number;
  /** Siblings whose positions must be rewritten first (empty when not needed). */
  rebalance: Positioned[];
}

export function positionBetween(
  previous: number | null,
  next: number | null,
): number | null {
  if (previous === null && next === null) {
    return POSITION_GAP;
  }

  if (previous === null && next !== null) {
    return next > 1 ? Math.floor(next / 2) : null;
  }

  if (next === null && previous !== null) {
    return previous + POSITION_GAP;
  }

  if (previous !== null && next !== null) {
    return next - previous > 1 ? Math.floor((previous + next) / 2) : null;
  }

  return null;
}

export function spreadPositions(count: number): number[] {
  return Array.from(
    { length: count },
    (_, index) => POSITION_GAP * (index + 1),
  );
}

export function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(Math.trunc(index), length));
}

/**
 * Plan where an item lands when inserted at `index` among `siblings`.
 * `siblings` must be sorted by position and must not include the moving item.
 */
export function planInsertion(
  siblings: readonly Positioned[],
  index: number,
): InsertionPlan {
  const at = clampIndex(index, siblings.length);
  const direct = positionBetween(
    siblings[at - 1]?.position ?? null,
    siblings[at]?.position ?? null,
  );

  if (direct !== null) {
    return { index: at, position: direct, rebalance: [] };
  }

  const spread = spreadPositions(siblings.length);
  const rebalance = siblings.map((sibling, siblingIndex) => ({
    id: sibling.id,
    position: spread[siblingIndex] ?? POSITION_GAP * (siblingIndex + 1),
  }));
  const position = positionBetween(
    rebalance[at - 1]?.position ?? null,
    rebalance[at]?.position ?? null,
  );

  if (position === null) {
    // Re-spread siblings are POSITION_GAP apart, so a midpoint always exists.
    throw new Error("Failed to find a position after rebalancing.");
  }

  return { index: at, position, rebalance };
}

export function nextPositionAfter(lastPosition: number | null | undefined) {
  return (lastPosition ?? 0) + POSITION_GAP;
}
