import { describe, expect, test } from "bun:test";
import {
  buildApartmentName,
  clampCount,
  createFloor,
  createTower,
  syncFloors,
} from "./towerUtils";

describe("tower utils", () => {
  test("clamps counts between 1 and 50", () => {
    expect(clampCount(-5)).toBe(1);
    expect(clampCount(20)).toBe(20);
    expect(clampCount(99)).toBe(50);
  });

  test("builds apartment names from floor and apartment index", () => {
    expect(buildApartmentName(1, 1)).toBe("101");
    expect(buildApartmentName(12, 4)).toBe("1204");
  });

  test("creates floors with default apartments", () => {
    expect(createFloor(2)).toEqual({
      floor_number: 2,
      apartments: ["201", "202", "203", "204"],
    });
  });

  test("creates towers with default state", () => {
    expect(createTower(1, "Torre A", 2)).toEqual({
      id: 1,
      tower_name: "Torre A",
      floors: [createFloor(1), createFloor(2)],
      selected_floor: 1,
      is_editing: false,
    });
  });

  test("syncs floors while preserving existing apartments", () => {
    const result = syncFloors([{ floor_number: 1, apartments: ["A-101"] }], 2);

    expect(result).toEqual([
      { floor_number: 1, apartments: ["A-101"] },
      createFloor(2),
    ]);
  });

  test("replaces empty existing apartment lists with defaults", () => {
    const result = syncFloors([{ floor_number: 1, apartments: [] }], 1);

    expect(result).toEqual([createFloor(1)]);
  });
});
