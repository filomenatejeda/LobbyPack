import { useI18nContext } from "@/i18n/i18n-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  updateResidentPhoneNumber,
  updateResidentWithdrawalPin,
} from "../../services/settingsApi";
import { useI18n } from "../../lib/i18n";
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

export default function ResidentSettings({currentUser,
  packageCounts,
  statusMessage = "",
}: ResidentSettingsProps) {
  const { LL } = useI18nContext();
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
      setPhoneMessage(LL.resident_phoneRequired());
      return;
    }

    if (!isValidInternationalPhone(normalizedPhoneNumber)) {
      setPhoneMessage(LL.resident_phoneInvalid());
      return;
    }

    setIsSavingPhone(true);
    setPhoneMessage("");

    try {
      const updatedResident = await updateResidentPhoneNumber(normalizedPhoneNumber);
      setPhoneNumber(updatedResident.user_phone_number);
      setSavedPhoneNumber(updatedResident.user_phone_number);
      setIsEditingPhone(false);
      setPhoneMessage(LL.resident_phoneUpdated());
    } catch (error) {
      setPhoneMessage(
        error instanceof Error ? error.message : LL.resident_phoneUpdateError(),
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
      setPinMessage(LL.resident_pinInvalid());
      return;
    }

    if (withdrawalPin !== withdrawalPinConfirmation) {
      setPinMessage(LL.resident_pinMismatch());
      return;
    }

    setIsSavingPin(true);
    setPinMessage("");

    try {
      await updateResidentWithdrawalPin(withdrawalPin);
      setWithdrawalPin("");
      setWithdrawalPinConfirmation("");
      setIsPinConfigured(true);
      setPinMessage(LL.resident_pinUpdated());
    } catch (error) {
      setPinMessage(error instanceof Error ? error.message : LL.resident_pinSaveError());
    } finally {
      setIsSavingPin(false);
    }
  };

  return (
    <main className="settingsPage residentSettingsPage">
      <section className="settingsHero residentSettingsHero">
        <p className="settingsEyebrow">{LL.resident_personalAccount()}</p>
        <h1>{LL.resident_myInfo()}</h1>
        <p className="settingsLead">
          {LL.resident_personalLead()}
        </p>
      </section>

      {statusMessage ? <p className="settingsLead">{statusMessage}</p> : null}

      <section className="residentSettingsGrid">
        <article className="settingsCard residentProfileCard">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">{LL.resident_profile()}</p>
              <h2>{currentUser.display_name}</h2>
            </div>
            <span className="settingsRole">{LL.resident_resident()}</span>
          </div>

          <dl className="settingsReadOnlyGrid residentSettingsDetails">
            <div className="settingsReadOnlyItem">
              <dt>{LL.resident_email()}</dt>
              <dd>{currentUser.email}</dd>
            </div>
            <div className="settingsReadOnlyItem">
              <dt>{LL.admin_department()}</dt>
              <dd>{currentUser.department_address ?? LL.resident_emptyDepartment()}</dd>
            </div>
            <div className="settingsReadOnlyItem">
              <dt>{LL.resident_phone()}</dt>
              <dd>
                {isEditingPhone ? (
                  <form className="residentPhoneForm" onSubmit={handlePhoneSubmit}>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      placeholder={LL.admin_phoneExample()}
                      maxLength={16}
                      required
                    />
                    <div className="residentPhoneActions">
                      <button type="submit" className="primaryButton" disabled={isSavingPhone}>
                        {isSavingPhone ? LL.resident_saving() : LL.resident_save()}
                      </button>
                      <button
                        type="button"
                        className="secondaryButton"
                        onClick={handleCancelPhoneEdit}
                        disabled={isSavingPhone}
                      >
                        {LL.admin_cancel()}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="residentPhoneRead">
                    <span>{savedPhoneNumber || LL.resident_phoneEmpty()}</span>
                    <button
                      type="button"
                      className="secondaryButton"
                      onClick={() => setIsEditingPhone(true)}
                    >
                      {LL.resident_edit()}
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
              <p className="settingsLabel">{LL.resident_security()}</p>
              <h2>{LL.resident_accountAccess()}</h2>
            </div>
          </div>
          <div className="residentSettingsList">
            <div>
              <strong>{LL.admin_pinLabel()}</strong>
              <span>
                {isPinConfigured
                  ? LL.resident_configuredPin()
                  : LL.resident_configurePin()}
              </span>
            </div>
            <div>
              <strong>{LL.resident_sessionProtected()}</strong>
              <span>{LL.resident_sessionProtectedText()}</span>
            </div>
          </div>
          <form className="residentPinForm" onSubmit={handlePinSubmit}>
            <label className="settingsField">
              <span>{LL.resident_newPin()}</span>
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
                placeholder={LL.admin_pinDigits()}
              />
            </label>
            <label className="settingsField">
              <span>{LL.resident_confirmPin()}</span>
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
                placeholder={LL.admin_pinRepeat()}
              />
            </label>
            <button
              type="submit"
              className="primaryButton"
              disabled={isSavingPin || !withdrawalPin || !withdrawalPinConfirmation}
            >
              {isSavingPin
                ? LL.resident_saving()
                : isPinConfigured
                  ? LL.resident_changePin()
                  : LL.resident_savePin()}
            </button>
            {pinMessage ? <p className="residentPhoneMessage">{pinMessage}</p> : null}
          </form>
        </article>

        <article className="settingsCard settingsCardWide residentPackageStatusCard">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">{LL.resident_myPackages()}</p>
              <h2>{LL.resident_withdrawStatus()}</h2>
            </div>
          </div>
          <div className="settingsStats residentSettingsStats">
            <div className="settingsStat">
              <strong>{packageCounts.pending}</strong>
              <span>{LL.resident_pending()}</span>
            </div>
            <div className="settingsStat">
              <strong>{packageCounts.claimed}</strong>
              <span>{LL.resident_delivered()}</span>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
