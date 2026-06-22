import { createHash, randomBytes } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../../db/pool";
import { createSequentialId } from "../../utils/ids";
import { normalizeTextInput, repairPotentialMojibake } from "../../utils/textEncoding";
import { ensureResidentAccountSecurityTable } from "./residents";
import type { AccountSecurityRow, ConciergeRow } from "./types";

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function createVerificationCode() {
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

function hashVerificationCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function mapConciergeRow(concierge: ConciergeRow) {
  return {
    user_id: concierge.user_id,
    email: concierge.email,
    concierge_name: repairPotentialMojibake(concierge.concierge_name),
    email_verified: Boolean(concierge.email_verified),
    mfa_enabled: Boolean(concierge.totp_verified),
  };
}

async function fetchConciergeRows(whereClause = "", params: unknown[] = []) {
  const [concierges] = await pool.query<ConciergeRow[]>(
    `
      SELECT
        c.user_id,
        u.email,
        c.concierge_name,
        c.building_id,
        s.email_verified,
        s.totp_verified
      FROM Concierges c
      INNER JOIN Users u ON u.id = c.user_id
      LEFT JOIN ResidentAccountSecurity s ON s.user_id = c.user_id
      ${whereClause}
    `,
    params,
  );

  return concierges;
}

export async function createConciergeAccount(
  connection: PoolConnection,
  conciergeEmail: string,
  conciergeName: string,
  conciergePassword: string,
  buildingId: string,
) {
  await ensureResidentAccountSecurityTable();

  const normalizedEmail = normalizeTextInput(conciergeEmail).toLowerCase();
  const normalizedConciergeName = normalizeTextInput(conciergeName);

  const [existingUsers] = await connection.query<RowDataPacket[]>(
    `
      SELECT id
      FROM Users
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `,
    [normalizedEmail],
  );

  if (existingUsers.length > 0) {
    throw new Error("Este correo ya tiene una cuenta registrada.");
  }

  const verificationCode = createVerificationCode();
  const conciergeId = await createSequentialId(connection, {
    tableName: "Users",
    columnName: "id",
    prefix: "concierge",
    padLength: 3,
  });

  await connection.query(
    `
      INSERT INTO Users (id, email, role)
      VALUES (?, ?, 'concierge')
    `,
    [conciergeId, normalizedEmail],
  );

  await connection.query(
    `
      INSERT INTO Concierges (
        user_id,
        concierge_name,
        concierge_password_hash,
        building_id
      )
      VALUES (?, ?, ?, ?)
    `,
    [conciergeId, normalizedConciergeName, hashPassword(conciergePassword), buildingId],
  );

  await connection.query(
    `
      INSERT INTO ResidentAccountSecurity (
        user_id,
        email_verification_code_hash,
        email_verification_expires_at,
        email_verified,
        totp_verified
      )
      VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE), FALSE, FALSE)
    `,
    [conciergeId, hashVerificationCode(verificationCode)],
  );

  return { conciergeId, verificationCode };
}

export async function getConciergeById(conciergeId: string) {
  const concierges = await fetchConciergeRows("WHERE c.user_id = ? LIMIT 1", [conciergeId]);
  const concierge = concierges[0];
  return concierge ? mapConciergeRow(concierge) : null;
}

export async function getConciergeEmail(conciergeId: string) {
  const [users] = await pool.query<Array<RowDataPacket & { email: string }>>(
    `
      SELECT email
      FROM Users
      WHERE id = ?
        AND role = 'concierge'
      LIMIT 1
    `,
    [conciergeId],
  );

  return users[0]?.email ?? null;
}

export async function ensureConciergeBuilding(conciergeId: string, buildingId: string) {
  await pool.query(
    `
      UPDATE Concierges
      SET building_id = COALESCE(building_id, ?)
      WHERE user_id = ?
    `,
    [buildingId, conciergeId],
  );
}

export async function getConciergeSecurity(conciergeId: string) {
  await ensureResidentAccountSecurityTable();

  const [securityRows] = await pool.query<AccountSecurityRow[]>(
    `
      SELECT user_id, email_verification_code_hash, totp_secret
      FROM ResidentAccountSecurity
      WHERE user_id = ?
      LIMIT 1
    `,
    [conciergeId],
  );

  return securityRows[0] ?? null;
}

export async function getConciergeSecurityForMfa(conciergeId: string) {
  await ensureResidentAccountSecurityTable();

  const [securityRows] = await pool.query<AccountSecurityRow[]>(
    `
      SELECT user_id, email_verification_code_hash, totp_secret
      FROM ResidentAccountSecurity
      WHERE user_id = ?
        AND email_verified = TRUE
      LIMIT 1
    `,
    [conciergeId],
  );

  return securityRows[0] ?? null;
}

export async function markConciergeEmailVerified(conciergeId: string) {
  await pool.query(
    `
      UPDATE ResidentAccountSecurity
      SET
        email_verified = TRUE,
        email_verification_code_hash = NULL,
        email_verification_expires_at = NULL
      WHERE user_id = ?
    `,
    [conciergeId],
  );
}

export async function markConciergeMfaVerified(conciergeId: string) {
  await pool.query(
    `
      UPDATE ResidentAccountSecurity
      SET totp_verified = TRUE
      WHERE user_id = ?
    `,
    [conciergeId],
  );
}
