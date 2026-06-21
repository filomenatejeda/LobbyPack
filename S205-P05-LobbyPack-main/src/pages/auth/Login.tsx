import { LoginForm } from "@/components/auth";
import "./Auth.css";


export default function Login() {
  return (
    <main className="authPage">
      <section className="authHero">
        <div className="authMain">
          <div className="authLayout">
            <div className="authShowcase">
              <p className="eyebrow">Gestión de paquetes</p>
              <h1>
                <span className="titlePrimary">Lobby</span>
                <span className="titleAccent">Pack</span>
              </h1>
              <p className="authLead">
                La misma experiencia visual del dashboard, ahora también en el acceso al sistema.
              </p>

              <div className="authHighlights">
                <div className="authHighlight">
                  <span className="authHighlightIndex">1</span>
                  <div>
                    <strong>Recepción centralizada</strong>
                    <p>Consulta paquetes pendientes, retirados y reclamos desde un solo lugar.</p>
                  </div>
                </div>
                <div className="authHighlight">
                  <span className="authHighlightIndex">2</span>
                  <div>
                    <strong>Ingreso seguro</strong>
                    <p>Accede con tu cuenta y valida el segundo factor cuando corresponda.</p>
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
