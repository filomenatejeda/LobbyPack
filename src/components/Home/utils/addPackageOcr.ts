import { recognize } from "tesseract.js";
import type { AddPackageFormValues } from "../addPackageTypes";

const normalizeLine = (value: string) => value.replace(/\s+/g, " ").trim();

const cleanParsedValue = (value: string) =>
  value
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:.-]+|[\s:.-]+$/g, "")
    .trim();

// Extrae valores desde patrones "etiqueta: valor" cuando OCR conserva esa estructura.
const extractLabeledValue = (lines: string[], pattern: RegExp) => {
  const line = lines.find((item) => pattern.test(item));
  if (!line) return "";

  const cleanedLine = cleanParsedValue(line);
  const labeledMatch = cleanedLine.match(pattern);
  const value = labeledMatch?.groups?.value ?? cleanedLine.split(/[:-]/).slice(1).join(" ");
  return cleanParsedValue(value);
};

// Descarta direcciones completas y conserva solo destinos tipo departamento útiles para el formulario.
const extractLocationCandidate = (rawValue: string) => {
  const value = cleanParsedValue(rawValue);
  if (!value) return "";

  if (
    /(?:av|avenida|calle|pasaje|camino|ruta|domicilio|direccion|dirección|ubicacion|ubicación|ciudad|destino|remitente|pack id)/i.test(
      value,
    ) &&
    !/(?:casa|torre|depto|depto\.|departamento|oficina|local|bodega|block|bloc)\b/i.test(
      value,
    )
  ) {
    return "";
  }

  const locationPatterns = [
    /\b(torre\s*[a-z0-9]+\s*(?:depto|departamento|oficina|local|casa)?\s*[a-z0-9-]{0,8})\b/i,
    /\b((?:depto|departamento|oficina|local|casa|bodega|parcela)\s*[a-z0-9-]{1,10})\b/i,
    /\b([a-z]{1,3}\s*-\s*\d{1,4})\b/i,
    /\b([a-z]+\s*\d{1,4}[a-z]?)\b/i,
    /\b(\d{1,4}\s*[a-z])\b/i,
  ];

  for (const pattern of locationPatterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return cleanParsedValue(match[1]);
    }
  }

  return "";
};

// OCR suele mezclar nombres con ruido de courier; esto intenta quedarse solo con nombres probables.
const extractPersonNameCandidate = (line: string) => {
  const value = cleanParsedValue(line);
  if (!value) return "";

  if (
    /(?:remitente|pack id|despachar|ciudad de destino|referencia|domicilio|direccion|dirección|telefono|teléfono|mercado libre|mercado envios|mercado envíos|chilexpress|bluexpress|starken|dhl|fedex|correos)/i.test(
      value,
    )
  ) {
    return "";
  }

  const cleanedNoise = value
    .replace(/\)\s+[A-Z]{1,3}$/, ")")
    .replace(/\s+[A-Z]{1,3}$/, "");

  const directMatch = cleanedNoise.match(
    /^([A-Za-zÁÉÍÓÚÑáéíóúñ.'-]+(?:\s+[A-Za-zÁÉÍÓÚÑáéíóúñ.'-]+){1,5}(?:\s+\([A-Z0-9-]+\))?)/,
  );

  if (!directMatch?.[1]) {
    return "";
  }

  const candidate = cleanParsedValue(directMatch[1]);
  const wordCount = candidate.split(/\s+/).length;

  return wordCount >= 2 ? candidate : "";
};

// Ordena resultados OCR según confianza y cuántos campos útiles lograron recuperar.
const scoreDetectedValues = (
  text: string,
  values: Partial<AddPackageFormValues>,
  confidence: number,
) => {
  let score = confidence;

  if (values.residentName) score += 28;
  if (values.apartment) score += 34;
  if (values.phone) score += 14;
  if (values.company) score += 12;
  if (/\bcasa|torre|depto|departamento|oficina|local\b/i.test(values.apartment ?? "")) {
    score += 14;
  }
  if ((values.residentName ?? "").trim().split(/\s+/).length >= 2) {
    score += 8;
  }
  if (text.length >= 30) {
    score += 6;
  }

  return score;
};

