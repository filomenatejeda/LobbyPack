import { describe, expect, test } from "bun:test";
import { ApiError } from "./apiError";

describe("ApiError", () => {
  test("stores status, code and optional details", () => {
    const error = new ApiError("Paquete no encontrado.", 404, "NOT_FOUND", {
      id: "parcel-001",
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ApiError");
    expect(error.message).toBe("Paquete no encontrado.");
    expect(error.status).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.details).toEqual({ id: "parcel-001" });
  });
});
