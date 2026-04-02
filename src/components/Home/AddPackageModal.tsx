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
    /departamento|depto|torre|destinatario|nombre|residente|recibe|compania|empresa|paquete|telefono|teléfono|celular|contacto/i.test(
      compactText,
    );
  const hasAddressPattern =
    /\b(?:torre\s*[a-z]\s*\d{2,4}|depto\s*[a-z0-9-]{2,8}|departamento\s*[a-z0-9-]{2,8}|[a-z]\s*\d{2,4})\b/i.test(
      compactText,
    );
  const strongFieldCount = usefulFields.length;

  if (compactText.length < 10) return false;
  if (confidence < 38) return false;
  if (tokens.length < 3) return false;
  if (shortTokenRatio > 0.45) return false;

  return strongFieldCount >= 1 || hasLabelKeyword || hasAddressPattern;
};

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

        setCameraMessage("Camara conectada. En computador usa la webcam; en celular se prioriza la trasera.");
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

          setCameraMessage("Camara conectada con configuracion automatica del dispositivo.");
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
    const text = rawText.replace(/\s+/g, " ").trim();
    const lines = rawText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const findLabeledValue = (pattern: RegExp) => {
      const line = lines.find((item) => pattern.test(item));
      if (!line) return "";
      return line.split(/[:\-]/).slice(1).join(" ").trim();
    };
    const extractDepartmentCandidate = (value: string) => {
      const cleanedValue = value.replace(/\s+/g, " ").trim();
      const match =
        cleanedValue.match(
          /\b(?:depto|depto\.|departamento)\s*([a-z]?\d{1,4}[a-z]?(?:\s*sector\s*\d+)?)\b/i,
        ) ??
        cleanedValue.match(/\b([a-z]?\d{1,4}[a-z]?(?:\s*sector\s*\d+)?)\b/i);

      if (!match?.[1]) return "";

      const candidate = match[1].trim();
      return /\d/.test(candidate) ? candidate : "";
    };

    const companyPatterns = [
      "Chilexpress",
      "Bluexpress",
      "Mercado Envios",
      "CorreosChile",
      "Starken",
      "FedEx",
      "DHL",
    ];

    const company = companyPatterns.find((item) =>
      text.toLowerCase().includes(item.toLowerCase()),
    );

    const nameValue = findLabeledValue(
      /(?:nombre(?:\s+completo)?|destinatario|residente|recibe)\s*[:\-]/i,
    );
    const addressValue = findLabeledValue(/(?:direccion|dirección|piso)\s*[:\-]/i);
    const explicitDepartmentValue = findLabeledValue(/(?:depto|departamento)\s*[:\-]/i);
    const phoneValue = findLabeledValue(/(?:telefono|teléfono|celular|fono|movil|móvil|contacto)\s*[:\-]/i);
    const departmentFromAddress = extractDepartmentCandidate(addressValue);
    const departmentFromExplicitField = /\d/.test(explicitDepartmentValue)
      ? extractDepartmentCandidate(explicitDepartmentValue)
      : "";
    const genericDepartmentMatch =
      text.match(/\b(?:torre\s*[a-z]\s*\d{2,4}|[a-z]?\d{2,4}[a-z]?(?:\s*sector\s*\d+)?)\b/i);
    const normalizedPhone =
      phoneValue.replace(/[^\d+]/g, "") ||
      text.match(/(?:\+?56)?\s*9\s*\d(?:[\s-]*\d){7,8}/)?.[0]?.replace(/[^\d+]/g, "") ||
      "";

    const cleanedName =
      nameValue ||
      lines.find((line) =>
        /^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+){1,3}$/.test(
          line,
        ),
      ) ||
      "";

    return {
      departamento:
        departmentFromAddress ||
        departmentFromExplicitField ||
        genericDepartmentMatch?.[0]?.trim() ||
        "",
      nombre: cleanedName,
      telefono: normalizedPhone,
      compania: company ?? "",
    };
  };

  const runOcr = async (source: Blob | File | string) => {
    setIsScanningLabel(true);
    setCameraError("");
    setCameraMessage("");

    try {
      const result = await recognize(source, "spa+eng", {
        logger: () => undefined,
      });
      const detectedText = result.data.text.trim();
      const detectedValues = parseDetectedValues(detectedText);
      const confidence = result.data.confidence ?? 0;

      if (!hasUsefulDetectedText(detectedText, detectedValues, confidence)) {
        setOcrText("");
        setCameraError(
          "No detecte una etiqueta valida. Intenta centrarla mejor, acercarla o usar una imagen mas nitida.",
        );
        return;
      }

      setOcrText(detectedText);
      setValues((current) => ({
        ...current,
        ...detectedValues,
      }));
      setMode("form");
      setCameraMessage("Etiqueta escaneada. Revisa y corrige los datos antes de guardar.");
    } catch {
      setCameraError("No se pudo leer la etiqueta. Intenta con mejor luz o acercando la camara.");
    } finally {
      setIsScanningLabel(false);
    }
  };

  const handleScanFromCamera = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("La camara aun no esta lista para capturar.");
      return;
    }

    const canvas = document.createElement("canvas");
    const cropWidth = Math.floor(video.videoWidth * 0.82);
    const cropHeight = Math.floor(video.videoHeight * 0.48);
    const cropX = Math.floor((video.videoWidth - cropWidth) / 2);
    const cropY = Math.floor((video.videoHeight - cropHeight) / 2);

    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("No se pudo preparar la captura de imagen.");
      return;
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

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;

    for (let index = 0; index < data.length; index += 4) {
      const grayscale = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
      const boosted = grayscale > 150 ? 255 : grayscale < 95 ? 0 : grayscale;
      data[index] = boosted;
      data[index + 1] = boosted;
      data[index + 2] = boosted;
    }

    context.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("No se pudo capturar la imagen de la camara.");
      return;
    }

    await runOcr(blob);
  };

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
            </p>

            <div className="cameraPreviewShell">
              <video
                ref={videoRef}
                className="cameraPreview"
                autoPlay
                muted
                playsInline
              />
              {isCameraLoading ? <p className="cameraStatus">Conectando camara...</p> : null}
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
                className="modalPrimaryButton"
                onClick={() => void handleScanFromCamera()}
                disabled={isScanningLabel || isCameraLoading}
              >
                {isScanningLabel ? "Escaneando..." : "Escanear etiqueta"}
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
