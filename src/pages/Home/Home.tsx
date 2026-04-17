import { useCallback, useState } from "react";
import AddPackageModal from "../../components/Home/AddPackageModal";
import type { AddPackageFormValues } from "../../components/Home/addPackageTypes";
import ComplaintPanel from "../../components/Home/ComplaintPanel";
import PackagePanel from "../../components/Home/PackagePanel";
import QrModal from "../../components/Home/QrModal";
import type {
  ComplaintItem,
  PackageItem,
  PackageServiceView,
  ServiceView,
} from "../../types/home";
import { initialComplaints, initialPackageViews, pageSizeOptions } from "../../data/homeData";
import { createPackageFromForm } from "../../utils/packageUtils";
import "./Home.css";

export default function Home() {
  const [activeView, setActiveView] = useState<ServiceView>("received");
  const [packageViews, setPackageViews] = useState(initialPackageViews);
  const [complaints] = useState<ComplaintItem[]>(initialComplaints);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Record<PackageServiceView, string[]>>({
    received: [],
    pickedUp: [],
  });
  const [qrPackage, setQrPackage] = useState<PackageItem | null>(null);
  const [qrScanMessage, setQrScanMessage] = useState("");
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);

  // Reclamos y paquetes comparten el mismo buscador y la misma paginación.
  const currentPackageView = activeView === "complaints" ? null : packageViews[activeView];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredComplaints = complaints.filter((item) => {
    const searchableText = [item.residentName, item.packageNumber, item.complaint, item.date, item.status]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
  });
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

  const viewCount = activeView === "complaints" ? filteredComplaints.length : filteredPackages.length;
  const totalPages = Math.max(1, Math.ceil(viewCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedPackages = filteredPackages.slice(startIndex, startIndex + pageSize);
  const paginatedComplaints = filteredComplaints.slice(startIndex, startIndex + pageSize);
  const currentSelections = activeView === "complaints" ? [] : selectedIds[activeView];
  const selectedVisibleIds = filteredPackages
    .filter((item) => currentSelections.includes(item.id))
    .map((item) => item.id);
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

  const openQrModal = (item: PackageItem) => {
    setQrScanMessage("");
    setQrPackage(item);
  };

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

      {qrPackage ? (
        <QrModal
          qrPackage={qrPackage}
          onClose={closeQrModal}
          onConfirm={handleQrScan}
          qrScanMessage={qrScanMessage}
        />
      ) : null}

      {isAddPackageOpen ? (
        <AddPackageModal onClose={() => setIsAddPackageOpen(false)} onSubmit={handleAddPackage} />
      ) : null}
    </main>
  );
}
