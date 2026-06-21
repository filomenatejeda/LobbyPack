import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { AuthError, type AuthSession } from "../../auth/session";
import { pool } from "../../db/pool";
import { BUILDING_ID } from "../shared/constants";
import {
  departmentAddressesMatch,
  normalizeDepartmentAddress,
} from "../../utils/departments";
import {
  createSequentialCode,
  createSequentialId,
} from "../../utils/ids";
import {
  buildParcelQrValue,
  createParcelQrToken,
  parseParcelQrValue,
} from "../../utils/parcels";
import { normalizeTextInput, repairPotentialMojibake } from "../../utils/textEncoding";
import type {
  ParcelClaimRow,
  ParcelDepartmentResidentRow,
  ParcelRow,
} from "../shared/types";

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

export async function findResidentForDepartment(
  connection: PoolConnection,
  departmentAddress: string,
  buildingId: string,
) {
  const normalizedDepartmentAddress = normalizeDepartmentAddress(departmentAddress);
  const [residents] = await connection.query<RowDataPacket[]>(
    `
      SELECT user_id
      FROM Residents
      WHERE LOWER(department_address) = LOWER(?)
        AND building_id = ?
      ORDER BY resident_name
      LIMIT 1
    `,
    [normalizedDepartmentAddress, buildingId],
  );

  return residents[0]?.user_id ? String(residents[0].user_id) : null;
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
    resident_claim_confirmed_at: row.resident_claim_confirmed_at,
    resident_claimed_by_name: row.resident_claimed_by_name
      ? repairPotentialMojibake(row.resident_claimed_by_name)
      : null,
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
    department_residents: [],
  };
}

function mapDepartmentResident(row: ParcelDepartmentResidentRow) {
  return {
    user_id: row.user_id,
    email: repairPotentialMojibake(row.email),
    resident_name: repairPotentialMojibake(row.resident_name),
    user_phone_number: repairPotentialMojibake(row.user_phone_number ?? ""),
    department_address: repairPotentialMojibake(row.department_address),
  };
}

async function listResidentContacts(buildingId?: string | null) {
  const [rows] = await pool.query<ParcelDepartmentResidentRow[]>(
    `
      SELECT
        r.user_id,
        u.email,
        r.resident_name,
        r.user_phone_number,
        r.department_address
      FROM Residents r
      INNER JOIN Users u ON u.id = r.user_id
      WHERE (? IS NULL OR r.building_id = ? OR r.building_id IS NULL)
      ORDER BY r.department_address, r.resident_name
    `,
    [buildingId ?? null, buildingId ?? null],
  );

  return rows.map(mapDepartmentResident);
}

async function addDepartmentResidentContacts<T extends ReturnType<typeof mapParcelRow>>(
  parcels: T[],
  buildingId?: string | null,
) {
  if (parcels.length === 0) {
    return parcels;
  }

  const contacts = await listResidentContacts(buildingId);

  return parcels.map((parcel) => ({
    ...parcel,
    department_residents: contacts.filter((contact) =>
      departmentAddressesMatch(contact.department_address, parcel.department_address),
    ),
  }));
}

