import { Elysia } from "elysia";
import type { RowDataPacket } from "mysql2/promise";
import { requireAppRole } from "../../auth/session";
import { pool } from "../../db/pool";
import { AppError } from "../../errors/appError";
import {
  departmentAddressesMatch,
  normalizeDepartmentAddress,
} from "../../utils/departments";
import {
  sendParcelArrivalEmailNotifications,
  sendParcelClaimedEmailNotifications,
} from "../../utils/email";
import { normalizeTextInput } from "../../utils/textEncoding";
import {
  sendParcelClaimedWhatsappNotifications,
  sendParcelWhatsappNotifications,
} from "../../utils/whatsapp";
import { parcelPayloadSchema, residentParcelQrSchema, residentWithdrawalPinSchema } from "../shared/schemas";
import type { ParcelClaimRow } from "../shared/types";
import { getBuildingPreferences, resolveBuildingIdForUserEmail } from "../shared/community";
import { BUILDING_ID } from "../shared/constants";
import { findResidentByDepartmentAndWithdrawalPin, listResidentsByDepartment } from "../shared/residents";
import { assertDepartmentExistsInStructure } from "../shared/structure";
import { validateParcelPayload } from "./validation";
import {
  assertResidentParcelAccess,
  buildDashboardCurrentUser,
  buildParcelQrValue,
  createParcelQrToken,
  createSequentialCode,
  createSequentialId,
  findResidentForDepartment,
  getOrCreateBusiness,
  getParcelById,
  listParcels,
} from "./service";

