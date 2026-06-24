import { Link } from "react-router-dom";
import logo from "../../assets/Logo1.png";
import { useI18nContext } from "../../i18n/i18n-react";
import LanguageToggleButton from "../../components/Navbar/LanguageToggleButton";
import { useI18n } from "../../lib/i18n";
import "./Landing.css";

export default function Landing() {
  const { LL } = useI18nContext();
  const features = [
    { title: LL.landing_orderlyReception(), description: LL.landing_orderlyReceptionText() },
    { title: LL.landing_clearWithdrawals(), description: LL.landing_clearWithdrawalsText() },
    { title: LL.landing_claims(), description: LL.landing_claimsText() },
  ];

  return (
    <main className="landingPage">
      <nav className="landingTopNav" aria-label={LL.nav_home()}>
        <div className="landingContainer landingTopNavInner">
          <a href="#inicio" className="landingBrand">
            <span className="landingBrandLobby">Lobby</span>
            <span className="landingBrandPack">Pack</span>
          </a>
          <div className="landingTopNavLinks">
            <a href="#inicio" className="landingQuickNavLink">{LL.nav_home()}</a>
            <a href="#funciones" className="landingQuickNavLink">{LL.landing_features()}</a>
            <a href="#como-funciona" className="landingQuickNavLink">{LL.landing_flow()}</a>
            <a href="#acceso" className="landingQuickNavLink">{LL.landing_access()}</a>
            <LanguageToggleButton className="landingLanguageButton" />
          </div>
        </div>
      </nav>

      <section className="landingHero" id="inicio">
        <div className="landingContainer landingHeroContent">
          <img src={logo} alt="LobbyPack" className="landingLogoHero" />
          <p className="landingEyebrow">{LL.landing_buildingPackageManagement()}</p>
          <p className="landingLead landingLeadStrong">{LL.landing_lead()}</p>

          <div className="landingActions">
            <Link to="/auth/login" className="landingPrimaryButton">{LL.auth_login()}</Link>
            <Link to="/auth/sign-up" className="landingSecondaryButton">{LL.auth_createAccount()}</Link>
          </div>
          <p className="landingLead landingLeadSecondary">{LL.landing_secondaryLead()}</p>
        </div>
      </section>

      <section className="landingSection landingShowcaseSection">
        <div className="landingContainer landingShowcaseGrid">
          <div>
            <p className="landingEyebrow">{LL.landing_showcaseEyebrow()}</p>
            <h2 className="landingShowcaseTitle">{LL.landing_showcaseTitle()}</h2>
            <p className="landingShowcaseText">{LL.landing_showcaseText()}</p>
          </div>

          <div className="landingMockup" aria-hidden="true">
            <div className="landingMockupHeader">
              <span className="landingMockupDot" />
              <span className="landingMockupDot" />
              <span className="landingMockupDot" />
            </div>
            <div className="landingMockupBody">
              <aside className="landingMockupSidebar">
                <span className="landingMockupSidebarItem landingMockupSidebarItemActive">{LL.landing_packages()}</span>
                <span className="landingMockupSidebarItem">{LL.landing_pendingTitle()}</span>
                <span className="landingMockupSidebarItem">{LL.landing_withdrawnTitle()}</span>
                <span className="landingMockupSidebarItem">{LL.landing_claims()}</span>
              </aside>
              <div className="landingMockupContent">
                <div className="landingMockupStats">
                  <div className="landingMockupStatCard">
                    <strong>18</strong>
                    <span>{LL.landing_receivedToday()}</span>
                  </div>
                  <div className="landingMockupStatCard">
                    <strong>6</strong>
                    <span>{LL.landing_pendingLower()}</span>
                  </div>
                  <div className="landingMockupStatCard">
                    <strong>12</strong>
                    <span>{LL.landing_withdrawnLower()}</span>
                  </div>
                </div>
                <div className="landingMockupList">
                  <div className="landingMockupRow">
                    <span>Torre B · 1204</span>
                    <span className="landingMockupBadge landingMockupBadgePending">{LL.landing_pending()}</span>
                  </div>
                  <div className="landingMockupRow">
                    <span>Condominio Norte · 302</span>
                    <span className="landingMockupBadge landingMockupBadgeDone">{LL.landing_done()}</span>
                  </div>
                  <div className="landingMockupRow">
                    <span>Edificio Central · 908</span>
                    <span className="landingMockupBadge landingMockupBadgePending">{LL.landing_pending()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landingSection" id="funciones">
        <div className="landingContainer">
          <div className="landingSectionHeader landingSectionHeaderWide">
            <div>
              <p className="landingEyebrow">{LL.landing_systemDoes()}</p>
              <h2>{LL.landing_systemDoesTitle()}</h2>
            </div>
            <p>{LL.landing_systemDoesText()}</p>
          </div>

          <div className="landingFeatureFlow">
            {featureKeys.map((feature, index) => (
              <article
                key={feature.title}
                className={`landingFeatureBand landingFeatureBand${index + 1}`}
              >
                <span className="landingFeatureIndex">0{index + 1}</span>
                <div>
                  <h3>{t(feature.title)}</h3>
                  <p>{t(feature.description)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landingSection landingSectionMuted">
        <div className="landingContainer landingStoryGrid">
          <article className="landingStoryBlock landingStoryPrimary" id="como-funciona">
            <p className="landingEyebrow">{LL.landing_flow()}</p>
            <h2>{LL.landing_howTitle()}</h2>
            <ol className="landingSteps">
              <li>{LL.landing_step1()}</li>
              <li>{LL.landing_step2()}</li>
              <li>{LL.landing_step3()}</li>
              <li>{LL.landing_step4()}</li>
            </ol>
          </article>

          <article className="landingStoryBlock landingStorySecondary" id="acceso">
            <p className="landingEyebrow">{LL.landing_access()}</p>
            <h2>{LL.landing_accessTitle()}</h2>
            <p>{LL.landing_accessText()}</p>
            <div className="landingMiniActions">
              <Link to="/auth/login" className="landingTextLink">{LL.landing_goLogin()}</Link>
              <Link to="/auth/sign-up" className="landingTextLink">{LL.landing_goSignup()}</Link>
            </div>
          </article>
        </div>
      </section>

      <footer className="landingFooter">
        <div className="landingContainer">
          <p>&copy; 2026 LobbyPack. {LL.footer_rights()}</p>
          <span>{LL.footer_copy()}</span>
        </div>
      </footer>
    </main>
  );
}
