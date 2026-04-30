import { SignUpForm } from "@/components/auth";
import { Link } from "react-router-dom";
import "./Auth.css";


export default function Sign_Up() {
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
              <p className="eyebrow">Alta de usuario</p>
              <h1>
                <span className="titlePrimary">Lobby</span>
                <span className="titleAccent">Pack</span>
              </h1>
              <p className="authLead">
                Crea tu acceso con el mismo look del dashboard para que toda la experiencia se sienta unificada.
              </p>

              <div className="authHighlights">
                <div className="authHighlight">
                  <span className="authHighlightIndex">1</span>
                  <div>
                    <strong>Verificacion por correo</strong>
                    <p>El alta parte con un codigo enviado a tu correo para validar la cuenta.</p>
                  </div>
                </div>
                <div className="authHighlight">
                  <span className="authHighlightIndex">2</span>
                  <div>
                    <strong>Ingreso ordenado</strong>
                    <p>Despues de verificar el codigo, vuelves directo al login para entrar al sistema.</p>
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
