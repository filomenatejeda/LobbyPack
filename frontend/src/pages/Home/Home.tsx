import AdminDashboard from "../Admin/AdminDashboard";
import ResidentDashboard from "../Resident/ResidentDashboard";
import { useI18n } from "../../lib/i18n";
import { useHomeDashboard } from "./hooks/useHomeDashboard";
import "./Home.css";

export default function Home() {
  const { t } = useI18n();
  const dashboard = useHomeDashboard();

  if (dashboard.isLoading && !dashboard.currentUser) {
    return <main className="pageTransitionBlank" aria-hidden="true" />;
  }

  return (
    <main>
      <section className="hero" id="inicio">
        <div className={dashboard.isResident ? "main residentMain" : "main"}>
          <p className="eyebrow">
            {dashboard.isResident ? t("home.withdrawal") : t("home.management")}
          </p>
          <h1>
            <span className="titlePrimary">Lobby</span>
            <span className="titleAccent">Pack</span>
          </h1>
          <p className="lead">
            {dashboard.isResident
              ? dashboard.preferenceSettings.qr_access
                ? t("home.residentLeadQr")
                : t("home.residentLeadNoQr")
              : t("home.adminLead")}
          </p>

          {dashboard.errorMessage ? <p className="emptyState">{dashboard.errorMessage}</p> : null}
          {dashboard.isLoading ? (
            <p className="resultsText">{t("home.loadingData")}</p>
          ) : null}

          {!dashboard.isLoading && dashboard.isResident && dashboard.currentUser ? (
            <ResidentDashboard
              currentUser={dashboard.currentUser}
              pendingParcels={dashboard.pendingParcels}
              claimedParcels={dashboard.claimedParcels}
              preferenceSettings={dashboard.preferenceSettings}
              issues={dashboard.issues}
              scannedParcel={dashboard.residentScannedParcel}
              feedbackMessage={dashboard.residentFeedbackMessage}
              feedbackTone={dashboard.residentFeedbackTone}
              isProcessing={dashboard.isResidentProcessing}
              onScan={dashboard.handleResidentScan}
              onConfirmClaim={dashboard.handleResidentConfirmClaim}
              onResetScan={dashboard.resetResidentClaimFlow}
              onCreateIssue={dashboard.handleResidentCreateIssue}
              issueMessage={dashboard.residentIssueMessage}
              issueTone={dashboard.residentIssueTone}
              isCreatingIssue={dashboard.isCreatingResidentIssue}
            />
          ) : null}

          {!dashboard.isLoading && !dashboard.isResident ? (
            <AdminDashboard dashboard={dashboard} />
          ) : null}
        </div>
      </section>
    </main>
  );
}
