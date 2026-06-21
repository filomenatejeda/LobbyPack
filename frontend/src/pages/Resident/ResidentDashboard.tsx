import jsQR from "jsqr";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { DashboardCurrentUser, IssueItem, ParcelItem } from "../../types/home";
import {
  formatIssueStatus,
  formatParcelDate,
  formatParcelStatus,
  formatParcelTime,
  getIssueStatusClassName,
  getParcelDate,
} from "../../utils/packageUtils";
import "./ResidentDashboard.css";

type ResidentDashboardProps = {
  currentUser: DashboardCurrentUser;
  pendingParcels: ParcelItem[];
  claimedParcels: ParcelItem[];
  issues: IssueItem[];
  scannedParcel: ParcelItem | null;
  feedbackMessage: string;
  feedbackTone: "neutral" | "success" | "error";
  isProcessing: boolean;
  onScan: (qrValue: string) => Promise<void>;
  onConfirmClaim: () => Promise<void>;
  onResetScan: () => void;
  onCreateIssue: (parcelId: string, issueDescription: string) => Promise<boolean>;
  issueMessage: string;
  issueTone: "neutral" | "success" | "error";
  isCreatingIssue: boolean;
};

type ResidentView = "scanner" | "pending" | "claimed" | "issues";

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
          ? item.resident_claim_confirmed_at
            ? "Confirmacion enviada. Pendiente de entrega por conserjeria"
            : `Recibido por ${item.concierge_name}`
          : `Retirado por ${item.claimed_by_name || item.resident_name}`}
      </p>
      <p>
        {formatParcelDate(parcelDate)} a las {formatParcelTime(parcelDate)}
      </p>
    </article>
  );
}

