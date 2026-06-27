import jsQR from "jsqr";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useI18nContext } from "@/i18n/i18n-react";
import type {
  DashboardCurrentUser,
  DashboardPreferenceSettings,
  IssueItem,
  ParcelItem,
} from "../../types/home";
import {
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
  const { LL, locale } = useI18nContext();
  const parcelDate = getParcelDate(item);
  const dateLocale = locale === "es" ? "es-CL" : "en-US";

  return (
    <article className="residentParcelCard">
      <div className="residentParcelTop">
        <strong>{item.id}</strong>
        <span className={item.parcel_status === "pending" ? "residentPending" : "residentClaimed"}>
          {item.parcel_status === "pending" ? LL.resident_pending() : LL.resident_delivered()}
        </span>
      </div>
      <p>{item.business_name}</p>
      <p>{item.parcel_description || LL.resident_emptyDescription()}</p>
      <p>
        {item.parcel_status === "pending"
          ? item.resident_claim_confirmed_at
            ? LL.resident_confirmationSent()
            : `${LL.resident_receivedBy()} ${item.concierge_name}`
          : `${LL.resident_withdrawBy()} ${item.claimed_by_name || item.resident_name}`}
      </p>
      <p>
        {new Date(parcelDate).toLocaleDateString(dateLocale, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}{" "}
        {locale === "es" ? "a las" : "at"} {formatParcelTime(parcelDate)}
      </p>
    </article>
  );
}

function ResidentIssueCard({ item }: { item: IssueItem }) {
  const { LL, locale } = useI18nContext();
  const dateLocale = locale === "es" ? "es-CL" : "en-US";
  const issueStatusLabel =
    item.issue_status === "open"
      ? LL.admin_entered()
      : item.issue_status === "under_review"
        ? LL.admin_markReview()
        : LL.admin_resolved();

  return (
    <article className="residentIssueCard">
      <div className="residentIssueMeta">
        <strong>{item.id_parcel}</strong>
        <span>{item.business_name}</span>
        <span>
          {item.parcel_status === "pending"
            ? LL.resident_receivedStatus()
            : LL.admin_withdrawal()}
        </span>
        <span>
          {formatParcelStatus(item.parcel_status, locale)}
        </span>
        <span>
          {new Date(item.created_at).toLocaleDateString(dateLocale, {
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
          {issueStatusLabel}
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
  const { LL } = useI18nContext();
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
    { value: "scanner", label: LL.resident_withdrawMenu() },
    { value: "pending", label: LL.resident_pendingPackages(), count: pendingParcels.length },
    { value: "claimed", label: LL.resident_claimed(), count: claimedParcels.length },
    { value: "issues", label: LL.resident_claims(), count: issues.length },
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
        setCameraMessage(LL.resident_cameraNoSupport());
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
        setCameraMessage(LL.resident_cameraPoint());

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
              setCameraMessage(LL.resident_cameraReaderError());
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
              setCameraMessage(LL.resident_cameraDetected());
              await onScan(qrValue);
              setIsCameraOpen(false);
              return;
            }
          } catch {
            setCameraMessage(LL.resident_cameraError());
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
        setCameraMessage(LL.resident_cameraNoAccess());
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
  }, [LL, isCameraOpen, onScan]);

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
            {qrAccessEnabled ? LL.resident_qrSecure() : LL.home_management()}
          </p>
          <h2>{currentUser.display_name}</h2>
          <p className="residentLead">
            {qrAccessEnabled
              ? LL.resident_qrLead()
              : LL.resident_settingsLeadNoQr()}
          </p>
        </div>
        <div className="residentDepartmentCard">
          <span>{LL.resident_home()}</span>
          <strong>{currentUser.department_address ?? LL.resident_emptyDepartment()}</strong>
        </div>
      </div>

      <nav className="residentViewMenu" aria-label={LL.resident_resident()}>
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
            <h3>{LL.resident_qrDisabled()}</h3>
            <p>
              {LL.resident_qrDisabledText()}
            </p>
          </div>
        ) : (
        <>
        <div className="residentScannerHeader">
          <h3>{LL.resident_scanQr()}</h3>
          <button
            type="button"
            className="residentScannerButton"
            onClick={() => setIsCameraOpen((current) => !current)}
          >
            {isCameraOpen ? LL.resident_cameraClose() : LL.resident_cameraOpen()}
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
            <span>{LL.resident_enterManualQr()}</span>
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
            {LL.resident_manualValidate()}
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
            <h3>{LL.resident_confirmClaim()}</h3>
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
                {isProcessing ? LL.resident_confirming() : LL.resident_confirmClaim()}
              </button>
              <button
                type="button"
                className="residentScannerButton secondary"
                disabled={isProcessing}
                onClick={onResetScan}
              >
                {LL.admin_cancel()}
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
            <h3>{LL.resident_claims()}</h3>
            <p>{LL.resident_claimsLead()}</p>
          </div>
          <button
            type="button"
            className="residentScannerButton"
            onClick={() => setIsIssueFormOpen((current) => !current)}
          >
            {isIssueFormOpen ? LL.resident_closeForm() : LL.resident_createClaim()}
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
            <span>{LL.resident_package()}</span>
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
                <option value="">{LL.resident_noPackages()}</option>
              )}
            </select>
          </label>

          <label className="residentManualField">
            <span>{LL.resident_issueDescription()}</span>
            <textarea
              value={issueDescription}
              onChange={(event) => setIssueDescription(event.target.value)}
              maxLength={300}
              rows={4}
              placeholder={LL.resident_issuePlaceholder()}
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
              {isCreatingIssue ? LL.resident_reportSending() : LL.resident_reportIssue()}
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
            <p className="residentEmptyState">{LL.resident_claimsEmpty()}</p>
          )}
        </div>
      </div>
      ) : null}

      {activeResidentView === "pending" ? (
        <div className="residentParcelSections">
        <div className="residentParcelSection">
          <div className="residentSectionHeader">
            <h3>{LL.resident_pendingPackages()}</h3>
            <span>{pendingParcels.length}</span>
          </div>
          <div className="residentParcelGrid">
            {pendingParcels.length > 0 ? (
              pendingParcels.map((item) => <ParcelSummaryCard key={item.id} item={item} />)
            ) : (
              <p className="residentEmptyState">{LL.resident_pendingEmpty()}</p>
            )}
          </div>
        </div>
      </div>
      ) : null}

      {activeResidentView === "claimed" ? (
        <div className="residentParcelSections">
        <div className="residentParcelSection">
          <div className="residentSectionHeader">
            <h3>{LL.resident_claimed()}</h3>
            <span>{claimedParcels.length}</span>
          </div>
          <div className="residentParcelGrid">
            {claimedParcels.length > 0 ? (
              claimedParcels.map((item) => <ParcelSummaryCard key={item.id} item={item} />)
            ) : (
              <p className="residentEmptyState">{LL.resident_claimedEmpty()}</p>
            )}
          </div>
        </div>
      </div>
      ) : null}
    </section>
  );
}
