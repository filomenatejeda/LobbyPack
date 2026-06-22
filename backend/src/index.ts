import "./env";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import {
  ensureBuildingCommunityColumns,
  ensureConciergeCommunityColumns,
  ensureResidentCommunityColumns,
  ensureUtf8mb4,
  ensureParcelQrSecurityColumns,
  ensureIssueCreatorColumn,
  pool,
  repairIssueEncoding,
  repairParcelEncoding,
  repairParcelWithdrawalCodes,
} from "./db/pool";
import { api } from "./routes/api";
import { ensureResidentAccountSecurityTable } from "./routes/shared/residents";
import {
  ensureDailySummaryReportTable,
  startDailySummaryScheduler,
} from "./utils/dailySummary";
import { ensureDatabaseSchema } from "./db/schema";

const port = Number(process.env.PORT ?? 3000);
const hostname = "0.0.0.0";

await pool.query("SELECT 1");
await ensureDatabaseSchema();
await ensureUtf8mb4();
await ensureBuildingCommunityColumns();
await ensureResidentCommunityColumns();
await ensureConciergeCommunityColumns();
await ensureResidentAccountSecurityTable();
await ensureParcelQrSecurityColumns();
await ensureIssueCreatorColumn();
await ensureDailySummaryReportTable();
await repairIssueEncoding();
await repairParcelEncoding();
await repairParcelWithdrawalCodes();

const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",").map((item) => item.trim()) ?? true,
      credentials: true,
    }),
  )
  .get("/health", () => ({ status: "ok" }))
  .use(api)
  .listen({ port, hostname });

startDailySummaryScheduler();

console.log(`LobbyPack backend listening on ${hostname}:${app.server?.port ?? port}`);
