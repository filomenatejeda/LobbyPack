// Importa los estilos exclusivos del panel de reclamos.
import "./ComplaintPanel.css";
// Importa el tipo que representa un reclamo individual.
import type { ComplaintItem } from "../../types/home";

// Convierte el estado interno del reclamo en un texto legible para el usuario.
const complaintStatusLabels = {
  Submitted: "Ingresado",
  InReview: "En revisión",
  Resolved: "Resuelto",
} as const;

// Define el sufijo usado para armar la clase CSS del badge de estado.
const complaintStatusClassNames = {
  Submitted: "Ingresado",
  InReview: "Enrevision",
  Resolved: "Resuelto",
} as const;

// Describe todas las props que recibe el componente.
type ComplaintPanelProps = {
  // Titulo del panel.
  title: string;
  // Valor actual del buscador.
  searchTerm: string;
  // Cantidad de elementos por pagina.
  pageSize: number;
  // Opciones permitidas para el tamaño de pagina.
  pageSizeOptions: readonly number[];
  // Total de reclamos despues del filtro.
  filteredCount: number;
  // Pagina actual ya ajustada a un rango valido.
  safePage: number;
  // Total de paginas disponibles.
  totalPages: number;
  // Reclamos que se muestran en la pagina actual.
  paginatedComplaints: ComplaintItem[];
  // Actualiza el texto del buscador.
  onSearchChange: (value: string) => void;
  // Actualiza el tamaño de pagina.
  onPageSizeChange: (value: number) => void;
  // Retrocede una pagina.
  onPrevPage: () => void;
  // Avanza una pagina.
  onNextPage: () => void;
  // Posicion inicial del rango visible.
  startIndex: number;
};

// Renderiza la vista de reclamos con busqueda y paginacion.
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
      {/* Encabezado principal del panel. */}
      <div className="complaintHeader">
        <h2>{title}</h2>
      </div>

      {/* Zona de herramientas: aqui vive el buscador. */}
      <div className="complaintTools">
        <label className="complaintSearchField">
          <span>Buscar reclamo</span>

          <div className="complaintSearchInputWrap">
            {/* Icono de lupa del campo de busqueda. */}
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
              placeholder="Busca por nombre, número de paquete o reclamo"
            />
          </div>
        </label>
      </div>

      {/* Resumen del total filtrado y la pagina actual. */}
      <p className="complaintResultsText">
        {filteredCount} reclamo{filteredCount === 1 ? "" : "s"} en total · página {safePage} de{" "}
        {totalPages}
      </p>

      {/* Lista de reclamos visibles en la pagina actual. */}
      <ul className="complaintList">
        {paginatedComplaints.map((item) => (
          <li key={item.id} className="complaintItem">
            <div className="complaintMeta">
              <strong>{item.residentName}</strong>
              <span>{item.packageNumber}</span>
              <span>{item.date}</span>

              {/* Badge con texto visible y clase CSS segun el estado. */}
              <span
                className={`complaintBadge complaintBadge${complaintStatusClassNames[item.status]}`}
              >
                {complaintStatusLabels[item.status]}
              </span>
            </div>

            <p className="complaintText">{item.complaint}</p>
          </li>
        ))}
      </ul>

      {/* Si no hay resultados, muestra estado vacio; si hay, muestra la paginacion. */}
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
