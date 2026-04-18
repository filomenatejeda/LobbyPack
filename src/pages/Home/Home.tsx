import { useCallback, useEffect, useState } from "react";
import AddPackageModal from "../../components/Home/AddPackageModal";
import type { AddPackageFormValues } from "../../components/Home/addPackageTypes";
import ComplaintPanel from "../../components/Home/ComplaintPanel";
import PackagePanel from "../../components/Home/PackagePanel";
import QrModal from "../../components/Home/QrModal";
import {
  claimParcel,
  createParcel,
  deleteParcel,
  fetchDashboard,
  updateParcel,
} from "../../services/homeApi";
import type {
  IssueItem,
  PackageServiceView,
  ParcelItem,
  ServiceView,
} from "../../types/home";
import { pageSizeOptions } from "../../utils/packageUtils";
import "./Home.css";

export default function Home() {
  const [activeView, setActiveView] = useState<ServiceView>("received");
  const [pending_parcels, setPendingParcels] = useState<ParcelItem[]>([]);
  const [claimed_parcels, setClaimedParcels] = useState<ParcelItem[]>([]);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Record<PackageServiceView, string[]>>({
    received: [],
    pickedUp: [],
  });
  const [qrPackage, setQrPackage] = useState<ParcelItem | null>(null);
  const [qrScanMessage, setQrScanMessage] = useState("");
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [editingParcel, setEditingParcel] = useState<ParcelItem | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetchDashboard();
      setPendingParcels(response.pending_parcels);
      setClaimedParcels(response.claimed_parcels);
      setIssues(response.issues);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar la información.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const currentPackageView =
    activeView === "complaints"
      ? null
      : {
          title: activeView === "received" ? "Paquetes recepcionados" : "Paquetes retirados",
          parcels: activeView === "received" ? pending_parcels : claimed_parcels,
        };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredComplaints = issues.filter((item) => {
    const searchableText = [
      item.resident_name,
      item.id_parcel,
      item.issue_description,
      item.created_at,
      item.issue_status,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
  });

  const filteredPackages = (currentPackageView?.parcels ?? []).filter((item) => {
    const searchableText = [
      item.id,
      item.department_address,
      item.resident_name,
      item.user_phone_number,
      item.business_name,
      item.concierge_name,
      item.pending_date,
      item.claimed_date,
      item.parcel_status,
      item.parcel_description,
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

  const handlePackageSelection = (view: PackageServiceView, id: string, checked: boolean) => {
    setSelectedIds((current) => ({
      ...current,
      [view]: checked
        ? [...current[view], id]
        : current[view].filter((selectedId) => selectedId !== id),
    }));
  };

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

  const handleDeletePackages = async (view: PackageServiceView, ids: string[]) => {
    if (ids.length === 0) return;
    const confirmed = window.confirm(
      ids.length === 1
        ? "¿Quieres borrar este paquete?"
        : `¿Quieres borrar ${ids.length} paquetes?`,
    );
    if (!confirmed) return;

    try {
      await Promise.all(ids.map((id) => deleteParcel(id)));

      if (view === "received") {
        setPendingParcels((current) => current.filter((item) => !ids.includes(item.id)));
      } else {
        setClaimedParcels((current) => current.filter((item) => !ids.includes(item.id)));
      }

      setSelectedIds((current) => ({
        ...current,
        [view]: current[view].filter((selectedId) => !ids.includes(selectedId)),
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron borrar los paquetes.");
    }
  };

  const handleEditSelected = () => {
    if (activeView === "complaints") return;
    if (selectedVisibleIds.length !== 1) return;

    const parcels = activeView === "received" ? pending_parcels : claimed_parcels;
    const target = parcels.find((item) => item.id === selectedVisibleIds[0]);
    if (!target) return;

    setEditingParcel(target);
  };

  const openQrModal = (item: ParcelItem) => {
    setQrScanMessage("");
    setQrPackage(item);
  };

  const closeQrModal = useCallback(() => {
    setQrPackage(null);
  }, []);

  const handleQrScan = useCallback(
    async (decodedText: string) => {
      const packageId = decodedText.replace("LobbyPack:", "").trim();
      const existsInReceived = pending_parcels.some((item) => item.id === packageId);
      const existsInPickedUp = claimed_parcels.some((item) => item.id === packageId);

      if (!existsInReceived && !existsInPickedUp) {
        setQrScanMessage("No se encontró el paquete asociado a ese QR.");
        return;
      }

      try {
        const movedParcel = await claimParcel(packageId);

        if (!movedParcel) {
          setQrScanMessage("No se pudo actualizar el estado del paquete.");
          return;
        }

        setPendingParcels((current) => current.filter((item) => item.id !== packageId));
        setClaimedParcels((current) => [movedParcel, ...current.filter((item) => item.id !== packageId)]);
        setSelectedIds((current) => ({
          received: current.received.filter((selectedId) => selectedId !== packageId),
          pickedUp: current.pickedUp,
        }));
        setQrScanMessage(`Paquete ${packageId} movido a retiro.`);
        setActiveView("pickedUp");
        setCurrentPage(1);
        setTimeout(() => closeQrModal(), 900);
      } catch (error) {
        setQrScanMessage(error instanceof Error ? error.message : "No se pudo marcar el retiro.");
      }
    },
    [claimed_parcels, closeQrModal, pending_parcels],
  );

  const handleAddPackage = async (values: AddPackageFormValues) => {
    try {
      const createdParcel = await createParcel(values);
      setPendingParcels((current) => [createdParcel, ...current]);
      setActiveView("received");
      setCurrentPage(1);
      setSearchTerm("");
      setIsAddPackageOpen(false);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo registrar el paquete.");
    }
  };

  const handleUpdatePackage = async (values: AddPackageFormValues) => {
    if (!editingParcel) return;

    try {
      const updatedParcel = await updateParcel(editingParcel.id, values);

      if (updatedParcel.parcel_status === "pending") {
        setPendingParcels((current) =>
          current.map((item) => (item.id === updatedParcel.id ? updatedParcel : item)),
        );
      } else {
        setClaimedParcels((current) =>
          current.map((item) => (item.id === updatedParcel.id ? updatedParcel : item)),
        );
      }

      setEditingParcel(null);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar el paquete.");
    }
  };

  const handleEditPackage = (view: PackageServiceView, id: string) => {
    const parcels = view === "received" ? pending_parcels : claimed_parcels;
    const target = parcels.find((item) => item.id === id);
    if (!target) return;

    setEditingParcel(target);
  };

  return (
    <main>
      <section className="hero" id="inicio">
        <div className="main">
          <p className="eyebrow">Gestión de paquetes</p>
          <h1>
            <span className="titlePrimary">Lobby</span>
            <span className="titleAccent">Pack</span>
          </h1>
          <p className="lead">
            Administra paquetes recepcionados y retirados desde una sola vista.
          </p>

          <div className="serviceToggle" aria-label="Selecciona recepción o retiro">
            <button
              type="button"
              className={activeView === "received" ? "toggleButton active" : "toggleButton"}
              onClick={() => {
                setActiveView("received");
                setCurrentPage(1);
              }}
            >
              Recepción
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

          {errorMessage ? <p className="emptyState">{errorMessage}</p> : null}
          {isLoading ? <p className="resultsText">Cargando datos desde la base de datos...</p> : null}

          {!isLoading && activeView === "complaints" ? (
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
          ) : null}

          {!isLoading && activeView !== "complaints" ? (
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
              onDeleteSelected={() => void handleDeletePackages(activeView, selectedVisibleIds)}
              onSelect={handlePackageSelection}
              onShowQr={openQrModal}
              onEdit={handleEditPackage}
              onDelete={(view, ids) => void handleDeletePackages(view, ids)}
              onPrevPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              startIndex={startIndex}
            />
          ) : null}

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
          onConfirm={(value) => void handleQrScan(value)}
          qrScanMessage={qrScanMessage}
        />
      ) : null}

      {isAddPackageOpen ? (
        <AddPackageModal onClose={() => setIsAddPackageOpen(false)} onSubmit={handleAddPackage} />
      ) : null}

      {editingParcel ? (
        <AddPackageModal
          title={`Editar paquete ${editingParcel.id}`}
          initialValues={{
            department_address: editingParcel.department_address,
            resident_name: editingParcel.resident_name,
            user_phone_number: editingParcel.user_phone_number,
            business_name: editingParcel.business_name,
            concierge_name: editingParcel.concierge_name,
            parcel_description: editingParcel.parcel_description,
            is_urgent: editingParcel.is_urgent,
          }}
          onClose={() => setEditingParcel(null)}
          onSubmit={handleUpdatePackage}
        />
      ) : null}
    </main>
  );
}
