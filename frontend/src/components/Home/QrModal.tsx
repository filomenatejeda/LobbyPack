import { type ComponentType } from "react";
import QRCodeImport from "react-qr-code";
import "./QrModal.css";
import type { ParcelItem } from "../../types/home";
import { useI18n } from "../../lib/i18n";

type QRCodeModule = {
  default?: ComponentType<{ value: string; size?: number }>;
};

const qrCodeImport = QRCodeImport as unknown;
const QRCodeComponent =
  typeof qrCodeImport === "function"
    ? (qrCodeImport as ComponentType<{ value: string; size?: number }>)
    : typeof qrCodeImport === "object" && qrCodeImport !== null && "default" in qrCodeImport
      ? (qrCodeImport as QRCodeModule).default ?? null
      : null;

type QrModalProps = {
  qrPackage: ParcelItem;
  qrAccessEnabled: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  qrScanMessage: string;
};

export default function QrModal({
  qrPackage,
  qrAccessEnabled,
  onClose,
  onConfirm,
  qrScanMessage,
}: QrModalProps) {
  const { t } = useI18n();
  const qrValue = qrPackage.qr_code_url ?? `LobbyPack:claim:${qrPackage.id}:demo`;
  const residentConfirmedClaim = Boolean(qrPackage.resident_claim_confirmed_at);

  return (
    <div className="qrModalOverlay" onClick={onClose}>
      <div className="qrModal" onClick={(event) => event.stopPropagation()}>
        <div className="qrModalHeader">
          <h3>{t("qr.packageTitle").replace("{id}", String(qrPackage.id))}</h3>
          <button
            type="button"
            className="closeModalButton"
            onClick={onClose}
            aria-label={t("qr.close")}
          >
            x
          </button>
        </div>

        <div className="qrCodeBox">
          {qrAccessEnabled && QRCodeComponent ? (
            <QRCodeComponent value={qrValue} size={180} />
          ) : (
            <p className="qrFallback">
              {qrAccessEnabled
                ? t("qr.componentError")
                : t("qr.disabled")}
            </p>
          )}
        </div>

        <p className="qrHint">
          {qrAccessEnabled
            ? t("qr.enabledHint")
            : t("qr.disabledHint")}
        </p>

        {qrAccessEnabled && residentConfirmedClaim ? (
          <button
            type="button"
            className="simulateScanButton"
            onClick={() => onConfirm(qrValue)}
          >
            {t("qr.markWithdrawn")}
          </button>
        ) : qrAccessEnabled ? (
          <p className="qrHint">
            {t("qr.waitResident")}
          </p>
        ) : (
          null
        )}

        {qrScanMessage ? <p className="qrSuccess">{qrScanMessage}</p> : null}
      </div>
    </div>
  );
}
