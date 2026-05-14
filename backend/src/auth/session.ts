import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../db/pool";

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

  const user = users[0];

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
