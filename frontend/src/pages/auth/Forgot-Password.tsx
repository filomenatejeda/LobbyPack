import { ForgotPasswordForm } from "@/components/auth";
import { Link } from "react-router-dom";
import "./Auth.css";


export default function Forgot_Password() {
  return (
    <main className="authPage">
      <div className="authTopbar">
        <div className="authTopbarInner">
          <Link to="/" className="authBrand">
            LobbyPack
          </Link>
          <div className="authTopLinks">
            <a href="/#inicio" className="authHomeLink">Inicio</a>
            <a href="/#funciones" className="authHomeLink">Funciones</a>
            <a href="/#como-funciona" className="authHomeLink">Cómo funciona</a>
            <a href="/#acceso" className="authHomeLink">Acceso</a>
          </div>
        </div>
      </div>
      <section className="authHero">
        <div className="authMain">
          <div className="authLayout">
            <div className="authShowcase">
              <p className="eyebrow">Recuperacion de acceso</p>
              <h1>
                <span className="titlePrimary">Lobby</span>
                <span className="titleAccent">Pack</span>
              </h1>
              <p className="authLead">
                Recupera el acceso manteniendo la misma experiencia visual del resto del sistema.
              </p>

              <div className="authHighlights">
                <div className="authHighlight">
                  <span className="authHighlightIndex">1</span>
                  <div>
                    <strong>Recuperacion guiada</strong>
                    <p>Envias el correo, recibes el enlace y vuelves a entrar sin perder el flujo.</p>
                  </div>
                </div>
                <div className="authHighlight">
                  <span className="authHighlightIndex">2</span>
                  <div>
                    <strong>Acceso seguro</strong>
                    <p>El restablecimiento se apoya en la configuracion de autenticacion de Supabase.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="authPanel">
              <ForgotPasswordForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
