import { useI18nContext } from "@/i18n/i18n-react";
import { useCallback, useEffect, useState } from "react";
import type { AddPackageFormValues } from "../../../components/Home/packageFormTypes";
import {
  claimParcel,
  claimParcelWithPin,
  confirmResidentParcelClaim,
  createResidentIssue,
  createParcel,
  deleteIssue,
  deleteParcel,
  fetchDashboard,
  scanResidentParcel,
  updateIssueStatus,
  updateParcel,
} from "../../../services/homeApi";
import type {
  CommunityStructureTower,
  DashboardCurrentUser,
  DashboardPreferenceSettings,
  IssueItem,
  PackageServiceView,
  ParcelItem,
  ServiceView,
} from "../../../types/home";
import { normalizeSearchText } from "../../../utils/packageUtils";

type FeedbackTone = "neutral" | "success" | "error";

export function useHomeDashboard() {
  const { LL } = useI18nContext();
  const [currentUser, setCurrentUser] = useState<DashboardCurrentUser | null>(null);
  const [activeView, setActiveView] = useState<ServiceView>("received");
  const [pendingParcels, setPendingParcels] = useState<ParcelItem[]>([]);
  const [claimedParcels, setClaimedParcels] = useState<ParcelItem[]>([]);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [communityStructure, setCommunityStructure] = useState<CommunityStructureTower[]>([]);
  const [preferenceSettings, setPreferenceSettings] =
    useState<DashboardPreferenceSettings>({
      package_notifications: true,
      daily_summary: true,
      qr_access: true,
    });
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<PackageServiceView, string[]>>({
    received: [],
    pickedUp: [],
  });
  const [qrPackage, setQrPackage] = useState<ParcelItem | null>(null);
  const [pinPackage, setPinPackage] = useState<ParcelItem | null>(null);
  const [qrScanMessage, setQrScanMessage] = useState("");
  const [pinClaimMessage, setPinClaimMessage] = useState("");
  const [isPinClaimProcessing, setIsPinClaimProcessing] = useState(false);
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
      setPreferenceSettings(response.preference_settings);
      setSelectedIssueIds((current) =>
        current.filter((selectedId) =>
          response.issues.some((issue) => issue.id === selectedId),
        ),
      );
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
        error instanceof Error ? error.message : LL.home_loadError(),
      );
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [LL]);

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
          parcels: activeView === "received" ? pendingParcels : claimedParcels,
        };

  const normalizedSearch = normalizeSearchText(searchTerm.trim());
  const filteredComplaints = issues.filter((item) => {
    const searchableText = normalizeSearchText(
      [
        item.resident_name,
        item.resident_email,
        item.user_phone_number,
        item.id_parcel,
        item.issue_description,
        item.created_at,
        item.issue_status,
        item.issue_status,
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
  const selectedVisibleIssueIds = paginatedComplaints
    .filter((item) => selectedIssueIds.includes(item.id))
    .map((item) => item.id);
  const selectedVisibleIds = filteredPackages
    .filter((item) => currentSelections.includes(item.id))
    .map((item) => item.id);
  const allVisibleSelected =
    paginatedPackages.length > 0 &&
    paginatedPackages.every((item) => currentSelections.includes(item.id));
  const allVisibleComplaintsSelected =
    paginatedComplaints.length > 0 &&
    paginatedComplaints.every((item) => selectedIssueIds.includes(item.id));

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

  const handleIssueSelection = (id: string, checked: boolean) => {
    setSelectedIssueIds((current) =>
      checked
        ? Array.from(new Set([...current, id]))
        : current.filter((selectedId) => selectedId !== id),
    );
  };

  const handleSelectAllVisibleIssues = (checked: boolean) => {
    setSelectedIssueIds((current) =>
      checked
        ? Array.from(new Set([...current, ...paginatedComplaints.map((item) => item.id)]))
        : current.filter(
            (selectedId) => !paginatedComplaints.some((item) => item.id === selectedId),
          ),
    );
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
        ? LL.home_deletePackageConfirm()
        : LL.home_deletePackagesConfirm({ count: ids.length }),
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
        error instanceof Error ? error.message : LL.home_deletePackagesError(),
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
    if (!preferenceSettings.qr_access) {
      setQrScanMessage(LL.home_qrDisabled());
      return;
    }

    setQrScanMessage("");
    setQrPackage(item);
  };

  const closeQrModal = () => {
    setQrPackage(null);
  };

  const openPinModal = (item: ParcelItem) => {
    setPinClaimMessage("");
    setPinPackage(item);
  };

  const closePinModal = () => {
    setPinPackage(null);
    setPinClaimMessage("");
  };

  const handlePinClaim = async (parcelId: string, withdrawalPin: string) => {
    setIsPinClaimProcessing(true);
    setPinClaimMessage("");

    try {
      const movedParcel = await claimParcelWithPin(parcelId, withdrawalPin);

      setPendingParcels((current) => current.filter((item) => item.id !== movedParcel.id));
      setClaimedParcels((current) => [
        movedParcel,
        ...current.filter((item) => item.id !== movedParcel.id),
      ]);
      setSelectedIds((current) => ({
        received: current.received.filter((selectedId) => selectedId !== movedParcel.id),
        pickedUp: current.pickedUp,
      }));
      setPinClaimMessage(LL.home_packageWithdrawn({ id: movedParcel.id }));
      window.setTimeout(closePinModal, 900);
    } catch (error) {
      setPinClaimMessage(
        error instanceof Error ? error.message : LL.home_pinError(),
      );
    } finally {
      setIsPinClaimProcessing(false);
    }
  };

  const handleQrScan = async (decodedText: string) => {
    if (!preferenceSettings.qr_access) {
      setQrScanMessage(LL.home_qrDisabled());
      return;
    }

    const packageId =
      decodedText.split(":")[2]?.trim() ||
      decodedText.replace("LobbyPack:", "").trim();
    const existsInReceived = pendingParcels.some((item) => item.id === packageId);
    const existsInPickedUp = claimedParcels.some((item) => item.id === packageId);

    if (!existsInReceived && !existsInPickedUp) {
      setQrScanMessage(LL.home_qrNotFound());
      return;
    }

    try {
      const movedParcel = await claimParcel(packageId);

      if (!movedParcel) {
        setQrScanMessage(LL.home_packageStatusError());
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
      setQrScanMessage(LL.home_packageMoved({ id: packageId }));
      activateView("pickedUp");
      window.setTimeout(closeQrModal, 900);
    } catch (error) {
      setQrScanMessage(
        error instanceof Error ? error.message : LL.home_withdrawError(),
      );
    }
  };

  const handleResidentScan = async (qrValue: string) => {
    setResidentFeedbackTone("neutral");
    setResidentFeedbackMessage(LL.home_qrValidating());
    setIsResidentProcessing(true);

    try {
      const response = await scanResidentParcel(qrValue);
      setResidentScannedQrValue(qrValue);
      setResidentScannedParcel(response.parcel);
      setResidentFeedbackTone("success");
      setResidentFeedbackMessage(
        LL.home_qrMatchesPackage({ id: response.parcel.id }),
      );
      setErrorMessage("");
    } catch (error) {
      resetResidentClaimFlow();
      setResidentFeedbackTone("error");
      setResidentFeedbackMessage(
        error instanceof Error ? error.message : LL.home_qrScanError(),
      );
    } finally {
      setIsResidentProcessing(false);
    }
  };

  const handleResidentConfirmClaim = async () => {
    if (!residentScannedParcel || !residentScannedQrValue) {
      return false;
    }

    setIsResidentProcessing(true);

    try {
      const response = await confirmResidentParcelClaim(
        residentScannedParcel.id,
        residentScannedQrValue,
      );
      const confirmedParcel = response.parcel;

      if (!confirmedParcel) {
        throw new Error(LL.home_confirmWithdrawError());
      }

      setPendingParcels((current) =>
        current.map((item) => (item.id === confirmedParcel.id ? confirmedParcel : item)),
      );
      setResidentFeedbackTone("success");
      setResidentFeedbackMessage(
        LL.home_residentConfirmed({ id: confirmedParcel.id }),
      );
      resetResidentClaimFlow();
      await loadDashboard(false);
      return true;
    } catch (error) {
      setResidentFeedbackTone("error");
      setResidentFeedbackMessage(
        error instanceof Error
          ? error.message
          : LL.home_confirmWithdrawError(),
      );
      return false;
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
      setResidentIssueMessage(LL.home_issueRequired());
      return false;
    }

    setIsCreatingResidentIssue(true);
    setResidentIssueTone("neutral");
    setResidentIssueMessage(LL.home_issueSending());

    try {
      const createdIssue = await createResidentIssue(parcelId, normalizedDescription);
      setIssues((current) => [createdIssue, ...current]);
      setResidentIssueTone("success");
      setResidentIssueMessage(LL.home_issueSent());
      return true;
    } catch (error) {
      setResidentIssueTone("error");
      setResidentIssueMessage(
        error instanceof Error ? error.message : LL.home_issueCreateError(),
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
        error instanceof Error ? error.message : LL.home_packageCreateError(),
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
        error instanceof Error ? error.message : LL.home_packageUpdateError(),
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
        error instanceof Error ? error.message : LL.home_issueUpdateError(),
      );
    } finally {
      setUpdatingIssueId(null);
    }
  };

  const handleBulkIssueStatusChange = async (
    issueIds: string[],
    nextStatus: IssueItem["issue_status"],
  ) => {
    if (currentUser?.role !== "admin" || issueIds.length === 0) {
      return;
    }

    const targetIds = issueIds.filter((issueId) => {
      const issue = issues.find((item) => item.id === issueId);
      return issue && issue.issue_status !== nextStatus;
    });

    if (targetIds.length === 0) {
      return;
    }

    setUpdatingIssueId("__bulk__");
    setErrorMessage("");

    try {
      const updatedIssues = await Promise.all(
        targetIds.map((issueId) => updateIssueStatus(issueId, nextStatus)),
      );
      setIssues((current) =>
        current.map((item) => {
          const updatedIssue = updatedIssues.find((issue) => issue.id === item.id);
          return updatedIssue ?? item;
        }),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : LL.home_issuesUpdateError(),
      );
    } finally {
      setUpdatingIssueId(null);
    }
  };

  const handleDeleteIssues = async (issueIds: string[]) => {
    if (currentUser?.role !== "admin" || issueIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      issueIds.length === 1
        ? LL.home_deleteIssueConfirm()
        : LL.home_deleteIssuesConfirm({ count: issueIds.length }),
    );

    if (!confirmed) {
      return;
    }

    setUpdatingIssueId("__bulk__");
    setErrorMessage("");

    try {
      await Promise.all(issueIds.map((issueId) => deleteIssue(issueId)));
      setIssues((current) => current.filter((item) => !issueIds.includes(item.id)));
      setSelectedIssueIds((current) =>
        current.filter((selectedId) => !issueIds.includes(selectedId)),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : LL.home_issuesUpdateError(),
      );
    } finally {
      setUpdatingIssueId(null);
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    await handleDeleteIssues([issueId]);
  };

  return {
    activeView,
    allVisibleSelected,
    allVisibleComplaintsSelected,
    claimedParcels,
    communityStructure,
    preferenceSettings,
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
    isPinClaimProcessing,
    isResident,
    isResidentProcessing,
    issues,
    paginatedComplaints,
    paginatedPackages,
    pageSize,
    pendingParcels,
    pinClaimMessage,
    pinPackage,
    qrPackage,
    qrScanMessage,
    residentFeedbackMessage,
    residentFeedbackTone,
    residentIssueMessage,
    residentIssueTone,
    residentScannedParcel,
    safePage,
    searchTerm,
    selectedIssueIds,
    selectedVisibleIssueIds,
    selectedVisibleIds,
    startIndex,
    totalPages,
    updatingIssueId,
    activateView,
    closePinModal,
    closeQrModal,
    goToNextPage,
    goToPreviousPage,
    handleAddPackage,
    handleDeletePackages,
    handleDeleteIssue,
    handleDeleteIssues,
    handleEditPackage,
    handleEditSelected,
    handleBulkIssueStatusChange,
    handleIssueStatusChange,
    handleIssueSelection,
    handlePackageSelection,
    handlePinClaim,
    handleQrScan,
    handleResidentConfirmClaim,
    handleResidentCreateIssue,
    handleResidentScan,
    handleSelectAllVisible,
    handleSelectAllVisibleIssues,
    handleUpdatePackage,
    openPinModal,
    openQrModal,
    resetResidentClaimFlow,
    setEditingParcel,
    setIsAddPackageOpen,
    totalVisibleCount: activeView === "complaints" ? filteredComplaints.length : filteredPackages.length,
    updatePageSizeValue,
    updateSearch,
  };
}
