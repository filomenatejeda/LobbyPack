import { SignUpForm } from "@/components/auth";
import { useI18nContext } from "@/i18n/i18n-react";
import { Link } from "react-router-dom";
import "./Auth.css";

export default function Sign_Up() {
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
            <div className="authShowcase">
              <p className="eyebrow">{LL.auth_createUser()}</p>
              <h1>
                <span className="titlePrimary">Lobby</span>
                <span className="titleAccent">Pack</span>
              </h1>
              <p className="authLead">{LL.auth_signUpLead()}</p>

              <div className="authHighlights">
                <div className="authHighlight">
                  <span className="authHighlightIndex">1</span>
                  <div>
                    <strong>{LL.auth_verificationByEmail()}</strong>
                    <p>{LL.auth_verificationByEmailText()}</p>
                  </div>
                </div>
                <div className="authHighlight">
                  <span className="authHighlightIndex">2</span>
                  <div>
                    <strong>{LL.auth_orderlyAccess()}</strong>
                    <p>{LL.auth_orderlyAccessText()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="authPanel">
              <SignUpForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
