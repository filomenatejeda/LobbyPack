import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError, type AuthSession } from "../../auth/session";
import { pool } from "../../db/pool";
import {
  departmentAddressesMatch,
  normalizeDepartmentAddress,
} from "../../utils/departments";
import {
  createResidentEmail,
  createSequentialCode,
  createSequentialId,
} from "../../utils/ids";
import {
  buildParcelQrValue,
  createParcelQrToken,
  parseParcelQrValue,
} from "../../utils/parcels";
import { normalizeTextInput, repairPotentialMojibake } from "../../utils/textEncoding";
import type { ParcelClaimRow, ParcelRow } from "../shared/types";

export { buildParcelQrValue, createParcelQrToken, createSequentialCode, createSequentialId };

export async function getOrCreateBusiness(connection: PoolConnection, businessName: string) {
  const normalizedBusinessName = normalizeTextInput(businessName);

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

export async function getOrCreateResident(
  connection: PoolConnection,
  residentName: string,
  departmentAddress: string,
  userPhoneNumber: string,
) {
  const normalizedResidentName = normalizeTextInput(residentName);
  const normalizedDepartmentAddress = normalizeDepartmentAddress(departmentAddress);
  const normalizedPhoneNumber = normalizeTextInput(userPhoneNumber);

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
    claimed_by_name: row.claimed_by_name
      ? repairPotentialMojibake(row.claimed_by_name)
      : null,
  };
}

export async function listParcels(
  parcelStatus: "pending" | "claimed",
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
        COALESCE(c.concierge_name, a.admin_name, concierge_user.email) AS concierge_name,
        b.business_name,
        COALESCE(cr.resident_name, cc.concierge_name, ca.admin_name, claimed_user.email) AS claimed_by_name
      FROM Parcels p
      INNER JOIN Residents r ON r.user_id = p.id_resident
      INNER JOIN Users concierge_user ON concierge_user.id = p.id_concierge
      LEFT JOIN Concierges c ON c.user_id = p.id_concierge
      LEFT JOIN Admins a ON a.user_id = p.id_concierge
      INNER JOIN Businesses b ON b.id = p.id_business
      LEFT JOIN Users claimed_user ON claimed_user.id = p.claimed_by_user_id
      LEFT JOIN Residents cr ON cr.user_id = claimed_user.id
      LEFT JOIN Concierges cc ON cc.user_id = claimed_user.id
      LEFT JOIN Admins ca ON ca.user_id = claimed_user.id
      WHERE p.parcel_status = ?
      ORDER BY
        CASE
          WHEN p.parcel_status = 'claimed' THEN p.claimed_date
          ELSE p.pending_date
        END DESC,
        p.pending_date DESC
    `,
    [parcelStatus],
  );

  const mappedRows = rows.map(mapParcelRow);

  if (!options?.departmentAddress) {
    return mappedRows;
  }

  return mappedRows.filter((row) =>
    departmentAddressesMatch(row.department_address, options.departmentAddress ?? ""),
  );
}

export async function getParcelById(parcelId: string) {
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
        COALESCE(c.concierge_name, a.admin_name, concierge_user.email) AS concierge_name,
        b.business_name,
        COALESCE(cr.resident_name, cc.concierge_name, ca.admin_name, claimed_user.email) AS claimed_by_name
      FROM Parcels p
      INNER JOIN Residents r ON r.user_id = p.id_resident
      INNER JOIN Users concierge_user ON concierge_user.id = p.id_concierge
      LEFT JOIN Concierges c ON c.user_id = p.id_concierge
      LEFT JOIN Admins a ON a.user_id = p.id_concierge
      INNER JOIN Businesses b ON b.id = p.id_business
      LEFT JOIN Users claimed_user ON claimed_user.id = p.claimed_by_user_id
      LEFT JOIN Residents cr ON cr.user_id = claimed_user.id
      LEFT JOIN Concierges cc ON cc.user_id = claimed_user.id
      LEFT JOIN Admins ca ON ca.user_id = claimed_user.id
      WHERE p.id = ?
      LIMIT 1
    `,
    [parcelId],
  );

  const parcel = parcels[0];
  return parcel ? mapParcelRow(parcel) : null;
}

export function buildDashboardCurrentUser(session: AuthSession) {
  return {
    user_id: session.userId,
    email: session.email,
    role: session.role,
    display_name: session.displayName ?? session.residentName ?? session.email,
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

export async function assertResidentParcelAccess(session: AuthSession, qrValue: string) {
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
