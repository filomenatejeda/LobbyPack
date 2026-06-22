import { LoginForm } from "@/components/auth";
import LanguageToggleButton from "@/components/Navbar/LanguageToggleButton";
import { useI18n } from "@/lib/i18n";
import { Link } from "react-router-dom";
import "./Auth.css";

export default function Login() {
  const { t } = useI18n();

  return (
    <main className="authPage">
      <div className="authTopbar">
        <div className="authTopbarInner">
          <Link to="/" className="authBrand">
            <span className="authBrandLobby">Lobby</span>
            <span className="authBrandPack">Pack</span>
          </Link>
          <div className="authTopLinks">
            <a href="/#inicio" className="authHomeLink">{t("nav.home")}</a>
            <a href="/#funciones" className="authHomeLink">{t("landing.features")}</a>
            <a href="/#como-funciona" className="authHomeLink">{t("landing.flow")}</a>
            <a href="/#acceso" className="authHomeLink">{t("landing.access")}</a>
            <LanguageToggleButton />
          </div>
        </div>
      </div>
      <section className="authHero">
        <div className="authMain">
          <div className="authLayout">
            <div className="authShowcase">
              <p className="eyebrow">{t("auth.packageManagement")}</p>
              <h1>
                <span className="titlePrimary">Lobby</span>
                <span className="titleAccent">Pack</span>
              </h1>
              <p className="authLead">{t("auth.showcaseLead")}</p>

              <div className="authHighlights">
                <div className="authHighlight">
                  <span className="authHighlightIndex">1</span>
                  <div>
                    <strong>{t("auth.centralizedReception")}</strong>
                    <p>{t("auth.centralizedReceptionText")}</p>
                  </div>
                </div>
                <div className="authHighlight">
                  <span className="authHighlightIndex">2</span>
                  <div>
                    <strong>{t("auth.secureLogin")}</strong>
                    <p>{t("auth.secureLoginText")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="authPanel">
              <LoginForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
