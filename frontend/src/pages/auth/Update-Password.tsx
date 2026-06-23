import { UpdatePasswordForm } from "@/components/auth";
import { useI18nContext } from "@/i18n/i18n-react";
import { Link } from "react-router-dom";
import "./Auth.css";

export default function Update_Password() {
  const { LL } = useI18nContext();

  return (
    <main className="authPage">
      <div className="authTopbar">
        <div className="authTopbarInner">
          <Link to="/" className="authBrand">
            LobbyPack
          </Link>
          <div className="authTopLinks">
            <a href="/#inicio" className="authHomeLink">{LL.nav_home()}</a>
            <a href="/#funciones" className="authHomeLink">{LL.landing_features()}</a>
            <a href="/#como-funciona" className="authHomeLink">{LL.landing_flow()}</a>
            <a href="/#acceso" className="authHomeLink">{LL.landing_access()}</a>
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
