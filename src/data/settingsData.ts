import type { PreferenceItem, TeamItem, TowerConfig } from "../types/settings";

// Contenido estático usado por las tarjetas de preferencias mock.
export const preferenceItems: PreferenceItem[] = [
  {
    title: "Notificaciones de paquetes",
    description: "Recibe alertas cuando un paquete sea recepcionado, retirado o actualizado.",
  },
  {
    title: "Resumen diario",
    description: "Genera un reporte automatico con la actividad del dia para conserjeria.",
  },
  {
    title: "Acceso con QR",
    description: "Permite validar retiros de paquetes usando codigo QR desde recepcion.",
  },
];

// Lista de equipo demo mostrada en la sección de permisos.
export const teamItems: TeamItem[] = [
  { name: "Marcos Silva", role: "Conserje turno manana", status: "Activo" },
  { name: "Daniela Riquelme", role: "Conserje turno tarde", status: "Activo" },
  { name: "Paula Muñoz", role: "Supervisora recepcion", status: "Admin" },
];

// Estructura inicial del edificio mostrada en las tarjetas editables de torres.
export const initialTowers: TowerConfig[] = [
  {
    id: 1,
    name: "Torre A",
    floors: [
      { floorNumber: 1, apartments: ["101", "102", "103", "104"] },
      { floorNumber: 2, apartments: ["201", "202", "203", "204"] },
      { floorNumber: 3, apartments: ["301", "302", "303"] },
      { floorNumber: 4, apartments: ["401", "402", "403"] },
      { floorNumber: 5, apartments: ["501", "502", "503"] },
    ],
    selectedFloor: 1,
    isEditing: false,
  },
  {
    id: 2,
    name: "Torre B",
    floors: [
      { floorNumber: 1, apartments: ["101", "102"] },
      { floorNumber: 2, apartments: ["201", "202", "203"] },
      { floorNumber: 3, apartments: ["301", "302", "303", "304"] },
      { floorNumber: 4, apartments: ["401", "402"] },
    ],
    selectedFloor: 1,
    isEditing: false,
  },
];
