import { useI18nContext } from "@/i18n/i18n-react";
import { useState } from "react";
import "./ComplaintPanel.css";
import { sendContactEmail } from "../../services/homeApi";
import type { IssueItem, IssueStatus } from "../../types/home";
import { getIssueStatusClassName } from "../../utils/packageUtils";
import { getPhoneDigitsForWhatsapp } from "../../utils/phoneUtils";

const SEARCH_MAX_LENGTH = 50;

type ComplaintPanelProps = {
  title: string;
  searchTerm: string;
  pageSize: number;
  pageSizeOptions: readonly number[];
  filteredCount: number;
  safePage: number;
  totalPages: number;
  paginatedComplaints: IssueItem[];
  updatingIssueId: string | null;
  canManageStatus: boolean;
  senderEmail: string;
  selectedIssueIds: string[];
  selectedVisibleCount: number;
  allVisibleSelected: boolean;
  onSearchChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onSelect: (issueId: string, checked: boolean) => void;
  onSelectAllVisible: (checked: boolean) => void;
  onIssueStatusChange: (issueId: string, nextStatus: IssueStatus) => void;
  onBulkIssueStatusChange: (issueIds: string[], nextStatus: IssueStatus) => void;
  onDeleteIssue: (issueId: string) => void;
  onDeleteSelectedIssues: (issueIds: string[]) => void;
  startIndex: number;
};

