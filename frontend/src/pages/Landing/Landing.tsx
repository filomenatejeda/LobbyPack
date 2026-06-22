import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/Logo1.png";
import LanguageToggleButton from "../../components/Navbar/LanguageToggleButton";
import { supabase, supabaseConfigError } from "../../lib/client";
import "./Landing.css";

const features = [
  {
    title: "Recepción ordenada",
    description:
      "Registra cada paquete con los datos del residente, la empresa y la persona que recibe.",
  },
  {
    title: "Retiros claros",
    description:
      "Distingue rápidamente entre paquetes pendientes y retirados para evitar confusiones.",
  },
  {
    title: "Reclamos y seguimiento",
    description:
      "Consulta incidencias y mantén la operación diaria centralizada desde un solo panel.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    if (supabaseConfigError) {
      return;
    }

    let isActive = true;

    const redirectAuthenticatedUser = async () => {
      const { data } = await supabase.auth.getSession();

      if (isActive && data.session) {
        navigate("/auth/login", { replace: true });
      }
    };

    void redirectAuthenticatedUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/auth/login", { replace: true });
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <main className="landingPage">
      <nav className="landingTopNav" aria-label="Navegación de la portada">
        <div className="landingContainer landingTopNavInner">
          <a href="#inicio" className="landingBrand">
            <span className="landingBrandLobby">Lobby</span>
            <span className="landingBrandPack">Pack</span>
          </a>
          <div className="landingTopNavLinks">
            <a href="#inicio" className="landingQuickNavLink">
              Inicio
            </a>
            <a href="#funciones" className="landingQuickNavLink">
              Funciones
            </a>
            <a href="#como-funciona" className="landingQuickNavLink">
              Cómo funciona
            </a>
            <a href="#acceso" className="landingQuickNavLink">
              Acceso
            </a>
            <LanguageToggleButton className="landingLanguageButton" />
          </div>
        </div>
      </nav>

      <section className="landingHero" id="inicio">
        <div className="landingContainer landingHeroContent">
          <img src={logo} alt="LobbyPack" className="landingLogoHero" />
          <p className="landingEyebrow">Gestión de paquetería para edificios</p>
          <p className="landingLead landingLeadStrong">
            Controla la recepción y el retiro de paquetes sin perder el orden del día.
          </p>


          <div className="landingActions">
            <Link to="/auth/login" className="landingPrimaryButton">
              Iniciar sesión
            </Link>
            <Link to="/auth/sign-up" className="landingSecondaryButton">
              Crear cuenta
            </Link>

          </div>
                    <p className="landingLead landingLeadSecondary">
            Una plataforma simple para conserjería y recepción, pensada para registrar entregas,
            validar retiros y revisar incidencias desde un mismo lugar.
          </p>
        </div>
      </section>

      <section className="landingSection landingShowcaseSection">
        <div className="landingContainer landingShowcaseGrid">
          <div>
            <p className="landingEyebrow">Vista del sistema</p>
            <h2 className="landingShowcaseTitle">
              Una vista simple para saber qué llegó, qué sigue pendiente y qué ya fue retirado.
            </h2>
            <p className="landingShowcaseText">
              LobbyPack ordena la operación diaria con una vista rápida de paquetes, estados y
              acciones frecuentes, para que el equipo responda mejor sin perder tiempo.
            </p>
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
                  Paquetes
                </span>
                <span className="landingMockupSidebarItem">Pendientes</span>
                <span className="landingMockupSidebarItem">Retirados</span>
                <span className="landingMockupSidebarItem">Incidencias</span>
              </aside>
              <div className="landingMockupContent">
                <div className="landingMockupStats">
                  <div className="landingMockupStatCard">
                    <strong>18</strong>
                    <span>recibidos hoy</span>
                  </div>
                  <div className="landingMockupStatCard">
                    <strong>6</strong>
                    <span>pendientes</span>
                  </div>
                  <div className="landingMockupStatCard">
                    <strong>12</strong>
                    <span>retirados</span>
                  </div>
                </div>
                <div className="landingMockupList">
                  <div className="landingMockupRow">
                    <span>Torre B · 1204</span>
                    <span className="landingMockupBadge landingMockupBadgePending">Pendiente</span>
                  </div>
                  <div className="landingMockupRow">
                    <span>Condominio Norte · 302</span>
                    <span className="landingMockupBadge landingMockupBadgeDone">Retirado</span>
                  </div>
                  <div className="landingMockupRow">
                    <span>Edificio Central · 908</span>
                    <span className="landingMockupBadge landingMockupBadgePending">Pendiente</span>
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
              <p className="landingEyebrow">Qué hace LobbyPack</p>
              <h2>Una herramienta para trabajar con menos desorden</h2>
            </div>
            <p>
              Pensada para equipos que necesitan registrar entregas, validar retiros y tener una
              vista clara de lo que está pasando.
            </p>
          </div>

          <div className="landingFeatureFlow">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className={`landingFeatureBand landingFeatureBand${index + 1}`}
              >
                <span className="landingFeatureIndex">0{index + 1}</span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landingSection landingSectionMuted">
        <div className="landingContainer landingStoryGrid">
          <article className="landingStoryBlock landingStoryPrimary" id="como-funciona">
            <p className="landingEyebrow">Cómo funciona</p>
            <h2>Un flujo simple desde que el paquete llega hasta que se retira.</h2>
            <ol className="landingSteps">
              <li>Registras un paquete cuando llega.</li>
              <li>Queda listado como pendiente.</li>
              <li>Cuando se retira, actualizas su estado.</li>
              <li>Si hay problemas, revisas el reclamo en el dashboard.</li>
            </ol>
          </article>

          <article className="landingStoryBlock landingStorySecondary" id="acceso">
            <p className="landingEyebrow">Acceso</p>
            <h2>La portada explica el sistema y el dashboard se mantiene protegido.</h2>
            <p>
              Muestras la propuesta de valor sin exponer la operación interna del edificio o la
              comunidad.
            </p>
            <div className="landingMiniActions">
              <Link to="/auth/login" className="landingTextLink">
                Ir a iniciar sesión
              </Link>
              <Link to="/auth/sign-up" className="landingTextLink">
                Ir a crear cuenta
              </Link>
            </div>
          </article>
        </div>
      </section>

      <footer className="landingFooter">
        <div className="landingContainer">
          <p>&copy; 2026 LobbyPack. Todos los derechos reservados.</p>
          <span>Gestión de recepción y retiro de paquetes.</span>
        </div>
      </footer>
    </main>
  );
}
