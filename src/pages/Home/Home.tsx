import { useCallback, useEffect, useState } from "react";
import AddPackageModal from "../../components/Home/AddPackageModal";
import ComplaintPanel from "../../components/Home/ComplaintPanel";
import PackagePanel from "../../components/Home/PackagePanel";
import QrModal from "../../components/Home/QrModal";
import ResidentDashboard from "../../components/Home/ResidentDashboard";
import type { AddPackageFormValues } from "../../components/Home/packageFormTypes";
import {
  claimParcel,
  confirmResidentParcelClaim,
  createParcel,
  deleteParcel,
  fetchDashboard,
  scanResidentParcel,
  updateIssueStatus,
  updateParcel,
} from "../../services/homeApi";
import type {
  DashboardCurrentUser,
  IssueItem,
  PackageServiceView,
  ParcelItem,
  ServiceView,
} from "../../types/home";
import { formatIssueStatus, normalizeSearchText, pageSizeOptions } from "../../utils/packageUtils";
import "./Home.css";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<DashboardCurrentUser | null>(null);
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
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);
  const [residentScannedParcel, setResidentScannedParcel] = useState<ParcelItem | null>(null);
  const [residentScannedQrValue, setResidentScannedQrValue] = useState("");
  const [residentFeedbackMessage, setResidentFeedbackMessage] = useState("");
  const [residentFeedbackTone, setResidentFeedbackTone] = useState<"neutral" | "success" | "error">(
    "neutral",
  );
  const [isResidentProcessing, setIsResidentProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetchDashboard();
      setCurrentUser(response.current_user);
      setPendingParcels(response.pending_parcels);
      setClaimedParcels(response.claimed_parcels);
      setIssues(response.issues);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar la informacion.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const isResident = currentUser?.role === "resident";
  const currentPackageView =
    activeView === "complaints"
      ? null
      : {
          title: activeView === "received" ? "Paquetes recepcionados" : "Paquetes retirados",
          parcels: activeView === "received" ? pending_parcels : claimed_parcels,
        };

  const normalizedSearch = normalizeSearchText(searchTerm.trim());
  const filteredComplaints = issues.filter((item) => {
    const searchableText = normalizeSearchText(
      [
        item.resident_name,
        item.id_parcel,
        item.issue_description,
        item.created_at,
        item.issue_status,
        formatIssueStatus(item.issue_status),
      ].join(" "),
    );

    return searchableText.includes(normalizedSearch);
  });

  const filteredPackages = (currentPackageView?.parcels ?? []).filter((item) => {
    const searchableText = normalizeSearchText(
      [
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
      ].join(" "),
    );

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

  const resetResidentClaimFlow = () => {
    setResidentScannedParcel(null);
    setResidentScannedQrValue("");
  };

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
        ? "Quieres borrar este paquete?"
        : `Quieres borrar ${ids.length} paquetes?`,
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
      const packageId = decodedText.split(":")[2]?.trim() || decodedText.replace("LobbyPack:", "").trim();
      const existsInReceived = pending_parcels.some((item) => item.id === packageId);
      const existsInPickedUp = claimed_parcels.some((item) => item.id === packageId);

      if (!existsInReceived && !existsInPickedUp) {
        setQrScanMessage("No se encontro el paquete asociado a ese QR.");
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

  const handleResidentScan = async (qrValue: string) => {
    setResidentFeedbackTone("neutral");
    setResidentFeedbackMessage("Validando QR con tu departamento...");
    setIsResidentProcessing(true);

    try {
      const response = await scanResidentParcel(qrValue);
      setResidentScannedQrValue(qrValue);
      setResidentScannedParcel(response.parcel);
      setResidentFeedbackTone("success");
      setResidentFeedbackMessage(
        `El QR corresponde al paquete ${response.parcel.id}. Revisa los datos y confirma el retiro.`,
      );
      setErrorMessage("");
    } catch (error) {
      resetResidentClaimFlow();
      setResidentFeedbackTone("error");
      setResidentFeedbackMessage(
        error instanceof Error ? error.message : "No se pudo validar el QR escaneado.",
      );
    } finally {
      setIsResidentProcessing(false);
    }
  };

  const handleResidentConfirmClaim = async () => {
    if (!residentScannedParcel || !residentScannedQrValue) {
      return;
    }

    setIsResidentProcessing(true);

    try {
      const response = await confirmResidentParcelClaim(
        residentScannedParcel.id,
        residentScannedQrValue,
      );
      const movedParcel = response.parcel;

      if (!movedParcel) {
        throw new Error("No se pudo confirmar el retiro del paquete.");
      }

      setPendingParcels((current) => current.filter((item) => item.id !== movedParcel.id));
      setClaimedParcels((current) => [movedParcel, ...current.filter((item) => item.id !== movedParcel.id)]);
      setResidentFeedbackTone("success");
      setResidentFeedbackMessage(`Retiro confirmado. El paquete ${movedParcel.id} quedo entregado.`);
      resetResidentClaimFlow();
    } catch (error) {
      setResidentFeedbackTone("error");
      setResidentFeedbackMessage(
        error instanceof Error ? error.message : "No se pudo confirmar el retiro del paquete.",
      );
    } finally {
      setIsResidentProcessing(false);
    }
  };

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

  const handleIssueStatusChange = async (issueId: string, nextStatus: IssueItem["issue_status"]) => {
    const currentIssue = issues.find((item) => item.id === issueId);
    if (!currentIssue || currentIssue.issue_status === nextStatus) {
      return;
    }

    setUpdatingIssueId(issueId);
    setErrorMessage("");

    try {
      const updatedIssue = await updateIssueStatus(issueId, nextStatus);
      setIssues((current) =>
        current.map((item) => (item.id === updatedIssue.id ? updatedIssue : item)),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar el reclamo.");
    } finally {
      setUpdatingIssueId(null);
    }
  };

  return (
    <main>
      <section className="hero" id="inicio">
        <div className="main">
          <p className="eyebrow">{isResident ? "Retiro de paquetes" : "Gestion de paquetes"}</p>
          <h1>
            <span className="titlePrimary">Lobby</span>
            <span className="titleAccent">Pack</span>
          </h1>
          <p className="lead">
            {isResident
              ? "Valida tu departamento, escanea el QR y confirma la entrega sin depender de un boton interno."
              : "Administra paquetes recepcionados y retirados desde una sola vista."}
          </p>

          {errorMessage ? <p className="emptyState">{errorMessage}</p> : null}
          {isLoading ? <p className="resultsText">Cargando datos desde la base de datos...</p> : null}

          {!isLoading && isResident && currentUser ? (
            <ResidentDashboard
              currentUser={currentUser}
              pendingParcels={pending_parcels}
              claimedParcels={claimed_parcels}
              scannedParcel={residentScannedParcel}
              feedbackMessage={residentFeedbackMessage}
              feedbackTone={residentFeedbackTone}
              isProcessing={isResidentProcessing}
              onScan={handleResidentScan}
              onConfirmClaim={handleResidentConfirmClaim}
              onResetScan={resetResidentClaimFlow}
            />
          ) : null}

          {!isLoading && !isResident ? (
            <>
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
                  updatingIssueId={updatingIssueId}
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
                  onIssueStatusChange={(issueId, nextStatus) =>
                    void handleIssueStatusChange(issueId, nextStatus)
                  }
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
                  onDeleteSelected={() => void handleDeletePackages(activeView, selectedVisibleIds)}
                  onSelect={handlePackageSelection}
                  onShowQr={openQrModal}
                  onEdit={handleEditPackage}
                  onDelete={(view, ids) => void handleDeletePackages(view, ids)}
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
            </>
          ) : null}
        </div>
      </section>

      {!isResident && qrPackage ? (
        <QrModal
          qrPackage={qrPackage}
          onClose={closeQrModal}
          onConfirm={(value) => void handleQrScan(value)}
          qrScanMessage={qrScanMessage}
        />
      ) : null}

      {!isResident && isAddPackageOpen ? (
        <AddPackageModal onClose={() => setIsAddPackageOpen(false)} onSubmit={handleAddPackage} />
      ) : null}

      {!isResident && editingParcel ? (
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
