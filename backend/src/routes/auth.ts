import { Elysia } from "elysia";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../db/pool";
import { AppError } from "../errors/appError";
import { normalizeTextInput } from "../utils/textEncoding";
import {
  adminEmailSchema,
  communityAddressAvailabilitySchema,
  communityRegistrationSchema,
} from "./shared/schemas";
import {
  createAddressFingerprint,
  ensureAdminAccountForCommunityRegistration,
  ensureCommunityRegistrationsTable,
} from "./shared/community";

export const authRoutes = new Elysia()
  .post(
    "/auth/check-community-address",
    async ({ body }) => {
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
          createAddressFingerprint(
            normalizedCountry,
            normalizedLocation,
            String(building.address_line),
          ) === addressFingerprint,
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
    },
    {
      body: communityAddressAvailabilitySchema,
    },
  )
  .post(
    "/auth/check-admin-email",
    async ({ body }) => {
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

      if (existingRegistrations.length > 0) {
        return { exists: true };
      }

      const [existingUsers] = await pool.query<RowDataPacket[]>(
        `
          SELECT id
          FROM Users
          WHERE LOWER(email) = LOWER(?)
          LIMIT 1
        `,
        [normalizedAdminEmail],
      );

      return { exists: existingUsers.length > 0 };
    },
    {
      body: adminEmailSchema,
    },
  )
  .post(
    "/auth/register-community",
    async ({ body, set }) => {
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
          createAddressFingerprint(
            normalizedCountry,
            normalizedLocation,
            String(building.address_line),
          ) === addressFingerprint,
      );

      if (
        matchingBuilding &&
        String(matchingBuilding.contact_email).toLowerCase() !== normalizedAdminEmail
      ) {
        throw new AppError(
          409,
          "CONFLICT",
          "Esta direccion ya tiene una cuenta administradora registrada.",
        );
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
        throw new AppError(
          409,
          "CONFLICT",
          "Esta direccion ya tiene una cuenta administradora registrada.",
        );
      }

      if (
        existingRegistration &&
        String(existingRegistration.address_fingerprint) !== addressFingerprint
      ) {
        throw new AppError(
          409,
          "CONFLICT",
          "Este correo ya esta asociado a otra direccion registrada.",
        );
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
    },
    {
      body: communityRegistrationSchema,
    },
  );
