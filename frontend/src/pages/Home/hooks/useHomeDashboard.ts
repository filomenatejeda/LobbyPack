import { useCallback, useEffect, useState } from "react";
import type { AddPackageFormValues } from "../../../components/Home/packageFormTypes";
import {
  claimParcel,
  confirmResidentParcelClaim,
  createResidentIssue,
  createParcel,
  deleteParcel,
  fetchDashboard,
  scanResidentParcel,
  updateIssueStatus,
  updateParcel,
} from "../../../services/homeApi";
import type {
  CommunityStructureTower,
  DashboardCurrentUser,
  IssueItem,
  PackageServiceView,
  ParcelItem,
  ServiceView,
} from "../../../types/home";
import {
  formatIssueStatus,
  normalizeSearchText,
} from "../../../utils/packageUtils";

type FeedbackTone = "neutral" | "success" | "error";

export function useHomeDashboard() {
  const [currentUser, setCurrentUser] = useState<DashboardCurrentUser | null>(null);
  const [activeView, setActiveView] = useState<ServiceView>("received");
  const [pendingParcels, setPendingParcels] = useState<ParcelItem[]>([]);
  const [claimedParcels, setClaimedParcels] = useState<ParcelItem[]>([]);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [communityStructure, setCommunityStructure] = useState<CommunityStructureTower[]>([]);
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
  const [residentFeedbackTone, setResidentFeedbackTone] =
    useState<FeedbackTone>("neutral");
  const [isResidentProcessing, setIsResidentProcessing] = useState(false);
  const [isCreatingResidentIssue, setIsCreatingResidentIssue] = useState(false);
  const [residentIssueMessage, setResidentIssueMessage] = useState("");
  const [residentIssueTone, setResidentIssueTone] = useState<FeedbackTone>("neutral");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setErrorMessage("");

    try {
      const response = await fetchDashboard();
      setCurrentUser(response.current_user);
      setPendingParcels(response.pending_parcels);
      setClaimedParcels(response.claimed_parcels);
      setIssues(response.issues);
      setCommunityStructure(response.community_structure);
      setQrPackage((current) => {
        if (!current) {
          return null;
        }

        return (
          response.pending_parcels.find((item) => item.id === current.id) ??
          response.claimed_parcels.find((item) => item.id === current.id) ??
          null
        );
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo cargar la informacion.",
      );
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDashboard(true);
  }, [loadDashboard]);

  const currentUserRole = currentUser?.role;

  useEffect(() => {
    if (!currentUserRole) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadDashboard(false);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [currentUserRole, loadDashboard]);

  const isResident = currentUserRole === "resident";
  const currentPackageView =
    activeView === "complaints"
      ? null
      : {
          title: activeView === "received" ? "Paquetes recepcionados" : "Paquetes retirados",
          parcels: activeView === "received" ? pendingParcels : claimedParcels,
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
    const departmentResidentText = (item.department_residents ?? [])
      .map((resident) =>
        [
          resident.resident_name,
          resident.user_phone_number,
          resident.email,
          resident.department_address,
        ].join(" "),
      )
      .join(" ");
    const searchableText = normalizeSearchText(
      [
        item.id,
        item.department_address,
        item.resident_name,
        item.user_phone_number,
        item.business_name,
        item.concierge_name,
        departmentResidentText,
        item.resident_claimed_by_name,
        item.resident_claim_confirmed_at,
        item.claimed_by_name,
        item.pending_date,
        item.claimed_date,
        item.parcel_status,
        item.parcel_description,
      ].join(" "),
    );

    return searchableText.includes(normalizedSearch);
  });

  const viewCount =
    activeView === "complaints" ? filteredComplaints.length : filteredPackages.length;
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

  const activateView = (view: ServiceView) => {
    setActiveView(view);
    setCurrentPage(1);
  };

  const updateSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const updatePageSizeValue = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const goToPreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  const handlePackageSelection = (
    view: PackageServiceView,
    id: string,
    checked: boolean,
  ) => {
    setSelectedIds((current) => ({
      ...current,
      [view]: checked
        ? [...current[view], id]
        : current[view].filter((selectedId) => selectedId !== id),
    }));
  };

  const handleSelectAllVisible = (checked: boolean) => {
    if (activeView === "complaints") {
      return;
    }

    setSelectedIds((current) => ({
      ...current,
      [activeView]: checked
        ? Array.from(
            new Set([...current[activeView], ...paginatedPackages.map((item) => item.id)]),
          )
        : current[activeView].filter(
            (selectedId) => !paginatedPackages.some((item) => item.id === selectedId),
          ),
    }));
  };

  const handleDeletePackages = async (view: PackageServiceView, ids: string[]) => {
    if (ids.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      ids.length === 1
        ? "Quieres borrar este paquete?"
        : `Quieres borrar ${ids.length} paquetes?`,
    );

    if (!confirmed) {
      return;
    }

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
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudieron borrar los paquetes.",
      );
    }
  };

  const handleEditSelected = () => {
    if (activeView === "complaints" || selectedVisibleIds.length !== 1) {
      return;
    }

    const parcels = activeView === "received" ? pendingParcels : claimedParcels;
    const target = parcels.find((item) => item.id === selectedVisibleIds[0]);

    if (target) {
      setEditingParcel(target);
    }
  };

  const openQrModal = (item: ParcelItem) => {
    setQrScanMessage("");
    setQrPackage(item);
  };

  const closeQrModal = () => {
    setQrPackage(null);
  };

  const handleQrScan = async (decodedText: string) => {
    const packageId =
      decodedText.split(":")[2]?.trim() ||
      decodedText.replace("LobbyPack:", "").trim();
    const existsInReceived = pendingParcels.some((item) => item.id === packageId);
    const existsInPickedUp = claimedParcels.some((item) => item.id === packageId);

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
      setClaimedParcels((current) => [
        movedParcel,
        ...current.filter((item) => item.id !== packageId),
      ]);
      setSelectedIds((current) => ({
        received: current.received.filter((selectedId) => selectedId !== packageId),
        pickedUp: current.pickedUp,
      }));
      setQrScanMessage(`Paquete ${packageId} movido a retiro.`);
      activateView("pickedUp");
      window.setTimeout(closeQrModal, 900);
    } catch (error) {
      setQrScanMessage(
        error instanceof Error ? error.message : "No se pudo marcar el retiro.",
      );
    }
  };

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
      const confirmedParcel = response.parcel;

      if (!confirmedParcel) {
        throw new Error("No se pudo confirmar el retiro del paquete.");
      }

      setPendingParcels((current) =>
        current.map((item) => (item.id === confirmedParcel.id ? confirmedParcel : item)),
      );
      setResidentFeedbackTone("success");
      setResidentFeedbackMessage(
        `Retiro confirmado por residente. Espera la confirmacion final de conserjeria para completar la entrega del paquete ${confirmedParcel.id}.`,
      );
      resetResidentClaimFlow();
    } catch (error) {
      setResidentFeedbackTone("error");
      setResidentFeedbackMessage(
        error instanceof Error
          ? error.message
          : "No se pudo confirmar el retiro del paquete.",
      );
    } finally {
      setIsResidentProcessing(false);
    }
  };

  const handleResidentCreateIssue = async (
    parcelId: string,
    issueDescription: string,
  ) => {
    const normalizedDescription = issueDescription.trim().replace(/\s+/g, " ");

    if (!parcelId || !normalizedDescription) {
      setResidentIssueTone("error");
      setResidentIssueMessage("Selecciona un paquete y describe el problema.");
      return false;
    }

    setIsCreatingResidentIssue(true);
    setResidentIssueTone("neutral");
    setResidentIssueMessage("Enviando reclamo...");

    try {
      const createdIssue = await createResidentIssue(parcelId, normalizedDescription);
      setIssues((current) => [createdIssue, ...current]);
      setResidentIssueTone("success");
      setResidentIssueMessage("Reclamo enviado. El equipo de administracion lo revisara.");
      return true;
    } catch (error) {
      setResidentIssueTone("error");
      setResidentIssueMessage(
        error instanceof Error ? error.message : "No se pudo crear el reclamo.",
      );
      return false;
    } finally {
      setIsCreatingResidentIssue(false);
    }
  };

  const handleAddPackage = async (
    values: AddPackageFormValues,
    options: { closeModal?: boolean } = {},
  ) => {
    try {
      const createdParcel = await createParcel(values);
      setPendingParcels((current) => [createdParcel, ...current]);
      activateView("received");
      setSearchTerm("");
      if (options.closeModal !== false) {
        setIsAddPackageOpen(false);
      }
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo registrar el paquete.",
      );
      throw error;
    }
  };

  const handleUpdatePackage = async (values: AddPackageFormValues) => {
    if (!editingParcel) {
      return;
    }

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
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo actualizar el paquete.",
      );
    }
  };

  const handleEditPackage = (view: PackageServiceView, id: string) => {
    const parcels = view === "received" ? pendingParcels : claimedParcels;
    const target = parcels.find((item) => item.id === id);

    if (target) {
      setEditingParcel(target);
    }
  };

  const handleIssueStatusChange = async (
    issueId: string,
    nextStatus: IssueItem["issue_status"],
  ) => {
    if (currentUser?.role !== "admin") {
      return;
    }

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
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo actualizar el reclamo.",
      );
    } finally {
      setUpdatingIssueId(null);
    }
  };

  return {
    activeView,
    allVisibleSelected,
    claimedParcels,
    communityStructure,
    currentPage,
    currentPackageView,
    currentSelections,
    currentUser,
    editingParcel,
    errorMessage,
    filteredComplaints,
    filteredPackages,
    isAddPackageOpen,
    isCreatingResidentIssue,
    isLoading,
    isResident,
    isResidentProcessing,
    issues,
    paginatedComplaints,
    paginatedPackages,
    pageSize,
    pendingParcels,
    qrPackage,
    qrScanMessage,
    residentFeedbackMessage,
    residentFeedbackTone,
    residentIssueMessage,
    residentIssueTone,
    residentScannedParcel,
    safePage,
    searchTerm,
    selectedVisibleIds,
    startIndex,
    totalPages,
    updatingIssueId,
    activateView,
    closeQrModal,
    goToNextPage,
    goToPreviousPage,
    handleAddPackage,
    handleDeletePackages,
    handleEditPackage,
    handleEditSelected,
    handleIssueStatusChange,
    handlePackageSelection,
    handleQrScan,
    handleResidentConfirmClaim,
    handleResidentCreateIssue,
    handleResidentScan,
    handleSelectAllVisible,
    handleUpdatePackage,
    openQrModal,
    resetResidentClaimFlow,
    setEditingParcel,
    setIsAddPackageOpen,
    totalVisibleCount: activeView === "complaints" ? filteredComplaints.length : filteredPackages.length,
    updatePageSizeValue,
    updateSearch,
  };
}
