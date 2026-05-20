import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../db/pool";
import { createSequentialId } from "../utils/ids";

export type AppRole = "admin" | "concierge" | "resident";

export type AuthSession = {
  userId: string;
  email: string;
  role: AppRole;
  supabaseUserId: string;
  residentName?: string;
  departmentAddress?: string;
};

type AppUserRow = RowDataPacket & {
  id: string;
  email: string;
  role: AppRole;
};

type ResidentProfileRow = RowDataPacket & {
  resident_name: string;
  department_address: string;
};

type CommunityRegistrationRoleRow = RowDataPacket & {
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
};

type SupabaseUserResponse = {
  id?: string;
  email?: string;
};

export class AuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function getBearerToken(authorization?: string) {
  if (!authorization) {
    throw new AuthError(401, "Falta el token de autorizacion.");
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AuthError(401, "La cabecera de autorizacion debe usar un token Bearer.");
  }

  return token;
}

function getSupabaseConfig() {
  const supabaseUrl = (
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    ""
  ).replace(/\/+$/, "");
  const supabasePublishableKey =
    process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    "";

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new AuthError(
      500,
      "Falta la configuracion de Supabase para validar la sesion autenticada.",
    );
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}

async function fetchSupabaseUser(accessToken: string) {
  const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new AuthError(401, "La sesion es invalida o ha expirado.");
  }

  const payload = (await response.json()) as SupabaseUserResponse;
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const supabaseUserId = typeof payload.id === "string" ? payload.id : "";

  if (!email || !supabaseUserId) {
    throw new AuthError(401, "La sesion autenticada esta incompleta.");
  }

  return {
    email,
    supabaseUserId,
  };
}

async function createAdminFromCommunityRegistration(email: string) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [registrations] = await connection.query<CommunityRegistrationRoleRow[]>(
      `
        SELECT admin_email, admin_first_name, admin_last_name
        FROM CommunityRegistrations
        WHERE LOWER(admin_email) = LOWER(?)
        LIMIT 1
      `,
      [email],
    );

    const registration = registrations[0];
    if (!registration) {
      await connection.rollback();
      return null;
    }

    const [existingUsers] = await connection.query<AppUserRow[]>(
      `
        SELECT id, email, role
        FROM Users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
        FOR UPDATE
      `,
      [email],
    );

    const existingUser = existingUsers[0];
    const adminName = `${registration.admin_first_name} ${registration.admin_last_name}`.trim();

    if (existingUser) {
      if (existingUser.role !== "admin") {
        await connection.rollback();
        return existingUser;
      }

      await connection.query(
        `
          INSERT INTO Admins (user_id, admin_name, admin_password_hash)
          VALUES (?, ?, NULL)
          ON DUPLICATE KEY UPDATE admin_name = VALUES(admin_name)
        `,
        [existingUser.id, adminName || existingUser.email],
      );

      await connection.commit();
      return existingUser;
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
      [adminId, email],
    );

    await connection.query(
      `
        INSERT INTO Admins (user_id, admin_name, admin_password_hash)
        VALUES (?, ?, NULL)
      `,
      [adminId, adminName || email],
    );

    await connection.commit();
    return {
      id: adminId,
      email,
      role: "admin",
    } as AppUserRow;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function requireAppRole(
  authorization: string | undefined,
  allowedRoles: readonly AppRole[],
) {
  const accessToken = getBearerToken(authorization);
  const { email, supabaseUserId } = await fetchSupabaseUser(accessToken);

  const [users] = await pool.query<AppUserRow[]>(
    `
      SELECT id, email, role
      FROM Users
      WHERE LOWER(email) = ?
      LIMIT 1
    `,
    [email],
  );

  const user = users[0] ?? (await createAdminFromCommunityRegistration(email));

  if (!user) {
    throw new AuthError(403, "Tu cuenta no tiene acceso a LobbyPack.");
  }

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(403, "No tienes permiso para realizar esta accion.");
  }

  if (user.role !== "resident") {
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      supabaseUserId,
    } satisfies AuthSession;
  }

  const [profiles] = await pool.query<ResidentProfileRow[]>(
    `
      SELECT resident_name, department_address
      FROM Residents
      WHERE user_id = ?
      LIMIT 1
    `,
    [user.id],
  );

  const profile = profiles[0];

  if (!profile) {
    throw new AuthError(403, "La cuenta residente no tiene un perfil asociado.");
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    supabaseUserId,
    residentName: profile.resident_name,
    departmentAddress: profile.department_address,
  } satisfies AuthSession;
}
