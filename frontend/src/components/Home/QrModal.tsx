import { type ComponentType } from "react";
import QRCodeImport from "react-qr-code";
import "./QrModal.css";
import type { ParcelItem } from "../../types/home";

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
  const qrValue = qrPackage.qr_code_url ?? `LobbyPack:claim:${qrPackage.id}:demo`;
  const residentConfirmedClaim = Boolean(qrPackage.resident_claim_confirmed_at);

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
            x
          </button>
        </div>

        <div className="qrCodeBox">
          {QRCodeComponent ? (
            <QRCodeComponent value={qrValue} size={180} />
          ) : (
            <p className="qrFallback">No se pudo cargar el componente QR.</p>
          )}
        </div>

        <p className="qrHint">
          Este QR representa un retiro seguro y solo debe escanearlo un residente del mismo
          departamento.
        </p>

        {residentConfirmedClaim ? (
          <button
            type="button"
            className="simulateScanButton"
            onClick={() => onConfirm(qrValue)}
          >
            Marcar como retirado
          </button>
        ) : (
          <p className="qrHint">
            El boton de retiro aparecera cuando el residente confirme desde su cuenta.
          </p>
        )}

        {qrScanMessage ? <p className="qrSuccess">{qrScanMessage}</p> : null}
      </div>
    </div>
  );
}
