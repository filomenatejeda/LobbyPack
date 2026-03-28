import { useCallback, useState } from "react";
import ComplaintPanel from "../../components/Home/ComplaintPanel";
import PackagePanel from "../../components/Home/PackagePanel";
import QrModal from "../../components/Home/QrModal";
import type {
  ComplaintItem,
  PackageItem,
  PackageServiceView,
  PackageView,
  ServiceView,
} from "../../components/Home/types";
import "./Home.css";

const pageSizeOptions = [25, 50, 100] as const;

const recepcionBase: PackageItem[] = [
  {
    id: "PK-2041",
    departamento: "Torre A 302",
    nombre: "Camila Rojas",
    compania: "Chilexpress",
    hora: "09:15",
    fecha: "28 Mar 2026",
    estado: "Recepcion",
  },
  {
    id: "PK-2042",
    departamento: "Torre B 511",
    nombre: "Matias Soto",
    compania: "Bluexpress",
    hora: "10:02",
    fecha: "28 Mar 2026",
    estado: "Recepcion",
  },
  {
    id: "PK-2043",
    departamento: "Torre C 110",
    nombre: "Valentina Diaz",
    compania: "Mercado Envios",
    hora: "11:28",
    fecha: "28 Mar 2026",
    estado: "Recepcion",
  },
  {
    id: "PK-2044",
    departamento: "Torre D 205",
    nombre: "Diego Perez",
    compania: "CorreosChile",
    hora: "12:40",
    fecha: "28 Mar 2026",
    estado: "Recepcion",
  },
  {
    id: "PK-2045",
    departamento: "Torre B 410",
    nombre: "Antonia Mella",
    compania: "Starken",
    hora: "13:18",
    fecha: "28 Mar 2026",
    estado: "Recepcion",
  },
];

const retiroBase: PackageItem[] = [
  {
    id: "PK-1988",
    departamento: "Torre A 701",
    nombre: "Javiera Leon",
    compania: "Starken",
    hora: "18:10",
    fecha: "27 Mar 2026",
    estado: "Retiro",
  },
  {
    id: "PK-1994",
    departamento: "Torre D 205",
    nombre: "Diego Perez",
    compania: "CorreosChile",
    hora: "08:42",
    fecha: "28 Mar 2026",
    estado: "Retiro",
  },
  {
    id: "PK-2001",
    departamento: "Torre B 410",
    nombre: "Antonia Mella",
    compania: "Chilexpress",
    hora: "09:57",
    fecha: "28 Mar 2026",
    estado: "Retiro",
  },
  {
    id: "PK-2007",
    departamento: "Torre C 608",
    nombre: "Felipe Contreras",
    compania: "Bluexpress",
    hora: "11:05",
    fecha: "28 Mar 2026",
    estado: "Retiro",
  },
  {
    id: "PK-2011",
    departamento: "Torre A 214",
    nombre: "Sofia Araya",
    compania: "Mercado Envios",
    hora: "14:22",
    fecha: "28 Mar 2026",
    estado: "Retiro",
  },
];

const reclamosBase: ComplaintItem[] = [
  {
    nombre: "Camila Rojas",
    numeroPaquete: "REC-0001",
    reclamo: "Indica que el paquete figura como recepcionado, pero aun no estaba disponible en conserjeria al momento de consultarlo.",
    fecha: "28 Mar 2026",
    estado: "Ingresado",
    id: "RCL-0001",
  },
  {
    nombre: "Valentina Diaz",
    numeroPaquete: "REC-0008",
    reclamo: "Solicita revision porque el numero de departamento asociado al paquete no coincide con su entrega habitual.",
    fecha: "28 Mar 2026",
    estado: "En revision",
    id: "RCL-0002",
  },
  {
    nombre: "Diego Perez",
    numeroPaquete: "RET-0015",
    reclamo: "Reporta que el paquete fue marcado como retirado, pero no fue entregado al residente correcto.",
    fecha: "28 Mar 2026",
    estado: "Resuelto",
    id: "RCL-0003",
  },
  {
    nombre: "Antonia Mella",
    numeroPaquete: "REC-0021",
    reclamo: "Menciona demora en el aviso de llegada y pide dejar constancia para proximas entregas.",
    fecha: "28 Mar 2026",
    estado: "Ingresado",
    id: "RCL-0004",
  },
  {
    nombre: "Sofia Araya",
    numeroPaquete: "RET-0009",
    reclamo: "Solicita confirmar quien retiro el paquete porque no reconoce la firma registrada en recepcion.",
    fecha: "28 Mar 2026",
    estado: "En revision",
    id: "RCL-0005",
  },
];

const buildPackages = (base: PackageItem[], total: number, prefix: string): PackageItem[] =>
  Array.from({ length: total }, (_, index) => {
    const item = base[index % base.length];
    return {
      ...item,
      id: `${prefix}-${String(index + 1).padStart(4, "0")}`,
      hora: `${String(8 + (index % 10)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`,
      fecha: `${String((index % 28) + 1).padStart(2, "0")} Mar 2026`,
    };
  });

