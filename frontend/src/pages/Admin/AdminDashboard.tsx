import { useI18nContext } from "@/i18n/i18n-react";
import { useState } from "react";
import AddPackageModal from "../../components/Home/AddPackageModal";
import ComplaintPanel from "../../components/Home/ComplaintPanel";
import PackagePanel from "../../components/Home/PackagePanel";
import QrModal from "../../components/Home/QrModal";
import { pageSizeOptions } from "../../utils/packageUtils";
import type { useHomeDashboard } from "../Home/hooks/useHomeDashboard";
import "./AdminDashboard.css";

type AdminDashboardProps = {
  dashboard: ReturnType<typeof useHomeDashboard>;
};

export default function AdminDashboard({dashboard }: AdminDashboardProps) {
  const { LL } = useI18nContext();
  const [withdrawalPin, setWithdrawalPin] = useState("");
  const canManageIssueStatus = dashboard.currentUser?.role === "admin";
  const openIssues = dashboard.issues.filter((issue) => issue.issue_status === "open");
  const underReviewIssues = dashboard.issues.filter(
    (issue) => issue.issue_status === "under_review",
  );
  const pendingPickupCount = dashboard.pendingParcels.length;
  const claimedCount = dashboard.claimedParcels.length;
  const openIssueCount = openIssues.length;

  return (
    <>
      <section className="adminOverview" aria-label={LL.admin_operationalSummary()}>
        <button
          type="button"
          className={
            dashboard.activeView === "received"
              ? "adminOverviewCard active"
              : "adminOverviewCard"
          }
          onClick={() => dashboard.activateView("received")}
        >
          <span>{LL.admin_inReception()}</span>
          <strong>{pendingPickupCount}</strong>
          <small>{LL.admin_packagesWaiting()}</small>
        </button>

        <button
          type="button"
          className={
            dashboard.activeView === "pickedUp"
              ? "adminOverviewCard active"
              : "adminOverviewCard"
          }
          onClick={() => dashboard.activateView("pickedUp")}
        >
          <span>{LL.admin_withdrawn()}</span>
          <strong>{claimedCount}</strong>
          <small>{LL.admin_completedDeliveries()}</small>
        </button>

        <button
          type="button"
          className={
            dashboard.activeView === "complaints"
              ? "adminOverviewCard adminOverviewAlert active"
              : "adminOverviewCard adminOverviewAlert"
          }
          onClick={() => dashboard.activateView("complaints")}
        >
          <span>{LL.admin_claimsOpen()}</span>
          <strong>{openIssueCount}</strong>
          <small>
            {underReviewIssues.length} {LL.admin_underReview()}
          </small>
        </button>
      </section>

      {openIssueCount > 0 ? (
        <button
          type="button"
          className="adminIssueNotice"
          onClick={() => dashboard.activateView("complaints")}
        >
          <strong>
            {openIssueCount}{" "}
            {openIssueCount === 1
              ? LL.admin_openClaimSingular()
              : LL.admin_openClaimPlural()}
          </strong>
          <span>{LL.admin_reviewClaims()}</span>
        </button>
      ) : null}

      <div className="serviceToggle" aria-label={`${LL.admin_receipt()} / ${LL.admin_withdrawal()}`}>
        <button
          type="button"
          className={dashboard.activeView === "received" ? "toggleButton active" : "toggleButton"}
          onClick={() => dashboard.activateView("received")}
        >
          <span>{LL.admin_receipt()}</span>
          <strong className="toggleCount">{pendingPickupCount}</strong>
        </button>
        <button
          type="button"
          className={dashboard.activeView === "pickedUp" ? "toggleButton active" : "toggleButton"}
          onClick={() => dashboard.activateView("pickedUp")}
        >
          <span>{LL.admin_withdrawal()}</span>
          <strong className="toggleCount">{claimedCount}</strong>
        </button>
        <button
          type="button"
          className={dashboard.activeView === "complaints" ? "toggleButton active" : "toggleButton"}
          onClick={() => dashboard.activateView("complaints")}
        >
          <span>{LL.resident_claims()}</span>
          <strong className={openIssueCount > 0 ? "toggleCount alert" : "toggleCount"}>
            {openIssueCount}
          </strong>
        </button>
      </div>

      {dashboard.activeView === "complaints" ? (
        <ComplaintPanel
          title={LL.admin_claims()}
          searchTerm={dashboard.searchTerm}
          pageSize={dashboard.pageSize}
          pageSizeOptions={pageSizeOptions}
          filteredCount={dashboard.filteredComplaints.length}
          safePage={dashboard.safePage}
          totalPages={dashboard.totalPages}
          paginatedComplaints={dashboard.paginatedComplaints}
          updatingIssueId={dashboard.updatingIssueId}
          canManageStatus={canManageIssueStatus}
          senderEmail={dashboard.currentUser?.email ?? ""}
          selectedIssueIds={dashboard.selectedIssueIds}
          selectedVisibleCount={dashboard.selectedVisibleIssueIds.length}
          allVisibleSelected={dashboard.allVisibleComplaintsSelected}
          onSearchChange={dashboard.updateSearch}
          onPageSizeChange={dashboard.updatePageSizeValue}
          onPrevPage={dashboard.goToPreviousPage}
          onNextPage={dashboard.goToNextPage}
          onSelect={dashboard.handleIssueSelection}
          onSelectAllVisible={dashboard.handleSelectAllVisibleIssues}
          onIssueStatusChange={(issueId, nextStatus) =>
            void dashboard.handleIssueStatusChange(issueId, nextStatus)
          }
          onBulkIssueStatusChange={(issueIds, nextStatus) =>
            void dashboard.handleBulkIssueStatusChange(issueIds, nextStatus)
          }
          onDeleteIssue={(issueId) => void dashboard.handleDeleteIssue(issueId)}
          onDeleteSelectedIssues={(issueIds) => void dashboard.handleDeleteIssues(issueIds)}
          startIndex={dashboard.startIndex}
        />
      ) : (
        (() => {
          const packageView = dashboard.activeView === "received" ? "received" : "pickedUp";

          return (
            <PackagePanel
              title={
                dashboard.activeView === "received"
                  ? LL.home_receivedPackages()
                  : LL.home_withdrawnPackages()
              }
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
              senderEmail={dashboard.currentUser?.email ?? ""}
              qrAccessEnabled={dashboard.preferenceSettings.qr_access}
              onSearchChange={dashboard.updateSearch}
              onPageSizeChange={dashboard.updatePageSizeValue}
              onSelectAllVisible={dashboard.handleSelectAllVisible}
              onEditSelected={dashboard.handleEditSelected}
              onDeleteSelected={() =>
                void dashboard.handleDeletePackages(packageView, dashboard.selectedVisibleIds)
              }
              onSelect={dashboard.handlePackageSelection}
              onShowQr={dashboard.openQrModal}
              onShowPin={dashboard.openPinModal}
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
          {LL.admin_addPackage()}
        </button>
      ) : null}

      {dashboard.qrPackage ? (
        <QrModal
          qrPackage={dashboard.qrPackage}
          qrAccessEnabled={dashboard.preferenceSettings.qr_access}
          onClose={dashboard.closeQrModal}
          onConfirm={(value) => void dashboard.handleQrScan(value)}
          qrScanMessage={dashboard.qrScanMessage}
        />
      ) : null}

      {dashboard.pinPackage ? (
        <div className="pinModalOverlay" onClick={dashboard.closePinModal}>
          <section
            className="pinModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pinModalTitle"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pinModalHeader">
              <div>
                <p>{LL.admin_pinTitle()}</p>
                <h3 id="pinModalTitle">{LL.resident_package()} {dashboard.pinPackage.id}</h3>
              </div>
              <button
                type="button"
                className="closeModalButton"
                onClick={dashboard.closePinModal}
                aria-label={LL.admin_pinClose()}
              >
                {LL.settings_close()}
              </button>
            </div>

            <p className="pinModalText">
              {LL.admin_pinText()}{" "}
              <strong>{dashboard.pinPackage.department_address}</strong> {LL.admin_pinTextEnd()}
            </p>

            <form
              className="pinModalForm"
              onSubmit={(event) => {
                event.preventDefault();
                void dashboard.handlePinClaim(dashboard.pinPackage?.id ?? "", withdrawalPin);
                setWithdrawalPin("");
              }}
            >
              <label>
                <span>{LL.admin_pinLabel()}</span>
                <input
                  type="text"
                  name="lobbypack-package-withdrawal-pin"
                  className="pinCodeInput"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  spellCheck={false}
                  pattern="[0-9]*"
                  minLength={4}
                  maxLength={6}
                  value={withdrawalPin}
                  onChange={(event) =>
                    setWithdrawalPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder={LL.admin_pinDigits()}
                  autoFocus
                />
              </label>

              {dashboard.pinClaimMessage ? (
                <p className="pinModalStatus">{dashboard.pinClaimMessage}</p>
              ) : null}

              <div className="pinModalActions">
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={dashboard.closePinModal}
                  disabled={dashboard.isPinClaimProcessing}
                >
                  {LL.admin_cancel()}
                </button>
                <button
                  type="submit"
                  className="primaryButton"
                  disabled={dashboard.isPinClaimProcessing || withdrawalPin.length < 4}
                >
                  {dashboard.isPinClaimProcessing ? LL.admin_validating() : LL.admin_validate()}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {dashboard.isAddPackageOpen ? (
        <AddPackageModal
          conciergeName={dashboard.currentUser?.display_name ?? ""}
          communityStructure={dashboard.communityStructure}
          onClose={() => dashboard.setIsAddPackageOpen(false)}
          onSubmit={dashboard.handleAddPackage}
        />
      ) : null}

      {dashboard.editingParcel ? (
        <AddPackageModal
          conciergeName={dashboard.currentUser?.display_name ?? ""}
          communityStructure={dashboard.communityStructure}
          title={`${LL.admin_editPackage()} ${dashboard.editingParcel.id}`}
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
    </>
  );
}
