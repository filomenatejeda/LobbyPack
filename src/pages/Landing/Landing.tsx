import { Link } from "react-router-dom";
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
  return (
    <main className="landingPage">
      <section className="landingHero">
        <div className="landingContainer">
          <p className="landingEyebrow">Gestión de paquetería para edificios</p>
          <h1 className="landingTitle">
            <span className="landingTitlePrimary">Lobby</span>
            <span className="landingTitleAccent">Pack</span>
          </h1>
          <p className="landingLead">
            Organiza la recepción, el retiro y el seguimiento de paquetes desde una plataforma
            simple para conserjería, recepción o cabina de control.
          </p>

          <div className="landingActions">
            <Link to="/auth/login" className="landingPrimaryButton">
              Iniciar sesión
            </Link>
            <Link to="/auth/sign-up" className="landingSecondaryButton">
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>

      <section className="landingSection">
        <div className="landingContainer">
          <div className="landingSectionHeader">
            <p className="landingEyebrow">Qué hace LobbyPack</p>
            <h2>Una herramienta para trabajar con menos desorden</h2>
            <p>
              Pensada para equipos que necesitan registrar entregas, validar retiros y tener una
              vista clara de lo que está pasando.
            </p>
          </div>

          <div className="landingFeatureList">
            {features.map((feature) => (
              <article key={feature.title} className="landingFeatureItem">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landingSection landingSectionMuted">
        <div className="landingContainer landingInfoGrid">
          <article className="landingInfoCard">
            <h2>Cómo funciona</h2>
            <ol className="landingSteps">
              <li>Registras un paquete cuando llega.</li>
              <li>Queda listado como pendiente.</li>
              <li>Cuando se retira, actualizas su estado.</li>
              <li>Si hay problemas, revisas el reclamo en el dashboard.</li>
            </ol>
          </article>

          <article className="landingInfoCard">
            <h2>Acceso al sistema</h2>
            <p>
              La portada es pública para explicar el sistema, pero el dashboard sigue protegido.
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
