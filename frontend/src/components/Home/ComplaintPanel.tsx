import "./ComplaintPanel.css";
import type { IssueItem, IssueStatus } from "../../types/home";
import {
  formatIssueStatus,
  formatParcelStatus,
  getIssueStatusClassName,
  getIssueStatusOptions,
  getQuickIssueStatus,
  getQuickIssueStatusLabel,
} from "../../utils/packageUtils";

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
  onSearchChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onIssueStatusChange: (issueId: string, nextStatus: IssueStatus) => void;
  startIndex: number;
};

const issueStatusOptions = getIssueStatusOptions();

export default function ComplaintPanel({
  title,
  searchTerm,
  pageSize,
  pageSizeOptions,
  filteredCount,
  safePage,
  totalPages,
  paginatedComplaints,
  updatingIssueId,
  canManageStatus,
  onSearchChange,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
  onIssueStatusChange,
  startIndex,
}: ComplaintPanelProps) {
  return (
    <section className="complaintPanel" aria-live="polite">
      <div className="complaintHeader">
        <h2>{title}</h2>
      </div>

      <div className="complaintTools">
        <label className="complaintSearchField">
          <span>Buscar reclamo</span>

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
              placeholder="Busca por nombre, número de paquete o reclamo"
            />
          </div>
        </label>
      </div>

      <p className="complaintResultsText">
        {filteredCount} reclamo{filteredCount === 1 ? "" : "s"} en total · página {safePage} de{" "}
        {totalPages}
      </p>

      <ul className="complaintList">
        {paginatedComplaints.map((item) => {
          const isUpdating = updatingIssueId === item.id;

          return (
            <li key={item.id} className="complaintItem">
              <div className="complaintMeta">
                <strong>{item.resident_name}</strong>
                <span>{item.id_parcel}</span>
                <span>{item.department_address}</span>
                <span>{item.business_name}</span>
                <span>{formatParcelStatus(item.parcel_status)}</span>
                <span>
                  {new Date(item.created_at).toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>

                <span
                  className={`complaintBadge complaintBadge${getIssueStatusClassName(item.issue_status)}`}
                >
                  {formatIssueStatus(item.issue_status)}
                </span>
              </div>

              <p className="complaintText">{item.issue_description}</p>

              {canManageStatus ? (
                <div className="complaintActions">
                  <label className="complaintStatusField">
                    <span>Estado</span>
                    <select
                      className="complaintStatusSelect"
                      value={item.issue_status}
                      onChange={(event) =>
                        onIssueStatusChange(item.id, event.target.value as IssueStatus)
                      }
                      disabled={isUpdating}
                    >
                      {issueStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    className={`complaintQuickAction complaintQuickAction${getIssueStatusClassName(
                      getQuickIssueStatus(item.issue_status),
                    )}`}
                    onClick={() =>
                      onIssueStatusChange(item.id, getQuickIssueStatus(item.issue_status))
                    }
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Guardando..." : getQuickIssueStatusLabel(item.issue_status)}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {filteredCount === 0 ? (
        <p className="complaintEmptyState">No hay reclamos que coincidan con la búsqueda.</p>
      ) : (
        <div className="complaintFooter">
          <label className="complaintPageSizeField">
            <span>Mostrar</span>

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
              Anterior
            </button>

            <span className="complaintPaginationInfo">
              Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, filteredCount)} de{" "}
              {filteredCount}
            </span>

            <button
              type="button"
              className="complaintPaginationButton"
              onClick={onNextPage}
              disabled={safePage === totalPages}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
