import type { GeneralSettings, PreferenceSettings } from "../../types/settings";

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

export const communityTypeOptions = [
  "Edificio",
  "Condominio",
  "Comunidad residencial",
  "Otro",
];

export const getStructureLabels = (communityType: string): StructureLabels => {
  const normalizedType = communityType
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalizedType.includes("condominio") || normalizedType.includes("residencial")) {
    return {
      title: "Sectores, etapas y viviendas",
      addGroup: "Agregar sector",
      groupSingular: "Sector",
      groupPlural: "Sectores",
      groupName: "Nombre del sector",
      levelSingular: "Etapa",
      levelPlural: "Etapas",
      levelCount: "Cantidad de etapas",
      unitSingular: "vivienda",
      unitPlural: "viviendas",
      totalUnits: "Viviendas registradas",
      unitsByLevel: "Viviendas por etapa",
      sectionLead:
        "Cada sector queda visible como ficha fija. Si necesitas cambiar nombre, etapas o viviendas, entra a editar ese sector.",
      previewText: "Selecciona una etapa para ver solo sus viviendas.",
      addUnit: "Agregar vivienda",
    };
  }

  if (normalizedType.includes("otro")) {
    return {
      title: "Areas, niveles y unidades",
      addGroup: "Agregar area",
      groupSingular: "Area",
      groupPlural: "Areas",
      groupName: "Nombre del area",
      levelSingular: "Nivel",
      levelPlural: "Niveles",
      levelCount: "Cantidad de niveles",
      unitSingular: "unidad",
      unitPlural: "unidades",
      totalUnits: "Unidades registradas",
      unitsByLevel: "Unidades por nivel",
      sectionLead:
        "Cada area queda visible como ficha fija. Si necesitas cambiar nombre, niveles o unidades, entra a editar esa area.",
      previewText: "Selecciona un nivel para ver solo sus unidades.",
      addUnit: "Agregar unidad",
    };
  }

  return {
    title: "Torres, pisos y departamentos",
    addGroup: "Agregar torre",
    groupSingular: "Torre",
    groupPlural: "Torres",
    groupName: "Nombre de la torre",
    levelSingular: "Piso",
    levelPlural: "Pisos",
    levelCount: "Cantidad de pisos",
    unitSingular: "departamento",
    unitPlural: "departamentos",
    totalUnits: "Departamentos registrados",
    unitsByLevel: "Departamentos por piso",
    sectionLead:
      "Cada torre queda visible como ficha fija. Si necesitas cambiar nombre, pisos o departamentos, entra a editar esa torre.",
    previewText: "Selecciona un piso para ver solo sus departamentos.",
    addUnit: "Agregar departamento",
  };
};
