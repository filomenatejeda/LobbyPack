import type { GeneralSettings, PreferenceSettings } from "../../types/settings";
import type { TranslationFunctions } from "../../i18n/i18n-types";

export type StructureLabels = {
  title: string;
  addGroup: string;
  groupSingular: string;
  groupPlural: string;
  groupName: string;
  levelSingular: string;
  levelPlural: string;
  levelCount: string;
  unitSingular: string;
  unitPlural: string;
  totalUnits: string;
  unitsByLevel: string;
  sectionLead: string;
  previewText: string;
  addUnit: string;
};

export const emptyGeneralSettings: GeneralSettings = {
  building_name: "",
  community_type: "",
  contact_email: "",
  reception_hours: "",
  address_line: "",
  access_password: "",
  is_active: true,
};

export const emptyPreferenceSettings: PreferenceSettings = {
  package_notifications: true,
  daily_summary: true,
  qr_access: true,
};

export const getCommunityTypeOptions = (language: AppLanguage) =>
  language === "en"
    ? ["Building", "Condominium", "Residential community", "Other"]
    : ["Edificio", "Condominio", "Comunidad residencial", "Otro"];

export const getCommunityTypeLabel = (
  communityType: string,
  LL: TranslationFunctions,
) => {
  const normalizedType = communityType
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalizedType.includes("condominio")) return LL.settings_condo();
  if (normalizedType.includes("residencial")) return LL.settings_residentialCommunity();
  if (normalizedType.includes("otro")) return LL.settings_otherCommunity();
  return LL.settings_building();
};

export const getStructureLabels = (
  communityType: string,
  LL: TranslationFunctions,
): StructureLabels => {
  const normalizedType = communityType
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalizedType.includes("condominio") || normalizedType.includes("residencial")) {
    return {
      title: LL.settings_structureCondoTitle(),
      addGroup: LL.settings_addSector(),
      groupSingular: LL.settings_sector(),
      groupPlural: LL.settings_sectors(),
      groupName: LL.settings_sectorName(),
      levelSingular: LL.settings_stage(),
      levelPlural: LL.settings_stages(),
      levelCount: LL.settings_stageCount(),
      unitSingular: LL.settings_homeUnit(),
      unitPlural: LL.settings_homeUnits(),
      totalUnits: LL.settings_homesRegistered(),
      unitsByLevel: LL.settings_homesByStage(),
      sectionLead: LL.settings_sectorLead(),
      previewText: LL.settings_stagePreview(),
      addUnit: LL.settings_addHome(),
    };
  }

  if (normalizedType.includes("otro")) {
    return {
      title: LL.settings_structureOtherTitle(),
      addGroup: LL.settings_addArea(),
      groupSingular: LL.settings_area(),
      groupPlural: LL.settings_areas(),
      groupName: LL.settings_areaName(),
      levelSingular: LL.settings_level(),
      levelPlural: LL.settings_levels(),
      levelCount: LL.settings_levelCount(),
      unitSingular: LL.settings_unit(),
      unitPlural: LL.settings_units(),
      totalUnits: LL.settings_unitsRegistered(),
      unitsByLevel: LL.settings_unitsByLevel(),
      sectionLead: LL.settings_areaLead(),
      previewText: LL.settings_levelPreview(),
      addUnit: LL.settings_addUnit(),
    };
  }

  return {
    title: LL.settings_structureDefaultTitle(),
    addGroup: LL.settings_addTower(),
    groupSingular: LL.settings_tower(),
    groupPlural: LL.settings_towers(),
    groupName: LL.settings_towerName(),
    levelSingular: LL.settings_floor(),
    levelPlural: LL.settings_floors(),
    levelCount: LL.settings_floorCount(),
    unitSingular: LL.settings_apartment(),
    unitPlural: LL.settings_apartments(),
    totalUnits: LL.settings_apartmentsRegistered(),
    unitsByLevel: LL.settings_apartmentsByFloor(),
    sectionLead: LL.settings_towerLead(),
    previewText: LL.settings_floorPreview(),
    addUnit: LL.settings_addApartment(),
  };
};
