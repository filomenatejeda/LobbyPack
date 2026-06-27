import { useI18nContext } from "@/i18n/i18n-react";
import { useState } from "react";
import {
  addResidentToDepartment,
  deleteResidentFromDepartment,
  fetchResidentsByDepartment,
  verifyResidentEmail,
  verifyResidentMfa,
} from "../../../services/settingsApi";
import type { ResidentItem } from "../../../types/settings";

type UseApartmentResidentsOptions = {
  onStatusMessage: (message: string) => void;
};

export function useApartmentResidents({
  onStatusMessage,
}: UseApartmentResidentsOptions) {
  const { LL } = useI18nContext();
  const [selectedApartment, setSelectedApartment] = useState<string | null>(null);
  const [apartmentResidents, setApartmentResidents] = useState<ResidentItem[]>([]);
  const [isLoadingResidents, setIsLoadingResidents] = useState(false);
  const [isSavingResident, setIsSavingResident] = useState(false);

  const openApartmentResidents = async (apartmentName: string) => {
    setSelectedApartment(apartmentName);
    setApartmentResidents([]);
    setIsLoadingResidents(true);
    onStatusMessage("");

    try {
      const residents = await fetchResidentsByDepartment(apartmentName);
      setApartmentResidents(residents);
    } catch (error) {
      onStatusMessage(
        error instanceof Error ? error.message : LL.resident_peopleLoadError(),
      );
    } finally {
      setIsLoadingResidents(false);
    }
  };

  const closeApartmentResidents = () => {
    setSelectedApartment(null);
    setApartmentResidents([]);
  };

  const handleAddResident = async (values: {
    resident_email: string;
    resident_name: string;
    resident_password: string;
    user_phone_number: string;
  }) => {
    if (!selectedApartment) {
      throw new Error(LL.settings_selectDepartment());
    }

    setIsSavingResident(true);
    onStatusMessage("");

    try {
      const createdResident = await addResidentToDepartment({
        ...values,
        department_address: selectedApartment,
      });
      const residents = await fetchResidentsByDepartment(selectedApartment);
      setApartmentResidents(residents);
      onStatusMessage(LL.resident_residentCreated());
      return createdResident;
    } catch (error) {
      onStatusMessage(
        error instanceof Error ? error.message : LL.resident_residentAddError(),
      );
      throw error;
    } finally {
      setIsSavingResident(false);
    }
  };

  const handleVerifyResidentEmail = async (
    residentId: string,
    verificationCode: string,
  ): Promise<void> => {
    setIsSavingResident(true);
    onStatusMessage("");

    try {
      await verifyResidentEmail(residentId, verificationCode);
      if (selectedApartment) {
        setApartmentResidents(await fetchResidentsByDepartment(selectedApartment));
      }
    } catch (error) {
      onStatusMessage(
        error instanceof Error ? error.message : LL.settings_verifyCodeError(),
      );
      throw error;
    } finally {
      setIsSavingResident(false);
    }
  };

  const handleVerifyResidentMfa = async (residentId: string, mfaCode: string) => {
    setIsSavingResident(true);
    onStatusMessage("");

    try {
      await verifyResidentMfa(residentId, mfaCode);
      if (selectedApartment) {
        setApartmentResidents(await fetchResidentsByDepartment(selectedApartment));
      }
      onStatusMessage(LL.resident_residentVerified());
    } catch (error) {
      onStatusMessage(
        error instanceof Error ? error.message : LL.settings_mfaVerifyError(),
      );
      throw error;
    } finally {
      setIsSavingResident(false);
    }
  };

  const handleDeleteResident = async (residentId: string) => {
    if (!selectedApartment) {
      throw new Error(LL.settings_selectDepartment());
    }

    setIsSavingResident(true);
    onStatusMessage("");

    try {
      await deleteResidentFromDepartment(residentId);
      setApartmentResidents(await fetchResidentsByDepartment(selectedApartment));
      onStatusMessage(LL.resident_deleted());
    } catch (error) {
      onStatusMessage(
        error instanceof Error ? error.message : LL.resident_deleteError(),
      );
      throw error;
    } finally {
      setIsSavingResident(false);
    }
  };

  return {
    apartmentResidents,
    closeApartmentResidents,
    handleAddResident,
    handleDeleteResident,
    handleVerifyResidentEmail,
    handleVerifyResidentMfa,
    isLoadingResidents,
    isSavingResident,
    openApartmentResidents,
    selectedApartment,
  };
}

