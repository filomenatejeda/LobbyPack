// Panel para mostrar la lista de paquetes, con herramientas para buscar, seleccionar, editar y borrar paquetes. Incluye paginación y muestra el número total de paquetes y los seleccionados.
import "./PackagePanel.css";
import PackageRow from "./PackageRow";
import type { PackageItem, PackageServiceView } from "../../types/home";

type PackagePanelProps = {
  title: string;
  searchTerm: string;
  pageSize: number;
  pageSizeOptions: readonly number[];
  allVisibleSelected: boolean;
  filteredCount: number;
  safePage: number;
  totalPages: number;
  selectedVisibleCount: number;
  paginatedPackages: PackageItem[];
  currentSelections: string[];
  activeView: PackageServiceView;
  onSearchChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
  onSelectAllVisible: (checked: boolean) => void;
  onEditSelected: () => void;
  onDeleteSelected: () => void;
  onSelect: (view: PackageServiceView, id: string, checked: boolean) => void;
  onShowQr: (item: PackageItem) => void;
  onEdit: (view: PackageServiceView, id: string) => void;
  onDelete: (view: PackageServiceView, ids: string[]) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  startIndex: number;
};

export default function PackagePanel(props: PackagePanelProps) {
  const {
    title,
    searchTerm,
    pageSize,
    pageSizeOptions,
    allVisibleSelected,
    filteredCount,
    safePage,
    totalPages,
    selectedVisibleCount,
    paginatedPackages,
    currentSelections,
    activeView,
    onSearchChange,
    onPageSizeChange,
    onSelectAllVisible,
    onEditSelected,
    onDeleteSelected,
    onSelect,
    onShowQr,
    onEdit,
    onDelete,
    onPrevPage,
    onNextPage,
    startIndex,
  } = props;

  return (
    <section className="servicePanel" aria-live="polite">
      <div className="panelHeader">
        <h2>{title}</h2>
      </div>
      <div className="panelTools">
        <label className="searchField">
          <span>Buscar paquete</span>
          <div className="searchInputWrap">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="searchIcon">
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
              placeholder="Busca por código, nombre, depto. o compañía"
            />
          </div>
        </label>

        <label className="selectAllField">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={(event) => onSelectAllVisible(event.target.checked)}
          />
          <span>Seleccionar visibles</span>
        </label>

        <div className="bulkActions">
          <button
            type="button"
            className="toolbarButton"
            onClick={onEditSelected}
            disabled={selectedVisibleCount !== 1}
            aria-label="Editar paquete seleccionado"
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
            className="toolbarButton dangerButton"
            onClick={onDeleteSelected}
            disabled={selectedVisibleCount === 0}
            aria-label="Borrar paquetes seleccionados"
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

      <p className="resultsText">
        {filteredCount} paquete{filteredCount === 1 ? "" : "s"} en total · página {safePage} de{" "}
        {totalPages} · {selectedVisibleCount} seleccionado{selectedVisibleCount === 1 ? "" : "s"}
      </p>

      <ul className="packageList">
        {paginatedPackages.map((item) => (
          <PackageRow
            key={item.id}
            item={item}
            activeView={activeView}
            checked={currentSelections.includes(item.id)}
            onSelect={onSelect}
            onShowQr={onShowQr}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>

      {filteredCount === 0 ? (
        <p className="emptyState">No hay paquetes que coincidan con la búsqueda.</p>
      ) : (
        <div className="panelFooter">
          <label className="pageSizeField">
            <span>Mostrar</span>
            <select
              className="pageSizeSelect"
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

          <div className="pagination">
            <button
              type="button"
              className="paginationButton"
              onClick={onPrevPage}
              disabled={safePage === 1}
            >
              Anterior
            </button>
            <span className="paginationInfo">
              Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, filteredCount)} de{" "}
              {filteredCount}
            </span>
            <button
              type="button"
              className="paginationButton"
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
