import { describe, expect, it } from "vitest";

import {
  POSITION_GAP,
  clampIndex,
  nextPositionAfter,
  planInsertion,
  positionBetween,
  spreadPositions,
} from "./positions.js";

describe("positionBetween", () => {
  it("starts an empty list at one gap", () => {
    expect(positionBetween(null, null)).toBe(POSITION_GAP);
  });

  it("appends one gap after the last item", () => {
    expect(positionBetween(3072, null)).toBe(3072 + POSITION_GAP);
  });

  it("halves the space before the first item", () => {
    expect(positionBetween(null, 1024)).toBe(512);
    expect(positionBetween(null, 1)).toBeNull();
  });

  it("picks the midpoint and reports exhausted gaps", () => {
    expect(positionBetween(1024, 2048)).toBe(1536);
    expect(positionBetween(1024, 1025)).toBeNull();
  });
});

describe("planInsertion", () => {
  const siblings = [
    { id: "a", position: 1024 },
    { id: "b", position: 2048 },
    { id: "c", position: 3072 },
  ];

  it("inserts at the start, middle, and end without rebalancing", () => {
    expect(planInsertion(siblings, 0)).toEqual({
      index: 0,
      position: 512,
      rebalance: [],
    });
    expect(planInsertion(siblings, 1)).toEqual({
      index: 1,
      position: 1536,
      rebalance: [],
    });
    expect(planInsertion(siblings, 3)).toEqual({
      index: 3,
      position: 4096,
      rebalance: [],
    });
  });

  it("clamps out-of-range indexes", () => {
    expect(planInsertion(siblings, 99).index).toBe(3);
    expect(planInsertion(siblings, -4).index).toBe(0);
    expect(planInsertion([], 5)).toEqual({
      index: 0,
      position: POSITION_GAP,
      rebalance: [],
    });
  });

  it("rebalances siblings when no integer gap remains", () => {
    const crowded = [
      { id: "a", position: 10 },
      { id: "b", position: 11 },
      { id: "c", position: 12 },
    ];
    const plan = planInsertion(crowded, 1);

    expect(plan.rebalance).toEqual([
      { id: "a", position: 1024 },
      { id: "b", position: 2048 },
      { id: "c", position: 3072 },
    ]);
    expect(plan.position).toBe(1536);
  });

  it("keeps positions strictly ordered after the plan is applied", () => {
    const crowded = [
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ];
    const plan = planInsertion(crowded, 0);
    const positions = [
      plan.position,
      ...plan.rebalance.map((item) => item.position),
    ];

    expect([...positions].sort((x, y) => x - y)).toEqual(positions);
    expect(new Set(positions).size).toBe(positions.length);
  });
});

describe("helpers", () => {
  it("spreads positions one gap apart", () => {
    expect(spreadPositions(3)).toEqual([1024, 2048, 3072]);
  });

  it("clamps and truncates indexes", () => {
    expect(clampIndex(2.7, 5)).toBe(2);
    expect(clampIndex(-1, 5)).toBe(0);
    expect(clampIndex(9, 5)).toBe(5);
  });

  it("appends after the last position", () => {
    expect(nextPositionAfter(undefined)).toBe(POSITION_GAP);
    expect(nextPositionAfter(2048)).toBe(3072);
  });
});
