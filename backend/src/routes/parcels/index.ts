import { Elysia } from "elysia";
import type { RowDataPacket } from "mysql2/promise";
import { requireAppRole } from "../../auth/session";
import { pool } from "../../db/pool";
import {
  departmentAddressesMatch,
  normalizeDepartmentAddress,
} from "../../utils/departments";
import { normalizeTextInput } from "../../utils/textEncoding";
import { parcelPayloadSchema, residentParcelQrSchema } from "../shared/schemas";
import type { ParcelClaimRow } from "../shared/types";
import { resolveBuildingIdForUserEmail } from "../shared/community";
import { assertDepartmentExistsInStructure } from "../shared/structure";
import { validateParcelPayload } from "./validation";
import {
  assertResidentParcelAccess,
  buildDashboardCurrentUser,
  buildParcelQrValue,
  createParcelQrToken,
  createSequentialCode,
  createSequentialId,
  getConciergeUserId,
  getOrCreateBusiness,
  getOrCreateResident,
  getParcelById,
  listParcels,
} from "./service";

export const parcelRoutes = new Elysia()
  .get("/parcels", async ({ headers, query }) => {
    await requireAppRole(headers.authorization, ["admin", "concierge"]);

    const parcelStatus = query.parcel_status === "claimed" ? "claimed" : "pending";
    return listParcels(parcelStatus);
  })
  .post(
    "/parcels",
    async ({ headers, body, set }) => {
      const session = await requireAppRole(headers.authorization, ["admin", "concierge"]);
      const validatedPayload = validateParcelPayload(body);
      const buildingId = await resolveBuildingIdForUserEmail(session.email);
      await assertDepartmentExistsInStructure(
        buildingId,
        validatedPayload.department_address,
      );

      const connection = await pool.getConnection();
      const normalizedDescription = validatedPayload.parcel_description
        ? normalizeTextInput(validatedPayload.parcel_description)
        : "";
      const normalizedDepartmentAddress = normalizeDepartmentAddress(
        validatedPayload.department_address,
      );
      const qrToken = createParcelQrToken();

      try {
        await connection.beginTransaction();

        const conciergeUserId = await getConciergeUserId(
          connection,
          validatedPayload.concierge_name,
        );
        const residentUserId = await getOrCreateResident(
          connection,
          validatedPayload.resident_name,
          validatedPayload.department_address,
          validatedPayload.user_phone_number,
        );
        const businessId = await getOrCreateBusiness(connection, validatedPayload.business_name);
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
            validatedPayload.is_urgent,
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
    },
    {
      body: parcelPayloadSchema,
    },
  )
  .patch(
    "/parcels/:id",
    async ({ headers, params, body, set }) => {
      const session = await requireAppRole(headers.authorization, ["admin", "concierge"]);
      const validatedPayload = validateParcelPayload(body);
      const buildingId = await resolveBuildingIdForUserEmail(session.email);
      await assertDepartmentExistsInStructure(
        buildingId,
        validatedPayload.department_address,
      );

      const connection = await pool.getConnection();
      const normalizedDescription = validatedPayload.parcel_description
        ? normalizeTextInput(validatedPayload.parcel_description)
        : "";
      const normalizedDepartmentAddress = normalizeDepartmentAddress(
        validatedPayload.department_address,
      );

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

        const conciergeUserId = await getConciergeUserId(
          connection,
          validatedPayload.concierge_name,
        );
        const residentUserId = await getOrCreateResident(
          connection,
          validatedPayload.resident_name,
          validatedPayload.department_address,
          validatedPayload.user_phone_number,
        );
        const businessId = await getOrCreateBusiness(connection, validatedPayload.business_name);
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
            validatedPayload.is_urgent,
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
    },
    {
      body: parcelPayloadSchema,
    },
  )
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
  .post(
    "/resident/parcels/scan",
    async ({ headers, body }) => {
      const session = await requireAppRole(headers.authorization, ["resident"]);
      const parcelAccess = await assertResidentParcelAccess(session, body.qr_value);

      return {
        parcel: parcelAccess.parcel,
        current_user: buildDashboardCurrentUser(session),
      };
    },
    {
      body: residentParcelQrSchema,
    },
  )
  .post(
    "/resident/parcels/:id/claim",
    async ({ headers, params, body, set }) => {
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

        if (
          !departmentAddressesMatch(
            parcel.delivery_department_address ?? "",
            session.departmentAddress ?? "",
          )
        ) {
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
    },
    {
      body: residentParcelQrSchema,
    },
  )
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
  });
