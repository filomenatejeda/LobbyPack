import { Elysia, t } from "elysia";
import { createHash, createHmac, randomBytes } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError, requireAppRole, type AuthSession } from "../auth/session";
import { pool } from "../db/pool";
import { createResidentEmail, createSequentialCode, createSequentialId } from "../utils/ids";
import {
  departmentAddressesMatch,
  normalizeDepartmentAddress,
} from "../utils/departments";
import {
  buildParcelQrValue,
  createParcelQrToken,
  parseParcelQrValue,
} from "../utils/parcels";
import { normalizeTextInput, repairPotentialMojibake } from "../utils/textEncoding";

const DEMO_CONCIERGE_USER_ID = "concierge-demo";
const BUILDING_ID = "building-main";

type ParcelRow = RowDataPacket & {
  id: string;
  withdrawal_code: string | null;
  qr_code_url: string | null;
  qr_token?: string | null;
  parcel_status: "pending" | "claimed";
  parcel_description: string | null;
  is_urgent: number;
  pending_date: string;
  claimed_date: string | null;
  claimed_by_user_id?: string | null;
  id_concierge: string;
  id_resident: string;
  id_business: string;
  resident_name: string;
  user_phone_number: string | null;
  department_address: string;
  concierge_name: string;
  business_name: string;
};

type IssueRow = RowDataPacket & {
  id: string;
  id_parcel: string;
  issue_status: "open" | "under_review" | "resolved";
  issue_description: string;
  created_at: string;
  resident_name: string;
  parcel_status: "pending" | "claimed";
  department_address: string;
  business_name: string;
};

type TeamRow = RowDataPacket & {
  user_id: string;
  role: "admin" | "concierge" | "resident";
  team_name: string;
  team_status: string;
};

type ResidentRow = RowDataPacket & {
  user_id: string;
  email: string;
  resident_name: string;
  user_phone_number: string | null;
  department_address: string;
  email_verified: number | null;
  totp_verified: number | null;
};

type ResidentSecurityRow = RowDataPacket & {
  user_id: string;
  email_verification_code_hash: string | null;
  totp_secret: string | null;
};

type BuildingRow = RowDataPacket & {
  id: string;
  building_name: string;
  community_type: string | null;
  contact_email: string;
  reception_hours: string;
  address_line: string;
  access_password: string;
  is_active: number;
};

type CommunityRegistrationRow = RowDataPacket & {
  id: number;
  community_name: string;
  community_type: string;
  community_country: string;
  community_location: string;
  community_address: string;
  admin_email: string;
};

type SettingsContext = {
  buildingId: string;
  communityRegistration?: CommunityRegistrationRow;
};

type PreferenceRow = RowDataPacket & {
  package_notifications: number;
  daily_summary: number;
  qr_access: number;
};

type TowerRow = RowDataPacket & {
  tower_id: number;
  tower_name: string;
  display_order: number;
  floor_number: number;
  apartment_name: string;
  apartment_display_order: number;
};

type ParcelClaimRow = RowDataPacket & {
  id: string;
  qr_token: string | null;
  parcel_status: "pending" | "claimed";
  delivery_department_address: string | null;
};

const parcelPayloadSchema = t.Object({
  department_address: t.String({ minLength: 1 }),
  resident_name: t.String({ minLength: 1 }),
  user_phone_number: t.String(),
  business_name: t.String({ minLength: 1 }),
  concierge_name: t.String({ minLength: 1 }),
  parcel_description: t.Optional(t.String()),
  is_urgent: t.Optional(t.Boolean()),
});

const generalSettingsSchema = t.Object({
  building_name: t.String({ minLength: 1 }),
  community_type: t.Optional(t.String()),
  contact_email: t.String({ minLength: 1 }),
  reception_hours: t.String({ minLength: 1 }),
  address_line: t.String({ minLength: 1 }),
  access_password: t.String(),
  is_active: t.Boolean(),
});

const communityRegistrationSchema = t.Object({
  community_name: t.String({ minLength: 1 }),
  community_type: t.String({ minLength: 1 }),
  community_country: t.String({ minLength: 1 }),
  community_location: t.String({ minLength: 1 }),
  community_address: t.String({ minLength: 1 }),
  admin_first_name: t.String({ minLength: 1 }),
  admin_last_name: t.String({ minLength: 1 }),
  admin_email: t.String({ minLength: 1 }),
});

const communityAddressAvailabilitySchema = t.Object({
  community_country: t.String({ minLength: 1 }),
  community_location: t.String({ minLength: 1 }),
  community_address: t.String({ minLength: 1 }),
});

const adminEmailSchema = t.Object({
  admin_email: t.String({ minLength: 1 }),
});

const residentSettingsSchema = t.Object({
  resident_email: t.String({ minLength: 1 }),
  resident_name: t.String({ minLength: 1 }),
  resident_password: t.String({ minLength: 8 }),
  user_phone_number: t.String(),
  department_address: t.String({ minLength: 1 }),
});

const residentEmailVerificationSchema = t.Object({
  verification_code: t.String({ minLength: 6 }),
});

const residentMfaVerificationSchema = t.Object({
  mfa_code: t.String({ minLength: 6 }),
});

const residentParcelQrSchema = t.Object({
  qr_value: t.String({ minLength: 1 }),
});

const preferenceSettingsSchema = t.Object({
  package_notifications: t.Boolean(),
  daily_summary: t.Boolean(),
  qr_access: t.Boolean(),
});

const issueStatusSchema = t.Object({
  issue_status: t.Union([
    t.Literal("open"),
    t.Literal("under_review"),
    t.Literal("resolved"),
  ]),
});

const towersSchema = t.Array(
  t.Object({
    id: t.Number(),
    tower_name: t.String({ minLength: 1 }),
    selected_floor: t.Number(),
    is_editing: t.Boolean(),
    floors: t.Array(
      t.Object({
        floor_number: t.Number(),
        apartments: t.Array(t.String({ minLength: 1 })),
      }),
    ),
  }),
);

