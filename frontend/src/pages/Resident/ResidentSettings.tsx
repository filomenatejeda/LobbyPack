import { useEffect, useState, type FormEvent } from "react";
import {
  updateResidentPhoneNumber,
  updateResidentWithdrawalPin,
} from "../../services/settingsApi";
import type { DashboardCurrentUser } from "../../types/home";
import {
  isValidInternationalPhone,
  normalizeInternationalPhone,
} from "../../utils/phoneUtils";
import "../Settings/Settings.css";
import "./ResidentSettings.css";

type ResidentSettingsProps = {
  currentUser: DashboardCurrentUser;
  packageCounts: {
    pending: number;
    claimed: number;
  };
  statusMessage?: string;
};

export default function ResidentSettings({
  currentUser,
  packageCounts,
  statusMessage = "",
}: ResidentSettingsProps) {
  const [phoneNumber, setPhoneNumber] = useState(currentUser.user_phone_number);
  const [savedPhoneNumber, setSavedPhoneNumber] = useState(currentUser.user_phone_number);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState("");
  const [withdrawalPin, setWithdrawalPin] = useState("");
  const [withdrawalPinConfirmation, setWithdrawalPinConfirmation] = useState("");
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [pinMessage, setPinMessage] = useState("");
  const [isPinConfigured, setIsPinConfigured] = useState(
    currentUser.withdrawal_pin_configured,
  );

  useEffect(() => {
    setPhoneNumber(currentUser.user_phone_number);
    setSavedPhoneNumber(currentUser.user_phone_number);
    setIsPinConfigured(currentUser.withdrawal_pin_configured);
  }, [currentUser.user_phone_number, currentUser.withdrawal_pin_configured]);

  const handlePhoneSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPhoneNumber = normalizeInternationalPhone(phoneNumber);

    if (!normalizedPhoneNumber) {
      setPhoneMessage("El telefono es obligatorio.");
      return;
    }

    if (!isValidInternationalPhone(normalizedPhoneNumber)) {
      setPhoneMessage("El telefono debe usar codigo de pais, por ejemplo +56912345678.");
      return;
    }

    setIsSavingPhone(true);
    setPhoneMessage("");

    try {
      const updatedResident = await updateResidentPhoneNumber(normalizedPhoneNumber);
      setPhoneNumber(updatedResident.user_phone_number);
      setSavedPhoneNumber(updatedResident.user_phone_number);
      setIsEditingPhone(false);
      setPhoneMessage("Telefono actualizado correctamente.");
    } catch (error) {
      setPhoneMessage(
        error instanceof Error ? error.message : "No se pudo actualizar el telefono.",
      );
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleCancelPhoneEdit = () => {
    setPhoneNumber(savedPhoneNumber);
    setPhoneMessage("");
    setIsEditingPhone(false);
  };

  const handlePinSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!/^\d{4,6}$/.test(withdrawalPin)) {
      setPinMessage("El PIN debe tener entre 4 y 6 digitos.");
      return;
    }

    if (withdrawalPin !== withdrawalPinConfirmation) {
      setPinMessage("Los PIN no coinciden.");
      return;
    }

    setIsSavingPin(true);
    setPinMessage("");

    try {
      await updateResidentWithdrawalPin(withdrawalPin);
      setWithdrawalPin("");
      setWithdrawalPinConfirmation("");
      setIsPinConfigured(true);
      setPinMessage("PIN de retiro actualizado correctamente.");
    } catch (error) {
      setPinMessage(error instanceof Error ? error.message : "No se pudo guardar el PIN.");
    } finally {
      setIsSavingPin(false);
    }
  };

  return (
    <main className="settingsPage residentSettingsPage">
      <section className="settingsHero residentSettingsHero">
        <p className="settingsEyebrow">Cuenta personal</p>
        <h1>Mi informacion</h1>
        <p className="settingsLead">
          Revisa los datos asociados a tu acceso de residente y el estado de tus retiros.
        </p>
      </section>

      {statusMessage ? <p className="settingsLead">{statusMessage}</p> : null}

      <section className="residentSettingsGrid">
        <article className="settingsCard residentProfileCard">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">Perfil</p>
              <h2>{currentUser.display_name}</h2>
            </div>
            <span className="settingsRole">Residente</span>
          </div>

          <dl className="settingsReadOnlyGrid residentSettingsDetails">
            <div className="settingsReadOnlyItem">
              <dt>Correo</dt>
              <dd>{currentUser.email}</dd>
            </div>
            <div className="settingsReadOnlyItem">
              <dt>Departamento</dt>
              <dd>{currentUser.department_address ?? "Sin departamento asignado"}</dd>
            </div>
            <div className="settingsReadOnlyItem">
              <dt>Telefono</dt>
              <dd>
                {isEditingPhone ? (
                  <form className="residentPhoneForm" onSubmit={handlePhoneSubmit}>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      placeholder="Ej: +56912345678"
                      maxLength={16}
                      required
                    />
                    <div className="residentPhoneActions">
                      <button type="submit" className="primaryButton" disabled={isSavingPhone}>
                        {isSavingPhone ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        type="button"
                        className="secondaryButton"
                        onClick={handleCancelPhoneEdit}
                        disabled={isSavingPhone}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="residentPhoneRead">
                    <span>{savedPhoneNumber || "Sin telefono registrado"}</span>
                    <button
                      type="button"
                      className="secondaryButton"
                      onClick={() => setIsEditingPhone(true)}
                    >
                      Editar
                    </button>
                  </div>
                )}
                {phoneMessage ? <p className="residentPhoneMessage">{phoneMessage}</p> : null}
              </dd>
            </div>
          </dl>
        </article>

        <article className="settingsCard residentAccessCard">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">Seguridad</p>
              <h2>Acceso de cuenta</h2>
            </div>
          </div>
          <div className="residentSettingsList">
            <div>
              <strong>PIN de retiro</strong>
              <span>
                {isPinConfigured
                  ? "Configurado para validar entregas cuando QR esta apagado."
                  : "Configura un PIN de 4 a 6 digitos para retirar sin QR."}
              </span>
            </div>
            <div>
              <strong>Sesion protegida</strong>
              <span>Usa tus credenciales registradas para ingresar a LobbyPack.</span>
            </div>
          </div>
          <form className="residentPinForm" onSubmit={handlePinSubmit}>
            <label className="settingsField">
              <span>Nuevo PIN</span>
              <input
                type="text"
                name="lobbypack-withdrawal-pin"
                className="pinCodeInput"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoCorrect="off"
                spellCheck={false}
                pattern="[0-9]*"
                minLength={4}
                maxLength={6}
                value={withdrawalPin}
                onChange={(event) =>
                  setWithdrawalPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="4 a 6 digitos"
              />
            </label>
            <label className="settingsField">
              <span>Confirmar PIN</span>
              <input
                type="text"
                name="lobbypack-withdrawal-pin-confirmation"
                className="pinCodeInput"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoCorrect="off"
                spellCheck={false}
                pattern="[0-9]*"
                minLength={4}
                maxLength={6}
                value={withdrawalPinConfirmation}
                onChange={(event) =>
                  setWithdrawalPinConfirmation(
                    event.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
                placeholder="Repite tu PIN"
              />
            </label>
            <button
              type="submit"
              className="primaryButton"
              disabled={isSavingPin || !withdrawalPin || !withdrawalPinConfirmation}
            >
              {isSavingPin ? "Guardando..." : isPinConfigured ? "Cambiar PIN" : "Guardar PIN"}
            </button>
            {pinMessage ? <p className="residentPhoneMessage">{pinMessage}</p> : null}
          </form>
        </article>

        <article className="settingsCard settingsCardWide residentPackageStatusCard">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">Mis paquetes</p>
              <h2>Estado de retiros</h2>
            </div>
          </div>
          <div className="settingsStats residentSettingsStats">
            <div className="settingsStat">
              <strong>{packageCounts.pending}</strong>
              <span>Pendientes para retirar</span>
            </div>
            <div className="settingsStat">
              <strong>{packageCounts.claimed}</strong>
              <span>Entregados a tu cuenta</span>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