// Filtra resultados OCR que se leen, pero que no sirven realmente para registrar un paquete.
export const hasUsefulDetectedText = (
  text: string,
  values: Partial<AddPackageFormValues>,
  confidence: number,
) => {
  const compactText = text.replace(/\s+/g, " ").trim();
  const usefulFields = Object.values(values).filter((value) => value && value.trim().length >= 3);
  const tokens = compactText
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
  const shortTokenRatio =
    tokens.length === 0
      ? 1
      : tokens.filter((token) => token.length <= 2).length / tokens.length;
  const hasLabelKeyword =
    /departamento|depto|torre|casa|oficina|local|destinatario|nombre|residente|recibe|compania|empresa|paquete|telefono|teléfono|celular|contacto/i.test(
      compactText,
    );
  const hasAddressPattern =
    /\b(?:torre\s*[a-z]\s*\d{1,4}|casa\s*[a-z0-9-]{1,8}|depto\s*[a-z0-9-]{1,8}|departamento\s*[a-z0-9-]{1,8}|oficina\s*[a-z0-9-]{1,8}|local\s*[a-z0-9-]{1,8}|[a-z]\s*\d{2,4})\b/i.test(
      compactText,
    );
  const strongFieldCount = usefulFields.length;
  const hasStrongLocation = Boolean(
    values.apartment && /\d|casa|torre|oficina|local/i.test(values.apartment),
  );
  const hasStrongName = Boolean(
    values.residentName && values.residentName.trim().split(/\s+/).length >= 2,
  );

  if (compactText.length < 10) return false;
  if (confidence < 24 && !hasStrongLocation && !hasStrongName) return false;
  if (tokens.length < 3) return false;
  if (shortTokenRatio > 0.6) return false;

  return strongFieldCount >= 1 || hasLabelKeyword || hasAddressPattern || hasStrongLocation;
};

// Crea variantes de imagen más ricas para dar más oportunidades a etiquetas difíciles.
async function createOcrVariants(source: Blob | File | string) {
  if (typeof source === "string") {
    return [source];
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(source);
  } catch {
    return [source];
  }

  const variants: Blob[] = [];
  const width = Math.max(bitmap.width, 1);
  const height = Math.max(bitmap.height, 1);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    return [source];
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(bitmap, 0, 0, width, height);

  const originalBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.96);
  });

  if (originalBlob) {
    variants.push(originalBlob);
  }

  const imageData = context.getImageData(0, 0, width, height);
  const enhancedImageData = new ImageData(new Uint8ClampedArray(imageData.data), width, height);

  for (let index = 0; index < enhancedImageData.data.length; index += 4) {
    const red = enhancedImageData.data[index];
    const green = enhancedImageData.data[index + 1];
    const blue = enhancedImageData.data[index + 2];
    const grayscale = red * 0.299 + green * 0.587 + blue * 0.114;
    const contrasted = grayscale < 96 ? 0 : grayscale > 188 ? 255 : Math.min(255, grayscale * 1.12);

    enhancedImageData.data[index] = contrasted;
    enhancedImageData.data[index + 1] = contrasted;
    enhancedImageData.data[index + 2] = contrasted;
  }

  context.putImageData(enhancedImageData, 0, 0);

  const enhancedBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.96);
  });

  if (enhancedBlob) {
    variants.push(enhancedBlob);
  }

  bitmap.close();
  return variants.length > 0 ? variants : [source];
}

// La variante rápida reduce imágenes grandes para acelerar la primera pasada de OCR.
async function createQuickOcrVariant(source: Blob | File | string) {
  if (typeof source === "string") {
    return source;
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(source);
  } catch {
    return source;
  }

  const longestSide = Math.max(bitmap.width, bitmap.height);
  const scale = longestSide > 1280 ? 1280 / longestSide : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    return source;
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/jpeg", 0.82);
  });

  return blob ?? source;
}

