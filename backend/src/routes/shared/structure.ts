import type { RowDataPacket } from "mysql2/promise";
import { AuthError } from "../../auth/session";
import { pool } from "../../db/pool";
import { normalizeDepartmentAddress } from "../../utils/departments";

type StructureRow = RowDataPacket & {
  tower_name: string;
  apartment_name: string | null;
};

export type CommunityStructureTower = {
  tower_name: string;
  apartments: string[];
};

function normalizeDepartmentLookup(value: string) {
  return normalizeDepartmentAddress(value).toLowerCase();
}

function getCommunityDepartmentOptions(structure: CommunityStructureTower[]) {
  return structure.flatMap((tower) =>
    tower.apartments.map((apartment) => `${tower.tower_name} ${apartment}`),
  );
}

export async function listCommunityStructure(buildingId: string) {
  const [rows] = await pool.query<StructureRow[]>(
    `
      SELECT
        t.tower_name,
        a.apartment_name
      FROM Towers t
      LEFT JOIN Floors f ON f.tower_id = t.id
      LEFT JOIN Apartments a ON a.floor_id = f.id
      WHERE t.building_id = ?
      ORDER BY t.display_order, f.floor_number, a.display_order
    `,
    [buildingId],
  );

  const towers = new Map<string, string[]>();

  for (const row of rows) {
    if (!towers.has(row.tower_name)) {
      towers.set(row.tower_name, []);
    }

    if (row.apartment_name) {
      towers.get(row.tower_name)?.push(row.apartment_name);
    }
  }

  return Array.from(towers.entries()).map(([tower_name, apartments]) => ({
    tower_name,
    apartments,
  }));
}

export async function assertDepartmentExistsInStructure(
  buildingId: string,
  departmentAddress: string,
) {
  const normalizedDepartment = normalizeDepartmentLookup(departmentAddress);

  if (!normalizedDepartment) {
    throw new AuthError(400, "Selecciona un departamento o unidad.");
  }

  const structure = await listCommunityStructure(buildingId);
  const departmentOptions = getCommunityDepartmentOptions(structure);

  if (structure.length === 0) {
    return;
  }

  if (
    !departmentOptions.some(
      (departmentOption) => normalizeDepartmentLookup(departmentOption) === normalizedDepartment,
    )
  ) {
    throw new AuthError(400, "Selecciona un departamento o unidad registrada.");
  }
}
