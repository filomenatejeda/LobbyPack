import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";
import type { DashboardCurrentUser, ParcelItem } from "../../types/home";
import {
  formatParcelDate,
  formatParcelTime,
  getParcelDate,
} from "../../utils/packageUtils";
import "./ResidentDashboard.css";

type ResidentDashboardProps = {
  currentUser: DashboardCurrentUser;
  pendingParcels: ParcelItem[];
  claimedParcels: ParcelItem[];
  scannedParcel: ParcelItem | null;
  feedbackMessage: string;
  feedbackTone: "neutral" | "success" | "error";
  isProcessing: boolean;
  onScan: (qrValue: string) => Promise<void>;
  onConfirmClaim: () => Promise<void>;
  onResetScan: () => void;
};

function ParcelSummaryCard({ item }: { item: ParcelItem }) {
  const parcelDate = getParcelDate(item);

  return (
    <article className="residentParcelCard">
      <div className="residentParcelTop">
        <strong>{item.id}</strong>
        <span className={item.parcel_status === "pending" ? "residentPending" : "residentClaimed"}>
          {item.parcel_status === "pending" ? "Pendiente" : "Entregado"}
        </span>
      </div>
      <p>{item.business_name}</p>
      <p>{item.parcel_description || "Sin descripcion"}</p>
      <p>
        {item.parcel_status === "pending"
          ? `Recibido por ${item.concierge_name}`
          : `Retirado por ${item.claimed_by_name || item.resident_name}`}
      </p>
      <p>
        {formatParcelDate(parcelDate)} a las {formatParcelTime(parcelDate)}
      </p>
    </article>
  );
}

