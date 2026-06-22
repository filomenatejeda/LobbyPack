import { describe, expect, test } from "bun:test";
import {
  AppError,
  createErrorResponse,
  createInternalErrorResponse,
  getErrorCodeForStatus,
} from "./appError";

describe("AppError", () => {
  test("maps common HTTP status codes to stable error codes", () => {
    expect(getErrorCodeForStatus(400)).toBe("VALIDATION_ERROR");
    expect(getErrorCodeForStatus(401)).toBe("UNAUTHORIZED");
    expect(getErrorCodeForStatus(403)).toBe("FORBIDDEN");
    expect(getErrorCodeForStatus(404)).toBe("NOT_FOUND");
    expect(getErrorCodeForStatus(409)).toBe("CONFLICT");
    expect(getErrorCodeForStatus(502)).toBe("EXTERNAL_SERVICE_ERROR");
    expect(getErrorCodeForStatus(500)).toBe("INTERNAL_ERROR");
  });

  test("creates a backwards-compatible error response", () => {
    const error = new AppError(404, "NOT_FOUND", "Paquete no encontrado.", {
      id: "parcel-001",
    });

    expect(createErrorResponse(error)).toEqual({
      message: "Paquete no encontrado.",
      error: {
        code: "NOT_FOUND",
        message: "Paquete no encontrado.",
        status: 404,
        details: {
          id: "parcel-001",
        },
      },
    });
  });

  test("creates a generic internal error response", () => {
    expect(createInternalErrorResponse()).toEqual({
      message: "Ocurrio un error inesperado. Intentalo nuevamente.",
      error: {
        code: "INTERNAL_ERROR",
        message: "Ocurrio un error inesperado. Intentalo nuevamente.",
        status: 500,
      },
    });
  });
});
