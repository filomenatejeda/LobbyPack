import type { PoolConnection, RowDataPacket } from "mysql2/promise";

type SequentialIdOptions = {
  tableName: string;
  columnName: string;
  prefix: string;
  padLength: number;
};

type LockRow = RowDataPacket & {
  acquired: number;
};

type IdRow = RowDataPacket & {
  id: string;
};

export async function createSequentialId(
  connection: PoolConnection,
  { tableName, columnName, prefix, padLength }: SequentialIdOptions,
) {
  const lockName = `sequence:${tableName}:${columnName}:${prefix}`;
  const [lockRows] = await connection.query<LockRow[]>("SELECT GET_LOCK(?, 10) AS acquired", [lockName]);

  if (lockRows[0]?.acquired !== 1) {
    throw new Error(`Could not acquire ID lock for ${prefix}`);
  }

  try {
    const [rows] = await connection.query<IdRow[]>(
      `
        SELECT ${columnName} AS id
        FROM ${tableName}
        WHERE ${columnName} LIKE ?
        ORDER BY ${columnName} DESC
        LIMIT 1
      `,
      [`${prefix}-%`],
    );

    const currentId = rows[0]?.id ?? "";
    const currentSequence = Number.parseInt(currentId.slice(prefix.length + 1), 10);
    const nextSequence = Number.isNaN(currentSequence) ? 1 : currentSequence + 1;

    return `${prefix}-${String(nextSequence).padStart(padLength, "0")}`;
  } finally {
    await connection.query("SELECT RELEASE_LOCK(?)", [lockName]);
  }
}

export function createResidentEmail(resident_name: string) {
  const normalizedName = resident_name
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, ".");

  return `${normalizedName || "resident"}.${Date.now()}@lobbypack.demo`;
}
