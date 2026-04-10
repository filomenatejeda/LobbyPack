import { useEffect, useId, useRef, useState } from "react";
import { recognize } from "tesseract.js";
import "./AddPackageModal.css";

type AddPackageFormValues = {
  departamento: string;
  nombre: string;
  telefono: string;
  compania: string;
  conserje: string;
};

type AddPackageModalProps = {
  onClose: () => void;
  onSubmit: (values: AddPackageFormValues) => void;
};

type AddMode = "chooser" | "camera" | "form";

const initialValues: AddPackageFormValues = {
  departamento: "",
  nombre: "",
  telefono: "",
  compania: "",
  conserje: "",
};

const hasUsefulDetectedText = (
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
  const hasStrongLocation = Boolean(values.departamento && /\d|casa|torre|oficina|local/i.test(values.departamento));
  const hasStrongName = Boolean(values.nombre && values.nombre.trim().split(/\s+/).length >= 2);

  if (compactText.length < 10) return false;
  if (confidence < 24 && !hasStrongLocation && !hasStrongName) return false;
  if (tokens.length < 3) return false;
  if (shortTokenRatio > 0.6) return false;

  return strongFieldCount >= 1 || hasLabelKeyword || hasAddressPattern || hasStrongLocation;
};

const normalizeLine = (value: string) => value.replace(/\s+/g, " ").trim();

const cleanParsedValue = (value: string) =>
  value
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:.-]+|[\s:.-]+$/g, "")
    .trim();

const extractLabeledValue = (lines: string[], pattern: RegExp) => {
  const line = lines.find((item) => pattern.test(item));
  if (!line) return "";

  const cleanedLine = cleanParsedValue(line);
  const labeledMatch = cleanedLine.match(pattern);
  const value = labeledMatch?.groups?.value ?? cleanedLine.split(/[:\-]/).slice(1).join(" ");
  return cleanParsedValue(value);
};

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

const scoreDetectedValues = (
  text: string,
  values: Partial<AddPackageFormValues>,
  confidence: number,
) => {
  let score = confidence;

  if (values.nombre) score += 28;
  if (values.departamento) score += 34;
  if (values.telefono) score += 14;
  if (values.compania) score += 12;
  if (/\bcasa|torre|depto|departamento|oficina|local\b/i.test(values.departamento ?? "")) {
    score += 14;
  }
  if ((values.nombre ?? "").trim().split(/\s+/).length >= 2) {
    score += 8;
  }
  if (text.length >= 30) {
    score += 6;
  }

  return score;
};

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

