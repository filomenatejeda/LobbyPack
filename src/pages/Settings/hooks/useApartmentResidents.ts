import { useState } from "react";
import {
  addResidentToDepartment,
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
        error instanceof Error ? error.message : "No se pudieron cargar las personas.",
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
      throw new Error("Selecciona un departamento.");
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
      onStatusMessage("Cuenta residente creada. Verifica el codigo para activar MFA.");
      return createdResident;
    } catch (error) {
      onStatusMessage(
        error instanceof Error ? error.message : "No se pudo agregar la persona.",
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
        error instanceof Error ? error.message : "No se pudo verificar el codigo.",
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
      onStatusMessage("Cuenta residente verificada correctamente.");
    } catch (error) {
      onStatusMessage(
        error instanceof Error ? error.message : "No se pudo verificar el autenticador.",
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
    handleVerifyResidentEmail,
    handleVerifyResidentMfa,
    isLoadingResidents,
    isSavingResident,
    openApartmentResidents,
    selectedApartment,
  };
}
