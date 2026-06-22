import jsQR from "jsqr";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from "../../lib/i18n";
import type {
  DashboardCurrentUser,
  DashboardPreferenceSettings,
  IssueItem,
  ParcelItem,
} from "../../types/home";
import {
  formatIssueStatus,
  formatParcelStatus,
  formatParcelTime,
  getIssueStatusClassName,
  getParcelDate,
} from "../../utils/packageUtils";
import "./ResidentDashboard.css";

type ResidentDashboardProps = {
  currentUser: DashboardCurrentUser;
  preferenceSettings: DashboardPreferenceSettings;
  pendingParcels: ParcelItem[];
  claimedParcels: ParcelItem[];
  issues: IssueItem[];
  scannedParcel: ParcelItem | null;
  feedbackMessage: string;
  feedbackTone: "neutral" | "success" | "error";
  isProcessing: boolean;
  onScan: (qrValue: string) => Promise<void>;
  onConfirmClaim: () => Promise<boolean>;
  onResetScan: () => void;
  onCreateIssue: (parcelId: string, issueDescription: string) => Promise<boolean>;
  issueMessage: string;
  issueTone: "neutral" | "success" | "error";
  isCreatingIssue: boolean;
};

type ResidentView = "scanner" | "pending" | "claimed" | "issues";