const buildComplaints = (base: ComplaintItem[], total: number): ComplaintItem[] =>
  Array.from({ length: total }, (_, index) => {
    const item = base[index % base.length];
    return {
      ...item,
      id: `RCL-${String(index + 1).padStart(4, "0")}`,
      numeroPaquete: index % 2 === 0
        ? `REC-${String(index + 1).padStart(4, "0")}`
        : `RET-${String(index + 1).padStart(4, "0")}`,
      fecha: `${String((index % 28) + 1).padStart(2, "0")} Mar 2026`,
    };
  });

const initialPackageViews: Record<PackageServiceView, PackageView> = {
  recepcion: {
    title: "Paquetes recepcionados",
    packages: buildPackages(recepcionBase, 68, "REC"),
  },
  retiro: {
    title: "Paquetes retirados",
    packages: buildPackages(retiroBase, 57, "RET"),
  },
};

export default function Home() {
  const [activeView, setActiveView] = useState<ServiceView>("recepcion");
  const [packageViews, setPackageViews] = useState(initialPackageViews);
  const [complaints] = useState<ComplaintItem[]>(buildComplaints(reclamosBase, 24));
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Record<PackageServiceView, string[]>>({
    recepcion: [],
    retiro: [],
  });
  const [qrPackage, setQrPackage] = useState<PackageItem | null>(null);
  const [qrScanMessage, setQrScanMessage] = useState("");

  const currentPackageView = activeView === "reclamos" ? null : packageViews[activeView];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredComplaints = complaints.filter((item) => {
    const searchableText = [item.nombre, item.numeroPaquete, item.reclamo, item.fecha, item.estado]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
  });
  const filteredPackages = (currentPackageView?.packages ?? []).filter((item) => {
    const searchableText = [
      item.id,
      item.departamento,
      item.nombre,
      item.compania,
      item.hora,
      item.fecha,
      item.estado,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
  });

  const viewCount = activeView === "reclamos" ? filteredComplaints.length : filteredPackages.length;
  const totalPages = Math.max(1, Math.ceil(viewCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedPackages = filteredPackages.slice(startIndex, startIndex + pageSize);
  const paginatedComplaints = filteredComplaints.slice(startIndex, startIndex + pageSize);
  const currentSelections = activeView === "reclamos" ? [] : selectedIds[activeView];
  const selectedVisibleIds = filteredPackages
    .filter((item) => currentSelections.includes(item.id))
    .map((item) => item.id);
  const allVisibleSelected =
    paginatedPackages.length > 0 &&
    paginatedPackages.every((item) => currentSelections.includes(item.id));

  const handlePackageSelection = (view: PackageServiceView, id: string, checked: boolean) => {
    setSelectedIds((current) => ({
      ...current,
      [view]: checked
        ? [...current[view], id]
        : current[view].filter((selectedId) => selectedId !== id),
    }));
  };

  const handleSelectAllVisible = (checked: boolean) => {
    if (activeView === "reclamos") return;

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

  const updatePackage = (
    view: PackageServiceView,
    id: string,
    updater: (item: PackageItem) => PackageItem,
  ) => {
    setPackageViews((current) => ({
      ...current,
      [view]: {
        ...current[view],
        packages: current[view].packages.map((item) => (item.id === id ? updater(item) : item)),
      },
    }));
  };

  const handleEditPackage = (view: PackageServiceView, id: string) => {
    const target = packageViews[view].packages.find((item) => item.id === id);
    if (!target) return;

    const departamento = window.prompt("Departamento", target.departamento);
    if (departamento === null) return;
    const nombre = window.prompt("Nombre", target.nombre);
    if (nombre === null) return;
    const compania = window.prompt("Compania", target.compania);
    if (compania === null) return;
    const hora = window.prompt("Hora", target.hora);
    if (hora === null) return;
    const fecha = window.prompt("Fecha", target.fecha);
    if (fecha === null) return;

    updatePackage(view, id, (item) => ({
      ...item,
      departamento,
      nombre,
      compania,
      hora,
      fecha,
    }));
  };

  const handleDeletePackages = (view: PackageServiceView, ids: string[]) => {
    if (ids.length === 0) return;
    const confirmed = window.confirm(
      ids.length === 1
        ? "¿Quieres borrar este paquete?"
        : `¿Quieres borrar ${ids.length} paquetes?`,
    );
    if (!confirmed) return;

    setPackageViews((current) => ({
      ...current,
      [view]: {
        ...current[view],
        packages: current[view].packages.filter((item) => !ids.includes(item.id)),
      },
    }));

    setSelectedIds((current) => ({
      ...current,
      [view]: current[view].filter((selectedId) => !ids.includes(selectedId)),
    }));
  };

  const handleEditSelected = () => {
    if (activeView === "reclamos") return;
    if (selectedVisibleIds.length !== 1) return;
    handleEditPackage(activeView, selectedVisibleIds[0]);
  };

  const openQrModal = (item: PackageItem) => {
    setQrScanMessage("");
    setQrPackage(item);
  };

  const closeQrModal = useCallback(() => {
    setQrPackage(null);
  }, []);

  const movePackageToRetiro = (id: string) => {
    let movedPackage: PackageItem | null = null;

    setPackageViews((current) => {
      const recepcionPackages = current.recepcion.packages.filter((item) => {
        if (item.id === id) {
          movedPackage = { ...item, estado: "Retiro" };
          return false;
        }
        return true;
      });

      if (!movedPackage) {
        return {
          ...current,
          retiro: {
              ...current.retiro,
              packages: current.retiro.packages.map((item) =>
              item.id === id ? { ...item, estado: "Retiro" } : item,
            ),
          },
        };
      }

      return {
        ...current,
        recepcion: {
          ...current.recepcion,
          packages: recepcionPackages,
        },
        retiro: {
          ...current.retiro,
          packages: [movedPackage, ...current.retiro.packages],
        },
      };
    });

    setSelectedIds((current) => ({
      recepcion: current.recepcion.filter((selectedId) => selectedId !== id),
      retiro: current.retiro,
    }));
  };

  const handleQrScan = useCallback((decodedText: string) => {
    const packageId = decodedText.replace("LobbyPack:", "").trim();
    const existsInRecepcion = packageViews.recepcion.packages.some((item) => item.id === packageId);
    const existsInRetiro = packageViews.retiro.packages.some((item) => item.id === packageId);

    if (!existsInRecepcion && !existsInRetiro) {
      return;
    }

    movePackageToRetiro(packageId);
    setQrScanMessage(`Paquete ${packageId} movido a Retiro.`);
    setActiveView("retiro");
    setCurrentPage(1);
    setTimeout(() => closeQrModal(), 900);
  }, [closeQrModal, packageViews.recepcion.packages, packageViews.retiro.packages]);

  return (
    <main>
      <section className="hero" id="inicio">
        <div className="main">
          <p className="eyebrow">Gestion de paquetes</p>
          <h1>LobbyPack</h1>
          <p className="lead">
            Administra paquetes recepcionados y retirados desde una sola vista.
          </p>

          <div className="serviceToggle" aria-label="Selecciona recepcion o retiro">
            <button
              type="button"
              className={activeView === "recepcion" ? "toggleButton active" : "toggleButton"}
              onClick={() => {
                setActiveView("recepcion");
                setCurrentPage(1);
              }}
            >
              Recepcion
            </button>
            <button
              type="button"
              className={activeView === "retiro" ? "toggleButton active" : "toggleButton"}
              onClick={() => {
                setActiveView("retiro");
                setCurrentPage(1);
              }}
            >
              Retiro
            </button>
            <button
              type="button"
              className={activeView === "reclamos" ? "toggleButton active" : "toggleButton"}
              onClick={() => {
                setActiveView("reclamos");
                setCurrentPage(1);
              }}
            >
              Reclamos
            </button>
          </div>

          {activeView === "reclamos" ? (
            <ComplaintPanel
              title="Reclamos"
              searchTerm={searchTerm}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              filteredCount={filteredComplaints.length}
              safePage={safePage}
              totalPages={totalPages}
              paginatedComplaints={paginatedComplaints}
              onSearchChange={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setCurrentPage(1);
              }}
              onPrevPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              startIndex={startIndex}
            />
          ) : (
            <PackagePanel
              title={currentPackageView?.title ?? "Paquetes"}
              searchTerm={searchTerm}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              allVisibleSelected={allVisibleSelected}
              filteredCount={filteredPackages.length}
              safePage={safePage}
              totalPages={totalPages}
              selectedVisibleCount={selectedVisibleIds.length}
              paginatedPackages={paginatedPackages}
              currentSelections={currentSelections}
              activeView={activeView}
              onSearchChange={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setCurrentPage(1);
              }}
              onSelectAllVisible={handleSelectAllVisible}
              onEditSelected={handleEditSelected}
              onDeleteSelected={() => handleDeletePackages(activeView, selectedVisibleIds)}
              onSelect={handlePackageSelection}
              onShowQr={openQrModal}
              onEdit={handleEditPackage}
              onDelete={handleDeletePackages}
              onPrevPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              startIndex={startIndex}
            />
          )}

          {activeView === "recepcion" ? (
            <button type="button" className="addPackageButton floatingAddButton">
              + Agregar paquete
            </button>
          ) : null}
        </div>
      </section>

      {qrPackage ? (
        <QrModal
          qrPackage={qrPackage}
          onClose={closeQrModal}
          onConfirm={handleQrScan}
          qrScanMessage={qrScanMessage}
        />
      ) : null}
    </main>
  );
}
