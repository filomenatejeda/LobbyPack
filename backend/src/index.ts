import "./env";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

const port = Number(process.env.PORT ?? 3000);
const hostname = "0.0.0.0";

let databaseStatus: "starting" | "ready" | "error" = "starting";
let databaseError: string | null = null;

const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",").map((item) => item.trim()) ?? true,
      credentials: true,
    }),
  )
  .get("/health", () => ({ status: "ok", database: databaseStatus }))
  .get("/ready", ({ set }) => {
    if (databaseStatus !== "ready") {
      set.status = 503;
    }

    return {
      status: databaseStatus === "ready" ? "ready" : "not_ready",
      database: databaseStatus,
      error: databaseError,
    };
  })
  .listen({ port, hostname });

console.log(`LobbyPack backend listening on ${hostname}:${app.server?.port ?? port}`);

async function initializeDatabase() {
  try {
    const {
      ensureBuildingCommunityColumns,
      ensureConciergeCommunityColumns,
      ensureIssueCreatorColumn,
      ensureParcelQrSecurityColumns,
      ensureResidentCommunityColumns,
      ensureUtf8mb4,
      pool,
      repairIssueEncoding,
      repairParcelEncoding,
      repairParcelWithdrawalCodes,
    } = await import("./db/pool");
    const { ensureDatabaseSchema } = await import("./db/schema");
    const { ensureResidentAccountSecurityTable } = await import("./routes/shared/residents");
    const { api } = await import("./routes/api");
    const { ensureDailySummaryReportTable, startDailySummaryScheduler } = await import(
      "./utils/dailySummary"
    );

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

    app.use(api);
    startDailySummaryScheduler();

    databaseStatus = "ready";
    databaseError = null;
    console.log("LobbyPack database initialized");
  } catch (error) {
    databaseStatus = "error";
    databaseError = error instanceof Error ? error.message : String(error);
    console.error("LobbyPack database initialization failed", error);
  }
}

void initializeDatabase();
