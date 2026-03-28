import "./ComplaintPanel.css";
import type { ComplaintItem } from "./types";

type ComplaintPanelProps = {
  title: string;
  searchTerm: string;
  pageSize: number;
  pageSizeOptions: readonly number[];
  filteredCount: number;
  safePage: number;
  totalPages: number;
  paginatedComplaints: ComplaintItem[];
  onSearchChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  startIndex: number;
};

export default function ComplaintPanel({
  title,
  searchTerm,
  pageSize,
  pageSizeOptions,
  filteredCount,
  safePage,
  totalPages,
  paginatedComplaints,
  onSearchChange,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
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
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Busca por nombre, numero de paquete o reclamo"
            />
          </div>
        </label>

      </div>

      <p className="complaintResultsText">
        {filteredCount} reclamo{filteredCount === 1 ? "" : "s"} en total · pagina {safePage} de{" "}
        {totalPages}
      </p>

      <ul className="complaintList">
        {paginatedComplaints.map((item) => (
          <li key={item.id} className="complaintItem">
            <div className="complaintMeta">
              <strong>{item.nombre}</strong>
              <span>{item.numeroPaquete}</span>
              <span>{item.fecha}</span>
              <span className={`complaintBadge complaintBadge${item.estado.replace(/\s+/g, "")}`}>
                {item.estado}
              </span>
            </div>
            <p className="complaintText">{item.reclamo}</p>
          </li>
        ))}
      </ul>

      {filteredCount === 0 ? (
        <p className="complaintEmptyState">No hay reclamos que coincidan con la busqueda.</p>
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
