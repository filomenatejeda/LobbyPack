import "./env";
import { fileURLToPath } from "node:url";
import { dirname, normalize, resolve, sep } from "node:path";

const port = Number(process.env.PORT ?? 3000);
const hostname = "0.0.0.0";
const currentDir = dirname(fileURLToPath(import.meta.url));
const frontendDistPaths = [
  resolve(currentDir, "../../frontend/dist"),
  resolve(currentDir, "../public"),
];

let databaseStatus: "starting" | "ready" | "error" = "starting";
let databaseError: string | null = null;
let apiApp: { handle(request: Request): Response | Promise<Response> } | null = null;

const server = Bun.serve({
  port,
  hostname,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", database: databaseStatus });
    }

    if (url.pathname === "/ready") {
      return Response.json(
        {
          status: databaseStatus === "ready" ? "ready" : "not_ready",
          database: databaseStatus,
          error: databaseError,
        },
        { status: databaseStatus === "ready" ? 200 : 503 },
      );
    }

    if (url.pathname === "/config.js") {
      return serveRuntimeConfig();
    }

    if (url.pathname.startsWith("/api/") && apiApp) {
      return apiApp.handle(request);
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        {
          error: "API is starting",
          database: databaseStatus,
          details: databaseError,
        },
        { status: 503 },
      );
    }

    return serveFrontend(url.pathname);
  },
});

console.log(`LobbyPack backend listening on ${hostname}:${server.port}`);

async function serveFrontend(pathname: string) {
  const frontendDistPath = await findFrontendDistPath();

  if (!frontendDistPath) {
    return Response.json(
      {
        error: "Frontend build not found",
        expectedPaths: frontendDistPaths,
      },
      { status: 503 },
    );
  }

  const indexFile = Bun.file(resolve(frontendDistPath, "index.html"));
  const decodedPath = decodeURIComponent(pathname);
  const relativePath = normalize(decodedPath).replace(/^[/\\]+/, "");

  if (relativePath.startsWith("..") || relativePath.includes(`..${sep}`)) {
    return new Response("Bad request", { status: 400 });
  }

  if (relativePath && relativePath !== ".") {
    const assetFile = Bun.file(resolve(frontendDistPath, relativePath));

    if (await assetFile.exists()) {
      return new Response(assetFile, {
        headers: getStaticHeaders(relativePath),
      });
    }
  }

  return new Response(indexFile, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function getStaticHeaders(relativePath: string) {
  const normalizedPath = relativePath.replaceAll("\\", "/");
  const extension = normalizedPath.split(".").pop()?.toLowerCase();
  const contentType = getContentType(extension);
  const isFingerprintedAsset = normalizedPath.startsWith("assets/");

  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    "Cache-Control": isFingerprintedAsset
      ? "public, max-age=31536000, immutable"
      : "public, max-age=3600",
  };
}

function getContentType(extension?: string) {
  switch (extension) {
    case "css":
      return "text/css; charset=utf-8";
    case "js":
      return "application/javascript; charset=utf-8";
    case "png":
      return "image/png";
    case "svg":
      return "image/svg+xml";
    case "ico":
      return "image/x-icon";
    case "webp":
      return "image/webp";
    case "html":
      return "text/html; charset=utf-8";
    default:
      return undefined;
  }
}

async function findFrontendDistPath() {
  for (const frontendDistPath of frontendDistPaths) {
    if (await Bun.file(resolve(frontendDistPath, "index.html")).exists()) {
      return frontendDistPath;
    }
  }

  return null;
}

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
    const { cors } = await import("@elysiajs/cors");
    const { Elysia } = await import("elysia");
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

    apiApp = new Elysia()
      .use(
        cors({
          origin: process.env.CORS_ORIGIN?.split(",").map((item) => item.trim()) ?? true,
          credentials: true,
        }),
      )
      .use(api);
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

function serveRuntimeConfig() {
  const config = {
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL,
    VITE_AUTH_REDIRECT_URL: process.env.VITE_AUTH_REDIRECT_URL,
    VITE_GEOAPIFY_API_KEY: process.env.VITE_GEOAPIFY_API_KEY ?? process.env.GEOAPIFY_API_KEY,
    VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
      process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
      process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL,
  };

  return new Response(`window.__LOBBYPACK_CONFIG__ = ${JSON.stringify(config)};`, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/javascript; charset=utf-8",
    },
  });
}
