import mysql, { type RowDataPacket } from "mysql2/promise";
import { createSequentialCode } from "../utils/ids";
import { buildParcelQrValue, createParcelQrToken } from "../utils/parcels";
import { repairPotentialMojibake } from "../utils/textEncoding";

const mysqlConfig = {
  host: process.env.MYSQL_HOST ?? process.env.DB_HOST,
  port: process.env.MYSQL_PORT ?? process.env.MYSQL_DOCKER_PORT ?? process.env.MYSQL_LOCAL_PORT,
  user: process.env.MYSQL_USER ?? process.env.DB_USER,
  password: process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD,
  database: process.env.MYSQL_DB ?? process.env.DB_NAME,
};

for (const [configName, configValue] of Object.entries(mysqlConfig)) {
  if (!configValue) {
    throw new Error(`Missing required MySQL configuration: ${configName}`);
  }
}

export const pool = mysql.createPool({
  host: mysqlConfig.host,
  port: Number(mysqlConfig.port),
  user: mysqlConfig.user,
  password: mysqlConfig.password,
  database: mysqlConfig.database,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

export async function ensureUtf8mb4() {
  const databaseName = mysqlConfig.database;

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

export async function repairIssueEncoding() {
  const [issues] = await pool.query<Array<RowDataPacket & { id: string; issue_description: string }>>(
    `
      SELECT id, issue_description
      FROM Issues
    `,
  );

  for (const issue of issues) {
    const repairedDescription = repairPotentialMojibake(issue.issue_description);

    if (repairedDescription === issue.issue_description) {
      continue;
    }

    await pool.query(
      `
        UPDATE Issues
        SET issue_description = ?
        WHERE id = ?
      `,
      [repairedDescription, issue.id],
    );
  }
}

export async function repairParcelEncoding() {
  const [residents] = await pool.query<
    Array<
      RowDataPacket & {
        user_id: string;
        resident_name: string;
        department_address: string;
        user_phone_number: string | null;
      }
    >
  >(
    `
      SELECT user_id, resident_name, department_address, user_phone_number
      FROM Residents
    `,
  );

  for (const resident of residents) {
    const repairedResidentName = repairPotentialMojibake(resident.resident_name);
    const repairedDepartmentAddress = repairPotentialMojibake(resident.department_address);
    const repairedPhoneNumber = repairPotentialMojibake(resident.user_phone_number ?? "");

    if (
      repairedResidentName === resident.resident_name &&
      repairedDepartmentAddress === resident.department_address &&
      repairedPhoneNumber === (resident.user_phone_number ?? "")
    ) {
      continue;
    }

    await pool.query(
      `
        UPDATE Residents
        SET resident_name = ?, department_address = ?, user_phone_number = ?
        WHERE user_id = ?
      `,
      [repairedResidentName, repairedDepartmentAddress, repairedPhoneNumber || null, resident.user_id],
    );
  }

  const [businesses] = await pool.query<Array<RowDataPacket & { id: string; business_name: string }>>(
    `
      SELECT id, business_name
      FROM Businesses
    `,
  );

  for (const business of businesses) {
    const repairedBusinessName = repairPotentialMojibake(business.business_name);

    if (repairedBusinessName === business.business_name) {
      continue;
    }

    await pool.query(
      `
        UPDATE Businesses
        SET business_name = ?
        WHERE id = ?
      `,
      [repairedBusinessName, business.id],
    );
  }

  const [concierges] = await pool.query<
    Array<RowDataPacket & { user_id: string; concierge_name: string }>
  >(
    `
      SELECT user_id, concierge_name
      FROM Concierges
    `,
  );

  for (const concierge of concierges) {
    const repairedConciergeName = repairPotentialMojibake(concierge.concierge_name);

    if (repairedConciergeName === concierge.concierge_name) {
      continue;
    }

    await pool.query(
      `
        UPDATE Concierges
        SET concierge_name = ?
        WHERE user_id = ?
      `,
      [repairedConciergeName, concierge.user_id],
    );
  }

  const [parcels] = await pool.query<
    Array<RowDataPacket & { id: string; parcel_description: string | null }>
  >(
    `
      SELECT id, parcel_description
      FROM Parcels
    `,
  );

  for (const parcel of parcels) {
    const currentDescription = parcel.parcel_description ?? "";
    const repairedDescription = repairPotentialMojibake(currentDescription);

    if (repairedDescription === currentDescription) {
      continue;
    }

    await pool.query(
      `
        UPDATE Parcels
        SET parcel_description = ?
        WHERE id = ?
      `,
      [repairedDescription, parcel.id],
    );
  }
}

export async function repairParcelWithdrawalCodes() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [parcelsNeedingRetCode] = await connection.query<
      Array<RowDataPacket & { id: string }>
    >(
      `
        SELECT id
        FROM Parcels
        WHERE parcel_status = 'claimed'
          AND (withdrawal_code IS NULL OR withdrawal_code NOT LIKE 'RET-%')
        ORDER BY claimed_date, pending_date, id
      `,
    );

    for (const parcel of parcelsNeedingRetCode) {
      const withdrawalCode = await createSequentialCode(connection, {
        tableName: "Parcels",
        columnName: "withdrawal_code",
        prefix: "RET",
        padLength: 4,
      });

      await connection.query(
        `
          UPDATE Parcels
          SET withdrawal_code = ?
          WHERE id = ?
        `,
        [withdrawalCode, parcel.id],
      );
    }

    const [parcelsNeedingRecCode] = await connection.query<
      Array<RowDataPacket & { id: string }>
    >(
      `
        SELECT id
        FROM Parcels
        WHERE parcel_status = 'pending'
          AND (withdrawal_code IS NULL OR withdrawal_code NOT LIKE 'REC-%')
        ORDER BY pending_date, id
      `,
    );

    for (const parcel of parcelsNeedingRecCode) {
      const withdrawalCode = await createSequentialCode(connection, {
        tableName: "Parcels",
        columnName: "withdrawal_code",
        prefix: "REC",
        padLength: 4,
      });

      await connection.query(
        `
          UPDATE Parcels
          SET withdrawal_code = ?
          WHERE id = ?
        `,
        [withdrawalCode, parcel.id],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function columnExists(tableName: string, columnName: string) {
  const databaseName = mysqlConfig.database;

  if (!databaseName) {
    throw new Error("Missing required environment variable: MYSQL_DB");
  }

  const [rows] = await pool.query<Array<RowDataPacket & { count: number }>>(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [databaseName, tableName, columnName],
  );

  return Number(rows[0]?.count ?? 0) > 0;
}

async function columnIsNullable(tableName: string, columnName: string) {
  const databaseName = mysqlConfig.database;

  if (!databaseName) {
    throw new Error("Missing required environment variable: MYSQL_DB");
  }

  const [rows] = await pool.query<Array<RowDataPacket & { IS_NULLABLE: string }>>(
    `
      SELECT IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [databaseName, tableName, columnName],
  );

  return rows[0]?.IS_NULLABLE === "YES";
}

export async function ensureBuildingCommunityColumns() {
  if (!(await columnExists("Buildings", "community_type"))) {
    await pool.query(`
      ALTER TABLE Buildings
      ADD COLUMN community_type VARCHAR(100) NOT NULL DEFAULT 'Edificio'
        AFTER building_name
    `);
  }
}

export async function ensureResidentCommunityColumns() {
  if (!(await columnExists("Residents", "building_id"))) {
    await pool.query(`
      ALTER TABLE Residents
      ADD COLUMN building_id VARCHAR(64) NULL
        AFTER department_address
    `);
  }
}

export async function ensureConciergeCommunityColumns() {
  if (!(await columnExists("Concierges", "building_id"))) {
    await pool.query(`
      ALTER TABLE Concierges
      ADD COLUMN building_id VARCHAR(64) NULL
        AFTER concierge_password_hash
    `);
  }
}

export async function ensureParcelQrSecurityColumns() {
  if (!(await columnExists("Parcels", "building_id"))) {
    await pool.query(`
      ALTER TABLE Parcels
      ADD COLUMN building_id VARCHAR(64) NULL
        AFTER id_business
    `);
  }

  if (!(await columnExists("Parcels", "delivery_department_address"))) {
    await pool.query(`
      ALTER TABLE Parcels
      ADD COLUMN delivery_department_address VARCHAR(100) NULL
        AFTER building_id
    `);
  }

  if (!(await columnExists("Parcels", "parcel_recipient_name"))) {
    await pool.query(`
      ALTER TABLE Parcels
      ADD COLUMN parcel_recipient_name VARCHAR(100) NULL
        AFTER delivery_department_address
    `);
  }

  if (!(await columnExists("Parcels", "parcel_recipient_phone"))) {
    await pool.query(`
      ALTER TABLE Parcels
      ADD COLUMN parcel_recipient_phone VARCHAR(12) NULL
        AFTER parcel_recipient_name
    `);
  }

  if (!(await columnExists("Parcels", "qr_token"))) {
    await pool.query(`
      ALTER TABLE Parcels
      ADD COLUMN qr_token VARCHAR(64) NULL
        AFTER qr_code_url
    `);
  }

  if (!(await columnExists("Parcels", "claimed_by_user_id"))) {
    await pool.query(`
      ALTER TABLE Parcels
      ADD COLUMN claimed_by_user_id VARCHAR(64) NULL
        AFTER claimed_date
    `);
  }

  if (!(await columnExists("Parcels", "resident_claim_confirmed_at"))) {
    await pool.query(`
      ALTER TABLE Parcels
      ADD COLUMN resident_claim_confirmed_at TIMESTAMP NULL
        AFTER pending_date
    `);
  }

  if (!(await columnExists("Parcels", "resident_claimed_by_user_id"))) {
    await pool.query(`
      ALTER TABLE Parcels
      ADD COLUMN resident_claimed_by_user_id VARCHAR(64) NULL
        AFTER resident_claim_confirmed_at
    `);
  }

  if (!(await columnIsNullable("Parcels", "id_resident"))) {
    await pool.query(`
      ALTER TABLE Parcels
      MODIFY id_resident VARCHAR(64) NULL
    `);
  }

  await pool.query(
    `
      UPDATE Parcels p
      INNER JOIN Residents r ON r.user_id = p.id_resident
      SET p.building_id = r.building_id
      WHERE (p.building_id IS NULL OR p.building_id = '')
        AND r.building_id IS NOT NULL
    `,
  );

  await pool.query(
    `
      UPDATE Parcels
      SET building_id = 'building-main'
      WHERE building_id IS NULL
         OR building_id = ''
    `,
  );

  await pool.query(
    `
      UPDATE Parcels p
      INNER JOIN Residents r ON r.user_id = p.id_resident
      SET p.delivery_department_address = r.department_address
      WHERE p.delivery_department_address IS NULL
         OR p.delivery_department_address = ''
    `,
  );

  await pool.query(
    `
      UPDATE Parcels p
      INNER JOIN Residents r ON r.user_id = p.id_resident
      SET p.parcel_recipient_name = r.resident_name
      WHERE p.parcel_recipient_name IS NULL
         OR p.parcel_recipient_name = ''
    `,
  );

  await pool.query(
    `
      UPDATE Parcels p
      INNER JOIN Residents r ON r.user_id = p.id_resident
      SET p.parcel_recipient_phone = r.user_phone_number
      WHERE p.parcel_recipient_phone IS NULL
         OR p.parcel_recipient_phone = ''
    `,
  );

  const [parcels] = await pool.query<
    Array<RowDataPacket & { id: string; qr_token: string | null }>
  >(
    `
      SELECT id, qr_token
      FROM Parcels
      WHERE qr_token IS NULL
         OR qr_token = ''
         OR qr_code_url IS NULL
         OR qr_code_url NOT LIKE 'LobbyPack:claim:%'
    `,
  );

  for (const parcel of parcels) {
    const qrToken = parcel.qr_token?.trim() || createParcelQrToken();

    await pool.query(
      `
        UPDATE Parcels
        SET qr_token = ?, qr_code_url = ?
        WHERE id = ?
      `,
      [qrToken, buildParcelQrValue(parcel.id, qrToken), parcel.id],
    );
  }
}
