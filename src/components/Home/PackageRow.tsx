import "./PackageRow.css";
import type { PackageItem, PackageServiceView } from "./types";

type PackageRowProps = {
  item: PackageItem;
  activeView: PackageServiceView;
  checked: boolean;
  onSelect: (view: PackageServiceView, id: string, checked: boolean) => void;
  onShowQr: (item: PackageItem) => void;
  onEdit: (view: PackageServiceView, id: string) => void;
  onDelete: (view: PackageServiceView, ids: string[]) => void;
};

export default function PackageRow({
  item,
  activeView,
  checked,
  onSelect,
  onShowQr,
  onEdit,
  onDelete,
}: PackageRowProps) {
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
            <p className={`statusValue statusValue${item.estado}`}>{item.estado}</p>
          </div>

          <div className="packageActions inlineActions">
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
          <dd>{item.departamento}</dd>
        </div>
        <div>
          <dt>Nombre</dt>
          <dd>{item.nombre}</dd>
        </div>
        <div>
          <dt>Compania</dt>
          <dd>{item.compania}</dd>
        </div>
        <div>
          <dt>Conserje</dt>
          <dd>{item.conserje}</dd>
        </div>
        <div>
          <dt>Hora</dt>
          <dd>{item.hora}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{item.fecha}</dd>
        </div>
      </dl>
    </li>
  );
}