export default function ResidentDashboard({
  currentUser,
  pendingParcels,
  claimedParcels,
  scannedParcel,
  feedbackMessage,
  feedbackTone,
  isProcessing,
  onScan,
  onConfirmClaim,
  onResetScan,
}: ResidentDashboardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const isDetectingRef = useRef(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [manualQrValue, setManualQrValue] = useState("");

  useEffect(() => {
    if (!isCameraOpen) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      return;
    }

    let isActive = true;

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraMessage("Tu navegador no permite abrir la camara. Usa el ingreso manual.");
        setIsCameraOpen(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (!videoRef.current) {
          return;
        }

        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas");
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraMessage("Apunta la camara al QR del paquete.");

        const scanFrame = async () => {
          if (!isActive || !videoRef.current || !canvasRef.current) {
            return;
          }

          if (videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            frameRef.current = requestAnimationFrame(() => {
              void scanFrame();
            });
            return;
          }

          if (isDetectingRef.current) {
            frameRef.current = requestAnimationFrame(() => {
              void scanFrame();
            });
            return;
          }

          isDetectingRef.current = true;

          try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const width = video.videoWidth;
            const height = video.videoHeight;

            if (!width || !height) {
              frameRef.current = requestAnimationFrame(() => {
                void scanFrame();
              });
              return;
            }

            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext("2d", { willReadFrequently: true });

            if (!context) {
              setCameraMessage("No se pudo preparar el lector de la camara.");
              setIsCameraOpen(false);
              return;
            }

            context.drawImage(video, 0, 0, width, height);
            const imageData = context.getImageData(0, 0, width, height);
            const detectedCode = jsQR(imageData.data, width, height, {
              inversionAttempts: "dontInvert",
            });
            const qrValue = detectedCode?.data?.trim();

            if (qrValue) {
              setManualQrValue(qrValue);
              setCameraMessage("QR detectado. Validando paquete...");
              await onScan(qrValue);
              setIsCameraOpen(false);
              return;
            }
          } catch {
            setCameraMessage("No se pudo leer el QR. Intenta acercar la camara un poco mas.");
          } finally {
            isDetectingRef.current = false;
          }

          frameRef.current = requestAnimationFrame(() => {
            void scanFrame();
          });
        };

        frameRef.current = requestAnimationFrame(() => {
          void scanFrame();
        });
      } catch {
        setCameraMessage("No se pudo acceder a la camara. Revisa permisos o usa el ingreso manual.");
        setIsCameraOpen(false);
      }
    };

    void startScanner();

    return () => {
      isActive = false;

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [isCameraOpen, onScan]);

  return (
    <section className="residentDashboard" aria-live="polite">
      <div className="residentHero">
        <div>
          <p className="residentEyebrow">Retiro seguro por QR</p>
          <h2>{currentUser.display_name}</h2>
          <p className="residentLead">
            Escanea el QR mostrado en conserjeria y confirma el retiro si el paquete pertenece a tu
            departamento.
          </p>
        </div>
        <div className="residentDepartmentCard">
          <span>Departamento habilitado</span>
          <strong>{currentUser.department_address ?? "Sin departamento asignado"}</strong>
        </div>
      </div>

      <div className="residentScannerPanel">
        <div className="residentScannerHeader">
          <h3>Escanear QR</h3>
          <button
            type="button"
            className="residentScannerButton"
            onClick={() => setIsCameraOpen((current) => !current)}
          >
            {isCameraOpen ? "Cerrar camara" : "Abrir camara"}
          </button>
        </div>

        {isCameraOpen ? (
          <div className="residentVideoWrap">
            <video ref={videoRef} className="residentVideo" muted playsInline />
          </div>
        ) : null}

        {cameraMessage ? <p className="residentCameraMessage">{cameraMessage}</p> : null}

        <form
          className="residentManualForm"
          onSubmit={(event) => {
            event.preventDefault();
            void onScan(manualQrValue);
          }}
        >
          <label className="residentManualField">
            <span>Ingreso manual del QR</span>
            <input
              type="text"
              value={manualQrValue}
              onChange={(event) => setManualQrValue(event.target.value)}
              placeholder="LobbyPack:claim:parcel-0001:..."
            />
          </label>
          <button
            type="submit"
            className="residentScannerButton secondary"
            disabled={!manualQrValue.trim() || isProcessing}
          >
            Validar codigo
          </button>
        </form>

        {feedbackMessage ? (
          <p
            className={
              feedbackTone === "error"
                ? "residentFeedback residentFeedbackError"
                : feedbackTone === "success"
                  ? "residentFeedback residentFeedbackSuccess"
                  : "residentFeedback"
            }
          >
            {feedbackMessage}
          </p>
        ) : null}

        {scannedParcel ? (
          <div className="residentConfirmationCard">
            <h3>Confirma el retiro</h3>
            <ParcelSummaryCard item={scannedParcel} />
            <div className="residentConfirmationActions">
              <button
                type="button"
                className="residentScannerButton"
                disabled={isProcessing}
                onClick={() => void onConfirmClaim()}
              >
                {isProcessing ? "Confirmando..." : "Confirmar retiro"}
              </button>
              <button
                type="button"
                className="residentScannerButton secondary"
                disabled={isProcessing}
                onClick={onResetScan}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="residentParcelSections">
        <div className="residentParcelSection">
          <div className="residentSectionHeader">
            <h3>Paquetes pendientes</h3>
            <span>{pendingParcels.length}</span>
          </div>
          <div className="residentParcelGrid">
            {pendingParcels.length > 0 ? (
              pendingParcels.map((item) => <ParcelSummaryCard key={item.id} item={item} />)
            ) : (
              <p className="residentEmptyState">No hay paquetes pendientes para este departamento.</p>
            )}
          </div>
        </div>

        <div className="residentParcelSection">
          <div className="residentSectionHeader">
            <h3>Paquetes entregados</h3>
            <span>{claimedParcels.length}</span>
          </div>
          <div className="residentParcelGrid">
            {claimedParcels.length > 0 ? (
              claimedParcels.map((item) => <ParcelSummaryCard key={item.id} item={item} />)
            ) : (
              <p className="residentEmptyState">Todavia no hay paquetes entregados para este departamento.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
