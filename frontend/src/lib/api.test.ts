import { afterEach, describe, expect, test } from "bun:test";
import { ApiError } from "./apiError";
import { apiRequest } from "./api";

const originalFetch = globalThis.fetch;

function mockJsonResponse(status: number, body: unknown) {
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    )) as unknown as typeof fetch;
}

describe("apiRequest", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns JSON for successful responses", async () => {
    mockJsonResponse(200, { ok: true });

    const result = await apiRequest<{ ok: boolean }>("/api/health");

    expect(result).toEqual({ ok: true });
  });

  test("returns null for empty successful responses", async () => {
    globalThis.fetch = (() =>
      Promise.resolve(new Response(null, { status: 204 }))) as unknown as typeof fetch;

    const result = await apiRequest<null>("/api/parcels/parcel-001", {
      method: "DELETE",
    });

    expect(result).toBeNull();
  });

  test("throws ApiError from the standardized backend error format", async () => {
    mockJsonResponse(404, {
      message: "Paquete no encontrado.",
      error: {
        code: "NOT_FOUND",
        message: "Paquete no encontrado.",
        status: 404,
        details: { id: "parcel-001" },
      },
    });

    try {
      await apiRequest("/api/parcels/parcel-001");
      throw new Error("apiRequest should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).message).toBe("Paquete no encontrado.");
      expect((error as ApiError).status).toBe(404);
      expect((error as ApiError).code).toBe("NOT_FOUND");
      expect((error as ApiError).details).toEqual({ id: "parcel-001" });
    }
  });

  test("keeps compatibility with legacy error responses", async () => {
    mockJsonResponse(409, { message: "El paquete ya fue retirado." });

    try {
      await apiRequest("/api/parcels/parcel-001/claim", { method: "POST" });
      throw new Error("apiRequest should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).message).toBe("El paquete ya fue retirado.");
      expect((error as ApiError).status).toBe(409);
      expect((error as ApiError).code).toBe("UNKNOWN_ERROR");
    }
  });
});
