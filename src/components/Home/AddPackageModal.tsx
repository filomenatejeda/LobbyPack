import { useCallback, useEffect, useId, useRef, useState } from "react";
import AddPackageCameraSection from "./AddPackageCameraSection";
import AddPackageFormSection from "./AddPackageFormSection";
import type { AddPackageFormValues } from "./addPackageTypes";
import {
  hasUsefulDetectedText,
  recognizeBestMatch,
} from "./utils/addPackageOcr";
import "./AddPackageModal.css";

type AddPackageModalProps = {
  onClose: () => void;
  onSubmit: (values: AddPackageFormValues) => void;
};

type AddMode = "chooser" | "camera" | "form";

const initialValues: AddPackageFormValues = {
  apartment: "",
  residentName: "",
  phone: "",
  company: "",
  concierge: "",
};

export default function AddPackageModal({ onClose, onSubmit }: AddPackageModalProps) {
  // El modal avanza por tres pasos simples: elegir modo, escanear y luego revisar/editar.
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
    // Libera siempre la cámara al salir del modo cámara o desmontar el componente.
    const stopCamera = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    // Intenta usar primero la cámara trasera y, si falla, usa cualquier cámara disponible.
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

  // El OCR hace primero una pasada rápida y solo usa la completa si hace falta.
  const runOcr = useCallback(async (source: Blob | File | string) => {
    setIsScanningLabel(true);
    setCameraError("");
    setCameraMessage("");

    try {
      let bestMatch = await recognizeBestMatch(source, false);

      const quickDetectedText = bestMatch?.text ?? "";
      const quickDetectedValues = bestMatch?.values ?? {};
      const quickConfidence = bestMatch?.confidence ?? 0;

      if (!hasUsefulDetectedText(quickDetectedText, quickDetectedValues, quickConfidence)) {
        bestMatch = await recognizeBestMatch(source, true);
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
  }, []);

  // Recorta el centro de la cámara para enfocar el OCR en la etiqueta del paquete.
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

  // Encapsula captura + OCR para que el autoescaneo pueda reutilizar este flujo de forma segura.
  const handleScanFromCamera = useCallback(async () => {
    const blob = await captureFrameFromCamera();
    if (!blob) {
      return;
    }

    await runOcr(blob);
  }, [runOcr]);

  useEffect(() => {
    if (mode !== "camera" || isCameraLoading || isScanningLabel) {
      return;
    }

    // Espera un momento para que el video se estabilice antes de capturar un frame.
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
  }, [mode, isCameraLoading, isScanningLabel, cameraAttempt, handleScanFromCamera]);

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
          <AddPackageCameraSection
            cameraInputId={cameraInputId}
            cameraInputRef={cameraInputRef}
            videoRef={videoRef}
            isCameraLoading={isCameraLoading}
            cameraError={cameraError}
            cameraMessage={cameraMessage}
            ocrText={ocrText}
            onBack={() => setMode("chooser")}
            onOpenImagePicker={() => cameraInputRef.current?.click()}
            onRetryCamera={() => setCameraAttempt((current) => current + 1)}
            onFileSelect={(file) => {
              if (!file) {
                setCameraMessage("");
                return;
              }

              setCameraMessage(`Imagen seleccionada: ${file.name}`);
              setCameraError("");
              void runOcr(file);
            }}
            onContinueWithForm={() => setMode("form")}
          />
        ) : null}

        {mode === "form" ? (
          <AddPackageFormSection
            values={values}
            ocrText={ocrText}
            onBack={() => setMode("chooser")}
            onChange={handleChange}
            onSubmit={handleSubmit}
          />
        ) : null}
      </div>
    </div>
  );
}
