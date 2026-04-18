import mysql, { type RowDataPacket } from "mysql2/promise";

const requiredEnv = [
  "MYSQL_HOST",
  "MYSQL_PORT",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
  "MYSQL_DB",
] as const;

for (const envName of requiredEnv) {
  if (!process.env[envName]) {
    throw new Error(`Missing required environment variable: ${envName}`);
  }
}

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

export async function ensureUtf8mb4() {
  const databaseName = process.env.MYSQL_DB;

  if (!databaseName) {
    throw new Error("Missing required environment variable: MYSQL_DB");
  }

  await pool.query("SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci");
  await pool.query(
    `ALTER DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  );

  const [tables] = await pool.query<Array<RowDataPacket & { TABLE_NAME: string }>>(
    `
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_TYPE = 'BASE TABLE'
    `,
    [databaseName],
  );

  for (const { TABLE_NAME } of tables) {
    await pool.query(
      `ALTER TABLE \`${TABLE_NAME}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
  }
}
