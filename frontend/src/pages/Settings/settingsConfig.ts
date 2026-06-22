import type { GeneralSettings, PreferenceSettings } from "../../types/settings";
import type { AppLanguage } from "../../lib/i18n";

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

export const getStructureLabels = (
  communityType: string,
  language: AppLanguage = "es",
): StructureLabels => {
  const normalizedType = communityType
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalizedType.includes("condominio") || normalizedType.includes("residencial")) {
    return language === "en"
      ? {
          title: "Sectors, stages, and homes",
          addGroup: "Add sector",
          groupSingular: "Sector",
          groupPlural: "Sectors",
          groupName: "Sector name",
          levelSingular: "Stage",
          levelPlural: "Stages",
          levelCount: "Number of stages",
          unitSingular: "home",
          unitPlural: "homes",
          totalUnits: "Registered homes",
          unitsByLevel: "Homes per stage",
          sectionLead:
            "Each sector appears as a fixed card. To change names, stages, or homes, edit that sector.",
          previewText: "Select a stage to view only its homes.",
          addUnit: "Add home",
        }
      : {
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
    return language === "en"
      ? {
          title: "Areas, levels, and units",
          addGroup: "Add area",
          groupSingular: "Área",
          groupPlural: "Áreas",
          groupName: "Area name",
          levelSingular: "Level",
          levelPlural: "Levels",
          levelCount: "Number of levels",
          unitSingular: "unit",
          unitPlural: "units",
          totalUnits: "Registered units",
          unitsByLevel: "Units per level",
          sectionLead:
            "Each area appears as a fixed card. To change names, levels, or units, edit that area.",
          previewText: "Select a level to view only its units.",
          addUnit: "Add unit",
        }
      : {
          title: "Áreas, niveles y unidades",
          addGroup: "Agregar área",
          groupSingular: "Área",
          groupPlural: "Áreas",
          groupName: "Nombre del área",
          levelSingular: "Nivel",
          levelPlural: "Niveles",
          levelCount: "Cantidad de niveles",
          unitSingular: "unidad",
          unitPlural: "unidades",
          totalUnits: "Unidades registradas",
          unitsByLevel: "Unidades por nivel",
          sectionLead:
            "Cada área queda visible como ficha fija. Si necesitas cambiar nombre, niveles o unidades, entra a editar esa área.",
          previewText: "Selecciona un nivel para ver solo sus unidades.",
          addUnit: "Agregar unidad",
        };
  }

  return language === "en"
    ? {
        title: "Towers, floors, and apartments",
        addGroup: "Add tower",
        groupSingular: "Tower",
        groupPlural: "Towers",
        groupName: "Tower name",
        levelSingular: "Floor",
        levelPlural: "Floors",
        levelCount: "Number of floors",
        unitSingular: "apartment",
        unitPlural: "apartments",
        totalUnits: "Registered apartments",
        unitsByLevel: "Apartments per floor",
        sectionLead:
          "Each tower appears as a fixed card. To change names, floors, or apartments, edit that tower.",
        previewText: "Select a floor to view only its apartments.",
        addUnit: "Add apartment",
      }
    : {
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