function ParcelSummaryCard({ item }: { item: ParcelItem }) {
  const { t, language } = useI18n();
  const parcelDate = getParcelDate(item);

  return (
    <article className="residentParcelCard">
      <div className="residentParcelTop">
        <strong>{item.id}</strong>
        <span className={item.parcel_status === "pending" ? "residentPending" : "residentClaimed"}>
          {item.parcel_status === "pending" ? t("resident.pending") : t("resident.delivered")}
        </span>
      </div>
      <p>{item.business_name}</p>
      <p>{item.parcel_description || t("resident.emptyDescription")}</p>
      <p>
        {item.parcel_status === "pending"
          ? item.resident_claim_confirmed_at
            ? t("resident.confirmationSent")
            : `${t("resident.receivedBy")} ${item.concierge_name}`
          : `${t("resident.withdrawBy")} ${item.claimed_by_name || item.resident_name}`}
      </p>
      <p>
        {new Date(parcelDate).toLocaleDateString(language === "es" ? "es-CL" : "en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}{" "}
        {language === "es" ? "a las" : "at"} {formatParcelTime(parcelDate)}
      </p>
    </article>
  );
}

function ResidentIssueCard({ item }: { item: IssueItem }) {
  const { language } = useI18n();
  return (
    <article className="residentIssueCard">
      <div className="residentIssueMeta">
        <strong>{item.id_parcel}</strong>
        <span>{item.business_name}</span>
        <span>
          {language === "es"
            ? formatParcelStatus(item.parcel_status)
            : item.parcel_status === "pending"
              ? "Reception"
              : "Pickup"}
        </span>
        <span>
          {new Date(item.created_at).toLocaleDateString(language === "es" ? "es-CL" : "en-US", {
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
          {language === "es"
            ? formatIssueStatus(item.issue_status)
            : item.issue_status === "open"
              ? "Submitted"
              : item.issue_status === "under_review"
                ? "Under review"
                : "Resolved"}
        </span>
      </div>
      <p>{item.issue_description}</p>
    </article>
  );
}

export default function ResidentDashboard({
  currentUser,
  preferenceSettings,
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
  const { t } = useI18n();
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
  const qrAccessEnabled = preferenceSettings.qr_access;
  const [activeResidentView, setActiveResidentView] = useState<ResidentView>(
    searchParams.get("view") === "claimed" ? "claimed" : qrAccessEnabled ? "scanner" : "pending",
  );
  const issueParcelOptions = useMemo(
    () => [...pendingParcels, ...claimedParcels],
    [pendingParcels, claimedParcels],
  );
  const allResidentMenuItems: Array<{
    value: ResidentView;
    label: string;
    count?: number;
  }> = [
    { value: "scanner", label: t("resident.withdrawMenu") },
    { value: "pending", label: t("resident.pendingPackages"), count: pendingParcels.length },
    { value: "claimed", label: t("resident.claimed"), count: claimedParcels.length },
    { value: "issues", label: t("resident.claims"), count: issues.length },
  ];
  const residentMenuItems = qrAccessEnabled
    ? allResidentMenuItems
    : allResidentMenuItems.filter((item) => item.value !== "scanner");

  useEffect(() => {
    if (searchParams.get("view") === "claimed") {
      setActiveResidentView("claimed");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!qrAccessEnabled && activeResidentView === "scanner") {
      setActiveResidentView("pending");
      setIsCameraOpen(false);
      setCameraMessage("");
      setManualQrValue("");
    }
  }, [activeResidentView, qrAccessEnabled]);

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
          <p className="residentEyebrow">
            {qrAccessEnabled ? t("resident.qrSecure") : t("home.management")}
          </p>
          <h2>{currentUser.display_name}</h2>
          <p className="residentLead">
            {qrAccessEnabled
              ? t("resident.qrLead")
              : t("resident.settingsLeadNoQr")}
          </p>
        </div>
        <div className="residentDepartmentCard">
          <span>{t("resident.home")}</span>
          <strong>{currentUser.department_address ?? t("resident.emptyDepartment")}</strong>
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
        {!qrAccessEnabled ? (
          <div className="residentQrDisabled">
            <h3>{t("resident.qrDisabled")}</h3>
            <p>{t("resident.qrDisabledText")}</p>
          </div>
        ) : (
        <>
        <div className="residentScannerHeader">
          <h3>{t("resident.scanQr")}</h3>
          <button
            type="button"
            className="residentScannerButton"
            onClick={() => setIsCameraOpen((current) => !current)}
          >
            {isCameraOpen ? t("resident.cameraClose") : t("resident.cameraOpen")}
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
            <span>{t("resident.enterManualQr")}</span>
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
            {t("resident.manualValidate")}
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
            <h3>{t("resident.confirmClaim")}</h3>
            <ParcelSummaryCard item={scannedParcel} />
            <div className="residentConfirmationActions">
              <button
                type="button"
                className="residentScannerButton"
                disabled={isProcessing}
                onClick={async () => {
                  const confirmedParcel = scannedParcel;

                  const wasConfirmed = await onConfirmClaim();

                  if (wasConfirmed && confirmedParcel) {
                    navigate("/retiro-exitoso", {
                      replace: true,
                      state: { parcel: confirmedParcel },
                    });
                  }
                }}
              >
                {isProcessing ? t("resident.confirming") : t("resident.confirmClaim")}
              </button>
              <button
                type="button"
                className="residentScannerButton secondary"
                disabled={isProcessing}
                onClick={onResetScan}
              >
                {t("resident.cancel")}
              </button>
            </div>
          </div>
        ) : null}
        </>
        )}
      </div>
      ) : null}

      {activeResidentView === "issues" ? (
        <div className="residentIssuePanel">
        <div className="residentIssueHeader">
          <div>
            <h3>{t("resident.claims")}</h3>
            <p>{t("resident.claimsLead")}</p>
          </div>
          <button
            type="button"
            className="residentScannerButton"
            onClick={() => setIsIssueFormOpen((current) => !current)}
          >
            {isIssueFormOpen ? t("resident.closeForm") : t("resident.createClaim")}
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
            <span>{t("resident.package")}</span>
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
                <option value="">{t("resident.noPackages")}</option>
              )}
            </select>
          </label>

          <label className="residentManualField">
            <span>{t("resident.issueDescription")}</span>
            <textarea
              value={issueDescription}
              onChange={(event) => setIssueDescription(event.target.value)}
              maxLength={300}
              rows={4}
              placeholder={t("resident.issuePlaceholder")}
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
              {isCreatingIssue ? t("resident.reportSending") : t("resident.reportIssue")}
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
            <p className="residentEmptyState">{t("resident.claimsEmpty")}</p>
          )}
        </div>
      </div>
      ) : null}

      {activeResidentView === "pending" ? (
        <div className="residentParcelSections">
        <div className="residentParcelSection">
          <div className="residentSectionHeader">
            <h3>{t("resident.pendingPackages")}</h3>
            <span>{pendingParcels.length}</span>
          </div>
          <div className="residentParcelGrid">
            {pendingParcels.length > 0 ? (
              pendingParcels.map((item) => <ParcelSummaryCard key={item.id} item={item} />)
            ) : (
              <p className="residentEmptyState">{t("resident.pendingEmpty")}</p>
            )}
          </div>
        </div>
      </div>
      ) : null}

      {activeResidentView === "claimed" ? (
        <div className="residentParcelSections">
        <div className="residentParcelSection">
          <div className="residentSectionHeader">
            <h3>{t("resident.claimed")}</h3>
            <span>{claimedParcels.length}</span>
          </div>
          <div className="residentParcelGrid">
            {claimedParcels.length > 0 ? (
              claimedParcels.map((item) => <ParcelSummaryCard key={item.id} item={item} />)
            ) : (
              <p className="residentEmptyState">{t("resident.claimedEmpty")}</p>
            )}
          </div>
        </div>
      </div>
      ) : null}
    </section>
  );
}
