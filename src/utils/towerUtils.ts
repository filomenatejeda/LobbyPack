import type { FloorConfig, TowerConfig } from "../types/settings";

// Mantiene la cantidad de pisos dentro de un rango pequeño y cómodo para la demo.
export function clampCount(value: number) {
  return Math.max(1, Math.min(50, value));
}

// Los nombres de departamentos siguen la convención común: piso + número de dos dígitos.
export function buildApartmentName(floorNumber: number, apartmentIndex: number) {
  return `${floorNumber}${String(apartmentIndex).padStart(2, "0")}`;
}

// Crea un piso con nombres de departamentos generados automáticamente.
export function createFloor(floorNumber: number, apartmentCount = 4): FloorConfig {
  return {
    floorNumber,
    apartments: Array.from({ length: apartmentCount }, (_, index) =>
      buildApartmentName(floorNumber, index + 1),
    ),
  };
}

// Crea un modelo completo de torre listo para editar y previsualizar en Settings.
export function createTower(id: number, name: string, floorCount: number): TowerConfig {
  return {
    id,
    name,
    floors: Array.from({ length: floorCount }, (_, index) => createFloor(index + 1)),
    selectedFloor: 1,
    isEditing: false,
  };
}

// Redimensiona la lista de pisos preservando los pisos que ya tienen datos.
export function syncFloors(existingFloors: FloorConfig[], floorCount: number) {
  const nextCount = clampCount(floorCount);

  return Array.from({ length: nextCount }, (_, index) => {
    const floorNumber = index + 1;
    const existingFloor = existingFloors[index];

    if (!existingFloor) {
      return createFloor(floorNumber);
    }

    return {
      floorNumber,
      apartments:
        existingFloor.apartments.length > 0
          ? existingFloor.apartments
          : createFloor(floorNumber).apartments,
    };
  });
}
