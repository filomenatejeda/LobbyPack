import type { FloorConfig, TowerConfig } from "../types/settings";

export function clampCount(value: number) {
  return Math.max(1, Math.min(50, value));
}

export function buildApartmentName(floor_number: number, apartmentIndex: number) {
  return `${floor_number}${String(apartmentIndex).padStart(2, "0")}`;
}

export function createFloor(floor_number: number, apartmentCount = 4): FloorConfig {
  return {
    floor_number,
    apartments: Array.from({ length: apartmentCount }, (_, index) =>
      buildApartmentName(floor_number, index + 1),
    ),
  };
}

export function createTower(id: number, tower_name: string, floorCount: number): TowerConfig {
  return {
    id,
    tower_name,
    floors: Array.from({ length: floorCount }, (_, index) => createFloor(index + 1)),
    selected_floor: 1,
    is_editing: false,
  };
}

export function syncFloors(existingFloors: FloorConfig[], floorCount: number) {
  const nextCount = clampCount(floorCount);

  return Array.from({ length: nextCount }, (_, index) => {
    const floor_number = index + 1;
    const existingFloor = existingFloors[index];

    if (!existingFloor) {
      return createFloor(floor_number);
    }

    return {
      floor_number,
      apartments:
        existingFloor.apartments.length > 0
          ? existingFloor.apartments
          : createFloor(floor_number).apartments,
    };
  });
}
