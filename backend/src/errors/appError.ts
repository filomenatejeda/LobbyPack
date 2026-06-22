export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "EXTERNAL_SERVICE_ERROR"
  | "INTERNAL_ERROR";

export type AppErrorResponse = {
  message: string;
  error: {
    code: AppErrorCode;
    message: string;
    status: number;
    details?: unknown;
  };
};

export function getErrorCodeForStatus(status: number): AppErrorCode {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 502) return "EXTERNAL_SERVICE_ERROR";
  return "INTERNAL_ERROR";
}

export class AppError extends Error {
  status: number;
  code: AppErrorCode;
  details?: unknown;

  constructor(
    status: number,
    code: AppErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function createErrorResponse(error: AppError): AppErrorResponse {
  return {
    message: error.message,
    error: {
      code: error.code,
      message: error.message,
      status: error.status,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
  };
}

export function createInternalErrorResponse(): AppErrorResponse {
  return createErrorResponse(
    new AppError(
      500,
      "INTERNAL_ERROR",
      "Ocurrio un error inesperado. Intentalo nuevamente.",
    ),
  );
}