export async function listParcels(
  parcelStatus: "pending" | "claimed",
  options?: { departmentAddress?: string; buildingId?: string },
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
        p.resident_claim_confirmed_at,
        p.resident_claimed_by_user_id,
        p.claimed_date,
        p.claimed_by_user_id,
        p.id_concierge,
        p.id_resident,
        p.id_business,
        p.building_id,
        COALESCE(p.parcel_recipient_name, r.resident_name, '') AS resident_name,
        COALESCE(p.parcel_recipient_phone, r.user_phone_number, '') AS user_phone_number,
        COALESCE(p.delivery_department_address, r.department_address) AS department_address,
        COALESCE(c.concierge_name, a.admin_name, concierge_user.email) AS concierge_name,
        b.business_name,
        COALESCE(rr.resident_name, rc.concierge_name, ra.admin_name, resident_claimed_user.email) AS resident_claimed_by_name,
        COALESCE(cr.resident_name, cc.concierge_name, ca.admin_name, claimed_user.email) AS claimed_by_name
      FROM Parcels p
      LEFT JOIN Residents r ON r.user_id = p.id_resident
      INNER JOIN Users concierge_user ON concierge_user.id = p.id_concierge
      LEFT JOIN Concierges c ON c.user_id = p.id_concierge
      LEFT JOIN Admins a ON a.user_id = p.id_concierge
      INNER JOIN Businesses b ON b.id = p.id_business
      LEFT JOIN Users resident_claimed_user ON resident_claimed_user.id = p.resident_claimed_by_user_id
      LEFT JOIN Residents rr ON rr.user_id = resident_claimed_user.id
      LEFT JOIN Concierges rc ON rc.user_id = resident_claimed_user.id
      LEFT JOIN Admins ra ON ra.user_id = resident_claimed_user.id
      LEFT JOIN Users claimed_user ON claimed_user.id = p.claimed_by_user_id
      LEFT JOIN Residents cr ON cr.user_id = claimed_user.id
      LEFT JOIN Concierges cc ON cc.user_id = claimed_user.id
      LEFT JOIN Admins ca ON ca.user_id = claimed_user.id
      WHERE p.parcel_status = ?
        AND (? IS NULL OR p.building_id = ?)
      ORDER BY
        CASE
          WHEN p.parcel_status = 'claimed' THEN p.claimed_date
          ELSE p.pending_date
        END DESC,
        p.pending_date DESC
    `,
    [parcelStatus, options?.buildingId ?? null, options?.buildingId ?? null],
  );

  const mappedRows = await addDepartmentResidentContacts(
    rows.map(mapParcelRow),
    options?.buildingId,
  );

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
        p.resident_claim_confirmed_at,
        p.resident_claimed_by_user_id,
        p.claimed_date,
        p.claimed_by_user_id,
        p.id_concierge,
        p.id_resident,
        p.id_business,
        p.building_id,
        COALESCE(p.parcel_recipient_name, r.resident_name, '') AS resident_name,
        COALESCE(p.parcel_recipient_phone, r.user_phone_number, '') AS user_phone_number,
        COALESCE(p.delivery_department_address, r.department_address) AS department_address,
        COALESCE(c.concierge_name, a.admin_name, concierge_user.email) AS concierge_name,
        b.business_name,
        COALESCE(rr.resident_name, rc.concierge_name, ra.admin_name, resident_claimed_user.email) AS resident_claimed_by_name,
        COALESCE(cr.resident_name, cc.concierge_name, ca.admin_name, claimed_user.email) AS claimed_by_name
      FROM Parcels p
      LEFT JOIN Residents r ON r.user_id = p.id_resident
      INNER JOIN Users concierge_user ON concierge_user.id = p.id_concierge
      LEFT JOIN Concierges c ON c.user_id = p.id_concierge
      LEFT JOIN Admins a ON a.user_id = p.id_concierge
      INNER JOIN Businesses b ON b.id = p.id_business
      LEFT JOIN Users resident_claimed_user ON resident_claimed_user.id = p.resident_claimed_by_user_id
      LEFT JOIN Residents rr ON rr.user_id = resident_claimed_user.id
      LEFT JOIN Concierges rc ON rc.user_id = resident_claimed_user.id
      LEFT JOIN Admins ra ON ra.user_id = resident_claimed_user.id
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

  if (!parcel) {
    return null;
  }

  const [parcelWithContacts] = await addDepartmentResidentContacts(
    [mapParcelRow(parcel)],
    parcel.building_id,
  );

  return parcelWithContacts;
}

export function buildDashboardCurrentUser(session: AuthSession) {
  return {
    user_id: session.userId,
    email: session.email,
    role: session.role,
    display_name: session.displayName ?? session.residentName ?? session.email,
    user_phone_number: session.residentPhoneNumber ?? "",
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
  const dataBuildingId =
    session.buildingId && session.buildingId !== BUILDING_ID
      ? session.buildingId
      : undefined;
  const [rows] = await pool.query<ParcelClaimRow[]>(
    `
      SELECT
        p.id,
        p.qr_token,
        p.parcel_status,
        p.resident_claim_confirmed_at,
        p.delivery_department_address
      FROM Parcels p
      LEFT JOIN Residents r ON r.user_id = p.id_resident
      WHERE p.id = ?
        AND (? IS NULL OR p.building_id = ?)
      LIMIT 1
    `,
    [parsed.parcelId, dataBuildingId ?? null, dataBuildingId ?? null],
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
