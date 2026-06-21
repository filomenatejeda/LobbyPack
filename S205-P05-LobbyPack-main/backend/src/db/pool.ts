import mysql, { type RowDataPacket } from "mysql2/promise";
import { createSequentialCode } from "../utils/ids";
import { repairPotentialMojibake } from "../utils/textEncoding";

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
