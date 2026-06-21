import { useState } from "react";
import "./PackageRow.css";
import { sendContactEmail } from "../../services/homeApi";
import type {
  PackageServiceView,
  ParcelDepartmentResident,
  ParcelItem,
} from "../../types/home";
import {
  formatParcelDate,
  formatParcelStatus,
  formatParcelTime,
  getParcelDate,
} from "../../utils/packageUtils";
import { getPhoneDigitsForWhatsapp, getPhoneHref } from "../../utils/phoneUtils";

type PackageRowProps = {
  item: ParcelItem;
  activeView: PackageServiceView;
  senderEmail: string;
  qrAccessEnabled: boolean;
  checked: boolean;
  onSelect: (view: PackageServiceView, id: string, checked: boolean) => void;
  onShowQr: (item: ParcelItem) => void;
  onShowPin: (item: ParcelItem) => void;
  onEdit: (view: PackageServiceView, id: string) => void;
  onDelete: (view: PackageServiceView, ids: string[]) => void;
};

type ContactTarget = Pick<
  ParcelDepartmentResident,
  "resident_name" | "user_phone_number" | "email"
>;

type EmailDraftTarget = Pick<ParcelDepartmentResident, "resident_name" | "email">;

function getWhatsappPhone(phoneNumber: string) {
  const digits = getPhoneDigitsForWhatsapp(phoneNumber);

  if (!digits) {
    return "";
  }

  return digits;
}

function buildWhatsappUrl(item: ParcelItem, contact: ContactTarget) {
  const phone = getWhatsappPhone(contact.user_phone_number);

  if (!phone) {
    return "";
  }

  const message = `Hola ${contact.resident_name}, te escribo en relacion al paquete ${item.id} del departamento ${item.department_address} en LobbyPack.`;
  const params = new URLSearchParams({
    phone,
    text: message,
    type: "phone_number",
    app_absent: "0",
  });

  return `https://api.whatsapp.com/send/?${params.toString()}`;
}