export const parcelRoutes = new Elysia()
  .get("/parcels", async ({ headers, query }) => {
    const session = await requireAppRole(headers.authorization, ["admin", "concierge"]);
    const buildingId = await resolveBuildingIdForUserEmail(session.email);

    const parcelStatus = query.parcel_status === "claimed" ? "claimed" : "pending";
    return listParcels(parcelStatus, { buildingId });
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

        const residentUserId = await findResidentForDepartment(
          connection,
          validatedPayload.department_address,
          buildingId,
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
              building_id,
              delivery_department_address,
              parcel_recipient_name,
              parcel_recipient_phone,
              withdrawal_code,
              qr_code_url,
              qr_token,
              parcel_status,
              parcel_description,
              is_urgent
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
          `,
          [
            parcelId,
            session.userId,
            residentUserId,
            businessId,
            buildingId,
            normalizedDepartmentAddress,
            validatedPayload.resident_name,
            validatedPayload.user_phone_number,
            withdrawalCode,
            buildParcelQrValue(parcelId, qrToken),
            qrToken,
            normalizedDescription,
            validatedPayload.is_urgent,
          ],
        );

        await connection.commit();
        set.status = 201;
        const createdParcel = await getParcelById(parcelId);
        const preferences = await getBuildingPreferences(buildingId);

        if (preferences.packageNotifications) {
          try {
            const departmentResidents = await listResidentsByDepartment(
              validatedPayload.department_address,
              buildingId,
            );

            const notificationResults = await sendParcelWhatsappNotifications({
              recipients: departmentResidents,
              departmentAddress: validatedPayload.department_address,
            });
            const emailResults = await sendParcelArrivalEmailNotifications({
              recipients: departmentResidents,
              departmentAddress: validatedPayload.department_address,
              parcelId,
            });

            const failedNotifications = notificationResults.filter(
              (result) => result.status === "rejected",
            );
            const failedEmailNotifications = emailResults.filter(
              (result) => result.status === "rejected",
            );

            if (failedNotifications.length > 0) {
              console.warn(
                `No se pudieron enviar ${failedNotifications.length} notificaciones de WhatsApp para ${parcelId}.`,
                failedNotifications,
              );
            }

            if (failedEmailNotifications.length > 0) {
              console.warn(
                `No se pudieron enviar ${failedEmailNotifications.length} notificaciones de email para ${parcelId}.`,
                failedEmailNotifications,
              );
            }
          } catch (notificationError) {
            console.warn(
              `No se pudieron preparar las notificaciones de WhatsApp para ${parcelId}.`,
              notificationError,
            );
          }
        }

        return createdParcel;
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
            SELECT p.id, p.parcel_status
            FROM Parcels p
            WHERE p.id = ?
              AND p.building_id = ?
            LIMIT 1
          `,
          [params.id, buildingId],
        );

        if (parcels.length === 0) {
          throw new AppError(404, "NOT_FOUND", "Paquete no encontrado.");
        }

        const residentUserId = await findResidentForDepartment(
          connection,
          validatedPayload.department_address,
          buildingId,
        );
        const businessId = await getOrCreateBusiness(connection, validatedPayload.business_name);
        const qrToken =
          String(parcels[0].parcel_status) === "pending" ? createParcelQrToken() : null;

        await connection.query(
          `
            UPDATE Parcels
            SET
              id_resident = ?,
              id_business = ?,
              building_id = ?,
              delivery_department_address = ?,
              parcel_recipient_name = ?,
              parcel_recipient_phone = ?,
              qr_code_url = COALESCE(?, qr_code_url),
              qr_token = COALESCE(?, qr_token),
              resident_claim_confirmed_at = CASE
                WHEN ? IS NULL THEN resident_claim_confirmed_at
                ELSE NULL
              END,
              resident_claimed_by_user_id = CASE
                WHEN ? IS NULL THEN resident_claimed_by_user_id
                ELSE NULL
              END,
              parcel_description = ?,
              is_urgent = ?
            WHERE id = ?
          `,
          [
            residentUserId,
            businessId,
            buildingId,
            normalizedDepartmentAddress,
            validatedPayload.resident_name,
            validatedPayload.user_phone_number,
            qrToken ? buildParcelQrValue(params.id, qrToken) : null,
            qrToken,
            qrToken,
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
    const buildingId = await resolveBuildingIdForUserEmail(session.email);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query<RowDataPacket[]>(
        `
          SELECT p.id, p.parcel_status, p.resident_claim_confirmed_at
          FROM Parcels p
          WHERE p.id = ?
            AND p.building_id = ?
          LIMIT 1
        `,
        [params.id, buildingId],
      );

      if (result.length === 0) {
        throw new AppError(404, "NOT_FOUND", "Paquete no encontrado.");
      }

      if (String(result[0].parcel_status) !== "pending") {
        throw new AppError(409, "CONFLICT", "El paquete ya fue retirado.");
      }

      if (!result[0].resident_claim_confirmed_at) {
        throw new AppError(
          409,
          "CONFLICT",
          "El residente debe confirmar el retiro antes de entregar el paquete.",
        );
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
            claimed_by_user_id = resident_claimed_by_user_id
          WHERE id = ?
        `,
        [withdrawalCode, params.id],
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const claimedParcel = await getParcelById(params.id);

    if (claimedParcel) {
      const preferences = await getBuildingPreferences(buildingId);

      if (preferences.packageNotifications) {
        try {
          const departmentResidents = await listResidentsByDepartment(
            claimedParcel.department_address,
            buildingId,
          );

          const notificationResults = await sendParcelClaimedWhatsappNotifications({
            recipients: departmentResidents,
            departmentAddress: claimedParcel.department_address,
            parcelId: claimedParcel.id,
            claimedByName: claimedParcel.claimed_by_name || "un residente",
          });
          const emailResults = await sendParcelClaimedEmailNotifications({
            recipients: departmentResidents,
            departmentAddress: claimedParcel.department_address,
            parcelId: claimedParcel.id,
            claimedByName: claimedParcel.claimed_by_name || "un residente",
          });

          const failedNotifications = notificationResults.filter(
            (result) => result.status === "rejected",
          );
          const failedEmailNotifications = emailResults.filter(
            (result) => result.status === "rejected",
          );

          if (failedNotifications.length > 0) {
            console.warn(
              `No se pudieron enviar ${failedNotifications.length} notificaciones de retiro por WhatsApp para ${claimedParcel.id}.`,
              failedNotifications,
            );
          }

          if (failedEmailNotifications.length > 0) {
            console.warn(
              `No se pudieron enviar ${failedEmailNotifications.length} notificaciones de retiro por email para ${claimedParcel.id}.`,
              failedEmailNotifications,
            );
          }
        } catch (notificationError) {
          console.warn(
            `No se pudieron preparar las notificaciones de retiro por WhatsApp para ${claimedParcel.id}.`,
            notificationError,
          );
        }
      }
    }

    return claimedParcel;
  })
  .post(
    "/parcels/:id/claim-with-pin",
    async ({ headers, params, body }) => {
      const session = await requireAppRole(headers.authorization, ["admin", "concierge"]);
      const buildingId = await resolveBuildingIdForUserEmail(session.email);
      const preferences = await getBuildingPreferences(buildingId);

      if (preferences.qrAccess) {
        throw new AppError(
          409,
          "CONFLICT",
          "La validacion por PIN se usa cuando el acceso con QR esta desactivado.",
        );
      }

      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [parcels] = await connection.query<
          Array<
            RowDataPacket & {
              id: string;
              parcel_status: "pending" | "claimed";
              delivery_department_address: string | null;
            }
          >
        >(
          `
            SELECT id, parcel_status, delivery_department_address
            FROM Parcels
            WHERE id = ?
              AND building_id = ?
            LIMIT 1
            FOR UPDATE
          `,
          [params.id, buildingId],
        );
        const parcel = parcels[0];

        if (!parcel) {
          throw new AppError(404, "NOT_FOUND", "Paquete no encontrado.");
        }

        if (parcel.parcel_status !== "pending") {
          throw new AppError(409, "CONFLICT", "El paquete ya fue retirado.");
        }

        const resident = await findResidentByDepartmentAndWithdrawalPin(
          parcel.delivery_department_address ?? "",
          body.withdrawal_pin,
          buildingId,
        );

        if (!resident) {
          throw new AppError(
            403,
            "FORBIDDEN",
            "PIN invalido para el departamento de este paquete.",
          );
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
          [withdrawalCode, resident.user_id, params.id],
        );

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

      const claimedParcel = await getParcelById(params.id);

      if (claimedParcel && preferences.packageNotifications) {
        try {
          const departmentResidents = await listResidentsByDepartment(
            claimedParcel.department_address,
            buildingId,
          );

          await Promise.allSettled([
            ...await sendParcelClaimedWhatsappNotifications({
              recipients: departmentResidents,
              departmentAddress: claimedParcel.department_address,
              parcelId: claimedParcel.id,
              claimedByName: claimedParcel.claimed_by_name || "un residente",
            }),
            ...await sendParcelClaimedEmailNotifications({
              recipients: departmentResidents,
              departmentAddress: claimedParcel.department_address,
              parcelId: claimedParcel.id,
              claimedByName: claimedParcel.claimed_by_name || "un residente",
            }),
          ]);
        } catch (notificationError) {
          console.warn(
            `No se pudieron preparar las notificaciones de retiro por PIN para ${claimedParcel.id}.`,
            notificationError,
          );
        }
      }

      return claimedParcel;
    },
    {
      body: residentWithdrawalPinSchema,
    },
  )
  .post(
    "/resident/parcels/scan",
    async ({ headers, body }) => {
      const session = await requireAppRole(headers.authorization, ["resident"]);
      const buildingId = await resolveBuildingIdForUserEmail(session.email);
      const preferences = await getBuildingPreferences(buildingId);
      const dataBuildingId =
        session.buildingId && session.buildingId !== BUILDING_ID
          ? session.buildingId
          : undefined;

      if (!preferences.qrAccess) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "El retiro por QR esta desactivado para esta comunidad.",
        );
      }

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
      const buildingId = await resolveBuildingIdForUserEmail(session.email);
      const preferences = await getBuildingPreferences(buildingId);
      const dataBuildingId =
        session.buildingId && session.buildingId !== BUILDING_ID
          ? session.buildingId
          : undefined;

      if (!preferences.qrAccess) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "El retiro por QR esta desactivado para esta comunidad.",
        );
      }

      const parcelAccess = await assertResidentParcelAccess(session, body.qr_value);

      if (parcelAccess.parcelId !== params.id) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "El paquete indicado no coincide con el QR escaneado.",
        );
      }

      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [rows] = await connection.query<ParcelClaimRow[]>(
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
            FOR UPDATE
          `,
          [params.id, dataBuildingId ?? null, dataBuildingId ?? null],
        );

        const parcel = rows[0];

        if (!parcel || !parcel.qr_token || parcel.qr_token !== parcelAccess.qrToken) {
          throw new AppError(
            404,
            "NOT_FOUND",
            "No se encontro un paquete asociado a ese QR.",
          );
        }

        if (parcel.parcel_status !== "pending") {
          throw new AppError(
            409,
            "CONFLICT",
            "Ese paquete ya fue retirado o ya no esta disponible.",
          );
        }

        if (
          !departmentAddressesMatch(
            parcel.delivery_department_address ?? "",
            session.departmentAddress ?? "",
          )
        ) {
          throw new AppError(
            403,
            "FORBIDDEN",
            "Ese QR no corresponde al departamento de tu cuenta.",
          );
        }

        await connection.query(
          `
            UPDATE Parcels
            SET
              resident_claim_confirmed_at = COALESCE(resident_claim_confirmed_at, CURRENT_TIMESTAMP),
              resident_claimed_by_user_id = COALESCE(resident_claimed_by_user_id, ?)
            WHERE id = ?
          `,
          [session.userId, params.id],
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
    const session = await requireAppRole(headers.authorization, ["admin", "concierge"]);
    const buildingId = await resolveBuildingIdForUserEmail(session.email);

    await pool.query(
      `
        DELETE p
        FROM Parcels p
        WHERE p.id = ?
          AND p.building_id = ?
      `,
      [params.id, buildingId],
    );

    set.status = 204;
    return null;
  });