function createAddressFingerprint(country: string, location: string, address: string) {
  return [country, location, address]
    .map((value) =>
      normalizeTextInput(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .replace(/\s+/g, " "),
    )
    .join("|");
}

async function ensureCommunityRegistrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS CommunityRegistrations (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      community_name VARCHAR(255) NOT NULL,
      community_type VARCHAR(100) NOT NULL DEFAULT 'Otro',
      community_country VARCHAR(100) NOT NULL,
      community_location VARCHAR(255) NOT NULL,
      community_address VARCHAR(255) NOT NULL,
      address_fingerprint VARCHAR(512) UNIQUE NOT NULL,
      admin_first_name VARCHAR(100) NOT NULL,
      admin_last_name VARCHAR(100) NOT NULL,
      admin_email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
  `);
}

async function ensureResidentAccountSecurityTable() {
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

async function getOrCreateBusiness(connection: PoolConnection, business_name: string) {
  const normalizedBusinessName = normalizeTextInput(business_name);

  const [existingBusinesses] = await connection.query<RowDataPacket[]>(
    `
      SELECT id
      FROM Businesses
      WHERE LOWER(business_name) = LOWER(?)
      LIMIT 1
    `,
    [normalizedBusinessName],
  );

  if (existingBusinesses.length > 0) {
    return String(existingBusinesses[0].id);
  }

  const businessId = await createSequentialId(connection, {
    tableName: "Businesses",
    columnName: "id",
    prefix: "business",
    padLength: 3,
  });

  await connection.query(
    `
      INSERT INTO Businesses (id, business_name)
      VALUES (?, ?)
    `,
    [businessId, normalizedBusinessName],
  );

  return businessId;
}

async function getOrCreateResident(
  connection: PoolConnection,
  resident_name: string,
  department_address: string,
  user_phone_number: string,
) {
  const normalizedResidentName = normalizeTextInput(resident_name);
  const normalizedDepartmentAddress = normalizeDepartmentAddress(department_address);
  const normalizedPhoneNumber = normalizeTextInput(user_phone_number);

  const [existingResidents] = await connection.query<RowDataPacket[]>(
    `
      SELECT user_id
      FROM Residents
      WHERE LOWER(resident_name) = LOWER(?)
        AND LOWER(department_address) = LOWER(?)
      LIMIT 1
    `,
    [normalizedResidentName, normalizedDepartmentAddress],
  );

  if (existingResidents.length > 0) {
    const residentId = String(existingResidents[0].user_id);

    await connection.query(
      `
        UPDATE Residents
        SET resident_name = ?, department_address = ?, user_phone_number = ?
        WHERE user_id = ?
      `,
      [
        normalizedResidentName,
        normalizedDepartmentAddress,
        normalizedPhoneNumber || null,
        residentId,
      ],
    );

    return residentId;
  }

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
    [residentId, createResidentEmail(normalizedResidentName)],
  );

  await connection.query(
    `
      INSERT INTO Residents (
        user_id,
        resident_name,
        resident_password_hash,
        user_phone_number,
        department_address
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      residentId,
      normalizedResidentName,
      "demo-resident-password",
      normalizedPhoneNumber || null,
      normalizedDepartmentAddress,
    ],
  );

  return residentId;
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function createVerificationCode() {
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

function hashVerificationCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function toBase32(buffer: Buffer) {
  let bits = "";
  let output = "";

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }

  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, "0");
    output += base32Alphabet[Number.parseInt(chunk, 2)];
  }

  return output;
}

function fromBase32(value: string) {
  const cleanValue = value.replaceAll("=", "").replaceAll(/\s/g, "").toUpperCase();
  let bits = "";
  const bytes: number[] = [];

  for (const character of cleanValue) {
    const index = base32Alphabet.indexOf(character);
    if (index === -1) {
      continue;
    }
    bits += index.toString(2).padStart(5, "0");
  }

  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function createTotpSecret() {
  return toBase32(randomBytes(20));
}

function createTotpCode(secret: string, step = Math.floor(Date.now() / 30_000)) {
  const key = fromBase32(secret);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));

  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, "0");
}

function verifyTotpCode(secret: string, code: string) {
  const cleanCode = code.replaceAll(/\D/g, "");
  const currentStep = Math.floor(Date.now() / 30_000);

  return [-1, 0, 1].some((window) => createTotpCode(secret, currentStep + window) === cleanCode);
}

function createTotpUri(email: string, secret: string) {
  const issuer = "LobbyPack";
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });

  return `otpauth://totp/${label}?${params.toString()}`;
}

