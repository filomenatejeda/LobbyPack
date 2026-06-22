import { afterEach, describe, expect, test } from "bun:test";
import { createResidentEmail, createSequentialId } from "./ids";

const originalDateNow = Date.now;

function createConnectionMock(rows: Array<{ id: string }> = [], lockAcquired = 1) {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];

  return {
    calls,
    connection: {
      query: async (sql: string, params?: unknown[]) => {
        calls.push({ sql, params });

        if (sql.includes("GET_LOCK")) {
          return [[{ acquired: lockAcquired }]];
        }

        if (sql.includes("RELEASE_LOCK")) {
          return [[]];
        }

        return [rows];
      },
    },
  };
}

describe("id utils", () => {
  afterEach(() => {
    Date.now = originalDateNow;
  });

  test("creates the first sequential id when no previous id exists", async () => {
    const { connection } = createConnectionMock();

    const result = await createSequentialId(connection as never, {
      tableName: "Parcels",
      columnName: "id",
      prefix: "parcel",
      padLength: 3,
    });

    expect(result).toBe("parcel-001");
  });

  test("increments the latest sequential id", async () => {
    const { connection } = createConnectionMock([{ id: "parcel-009" }]);

    const result = await createSequentialId(connection as never, {
      tableName: "Parcels",
      columnName: "id",
      prefix: "parcel",
      padLength: 3,
    });

    expect(result).toBe("parcel-010");
  });

  test("throws when the id lock cannot be acquired", async () => {
    const { connection } = createConnectionMock([], 0);

    await expect(
      createSequentialId(connection as never, {
        tableName: "Parcels",
        columnName: "id",
        prefix: "parcel",
        padLength: 3,
      }),
    ).rejects.toThrow("Could not acquire ID lock for parcel");
  });

  test("releases the lock after creating an id", async () => {
    const { calls, connection } = createConnectionMock();

    await createSequentialId(connection as never, {
      tableName: "Parcels",
      columnName: "id",
      prefix: "parcel",
      padLength: 3,
    });

    expect(calls.some((call) => call.sql.includes("RELEASE_LOCK"))).toBe(true);
  });
});