// Evalúa una o más variantes OCR y devuelve la mejor según el puntaje calculado.
export async function recognizeBestMatch(source: Blob | File | string, useFullPass: boolean) {
  const sources = useFullPass ? await createOcrVariants(source) : [await createQuickOcrVariant(source)];
  let bestMatch: {
    text: string;
    values: Partial<AddPackageFormValues>;
    confidence: number;
    score: number;
  } | null = null;

  for (const variant of sources) {
    const result = await recognize(variant, "spa+eng", {
      logger: () => undefined,
    });
    const detectedText = result.data.text.trim();
    const detectedValues = parseDetectedValuesFromText(detectedText);
    const confidence = result.data.confidence ?? 0;
    const score = scoreDetectedValues(detectedText, detectedValues, confidence);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        text: detectedText,
        values: detectedValues,
        confidence,
        score,
      };
    }
  }

  return bestMatch;
}

// Convierte el texto crudo de OCR en campos estructurados para el formulario de paquetes.
export function parseDetectedValuesFromText(rawText: string): Partial<AddPackageFormValues> {
  const text = normalizeLine(rawText);
  const lines = rawText
    .split("\n")
    .map((line) => normalizeLine(line))
    .filter(Boolean);
  const companyPatterns = [
    "Chilexpress",
    "Bluexpress",
    "Mercado Libre",
    "Mercado Envios",
    "Mercado Envíos",
    "CorreosChile",
    "Starken",
    "FedEx",
    "DHL",
  ];

  const company = companyPatterns.find((item) => text.toLowerCase().includes(item.toLowerCase()));

  const nameValue = extractLabeledValue(
    lines,
    /(?:nombre(?:\s+completo)?|destinatario|residente|recibe)\s*[:-]?\s*(?<value>.+)$/i,
  );
  const referenceValue = extractLabeledValue(lines, /(?:referencia)\s*[:-]?\s*(?<value>.+)$/i);
  const explicitDepartmentValue = extractLabeledValue(
    lines,
    /(?:depto|depto\.|departamento|torre|casa|oficina|local|bodega)\s*[:-]?\s*(?<value>.+)$/i,
  );
  const phoneValue = extractLabeledValue(
    lines,
    /(?:telefono|teléfono|celular|fono|movil|móvil|contacto)\s*[:-]?\s*(?<value>.+)$/i,
  );
  const apartmentFromReference = extractLocationCandidate(referenceValue);
  const apartmentFromExplicitField = extractLocationCandidate(explicitDepartmentValue);
  const genericApartmentMatch = text.match(
    /\b(?:torre\s*[a-z0-9]+\s*(?:depto|departamento|oficina|local|casa)?\s*[a-z0-9-]{0,8}|(?:depto|departamento|casa|oficina|local|bodega)\s*[a-z0-9-]{1,10}|[a-z]{1,3}\s*-\s*\d{1,4}|\d{1,4}\s*[a-z])\b/i,
  );
  const normalizedPhone =
    phoneValue.replace(/[^\d+]/g, "") ||
    text.match(/(?:\+?56)?\s*9\s*\d(?:[\s-]*\d){7,8}/)?.[0]?.replace(/[^\d+]/g, "") ||
    "";

  const implicitNameCandidate = lines.map(extractPersonNameCandidate).find(Boolean) || "";
  const firstLineBeforeAddressIndex = lines.findIndex((line) =>
    /(?:domicilio|direccion|dirección|ubicacion|ubicación|referencia)/i.test(line),
  );
  const contextualNameCandidate =
    firstLineBeforeAddressIndex > 0 ? cleanParsedValue(lines[firstLineBeforeAddressIndex - 1]) : "";

  const cleanedName =
    nameValue ||
    implicitNameCandidate ||
    (contextualNameCandidate && extractPersonNameCandidate(contextualNameCandidate)) ||
    lines.map(extractPersonNameCandidate).find(Boolean) ||
    "";

  return {
    apartment:
      apartmentFromReference ||
      apartmentFromExplicitField ||
      cleanParsedValue(genericApartmentMatch?.[0] ?? "") ||
      "",
    residentName: cleanParsedValue(cleanedName),
    phone: normalizedPhone,
    company: company ?? "",
  };
}
