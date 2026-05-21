import AddPackageModal from "../../components/Home/AddPackageModal";
import ComplaintPanel from "../../components/Home/ComplaintPanel";
import PackagePanel from "../../components/Home/PackagePanel";
import QrModal from "../../components/Home/QrModal";
import ResidentDashboard from "../../components/Home/ResidentDashboard";
import { pageSizeOptions } from "../../utils/packageUtils";
import { useHomeDashboard } from "./hooks/useHomeDashboard";
import "./Home.css";

export default function Home() {
  const dashboard = useHomeDashboard();

  return (
    <main>
      <section className="hero" id="inicio">
        <div className="main">
          <p className="eyebrow">
            {dashboard.isResident ? "Retiro de paquetes" : "Gestion de paquetes"}
          </p>
          <h1>
            <span className="titlePrimary">Lobby</span>
            <span className="titleAccent">Pack</span>
          </h1>
          <p className="lead">
            {dashboard.isResident
              ? "Valida tu departamento, escanea el QR y confirma la entrega sin depender de un boton interno."
              : "Administra paquetes recepcionados y retirados desde una sola vista."}
          </p>

          {dashboard.errorMessage ? <p className="emptyState">{dashboard.errorMessage}</p> : null}
          {dashboard.isLoading ? (
            <p className="resultsText">Cargando datos desde la base de datos...</p>
          ) : null}

          {!dashboard.isLoading && dashboard.isResident && dashboard.currentUser ? (
            <ResidentDashboard
              currentUser={dashboard.currentUser}
              pendingParcels={dashboard.pendingParcels}
              claimedParcels={dashboard.claimedParcels}
              scannedParcel={dashboard.residentScannedParcel}
              feedbackMessage={dashboard.residentFeedbackMessage}
              feedbackTone={dashboard.residentFeedbackTone}
              isProcessing={dashboard.isResidentProcessing}
              onScan={dashboard.handleResidentScan}
              onConfirmClaim={dashboard.handleResidentConfirmClaim}
              onResetScan={dashboard.resetResidentClaimFlow}
            />
          ) : null}

          {!dashboard.isLoading && !dashboard.isResident ? (
            <>
              <div className="serviceToggle" aria-label="Selecciona recepcion o retiro">
                <button
                  type="button"
                  className={
                    dashboard.activeView === "received" ? "toggleButton active" : "toggleButton"
                  }
                  onClick={() => dashboard.activateView("received")}
                >
                  Recepcion
                </button>
                <button
                  type="button"
                  className={
                    dashboard.activeView === "pickedUp" ? "toggleButton active" : "toggleButton"
                  }
                  onClick={() => dashboard.activateView("pickedUp")}
                >
                  Retiro
                </button>
                <button
                  type="button"
                  className={
                    dashboard.activeView === "complaints"
                      ? "toggleButton active"
                      : "toggleButton"
                  }
                  onClick={() => dashboard.activateView("complaints")}
                >
                  Reclamos
                </button>
              </div>

              {dashboard.activeView === "complaints" ? (
                <ComplaintPanel
                  title="Reclamos"
                  searchTerm={dashboard.searchTerm}
                  pageSize={dashboard.pageSize}
                  pageSizeOptions={pageSizeOptions}
                  filteredCount={dashboard.filteredComplaints.length}
                  safePage={dashboard.safePage}
                  totalPages={dashboard.totalPages}
                  paginatedComplaints={dashboard.paginatedComplaints}
                  updatingIssueId={dashboard.updatingIssueId}
                  onSearchChange={dashboard.updateSearch}
                  onPageSizeChange={dashboard.updatePageSizeValue}
                  onPrevPage={dashboard.goToPreviousPage}
                  onNextPage={dashboard.goToNextPage}
                  onIssueStatusChange={(issueId, nextStatus) =>
                    void dashboard.handleIssueStatusChange(issueId, nextStatus)
                  }
                  startIndex={dashboard.startIndex}
                />
              ) : (
                (() => {
                  const packageView =
                    dashboard.activeView === "received" ? "received" : "pickedUp";

                  return (
                <PackagePanel
                  title={dashboard.currentPackageView?.title ?? "Paquetes"}
                  searchTerm={dashboard.searchTerm}
                  pageSize={dashboard.pageSize}
                  pageSizeOptions={pageSizeOptions}
                  allVisibleSelected={dashboard.allVisibleSelected}
                  filteredCount={dashboard.filteredPackages.length}
                  safePage={dashboard.safePage}
                  totalPages={dashboard.totalPages}
                  selectedVisibleCount={dashboard.selectedVisibleIds.length}
                  paginatedPackages={dashboard.paginatedPackages}
                  currentSelections={dashboard.currentSelections}
                  activeView={packageView}
                  onSearchChange={dashboard.updateSearch}
                  onPageSizeChange={dashboard.updatePageSizeValue}
                  onSelectAllVisible={dashboard.handleSelectAllVisible}
                  onEditSelected={dashboard.handleEditSelected}
                  onDeleteSelected={() =>
                    void dashboard.handleDeletePackages(
                      packageView,
                      dashboard.selectedVisibleIds,
                    )
                  }
                  onSelect={dashboard.handlePackageSelection}
                  onShowQr={dashboard.openQrModal}
                  onEdit={dashboard.handleEditPackage}
                  onDelete={(view, ids) => void dashboard.handleDeletePackages(view, ids)}
                  onPrevPage={dashboard.goToPreviousPage}
                  onNextPage={dashboard.goToNextPage}
                  startIndex={dashboard.startIndex}
                />
                  );
                })()
              )}

              {dashboard.activeView === "received" ? (
                <button
                  type="button"
                  className="addPackageButton floatingAddButton"
                  onClick={() => dashboard.setIsAddPackageOpen(true)}
                >
                  + Agregar paquete
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      {!dashboard.isResident && dashboard.qrPackage ? (
        <QrModal
          qrPackage={dashboard.qrPackage}
          onClose={dashboard.closeQrModal}
          onConfirm={(value) => void dashboard.handleQrScan(value)}
          qrScanMessage={dashboard.qrScanMessage}
        />
      ) : null}

      {!dashboard.isResident && dashboard.isAddPackageOpen ? (
        <AddPackageModal
          onClose={() => dashboard.setIsAddPackageOpen(false)}
          onSubmit={dashboard.handleAddPackage}
        />
      ) : null}

      {!dashboard.isResident && dashboard.editingParcel ? (
        <AddPackageModal
          title={`Editar paquete ${dashboard.editingParcel.id}`}
          initialValues={{
            department_address: dashboard.editingParcel.department_address,
            resident_name: dashboard.editingParcel.resident_name,
            user_phone_number: dashboard.editingParcel.user_phone_number,
            business_name: dashboard.editingParcel.business_name,
            concierge_name: dashboard.editingParcel.concierge_name,
            parcel_description: dashboard.editingParcel.parcel_description,
            is_urgent: dashboard.editingParcel.is_urgent,
          }}
          onClose={() => dashboard.setEditingParcel(null)}
          onSubmit={dashboard.handleUpdatePackage}
        />
      ) : null}
    </main>
  );
}
