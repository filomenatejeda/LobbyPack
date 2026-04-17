import type { AddPackageFormValues } from "../components/Home/addPackageTypes";
import type { PackageItem } from "../types/home";

// Crea un nuevo paquete "received" usando la fecha y hora local actual.
export function createPackageFromForm(values: AddPackageFormValues): PackageItem {
  const timestamp = new Date();
  const nextId = `REC-${String(timestamp.getTime()).slice(-4)}`;
  const date = timestamp.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = timestamp.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return {
    id: nextId,
    apartment: values.apartment,
    residentName: values.residentName,
    phone: values.phone,
    company: values.company,
    concierge: values.concierge,
    time,
    date,
    status: "Received",
  };
}
