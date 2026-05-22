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

const DEPARTMENT_PARTS_REGEX = /^(Torre [A-Z]) (\d{3})$/;

function parseDepartmentAddress(value: string) {
  const normalizedValue = normalizeDepartmentAddress(value);
  const match = normalizedValue.match(DEPARTMENT_PARTS_REGEX);

  if (!match) {
    return null;
  }

  return {
    tower_name: match[1],
    apartment_name: match[2],
  };
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
  const parsedDepartment = parseDepartmentAddress(departmentAddress);

  if (!parsedDepartment) {
    throw new AuthError(400, "El departamento debe seguir el formato Torre A 302.");
  }

  const structure = await listCommunityStructure(buildingId);
  const tower = structure.find((item) => item.tower_name === parsedDepartment.tower_name);

  if (!tower) {
    throw new AuthError(400, "La Torre ingresada no existe.");
  }

  if (!tower.apartments.includes(parsedDepartment.apartment_name)) {
    throw new AuthError(400, "El número de departamento ingresado no existe en esta Torre.");
  }
}
