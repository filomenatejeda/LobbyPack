import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { ensureUtf8mb4, pool } from "./db/pool";
import { api } from "./routes/api";

const port = Number(process.env.PORT ?? 3000);

await pool.query("SELECT 1");
await ensureUtf8mb4();

const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",").map((item) => item.trim()) ?? true,
      credentials: true,
    }),
  )
  .get("/health", () => ({ status: "ok" }))
  .use(api)
  .listen(port);

console.log(`LobbyPack backend listening on port ${app.server?.port ?? port}`);
