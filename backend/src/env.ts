import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function parseEnvLine(line: string) {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmedLine.indexOf("=");

  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmedLine.slice(0, separatorIndex).trim();
  let value = trimmedLine.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

export function loadRootEnv() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const rootEnvPath = resolve(currentDir, "../../.env");

  if (!existsSync(rootEnvPath)) {
    return;
  }

  const envContents = readFileSync(rootEnvPath, "utf8");

  for (const line of envContents.split(/\r?\n/)) {
    const parsedLine = parseEnvLine(line);

    if (!parsedLine || process.env[parsedLine.key] !== undefined) {
      continue;
    }

    process.env[parsedLine.key] = parsedLine.value;
  }
}

loadRootEnv();
