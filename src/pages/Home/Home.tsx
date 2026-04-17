import { useCallback, useState } from "react";
import AddPackageModal from "../../components/Home/AddPackageModal";
import type { AddPackageFormValues } from "../../components/Home/addPackageTypes";
import ComplaintPanel from "../../components/Home/ComplaintPanel";
import PackagePanel from "../../components/Home/PackagePanel";
import QrModal from "../../components/Home/QrModal";
import type {
  PackageItem,
  PackageServiceView,
  ServiceView,
} from "../../types/home";
import { initialComplaints, initialPackageViews, pageSizeOptions } from "../../data/homeData";
import { createPackageFromForm } from "../../utils/packageUtils";
import "./Home.css";

export default function Home() {
  // Controla qué vista principal está activa: recepcionados, retirados o reclamos.
  const [activeView, setActiveView] = useState<ServiceView>("received");
  // Guarda las dos colecciones principales de paquetes que se muestran en la pantalla.
  const [packageViews, setPackageViews] = useState(initialPackageViews);
  // Los reclamos se consumen como datos iniciales estáticos para la demo.
  const complaints = initialComplaints;
  // Texto compartido por el buscador de paquetes y reclamos.
  const [searchTerm, setSearchTerm] = useState("");
  // Define cuántos registros se muestran por página.
  const [pageSize, setPageSize] = useState<number>(25);
  // Mantiene la página actual de la tabla visible.
  const [currentPage, setCurrentPage] = useState(1);
  // Guarda los ids seleccionados por cada vista de paquetes para acciones masivas.
  const [selectedIds, setSelectedIds] = useState<Record<PackageServiceView, string[]>>({
    received: [],
    pickedUp: [],
  });
  // Referencia el paquete cuyo QR se está mostrando en el modal.
  const [qrPackage, setQrPackage] = useState<PackageItem | null>(null);
  // Muestra un mensaje breve después de simular el escaneo de un QR.
  const [qrScanMessage, setQrScanMessage] = useState("");
  // Abre o cierra el modal para registrar un nuevo paquete.
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);

  // Reclamos y paquetes comparten el mismo buscador y la misma paginación.
  const currentPackageView = activeView === "complaints" ? null : packageViews[activeView];
  // Normaliza el texto buscado para hacer comparaciones sin espacios extra ni mayúsculas.
  const normalizedSearch = searchTerm.trim().toLowerCase();
  // Filtra reclamos usando un texto compuesto con sus campos más relevantes.
  const filteredComplaints = complaints.filter((item) => {
    const searchableText = [item.residentName, item.packageNumber, item.complaint, item.date, item.status]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
  });
  // Filtra paquetes combinando sus datos visibles en una sola cadena de búsqueda.
  const filteredPackages = (currentPackageView?.packages ?? []).filter((item) => {
    const searchableText = [
      item.id,
      item.apartment,
      item.residentName,
      item.phone,
      item.company,
      item.concierge,
      item.time,
      item.date,
      item.status,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
  });

  // Calcula la cantidad de registros según la vista actualmente seleccionada.
  const viewCount = activeView === "complaints" ? filteredComplaints.length : filteredPackages.length;
  // Garantiza que siempre exista al menos una página, aunque no haya resultados.
  const totalPages = Math.max(1, Math.ceil(viewCount / pageSize));
  // Evita que currentPage apunte a una página mayor que las disponibles.
  const safePage = Math.min(currentPage, totalPages);
  // Índice inicial usado para paginar paquetes o reclamos.
  const startIndex = (safePage - 1) * pageSize;
  // Corta la lista filtrada de paquetes para mostrar solo la página actual.
  const paginatedPackages = filteredPackages.slice(startIndex, startIndex + pageSize);
  // Corta la lista filtrada de reclamos para mostrar solo la página actual.
  const paginatedComplaints = filteredComplaints.slice(startIndex, startIndex + pageSize);
  // Recupera la selección actual solo cuando la vista activa corresponde a paquetes.
  const currentSelections = activeView === "complaints" ? [] : selectedIds[activeView];
  // Obtiene los ids seleccionados que además siguen presentes en los resultados filtrados.
  const selectedVisibleIds = filteredPackages
    .filter((item) => currentSelections.includes(item.id))
    .map((item) => item.id);
  // Marca el checkbox maestro cuando todos los paquetes visibles están seleccionados.
  const allVisibleSelected =
    paginatedPackages.length > 0 &&
    paginatedPackages.every((item) => currentSelections.includes(item.id));

  // Guarda la selección por vista para que "recepcionados" y "retirados" sean independientes.
  const handlePackageSelection = (view: PackageServiceView, id: string, checked: boolean) => {
    setSelectedIds((current) => ({
      ...current,
      [view]: checked
        ? [...current[view], id]
        : current[view].filter((selectedId) => selectedId !== id),
    }));
  };

  // Aplica la selección masiva solo a los paquetes visibles en la página actual.
  const handleSelectAllVisible = (checked: boolean) => {
    if (activeView === "complaints") return;

    setSelectedIds((current) => ({
      ...current,
      [activeView]: checked
        ? Array.from(new Set([...current[activeView], ...paginatedPackages.map((item) => item.id)]))
        : current[activeView].filter(
            (selectedId) => !paginatedPackages.some((item) => item.id === selectedId),
          ),
    }));
  };

  // Centraliza las actualizaciones inmutables para reutilizar el mismo patrón en edición y QR.
  const updatePackage = (
    view: PackageServiceView,
    id: string,
    updater: (item: PackageItem) => PackageItem,
  ) => {
    setPackageViews((current) => ({
      ...current,
      [view]: {
        ...current[view],
        packages: current[view].packages.map((item) => (item.id === id ? updater(item) : item)),
      },
    }));
  };

  // Los prompts permiten editar rápido los datos mock sin abrir otro modal de formulario.
  const handleEditPackage = (view: PackageServiceView, id: string) => {
    const target = packageViews[view].packages.find((item) => item.id === id);
    if (!target) return;

    const apartment = window.prompt("Departamento", target.apartment);
    if (apartment === null) return;
    const residentName = window.prompt("Nombre", target.residentName);
    if (residentName === null) return;
    const phone = window.prompt("Telefono", target.phone);
    if (phone === null) return;
    const company = window.prompt("Compania", target.company);
    if (company === null) return;
    const concierge = window.prompt("Conserje", target.concierge);
    if (concierge === null) return;
    const time = window.prompt("Hora", target.time);
    if (time === null) return;
    const date = window.prompt("Fecha", target.date);
    if (date === null) return;

    updatePackage(view, id, (item) => ({
      ...item,
      apartment,
      residentName,
      phone,
      company,
      concierge,
      time,
      date,
    }));
  };

  // Al borrar se actualizan los datos y la selección para no dejar checks colgados.
  const handleDeletePackages = (view: PackageServiceView, ids: string[]) => {
    if (ids.length === 0) return;
    const confirmed = window.confirm(
      ids.length === 1
        ? "¿Quieres borrar este paquete?"
        : `¿Quieres borrar ${ids.length} paquetes?`,
    );
    if (!confirmed) return;

    setPackageViews((current) => ({
      ...current,
      [view]: {
        ...current[view],
        packages: current[view].packages.filter((item) => !ids.includes(item.id)),
      },
    }));

    setSelectedIds((current) => ({
      ...current,
      [view]: current[view].filter((selectedId) => !ids.includes(selectedId)),
    }));
  };

  // La edición masiva se limita a exactamente un paquete seleccionado.
  const handleEditSelected = () => {
    if (activeView === "complaints") return;
    if (selectedVisibleIds.length !== 1) return;
    handleEditPackage(activeView, selectedVisibleIds[0]);
  };

  // Abre el modal QR para el paquete elegido y limpia mensajes anteriores.
  const openQrModal = (item: PackageItem) => {
    setQrScanMessage("");
    setQrPackage(item);
  };

  // Cierra el modal QR; useCallback evita recrear la función innecesariamente.
  const closeQrModal = useCallback(() => {
    setQrPackage(null);
  }, []);

  // Mover un paquete actualiza la colección que actualmente contiene ese item.
  const movePackageToPickedUp = (id: string) => {
    let movedPackage: PackageItem | null = null;

    setPackageViews((current) => {
      const receivedPackages = current.received.packages.filter((item) => {
        if (item.id === id) {
          movedPackage = { ...item, status: "PickedUp" };
          return false;
        }
        return true;
      });

      if (!movedPackage) {
        return {
          ...current,
          pickedUp: {
            ...current.pickedUp,
            packages: current.pickedUp.packages.map((item) =>
              item.id === id ? { ...item, status: "PickedUp" } : item,
            ),
          },
        };
      }

      return {
        ...current,
        received: {
          ...current.received,
          packages: receivedPackages,
        },
        pickedUp: {
          ...current.pickedUp,
          packages: [movedPackage, ...current.pickedUp.packages],
        },
      };
    });

    setSelectedIds((current) => ({
      received: current.received.filter((selectedId) => selectedId !== id),
      pickedUp: current.pickedUp,
    }));
  };

  // El escaneo QR simula el retiro resolviendo el id codificado en el payload.
  const handleQrScan = useCallback(
    (decodedText: string) => {
      const packageId = decodedText.replace("LobbyPack:", "").trim();
      const existsInReceived = packageViews.received.packages.some((item) => item.id === packageId);
      const existsInPickedUp = packageViews.pickedUp.packages.some((item) => item.id === packageId);

      if (!existsInReceived && !existsInPickedUp) {
        return;
      }

      movePackageToPickedUp(packageId);
      setQrScanMessage(`Paquete ${packageId} movido a Retiro.`);
      setActiveView("pickedUp");
      setCurrentPage(1);
      setTimeout(() => closeQrModal(), 900);
    },
    [closeQrModal, packageViews.received.packages, packageViews.pickedUp.packages],
  );

  // Los paquetes nuevos siempre entran en "received" con un id generado desde la fecha.
  const handleAddPackage = (values: AddPackageFormValues) => {
    const newPackage = createPackageFromForm(values);

    // Inserta el nuevo paquete al inicio para que aparezca primero en la tabla.
    setPackageViews((current) => ({
      ...current,
      received: {
        ...current.received,
        packages: [newPackage, ...current.received.packages],
      },
    }));
    setActiveView("received");
    setCurrentPage(1);
    setSearchTerm("");
    setIsAddPackageOpen(false);
  };

  return (
    <main>
      {/* Hero principal con el selector de vista y la tabla correspondiente. */}
      <section className="hero" id="inicio">
        <div className="main">
          <p className="eyebrow">Gestion de paquetes</p>
          <h1>
            <span className="titlePrimary">Lobby</span>
            <span className="titleAccent">Pack</span>
          </h1>
          <p className="lead">
            Administra paquetes recepcionados y retirados desde una sola vista.
          </p>

          {/* Cambia entre las tres secciones principales reiniciando la paginación. */}
          <div className="serviceToggle" aria-label="Selecciona recepcion o retiro">
            <button
              type="button"
              className={activeView === "received" ? "toggleButton active" : "toggleButton"}
              onClick={() => {
                setActiveView("received");
                setCurrentPage(1);
              }}
            >
              Recepcion
            </button>
            <button
              type="button"
              className={activeView === "pickedUp" ? "toggleButton active" : "toggleButton"}
              onClick={() => {
                setActiveView("pickedUp");
                setCurrentPage(1);
              }}
            >
              Retiro
            </button>
            <button
              type="button"
              className={activeView === "complaints" ? "toggleButton active" : "toggleButton"}
              onClick={() => {
                setActiveView("complaints");
                setCurrentPage(1);
              }}
            >
              Reclamos
            </button>
          </div>

          {/* Si la vista es de reclamos, se renderiza el panel especializado. */}
          {activeView === "complaints" ? (
            <ComplaintPanel
              title="Reclamos"
              searchTerm={searchTerm}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              filteredCount={filteredComplaints.length}
              safePage={safePage}
              totalPages={totalPages}
              paginatedComplaints={paginatedComplaints}
              onSearchChange={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setCurrentPage(1);
              }}
              onPrevPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              startIndex={startIndex}
            />
          ) : (
            // En caso contrario se muestra la tabla de paquetes recepcionados o retirados.
            <PackagePanel
              title={currentPackageView?.title ?? "Paquetes"}
              searchTerm={searchTerm}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              allVisibleSelected={allVisibleSelected}
              filteredCount={filteredPackages.length}
              safePage={safePage}
              totalPages={totalPages}
              selectedVisibleCount={selectedVisibleIds.length}
              paginatedPackages={paginatedPackages}
              currentSelections={currentSelections}
              activeView={activeView}
              onSearchChange={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setCurrentPage(1);
              }}
              onSelectAllVisible={handleSelectAllVisible}
              onEditSelected={handleEditSelected}
              onDeleteSelected={() => handleDeletePackages(activeView, selectedVisibleIds)}
              onSelect={handlePackageSelection}
              onShowQr={openQrModal}
              onEdit={handleEditPackage}
              onDelete={handleDeletePackages}
              onPrevPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              startIndex={startIndex}
            />
          )}

          {/* El botón flotante solo aparece en la vista de recepción para registrar nuevos paquetes. */}
          {activeView === "received" ? (
            <button
              type="button"
              className="addPackageButton floatingAddButton"
              onClick={() => setIsAddPackageOpen(true)}
            >
              + Agregar paquete
            </button>
          ) : null}
        </div>
      </section>

      {/* Modal para mostrar el QR y simular el retiro del paquete. */}
      {qrPackage ? (
        <QrModal
          qrPackage={qrPackage}
          onClose={closeQrModal}
          onConfirm={handleQrScan}
          qrScanMessage={qrScanMessage}
        />
      ) : null}

      {/* Modal de formulario para agregar un nuevo paquete a la lista. */}
      {isAddPackageOpen ? (
        <AddPackageModal onClose={() => setIsAddPackageOpen(false)} onSubmit={handleAddPackage} />
      ) : null}
    </main>
  );
}
