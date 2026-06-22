import { UpdatePasswordForm } from "@/components/auth";
import LanguageToggleButton from "@/components/Navbar/LanguageToggleButton";
import { useI18n } from "@/lib/i18n";
import { Link } from "react-router-dom";
import "./Auth.css";

export default function Update_Password() {
  const { t } = useI18n();

  return (
    <main className="authPage">
      <div className="authTopbar">
        <div className="authTopbarInner">
          <Link to="/" className="authBrand">
            LobbyPack
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
            <div className="authPanel">
              <UpdatePasswordForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
