import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool } from "../../db/pool";
import { createSequentialId } from "../../utils/ids";
import { normalizeTextInput } from "../../utils/textEncoding";
import { BUILDING_ID } from "./constants";
import type { CommunityRegistrationRow, SettingsContext } from "./types";

export function createAddressFingerprint(country: string, location: string, address: string) {
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

export async function ensureCommunityRegistrationsTable() {
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

export async function ensureAdminAccountForCommunityRegistration(
  adminEmail: string,
  adminFirstName: string,
  adminLastName: string,
) {
  const connection = await pool.getConnection();
  const normalizedAdminEmail = normalizeTextInput(adminEmail).toLowerCase();
  const adminName =
    `${normalizeTextInput(adminFirstName)} ${normalizeTextInput(adminLastName)}`.trim();

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

    const adminId = await createSequentialId(connection as PoolConnection, {
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

export async function getSettingsContext(adminEmail?: string): Promise<SettingsContext> {
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
