import { Link } from "react-router-dom";
import { logoHeroUrl } from "../../assets/externalImages";
import LanguageToggleButton from "../../components/Navbar/LanguageToggleButton";
import { useI18n } from "../../lib/i18n";
import "./Landing.css";

const featureKeys = [
  {
    title: "landing.orderlyReception",
    description: "landing.orderlyReceptionText",
  },
  {
    title: "landing.clearWithdrawals",
    description: "landing.clearWithdrawalsText",
  },
  {
    title: "landing.claims",
    description: "landing.claimsText",
  },
] as const;

export default function Landing() {
  const { t } = useI18n();

  return (
    <main className="landingPage">
      <nav className="landingTopNav" aria-label={t("nav.home")}>
        <div className="landingContainer landingTopNavInner">
          <a href="#inicio" className="landingBrand">
            <span className="landingBrandLobby">Lobby</span>
            <span className="landingBrandPack">Pack</span>
          </a>
          <div className="landingTopNavLinks">
            <a href="#inicio" className="landingQuickNavLink">
              {t("nav.home")}
            </a>
            <a href="#funciones" className="landingQuickNavLink">
              {t("landing.features")}
            </a>
            <a href="#como-funciona" className="landingQuickNavLink">
              {t("landing.flow")}
            </a>
            <a href="#acceso" className="landingQuickNavLink">
              {t("landing.access")}
            </a>
            <LanguageToggleButton className="landingLanguageButton" />
          </div>
        </div>
      </nav>

      <section className="landingHero" id="inicio">
        <div className="landingContainer landingHeroContent">
          <img src={logoHeroUrl} alt="LobbyPack" className="landingLogoHero" />
          <p className="landingEyebrow">{t("landing.buildingPackageManagement")}</p>
          <p className="landingLead landingLeadStrong">{t("landing.lead")}</p>

          <div className="landingActions">
            <Link to="/auth/login" className="landingPrimaryButton">
              {t("auth.login")}
            </Link>
            <Link to="/auth/sign-up" className="landingSecondaryButton">
              {t("auth.createAccount")}
            </Link>
          </div>
          <p className="landingLead landingLeadSecondary">{t("landing.secondaryLead")}</p>
        </div>
      </section>

      <section className="landingSection landingShowcaseSection">
        <div className="landingContainer landingShowcaseGrid">
          <div>
            <p className="landingEyebrow">{t("landing.showcaseEyebrow")}</p>
            <h2 className="landingShowcaseTitle">{t("landing.showcaseTitle")}</h2>
            <p className="landingShowcaseText">{t("landing.showcaseText")}</p>
          </div>

          <div className="landingMockup" aria-hidden="true">
            <div className="landingMockupHeader">
              <span className="landingMockupDot" />
              <span className="landingMockupDot" />
              <span className="landingMockupDot" />
            </div>
            <div className="landingMockupBody">
              <aside className="landingMockupSidebar">
                <span className="landingMockupSidebarItem landingMockupSidebarItemActive">
                  {t("landing.packages")}
                </span>
                <span className="landingMockupSidebarItem">{t("landing.pendingTitle")}</span>
                <span className="landingMockupSidebarItem">{t("landing.withdrawnTitle")}</span>
                <span className="landingMockupSidebarItem">{t("landing.claims")}</span>
              </aside>
              <div className="landingMockupContent">
                <div className="landingMockupStats">
                  <div className="landingMockupStatCard">
                    <strong>18</strong>
                    <span>{t("landing.receivedToday")}</span>
                  </div>
                  <div className="landingMockupStatCard">
                    <strong>6</strong>
                    <span>{t("landing.pendingLower")}</span>
                  </div>
                  <div className="landingMockupStatCard">
                    <strong>12</strong>
                    <span>{t("landing.withdrawnLower")}</span>
                  </div>
                </div>
                <div className="landingMockupList">
                  <div className="landingMockupRow">
                    <span>Torre B · 1204</span>
                    <span className="landingMockupBadge landingMockupBadgePending">
                      {t("landing.pending")}
                    </span>
                  </div>
                  <div className="landingMockupRow">
                    <span>Condominio Norte · 302</span>
                    <span className="landingMockupBadge landingMockupBadgeDone">
                      {t("landing.done")}
                    </span>
                  </div>
                  <div className="landingMockupRow">
                    <span>Edificio Central · 908</span>
                    <span className="landingMockupBadge landingMockupBadgePending">
                      {t("landing.pending")}
                    </span>
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
              <p className="landingEyebrow">{t("landing.systemDoes")}</p>
              <h2>{t("landing.systemDoesTitle")}</h2>
            </div>
            <p>{t("landing.systemDoesText")}</p>
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
            <p className="landingEyebrow">{t("landing.flow")}</p>
            <h2>{t("landing.howTitle")}</h2>
            <ol className="landingSteps">
              <li>{t("landing.step1")}</li>
              <li>{t("landing.step2")}</li>
              <li>{t("landing.step3")}</li>
              <li>{t("landing.step4")}</li>
            </ol>
          </article>

          <article className="landingStoryBlock landingStorySecondary" id="acceso">
            <p className="landingEyebrow">{t("landing.access")}</p>
            <h2>{t("landing.accessTitle")}</h2>
            <p>{t("landing.accessText")}</p>
            <div className="landingMiniActions">
              <Link to="/auth/login" className="landingTextLink">
                {t("landing.goLogin")}
              </Link>
              <Link to="/auth/sign-up" className="landingTextLink">
                {t("landing.goSignup")}
              </Link>
            </div>
          </article>
        </div>
      </section>

      <footer className="landingFooter">
        <div className="landingContainer">
          <p>&copy; 2026 LobbyPack. {t("footer.rights")}</p>
          <span>{t("footer.copy")}</span>
        </div>
      </footer>
    </main>
  );
}
