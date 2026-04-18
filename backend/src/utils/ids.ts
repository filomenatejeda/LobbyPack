export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createResidentEmail(resident_name: string) {
  const normalizedName = resident_name
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, ".");

  return `${normalizedName || "resident"}.${Date.now()}@lobbypack.demo`;
}
