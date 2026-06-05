import { createHash, randomBytes } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { createClient } from "@supabase/supabase-js";
import { pool } from "../../db/pool";
import {
  departmentAddressesMatch,
  normalizeDepartmentAddress,
} from "../../utils/departments";
import { createSequentialId } from "../../utils/ids";
import { normalizeTextInput, repairPotentialMojibake } from "../../utils/textEncoding";
import type { ResidentRow, ResidentSecurityRow } from "./types";

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function createVerificationCode() {
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

function hashVerificationCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function getSupabaseAdminClient() {
  const supabaseUrl = (
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    ""
  ).replace(/\/+$/, "");
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para eliminar usuarios en Supabase.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function findSupabaseUserIdByEmail(email: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw error;
    }

    const user = data.users.find(
      (item) => item.email?.trim().toLowerCase() === normalizedEmail,
    );

    if (user) {
      return user.id;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }

  throw new Error("No se pudo confirmar el usuario de Supabase para eliminarlo.");
}

export async function deleteSupabaseResidentUser(email: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  const supabaseUserId = await findSupabaseUserIdByEmail(email);

  if (!supabaseUserId) {
    return;
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);

  if (error) {
    throw error;
  }
}

export async function ensureResidentAccountSecurityTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ResidentAccountSecurity (
      user_id VARCHAR(64) PRIMARY KEY,
      email_verification_code_hash VARCHAR(64),
      email_verification_expires_at TIMESTAMP NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      totp_secret VARCHAR(64),
      totp_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `);
}

export async function createResidentAccount(
  connection: PoolConnection,
  residentEmail: string,
  residentName: string,
  residentPassword: string,
  departmentAddress: string,
  userPhoneNumber: string,
  buildingId: string,
) {
  await ensureResidentAccountSecurityTable();

  const normalizedEmail = normalizeTextInput(residentEmail).toLowerCase();
  const normalizedResidentName = normalizeTextInput(residentName);
  const normalizedDepartmentAddress = normalizeDepartmentAddress(departmentAddress);
  const normalizedPhoneNumber = normalizeTextInput(userPhoneNumber);

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
  const residentId = await createSequentialId(connection, {
    tableName: "Users",
    columnName: "id",
    prefix: "resident",
    padLength: 3,
  });

  await connection.query(
    `
      INSERT INTO Users (id, email, role)
      VALUES (?, ?, 'resident')
    `,
    [residentId, normalizedEmail],
  );

  await connection.query(
    `
      INSERT INTO Residents (
        user_id,
        resident_name,
        resident_password_hash,
        user_phone_number,
        department_address,
        building_id
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      residentId,
      normalizedResidentName,
      hashPassword(residentPassword),
      normalizedPhoneNumber || null,
      normalizedDepartmentAddress,
      buildingId,
    ],
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
    [residentId, hashVerificationCode(verificationCode)],
  );

  return { residentId, verificationCode };
}

function mapResidentRow(resident: ResidentRow) {
  return {
    user_id: resident.user_id,
    email: resident.email,
    resident_name: repairPotentialMojibake(resident.resident_name),
    user_phone_number: repairPotentialMojibake(resident.user_phone_number ?? ""),
    department_address: repairPotentialMojibake(resident.department_address),
    building_id: resident.building_id,
    email_verified: Boolean(resident.email_verified),
    mfa_enabled: Boolean(resident.totp_verified),
  };
}

async function fetchResidentRows(whereClause = "", params: unknown[] = []) {
  const [residents] = await pool.query<ResidentRow[]>(
    `
      SELECT
        r.user_id,
        u.email,
        r.resident_name,
        r.user_phone_number,
        r.department_address,
        r.building_id,
        s.email_verified,
        s.totp_verified
      FROM Residents r
      INNER JOIN Users u ON u.id = r.user_id
      LEFT JOIN ResidentAccountSecurity s ON s.user_id = r.user_id
      ${whereClause}
    `,
    params,
  );

  return residents;
}

export async function listResidentsByDepartment(departmentAddress: string, buildingId?: string) {
  await ensureResidentAccountSecurityTable();

  const normalizedDepartmentAddress = normalizeDepartmentAddress(departmentAddress);
  if (!normalizedDepartmentAddress) {
    return [];
  }

  const residents = await fetchResidentRows(
    buildingId
      ? "WHERE r.building_id = ? OR r.building_id IS NULL ORDER BY r.resident_name"
      : "ORDER BY r.resident_name",
    buildingId ? [buildingId] : [],
  );

  return residents
    .filter((resident) =>
      departmentAddressesMatch(resident.department_address, normalizedDepartmentAddress),
    )
    .map(mapResidentRow);
}

export async function getResidentById(residentId: string) {
  const residents = await fetchResidentRows("WHERE r.user_id = ? LIMIT 1", [residentId]);
  const resident = residents[0];
  return resident ? mapResidentRow(resident) : null;
}

export async function deleteResidentAccount(connection: PoolConnection, residentId: string) {
  await connection.query(
    `
      DELETE i
      FROM Issues i
      INNER JOIN Parcels p ON p.id = i.id_parcel
      WHERE p.id_resident = ?
    `,
    [residentId],
  );

  await connection.query(
    `
      DELETE FROM Parcels
      WHERE id_resident = ?
    `,
    [residentId],
  );

  await connection.query(
    `
      UPDATE Parcels
      SET claimed_by_user_id = NULL
      WHERE claimed_by_user_id = ?
    `,
    [residentId],
  );

  await connection.query(
    `
      DELETE FROM ResidentAccountSecurity
      WHERE user_id = ?
    `,
    [residentId],
  );

  await connection.query(
    `
      DELETE FROM Residents
      WHERE user_id = ?
    `,
    [residentId],
  );

  await connection.query(
    `
      DELETE FROM Users
      WHERE id = ?
        AND role = 'resident'
    `,
    [residentId],
  );
}

export async function getResidentSecurity(residentId: string) {
  await ensureResidentAccountSecurityTable();

  const [securityRows] = await pool.query<ResidentSecurityRow[]>(
    `
      SELECT user_id, email_verification_code_hash, totp_secret
      FROM ResidentAccountSecurity
      WHERE user_id = ?
      LIMIT 1
    `,
    [residentId],
  );

  return securityRows[0] ?? null;
}

export async function getResidentSecurityForMfa(residentId: string) {
  await ensureResidentAccountSecurityTable();

  const [securityRows] = await pool.query<ResidentSecurityRow[]>(
    `
      SELECT user_id, email_verification_code_hash, totp_secret
      FROM ResidentAccountSecurity
      WHERE user_id = ?
        AND email_verified = TRUE
      LIMIT 1
    `,
    [residentId],
  );

  return securityRows[0] ?? null;
}

export async function getResidentEmail(residentId: string) {
  const [users] = await pool.query<Array<RowDataPacket & { email: string }>>(
    `
      SELECT email
      FROM Users
      WHERE id = ?
      LIMIT 1
    `,
    [residentId],
  );

  return users[0]?.email ?? null;
}

export async function markResidentEmailVerified(residentId: string) {
  await pool.query(
    `
      UPDATE ResidentAccountSecurity
      SET
        email_verified = TRUE,
        email_verification_code_hash = NULL,
        email_verification_expires_at = NULL
      WHERE user_id = ?
    `,
    [residentId],
  );
}

export async function markResidentMfaVerified(residentId: string) {
  await pool.query(
    `
      UPDATE ResidentAccountSecurity
      SET totp_verified = TRUE
      WHERE user_id = ?
    `,
    [residentId],
  );
}
