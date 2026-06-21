import { Elysia } from "elysia";
import { AuthError } from "../auth/session";
import {
  AppError,
  createErrorResponse,
  createInternalErrorResponse,
} from "../errors/appError";
import { authRoutes } from "./auth";
import { dashboardRoutes } from "./dashboard";
import { issuesRoutes } from "./issues";
import { messageRoutes } from "./messages";
import { parcelRoutes } from "./parcels";
import { settingsRoutes } from "./settings";

export const api = new Elysia({ prefix: "/api" })
  .onError(({ error, set }) => {
    if (error instanceof AppError || error instanceof AuthError) {
      set.status = error.status;
      return createErrorResponse(error);
    }

    const maybeValidationError = error as Error & {
      code?: string;
      status?: number;
      all?: unknown;
    };

    if (maybeValidationError.code === "VALIDATION") {
      const validationError = new AppError(
        400,
        "VALIDATION_ERROR",
        "La solicitud no cumple con el formato esperado.",
        maybeValidationError.all,
      );
      set.status = validationError.status;
      return createErrorResponse(validationError);
    }

    console.error("Unhandled API error", error);
    set.status = 500;
    return createInternalErrorResponse();
  })
  .use(authRoutes)
  .use(parcelRoutes)
  .use(issuesRoutes)
  .use(messageRoutes)
  .use(settingsRoutes)
  .use(dashboardRoutes);