export default function PackageRow({
  item,
  activeView,
  senderEmail,
  qrAccessEnabled,
  checked,
  onSelect,
  onShowQr,
  onShowPin,
  onEdit,
  onDelete,
}: PackageRowProps) {
  const [showDepartmentContacts, setShowDepartmentContacts] = useState(false);
  const [emailTarget, setEmailTarget] = useState<EmailDraftTarget | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendBlindCopy, setSendBlindCopy] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState("");
  const parcelDate = getParcelDate(item);
  const packageWhatsappUrl = buildWhatsappUrl(item, {
    resident_name: item.resident_name,
    user_phone_number: item.user_phone_number,
    email: "",
  });
  const departmentResidents = item.department_residents ?? [];
  const hasDepartmentContacts = departmentResidents.length > 0;

  const openEmailModal = (resident: EmailDraftTarget) => {
    setEmailTarget(resident);
    setEmailSubject(`Hola ${resident.resident_name}, te escribimos por tu paquete ${item.id}`);
    setEmailMessage("");
    setSendBlindCopy(false);
    setEmailStatusMessage("");
  };

  const closeEmailModal = () => {
    setEmailTarget(null);
    setEmailSubject("");
    setEmailMessage("");
    setSendBlindCopy(false);
    setIsSendingEmail(false);
    setEmailStatusMessage("");
  };

  const sendEmail = async () => {
    if (!emailTarget?.email) {
      return;
    }

    setIsSendingEmail(true);
    setEmailStatusMessage("");

    try {
      await sendContactEmail({
        to: emailTarget.email,
        subject: emailSubject,
        message: emailMessage,
        bcc_sender: sendBlindCopy,
      });
      setEmailStatusMessage("Correo enviado correctamente.");
      window.setTimeout(closeEmailModal, 900);
    } catch (error) {
      setEmailStatusMessage(
        error instanceof Error ? error.message : "No se pudo enviar el correo.",
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <li className="packageItem">
      <div className="packageTop">
        <div className="packageTopLeft">
          <label className="packageCheckbox">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => onSelect(activeView, item.id, event.target.checked)}
            />
          </label>
          <strong>{item.id}</strong>
        </div>
        <div className="packageTopActions">
          <div className="statusField">
            <span>Estado</span>
            <p
              className={`statusValue ${
                item.parcel_status === "pending" ? "statusValueRecepcion" : "statusValueRetiro"
              }`}
            >
              {formatParcelStatus(item.parcel_status)}
            </p>
            {item.parcel_status === "pending" && item.resident_claim_confirmed_at ? (
              <p className="statusValue statusValueRetiro">Residente confirmo retiro</p>
            ) : null}
          </div>

          <div className="packageActions inlineActions">
            {item.parcel_status === "pending" && qrAccessEnabled ? (
              <button
                type="button"
                className="rowActionButton qrButton"
                onClick={() => onShowQr(item)}
                aria-label={`Mostrar QR del paquete ${item.id}`}
                title="Mostrar QR"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="actionIcon">
                  <path
                    d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 14h2v2h-2zM18 14h2v6h-6v-2M14 18h2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : null}
            {item.parcel_status === "pending" && !qrAccessEnabled ? (
              <button
                type="button"
                className="rowActionButton qrButton"
                onClick={() => onShowPin(item)}
                aria-label={`Validar PIN del paquete ${item.id}`}
                title="Validar PIN"
              >
                PIN
              </button>
            ) : null}
            {packageWhatsappUrl ? (
              <a
                className="rowActionButton whatsappButton"
                href={packageWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Contactar por WhatsApp a ${item.resident_name}`}
                title="WhatsApp del paquete"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="actionIcon">
                  <path
                    d="M5.4 18.6 6.3 15A7 7 0 1 1 9 17.7l-3.6.9Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.4 8.7c.2-.4.5-.4.8-.2l.7 1c.2.2.1.5-.1.7l-.4.4c.5 1 1.3 1.8 2.4 2.3l.4-.5c.2-.2.5-.3.8-.1l1 .6c.3.2.3.5.2.8-.2.6-.8 1-1.5 1-2.2-.1-5.2-3.1-5.3-5.3 0-.4.3-.7 1-1Z"
                    fill="currentColor"
                  />
                </svg>
              </a>
            ) : null}
            <button
              type="button"
              className="rowActionButton"
              onClick={() => onEdit(activeView, item.id)}
              aria-label={`Editar paquete ${item.id}`}
              title="Editar"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="actionIcon">
                <path
                  d="M4 20h4l10.5-10.5a1.4 1.4 0 0 0 0-2L16.5 5a1.4 1.4 0 0 0-2 0L4 15.5V20Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.5 6l4.5 4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="rowActionButton dangerButton"
              onClick={() => onDelete(activeView, [item.id])}
              aria-label={`Borrar paquete ${item.id}`}
              title="Borrar"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="actionIcon">
                <path
                  d="M5 7h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M9 7V5.8C9 4.8 9.8 4 10.8 4h2.4C14.2 4 15 4.8 15 5.8V7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 7l.8 11c.1 1.1 1 2 2.1 2h4.2c1.1 0 2-.9 2.1-2L17 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 11v5M14 11v5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <dl className="packageDetails">
        <div>
          <dt>Departamento</dt>
          <dd>
            <button
              type="button"
              className="departmentContactButton"
              onClick={() => setShowDepartmentContacts((current) => !current)}
              aria-expanded={showDepartmentContacts}
            >
              {item.department_address}
            </button>
          </dd>
        </div>
        <div>
          <dt>Nombre</dt>
          <dd>{item.resident_name}</dd>
        </div>
        <div>
          <dt>Compañía</dt>
          <dd>{item.business_name}</dd>
        </div>
        <div>
          <dt>Teléfono</dt>
          <dd>
            {item.user_phone_number ? (
              <a className="contactLink" href={`tel:${getPhoneHref(item.user_phone_number)}`}>
                {item.user_phone_number}
              </a>
            ) : (
              "Sin número"
            )}
          </dd>
        </div>
        <div>
          <dt>Conserje</dt>
          <dd>{item.concierge_name}</dd>
        </div>
        {item.parcel_status === "claimed" ? (
          <div>
            <dt>Retirado por</dt>
            <dd>{item.claimed_by_name || item.resident_name}</dd>
          </div>
        ) : null}
        {item.parcel_status === "pending" && item.resident_claimed_by_name ? (
          <div>
            <dt>Confirmado por</dt>
            <dd>{item.resident_claimed_by_name}</dd>
          </div>
        ) : null}
        <div>
          <dt>Hora</dt>
          <dd>{formatParcelTime(parcelDate)}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{formatParcelDate(parcelDate)}</dd>
        </div>
      </dl>

      {showDepartmentContacts ? (
        <div className="departmentContactsPanel">
          <div className="departmentContactsHeader">
            <strong>Contactos del {item.department_address}</strong>
            <span>
              {hasDepartmentContacts
                ? `${departmentResidents.length} residente${
                    departmentResidents.length === 1 ? "" : "s"
                  }`
                : "Sin residentes registrados"}
            </span>
          </div>

          {hasDepartmentContacts ? (
            <ul className="departmentContactsList">
              {departmentResidents.map((resident) => {
                const whatsappUrl = buildWhatsappUrl(item, resident);

                return (
                  <li key={resident.user_id} className="departmentContactItem">
                    <div className="departmentContactInfo">
                      <strong>{resident.resident_name}</strong>
                      {resident.email ? (
                        <button
                          type="button"
                          className="contactInlineLink"
                          onClick={() => openEmailModal(resident)}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M4.5 6.5h15v11h-15z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinejoin="round"
                            />
                            <path
                              d="m5 7 7 6 7-6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>{resident.email}</span>
                        </button>
                      ) : (
                        <span>Sin correo</span>
                      )}
                      {whatsappUrl ? (
                        <a
                          className="contactInlineLink whatsappInlineLink"
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M5.4 18.6 6.3 15A7 7 0 1 1 9 17.7l-3.6.9Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M9.4 8.7c.2-.4.5-.4.8-.2l.7 1c.2.2.1.5-.1.7l-.4.4c.5 1 1.3 1.8 2.4 2.3l.4-.5c.2-.2.5-.3.8-.1l1 .6c.3.2.3.5.2.8-.2.6-.8 1-1.5 1-2.2-.1-5.2-3.1-5.3-5.3 0-.4.3-.7 1-1Z"
                              fill="currentColor"
                            />
                          </svg>
                          <span>{resident.user_phone_number}</span>
                        </a>
                      ) : (
                        <span>Sin numero</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="departmentContactsEmpty">
              No hay contactos asociados a este departamento.
            </p>
          )}
        </div>
      ) : null}

      {emailTarget ? (
        <div className="emailModalOverlay" onClick={closeEmailModal}>
          <section
            className="emailModal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="emailModalTitle"
          >
            <div className="emailModalHeader">
              <h3 id="emailModalTitle">Enviar un email</h3>
              <button
                type="button"
                className="emailModalClose"
                onClick={closeEmailModal}
                aria-label="Cerrar"
              >
                X
              </button>
            </div>

            <form
              className="emailForm"
              onSubmit={(event) => {
                event.preventDefault();
                void sendEmail();
              }}
            >
              <div className="emailFormRow">
                <label className="emailField">
                  <span>Para</span>
                  <input type="email" value={emailTarget.email} readOnly />
                </label>
                <label className="emailField">
                  <span>De</span>
                  <input type="text" value={senderEmail || "LobbyPack"} readOnly />
                </label>
              </div>

              <label className="emailField">
                <span>Asunto</span>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(event) => setEmailSubject(event.target.value)}
                  required
                />
              </label>

              <label className="emailField">
                <span>Mensaje</span>
                <textarea
                  value={emailMessage}
                  onChange={(event) => setEmailMessage(event.target.value)}
                  rows={5}
                />
              </label>

              {senderEmail ? (
                <label className="emailBccField">
                  <input
                    type="checkbox"
                    checked={sendBlindCopy}
                    onChange={(event) => setSendBlindCopy(event.target.checked)}
                  />
                  <span>Enviar a {senderEmail} como copia oculta</span>
                </label>
              ) : null}

              {emailStatusMessage ? (
                <p className="emailStatusMessage">{emailStatusMessage}</p>
              ) : null}

              <div className="emailModalActions">
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={closeEmailModal}
                  disabled={isSendingEmail}
                >
                  Cancelar
                </button>
                <button type="submit" className="primaryButton" disabled={isSendingEmail}>
                  {isSendingEmail ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </li>
  );
}
