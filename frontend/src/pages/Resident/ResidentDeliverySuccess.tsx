import { Navigate, useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/Logo1.png";
import type { ParcelItem } from "../../types/home";
import "./ResidentDeliverySuccess.css";

type DeliverySuccessState = {
  parcel?: ParcelItem;
};

export default function ResidentDeliverySuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const parcel = (location.state as DeliverySuccessState | null)?.parcel;

  if (!parcel) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="deliverySuccessPage">
      <section className="deliverySuccessCard" aria-live="polite">
        <div className="deliverySuccessVisual">
          <img className="deliverySuccessLogo" src={logo} alt="LobbyPack" />
          <div className="deliverySuccessCheck" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M9.2 16.6 4.9 12.3l1.7-1.7 2.6 2.6 8.2-8.2 1.7 1.7z" />
            </svg>
          </div>
        </div>
        <div className="deliverySuccessContent">
          <p className="deliverySuccessEyebrow">Retiro confirmado</p>
          <h1>Paquete entregado con exito</h1>
          <p className="deliverySuccessText">
            El paquete quedo registrado como retirado correctamente.
          </p>
          <strong className="deliverySuccessParcel">{parcel.id}</strong>
          <button
            type="button"
            className="deliverySuccessButton"
            onClick={() => navigate("/dashboard?view=claimed", { replace: true })}
          >
            Ver detalles
          </button>
        </div>
      </section>
    </main>
  );
}
