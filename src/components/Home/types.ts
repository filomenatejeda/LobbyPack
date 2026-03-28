export type ServiceView = "recepcion" | "retiro" | "reclamos";
export type PackageServiceView = Exclude<ServiceView, "reclamos">;

export type PackageStatus = "Recepcion" | "Retiro";

export type ComplaintStatus = "Ingresado" | "En revision" | "Resuelto";

export type PackageItem = {
  id: string;
  departamento: string;
  nombre: string;
  compania: string;
  conserje: string;
  hora: string;
  fecha: string;
  estado: PackageStatus;
};

export type PackageView = {
  title: string;
  packages: PackageItem[];
};

export type ComplaintItem = {
  id: string;
  nombre: string;
  numeroPaquete: string;
  reclamo: string;
  fecha: string;
  estado: ComplaintStatus;
};