export default function AddPackageModal({ onClose, onSubmit }: AddPackageModalProps) {
  const [mode, setMode] = useState<AddMode>("chooser");
  const [values, setValues] = useState(initialValues);
  const [cameraMessage, setCameraMessage] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [isScanningLabel, setIsScanningLabel] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const cameraInputId = useId();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const stopCamera = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const startCamera = async () => {
      if (mode !== "camera") {
        stopCamera();
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Tu navegador no permite abrir la camara del dispositivo.");
        return;
      }

      setIsCameraLoading(true);
      setCameraError("");
      setCameraMessage("");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        stopCamera();
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraMessage("Camara conectada. Escaneando etiqueta automaticamente.");
      } catch {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });

          stopCamera();
          streamRef.current = fallbackStream;

          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play();
          }

          setCameraMessage("Camara conectada. Escaneando etiqueta automaticamente.");
        } catch {
          setCameraError(
            "No se pudo abrir la camara. Revisa los permisos del navegador o usa una imagen manualmente.",
          );
        }
      } finally {
        setIsCameraLoading(false);
      }
    };

    void startCamera();

    return () => {
      stopCamera();
    };
  }, [mode, cameraAttempt]);

  const handleChange = (field: keyof AddPackageFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const parseDetectedValues = (rawText: string): Partial<AddPackageFormValues> => {
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

    const company = companyPatterns.find((item) =>
      text.toLowerCase().includes(item.toLowerCase()),
    );

    const nameValue = extractLabeledValue(
      lines,
      /(?:nombre(?:\s+completo)?|destinatario|residente|recibe)\s*[:\-]?\s*(?<value>.+)$/i,
    );
    const referenceValue = extractLabeledValue(
      lines,
      /(?:referencia)\s*[:\-]?\s*(?<value>.+)$/i,
    );
    const explicitDepartmentValue = extractLabeledValue(
      lines,
      /(?:depto|depto\.|departamento|torre|casa|oficina|local|bodega)\s*[:\-]?\s*(?<value>.+)$/i,
    );
    const phoneValue = extractLabeledValue(
      lines,
      /(?:telefono|teléfono|celular|fono|movil|móvil|contacto)\s*[:\-]?\s*(?<value>.+)$/i,
    );
    const departmentFromReference = extractLocationCandidate(referenceValue);
    const departmentFromExplicitField = extractLocationCandidate(explicitDepartmentValue);
    const genericDepartmentMatch = text.match(
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
      (
        contextualNameCandidate &&
        extractPersonNameCandidate(contextualNameCandidate)
      ) ||
      lines.map(extractPersonNameCandidate).find(Boolean) ||
      "";

    return {
      departamento:
        departmentFromReference ||
        departmentFromExplicitField ||
        cleanParsedValue(genericDepartmentMatch?.[0] ?? "") ||
        "",
      nombre: cleanParsedValue(cleanedName),
      telefono: normalizedPhone,
      compania: company ?? "",
    };
  };

  const runOcr = async (source: Blob | File | string) => {
    setIsScanningLabel(true);
    setCameraError("");
    setCameraMessage("");

    try {
      const sources = await createOcrVariants(source);
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
        const detectedValues = parseDetectedValues(detectedText);
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

      const detectedText = bestMatch?.text ?? "";
      const detectedValues = bestMatch?.values ?? {};
      const confidence = bestMatch?.confidence ?? 0;

      if (!hasUsefulDetectedText(detectedText, detectedValues, confidence)) {
        setOcrText("");
        setCameraError(
          "No detecte bien la etiqueta. Intenta llenar el recuadro, acercarla un poco mas, evitar reflejos o subir una foto mas nitida.",
        );
        return;
      }

      setOcrText(detectedText);
      setValues((current) => ({
        ...current,
        ...detectedValues,
      }));
      setMode("form");
      setCameraMessage("Etiqueta leida. Revisa y corrige los datos antes de guardar.");
    } catch {
      setCameraError("No se pudo leer la etiqueta. Intenta con mejor luz, menos movimiento o una imagen mas cerca.");
    } finally {
      setIsScanningLabel(false);
    }
  };

  const captureFrameFromCamera = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement("canvas");
    const cropWidth = Math.floor(video.videoWidth * 0.88);
    const cropHeight = Math.floor(video.videoHeight * 0.58);
    const cropX = Math.floor((video.videoWidth - cropWidth) / 2);
    const cropY = Math.floor((video.videoHeight - cropHeight) / 2);

    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("No se pudo preparar la captura de imagen.");
      return null;
    }

    context.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("No se pudo capturar la imagen de la camara.");
      return null;
    }

    return blob;
  };

  const handleScanFromCamera = async () => {
    const blob = await captureFrameFromCamera();
    if (!blob) {
      return;
    }

    await runOcr(blob);
  };

  useEffect(() => {
    if (mode !== "camera" || isCameraLoading || isScanningLabel) {
      return;
    }

    const timer = window.setTimeout(() => {
      const video = videoRef.current;

      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      void handleScanFromCamera();
    }, 1400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mode, isCameraLoading, isScanningLabel, cameraAttempt]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
    setValues(initialValues);
  };

  return (
    <div className="addPackageOverlay" onClick={onClose}>
      <div className="addPackageModal" onClick={(event) => event.stopPropagation()}>
        <div className="addPackageHeader">
          <div>
            <p className="addPackageEyebrow">Nuevo paquete</p>
            <h3>Elige como quieres registrarlo</h3>
          </div>
          <button
            type="button"
            className="closeModalButton"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        {mode === "chooser" ? (
          <div className="addPackageChoiceGrid">
            <button
              type="button"
              className="addPackageChoice"
              onClick={() => setMode("camera")}
            >
              <span className="addPackageChoiceIcon">Camara</span>
              <strong>Usar camara</strong>
              <p>Toma una foto o selecciona una imagen del paquete para iniciar el registro.</p>
            </button>

            <button
              type="button"
              className="addPackageChoice"
              onClick={() => setMode("form")}
            >
              <span className="addPackageChoiceIcon">Form</span>
              <strong>Usar formulario</strong>
              <p>Ingresa manualmente los datos del paquete en un formulario rapido.</p>
            </button>
          </div>
        ) : null}

        {mode === "camera" ? (
          <div className="addPackageSection">
            <p className="addPackageText">
              Se intentara abrir la webcam del computador o la camara trasera del celular.
              Centra la etiqueta dentro del recuadro y evita reflejos para leer mejor casa,
              torre, nombre y cualquier otro dato.
            </p>

            <div className="cameraPreviewShell">
              <video
                ref={videoRef}
                className="cameraPreview"
                autoPlay
                muted
                playsInline
              />
              <div className="cameraGuideFrame" aria-hidden="true">
                <div className="cameraGuideText">Alinea aqui la etiqueta</div>
              </div>
              {isCameraLoading ? <p className="cameraStatus">Conectando camara...</p> : null}
              {!isCameraLoading && !cameraError ? (
                <p className="cameraStatus">Escaneando automaticamente...</p>
              ) : null}
              {cameraError ? <p className="cameraError">{cameraError}</p> : null}
            </div>

            <input
              id={cameraInputId}
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="cameraInput"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  setCameraMessage("");
                  return;
                }

                setCameraMessage(`Imagen seleccionada: ${file.name}`);
                setCameraError("");
                void runOcr(file);
              }}
            />

            <div className="addPackageActions">
              <button
                type="button"
                className="modalSecondaryButton"
                onClick={() => setMode("chooser")}
              >
                Volver
              </button>
              <button
                type="button"
                className="modalSecondaryButton"
                onClick={() => cameraInputRef.current?.click()}
              >
                Subir imagen
              </button>
              <button
                type="button"
                className="modalSecondaryButton"
                onClick={() => setCameraAttempt((current) => current + 1)}
              >
                Reintentar camara
              </button>
            </div>

            {cameraMessage ? <p className="cameraMessage">{cameraMessage}</p> : null}
            {ocrText ? (
              <div className="ocrPreview">
                <strong>Texto detectado</strong>
                <pre>{ocrText}</pre>
              </div>
            ) : null}

            <button
              type="button"
              className="linkLikeButton"
              onClick={() => setMode("form")}
            >
              Continuar con formulario
            </button>
          </div>
        ) : null}

        {mode === "form" ? (
          <form className="addPackageForm" onSubmit={handleSubmit}>
            <div className="addPackageFormGrid">
              <label className="addPackageField">
                <span>Departamento</span>
                <input
                  type="text"
                  value={values.departamento}
                  onChange={(event) => handleChange("departamento", event.target.value)}
                  placeholder="Torre A 302"
                  required
                />
              </label>

              <label className="addPackageField">
                <span>Nombre</span>
                <input
                  type="text"
                  value={values.nombre}
                  onChange={(event) => handleChange("nombre", event.target.value)}
                  placeholder="Nombre del residente"
                  required
                />
              </label>

              <label className="addPackageField">
                <span>Compania</span>
                <input
                  type="text"
                  value={values.compania}
                  onChange={(event) => handleChange("compania", event.target.value)}
                  placeholder="Chilexpress"
                  required
                />
              </label>

              <label className="addPackageField">
                <span>Telefono</span>
                <input
                  type="tel"
                  value={values.telefono}
                  onChange={(event) => handleChange("telefono", event.target.value)}
                  placeholder="+56912345678"
                />
              </label>

              <label className="addPackageField">
                <span>Conserje</span>
                <input
                  type="text"
                  value={values.conserje}
                  onChange={(event) => handleChange("conserje", event.target.value)}
                  placeholder="Nombre de quien recibe"
                  required
                />
              </label>
            </div>

            {ocrText ? (
              <div className="ocrHint">
                <strong>Texto de la etiqueta:</strong>
                <p>Se rellenaron los campos detectados automaticamente. Revisa antes de guardar.</p>
              </div>
            ) : null}

            <div className="addPackageActions">
              <button type="button" className="modalSecondaryButton" onClick={() => setMode("chooser")}>
                Volver
              </button>
              <button type="submit" className="modalPrimaryButton">
                Guardar paquete
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