function formatComplaintDate(value: string) {
  return new Date(value).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildWhatsappUrl(item: IssueItem) {
  const phone = getPhoneDigitsForWhatsapp(item.user_phone_number);

  if (!phone) {
    return "";
  }

  const text = `Hola ${item.resident_name}, te escribimos por tu reclamo asociado al paquete ${item.id_parcel} en LobbyPack.`;
  const params = new URLSearchParams({
    phone,
    text,
    type: "phone_number",
    app_absent: "0",
  });

  return `https://api.whatsapp.com/send/?${params.toString()}`;
}

export default function ComplaintPanel({title,
  searchTerm,
  pageSize,
  pageSizeOptions,
  filteredCount,
  safePage,
  totalPages,
  paginatedComplaints,
  updatingIssueId,
  canManageStatus,
  senderEmail,
  selectedIssueIds,
  selectedVisibleCount,
  allVisibleSelected,
  onSearchChange,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
  onSelect,
  onSelectAllVisible,
  onIssueStatusChange,
  onBulkIssueStatusChange,
  onDeleteIssue,
  onDeleteSelectedIssues,
  startIndex,
}: ComplaintPanelProps) {
  const { LL } = useI18nContext();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [emailTarget, setEmailTarget] = useState<IssueItem | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendBlindCopy, setSendBlindCopy] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState("");
  const hasSelectedIssues = selectedIssueIds.length > 0;
  const isUpdatingIssues = updatingIssueId !== null;
  const formatIssueStatusLabel = (status: IssueStatus) => {
    if (status === "open") return LL.admin_entered();
    if (status === "under_review") return LL.admin_markReview();
    return LL.admin_resolved();
  };

  const handleStatusChange = (issueId: string, nextStatus: IssueStatus) => {
    onIssueStatusChange(issueId, nextStatus);
    setOpenMenuId(null);
  };

  const openEmailModal = (item: IssueItem) => {
    setEmailTarget(item);
    setEmailSubject(`Hola ${item.resident_name}, te escribimos por tu reclamo ${item.id}`);
    setEmailMessage("");
    setSendBlindCopy(false);
    setEmailStatusMessage("");
    setOpenMenuId(null);
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
    if (!emailTarget?.resident_email) {
      return;
    }

    setIsSendingEmail(true);
    setEmailStatusMessage("");

    try {
      await sendContactEmail({
        to: emailTarget.resident_email,
        subject: emailSubject,
        message: emailMessage,
        bcc_sender: sendBlindCopy,
      });
      setEmailStatusMessage(t("admin.emailSent"));
      window.setTimeout(closeEmailModal, 900);
    } catch (error) {
      setEmailStatusMessage(
        error instanceof Error ? error.message : t("admin.emailError"),
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <section className="complaintPanel" aria-live="polite">
      <div className="complaintHeader">
        <h2>{title}</h2>
      </div>

      <div className="complaintTools">
        <label className="complaintSearchField">
          <span>{LL.admin_searchClaim()}</span>
          <div className="complaintSearchInputWrap">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="complaintSearchIcon">
              <path
                d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="m19 19-3.2-3.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              value={searchTerm}
              maxLength={SEARCH_MAX_LENGTH}
              onChange={(event) => onSearchChange(event.target.value.slice(0, SEARCH_MAX_LENGTH))}
              placeholder={LL.admin_searchClaimPlaceholder()}
            />
          </div>
        </label>
      </div>

      {hasSelectedIssues ? (
        <div className="complaintBulkBar">
          <strong>
            {selectedIssueIds.length}{" "}
            {selectedIssueIds.length === 1
              ? LL.admin_claimSelected()
              : LL.admin_claimsSelected()}
          </strong>
          <span>
            {selectedVisibleCount} {LL.admin_claimsVisiblePage()}
          </span>
          <div className="complaintBulkActions">
            <button
              type="button"
              onClick={() => onBulkIssueStatusChange(selectedIssueIds, "resolved")}
              disabled={!canManageStatus || isUpdatingIssues}
            >
              {LL.admin_markAnswered()}
            </button>
            <button
              type="button"
              onClick={() => onBulkIssueStatusChange(selectedIssueIds, "under_review")}
              disabled={!canManageStatus || isUpdatingIssues}
            >
              {LL.admin_markReview()}
            </button>
            <button
              type="button"
              className="complaintBulkDanger"
              onClick={() => onDeleteSelectedIssues(selectedIssueIds)}
              disabled={!canManageStatus || isUpdatingIssues}
            >
              {LL.admin_delete()}
            </button>
          </div>
        </div>
      ) : null}

      <p className="complaintResultsText">
        {filteredCount}{" "}
        {filteredCount === 1 ? LL.admin_claimTotal() : LL.admin_claimsTotal()} ·{" "}
        {LL.admin_page()} {safePage} {LL.admin_of()} {totalPages}
      </p>

      <div className="complaintTableWrap">
        <table className="complaintTable">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={paginatedComplaints.length === 0}
                  aria-label={LL.admin_selectVisible()}
                  onChange={(event) => onSelectAllVisible(event.target.checked)}
                />
              </th>
              <th>{LL.admin_messages()}</th>
              <th>{LL.admin_date()}</th>
              <th>{LL.admin_status()}</th>
              <th>{LL.admin_actions()}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedComplaints.map((item) => {
              const isUpdating = updatingIssueId === item.id;
              const whatsappUrl = buildWhatsappUrl(item);
              const isSelected = selectedIssueIds.includes(item.id);

              return (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      aria-label={`${LL.admin_claims()} ${item.id}`}
                      onChange={(event) => onSelect(item.id, event.target.checked)}
                    />
                  </td>
                  <td className="complaintMessageCell">
                    <button type="button" className="complaintResidentLink">
                      {item.resident_name}
                    </button>
                    <p>{item.issue_description}</p>
                    <span>
                      {item.id_parcel} · {item.department_address} · {item.business_name}
                    </span>
                  </td>
                  <td className="complaintDateCell">{formatComplaintDate(item.created_at)}</td>
                  <td>
                    <span
                      className={`complaintBadge complaintBadge${getIssueStatusClassName(
                        item.issue_status,
                      )}`}
                    >
                      {LL.admin_messageLabel()}
                    </span>
                    <span
                      className={`complaintBadge complaintBadge${getIssueStatusClassName(
                        item.issue_status,
                      )}`}
                    >
                      {formatIssueStatusLabel(item.issue_status)}
                    </span>
                  </td>
                  <td className="complaintActionCell">
                    <button
                      type="button"
                      className="complaintMenuButton"
                      onClick={() => setOpenMenuId((current) => (current === item.id ? null : item.id))}
                      aria-expanded={openMenuId === item.id}
                      aria-label={`${LL.admin_actions()} ${item.id}`}
                    >
                      ⋮
                    </button>

                    {openMenuId === item.id ? (
                      <div className="complaintMenu">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, "resolved")}
                          disabled={!canManageStatus || isUpdating}
                        >
                          {LL.admin_markAnswered()}
                        </button>
                        {item.resident_email ? (
                          <button type="button" onClick={() => openEmailModal(item)}>
                            {LL.admin_contactEmail()}
                          </button>
                        ) : (
                          <span>{LL.admin_noEmail()}</span>
                        )}
                        {whatsappUrl ? (
                          <a href={whatsappUrl} target="_blank" rel="noreferrer">
                            {LL.admin_contactWhatsapp()}
                          </a>
                        ) : (
                          <span>{LL.admin_noWhatsapp()}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, "under_review")}
                          disabled={!canManageStatus || isUpdating}
                        >
                          {LL.admin_markReview()}
                        </button>
                        <button
                          type="button"
                          className="complaintMenuDanger"
                          onClick={() => {
                            onDeleteIssue(item.id);
                            setOpenMenuId(null);
                          }}
                          disabled={!canManageStatus || isUpdating}
                        >
                          {LL.admin_delete()}
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredCount === 0 ? (
        <p className="complaintEmptyState">{LL.admin_noClaimResults()}</p>
      ) : (
        <div className="complaintFooter">
          <label className="complaintPageSizeField">
            <span>{LL.admin_show()}</span>
            <select
              className="complaintPageSizeSelect"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <div className="complaintPagination">
            <button
              type="button"
              className="complaintPaginationButton"
              onClick={onPrevPage}
              disabled={safePage === 1}
            >
              {LL.admin_previous()}
            </button>
            <span className="complaintPaginationInfo">
              {LL.admin_showing()} {startIndex + 1}-{Math.min(startIndex + pageSize, filteredCount)} {LL.admin_of()}{" "}
              {filteredCount}
            </span>
            <button
              type="button"
              className="complaintPaginationButton"
              onClick={onNextPage}
              disabled={safePage === totalPages}
            >
              {LL.admin_next()}
            </button>
          </div>
        </div>
      )}

      {emailTarget ? (
        <div className="emailModalOverlay" onClick={closeEmailModal}>
          <section
            className="emailModal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="complaintEmailModalTitle"
          >
            <div className="emailModalHeader">
              <h3 id="complaintEmailModalTitle">{LL.admin_sendEmail()}</h3>
              <button
                type="button"
                className="emailModalClose"
                onClick={closeEmailModal}
                aria-label={LL.settings_close()}
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
                  <span>{LL.admin_to()}</span>
                  <input type="email" value={emailTarget.resident_email} readOnly />
                </label>
                <label className="emailField">
                  <span>{LL.admin_from()}</span>
                  <input type="text" value={senderEmail || "LobbyPack"} readOnly />
                </label>
              </div>

              <label className="emailField">
                <span>{LL.admin_subject()}</span>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(event) => setEmailSubject(event.target.value)}
                  required
                />
              </label>

              <label className="emailField">
                <span>{LL.admin_message()}</span>
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
                  <span>{LL.admin_sendBlindCopy({ email: senderEmail })}</span>
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
                  {LL.admin_cancel()}
                </button>
                <button type="submit" className="primaryButton" disabled={isSendingEmail}>
                  {isSendingEmail ? LL.admin_sending() : LL.admin_send()}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
