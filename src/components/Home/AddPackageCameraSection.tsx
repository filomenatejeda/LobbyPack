import type { RefObject } from "react";

type AddPackageCameraSectionProps = {
  cameraInputId: string;
  cameraInputRef: RefObject<HTMLInputElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  isCameraLoading: boolean;
  cameraError: string;
  cameraMessage: string;
  ocrText: string;
  onBack: () => void;
  onOpenImagePicker: () => void;
  onRetryCamera: () => void;
  onFileSelect: (file: File | null) => void;
  onContinueWithForm: () => void;
};

export default function AddPackageCameraSection({
  cameraInputId,
  cameraInputRef,
  videoRef,
  isCameraLoading,
  cameraError,
  cameraMessage,
  ocrText,
  onBack,
  onOpenImagePicker,
  onRetryCamera,
  onFileSelect,
  onContinueWithForm,
}: AddPackageCameraSectionProps) {
  return (
    <div className="addPackageSection">
      <p className="addPackageText">
        Se intentara abrir la webcam del computador o la camara trasera del celular. Centra la
        etiqueta dentro del recuadro y evita reflejos para leer mejor casa, torre, nombre y
        cualquier otro dato.
      </p>

      <div className="cameraPreviewShell">
        <video ref={videoRef} className="cameraPreview" autoPlay muted playsInline />
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
        onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
      />

      <div className="addPackageActions">
        <button type="button" className="modalSecondaryButton" onClick={onBack}>
          Volver
        </button>
        <button type="button" className="modalSecondaryButton" onClick={onOpenImagePicker}>
          Subir imagen
        </button>
        <button type="button" className="modalSecondaryButton" onClick={onRetryCamera}>
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

      <button type="button" className="linkLikeButton" onClick={onContinueWithForm}>
        Continuar con formulario
      </button>
    </div>
  );
}