async function createResidentAccount(
  connection: PoolConnection,
  resident_email: string,
  resident_name: string,
  resident_password: string,
  department_address: string,
  user_phone_number: string,
) {
  await ensureResidentAccountSecurityTable();

  const normalizedEmail = normalizeTextInput(resident_email).toLowerCase();
  const normalizedResidentName = normalizeTextInput(resident_name);
  const normalizedDepartmentAddress = normalizeDepartmentAddress(department_address);
  const normalizedPhoneNumber = normalizeTextInput(user_phone_number);

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
        department_address
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      residentId,
      normalizedResidentName,
      hashPassword(resident_password),
      normalizedPhoneNumber || null,
      normalizedDepartmentAddress,
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

async function ensureAdminAccountForCommunityRegistration(
  admin_email: string,
  admin_first_name: string,
  admin_last_name: string,
) {
  const connection = await pool.getConnection();
  const normalizedAdminEmail = normalizeTextInput(admin_email).toLowerCase();
  const adminName = `${normalizeTextInput(admin_first_name)} ${normalizeTextInput(admin_last_name)}`.trim();

  try {
    await connection.beginTransaction();

    const [existingUsers] = await connection.query<
      Array<RowDataPacket & { id: string; role: "admin" | "concierge" | "resident" }>
    >(
      `
        SELECT id, role
        FROM Users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
        FOR UPDATE
      `,
      [normalizedAdminEmail],
    );

    const existingUser = existingUsers[0];

    if (existingUser) {
      if (existingUser.role !== "admin") {
        throw new Error("Este correo ya existe con otro rol en LobbyPack.");
      }

      await connection.query(
        `
          INSERT INTO Admins (user_id, admin_name, admin_password_hash)
          VALUES (?, ?, NULL)
          ON DUPLICATE KEY UPDATE admin_name = VALUES(admin_name)
        `,
        [existingUser.id, adminName || normalizedAdminEmail],
      );

      await connection.commit();
      return existingUser.id;
    }

    const adminId = await createSequentialId(connection, {
      tableName: "Users",
      columnName: "id",
      prefix: "admin",
      padLength: 3,
    });

    await connection.query(
      `
        INSERT INTO Users (id, email, role)
        VALUES (?, ?, 'admin')
      `,
      [adminId, normalizedAdminEmail],
    );

    await connection.query(
      `
        INSERT INTO Admins (user_id, admin_name, admin_password_hash)
        VALUES (?, ?, NULL)
      `,
      [adminId, adminName || normalizedAdminEmail],
    );

    await connection.commit();
    return adminId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getConciergeUserId(connection: PoolConnection, concierge_name: string) {
  const normalizedConciergeName = normalizeTextInput(concierge_name);

  const [concierges] = await connection.query<RowDataPacket[]>(
    `
      SELECT c.user_id
      FROM Concierges c
      WHERE LOWER(c.concierge_name) = LOWER(?)
      LIMIT 1
    `,
    [normalizedConciergeName],
  );

  return concierges.length > 0 ? String(concierges[0].user_id) : DEMO_CONCIERGE_USER_ID;
}

function mapParcelRow(row: ParcelRow) {
  return {
    id: row.id,
    withdrawal_code: row.withdrawal_code,
    qr_code_url: row.qr_code_url,
    parcel_status: row.parcel_status,
    parcel_description: repairPotentialMojibake(row.parcel_description ?? ""),
    is_urgent: Boolean(row.is_urgent),
    pending_date: row.pending_date,
    claimed_date: row.claimed_date,
    id_concierge: row.id_concierge,
    id_resident: row.id_resident,
    id_business: row.id_business,
    resident_name: repairPotentialMojibake(row.resident_name),
    user_phone_number: repairPotentialMojibake(row.user_phone_number ?? ""),
    department_address: repairPotentialMojibake(row.department_address),
    concierge_name: repairPotentialMojibake(row.concierge_name),
    business_name: repairPotentialMojibake(row.business_name),
  };
}

async function listParcels(
  parcel_status: "pending" | "claimed",
  options?: { departmentAddress?: string },
) {
  const [rows] = await pool.query<ParcelRow[]>(
    `
      SELECT
        p.id,
        p.withdrawal_code,
        p.qr_code_url,
        p.parcel_status,
        p.parcel_description,
        p.is_urgent,
        p.pending_date,
        p.claimed_date,
        p.claimed_by_user_id,
        p.id_concierge,
        p.id_resident,
        p.id_business,
        r.resident_name,
        r.user_phone_number,
        COALESCE(p.delivery_department_address, r.department_address) AS department_address,
        c.concierge_name,
        b.business_name
      FROM Parcels p
      INNER JOIN Residents r ON r.user_id = p.id_resident
      INNER JOIN Concierges c ON c.user_id = p.id_concierge
      INNER JOIN Businesses b ON b.id = p.id_business
      WHERE p.parcel_status = ?
      ORDER BY
        CASE
          WHEN p.parcel_status = 'claimed' THEN p.claimed_date
          ELSE p.pending_date
        END DESC,
        p.pending_date DESC
    `,
    [parcel_status],
  );

  const mappedRows = rows.map(mapParcelRow);

  if (!options?.departmentAddress) {
    return mappedRows;
  }

  return mappedRows.filter((row) =>
    departmentAddressesMatch(row.department_address, options.departmentAddress ?? ""),
  );
}

async function getParcelById(parcelId: string) {
  const [parcels] = await pool.query<ParcelRow[]>(
    `
      SELECT
        p.id,
        p.withdrawal_code,
        p.qr_code_url,
        p.qr_token,
        p.parcel_status,
        p.parcel_description,
        p.is_urgent,
        p.pending_date,
        p.claimed_date,
        p.claimed_by_user_id,
        p.id_concierge,
        p.id_resident,
        p.id_business,
        r.resident_name,
        r.user_phone_number,
        COALESCE(p.delivery_department_address, r.department_address) AS department_address,
        c.concierge_name,
        b.business_name
      FROM Parcels p
      INNER JOIN Residents r ON r.user_id = p.id_resident
      INNER JOIN Concierges c ON c.user_id = p.id_concierge
      INNER JOIN Businesses b ON b.id = p.id_business
      WHERE p.id = ?
      LIMIT 1
    `,
    [parcelId],
  );

  const parcel = parcels[0];
  return parcel ? mapParcelRow(parcel) : null;
}

function buildDashboardCurrentUser(session: AuthSession) {
  return {
    user_id: session.userId,
    email: session.email,
    role: session.role,
    display_name: session.residentName ?? session.email,
    department_address: session.departmentAddress ?? null,
  };
}

function parseParcelClaimPayload(qrValue: string) {
  const parsed = parseParcelQrValue(qrValue);

  if (!parsed) {
    throw new AuthError(400, "El QR escaneado no tiene un formato valido.");
  }

  return parsed;
}

async function assertResidentParcelAccess(session: AuthSession, qrValue: string) {
  if (!session.departmentAddress) {
    throw new AuthError(403, "Tu cuenta residente no tiene un departamento asociado.");
  }

  const parsed = parseParcelClaimPayload(qrValue);
  const [rows] = await pool.query<ParcelClaimRow[]>(
    `
      SELECT
        id,
        qr_token,
        parcel_status,
        delivery_department_address
      FROM Parcels
      WHERE id = ?
      LIMIT 1
    `,
    [parsed.parcelId],
  );

  const parcel = rows[0];

  if (!parcel || !parcel.qr_token || parcel.qr_token !== parsed.qrToken) {
    throw new AuthError(404, "No se encontro un paquete asociado a ese QR.");
  }

  if (parcel.parcel_status !== "pending") {
    throw new AuthError(409, "Ese paquete ya fue retirado o no esta disponible para entrega.");
  }

  if (
    !departmentAddressesMatch(parcel.delivery_department_address ?? "", session.departmentAddress)
  ) {
    throw new AuthError(403, "Ese QR no corresponde al departamento de tu cuenta.");
  }

  const parcelData = await getParcelById(parcel.id);

  if (!parcelData) {
    throw new AuthError(404, "No se encontro el paquete asociado a ese QR.");
  }

  return {
    parcelId: parcel.id,
    qrToken: parsed.qrToken,
    parcel: parcelData,
  };
}

async function listIssues() {
  const [rows] = await pool.query<IssueRow[]>(
    `
      SELECT
        i.id,
        i.id_parcel,
        i.issue_status,
        i.issue_description,
        i.created_at,
        r.resident_name,
        p.parcel_status,
        r.department_address,
        b.business_name
      FROM Issues i
      INNER JOIN Parcels p ON p.id = i.id_parcel
      INNER JOIN Residents r ON r.user_id = p.id_resident
      INNER JOIN Businesses b ON b.id = p.id_business
      ORDER BY i.created_at DESC
    `,
  );

  return rows.map((row) => ({
    ...row,
    issue_description: repairPotentialMojibake(row.issue_description),
    resident_name: repairPotentialMojibake(row.resident_name),
    department_address: repairPotentialMojibake(row.department_address),
    business_name: repairPotentialMojibake(row.business_name),
  }));
}

async function getSettingsPayload(adminEmail?: string) {
  const { buildingId, communityRegistration } = await getSettingsContext(adminEmail);
  const [buildings] = await pool.query<BuildingRow[]>(
    `
      SELECT *
      FROM Buildings
      WHERE id = ?
      LIMIT 1
    `,
    [buildingId],
  );

  const [preferences] = await pool.query<PreferenceRow[]>(
    `
      SELECT package_notifications, daily_summary, qr_access
      FROM BuildingPreferences
      WHERE building_id = ?
      LIMIT 1
    `,
    [buildingId],
  );

  const [team] = await pool.query<TeamRow[]>(
    `
      SELECT
        u.id AS user_id,
        u.role,
        COALESCE(c.concierge_name, a.admin_name, r.resident_name, u.email) AS team_name,
        CASE
          WHEN u.role = 'admin' THEN 'Admin'
          ELSE 'Activo'
        END AS team_status
      FROM Users u
      LEFT JOIN Concierges c ON c.user_id = u.id
      LEFT JOIN Admins a ON a.user_id = u.id
      LEFT JOIN Residents r ON r.user_id = u.id
      WHERE u.role IN ('admin', 'concierge')
      ORDER BY FIELD(u.role, 'admin', 'concierge'), team_name
    `,
  );

  const [towerRows] = await pool.query<TowerRow[]>(
    `
      SELECT
        t.id AS tower_id,
        t.tower_name,
        t.display_order,
        f.floor_number,
        a.apartment_name,
        a.display_order AS apartment_display_order
      FROM Towers t
      LEFT JOIN Floors f ON f.tower_id = t.id
      LEFT JOIN Apartments a ON a.floor_id = f.id
      WHERE t.building_id = ?
      ORDER BY t.display_order, f.floor_number, a.display_order
    `,
    [buildingId],
  );

  const building = buildings[0];
  const preference = preferences[0] ?? {
    package_notifications: 1,
    daily_summary: 1,
    qr_access: 1,
  };
  const towers = new Map<
    number,
    {
      id: number;
      tower_name: string;
      selected_floor: number;
      is_editing: boolean;
      floors: Array<{ floor_number: number; apartments: string[] }>;
    }
  >();

  for (const row of towerRows) {
    if (!towers.has(row.tower_id)) {
      towers.set(row.tower_id, {
        id: row.tower_id,
        tower_name: row.tower_name,
        selected_floor: 1,
        is_editing: false,
        floors: [],
      });
    }

    const tower = towers.get(row.tower_id);
    if (!tower || row.floor_number == null) {
      continue;
    }

    let floor = tower.floors.find((item) => item.floor_number === row.floor_number);
    if (!floor) {
      floor = { floor_number: row.floor_number, apartments: [] };
      tower.floors.push(floor);
    }

    if (row.apartment_name) {
      floor.apartments.push(row.apartment_name);
    }
  }

  return {
    general_settings: {
      building_name: building.building_name,
      community_type: communityRegistration?.community_type ?? building.community_type ?? "Edificio",
      contact_email: building.contact_email,
      reception_hours: building.reception_hours,
      address_line: building.address_line,
      access_password: building.access_password,
      is_active: Boolean(building.is_active),
    },
    preference_settings: {
      package_notifications: Boolean(preference.package_notifications),
      daily_summary: Boolean(preference.daily_summary),
      qr_access: Boolean(preference.qr_access),
    },
    towers: Array.from(towers.values()),
    team: team.map((row) => ({
      user_id: row.user_id,
      role: row.role,
      team_name: row.team_name,
      team_status: row.team_status,
    })),
  };
}

async function getSettingsContext(adminEmail?: string): Promise<SettingsContext> {
  const normalizedAdminEmail = adminEmail ? normalizeTextInput(adminEmail).toLowerCase() : "";
  const [communityRegistrations] = normalizedAdminEmail
    ? await pool.query<CommunityRegistrationRow[]>(
        `
          SELECT
            id,
            community_name,
            community_type,
            community_country,
            community_location,
            community_address,
            admin_email
          FROM CommunityRegistrations
          WHERE LOWER(admin_email) = LOWER(?)
          LIMIT 1
        `,
        [normalizedAdminEmail],
      )
    : [[] as CommunityRegistrationRow[]];

  const communityRegistration = communityRegistrations[0];
  if (!communityRegistration) {
    return { buildingId: BUILDING_ID };
  }

  const buildingId = `community-${communityRegistration.id}`;

  await pool.query(
    `
      INSERT INTO Buildings (
        id,
        building_name,
        community_type,
        contact_email,
        reception_hours,
        address_line,
        access_password,
        is_active
      )
      VALUES (?, ?, ?, ?, '', ?, '', TRUE)
      ON DUPLICATE KEY UPDATE
        contact_email = VALUES(contact_email),
        community_type = VALUES(community_type)
    `,
    [
      buildingId,
      communityRegistration.community_name,
      communityRegistration.community_type,
      communityRegistration.admin_email,
      communityRegistration.community_address,
    ],
  );

  await pool.query(
    `
      INSERT INTO BuildingPreferences (
        building_id,
        package_notifications,
        daily_summary,
        qr_access
      )
      VALUES (?, TRUE, TRUE, TRUE)
      ON DUPLICATE KEY UPDATE building_id = building_id
    `,
    [buildingId],
  );

  return { buildingId, communityRegistration };
}

export const api = new Elysia({ prefix: "/api" })
  .onError(({ error, set }) => {
    if (error instanceof AuthError) {
      set.status = error.status;
      return { message: error.message };
    }
  })
  .post("/auth/check-community-address", async ({ body }) => {
    await ensureCommunityRegistrationsTable();

    const normalizedCountry = normalizeTextInput(body.community_country);
    const normalizedLocation = normalizeTextInput(body.community_location);
    const normalizedAddress = normalizeTextInput(body.community_address);
    const addressFingerprint = createAddressFingerprint(
      normalizedCountry,
      normalizedLocation,
      normalizedAddress,
    );

    const [existingBuildings] = await pool.query<RowDataPacket[]>(
      `
        SELECT address_line
        FROM Buildings
      `,
    );

    const matchingBuilding = existingBuildings.find(
      (building) =>
        createAddressFingerprint(normalizedCountry, normalizedLocation, String(building.address_line)) ===
        addressFingerprint,
    );

    if (matchingBuilding) {
      return {
        available: false,
        message: "Esta direccion ya tiene una cuenta administradora registrada.",
      };
    }

    const [existingRegistrations] = await pool.query<RowDataPacket[]>(
      `
        SELECT id
        FROM CommunityRegistrations
        WHERE address_fingerprint = ?
        LIMIT 1
      `,
      [addressFingerprint],
    );

    if (existingRegistrations.length > 0) {
      return {
        available: false,
        message: "Esta direccion ya tiene una cuenta administradora registrada.",
      };
    }

    return { available: true, message: "" };
  }, {
    body: communityAddressAvailabilitySchema,
  })
  .post("/auth/check-admin-email", async ({ body }) => {
    await ensureCommunityRegistrationsTable();

    const normalizedAdminEmail = normalizeTextInput(body.admin_email).toLowerCase();
    const [existingRegistrations] = await pool.query<RowDataPacket[]>(
      `
        SELECT id
        FROM CommunityRegistrations
        WHERE LOWER(admin_email) = LOWER(?)
        LIMIT 1
      `,
      [normalizedAdminEmail],
    );

    return { exists: existingRegistrations.length > 0 };
  }, {
    body: adminEmailSchema,
  })
  .post("/auth/register-community", async ({ body, set }) => {
    await ensureCommunityRegistrationsTable();

    const normalizedCommunityName = normalizeTextInput(body.community_name);
    const normalizedCommunityType = normalizeTextInput(body.community_type);
    const normalizedCountry = normalizeTextInput(body.community_country);
    const normalizedLocation = normalizeTextInput(body.community_location);
    const normalizedAddress = normalizeTextInput(body.community_address);
    const normalizedAdminFirstName = normalizeTextInput(body.admin_first_name);
    const normalizedAdminLastName = normalizeTextInput(body.admin_last_name);
    const normalizedAdminEmail = normalizeTextInput(body.admin_email).toLowerCase();
    const addressFingerprint = createAddressFingerprint(
      normalizedCountry,
      normalizedLocation,
      normalizedAddress,
    );

    const [existingBuildings] = await pool.query<RowDataPacket[]>(
      `
        SELECT contact_email, address_line
        FROM Buildings
      `,
    );

    const matchingBuilding = existingBuildings.find(
      (building) =>
        createAddressFingerprint(normalizedCountry, normalizedLocation, String(building.address_line)) ===
        addressFingerprint,
    );

    if (
      matchingBuilding &&
      String(matchingBuilding.contact_email).toLowerCase() !== normalizedAdminEmail
    ) {
      set.status = 409;
      return {
        message: "Esta direccion ya tiene una cuenta administradora registrada.",
      };
    }

    const [existingRegistrations] = await pool.query<RowDataPacket[]>(
      `
        SELECT admin_email, address_fingerprint
        FROM CommunityRegistrations
        WHERE address_fingerprint = ?
           OR LOWER(admin_email) = LOWER(?)
        LIMIT 1
      `,
      [addressFingerprint, normalizedAdminEmail],
    );

    const existingRegistration = existingRegistrations[0];

    if (
      existingRegistration &&
      String(existingRegistration.admin_email).toLowerCase() !== normalizedAdminEmail
    ) {
      set.status = 409;
      return {
        message: "Esta direccion ya tiene una cuenta administradora registrada.",
      };
    }

    if (
      existingRegistration &&
      String(existingRegistration.address_fingerprint) !== addressFingerprint
    ) {
      set.status = 409;
      return {
        message: "Este correo ya esta asociado a otra direccion registrada.",
      };
    }

    if (existingRegistration) {
      await pool.query(
        `
          UPDATE CommunityRegistrations
          SET
            community_name = ?,
            community_type = ?,
            community_country = ?,
            community_location = ?,
            community_address = ?,
            address_fingerprint = ?,
            admin_first_name = ?,
            admin_last_name = ?
          WHERE LOWER(admin_email) = LOWER(?)
        `,
        [
          normalizedCommunityName,
          normalizedCommunityType,
          normalizedCountry,
          normalizedLocation,
          normalizedAddress,
          addressFingerprint,
          normalizedAdminFirstName,
          normalizedAdminLastName,
          normalizedAdminEmail,
        ],
      );

      await ensureAdminAccountForCommunityRegistration(
        normalizedAdminEmail,
        normalizedAdminFirstName,
        normalizedAdminLastName,
      );

      return { ok: true };
    }

    await pool.query(
      `
        INSERT INTO CommunityRegistrations (
          community_name,
          community_type,
          community_country,
          community_location,
          community_address,
          address_fingerprint,
          admin_first_name,
          admin_last_name,
          admin_email
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizedCommunityName,
        normalizedCommunityType,
        normalizedCountry,
        normalizedLocation,
        normalizedAddress,
        addressFingerprint,
        normalizedAdminFirstName,
        normalizedAdminLastName,
        normalizedAdminEmail,
      ],
    );

    await ensureAdminAccountForCommunityRegistration(
      normalizedAdminEmail,
      normalizedAdminFirstName,
      normalizedAdminLastName,
    );

    set.status = 201;
    return { ok: true };
  }, {
    body: communityRegistrationSchema,
  })
  .get("/parcels", async ({ headers, query }) => {
    await requireAppRole(headers.authorization, ["admin", "concierge"]);

    const parcel_status = query.parcel_status === "claimed" ? "claimed" : "pending";
    return listParcels(parcel_status);
  })
  .post("/parcels", async ({ headers, body, set }) => {
    await requireAppRole(headers.authorization, ["admin", "concierge"]);

    const connection = await pool.getConnection();
    const normalizedDescription = body.parcel_description
      ? normalizeTextInput(body.parcel_description)
      : "";
    const normalizedDepartmentAddress = normalizeDepartmentAddress(body.department_address);
    const qrToken = createParcelQrToken();

    try {
      await connection.beginTransaction();

      const conciergeUserId = await getConciergeUserId(connection, body.concierge_name);
      const residentUserId = await getOrCreateResident(
        connection,
        body.resident_name,
        body.department_address,
        body.user_phone_number,
      );
      const businessId = await getOrCreateBusiness(connection, body.business_name);
      const parcelId = await createSequentialId(connection, {
        tableName: "Parcels",
        columnName: "id",
        prefix: "parcel",
        padLength: 4,
      });
      const withdrawalCode = await createSequentialCode(connection, {
        tableName: "Parcels",
        columnName: "withdrawal_code",
        prefix: "REC",
        padLength: 4,
      });

      await connection.query(
        `
          INSERT INTO Parcels (
            id,
            id_concierge,
            id_resident,
            id_business,
            delivery_department_address,
            withdrawal_code,
            qr_code_url,
            qr_token,
            parcel_status,
            parcel_description,
            is_urgent
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `,
        [
          parcelId,
          conciergeUserId,
          residentUserId,
          businessId,
          normalizedDepartmentAddress,
          withdrawalCode,
          buildParcelQrValue(parcelId, qrToken),
          qrToken,
          normalizedDescription,
          body.is_urgent ?? false,
        ],
      );

      await connection.commit();
      set.status = 201;
      return getParcelById(parcelId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }, {
    body: parcelPayloadSchema,
  })
  .patch("/parcels/:id", async ({ headers, params, body, set }) => {
    await requireAppRole(headers.authorization, ["admin", "concierge"]);

    const connection = await pool.getConnection();
    const normalizedDescription = body.parcel_description
      ? normalizeTextInput(body.parcel_description)
      : "";
    const normalizedDepartmentAddress = normalizeDepartmentAddress(body.department_address);

    try {
      await connection.beginTransaction();

      const [parcels] = await connection.query<RowDataPacket[]>(
        `
          SELECT id, parcel_status
          FROM Parcels
          WHERE id = ?
          LIMIT 1
        `,
        [params.id],
      );

      if (parcels.length === 0) {
        set.status = 404;
        return { message: "Parcel not found" };
      }

      const conciergeUserId = await getConciergeUserId(connection, body.concierge_name);
      const residentUserId = await getOrCreateResident(
        connection,
        body.resident_name,
        body.department_address,
        body.user_phone_number,
      );
      const businessId = await getOrCreateBusiness(connection, body.business_name);
      const qrToken =
        String(parcels[0].parcel_status) === "pending" ? createParcelQrToken() : null;

      await connection.query(
        `
          UPDATE Parcels
          SET
            id_concierge = ?,
            id_resident = ?,
            id_business = ?,
            delivery_department_address = ?,
            qr_code_url = COALESCE(?, qr_code_url),
            qr_token = COALESCE(?, qr_token),
            parcel_description = ?,
            is_urgent = ?
          WHERE id = ?
        `,
        [
          conciergeUserId,
          residentUserId,
          businessId,
          normalizedDepartmentAddress,
          qrToken ? buildParcelQrValue(params.id, qrToken) : null,
          qrToken,
          normalizedDescription,
          body.is_urgent ?? false,
          params.id,
        ],
      );

      await connection.commit();
      return getParcelById(params.id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }, {
    body: parcelPayloadSchema,
  })
  .post("/parcels/:id/claim", async ({ headers, params, set }) => {
    const session = await requireAppRole(headers.authorization, ["admin", "concierge"]);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query<RowDataPacket[]>(
        `
          SELECT id, parcel_status
          FROM Parcels
          WHERE id = ?
          LIMIT 1
        `,
        [params.id],
      );

      if (result.length === 0) {
        await connection.rollback();
        set.status = 404;
        return { message: "Parcel not found" };
      }

      if (String(result[0].parcel_status) !== "pending") {
        await connection.rollback();
        set.status = 409;
        return { message: "El paquete ya fue retirado." };
      }

      const withdrawalCode = await createSequentialCode(connection, {
        tableName: "Parcels",
        columnName: "withdrawal_code",
        prefix: "RET",
        padLength: 4,
      });

      await connection.query(
        `
          UPDATE Parcels
          SET
            withdrawal_code = ?,
            parcel_status = 'claimed',
            claimed_date = CURRENT_TIMESTAMP,
            claimed_by_user_id = ?
          WHERE id = ?
        `,
        [withdrawalCode, session.userId, params.id],
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return getParcelById(params.id);
  })
  .post("/resident/parcels/scan", async ({ headers, body }) => {
    const session = await requireAppRole(headers.authorization, ["resident"]);
    const parcelAccess = await assertResidentParcelAccess(session, body.qr_value);

    return {
      parcel: parcelAccess.parcel,
      current_user: buildDashboardCurrentUser(session),
    };
  }, {
    body: residentParcelQrSchema,
  })
  .post("/resident/parcels/:id/claim", async ({ headers, params, body, set }) => {
    const session = await requireAppRole(headers.authorization, ["resident"]);
    const parcelAccess = await assertResidentParcelAccess(session, body.qr_value);

    if (parcelAccess.parcelId !== params.id) {
      set.status = 400;
      return { message: "El paquete indicado no coincide con el QR escaneado." };
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query<ParcelClaimRow[]>(
        `
          SELECT
            id,
            qr_token,
            parcel_status,
            delivery_department_address
          FROM Parcels
          WHERE id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [params.id],
      );

      const parcel = rows[0];

      if (!parcel || !parcel.qr_token || parcel.qr_token !== parcelAccess.qrToken) {
        await connection.rollback();
        set.status = 404;
        return { message: "No se encontro un paquete asociado a ese QR." };
      }

      if (parcel.parcel_status !== "pending") {
        await connection.rollback();
        set.status = 409;
        return { message: "Ese paquete ya fue retirado o ya no esta disponible." };
      }

      if (!departmentAddressesMatch(parcel.delivery_department_address ?? "", session.departmentAddress ?? "")) {
        await connection.rollback();
        set.status = 403;
        return { message: "Ese QR no corresponde al departamento de tu cuenta." };
      }

      const withdrawalCode = await createSequentialCode(connection, {
        tableName: "Parcels",
        columnName: "withdrawal_code",
        prefix: "RET",
        padLength: 4,
      });

      await connection.query(
        `
          UPDATE Parcels
          SET
            withdrawal_code = ?,
            parcel_status = 'claimed',
            claimed_date = CURRENT_TIMESTAMP,
            claimed_by_user_id = ?
          WHERE id = ?
        `,
        [withdrawalCode, session.userId, params.id],
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const updatedParcel = await getParcelById(params.id);
    return {
      parcel: updatedParcel,
      current_user: buildDashboardCurrentUser(session),
    };
  }, {
    body: residentParcelQrSchema,
  })
  .delete("/parcels/:id", async ({ headers, params, set }) => {
    await requireAppRole(headers.authorization, ["admin", "concierge"]);

    await pool.query(
      `
        DELETE FROM Parcels
        WHERE id = ?
      `,
      [params.id],
    );

    set.status = 204;
    return null;
  })
  .get("/issues", async ({ headers }) => {
    await requireAppRole(headers.authorization, ["admin", "concierge"]);
    return listIssues();
  })
  .patch("/issues/:id", async ({ headers, params, body, set }) => {
    await requireAppRole(headers.authorization, ["admin", "concierge"]);

    const [issues] = await pool.query<RowDataPacket[]>(
      `
        SELECT id
        FROM Issues
        WHERE id = ?
        LIMIT 1
      `,
      [params.id],
    );

    if (issues.length === 0) {
      set.status = 404;
      return { message: "Issue not found" };
    }

    await pool.query(
      `
        UPDATE Issues
        SET issue_status = ?
        WHERE id = ?
      `,
      [body.issue_status, params.id],
    );

    const updatedIssues = await listIssues();
    return updatedIssues.find((issue) => issue.id === params.id);
  }, {
    body: issueStatusSchema,
  })
  .get("/settings", async ({ headers, query }) => {
    await requireAppRole(headers.authorization, ["admin"]);
    return getSettingsPayload(query.admin_email);
  })
  .get("/settings/residents", async ({ headers, query }) => {
    await requireAppRole(headers.authorization, ["admin"]);
    await ensureResidentAccountSecurityTable();
    const departmentAddress = normalizeDepartmentAddress(String(query.department_address ?? ""));

    if (!departmentAddress) {
      return [];
    }

    const [residents] = await pool.query<ResidentRow[]>(
      `
        SELECT
          r.user_id,
          u.email,
          r.resident_name,
          r.user_phone_number,
          r.department_address,
          s.email_verified,
          s.totp_verified
        FROM Residents r
        INNER JOIN Users u ON u.id = r.user_id
        LEFT JOIN ResidentAccountSecurity s ON s.user_id = r.user_id
        ORDER BY r.resident_name
      `,
    );

    return residents
      .filter((resident) =>
        departmentAddressesMatch(resident.department_address, departmentAddress),
      )
      .map((resident) => ({
        user_id: resident.user_id,
        email: resident.email,
        resident_name: repairPotentialMojibake(resident.resident_name),
        user_phone_number: repairPotentialMojibake(resident.user_phone_number ?? ""),
        department_address: repairPotentialMojibake(resident.department_address),
        email_verified: Boolean(resident.email_verified),
        mfa_enabled: Boolean(resident.totp_verified),
      }));
  })
  .post("/settings/residents", async ({ headers, body, set }) => {
    await requireAppRole(headers.authorization, ["admin"]);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const { residentId, verificationCode } = await createResidentAccount(
        connection,
        body.resident_email,
        body.resident_name,
        body.resident_password,
        body.department_address,
        body.user_phone_number,
      );

      await connection.commit();
      set.status = 201;

      const [residents] = await pool.query<ResidentRow[]>(
        `
          SELECT
            r.user_id,
            u.email,
            r.resident_name,
            r.user_phone_number,
            r.department_address,
            s.email_verified,
            s.totp_verified
          FROM Residents r
          INNER JOIN Users u ON u.id = r.user_id
          LEFT JOIN ResidentAccountSecurity s ON s.user_id = r.user_id
          WHERE r.user_id = ?
          LIMIT 1
        `,
        [residentId],
      );

      const resident = residents[0];
      return {
        user_id: resident.user_id,
        email: resident.email,
        resident_name: repairPotentialMojibake(resident.resident_name),
        user_phone_number: repairPotentialMojibake(resident.user_phone_number ?? ""),
        department_address: repairPotentialMojibake(resident.department_address),
        email_verified: Boolean(resident.email_verified),
        mfa_enabled: Boolean(resident.totp_verified),
        verification_code: verificationCode,
      };
    } catch (error) {
      await connection.rollback();
      if (error instanceof Error && error.message === "Este correo ya tiene una cuenta registrada.") {
        set.status = 409;
        return { message: error.message };
      }
      throw error;
    } finally {
      connection.release();
    }
  }, {
    body: residentSettingsSchema,
  })
  .post("/settings/residents/:id/verify-email", async ({ headers, params, body, set }) => {
    await requireAppRole(headers.authorization, ["admin"]);
    await ensureResidentAccountSecurityTable();

    const [securityRows] = await pool.query<ResidentSecurityRow[]>(
      `
        SELECT user_id, email_verification_code_hash, totp_secret
        FROM ResidentAccountSecurity
        WHERE user_id = ?
          AND email_verification_expires_at > CURRENT_TIMESTAMP
        LIMIT 1
      `,
      [params.id],
    );

    const security = securityRows[0];
    if (
      !security?.email_verification_code_hash ||
      security.email_verification_code_hash !== hashVerificationCode(body.verification_code)
    ) {
      set.status = 400;
      return { message: "Codigo de verificacion invalido o expirado." };
    }

    const [users] = await pool.query<Array<RowDataPacket & { email: string }>>(
      `
        SELECT email
        FROM Users
        WHERE id = ?
        LIMIT 1
      `,
      [params.id],
    );

    const email = users[0]?.email;
    if (!email) {
      set.status = 404;
      return { message: "Residente no encontrado." };
    }

    const secret = security.totp_secret ?? createTotpSecret();

    await pool.query(
      `
        UPDATE ResidentAccountSecurity
        SET
          email_verified = TRUE,
          email_verification_code_hash = NULL,
          email_verification_expires_at = NULL,
          totp_secret = ?
        WHERE user_id = ?
      `,
      [secret, params.id],
    );

    return {
      totp_secret: secret,
      totp_uri: createTotpUri(email, secret),
    };
  }, {
    body: residentEmailVerificationSchema,
  })
  .post("/settings/residents/:id/verify-mfa", async ({ headers, params, body, set }) => {
    await requireAppRole(headers.authorization, ["admin"]);
    await ensureResidentAccountSecurityTable();

    const [securityRows] = await pool.query<ResidentSecurityRow[]>(
      `
        SELECT user_id, totp_secret
        FROM ResidentAccountSecurity
        WHERE user_id = ?
          AND email_verified = TRUE
        LIMIT 1
      `,
      [params.id],
    );

    const secret = securityRows[0]?.totp_secret;
    if (!secret || !verifyTotpCode(secret, body.mfa_code)) {
      set.status = 400;
      return { message: "Codigo del autenticador invalido." };
    }

    await pool.query(
      `
        UPDATE ResidentAccountSecurity
        SET totp_verified = TRUE
        WHERE user_id = ?
      `,
      [params.id],
    );

    return { ok: true };
  }, {
    body: residentMfaVerificationSchema,
  })
  .put("/settings/general", async ({ headers, body, query }) => {
    await requireAppRole(headers.authorization, ["admin"]);
    const { buildingId, communityRegistration } = await getSettingsContext(query.admin_email);
    const communityType = normalizeTextInput(body.community_type ?? "Edificio") || "Edificio";

    await pool.query(
      `
        UPDATE Buildings
        SET
          building_name = ?,
          community_type = ?,
          contact_email = ?,
          reception_hours = ?,
          address_line = ?,
          access_password = ?,
          is_active = ?
        WHERE id = ?
      `,
      [
        body.building_name.trim(),
        communityType,
        body.contact_email.trim(),
        body.reception_hours.trim(),
        body.address_line.trim(),
        body.access_password.trim(),
        body.is_active,
        buildingId,
      ],
    );

    if (communityRegistration) {
      await pool.query(
        `
          UPDATE CommunityRegistrations
          SET
            community_name = ?,
            community_type = ?,
            community_address = ?
          WHERE id = ?
        `,
        [
          body.building_name.trim(),
          communityType,
          body.address_line.trim(),
          communityRegistration.id,
        ],
      );
    }

    return {
      ...body,
      community_type: communityType,
    };
  }, {
    body: generalSettingsSchema,
  })
  .put("/settings/preferences", async ({ headers, body, query }) => {
    await requireAppRole(headers.authorization, ["admin"]);
    const { buildingId } = await getSettingsContext(query.admin_email);

    await pool.query(
      `
        UPDATE BuildingPreferences
        SET
          package_notifications = ?,
          daily_summary = ?,
          qr_access = ?
        WHERE building_id = ?
    `,
      [body.package_notifications, body.daily_summary, body.qr_access, buildingId],
    );

    return body;
  }, {
    body: preferenceSettingsSchema,
  })
  .put("/settings/towers", async ({ headers, body, query }) => {
    await requireAppRole(headers.authorization, ["admin"]);
    const { buildingId } = await getSettingsContext(query.admin_email);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `
          DELETE a
          FROM Apartments a
          INNER JOIN Floors f ON f.id = a.floor_id
          INNER JOIN Towers t ON t.id = f.tower_id
          WHERE t.building_id = ?
        `,
        [buildingId],
      );

      await connection.query(
        `
          DELETE f
          FROM Floors f
          INNER JOIN Towers t ON t.id = f.tower_id
          WHERE t.building_id = ?
        `,
        [buildingId],
      );

      await connection.query(
        `
          DELETE FROM Towers
          WHERE building_id = ?
        `,
        [buildingId],
      );

      for (const [towerIndex, tower] of body.entries()) {
        await connection.query(
          `
            INSERT INTO Towers (id, building_id, tower_name, display_order)
            VALUES (?, ?, ?, ?)
          `,
          [tower.id, buildingId, tower.tower_name.trim(), towerIndex + 1],
        );

        for (const floor of tower.floors) {
          const [floorInsert] = await connection.query(
            `
              INSERT INTO Floors (tower_id, floor_number)
              VALUES (?, ?)
            `,
            [tower.id, floor.floor_number],
          );

          const floorId = Number((floorInsert as { insertId: number }).insertId);

          for (const [apartmentIndex, apartment_name] of floor.apartments.entries()) {
            await connection.query(
              `
                INSERT INTO Apartments (floor_id, apartment_name, display_order)
                VALUES (?, ?, ?)
              `,
              [floorId, apartment_name.trim(), apartmentIndex + 1],
            );
          }
        }
      }

      await connection.commit();
      return body;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }, {
    body: towersSchema,
  })
  .get("/dashboard", async ({ headers }) => {
    const session = await requireAppRole(headers.authorization, ["admin", "concierge", "resident"]);

    if (session.role === "resident") {
      const departmentAddress = session.departmentAddress ?? "";

      return {
        current_user: buildDashboardCurrentUser(session),
        pending_parcels: await listParcels("pending", { departmentAddress }),
        claimed_parcels: await listParcels("claimed", { departmentAddress }),
        issues: [],
      };
    }

    return {
      current_user: buildDashboardCurrentUser(session),
      pending_parcels: await listParcels("pending"),
      claimed_parcels: await listParcels("claimed"),
      issues: await listIssues(),
    };
  });
