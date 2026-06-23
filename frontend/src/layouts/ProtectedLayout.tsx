import { Outlet } from "react-router-dom";
import Header from "../components/Header/Header";
import useCheckIfAuth from "../lib/checkAuth";
import { useI18n } from "../lib/i18n";

export default function ProtectedLayout() {
  const { t } = useI18n();
  const isCheckingAuth = useCheckIfAuth();

  if (isCheckingAuth) {
    return (
      <main className="authLoadingState">
        <p>{t("common.loading")}</p>
      </main>
    );
  }

  return (
    <div className="app">
      <Header />
      <Outlet />
      <footer className="siteFooter">
        <p>&copy; 2026 LobbyPack. {t("footer.rights")}</p>
        <span>{t("footer.copy")}</span>
      </footer>
    </div>
  );
}