function ResidentIssueCard({ item }: { item: IssueItem }) {
  return (
    <article className="residentIssueCard">
      <div className="residentIssueMeta">
        <strong>{item.id_parcel}</strong>
        <span>{item.business_name}</span>
        <span>{formatParcelStatus(item.parcel_status)}</span>
        <span>
          {new Date(item.created_at).toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span
          className={`residentIssueBadge residentIssueBadge${getIssueStatusClassName(
            item.issue_status,
          )}`}
        >
          {formatIssueStatus(item.issue_status)}
        </span>
      </div>
      <p>{item.issue_description}</p>
    </article>
  );
}

export default function ResidentDashboard({
  currentUser,
  pendingParcels,
  claimedParcels,
  issues,
  scannedParcel,
  feedbackMessage,
  feedbackTone,
  isProcessing,
  onScan,
  onConfirmClaim,
  onResetScan,
  onCreateIssue,
  issueMessage,
  issueTone,
  isCreatingIssue,
}: ResidentDashboardProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const isDetectingRef = useRef(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [manualQrValue, setManualQrValue] = useState("");
  const [issueParcelId, setIssueParcelId] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [isIssueFormOpen, setIsIssueFormOpen] = useState(false);
  const [activeResidentView, setActiveResidentView] = useState<ResidentView>(
    searchParams.get("view") === "claimed" ? "claimed" : "scanner",
  );
  const issueParcelOptions = useMemo(
    () => [...pendingParcels, ...claimedParcels],
    [pendingParcels, claimedParcels],
  );
  const residentMenuItems: Array<{
    value: ResidentView;
    label: string;
    count?: number;
  }> = [
    { value: "scanner", label: "Retirar paquete" },
    { value: "pending", label: "Paquetes pendientes", count: pendingParcels.length },
    { value: "claimed", label: "Paquetes entregados", count: claimedParcels.length },
    { value: "issues", label: "Reclamos", count: issues.length },
  ];

  useEffect(() => {
    if (searchParams.get("view") === "claimed") {
      setActiveResidentView("claimed");
    }
  }, [searchParams]);

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

  useEffect(() => {
    if (issueParcelOptions.length === 0) {
      setIssueParcelId("");
      return;
    }

    if (!issueParcelOptions.some((item) => item.id === issueParcelId)) {
      setIssueParcelId(issueParcelOptions[0].id);
    }
  }, [issueParcelId, issueParcelOptions]);

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
          <span>Tu hogar</span>
          <strong>{currentUser.department_address ?? "Sin departamento asignado"}</strong>
        </div>
      </div>

      <nav className="residentViewMenu" aria-label="Menu de residente">
        {residentMenuItems.map((item) => (
          <button
            key={item.value}
            type="button"
            className={
              activeResidentView === item.value
                ? "residentViewButton active"
                : "residentViewButton"
            }
            onClick={() => setActiveResidentView(item.value)}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" ? <strong>{item.count}</strong> : null}
          </button>
        ))}
      </nav>

      {activeResidentView === "scanner" ? (
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
                onClick={async () => {
                  const confirmedParcel = scannedParcel;

                  await onConfirmClaim();

                  if (confirmedParcel) {
                    navigate("/retiro-exitoso", {
                      replace: true,
                      state: { parcel: confirmedParcel },
                    });
                  }
                }}
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
      ) : null}

      {activeResidentView === "issues" ? (
        <div className="residentIssuePanel">
        <div className="residentIssueHeader">
          <div>
            <h3>Reclamos</h3>
            <p>Revisa el estado de tus reclamos o reporta un problema asociado a un paquete.</p>
          </div>
          <button
            type="button"
            className="residentScannerButton"
            onClick={() => setIsIssueFormOpen((current) => !current)}
          >
            {isIssueFormOpen ? "Cerrar formulario" : "Crear reclamo"}
          </button>
        </div>

        {isIssueFormOpen ? (
        <form
          className="residentIssueForm"
          onSubmit={async (event) => {
            event.preventDefault();
            const wasCreated = await onCreateIssue(issueParcelId, issueDescription);

            if (wasCreated) {
              setIssueDescription("");
              setIsIssueFormOpen(false);
            }
          }}
        >
          <label className="residentManualField">
            <span>Paquete</span>
            <select
              value={issueParcelId}
              onChange={(event) => setIssueParcelId(event.target.value)}
              disabled={issueParcelOptions.length === 0 || isCreatingIssue}
            >
              {issueParcelOptions.length > 0 ? (
                issueParcelOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {item.business_name}
                  </option>
                ))
              ) : (
                <option value="">Sin paquetes disponibles</option>
              )}
            </select>
          </label>

          <label className="residentManualField">
            <span>Descripcion del problema</span>
            <textarea
              value={issueDescription}
              onChange={(event) => setIssueDescription(event.target.value)}
              maxLength={300}
              rows={4}
              placeholder="Ej: el paquete figura como entregado, pero no lo recibi."
              disabled={isCreatingIssue}
            />
          </label>

          <div className="residentIssueActions">
            <span>{issueDescription.trim().length}/300</span>
            <button
              type="submit"
              className="residentScannerButton"
              disabled={
                isCreatingIssue ||
                issueParcelOptions.length === 0 ||
                !issueDescription.trim()
              }
            >
              {isCreatingIssue ? "Enviando..." : "Enviar reclamo"}
            </button>
          </div>
        </form>
        ) : null}

        {issueMessage ? (
          <p
            className={
              issueTone === "error"
                ? "residentFeedback residentFeedbackError"
                : issueTone === "success"
                  ? "residentFeedback residentFeedbackSuccess"
                  : "residentFeedback"
            }
          >
            {issueMessage}
          </p>
        ) : null}

        <div className="residentIssueList">
          {issues.length > 0 ? (
            issues.map((item) => <ResidentIssueCard key={item.id} item={item} />)
          ) : (
            <p className="residentEmptyState">Todavia no tienes reclamos registrados.</p>
          )}
        </div>
      </div>
      ) : null}

      {activeResidentView === "pending" ? (
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
      </div>
      ) : null}

      {activeResidentView === "claimed" ? (
        <div className="residentParcelSections">
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
      ) : null}
    </section>
  );
}
