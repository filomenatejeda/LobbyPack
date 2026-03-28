import { type ComponentType } from "react";
import QRCodeImport from "react-qr-code";
import "./QrModal.css";
import type { PackageItem } from "./types";

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
  qrPackage: PackageItem;
  onClose: () => void;
  onConfirm: (value: string) => void;
  qrScanMessage: string;
};

export default function QrModal({
  qrPackage,
  onClose,
  onConfirm,
  qrScanMessage,
}: QrModalProps) {
  return (
    <div className="qrModalOverlay" onClick={onClose}>
      <div className="qrModal" onClick={(event) => event.stopPropagation()}>
        <div className="qrModalHeader">
          <h3>QR del paquete {qrPackage.id}</h3>
          <button
            type="button"
            className="closeModalButton"
            onClick={onClose}
            aria-label="Cerrar QR"
          >
            ×
          </button>
        </div>

        <div className="qrCodeBox">
          {QRCodeComponent ? (
            <QRCodeComponent value={`LobbyPack:${qrPackage.id}`} size={180} />
          ) : (
            <p className="qrFallback">No se pudo cargar el componente QR.</p>
          )}
        </div>

        <p className="qrHint">
          Este codigo QR identifica el paquete y puede usarse para marcarlo como retirado.
        </p>

        <button
          type="button"
          className="simulateScanButton"
          onClick={() => onConfirm(`LobbyPack:${qrPackage.id}`)}
        >
          Marcar como retiro
        </button>

        {qrScanMessage ? <p className="qrSuccess">{qrScanMessage}</p> : null}
      </div>
    </div>
  );
}
