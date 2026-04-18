import type {
  ComplaintItem,
  PackageItem,
  PackageServiceView,
  PackageView,
} from "../types/home";

export const pageSizeOptions = [25, 50, 100] as const;

// Estos registros base permiten generar listas más largas sin escribir cada fila manualmente.
const receivedPackagesBase: PackageItem[] = [
  {
    id: "PK-2041",
    apartment: "Torre A 302",
    residentName: "Camila Rojas",
    phone: "+56981234567",
    company: "Chilexpress",
    concierge: "Marcos Silva",
    time: "09:15",
    date: "28 Mar 2026",
    status: "Received",
  },
  {
    id: "PK-2042",
    apartment: "Torre B 511",
    residentName: "Matias Soto",
    phone: "+56984567890",
    company: "Bluexpress",
    concierge: "Daniela Riquelme",
    time: "10:02",
    date: "28 Mar 2026",
    status: "Received",
  },
  {
    id: "PK-2043",
    apartment: "Torre C 110",
    residentName: "Valentina Diaz",
    phone: "+56977665544",
    company: "Mercado Envios",
    concierge: "Marcos Silva",
    time: "11:28",
    date: "28 Mar 2026",
    status: "Received",
  },
  {
    id: "PK-2044",
    apartment: "Torre D 205",
    residentName: "Diego Perez",
    phone: "+56999887766",
    company: "CorreosChile",
    concierge: "Paula Muñoz",
    time: "12:40",
    date: "28 Mar 2026",
    status: "Received",
  },
  {
    id: "PK-2045",
    apartment: "Torre B 410",
    residentName: "Antonia Mella",
    phone: "+56993456789",
    company: "Starken",
    concierge: "Daniela Riquelme",
    time: "13:18",
    date: "28 Mar 2026",
    status: "Received",
  },
];

const pickedUpPackagesBase: PackageItem[] = [
  {
    id: "PK-1988",
    apartment: "Torre A 701",
    residentName: "Javiera Leon",
    phone: "+56972345678",
    company: "Starken",
    concierge: "Marcos Silva",
    time: "18:10",
    date: "27 Mar 2026",
    status: "PickedUp",
  },
  {
    id: "PK-1994",
    apartment: "Torre D 205",
    residentName: "Diego Perez",
    phone: "+56999887766",
    company: "CorreosChile",
    concierge: "Paula Muñoz",
    time: "08:42",
    date: "28 Mar 2026",
    status: "PickedUp",
  },
  {
    id: "PK-2001",
    apartment: "Torre B 410",
    residentName: "Antonia Mella",
    phone: "+56993456789",
    company: "Chilexpress",
    concierge: "Daniela Riquelme",
    time: "09:57",
    date: "28 Mar 2026",
    status: "PickedUp",
  },
  {
    id: "PK-2007",
    apartment: "Torre C 608",
    residentName: "Felipe Contreras",
    phone: "+56971122334",
    company: "Bluexpress",
    concierge: "Paula Muñoz",
    time: "11:05",
    date: "28 Mar 2026",
    status: "PickedUp",
  },
  {
    id: "PK-2011",
    apartment: "Torre A 214",
    residentName: "Sofia Araya",
    phone: "+56970011223",
    company: "Mercado Envios",
    concierge: "Marcos Silva",
    time: "14:22",
    date: "28 Mar 2026",
    status: "PickedUp",
  },
];

const complaintsBase: ComplaintItem[] = [
  {
    residentName: "Camila Rojas",
    packageNumber: "REC-0001",
    complaint:
      "Indica que el paquete figura como recepcionado, pero aún no estaba disponible en conserjería al momento de consultarlo.",
    date: "28 Mar 2026",
    status: "Submitted",
    id: "RCL-0001",
  },
  {
    residentName: "Valentina Diaz",
    packageNumber: "REC-0008",
    complaint:
      "Solicita revisión porque el número de departamento asociado al paquete no coincide con su entrega habitual.",
    date: "28 Mar 2026",
    status: "InReview",
    id: "RCL-0002",
  },
  {
    residentName: "Diego Perez",
    packageNumber: "RET-0015",
    complaint:
      "Reporta que el paquete fue marcado como retirado, pero no fue entregado al residente correcto.",
    date: "28 Mar 2026",
    status: "Resolved",
    id: "RCL-0003",
  },
  {
    residentName: "Antonia Mella",
    packageNumber: "REC-0021",
    complaint:
      "Menciona demora en el aviso de llegada y pide dejar constancia para próximas entregas.",
    date: "28 Mar 2026",
    status: "Submitted",
    id: "RCL-0004",
  },
  {
    residentName: "Sofia Araya",
    packageNumber: "RET-0009",
    complaint:
      "Solicita confirmar quién retiró el paquete porque no reconoce la firma registrada en recepción.",
    date: "28 Mar 2026",
    status: "InReview",
    id: "RCL-0005",
  },
];

// Expande la lista semilla a una tabla más grande manteniendo ids y fechas creíbles para la demo.
const buildPackages = (baseItems: PackageItem[], total: number, prefix: string): PackageItem[] =>
  Array.from({ length: total }, (_, index) => {
    const item = baseItems[index % baseItems.length];
    return {
      ...item,
      id: `${prefix}-${String(index + 1).padStart(4, "0")}`,
      time: `${String(8 + (index % 10)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`,
      date: `${String((index % 28) + 1).padStart(2, "0")} Mar 2026`,
    };
  });

// Reutiliza los reclamos base para poblar una vista paginada de reclamos.
const buildComplaints = (baseItems: ComplaintItem[], total: number): ComplaintItem[] =>
  Array.from({ length: total }, (_, index) => {
    const item = baseItems[index % baseItems.length];
    return {
      ...item,
      id: `RCL-${String(index + 1).padStart(4, "0")}`,
      packageNumber:
        index % 2 === 0
          ? `REC-${String(index + 1).padStart(4, "0")}`
          : `RET-${String(index + 1).padStart(4, "0")}`,
      date: `${String((index % 28) + 1).padStart(2, "0")} Mar 2026`,
    };
  });

// Home inicializa sus tablas de paquetes a partir de estas dos vistas preconstruidas.
export const initialPackageViews: Record<PackageServiceView, PackageView> = {
  received: {
    title: "Paquetes recepcionados",
    packages: buildPackages(receivedPackagesBase, 68, "REC"),
  },
  pickedUp: {
    title: "Paquetes retirados",
    packages: buildPackages(pickedUpPackagesBase, 57, "RET"),
  },
};

export const initialComplaints = buildComplaints(complaintsBase, 24);
