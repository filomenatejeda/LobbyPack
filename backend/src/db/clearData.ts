import "../env";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "./pool";
import { ensureDatabaseSchema } from "./schema";
import { ensureDailySummaryReportTable } from "../utils/dailySummary";
import { ensureResidentAccountSecurityTable } from "../routes/shared/residents";
import {
  ensureBuildingCommunityColumns,
  ensureConciergeCommunityColumns,
  ensureIssueCreatorColumn,
  ensureParcelQrSecurityColumns,
  ensureResidentCommunityColumns,
  ensureUtf8mb4,
} from "./pool";

const tablesToClear = [
  "DailySummaryReports",
  "Issues",
  "Parcels",
  "Businesses",
  "ResidentAccountSecurity",
  "Apartments",
  "Floors",
  "Towers",
  "BuildingPreferences",
  "Buildings",
  "CommunityRegistrations",
  "Residents",
  "Concierges",
  "Admins",
  "Users",
];

if (process.env.CONFIRM_CLEAR_DATABASE !== "YES") {
  throw new Error("Set CONFIRM_CLEAR_DATABASE=YES to clear LobbyPack data.");
}

await ensureDatabaseSchema();
await ensureUtf8mb4();
await ensureBuildingCommunityColumns();
await ensureResidentCommunityColumns();
await ensureConciergeCommunityColumns();
await ensureResidentAccountSecurityTable();
await ensureParcelQrSecurityColumns();
await ensureIssueCreatorColumn();
await ensureDailySummaryReportTable();

const [existingTables] = await pool.query<Array<RowDataPacket & { TABLE_NAME: string }>>(
  `
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
  `,
);

const existingTableNames = new Set(existingTables.map((table) => table.TABLE_NAME));
const tablesCleared = tablesToClear.filter((tableName) => existingTableNames.has(tableName));

await pool.query("SET FOREIGN_KEY_CHECKS = 0");

try {
  for (const tableName of tablesCleared) {
    await pool.query(`TRUNCATE TABLE \`${tableName}\``);
  }
} finally {
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  await pool.end();
}

console.log(`Cleared ${tablesCleared.length} LobbyPack tables: ${tablesCleared.join(", ")}`);
